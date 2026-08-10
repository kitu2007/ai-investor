import { NextRequest, NextResponse } from "next/server";

import { investmentOsRequest, publicError } from "@/lib/investment-os-server";
import type { IndustryDocument } from "@/lib/investment-os-types";

export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/investment-os/industry-documents/[id]">,
) {
  const { id } = await context.params;
  try {
    const document = await investmentOsRequest<IndustryDocument>(
      "/api/v1/industry-documents/" + encodeURIComponent(id),
    );
    return NextResponse.json(document);
  } catch (error) {
    const failure = publicError(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
