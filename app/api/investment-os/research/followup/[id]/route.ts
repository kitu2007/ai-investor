import { NextRequest, NextResponse } from "next/server";

import { investmentOsRequest, publicError } from "@/lib/investment-os-server";
import type { FollowUpRun } from "@/lib/investment-os-types";

export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/investment-os/research/followup/[id]">,
) {
  const { id } = await context.params;
  try {
    const followUp = await investmentOsRequest<FollowUpRun>(
      "/api/v1/research/followups/" + encodeURIComponent(id),
    );
    return NextResponse.json(followUp);
  } catch (error) {
    const failure = publicError(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
