import { NextRequest, NextResponse } from "next/server";

import { investmentOsRequest, publicError } from "@/lib/investment-os-server";
import type { AllocationAnalysis } from "@/lib/investment-os-types";

export async function POST(request: NextRequest) {
  try {
    return NextResponse.json(
      await investmentOsRequest<AllocationAnalysis>("/api/v1/portfolios/allocation/analyze", {
        method: "POST",
        body: JSON.stringify(await request.json()),
      }),
      { status: 201 },
    );
  } catch (error) {
    const failure = publicError(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
