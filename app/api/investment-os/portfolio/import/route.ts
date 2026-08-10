import { NextRequest, NextResponse } from "next/server";

import { investmentOsRequest, publicError } from "@/lib/investment-os-server";
import type { PortfolioImportResult } from "@/lib/investment-os-types";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    portfolio_name?: string;
    as_of?: string;
    base_currency?: string;
    csv_text?: string;
  };
  if (!body.portfolio_name?.trim() || !body.as_of || !body.csv_text?.trim()) {
    return NextResponse.json(
      { error: "Portfolio name, as-of date, and CSV file are required." },
      { status: 400 },
    );
  }
  try {
    const result = await investmentOsRequest<PortfolioImportResult>("/api/v1/portfolios/import", {
      method: "POST",
      body: JSON.stringify({
        portfolio_name: body.portfolio_name.trim(),
        as_of: body.as_of,
        base_currency: (body.base_currency ?? "USD").toUpperCase(),
        csv_text: body.csv_text,
      }),
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const failure = publicError(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
