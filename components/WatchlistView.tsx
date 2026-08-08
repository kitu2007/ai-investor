"use client";

import { useEffect, useState } from "react";
import { WatchlistEntry, WatchlistKind } from "@/lib/watchlist-types";
import WatchlistTable from "./WatchlistTable";
import WatchlistDetailPanel from "./WatchlistDetailPanel";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Search, RefreshCw, TrendingDown, TrendingUp as TrendingUpIcon } from "lucide-react";

interface Props { kind: WatchlistKind }

async function fetchWatchlist(kind: WatchlistKind): Promise<WatchlistEntry[]> {
  const response = await fetch("/api/watchlist?kind=" + kind);
  return (await response.json()) as WatchlistEntry[];
}

export default function WatchlistView({ kind }: Props) {
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);
  const [selected, setSelected] = useState<WatchlistEntry | null>(null);
  const [globalFilter, setGlobalFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    void fetchWatchlist(kind).then((data) => {
      if (!active) return;
      setEntries(data);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [kind]);

  async function refreshReturns(ticker: string) {
    setRefreshing((s) => new Set(s).add(ticker));
    try {
      const res = await fetch(`/api/price-returns?ticker=${ticker}`);
      const data = await res.json();
      if (data.error) return;

      setEntries((prev) =>
        prev.map((e) => {
          if (e.ticker !== ticker) return e;
          const updated = { ...e, ...data, returnsLastFetched: new Date().toISOString(), lastUpdated: new Date().toISOString() };
          // persist to server
          fetch("/api/watchlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updated),
          });
          if (selected?.ticker === ticker) setSelected(updated);
          return updated;
        })
      );
    } finally {
      setRefreshing((s) => { const n = new Set(s); n.delete(ticker); return n; });
    }
  }

  async function refreshAll() {
    for (const e of entries) {
      await refreshReturns(e.ticker);
    }
  }

  const isFallen = kind === "fallen";
  const Icon = isFallen ? TrendingDown : TrendingUpIcon;
  const accentColor = isFallen ? "text-orange-400" : "text-emerald-400";
  const title = isFallen ? "Fallen Angels" : "Rising Angels";
  const subtitle = isFallen
    ? "Quality businesses that have declined significantly — potential turnaround / recovery plays"
    : "Emerging quality companies with strong multi-year momentum";

  // Summary stats
  const withReturns = entries.filter((e) => e.return1Y != null);
  const avgReturn1Y = withReturns.length
    ? (withReturns.reduce((s, e) => s + (e.return1Y ?? 0), 0) / withReturns.length).toFixed(1)
    : null;
  const avgOffHigh = entries.filter((e) => e.pctOffHigh != null);
  const avgPctOffHigh = avgOffHigh.length
    ? (avgOffHigh.reduce((s, e) => s + (e.pctOffHigh ?? 0), 0) / avgOffHigh.length).toFixed(1)
    : null;

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Sub-header */}
        <div className="border-b border-gray-800 px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Icon size={18} className={accentColor} />
            <div>
              <h2 className="text-sm font-bold text-white">{title}</h2>
              <p className="text-xs text-gray-500">{subtitle}</p>
            </div>
            <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded">{entries.length} companies</span>
            {avgReturn1Y && (
              <span className={`text-xs ${parseFloat(avgReturn1Y) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                Avg 1Y: {parseFloat(avgReturn1Y) > 0 ? "+" : ""}{avgReturn1Y}%
              </span>
            )}
            {avgPctOffHigh && (
              <span className="text-xs text-orange-400">Avg off high: {avgPctOffHigh}%</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <Input className="pl-8 w-44 h-8 text-xs" placeholder="Search..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} />
            </div>
            <Button variant="outline" size="sm" onClick={refreshAll} disabled={loading || refreshing.size > 0}>
              <RefreshCw size={12} className={`mr-1.5 ${refreshing.size > 0 ? "animate-spin" : ""}`} />
              Refresh All
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
          ) : (
            <WatchlistTable
              entries={entries}
              onSelect={setSelected}
              selectedId={selected?.id}
              globalFilter={globalFilter}
              onRefreshReturns={refreshReturns}
              refreshing={refreshing}
            />
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <WatchlistDetailPanel
          entry={selected}
          kind={kind}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
