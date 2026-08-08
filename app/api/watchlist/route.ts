import { NextRequest, NextResponse } from "next/server";
import { readWatchlist, upsertEntry, deleteEntry } from "@/lib/watchlist-storage";
import { WatchlistKind, WatchlistEntry } from "@/lib/watchlist-types";
import { nanoid } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const kind = req.nextUrl.searchParams.get("kind") as WatchlistKind;
  if (!kind) return NextResponse.json({ error: "kind required" }, { status: 400 });
  return NextResponse.json(readWatchlist(kind));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const entry: WatchlistEntry = {
    ...body,
    id: body.id || nanoid(),
    dateAdded: body.dateAdded || new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
  };
  upsertEntry(entry);
  return NextResponse.json(entry);
}

export async function DELETE(req: NextRequest) {
  const { id, kind } = await req.json();
  deleteEntry(kind as WatchlistKind, id);
  return NextResponse.json({ ok: true });
}
