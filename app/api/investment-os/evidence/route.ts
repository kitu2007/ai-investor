import { NextRequest, NextResponse } from "next/server";

import { investmentOsRequest, publicError } from "@/lib/investment-os-server";
import type { EvidenceItem } from "@/lib/investment-os-types";

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get("ticker")?.trim().toUpperCase();
  if (!ticker) {
    return NextResponse.json({ error: "Ticker is required." }, { status: 400 });
  }
  try {
    const evidence = await investmentOsRequest<EvidenceItem[]>(
      "/api/v1/companies/" + encodeURIComponent(ticker) + "/evidence",
    );
    return NextResponse.json(evidence);
  } catch (error) {
    const failure = publicError(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    ticker?: string;
    evidence_type?: string;
    title?: string;
    summary?: string;
    source_url?: string;
    confidence?: number;
  };
  const ticker = body.ticker?.trim().toUpperCase();
  if (!ticker || !body.title?.trim() || !body.summary?.trim()) {
    return NextResponse.json(
      { error: "Ticker, title, and summary are required." },
      { status: 400 },
    );
  }
  try {
    const evidence = await investmentOsRequest<EvidenceItem>(
      "/api/v1/companies/" + encodeURIComponent(ticker) + "/evidence",
      {
        method: "POST",
        body: JSON.stringify({
          evidence_type: body.evidence_type?.trim() || "research_note",
          title: body.title.trim(),
          summary: body.summary.trim(),
          source_url: body.source_url?.trim() || null,
          observed_at: new Date().toISOString(),
          confidence: body.confidence ?? 0.5,
        }),
      },
    );
    return NextResponse.json(evidence, { status: 201 });
  } catch (error) {
    const failure = publicError(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
