import { NextRequest, NextResponse } from "next/server";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const YahooFinance = require("yahoo-finance2").default;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const yf: any = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

function monthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
}

function pct(current: number, past: number): number | null {
  if (!past || past === 0) return null;
  return parseFloat((((current - past) / past) * 100).toFixed(2));
}

function closestPrice(
  quotes: { date: Date; adjclose?: number | null; close?: number | null }[],
  target: Date
): number | null {
  if (!quotes.length) return null;
  const t = target.getTime();
  let best = quotes[0];
  let bestDiff = Math.abs(new Date(best.date).getTime() - t);
  for (const q of quotes) {
    const diff = Math.abs(new Date(q.date).getTime() - t);
    if (diff < bestDiff) { best = q; bestDiff = diff; }
  }
  return (best.adjclose ?? best.close) ?? null;
}

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker");
  if (!ticker) return NextResponse.json({ error: "ticker required" }, { status: 400 });

  try {
    const fiveYearsAgo = monthsAgo(62); // a little extra buffer

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chart: any = await yf.chart(ticker, {
      period1: fiveYearsAgo,
      period2: new Date(),
      interval: "1wk",
    });

    const allQuotes: { date: Date; adjclose?: number | null; close?: number | null }[] =
      chart?.quotes ?? [];

    // Filter to only quotes that have price data (last weekly entry may be incomplete)
    const quotes = allQuotes.filter((q) => (q.adjclose ?? q.close) != null);

    if (!quotes.length) return NextResponse.json({ error: "no price data" }, { status: 404 });

    const latest = quotes[quotes.length - 1];
    const currentPrice = (latest.adjclose ?? latest.close) ?? null;

    if (!currentPrice) return NextResponse.json({ error: "no current price" }, { status: 404 });

    const p3m  = closestPrice(quotes, monthsAgo(3));
    const p6m  = closestPrice(quotes, monthsAgo(6));
    const p1y  = closestPrice(quotes, monthsAgo(12));
    const p2y  = closestPrice(quotes, monthsAgo(24));
    const p3y  = closestPrice(quotes, monthsAgo(36));
    const p5y  = closestPrice(quotes, monthsAgo(60));

    // All-time high from the fetched window (5y high as a proxy)
    const allTimeHigh = quotes.reduce((max, q) => {
      const h = (q.adjclose ?? q.close) ?? 0;
      return h > max ? h : max;
    }, 0);

    const pctOffHigh = allTimeHigh > 0
      ? parseFloat((((currentPrice - allTimeHigh) / allTimeHigh) * 100).toFixed(2))
      : null;

    return NextResponse.json({
      currentPrice,
      return3M:  p3m  ? pct(currentPrice, p3m)  : null,
      return6M:  p6m  ? pct(currentPrice, p6m)  : null,
      return1Y:  p1y  ? pct(currentPrice, p1y)  : null,
      return2Y:  p2y  ? pct(currentPrice, p2y)  : null,
      return3Y:  p3y  ? pct(currentPrice, p3y)  : null,
      return5Y:  p5y  ? pct(currentPrice, p5y)  : null,
      allTimeHigh: parseFloat(allTimeHigh.toFixed(2)),
      pctOffHigh,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
