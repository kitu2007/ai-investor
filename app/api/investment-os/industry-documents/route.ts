import { NextResponse } from "next/server";

import { investmentOsRequest, publicError } from "@/lib/investment-os-server";
import type { IndustryDocumentSummary } from "@/lib/investment-os-types";

export async function GET() {
  try {
    const documents = await investmentOsRequest<IndustryDocumentSummary[]>(
      "/api/v1/industry-documents",
    );
    return NextResponse.json(documents);
  } catch (error) {
    const failure = publicError(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
