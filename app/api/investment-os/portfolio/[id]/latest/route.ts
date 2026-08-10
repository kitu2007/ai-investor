import { NextRequest, NextResponse } from "next/server";

import { investmentOsRequest, publicError } from "@/lib/investment-os-server";
import type { PortfolioSnapshot } from "@/lib/investment-os-types";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    return NextResponse.json(
      await investmentOsRequest<PortfolioSnapshot>(
        "/api/v1/portfolios/" + encodeURIComponent(id) + "/latest",
      ),
    );
  } catch (error) {
    const failure = publicError(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
