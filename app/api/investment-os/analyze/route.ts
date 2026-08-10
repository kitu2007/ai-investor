import { NextRequest, NextResponse } from "next/server";

import { investmentOsRequest, publicError } from "@/lib/investment-os-server";
import { persistPriceHistory, priceHistory } from "@/lib/investment-os-market";
import type {
  EvidenceItem,
  InvestmentCompany,
  ResearchResponse,
  TechnicalAnalysis,
} from "@/lib/investment-os-types";

async function optionalContext(ticker: string): Promise<{
  company: InvestmentCompany | null;
  evidence: EvidenceItem[];
}> {
  try {
    const company = await investmentOsRequest<InvestmentCompany>(
      "/api/v1/companies/" + encodeURIComponent(ticker),
    );
    const evidence = await investmentOsRequest<EvidenceItem[]>(
      "/api/v1/companies/" + encodeURIComponent(ticker) + "/evidence",
    );
    return { company, evidence };
  } catch {
    return { company: null, evidence: [] };
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    ticker?: string;
    message?: string;
    sessionId?: string | null;
  };
  const ticker = body.ticker?.trim().toUpperCase();
  const message = body.message?.trim();
  if (!ticker || !message) {
    return NextResponse.json(
      { error: "Ticker and research question are required." },
      { status: 400 },
    );
  }

  try {
    const [prices, benchmark, context] = await Promise.all([
      priceHistory(ticker),
      priceHistory("SPY"),
      optionalContext(ticker),
    ]);
    if (prices.length < 2) {
      return NextResponse.json(
        { error: "No usable daily market history was found for " + ticker + "." },
        { status: 404 },
      );
    }
    await Promise.all([
      persistPriceHistory(ticker, prices),
      persistPriceHistory("SPY", benchmark),
    ]);

    const chat = await investmentOsRequest<{
      session_id: string;
      reply: string;
      technical_analysis: TechnicalAnalysis | null;
      evidence_count: number;
    }>("/api/v1/chat", {
      method: "POST",
      body: JSON.stringify({
        message,
        session_id: body.sessionId || null,
        ticker,
        prices,
        benchmark_prices: benchmark,
      }),
    });

    const response: ResearchResponse = {
      sessionId: chat.session_id,
      reply: chat.reply,
      technical: chat.technical_analysis,
      evidenceCount: chat.evidence_count,
      company: context.company,
      evidence: context.evidence,
      marketDataSource: "Yahoo Finance daily adjusted closes; SPY benchmark",
    };
    return NextResponse.json(response);
  } catch (error) {
    const failure = publicError(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
