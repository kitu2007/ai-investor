"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Network, Search } from "lucide-react";
import NavShell from "@/components/NavShell";
import TickerLink from "@/components/TickerLink";

interface CompanyAggregate {
  ticker: string;
  cusip: string;
  name: string;
  owners: { manager: string; weight: number; action: string }[];
  buyers: string[];
  sellers: string[];
  net: number;
}

interface CompanyResponse {
  reportingPeriod: string;
  comparisonPeriod: string;
  sourceCatalog: string;
  sourceCatalogUrl: string;
  includedManagers: string[];
  methodology: string;
  rows: CompanyAggregate[];
}

type Filter = "all" | "shared" | "bought" | "sold";

export default function GrowthCompanyAggregatorPage() {
  const [data, setData] = useState<CompanyResponse | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/growth-investors?view=companies")
      .then((response) => {
        if (!response.ok) throw new Error("Could not load company aggregation");
        return response.json() as Promise<CompanyResponse>;
      })
      .then(setData)
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Could not load company aggregation"));
  }, []);

  const rows = useMemo(() => {
    if (!data) return [];
    const normalized = query.trim().toLowerCase();
    return data.rows
      .filter((row) => {
        if (filter === "shared" && row.owners.length < 2) return false;
        if (filter === "bought" && row.buyers.length === 0) return false;
        if (filter === "sold" && row.sellers.length === 0) return false;
        return !normalized || `${row.name} ${row.ticker} ${row.cusip} ${row.owners.map((owner) => owner.manager).join(" ")}`.toLowerCase().includes(normalized);
      })
      .sort((a, b) => {
        if (filter === "bought") return b.buyers.length - a.buyers.length || b.net - a.net;
        if (filter === "sold") return b.sellers.length - a.sellers.length || a.net - b.net;
        if (filter === "shared") return b.owners.length - a.owners.length || b.net - a.net;
        return b.net - a.net || b.owners.length - a.owners.length || a.name.localeCompare(b.name);
      });
  }, [data, filter, query]);

  return (
    <NavShell active="growth-investors">
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-7xl">
          <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Network className="mt-0.5 text-emerald-400" size={21} />
              <div>
                <h1 className="text-lg font-bold text-white">Growth Investor Company Aggregator</h1>
                <p className="mt-1 max-w-4xl text-xs leading-relaxed text-gray-500">
                  Compare overlap in displayed top-ten holdings with reported Q2-versus-Q1 share-count activity across the selected growth managers.
                </p>
              </div>
            </div>
            <Link href="/growth-investors" className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-gray-300 hover:text-white">
              <ArrowLeft size={14} /> Investor profiles
            </Link>
          </header>

          {error ? <div className="rounded-xl border border-red-900 bg-red-950/30 p-5 text-sm text-red-300">{error}</div> : null}
          {!data && !error ? <div className="py-20 text-center text-gray-500">Loading company aggregation…</div> : null}

          {data ? (
            <>
              <section className="mb-4 rounded-xl border border-gray-700 bg-gray-900 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-white">{data.reportingPeriod} · {data.includedManagers.length} managers</h2>
                    <p className="mt-1 max-w-5xl text-xs leading-relaxed text-gray-400">{data.methodology}</p>
                    <p className="mt-1 text-[11px] text-gray-600">Included: {data.includedManagers.join(", ")}</p>
                  </div>
                  <a href={data.sourceCatalogUrl} target="_blank" rel="noreferrer" className="text-xs text-emerald-300 underline underline-offset-2">Roster: {data.sourceCatalog}</a>
                </div>
                <p className="mt-2 text-[11px] text-yellow-700">A reduction can coexist with a higher portfolio weight when the security price rises. This is delayed disclosure, not a conviction or timing score.</p>
              </section>

              <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="relative min-w-64 flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 text-gray-600" size={14} />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search company, ticker, CUSIP, or manager" className="w-full rounded-lg border border-gray-700 bg-gray-900 py-2 pl-9 pr-3 text-xs text-white outline-none focus:border-emerald-600" />
                </div>
                {([['all', 'All companies'], ['shared', 'Shared top holdings'], ['bought', 'Reported buys'], ['sold', 'Reported sells']] as const).map(([id, label]) => (
                  <button key={id} onClick={() => setFilter(id)} className={`rounded-lg border px-3 py-2 text-xs font-medium ${filter === id ? "border-emerald-600 bg-emerald-950/60 text-emerald-200" : "border-gray-700 bg-gray-900 text-gray-400 hover:text-white"}`}>
                    {label}
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-700 bg-gray-900">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-gray-700 bg-gray-800/50 text-gray-400">
                    <th className="px-4 py-3 text-left font-medium">Company</th>
                    <th className="px-4 py-3 text-center font-medium">Top-10 owners</th>
                    <th className="px-4 py-3 text-left font-medium">Displayed ownership overlap</th>
                    <th className="px-4 py-3 text-center font-medium">Buyers</th>
	                    <th className="px-4 py-3 text-left font-medium">Adds / new</th>
	                    <th className="px-4 py-3 text-center font-medium">Sellers</th>
	                    <th className="px-4 py-3 text-left font-medium">Reductions / exits</th>
	                    <th className="px-4 py-3 text-center font-medium">Net</th>
	                  </tr></thead>
                  <tbody>{rows.map((row) => (
                    <tr key={row.cusip} className="border-b border-gray-800 align-top hover:bg-gray-800/40">
                      <td className="px-4 py-3"><div className="font-semibold text-white">{row.name}</div><TickerLink ticker={row.ticker} /><div className="text-[10px] text-gray-600">CUSIP {row.cusip}</div></td>
                      <td className="px-4 py-3 text-center font-semibold text-emerald-300">{row.owners.length}</td>
                      <td className="max-w-sm px-4 py-3 leading-relaxed text-gray-300">{row.owners.length ? row.owners.map((owner) => `${owner.manager} ${owner.weight.toFixed(1)}%`).join(", ") : "—"}</td>
                      <td className="px-4 py-3 text-center text-blue-300">{row.buyers.length}</td>
                      <td className="max-w-xs px-4 py-3 leading-relaxed text-gray-400">{row.buyers.length ? row.buyers.join(", ") : "—"}</td>
	                      <td className="px-4 py-3 text-center text-red-300">{row.sellers.length}</td>
	                      <td className="max-w-xs px-4 py-3 leading-relaxed text-gray-400">{row.sellers.length ? row.sellers.join(", ") : "—"}</td>
	                      <td className={`px-4 py-3 text-center font-semibold ${row.net > 0 ? "text-emerald-300" : row.net < 0 ? "text-red-300" : "text-gray-400"}`}>{row.net > 0 ? `+${row.net}` : row.net}</td>
	                    </tr>
                  ))}</tbody>
                </table>
                {!rows.length ? <div className="p-8 text-center text-sm text-gray-500">No companies match this filter.</div> : null}
              </div>
            </>
          ) : null}
        </div>
      </main>
    </NavShell>
  );
}
