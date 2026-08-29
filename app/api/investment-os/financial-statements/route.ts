import { NextRequest, NextResponse } from "next/server";

import { investmentOsRequest, publicError } from "@/lib/investment-os-server";
import type { FinancialStatementDashboard } from "@/lib/investment-os-types";

function dashboardPath(ticker: string, years: number): string {
  return (
    "/api/v1/financial-statements/" +
    encodeURIComponent(ticker) +
    "?years=" +
    encodeURIComponent(years)
  );
}

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get("ticker")?.trim().toUpperCase();
  const years = Number(request.nextUrl.searchParams.get("years") || 10);
  if (!ticker || !Number.isInteger(years) || years < 1 || years > 20) {
    return NextResponse.json(
      { error: "A ticker and between 1 and 20 years are required." },
      { status: 400 },
    );
  }
  try {
    const dashboard = await investmentOsRequest<FinancialStatementDashboard>(
      dashboardPath(ticker, years),
    );
    return NextResponse.json(dashboard);
  } catch (error) {
    const failure = publicError(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { ticker?: string; years?: number };
  const ticker = body.ticker?.trim().toUpperCase();
  const years = body.years ?? 10;
  if (!ticker || !Number.isInteger(years) || years < 1 || years > 20) {
    return NextResponse.json(
      { error: "A ticker and between 1 and 20 years are required." },
      { status: 400 },
    );
  }
  try {
    await investmentOsRequest(
      `/api/v1/providers/sec/companies/${encodeURIComponent(ticker)}/refresh`,
      {
        method: "POST",
        body: "{}",
        signal: AbortSignal.timeout(120_000),
      },
    );
    const dashboard = await investmentOsRequest<FinancialStatementDashboard>(
      dashboardPath(ticker, years),
    );
    return NextResponse.json(dashboard);
  } catch (error) {
    const failure = publicError(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
