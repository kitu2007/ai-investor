import { NextRequest, NextResponse } from "next/server";

import { persistPriceHistory, priceHistory } from "@/lib/investment-os-market";
import { publicError } from "@/lib/investment-os-server";
import {
  derivePriceHistory,
  isPriceHistoryRange,
  priceRangeStart,
  type PriceHistoryResponse,
} from "@/lib/price-history";

const TICKER_PATTERN = /^[A-Z0-9.^-]{1,16}$/;

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get("ticker")?.trim().toUpperCase() ?? "";
  const requestedRange = request.nextUrl.searchParams.get("range")?.trim().toLowerCase() ?? "10y";
  if (!TICKER_PATTERN.test(ticker)) {
    return NextResponse.json({ error: "Enter a valid company ticker." }, { status: 400 });
  }
  if (!isPriceHistoryRange(requestedRange)) {
    return NextResponse.json({ error: "Choose a supported price-history range." }, { status: 400 });
  }

  const interval = requestedRange === "all" ? "1wk" : "1d";
  try {
    const rawPoints = await priceHistory(ticker, {
      period1: priceRangeStart(requestedRange),
      interval,
    });
    const { points, summary } = derivePriceHistory(rawPoints);
    if (!summary || points.length < 2) {
      return NextResponse.json(
        { error: `No usable adjusted price history was found for ${ticker}.` },
        { status: 404 },
      );
    }

    await persistPriceHistory(ticker, rawPoints);
    const response: PriceHistoryResponse = {
      ticker,
      range: requestedRange,
      interval,
      source: "Yahoo Finance adjusted close",
      sourceUrl: `https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}/history/`,
      retrievedAt: new Date().toISOString(),
      points,
      summary,
    };
    return NextResponse.json(response);
  } catch (error) {
    const failure = publicError(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
