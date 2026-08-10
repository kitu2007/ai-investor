import { NextRequest, NextResponse } from "next/server";

import { persistPriceHistory, priceHistory } from "@/lib/investment-os-market";
import { investmentOsRequest, publicError } from "@/lib/investment-os-server";
import type { ResearchRun, TechnicalAnalysis } from "@/lib/investment-os-types";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { ticker?: string; question?: string };
  const ticker = body.ticker?.trim().toUpperCase();
  const question = body.question?.trim();
  if (!ticker || !question) {
    return NextResponse.json(
      { error: "Ticker and research question are required." },
      { status: 400 },
    );
  }

  try {
    const [prices, benchmark] = await Promise.all([priceHistory(ticker), priceHistory("SPY")]);
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
    const technical = await investmentOsRequest<TechnicalAnalysis>("/api/v1/technical/analyze", {
      method: "POST",
      body: JSON.stringify({ ticker, prices, benchmark_prices: benchmark }),
    });
    const run = await investmentOsRequest<ResearchRun>("/api/v1/research/runs", {
      method: "POST",
      body: JSON.stringify({ ticker, question, technical_snapshot: technical }),
    });
    return NextResponse.json(run, { status: 202 });
  } catch (error) {
    const failure = publicError(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
