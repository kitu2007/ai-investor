import { NextRequest, NextResponse } from "next/server";

import { investmentOsRequest, publicError } from "@/lib/investment-os-server";
import type { QuickAnswer } from "@/lib/investment-os-types";

export async function POST(
  _request: NextRequest,
  context: RouteContext<"/api/investment-os/research/quick-answer/[id]/cancel">,
) {
  const { id } = await context.params;
  try {
    const quickAnswer = await investmentOsRequest<QuickAnswer>(
      "/api/v1/research/quick-answers/" + encodeURIComponent(id) + "/cancel",
      { method: "POST" },
    );
    return NextResponse.json(quickAnswer);
  } catch (error) {
    const failure = publicError(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
