import { NextRequest, NextResponse } from "next/server";

import { investmentOsRequest, publicError } from "@/lib/investment-os-server";
import type { DecisionJournalEntry } from "@/lib/investment-os-types";

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get("ticker")?.trim().toUpperCase();
  const limit = request.nextUrl.searchParams.get("limit") ?? "50";
  const query = new URLSearchParams({ limit });
  if (ticker) query.set("ticker", ticker);
  try {
    return NextResponse.json(
      await investmentOsRequest<DecisionJournalEntry[]>(
        "/api/v1/journal/entries?" + query.toString(),
      ),
    );
  } catch (error) {
    const failure = publicError(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}

export async function POST(request: NextRequest) {
  try {
    return NextResponse.json(
      await investmentOsRequest<DecisionJournalEntry>("/api/v1/journal/entries", {
        method: "POST",
        body: JSON.stringify(await request.json()),
      }),
      { status: 201 },
    );
  } catch (error) {
    const failure = publicError(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
