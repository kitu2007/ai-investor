"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Users } from "lucide-react";
import NavShell from "@/components/NavShell";
import TickerLink from "@/components/TickerLink";

interface GuruHolding {
  ticker: string;
  name: string;
  sector: string;
  pctPortfolio: number;
  sharesM: number | null;
  valueB: number | null;
  action: "New" | "Add" | "Reduce" | "Hold" | "Exit";
  quarterReported: string;
  notes: string;
}

interface GuruProfile {
  id: string;
  name: string;
  firm: string;
  style: string;
  aum: string;
  philosophy: string;
  holdings: GuruHolding[];
  filingSource: string;
  asOf: string;
}

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

function GuruCard({ guru }: { guru: GuruProfile }) {
  const [expanded, setExpanded] = useState(false);
  const maxPct = Math.max(...guru.holdings.map((h) => h.pctPortfolio));

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
            <p className="text-xs text-gray-300 italic leading-relaxed">
              &ldquo;{guru.philosophy}&rdquo;
            </p>
            <p className="text-xs text-gray-600 mt-2">{guru.filingSource}</p>
          </div>

          {/* Holdings table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-900">
                  <th className="px-4 py-2.5 text-left text-gray-400 font-medium">Company</th>
                  <th className="px-4 py-2.5 text-left text-gray-400 font-medium">Sector</th>
                  <th className="px-4 py-2.5 text-left text-gray-400 font-medium w-40">% Portfolio</th>
                  <th className="px-4 py-2.5 text-right text-gray-400 font-medium">Value</th>
                  <th className="px-4 py-2.5 text-center text-gray-400 font-medium">Action</th>
                  <th className="px-4 py-2.5 text-left text-gray-400 font-medium">Thesis</th>
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
        </div>
      )}
    </div>
  );
}

export default function GurusPage() {
  const [gurus, setGurus] = useState<GuruProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/gurus")
      .then((r) => r.json())
      .then(async (list) => {
        const full = await Promise.all(
          list.map((g: GuruProfile) => fetch(`/api/gurus?id=${g.id}`).then((r) => r.json()))
        );
        setGurus(full);
        setLoading(false);
      });
  }, []);

  return (
    <NavShell active="gurus">
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Users size={20} className="text-purple-400" />
            <div>
              <h2 className="text-lg font-bold text-white">Value Investor Portfolios</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Latest disclosed holdings from 13-F filings and annual reports. Click any card to expand.
                <span className="ml-2 text-yellow-600">⚠ Holdings are point-in-time snapshots — positions may have changed.</span>
              </p>
            </div>
          </div>
          {loading ? (
            <div className="text-center py-20 text-gray-500">Loading guru portfolios...</div>
          ) : (
            <div className="space-y-4">
              {gurus.map((g) => <GuruCard key={g.id} guru={g} />)}
            </div>
          )}
        </div>
      </div>
    </NavShell>
  );
}
