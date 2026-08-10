import "server-only";

import { investmentOsRequest } from "@/lib/investment-os-server";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const YahooFinance = require("yahoo-finance2").default;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const yf: any = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export type PricePoint = { date: string; close: number };

function startDate(): Date {
  const date = new Date();
  date.setMonth(date.getMonth() - 18);
  return date;
}

export async function priceHistory(ticker: string): Promise<PricePoint[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chart: any = await yf.chart(ticker, {
    period1: startDate(),
    period2: new Date(),
    interval: "1d",
  });
  return (chart?.quotes ?? [])
    .filter(
      (quote: { date?: Date; adjclose?: number | null; close?: number | null }) =>
        quote.date && (quote.adjclose ?? quote.close) != null,
    )
    .map(
      (quote: { date: Date; adjclose?: number | null; close?: number | null }) => ({
        date: new Date(quote.date).toISOString().slice(0, 10),
        close: quote.adjclose ?? quote.close,
      }),
    );
}

export async function persistPriceHistory(ticker: string, prices: PricePoint[]): Promise<void> {
  if (prices.length === 0) return;
  await investmentOsRequest("/api/v1/providers/market/prices/import", {
    method: "POST",
    body: JSON.stringify({
      ticker,
      provider: "yahoo-finance2",
      source_url: `https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}/history/`,
      prices,
    }),
  });
}
