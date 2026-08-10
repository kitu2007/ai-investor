import { NextRequest, NextResponse } from "next/server";

import { investmentOsTextRequest, publicError } from "@/lib/investment-os-server";

export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/investment-os/council/run/[id]/markdown">,
) {
  const { id } = await context.params;
  try {
    const markdown = await investmentOsTextRequest(
      "/api/v1/councils/" + encodeURIComponent(id) + "/markdown",
    );
    return new NextResponse(markdown, {
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    });
  } catch (error) {
    const failure = publicError(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
