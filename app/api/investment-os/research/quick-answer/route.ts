import { NextRequest, NextResponse } from "next/server";

import { investmentOsRequest, publicError } from "@/lib/investment-os-server";
import { RUNNER_IDS } from "@/lib/investment-os-types";
import type { QuickAnswer, RunnerId } from "@/lib/investment-os-types";

function requestedRunner(value: unknown): RunnerId | undefined {
  return RUNNER_IDS.includes(value as RunnerId) ? (value as RunnerId) : undefined;
}

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get("ticker")?.trim().toUpperCase();
  if (!ticker) {
    return NextResponse.json({ error: "Ticker is required." }, { status: 400 });
  }
  try {
    const history = await investmentOsRequest<QuickAnswer[]>(
      "/api/v1/research/companies/" +
        encodeURIComponent(ticker) +
        "/quick-answers?limit=50",
    );
    return NextResponse.json(history);
  } catch (error) {
    const failure = publicError(error);
    if (failure.status === 404) return NextResponse.json([]);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    ticker?: string;
    question?: string;
    runner?: string;
  };
  const ticker = body.ticker?.trim().toUpperCase();
  const question = body.question?.trim();
  if (!ticker || !question) {
    return NextResponse.json(
      { error: "Ticker and question are required." },
      { status: 400 },
    );
  }

  try {
    const quickAnswer = await investmentOsRequest<QuickAnswer>(
      "/api/v1/research/quick-answers",
      {
        method: "POST",
        body: JSON.stringify({ ticker, question, runner: requestedRunner(body.runner) }),
      },
    );
    return NextResponse.json(quickAnswer, { status: 202 });
  } catch (error) {
    const failure = publicError(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
