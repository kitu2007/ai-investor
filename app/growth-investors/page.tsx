"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Building2, ChevronDown, ChevronUp, Network, Sprout } from "lucide-react";
import NavShell from "@/components/NavShell";
import TickerLink from "@/components/TickerLink";

type GrowthAction = "New" | "Add" | "Reduce" | "Hold" | "Exit";

interface GrowthHolding {
  ticker: string;
  cusip: string;
  name: string;
  sector: string;
  pctPortfolio: number;
  sharesM: number;
  valueB: number;
  action: GrowthAction;
}

interface GrowthMove {
  ticker: string;
  cusip: string;
  name: string;
  action: Exclude<GrowthAction, "Hold">;
  priorSharesM: number;
  currentSharesM: number;
  priorPctPortfolio: number;
  currentPctPortfolio: number;
  quarterReported: string;
  approximatePrice?: string;
  priceBasis?: string;
}

interface GrowthInvestorProfile {
  id: string;
  name: string;
  firm: string;
  style: string;
  philosophy: string;
  reportedValue: string;
  asOf: string;
  filingSource: string;
  filingUrl: string;
  coverageNote?: string;
  holdings: GrowthHolding[];
  recentMoves: GrowthMove[];
}

type GrowthInvestorSummary = Omit<GrowthInvestorProfile, "holdings" | "recentMoves">;

const ACTION_STYLE: Record<GrowthAction, string> = {
  New: "bg-emerald-900 text-emerald-300",
  Add: "bg-blue-900 text-blue-300",
  Hold: "bg-gray-700 text-gray-300",
  Reduce: "bg-yellow-900 text-yellow-300",
  Exit: "bg-red-900 text-red-300",
};

function formatShares(value: number) {
  if (value === 0) return "0";
  if (value >= 1) return `${value.toFixed(2)}M`;
  return `${(value * 1000).toFixed(1)}K`;
}

function PositionBar({ value, maximum }: { value: number; maximum: number }) {
  return (
    <div className="flex min-w-36 items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-gray-800">
        <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${Math.round((value / maximum) * 100)}%` }} />
      </div>
      <span className="w-11 text-right text-xs text-gray-300">{value.toFixed(1)}%</span>
    </div>
  );
}

function InvestorCard({ investor }: { investor: GrowthInvestorProfile }) {
  const [expanded, setExpanded] = useState(false);
  const [view, setView] = useState<"holdings" | "moves">("holdings");
  const maximum = Math.max(...investor.holdings.map((holding) => holding.pctPortfolio));

  return (
    <section className="overflow-hidden rounded-xl border border-gray-700 bg-gray-900">
      <button
        className="flex w-full items-start justify-between p-5 text-left transition-colors hover:bg-gray-800/50"
        onClick={() => setExpanded((current) => !current)}
      >
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-white">{investor.name}</h2>
            <span className="rounded-full bg-emerald-950 px-2 py-0.5 text-xs font-medium text-emerald-300">{investor.firm}</span>
            <span className="text-xs text-gray-500">{investor.reportedValue}</span>
          </div>
          <p className="text-xs text-gray-400">{investor.style}</p>
          <p className="mt-1 text-[11px] text-gray-600">{investor.asOf}</p>
        </div>
        {expanded ? <ChevronUp className="mt-1 text-gray-400" size={18} /> : <ChevronDown className="mt-1 text-gray-400" size={18} />}
      </button>

      {expanded ? (
        <div className="border-t border-gray-700">
          <div className="border-b border-gray-700 bg-gray-800/30 px-5 py-4">
            <p className="text-xs leading-relaxed text-gray-300">{investor.philosophy}</p>
            {investor.coverageNote ? <p className="mt-2 text-[11px] leading-relaxed text-yellow-700">{investor.coverageNote}</p> : null}
            <a className="mt-2 inline-block text-[11px] text-emerald-300 underline underline-offset-2" href={investor.filingUrl} target="_blank" rel="noreferrer">
              {investor.filingSource}
            </a>
          </div>

          <div className="flex gap-2 border-b border-gray-700 px-4 py-3">
            <button onClick={() => setView("holdings")} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${view === "holdings" ? "bg-emerald-950 text-emerald-200" : "bg-gray-800 text-gray-400"}`}>
              Current top holdings
            </button>
            <button onClick={() => setView("moves")} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${view === "moves" ? "bg-emerald-950 text-emerald-200" : "bg-gray-800 text-gray-400"}`}>
              Recent moves ({investor.recentMoves.length})
            </button>
          </div>

          <div className="overflow-x-auto">
            {view === "holdings" ? (
              <table className="w-full text-xs">
                <thead><tr className="border-b border-gray-700 bg-gray-900 text-gray-400">
                  <th className="px-4 py-2.5 text-left font-medium">Company</th><th className="px-4 py-2.5 text-left font-medium">Sector</th>
                  <th className="px-4 py-2.5 text-left font-medium">% reported portfolio</th><th className="px-4 py-2.5 text-right font-medium">Value</th>
                  <th className="px-4 py-2.5 text-center font-medium">Share-count action</th>
                </tr></thead>
                <tbody>{investor.holdings.map((position) => (
                  <tr key={position.cusip} className="border-b border-gray-800 hover:bg-gray-800/40">
                    <td className="px-4 py-3"><div className="font-semibold text-white">{position.name}</div><TickerLink ticker={position.ticker} /></td>
                    <td className="px-4 py-3 text-gray-400">{position.sector}</td>
                    <td className="px-4 py-3"><PositionBar value={position.pctPortfolio} maximum={maximum} /></td>
                    <td className="px-4 py-3 text-right text-gray-300">${position.valueB.toFixed(2)}B</td>
                    <td className="px-4 py-3 text-center"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${ACTION_STYLE[position.action]}`}>{position.action}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            ) : (
              <table className="w-full text-xs">
                <thead><tr className="border-b border-gray-700 bg-gray-900 text-gray-400">
	                  <th className="px-4 py-2.5 text-left font-medium">Company</th><th className="px-4 py-2.5 text-center font-medium">Action</th>
	                  <th className="px-4 py-2.5 text-right font-medium">Reported shares</th><th className="px-4 py-2.5 text-right font-medium">Portfolio weight</th>
	                  <th className="px-4 py-2.5 text-right font-medium">Approx price</th>
	                  <th className="px-4 py-2.5 text-left font-medium">Comparison</th>
	                </tr></thead>
                <tbody>{investor.recentMoves.map((activity) => (
                  <tr key={`${activity.cusip}-${activity.action}`} className="border-b border-gray-800 hover:bg-gray-800/40">
                    <td className="px-4 py-3"><div className="font-semibold text-white">{activity.name}</div><TickerLink ticker={activity.ticker} /><div className="text-[10px] text-gray-600">CUSIP {activity.cusip}</div></td>
	                    <td className="px-4 py-3 text-center"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${ACTION_STYLE[activity.action]}`}>{activity.action}</span></td>
	                    <td className="px-4 py-3 text-right text-gray-300">{formatShares(activity.priorSharesM)} -&gt; {formatShares(activity.currentSharesM)}</td>
	                    <td className="px-4 py-3 text-right text-gray-300">{activity.priorPctPortfolio.toFixed(2)}% -&gt; {activity.currentPctPortfolio.toFixed(2)}%</td>
	                    <td className="px-4 py-3 text-right text-gray-300"><span title={activity.priceBasis}>{activity.approximatePrice ?? "—"}</span></td>
	                    <td className="px-4 py-3 text-gray-500">{activity.quarterReported}</td>
	                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default function GrowthInvestorsPage() {
  const [investors, setInvestors] = useState<GrowthInvestorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/growth-investors");
        if (!response.ok) throw new Error("Could not load growth-investor roster");
        const summaries = await response.json() as GrowthInvestorSummary[];
        const profiles = await Promise.all(summaries.map(async (summary) => {
          const detail = await fetch(`/api/growth-investors?id=${summary.id}`);
          if (!detail.ok) throw new Error(`Could not load ${summary.name}`);
          return detail.json() as Promise<GrowthInvestorProfile>;
        }));
        setInvestors(profiles);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load growth-investor data");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <NavShell active="growth-investors">
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-6xl">
          <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Sprout className="mt-0.5 text-emerald-400" size={21} />
              <div>
                <h1 className="text-lg font-bold text-white">Growth Investor Portfolios</h1>
                <p className="mt-1 max-w-4xl text-xs leading-relaxed text-gray-500">
                  A curated set of active growth styles discovered through Stockcircle and verified against official SEC 13-F filings.
                  Holdings are delayed snapshots, not live trades or recommendations.
                </p>
                <p className="mt-1 text-[11px] text-gray-600">13-F filings omit cash, private funds, many non-US securities, shorts, and the manager&apos;s actual thesis.</p>
              </div>
            </div>
            <Link href="/growth-investors/companies" className="flex items-center gap-2 rounded-lg border border-emerald-800 bg-emerald-950/50 px-3 py-2 text-xs font-medium text-emerald-200 hover:bg-emerald-900/50">
              <Network size={14} /> Open company aggregator
            </Link>
          </header>

          <div className="mb-5 flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-900/70 px-4 py-3 text-[11px] leading-relaxed text-gray-500">
            <Building2 size={15} className="shrink-0 text-gray-600" />
            “Add” and “Reduce” are based on raw reported share counts from Q1 to Q2 2026. Verify stock splits, mergers, and other corporate actions before interpreting a change.
          </div>

          {loading ? <div className="py-20 text-center text-gray-500">Loading growth investors…</div>
            : error ? <div className="rounded-xl border border-red-900 bg-red-950/30 p-5 text-sm text-red-300">{error}</div>
              : <div className="space-y-4">{investors.map((investor) => <InvestorCard key={investor.id} investor={investor} />)}</div>}
        </div>
      </main>
    </NavShell>
  );
}
