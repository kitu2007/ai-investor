import { NextRequest, NextResponse } from "next/server";

import { investmentOsRequest, publicError } from "@/lib/investment-os-server";
import type { InvestmentCompany } from "@/lib/investment-os-types";

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get("ticker")?.trim().toUpperCase();
  if (!ticker) {
    return NextResponse.json({ error: "Ticker is required." }, { status: 400 });
  }
  try {
    const company = await investmentOsRequest<InvestmentCompany>(
      "/api/v1/companies/" + encodeURIComponent(ticker),
    );
    return NextResponse.json(company);
  } catch (error) {
    const failure = publicError(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    ticker?: string;
    name?: string;
    sector?: string;
  };
  const ticker = body.ticker?.trim().toUpperCase();
  const name = body.name?.trim();
  if (!ticker || !name) {
    return NextResponse.json(
      { error: "Ticker and company name are required." },
      { status: 400 },
    );
  }
  try {
    const company = await investmentOsRequest<InvestmentCompany>("/api/v1/companies", {
      method: "POST",
      body: JSON.stringify({ ticker, name, sector: body.sector?.trim() || null }),
    });
    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    const failure = publicError(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
