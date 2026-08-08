"use client";

import { WatchlistEntry, WatchlistKind } from "@/lib/watchlist-types";
import { fmtPrice, fmtPct, fmt, marginColor, convictionColor } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { X, BookOpen } from "lucide-react";
import TickerLink from "./TickerLink";

interface Props {
  entry: WatchlistEntry;
  kind: WatchlistKind;
  onClose: () => void;
}

function ReturnRow({ label, value }: { label: string; value: number | null }) {
  if (value == null) return null;
  const color = value >= 20 ? "text-emerald-400"
    : value >= 5 ? "text-emerald-300"
    : value >= 0 ? "text-gray-300"
    : value >= -15 ? "text-yellow-400"
    : value >= -35 ? "text-orange-400"
    : "text-red-400";
  const sign = value > 0 ? "+" : "";
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-800">
      <span className="text-xs text-gray-400">{label}</span>
      <span className={`text-xs font-bold font-mono ${color}`}>{sign}{value.toFixed(2)}%</span>
    </div>
  );
}

function Row({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-800">
      <span className="text-xs text-gray-400">{label}</span>
      <span className={`text-xs font-medium ${className || "text-gray-200"}`}>{value}</span>
    </div>
  );
}

export default function WatchlistDetailPanel({ entry, kind, onClose }: Props) {
  const isFallen = kind === "fallen";
  return (
    <div className="h-full flex flex-col bg-gray-900 border-l border-gray-700 w-88 min-w-[340px] max-w-[360px]">
      <div className="flex items-start justify-between p-4 border-b border-gray-700">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">{entry.name}</h2>
            <TickerLink ticker={entry.ticker} size="sm" className="bg-blue-950 px-1.5 py-0.5 rounded hover:bg-blue-900" />
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isFallen ? "bg-orange-900 text-orange-300" : "bg-emerald-900 text-emerald-300"}`}>
              {isFallen ? "Fallen Angel" : "Rising Angel"}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{entry.sector} · {entry.industry}</p>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <a
            href={`obsidian://open?vault=research&file=${encodeURIComponent("watchlist/" + kind + "/" + entry.ticker)}`}
            title="Open research wiki in Obsidian"
            className="inline-flex items-center justify-center w-7 h-7 rounded text-purple-400 hover:text-purple-300 hover:bg-purple-900/30 transition-colors"
          >
            <BookOpen size={14} />
          </a>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Price & conviction */}
        <div className="flex gap-3">
          {entry.currentPrice && (
            <div className="flex-1 bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-white">{fmtPrice(entry.currentPrice)}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">Current Price</div>
            </div>
          )}
          {entry.pctOffHigh != null && (
            <div className="flex-1 bg-gray-800 rounded-lg p-3 text-center">
              <div className={`text-lg font-bold ${entry.pctOffHigh <= -40 ? "text-red-400" : entry.pctOffHigh <= -20 ? "text-orange-400" : "text-yellow-400"}`}>
                {entry.pctOffHigh.toFixed(1)}%
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">Off 5Y High</div>
            </div>
          )}
          {entry.overallScore && (
            <div className="flex-1 bg-gray-800 rounded-lg p-3 text-center">
              <div className={`text-lg font-bold ${entry.overallScore >= 7 ? "text-emerald-400" : entry.overallScore >= 5 ? "text-yellow-400" : "text-red-400"}`}>
                {entry.overallScore}/10
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">Score</div>
            </div>
          )}
        </div>

        {/* Conviction */}
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded font-medium ${convictionColor(entry.conviction)}`}>{entry.conviction}</span>
          {entry.moatTypes.map((m) => (
            <Badge key={m} className="bg-blue-950 text-blue-300">{m}</Badge>
          ))}
        </div>

        {/* Price returns */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Price Returns</h3>
          <ReturnRow label="3 Months"  value={entry.return3M} />
          <ReturnRow label="6 Months"  value={entry.return6M} />
          <ReturnRow label="1 Year"    value={entry.return1Y} />
          <ReturnRow label="2 Years"   value={entry.return2Y} />
          <ReturnRow label="3 Years"   value={entry.return3Y} />
          <ReturnRow label="5 Years"   value={entry.return5Y} />
          {entry.allTimeHigh != null && (
            <Row label="5Y High" value={fmtPrice(entry.allTimeHigh)} />
          )}
          {entry.returnsLastFetched && (
            <p className="text-[10px] text-gray-600 mt-1">
              Updated: {new Date(entry.returnsLastFetched).toLocaleString()}
            </p>
          )}
        </div>

        {/* Why */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
            {isFallen ? "Why It Fell" : "Why It's Rising"}
          </h3>
          <p className="text-xs text-gray-300 leading-relaxed">{entry.thesis}</p>
        </div>

        {/* Catalysts */}
        {entry.catalysts && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Recovery / Growth Catalysts</h3>
            <p className="text-xs text-yellow-300/80 leading-relaxed">{entry.catalysts}</p>
          </div>
        )}

        {/* Risks */}
        {entry.keyRisks && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Key Risks</h3>
            <p className="text-xs text-red-300/80 leading-relaxed">{entry.keyRisks}</p>
          </div>
        )}

        {/* Snapshot financials */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Financials</h3>
          <Row label="Gross Margin"    value={fmtPct(entry.grossMarginPct)}     className={marginColor(entry.grossMarginPct)} />
          <Row label="Operating Margin" value={fmtPct(entry.operatingMarginPct)} className={marginColor(entry.operatingMarginPct)} />
          <Row label="Revenue Growth 1Y" value={fmtPct(entry.revenueGrowth1Y)}  className={entry.revenueGrowth1Y != null && entry.revenueGrowth1Y >= 0 ? "text-emerald-400" : "text-red-400"} />
          <Row label="ROIC"             value={fmtPct(entry.roic)}              className={marginColor(entry.roic)} />
          <Row label="P/E"              value={fmt(entry.pe)} />
          <Row label="Market Cap"       value={entry.marketCapB ? `$${fmt(entry.marketCapB, "B")}` : "—"} />
        </div>
      </div>
    </div>
  );
}
