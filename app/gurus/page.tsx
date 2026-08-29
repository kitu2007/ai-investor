"use client";

import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, ChevronDown, ChevronUp, FileSpreadsheet, Users } from "lucide-react";
import NavShell from "@/components/NavShell";
import TickerLink from "@/components/TickerLink";

interface GuruHolding {
  ticker: string;
  cusip?: string;
  name: string;
  sector: string;
  pctPortfolio: number;
  sharesM: number | null;
  valueB: number | null;
  action: "New" | "Add" | "Reduce" | "Hold" | "Exit";
  quarterReported: string;
  notes: string;
  reportingPeriodEnd?: string;
  approximatePrice?: string;
  priceBasis?: string;
}

interface GuruMove {
  ticker: string;
  cusip: string;
  name: string;
  action: "New" | "Add" | "Reduce" | "Exit";
  priorSharesM: number;
  currentSharesM: number;
  priorPctPortfolio: number;
  currentPctPortfolio: number;
  quarterReported: string;
  approximatePrice?: string;
  priceBasis?: string;
}

interface GuruProfile {
  id: string;
  name: string;
  firm: string;
  style: string;
  aum: string;
  philosophy: string;
  holdings: GuruHolding[];
  recentMoves?: GuruMove[];
  filingSource: string;
  filingUrl?: string;
  asOf: string;
  reportingPeriod?: string;
}

type GuruSummary = Omit<GuruProfile, "holdings">;

interface ConsensusActivity {
  ticker: string;
  cusip: string;
  name: string;
  buyers: ConsensusInvestorMove[];
  sellers: ConsensusInvestorMove[];
  net: number;
}

interface ConsensusInvestorMove {
  investorId: string;
  investorName: string;
  firm: string;
  action: "New" | "Add" | "Reduce" | "Exit";
  priorSharesM: number;
  currentSharesM: number;
  shareChangePct: number | null;
  priorPctPortfolio: number;
  currentPctPortfolio: number;
  quarterReported: string;
  approximatePrice?: string;
  priceBasis?: string;
}

interface ConsensusResponse {
  reportingPeriod: string;
  sourceCatalog: string;
  sourceCatalogUrl: string;
  includedManagers: string[];
  methodology: string;
  rows: ConsensusActivity[];
}

type LatestPrice = {
  close: number;
  asOf: string;
  retrievedAt: string;
};

const ACTION_STYLE: Record<string, string> = {
  New:    "bg-emerald-900 text-emerald-300",
  Add:    "bg-blue-900 text-blue-300",
  Hold:   "bg-gray-700 text-gray-300",
  Reduce: "bg-yellow-900 text-yellow-300",
  Exit:   "bg-red-900 text-red-300",
};

function BarChart({ pct, max }: { pct: number; max: number }) {
  const width = Math.round((pct / max) * 100);
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 bg-gray-800 rounded-full h-1.5">
        <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${width}%` }} />
      </div>
      <span className="text-xs text-gray-300 w-10 text-right">{pct.toFixed(1)}%</span>
    </div>
  );
}

function formatShares(millions: number) {
  if (millions === 0) return "0";
  if (millions >= 1) return `${millions.toFixed(2)}M`;
  return `${(millions * 1000).toFixed(1)}K`;
}

function formatReportingDate(date: string | undefined) {
  if (!date) return "date unavailable";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));
}

function formatCurrentPrice(price: LatestPrice | undefined) {
  if (!price) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: price.close >= 1 ? 2 : 4,
  }).format(price.close);
}

function formatChangePct(value: number | null) {
  if (value == null) return "new";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function formatWeightChange(move: ConsensusInvestorMove) {
  return `${move.priorPctPortfolio.toFixed(2)}% → ${move.currentPctPortfolio.toFixed(2)}%`;
}

function GuruCard({ guru, initiallyExpanded = false }: { guru: GuruProfile; initiallyExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [detailView, setDetailView] = useState<"holdings" | "moves">("holdings");
  const [latestPrices, setLatestPrices] = useState<Record<string, LatestPrice>>({});
  const [pricesLoading, setPricesLoading] = useState(false);
  const maxPct = Math.max(...guru.holdings.map((h) => h.pctPortfolio));

  useEffect(() => {
    if (initiallyExpanded) setExpanded(true);
  }, [initiallyExpanded]);

  useEffect(() => {
    if (!expanded) return;
    const tickers = [...new Set([
      ...guru.holdings.map((holding) => holding.ticker),
      ...(guru.recentMoves ?? []).map((move) => move.ticker),
    ])];
    let active = true;
    setPricesLoading(true);
    void Promise.all(
      tickers.map(async (ticker) => {
        const response = await fetch(
          `/api/investment-os/price-history?ticker=${encodeURIComponent(ticker)}&range=3m`,
        );
        if (!response.ok) return [ticker, null] as const;
        const payload = (await response.json()) as {
          retrievedAt: string;
          summary: { latestClose: number; endDate: string };
        };
        return [ticker, {
          close: payload.summary.latestClose,
          asOf: payload.summary.endDate,
          retrievedAt: payload.retrievedAt,
        }] as const;
      }),
    ).then((results) => {
      if (!active) return;
      setLatestPrices(Object.fromEntries(results.filter((result): result is [string, LatestPrice] => result[1] !== null)));
    }).finally(() => {
      if (active) setPricesLoading(false);
    });
    return () => {
      active = false;
    };
  }, [expanded, guru.holdings, guru.recentMoves]);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        className="w-full text-left p-5 flex items-start justify-between hover:bg-gray-800/50 transition-colors"
        onClick={() => setExpanded((x) => !x)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-base font-bold text-white">{guru.name}</h2>
            <span className="text-xs bg-purple-900 text-purple-300 px-2 py-0.5 rounded-full font-medium">{guru.firm}</span>
            <span className="text-xs text-gray-500">{guru.aum}</span>
          </div>
          <p className="text-xs text-gray-400 mb-1">{guru.style}</p>
          <p className="text-xs text-gray-500">As of: {guru.asOf}</p>
        </div>
        <div className="text-gray-400 ml-4 mt-1">
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-700">
          {/* Philosophy */}
          <div className="px-5 py-4 bg-gray-800/30 border-b border-gray-700">
            <p className="text-xs text-gray-300 leading-relaxed">
              <span className="font-semibold text-gray-400">Style summary:</span> {guru.philosophy}
            </p>
            <p className="text-xs text-gray-600 mt-2">
              {guru.filingUrl ? (
                <a
                  href={guru.filingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-purple-300 underline underline-offset-2"
                >
                  {guru.filingSource}
                </a>
              ) : guru.filingSource}
            </p>
          </div>

          {guru.recentMoves?.length ? (
            <div className="flex gap-2 border-b border-gray-700 bg-gray-900 px-4 py-3">
              <button
                onClick={() => setDetailView("holdings")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${detailView === "holdings" ? "bg-purple-900 text-purple-200" : "bg-gray-800 text-gray-400"}`}
              >
                Current top holdings
              </button>
              <button
                onClick={() => setDetailView("moves")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${detailView === "moves" ? "bg-purple-900 text-purple-200" : "bg-gray-800 text-gray-400"}`}
              >
                Recent moves ({guru.recentMoves.length})
              </button>
            </div>
          ) : null}

          {detailView === "holdings" || !guru.recentMoves?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-900">
                  <th className="px-4 py-2.5 text-left text-gray-400 font-medium">Company</th>
                  <th className="px-4 py-2.5 text-left text-gray-400 font-medium">Sector</th>
                  <th className="px-4 py-2.5 text-left text-gray-400 font-medium w-40">% Portfolio</th>
                  <th className="px-4 py-2.5 text-right text-gray-400 font-medium">Value</th>
                  <th className="px-4 py-2.5 text-right text-gray-400 font-medium">As reported / price context</th>
                  <th className="px-4 py-2.5 text-right text-gray-400 font-medium">Current price</th>
                  <th className="px-4 py-2.5 text-center text-gray-400 font-medium">Action</th>
                  <th className="px-4 py-2.5 text-left text-gray-400 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {guru.holdings.map((h) => (
                  <tr key={h.ticker} className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{h.name}</div>
                      <TickerLink ticker={h.ticker} />
                    </td>
                    <td className="px-4 py-3 text-gray-400">{h.sector}</td>
                    <td className="px-4 py-3">
                      <BarChart pct={h.pctPortfolio} max={maxPct} />
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300">
                      {h.valueB != null ? `$${h.valueB.toFixed(2)}B` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-[11px] leading-5 text-gray-400">
                      <div>{h.quarterReported} · {formatReportingDate(h.reportingPeriodEnd)}</div>
                      <div title={h.priceBasis} className="text-gray-500">{h.approximatePrice ?? "price n/a"} at period end</div>
                    </td>
                    <td className="px-4 py-3 text-right text-[11px] leading-5 text-gray-300">
                      <div title={latestPrices[h.ticker] ? `Latest adjusted close: ${latestPrices[h.ticker].asOf}; retrieved ${new Date(latestPrices[h.ticker].retrievedAt).toLocaleString()}` : "Current price unavailable"}>
                        {pricesLoading && !latestPrices[h.ticker] ? "Loading…" : formatCurrentPrice(latestPrices[h.ticker])}
                      </div>
                      {latestPrices[h.ticker] ? <div className="text-gray-600">close {latestPrices[h.ticker].asOf}</div> : null}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ACTION_STYLE[h.action]}`}>
                        {h.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 max-w-xs">
                      <p className="leading-relaxed line-clamp-2" title={h.notes}>{h.notes}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          ) : (
            <div>
              <div className="border-b border-gray-700 bg-gray-800/30 px-5 py-3 text-[11px] leading-relaxed text-gray-500">
                Largest material share-count changes in the latest filing comparison. Portfolio-weight changes also reflect market prices, so shares—not weight alone—determine Add or Reduce.
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-700 bg-gray-900">
                      <th className="px-4 py-2.5 text-left font-medium text-gray-400">Company</th>
	                      <th className="px-4 py-2.5 text-center font-medium text-gray-400">Action</th>
	                      <th className="px-4 py-2.5 text-right font-medium text-gray-400">Reported shares</th>
	                      <th className="px-4 py-2.5 text-right font-medium text-gray-400">Portfolio weight</th>
	                      <th className="px-4 py-2.5 text-right font-medium text-gray-400">Approx price</th>
	                      <th className="px-4 py-2.5 text-right font-medium text-gray-400">Current price</th>
	                      <th className="px-4 py-2.5 text-left font-medium text-gray-400">Comparison</th>
	                    </tr>
                  </thead>
                  <tbody>
                    {guru.recentMoves.map((move) => (
                      <tr key={`${move.cusip}-${move.action}`} className="border-b border-gray-800 hover:bg-gray-800/40">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-white">{move.name}</div>
                          <TickerLink ticker={move.ticker} />
                          <div className="mt-0.5 text-[10px] text-gray-600">CUSIP {move.cusip}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${ACTION_STYLE[move.action]}`}>
                            {move.action}
                          </span>
	                        </td>
	                        <td className="px-4 py-3 text-right text-gray-300">
	                          {formatShares(move.priorSharesM)} -&gt; {formatShares(move.currentSharesM)}
	                        </td>
	                        <td className="px-4 py-3 text-right text-gray-300">
	                          {move.priorPctPortfolio.toFixed(2)}% -&gt; {move.currentPctPortfolio.toFixed(2)}%
	                        </td>
	                        <td className="px-4 py-3 text-right text-gray-300">
	                          <span title={move.priceBasis}>{move.approximatePrice ?? "—"}</span>
	                        </td>
	                        <td className="px-4 py-3 text-right text-[11px] leading-5 text-gray-300">
                          <div title={latestPrices[move.ticker] ? `Latest adjusted close: ${latestPrices[move.ticker].asOf}; retrieved ${new Date(latestPrices[move.ticker].retrievedAt).toLocaleString()}` : "Current price unavailable"}>
                            {pricesLoading && !latestPrices[move.ticker] ? "Loading…" : formatCurrentPrice(latestPrices[move.ticker])}
                          </div>
                          {latestPrices[move.ticker] ? <div className="text-gray-600">close {latestPrices[move.ticker].asOf}</div> : null}
                        </td>
	                        <td className="px-4 py-3 text-gray-500">{move.quarterReported}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ConsensusView({ data }: { data: ConsensusResponse }) {
  const [filter, setFilter] = useState<"all" | "bought" | "sold">("all");
  const [sortKey, setSortKey] = useState<"net" | "company" | "buyers" | "sellers" | "activity">("net");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const sortButton = (key: typeof sortKey, label: string, className = "") => (
    <button
      type="button"
      onClick={() => {
        if (sortKey === key) setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
        else {
          setSortKey(key);
          setSortDirection(key === "company" ? "asc" : "desc");
        }
      }}
      className={`inline-flex items-center gap-1 hover:text-white ${className}`}
    >
      {label}
      {sortKey === key ? <span className="text-[10px]">{sortDirection === "asc" ? "↑" : "↓"}</span> : null}
    </button>
  );
  const rows = [...data.rows]
    .filter((row) => filter === "all" || (filter === "bought" ? row.buyers.length > 0 : row.sellers.length > 0))
    .sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      const activityA = a.buyers.length + a.sellers.length;
      const activityB = b.buyers.length + b.sellers.length;
      let comparison = 0;
      if (sortKey === "company") comparison = a.name.localeCompare(b.name);
      if (sortKey === "buyers") comparison = a.buyers.length - b.buyers.length;
      if (sortKey === "sellers") comparison = a.sellers.length - b.sellers.length;
      if (sortKey === "activity") comparison = activityA - activityB;
      if (sortKey === "net") comparison = a.net - b.net;
      return comparison * direction || b.net - a.net || b.buyers.length - a.buyers.length || a.name.localeCompare(b.name);
    });

  const investorDetails = (moves: ConsensusInvestorMove[], tone: "buy" | "sell") => {
    if (!moves.length) return "—";
    return (
      <div className="space-y-2">
        {moves.map((move) => (
          <button
            key={`${move.investorId}-${move.action}`}
            type="button"
            onDoubleClick={() => {
              window.location.href = `/gurus?investor=${move.investorId}`;
            }}
            title="Double-click to open this investor's portfolio"
            className="block w-full rounded-lg border border-transparent p-2 text-left hover:border-gray-700 hover:bg-gray-800"
          >
            <div className={`font-medium ${tone === "buy" ? "text-emerald-300" : "text-red-300"}`}>
              {move.investorName} <span className="text-gray-500">/ {move.firm}</span>
            </div>
            <div className="mt-1 text-[11px] leading-relaxed text-gray-300">
              {move.action}; portfolio {formatWeightChange(move)}; {move.quarterReported}; <span title={move.priceBasis}>{move.approximatePrice ?? "price n/a"}</span>
            </div>
            <div className="mt-0.5 text-[10px] leading-relaxed text-gray-500">
              Shares: {formatShares(move.priorSharesM)} → {formatShares(move.currentSharesM)} ({formatChangePct(move.shareChangePct)})
            </div>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Aggregated reported activity · {data.reportingPeriod} · {data.includedManagers.length} managers
            </h3>
            <p className="mt-1 max-w-4xl text-xs leading-relaxed text-gray-400">{data.methodology}</p>
            <p className="mt-1 max-w-4xl text-[11px] text-gray-500">Included: {data.includedManagers.join(", ")}</p>
          </div>
          <a
            href={data.sourceCatalogUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-purple-300 underline underline-offset-2 hover:text-purple-200"
          >
            Investor roster: {data.sourceCatalog}
          </a>
        </div>
        <p className="mt-2 text-[11px] text-yellow-600">
          Direction is inferred from quarter-to-quarter share counts. It is not a real-time trade feed, conviction score, or recommendation.
        </p>
      </div>

      <div className="flex gap-2">
        {([
          ["all", "All signals"],
          ["bought", "Most bought"],
          ["sold", "Most sold"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === id
                ? "border-purple-500 bg-purple-900/50 text-purple-200"
                : "border-gray-700 bg-gray-900 text-gray-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-700 bg-gray-900">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-700 bg-gray-800/50">
              <th className="px-4 py-3 text-left font-medium text-gray-400">{sortButton("company", "Company")}</th>
              <th className="px-4 py-3 text-center font-medium text-gray-400">{sortButton("buyers", "Buyers")}</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Reported adds / new positions</th>
              <th className="px-4 py-3 text-center font-medium text-gray-400">{sortButton("sellers", "Sellers")}</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Reported reductions / exits</th>
              <th className="px-4 py-3 text-center font-medium text-gray-400">{sortButton("net", "Net")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const net = row.buyers.length - row.sellers.length;
              return (
                <tr key={row.cusip} className="border-b border-gray-800 align-top hover:bg-gray-800/40">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-white">{row.name}</div>
                    <TickerLink ticker={row.ticker} />
                    <div className="mt-0.5 text-[10px] text-gray-600">CUSIP {row.cusip}</div>
                  </td>
                  <td className="px-4 py-3 text-center text-emerald-300">{row.buyers.length}</td>
                  <td className="max-w-sm px-4 py-3 leading-relaxed text-gray-300">
                    {investorDetails(row.buyers, "buy")}
                  </td>
                  <td className="px-4 py-3 text-center text-red-300">{row.sellers.length}</td>
                  <td className="max-w-sm px-4 py-3 leading-relaxed text-gray-300">
                    {investorDetails(row.sellers, "sell")}
                  </td>
                  <td className={`px-4 py-3 text-center font-semibold ${net > 0 ? "text-emerald-300" : net < 0 ? "text-red-300" : "text-gray-400"}`}>
                    {net > 0 ? `+${net}` : net}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function GurusPage() {
  const [gurus, setGurus] = useState<GuruProfile[]>([]);
  const [consensus, setConsensus] = useState<ConsensusResponse | null>(null);
  const [view, setView] = useState<"portfolios" | "activity">("portfolios");
  const [selectedInvestorId, setSelectedInvestorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [listResponse, consensusResponse] = await Promise.all([
          fetch("/api/gurus"),
          fetch("/api/gurus?view=consensus"),
        ]);
        if (!listResponse.ok || !consensusResponse.ok) throw new Error("Could not load value-investor data");
        const [list, consensusData] = await Promise.all([
          listResponse.json() as Promise<GuruSummary[]>,
          consensusResponse.json() as Promise<ConsensusResponse>,
        ]);
        const full = await Promise.all(
          list.map(async (guru) => {
            const response = await fetch(`/api/gurus?id=${guru.id}`);
            if (!response.ok) throw new Error(`Could not load ${guru.name}`);
            return response.json() as Promise<GuruProfile>;
          }),
        );
        const requestedInvestorId = new URLSearchParams(window.location.search).get("investor");
        if (requestedInvestorId) {
          setSelectedInvestorId(requestedInvestorId);
          setView("portfolios");
        }
        setGurus(full);
        setConsensus(consensusData);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load value-investor data");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <NavShell active="gurus">
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Users size={20} className="text-purple-400" />
              <div>
                <h2 className="text-lg font-bold text-white">Value Investor Portfolios</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Latest disclosed holdings from 13-F filings and annual reports. Click any card to expand.
                  <span className="ml-2 text-yellow-600">⚠ Holdings are delayed point-in-time snapshots and may have changed.</span>
                </p>
                <p className="text-[11px] text-gray-600 mt-1">
                  13-F reports omit cash, private holdings, most bonds, ordinary short positions, and many derivatives; they do not disclose an investor&apos;s thesis.
                </p>
              </div>
            </div>
            <a
              href="/sheets/value-investor-holdings.xlsx"
              className="inline-flex items-center gap-2 rounded-lg border border-purple-700 bg-purple-950/50 px-3 py-2 text-xs font-medium text-purple-200 hover:border-purple-500 hover:bg-purple-900/60"
            >
              <FileSpreadsheet size={14} />
              Download Google Sheets workbook
            </a>
          </div>

          <div className="mb-5 flex gap-2 border-b border-gray-800 pb-3">
            <button
              onClick={() => setView("portfolios")}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                view === "portfolios"
                  ? "border-purple-500 bg-purple-900/50 text-purple-200"
                  : "border-gray-700 bg-gray-900 text-gray-400 hover:text-white"
              }`}
            >
              <Users size={14} /> Investor portfolios
            </button>
            <button
              onClick={() => setView("activity")}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                view === "activity"
                  ? "border-purple-500 bg-purple-900/50 text-purple-200"
                  : "border-gray-700 bg-gray-900 text-gray-400 hover:text-white"
              }`}
            >
              <ArrowUpRight size={14} className="text-emerald-400" />
              <ArrowDownRight size={14} className="text-red-400" />
              Aggregated buys &amp; sells
            </button>
          </div>

          {loading ? (
            <div className="text-center py-20 text-gray-500">Loading guru portfolios...</div>
          ) : error ? (
            <div className="rounded-xl border border-red-900 bg-red-950/30 p-5 text-sm text-red-300">{error}</div>
          ) : view === "activity" && consensus ? (
            <ConsensusView data={consensus} />
          ) : (
            <div className="space-y-4">
              {gurus.map((g) => <GuruCard key={g.id} guru={g} initiallyExpanded={g.id === selectedInvestorId} />)}
            </div>
          )}
        </div>
      </div>
    </NavShell>
  );
}
