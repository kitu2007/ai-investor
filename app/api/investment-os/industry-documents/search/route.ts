import { NextRequest, NextResponse } from "next/server";

import { investmentOsRequest, publicError } from "@/lib/investment-os-server";
import type { IndustrySearchResponse } from "@/lib/investment-os-types";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query || query.length < 2) {
    return NextResponse.json({ error: "Enter at least two characters." }, { status: 400 });
  }
  try {
    const results = await investmentOsRequest<IndustrySearchResponse>(
      "/api/v1/industry-documents/search?q=" + encodeURIComponent(query),
    );
    return NextResponse.json(results);
  } catch (error) {
    const failure = publicError(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
