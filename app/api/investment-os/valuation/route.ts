import { NextRequest, NextResponse } from "next/server";

import { investmentOsRequest, publicError } from "@/lib/investment-os-server";
import type { ValuationResponse } from "@/lib/investment-os-types";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  try {
    const result = await investmentOsRequest<ValuationResponse>("/api/v1/valuation/analyze", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return NextResponse.json(result);
  } catch (error) {
    const failure = publicError(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
