import { NextRequest, NextResponse } from "next/server";

import { investmentOsRequest, publicError } from "@/lib/investment-os-server";
import type { CouncilRun } from "@/lib/investment-os-types";

export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/investment-os/council/run/[id]">,
) {
  const { id } = await context.params;
  try {
    return NextResponse.json(
      await investmentOsRequest<CouncilRun>("/api/v1/councils/" + encodeURIComponent(id)),
    );
  } catch (error) {
    const failure = publicError(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
