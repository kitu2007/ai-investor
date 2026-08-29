import { NextRequest, NextResponse } from "next/server";

import {
  normalizeForwardEstimates,
  type RawForwardTrend,
} from "@/lib/forward-estimates";
import { earningsTrend } from "@/lib/investment-os-market";
import { publicError } from "@/lib/investment-os-server";

const TICKER_PATTERN = /^[A-Z0-9.^-]{1,16}$/;

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get("ticker")?.trim().toUpperCase() ?? "";
  if (!TICKER_PATTERN.test(ticker)) {
    return NextResponse.json({ error: "Enter a valid company ticker." }, { status: 400 });
  }
  try {
    const raw = await earningsTrend(ticker);
    const response = normalizeForwardEstimates(
      ticker,
      raw.trend as RawForwardTrend[],
      raw.defaultMethodology,
    );
    if (response.periods.length === 0) {
      return NextResponse.json(
        { error: `No analyst consensus estimates were found for ${ticker}.` },
        { status: 404 },
      );
    }
    return NextResponse.json(response);
  } catch (error) {
    const failure = publicError(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
