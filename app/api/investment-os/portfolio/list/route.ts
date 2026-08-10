import { NextResponse } from "next/server";

import { investmentOsRequest, publicError } from "@/lib/investment-os-server";
import type { PrivatePortfolio } from "@/lib/investment-os-types";

export async function GET() {
  try {
    return NextResponse.json(
      await investmentOsRequest<PrivatePortfolio[]>("/api/v1/portfolios"),
    );
  } catch (error) {
    const failure = publicError(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
