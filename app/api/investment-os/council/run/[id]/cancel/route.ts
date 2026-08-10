import { NextRequest, NextResponse } from "next/server";

import { investmentOsRequest, publicError } from "@/lib/investment-os-server";
import type { CouncilRun } from "@/lib/investment-os-types";

export async function POST(
  _request: NextRequest,
  context: RouteContext<"/api/investment-os/council/run/[id]/cancel">,
) {
  const { id } = await context.params;
  try {
    return NextResponse.json(
      await investmentOsRequest<CouncilRun>(
        "/api/v1/councils/" + encodeURIComponent(id) + "/cancel",
        { method: "POST" },
      ),
    );
  } catch (error) {
    const failure = publicError(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
