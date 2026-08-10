import { NextRequest, NextResponse } from "next/server";

import { investmentOsRequest, publicError } from "@/lib/investment-os-server";
import type { ResearchRun } from "@/lib/investment-os-types";

export async function POST(
  _request: NextRequest,
  context: RouteContext<"/api/investment-os/research/run/[id]/cancel">,
) {
  const { id } = await context.params;
  try {
    const run = await investmentOsRequest<ResearchRun>(
      "/api/v1/research/runs/" + encodeURIComponent(id) + "/cancel",
      { method: "POST" },
    );
    return NextResponse.json(run);
  } catch (error) {
    const failure = publicError(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
