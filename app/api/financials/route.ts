import { NextRequest, NextResponse } from "next/server";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const YahooFinance = require("yahoo-finance2").default;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const yf: any = new YahooFinance();

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker");
  if (!ticker) return NextResponse.json({ error: "ticker required" }, { status: 400 });

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [quote, summary]: [any, any] = await Promise.all([
      yf.quote(ticker),
      yf.quoteSummary(ticker, {
        modules: ["financialData", "defaultKeyStatistics", "summaryDetail"],
      }),
    ]);

    const fin = summary.financialData;
    const stats = summary.defaultKeyStatistics;
    const detail = summary.summaryDetail;

    return NextResponse.json({
      currentPrice: quote.regularMarketPrice ?? null,
      week52High: quote.fiftyTwoWeekHigh ?? null,
      week52Low: quote.fiftyTwoWeekLow ?? null,
      marketCapB: quote.marketCap ? quote.marketCap / 1e9 : null,

      grossMarginPct: fin?.grossMargins != null ? fin.grossMargins * 100 : null,
      operatingMarginPct: fin?.operatingMargins != null ? fin.operatingMargins * 100 : null,
      netMarginPct: fin?.profitMargins != null ? fin.profitMargins * 100 : null,
      revenueGrowth1Y: fin?.revenueGrowth != null ? fin.revenueGrowth * 100 : null,
      roic: fin?.returnOnAssets != null ? fin.returnOnAssets * 100 : null,
      roe: fin?.returnOnEquity != null ? fin.returnOnEquity * 100 : null,
      debtToEquity: fin?.debtToEquity ?? null,
      currentRatio: fin?.currentRatio ?? null,

      pe: detail?.trailingPE ?? null,
      evEbitda: stats?.enterpriseToEbitda ?? null,
      insiderOwnershipPct: stats?.heldPercentInsiders != null ? stats.heldPercentInsiders * 100 : null,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
