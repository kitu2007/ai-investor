import { NextResponse } from "next/server";

import { investmentOsRequest, publicError } from "@/lib/investment-os-server";

export async function GET() {
  try {
    const health = await investmentOsRequest<Record<string, unknown>>("/health");
    return NextResponse.json({
      connected: true,
      service: "Investment OS",
      health,
    });
  } catch (error) {
    const failure = publicError(error);
    return NextResponse.json(
      { connected: false, service: "Investment OS", detail: failure.message },
      { status: failure.status },
    );
  }
}
