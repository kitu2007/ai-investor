"use client";

import { Company } from "@/lib/types";
import { fmt, fmtPct, fmtPrice, scoreColor, marginColor, growthColor, convictionColor } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { X, Edit2, Trash2, BookOpen } from "lucide-react";
import TickerLink from "./TickerLink";

interface Props {
  company: Company;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

function Row({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-800">
      <span className="text-xs text-gray-400">{label}</span>
      <span className={`text-xs font-medium ${className || "text-gray-200"}`}>{value}</span>
    </div>
  );
}

function ScoreBar({ score }: { score: number | null }) {
  if (!score) return <span className="text-gray-500 text-xs">—</span>;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[1,2,3,4,5].map((n) => (
          <div
            key={n}
            className={`h-3 w-3 rounded-sm ${
              n <= score
                ? score >= 4 ? "bg-emerald-500" : score >= 3 ? "bg-yellow-500" : "bg-red-500"
                : "bg-gray-700"
            }`}
          />
        ))}
      </div>
      <span className={`text-xs font-bold ${scoreColor(score)}`}>{score}/5</span>
    </div>
  );
}

export default function DetailPanel({ company, onEdit, onDelete, onClose }: Props) {
  return (
    <div className="h-full flex flex-col bg-gray-900 border-l border-gray-700 w-96">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-gray-700">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">{company.name}</h2>
            <TickerLink ticker={company.ticker} size="sm" className="bg-blue-950 px-1.5 py-0.5 rounded hover:bg-blue-900" />
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{company.sector} · {company.industry}</p>
        </div>
        <div className="flex items-center gap-1">
          <a
            href={`obsidian://open?vault=research&file=${encodeURIComponent("portfolio/" + company.ticker)}`}
            title="Open research wiki in Obsidian"
            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-purple-400 hover:text-purple-300 hover:bg-purple-900/30 transition-colors"
          >
            <BookOpen size={14} />
          </a>
          <Button variant="ghost" size="icon" onClick={onEdit}><Edit2 size={14} /></Button>
          <Button variant="ghost" size="icon" onClick={onDelete} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></Button>
          <Button variant="ghost" size="icon" onClick={onClose}><X size={14} /></Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Conviction & Score */}
        <div className="flex gap-3">
          {company.overallScore && (
            <div className="flex-1 bg-gray-800 rounded-lg p-3 text-center">
              <div className={`text-2xl font-bold ${
                company.overallScore >= 8 ? "text-emerald-400"
                : company.overallScore >= 5 ? "text-yellow-400"
                : "text-red-400"
              }`}>{company.overallScore}/10</div>
              <div className="text-xs text-gray-400 mt-0.5">Overall Score</div>
            </div>
          )}
          <div className="flex-1 bg-gray-800 rounded-lg p-3 text-center">
            <div className={`text-sm font-semibold px-2 py-1 rounded inline-block ${convictionColor(company.conviction)}`}>
              {company.conviction}
            </div>
            <div className="text-xs text-gray-400 mt-1">Conviction</div>
          </div>
          {company.currentPrice && (
            <div className="flex-1 bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-white">{fmtPrice(company.currentPrice)}</div>
              <div className="text-xs text-gray-400 mt-0.5">Price</div>
            </div>
          )}
        </div>

        {/* Description */}
        {company.description && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">About</h3>
            <p className="text-xs text-gray-300 leading-relaxed">{company.description}</p>
          </div>
        )}

        {/* Products */}
        {company.keyProducts.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Key Products / Services</h3>
            <div className="flex flex-wrap gap-1.5">
              {company.keyProducts.map((p) => (
                <Badge key={p} variant="outline">{p}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Moat */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Moat</h3>
          {company.moatTypes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {company.moatTypes.map((m) => (
                <Badge key={m} className="bg-blue-900 text-blue-300">{m}</Badge>
              ))}
            </div>
          )}
          <div className="space-y-1.5">
            {[
              { label: "Moat Score", val: company.moatScore },
              { label: "Brand Strength", val: company.brandStrength },
              { label: "Switching Costs", val: company.switchingCosts },
              { label: "Network Effects", val: company.networkEffects },
              { label: "Pricing Power", val: company.pricingPower },
              { label: "Management Quality", val: company.managementQuality },
              { label: "R&D Effectiveness", val: company.rdEffectiveness },
              { label: "Labor Relations", val: company.laborRelations },
            ].map(({ label, val }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{label}</span>
                <ScoreBar score={val} />
              </div>
            ))}
            {company.insiderOwnershipPct != null && (
              <Row label="Insider Ownership" value={fmtPct(company.insiderOwnershipPct)} />
            )}
            {company.rdPctRevenue != null && (
              <Row label="R&D % of Revenue" value={fmtPct(company.rdPctRevenue)} />
            )}
          </div>
        </div>

        {/* Gurus */}
        {(company.gurus ?? []).length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Value Investor Owners</h3>
            <div className="flex flex-wrap gap-1.5">
              {(company.gurus ?? []).map((g) => (
                <span key={g} className="text-xs bg-purple-900/60 text-purple-300 border border-purple-800/50 px-2 py-0.5 rounded-full font-medium">
                  {g}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Management */}
        {(company.ceoName || company.ceoTenureYears != null || company.lastEarningsBeat != null) && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Management</h3>
            {company.ceoName && (
              <div className="flex items-center justify-between py-1.5 border-b border-gray-800">
                <span className="text-xs text-gray-400">CEO</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-200">{company.ceoName}</span>
                  {company.founderLed && (
                    <span className="text-[10px] bg-amber-900 text-amber-300 px-1.5 py-0.5 rounded font-medium">Founder-Led</span>
                  )}
                  {company.founderLed === false && (
                    <span className="text-[10px] bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded">Professional CEO</span>
                  )}
                </div>
              </div>
            )}
            {company.ceoTenureYears != null && (
              <Row label="CEO Tenure" value={`${company.ceoTenureYears} years`} />
            )}
            {company.lastEarningsBeat != null && (
              <div className="flex justify-between py-1.5 border-b border-gray-800">
                <span className="text-xs text-gray-400">Last Earnings</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${company.lastEarningsBeat ? "bg-emerald-900 text-emerald-300" : "bg-red-900 text-red-300"}`}>
                  {company.lastEarningsBeat ? "Beat estimates" : "Missed estimates"}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Next Catalyst */}
        {company.nextCatalyst && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Next Catalyst</h3>
            <p className="text-xs text-yellow-300/80 leading-relaxed">{company.nextCatalyst}</p>
          </div>
        )}

        {/* Scuttlebutt */}
        {company.scuttlebuttNotes && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Scuttlebutt Notes</h3>
            <p className="text-xs text-gray-300 leading-relaxed italic">{company.scuttlebuttNotes}</p>
          </div>
        )}

        {/* Financials */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Financials</h3>
          <Row label="Gross Margin" value={fmtPct(company.grossMarginPct)} className={marginColor(company.grossMarginPct)} />
          <Row label="Operating Margin" value={fmtPct(company.operatingMarginPct)} className={marginColor(company.operatingMarginPct)} />
          <Row label="Net Margin" value={fmtPct(company.netMarginPct)} className={marginColor(company.netMarginPct)} />
          <Row label="FCF Margin" value={fmtPct(company.fcfMarginPct)} className={marginColor(company.fcfMarginPct)} />
          <Row label="Revenue Growth 1Y" value={fmtPct(company.revenueGrowth1Y)} className={growthColor(company.revenueGrowth1Y)} />
          <Row label="Revenue CAGR 3Y" value={fmtPct(company.revenueCAGR3Y)} className={growthColor(company.revenueCAGR3Y)} />
          <Row label="Revenue CAGR 5Y" value={fmtPct(company.revenueCAGR5Y)} className={growthColor(company.revenueCAGR5Y)} />
          <Row label="EPS Growth 3Y" value={fmtPct(company.epsGrowth3Y)} className={growthColor(company.epsGrowth3Y)} />
          <Row label="ROIC" value={fmtPct(company.roic)} className={marginColor(company.roic)} />
          <Row label="ROE" value={fmtPct(company.roe)} className={marginColor(company.roe)} />
          <Row label="Debt / Equity" value={fmt(company.debtToEquity)} />
          <Row label="Current Ratio" value={fmt(company.currentRatio)} />
        </div>

        {/* Valuation */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Valuation</h3>
          <Row label="Current Price" value={fmtPrice(company.currentPrice)} />
          <Row label="52W High" value={fmtPrice(company.week52High)} />
          <Row label="52W Low" value={fmtPrice(company.week52Low)} />
          <Row label="Market Cap" value={company.marketCapB ? `$${fmt(company.marketCapB, "B", 1)}` : "—"} />
          <Row label="P/E" value={fmt(company.pe)} />
          <Row label="P/FCF" value={fmt(company.pFcf)} />
          <Row label="EV/EBITDA" value={fmt(company.evEbitda)} />
        </div>

        {/* Notes */}
        {company.notes && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Investment Notes</h3>
            <p className="text-xs text-gray-300 leading-relaxed">{company.notes}</p>
          </div>
        )}

        <div className="text-xs text-gray-600 pt-2">
          Added: {new Date(company.dateAdded).toLocaleDateString()}<br />
          Updated: {new Date(company.lastUpdated).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
