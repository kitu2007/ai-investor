import { NextRequest, NextResponse } from "next/server";

import { investmentOsRequest, publicError } from "@/lib/investment-os-server";
import { RUNNER_IDS } from "@/lib/investment-os-types";
import type { FollowUpRun, RunnerId } from "@/lib/investment-os-types";

function requestedRunner(value: unknown): RunnerId | undefined {
  return RUNNER_IDS.includes(value as RunnerId) ? (value as RunnerId) : undefined;
}


export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    ticker?: string;
    question?: string;
    researchRunId?: string;
    runner?: string;
  };
  const ticker = body.ticker?.trim().toUpperCase();
  const question = body.question?.trim();
  if (!ticker || !question || !body.researchRunId) {
    return NextResponse.json(
      { error: "Ticker, question, and saved dossier are required." },
      { status: 400 },
    );
  }
  try {
    const followUp = await investmentOsRequest<FollowUpRun>("/api/v1/research/followups", {
      method: "POST",
      body: JSON.stringify({
        ticker,
        question,
        research_run_id: body.researchRunId,
        runner: requestedRunner(body.runner),
      }),
    });
    return NextResponse.json(followUp, { status: 202 });
  } catch (error) {
    const failure = publicError(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
