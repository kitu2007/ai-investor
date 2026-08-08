"use client";

import { useState } from "react";
import { Company, MoatType, ConvictionLevel, VALUE_INVESTORS } from "@/lib/types";
import { nanoid } from "@/lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { X, Loader2 } from "lucide-react";

const MOAT_TYPES: MoatType[] = [
  "Brand", "Switching Costs", "Network Effects", "Cost Advantage",
  "IP / Patents", "Regulatory", "Efficient Scale", "None",
];

const CONVICTION_LEVELS: ConvictionLevel[] = ["High", "Medium", "Low", "Watch"];

const emptyCompany = (): Omit<Company, "id" | "dateAdded" | "lastUpdated" | "financialsLastFetched"> => ({
  name: "", ticker: "", exchange: "", sector: "", industry: "",
  description: "", keyProducts: [], revenueSegments: [],
  moatTypes: [], moatScore: null, brandStrength: null, switchingCosts: null,
  networkEffects: null, pricingPower: null, managementQuality: null,
  insiderOwnershipPct: null, rdEffectiveness: null, rdPctRevenue: null,
  laborRelations: null, ceoName: "", ceoTenureYears: null, founderLed: null,
  nextCatalyst: "", lastEarningsBeat: null, gurus: [],
  scuttlebuttNotes: "",
  grossMarginPct: null, operatingMarginPct: null, netMarginPct: null,
  fcfMarginPct: null, revenueGrowth1Y: null, revenueCAGR3Y: null,
  revenueCAGR5Y: null, epsGrowth3Y: null, roic: null, roe: null,
  debtToEquity: null, currentRatio: null,
  currentPrice: null, pe: null, pFcf: null, evEbitda: null,
  week52High: null, week52Low: null, marketCapB: null,
  overallScore: null, conviction: "Watch", notes: "",
});

interface Props {
  initial?: Company;
  onSave: (c: Company) => void;
  onClose: () => void;
}

export default function CompanyForm({ initial, onSave, onClose }: Props) {
  const [data, setData] = useState<ReturnType<typeof emptyCompany>>(
    initial ? { ...initial } : emptyCompany()
  );
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [productsInput, setProductsInput] = useState(
    initial?.keyProducts.join(", ") ?? ""
  );

  const set = (field: string, value: unknown) =>
    setData((prev) => ({ ...prev, [field]: value }));

  const num = (v: string) => (v === "" ? null : parseFloat(v));

  async function fetchFinancials() {
    if (!data.ticker) return;
    setFetching(true);
    setFetchError("");
    try {
      const res = await fetch(`/api/financials?ticker=${data.ticker.toUpperCase()}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData((prev) => ({ ...prev, ...json }));
    } catch (e) {
      setFetchError(String(e));
    } finally {
      setFetching(false);
    }
  }

  function handleSave() {
    const products = productsInput.split(",").map((s) => s.trim()).filter(Boolean);
    const company: Company = {
      ...data,
      keyProducts: products,
      id: initial?.id ?? nanoid(),
      dateAdded: initial?.dateAdded ?? new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      financialsLastFetched: initial?.financialsLastFetched ?? null,
    };
    onSave(company);
  }

  function renderScoreInput(label: string, field: string) {
    const val = data[field as keyof typeof data] as number | null;
    return (
      <div>
        <label className="block text-xs text-gray-400 mb-1">{label}</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => set(field, val === n ? null : n)}
              className={`w-8 h-8 rounded text-sm font-bold transition-colors ${
                val === n
                  ? n >= 4 ? "bg-emerald-600 text-white" : n >= 3 ? "bg-yellow-600 text-white" : "bg-red-700 text-white"
                  : "bg-gray-700 text-gray-400 hover:bg-gray-600"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    );
  }

  function renderNumField(label: string, field: string, suffix = "") {
    const val = data[field as keyof typeof data] as number | null;
    return (
      <div>
        <label className="block text-xs text-gray-400 mb-1">{label}</label>
        <div className="relative">
          <Input
            type="number"
            step="0.01"
            value={val ?? ""}
            onChange={(e) => set(field, num(e.target.value))}
            placeholder="—"
          />
          {suffix && (
            <span className="absolute right-2 top-1.5 text-xs text-gray-500">{suffix}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 overflow-y-auto py-8">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-3xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">
            {initial ? "Edit Company" : "Add Company"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Identity */}
          <section>
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">Identity</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Company Name *</label>
                <Input value={data.name} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Ticker *</label>
                <div className="flex gap-2">
                  <Input
                    value={data.ticker}
                    onChange={(e) => set("ticker", e.target.value.toUpperCase())}
                    placeholder="e.g. AAPL"
                    className="uppercase"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchFinancials}
                    disabled={fetching || !data.ticker}
                    className="whitespace-nowrap"
                  >
                    {fetching ? <Loader2 size={14} className="animate-spin" /> : "Fetch Data"}
                  </Button>
                </div>
                {fetchError && <p className="text-xs text-red-400 mt-1">{fetchError}</p>}
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Exchange</label>
                <Input value={data.exchange} onChange={(e) => set("exchange", e.target.value)} placeholder="NYSE / NASDAQ" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Sector</label>
                <Input value={data.sector} onChange={(e) => set("sector", e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Industry</label>
                <Input value={data.industry} onChange={(e) => set("industry", e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Business Description</label>
                <Textarea
                  rows={2}
                  value={data.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="What does this company do?"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Key Products / Services (comma separated)</label>
                <Input
                  value={productsInput}
                  onChange={(e) => setProductsInput(e.target.value)}
                  placeholder="iPhone, Mac, Services, App Store"
                />
              </div>
            </div>
          </section>

          {/* Moat & Qualitative */}
          <section>
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">
              Moat & Qualitative (Fisher / Buffett)
            </h3>

            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-2">Moat Types</label>
              <div className="flex flex-wrap gap-2">
                {MOAT_TYPES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      const current = data.moatTypes as MoatType[];
                      set("moatTypes", current.includes(m)
                        ? current.filter((x) => x !== m)
                        : [...current, m]);
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      (data.moatTypes as MoatType[]).includes(m)
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {renderScoreInput("Overall Moat Score", "moatScore")}
              {renderScoreInput("Brand Strength", "brandStrength")}
              {renderScoreInput("Switching Costs", "switchingCosts")}
              {renderScoreInput("Network Effects", "networkEffects")}
              {renderScoreInput("Pricing Power", "pricingPower")}
              {renderScoreInput("Management Quality", "managementQuality")}
              {renderScoreInput("R&D Effectiveness", "rdEffectiveness")}
              {renderNumField("R&D % of Revenue", "rdPctRevenue", "%")}
              {renderScoreInput("Labor Relations", "laborRelations")}
              {renderNumField("Insider Ownership %", "insiderOwnershipPct", "%")}
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">CEO Name</label>
                <Input value={data.ceoName as string} onChange={(e) => set("ceoName", e.target.value)} placeholder="e.g. Jensen Huang" />
              </div>
              {renderNumField("CEO Tenure (years)", "ceoTenureYears")}
              <div>
                <label className="block text-xs text-gray-400 mb-2">Founder-Led</label>
                <div className="flex gap-2">
                  {[{ label: "Yes", val: true }, { label: "No", val: false }].map(({ label, val }) => (
                    <button key={label} type="button"
                      onClick={() => set("founderLed", data.founderLed === val ? null : val)}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        data.founderLed === val ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                      }`}>{label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-2">Last Earnings Beat</label>
                <div className="flex gap-2">
                  {[{ label: "Beat", val: true }, { label: "Missed", val: false }].map(({ label, val }) => (
                    <button key={label} type="button"
                      onClick={() => set("lastEarningsBeat", data.lastEarningsBeat === val ? null : val)}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        data.lastEarningsBeat === val
                          ? val ? "bg-emerald-700 text-emerald-100" : "bg-red-800 text-red-100"
                          : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                      }`}>{label}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-xs text-gray-400 mb-1">Next Catalyst (upcoming product / event)</label>
              <Input
                value={data.nextCatalyst as string}
                onChange={(e) => set("nextCatalyst", e.target.value)}
                placeholder="e.g. Blackwell GB300 ramp Q2 2026, earnings May 2026"
              />
            </div>
            <div className="mt-4">
              <label className="block text-xs text-gray-400 mb-2">Value Investor Owners (Gurus / Whales)</label>
              <div className="flex flex-wrap gap-2">
                {VALUE_INVESTORS.map((g) => {
                  const selected = (data.gurus as string[]).includes(g);
                  return (
                    <button key={g} type="button"
                      onClick={() => {
                        const cur = data.gurus as string[];
                        set("gurus", selected ? cur.filter((x) => x !== g) : [...cur, g]);
                      }}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        selected ? "bg-purple-700 text-purple-100" : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                      }`}
                    >{g}</button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs text-gray-400 mb-1">Scuttlebutt Notes (Fisher&rsquo;s channel checks)</label>
              <Textarea
                rows={3}
                value={data.scuttlebuttNotes}
                onChange={(e) => set("scuttlebuttNotes", e.target.value)}
                placeholder="What customers, suppliers, competitors say about this company..."
              />
            </div>
          </section>

          {/* Financials */}
          <section>
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">
              Financials
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {renderNumField("Gross Margin %", "grossMarginPct", "%")}
              {renderNumField("Operating Margin %", "operatingMarginPct", "%")}
              {renderNumField("Net Margin %", "netMarginPct", "%")}
              {renderNumField("FCF Margin %", "fcfMarginPct", "%")}
              {renderNumField("Revenue Growth 1Y %", "revenueGrowth1Y", "%")}
              {renderNumField("Revenue CAGR 3Y %", "revenueCAGR3Y", "%")}
              {renderNumField("Revenue CAGR 5Y %", "revenueCAGR5Y", "%")}
              {renderNumField("EPS Growth 3Y %", "epsGrowth3Y", "%")}
              {renderNumField("ROIC %", "roic", "%")}
              {renderNumField("ROE %", "roe", "%")}
              {renderNumField("Debt / Equity", "debtToEquity")}
              {renderNumField("Current Ratio", "currentRatio")}
            </div>
          </section>

          {/* Price Context */}
          <section>
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">
              Price Context
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {renderNumField("Current Price", "currentPrice")}
              {renderNumField("52W High", "week52High")}
              {renderNumField("52W Low", "week52Low")}
              {renderNumField("Market Cap ($B)", "marketCapB")}
              {renderNumField("P/E", "pe")}
              {renderNumField("P/FCF", "pFcf")}
              {renderNumField("EV/EBITDA", "evEbitda")}
            </div>
          </section>

          {/* Meta */}
          <section>
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">
              Your Verdict
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Overall Score (1–10)</label>
                <div className="flex gap-1 flex-wrap">
                  {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => set("overallScore", data.overallScore === n ? null : n)}
                      className={`w-8 h-8 rounded text-sm font-bold transition-colors ${
                        data.overallScore === n
                          ? n >= 8 ? "bg-emerald-600 text-white" : n >= 5 ? "bg-yellow-600 text-white" : "bg-red-700 text-white"
                          : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Conviction</label>
                <div className="flex gap-2">
                  {CONVICTION_LEVELS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => set("conviction", c)}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        data.conviction === c
                          ? c === "High" ? "bg-emerald-700 text-emerald-100"
                          : c === "Medium" ? "bg-blue-700 text-blue-100"
                          : c === "Watch" ? "bg-yellow-700 text-yellow-100"
                          : "bg-gray-600 text-gray-200"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs text-gray-400 mb-1">Investment Notes</label>
              <Textarea
                rows={3}
                value={data.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Why you like or dislike this company, thesis, risks..."
              />
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-5 border-t border-gray-700">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!data.name || !data.ticker}>
            Save Company
          </Button>
        </div>
      </div>
    </div>
  );
}
