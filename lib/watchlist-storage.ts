import fs from "fs";
import path from "path";
import { WatchlistEntry, WatchlistKind } from "./watchlist-types";

function filePath(kind: WatchlistKind) {
  return path.join(process.cwd(), "data", `${kind}-angels.json`);
}

function ensureFile(kind: WatchlistKind) {
  const fp = filePath(kind);
  if (!fs.existsSync(fp)) fs.writeFileSync(fp, JSON.stringify([], null, 2));
}

export function readWatchlist(kind: WatchlistKind): WatchlistEntry[] {
  ensureFile(kind);
  return JSON.parse(fs.readFileSync(filePath(kind), "utf-8"));
}

export function writeWatchlist(kind: WatchlistKind, entries: WatchlistEntry[]) {
  fs.writeFileSync(filePath(kind), JSON.stringify(entries, null, 2));
}

export function upsertEntry(entry: WatchlistEntry) {
  const list = readWatchlist(entry.kind);
  const idx = list.findIndex((e) => e.id === entry.id);
  if (idx >= 0) list[idx] = entry; else list.push(entry);
  writeWatchlist(entry.kind, list);
}

export function deleteEntry(kind: WatchlistKind, id: string) {
  writeWatchlist(kind, readWatchlist(kind).filter((e) => e.id !== id));
}
