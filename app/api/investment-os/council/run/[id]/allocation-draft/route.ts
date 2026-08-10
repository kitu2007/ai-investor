import { NextRequest, NextResponse } from "next/server";

import { investmentOsRequest, publicError } from "@/lib/investment-os-server";
import type { CioAllocationDraft } from "@/lib/investment-os-types";

export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/investment-os/council/run/[id]/allocation-draft">,
) {
  const { id } = await context.params;
  try {
    return NextResponse.json(
      await investmentOsRequest<CioAllocationDraft>(
        "/api/v1/councils/" + encodeURIComponent(id) + "/allocation-draft",
      ),
    );
  } catch (error) {
    const failure = publicError(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
