import { NextRequest, NextResponse } from "next/server";

import { investmentOsRequest, publicError } from "@/lib/investment-os-server";
import type { ResearchRun } from "@/lib/investment-os-types";

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get("ticker")?.trim().toUpperCase();
  if (!ticker) {
    return NextResponse.json({ error: "Ticker is required." }, { status: 400 });
  }
  try {
    const run = await investmentOsRequest<ResearchRun>(
      "/api/v1/research/companies/" + encodeURIComponent(ticker) + "/latest",
    );
    return NextResponse.json(run);
  } catch (error) {
    const failure = publicError(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
