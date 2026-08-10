import { NextRequest, NextResponse } from "next/server";

import { investmentOsRequest, publicError } from "@/lib/investment-os-server";

const GET_ACTIONS: Record<string, (request: NextRequest) => string> = {
  status: (request) => {
    const ticker = request.nextUrl.searchParams.get("ticker")?.trim().toUpperCase();
    if (!ticker) throw new Error("Ticker is required.");
    return `/api/v1/providers/companies/${encodeURIComponent(ticker)}/status`;
  },
  watches: (request) => {
    const ticker = request.nextUrl.searchParams.get("ticker")?.trim().toUpperCase();
    return `/api/v1/watch/records${ticker ? `?ticker=${encodeURIComponent(ticker)}` : ""}`;
  },
  reminders: () => "/api/v1/reminders?days=45",
  jobs: () => "/api/v1/jobs?limit=20",
};

const POST_ACTIONS: Record<string, (body: Record<string, unknown>) => string> = {
  refresh_sec: (body) =>
    `/api/v1/providers/sec/companies/${encodeURIComponent(String(body.ticker || ""))}/refresh`,
  import_document: () => "/api/v1/providers/documents/import",
  create_watch: () => "/api/v1/watch/records",
  add_watch_event: (body) =>
    `/api/v1/watch/records/${encodeURIComponent(String(body.record_id || ""))}/events`,
  review_watch: (body) =>
    `/api/v1/watch/records/${encodeURIComponent(String(body.record_id || ""))}/review`,
  compare: () => "/api/v1/comparisons/companies",
};

function payloadWithoutRouting(body: Record<string, unknown>): Record<string, unknown> {
  const payload = { ...body };
  delete payload.action;
  delete payload.record_id;
  return payload;
}

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get("action") || "";
  const resolvePath = GET_ACTIONS[action];
  if (!resolvePath) {
    return NextResponse.json({ error: "Unknown decision-tools action." }, { status: 400 });
  }
  try {
    return NextResponse.json(await investmentOsRequest(resolvePath(request)));
  } catch (error) {
    if (error instanceof Error && error.message === "Ticker is required.") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const failure = publicError(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const action = String(body.action || "");
  const resolvePath = POST_ACTIONS[action];
  if (!resolvePath) {
    return NextResponse.json({ error: "Unknown decision-tools action." }, { status: 400 });
  }
  if (
    (action === "refresh_sec" && !body.ticker) ||
    (["add_watch_event", "review_watch"].includes(action) && !body.record_id)
  ) {
    return NextResponse.json({ error: "The requested record identifier is missing." }, { status: 400 });
  }
  try {
    const result = await investmentOsRequest(resolvePath(body), {
      method: "POST",
      body: JSON.stringify(payloadWithoutRouting(body)),
      signal: AbortSignal.timeout(action === "refresh_sec" ? 120_000 : 20_000),
    });
    return NextResponse.json(result);
  } catch (error) {
    const failure = publicError(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
