import { NextRequest, NextResponse } from "next/server";

import { investmentOsRequest, publicError } from "@/lib/investment-os-server";
import type { ResearchRun } from "@/lib/investment-os-types";

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get("ticker")?.trim().toUpperCase();
  if (!ticker) {
    return NextResponse.json({ error: "Ticker is required." }, { status: 400 });
  }
  try {
    const history = await investmentOsRequest<ResearchRun[]>(
      "/api/v1/research/companies/" + encodeURIComponent(ticker) + "/runs?limit=30",
    );
    return NextResponse.json(history);
  } catch (error) {
    const failure = publicError(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
