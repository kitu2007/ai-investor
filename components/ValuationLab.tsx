"use client";

import { Calculator, ChevronDown, ChevronUp, LoaderCircle } from "lucide-react";
import { FormEvent, useState } from "react";

import type { ValuationResponse, ValuationScenarioInput } from "@/lib/investment-os-types";

type ScenarioFields = {
  probability: string;
  annualGrowth: string;
  discountRate: string;
  terminalGrowth: string;
};

const DEFAULT_SCENARIOS: Record<"bear" | "base" | "bull", ScenarioFields> = {
  bear: { probability: "25", annualGrowth: "0", discountRate: "12", terminalGrowth: "2" },
  base: { probability: "50", annualGrowth: "10", discountRate: "10", terminalGrowth: "2.5" },
  bull: { probability: "25", annualGrowth: "20", discountRate: "9", terminalGrowth: "3" },
};

function percent(value: number | null, digits = 1): string {
  return value == null ? "—" : (value * 100).toFixed(digits) + "%";
}

function dollars(value: number): string {
  return "$" + value.toFixed(2);
}

async function valuationRequest(body: Record<string, unknown>): Promise<ValuationResponse> {
  const response = await fetch("/api/investment-os/valuation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as ValuationResponse & { error?: string };
  if (!response.ok) throw new Error(payload.error || "Valuation request failed.");
  return payload;
}

export default function ValuationLab({
  ticker,
  currentPrice,
}: {
  ticker: string;
  currentPrice: number | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [price, setPrice] = useState("");
  const [normalizedFcf, setNormalizedFcf] = useState("");
  const [shares, setShares] = useState("");
  const [netDebt, setNetDebt] = useState("0");
  const [forecastYears, setForecastYears] = useState("5");
  const [scenarios, setScenarios] = useState(DEFAULT_SCENARIOS);
  const [result, setResult] = useState<ValuationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const displayedPrice = price || (currentPrice ? currentPrice.toFixed(2) : "");

  function updateScenario(
    name: "bear" | "base" | "bull",
    field: keyof ScenarioFields,
    value: string,
  ) {
    setScenarios((current) => ({
      ...current,
      [name]: { ...current[name], [field]: value },
    }));
  }

  async function calculate(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const scenarioPayload: ValuationScenarioInput[] = (
        ["bear", "base", "bull"] as const
      ).map((name) => ({
        name,
        probability: Number(scenarios[name].probability) / 100,
        annual_fcf_growth: Number(scenarios[name].annualGrowth) / 100,
        discount_rate: Number(scenarios[name].discountRate) / 100,
        terminal_growth: Number(scenarios[name].terminalGrowth) / 100,
      }));
      setResult(
        await valuationRequest({
          ticker,
          current_price: Number(displayedPrice),
          normalized_fcf: Number(normalizedFcf),
          shares_outstanding: Number(shares),
          net_debt: Number(netDebt),
          forecast_years: Number(forecastYears),
          scenarios: scenarioPayload,
        }),
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not calculate valuation.");
    } finally {
      setLoading(false);
    }
  }

  const ready = Boolean(
    ticker && Number(displayedPrice) > 0 && Number(normalizedFcf) > 0 && Number(shares) > 0,
  );

  return (
    <section className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.035]">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-center justify-between p-4 text-left"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2 text-xs font-semibold text-emerald-200">
          <Calculator size={14} /> Deterministic valuation lab
        </span>
        {expanded ? (
          <ChevronUp size={14} className="text-gray-600" />
        ) : (
          <ChevronDown size={14} className="text-gray-600" />
        )}
      </button>

      {expanded ? (
        <form onSubmit={calculate} className="border-t border-emerald-400/10 p-4">
          <p className="text-[10px] leading-4 text-gray-500">
            Enter normalized company inputs in USD billions. Rates below are visible example assumptions—edit
            them before relying on the output.
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              ["Current price", displayedPrice, setPrice],
              ["Normalized FCF ($B)", normalizedFcf, setNormalizedFcf],
              ["Diluted shares (B)", shares, setShares],
              ["Net debt ($B)", netDebt, setNetDebt],
            ].map(([label, value, setter]) => (
              <label key={label as string} className="text-[9px] uppercase tracking-wide text-gray-600">
                {label as string}
                <input
                  type="number"
                  step="any"
                  value={value as string}
                  onChange={(event) => (setter as (value: string) => void)(event.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-800 bg-gray-950 px-2 py-1.5 text-xs normal-case text-gray-200 outline-none focus:border-emerald-500"
                />
              </label>
            ))}
          </div>

          <label className="mt-2 block text-[9px] uppercase tracking-wide text-gray-600">
            Forecast years
            <input
              type="number"
              min="1"
              max="10"
              value={forecastYears}
              onChange={(event) => setForecastYears(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-800 bg-gray-950 px-2 py-1.5 text-xs normal-case text-gray-200 outline-none focus:border-emerald-500"
            />
          </label>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-[9px] text-gray-500">
              <thead>
                <tr className="text-left uppercase tracking-wide text-gray-700">
                  <th className="pb-1">Case</th>
                  <th className="pb-1">Prob %</th>
                  <th className="pb-1">FCF growth %</th>
                  <th className="pb-1">Discount %</th>
                  <th className="pb-1">Terminal %</th>
                </tr>
              </thead>
              <tbody>
                {(["bear", "base", "bull"] as const).map((name) => (
                  <tr key={name}>
                    <td className="pr-1 font-medium capitalize text-gray-400">{name}</td>
                    {(
                      ["probability", "annualGrowth", "discountRate", "terminalGrowth"] as const
                    ).map((field) => (
                      <td key={field} className="py-1 pr-1">
                        <input
                          aria-label={`${name} ${field}`}
                          type="number"
                          step="any"
                          value={scenarios[name][field]}
                          onChange={(event) => updateScenario(name, field, event.target.value)}
                          className="w-14 rounded border border-gray-800 bg-gray-950 px-1.5 py-1 text-[10px] text-gray-300 outline-none focus:border-emerald-500"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            disabled={!ready || loading}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
          >
            {loading ? <LoaderCircle size={13} className="animate-spin" /> : <Calculator size={13} />}
            Calculate scenarios
          </button>
          {error ? <p className="mt-2 text-[10px] leading-4 text-rose-300">{error}</p> : null}

          {result ? (
            <div className="mt-3 space-y-2 border-t border-emerald-400/10 pt-3">
              <div className="rounded-lg border border-emerald-400/15 bg-gray-950/50 p-3">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="text-[9px] uppercase tracking-wide text-gray-600">Weighted value</div>
                    <div className="mt-1 text-xl font-semibold text-emerald-200">
                      {dollars(result.probability_weighted_fair_value)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-300">
                      {percent(result.probability_weighted_upside_downside)}
                    </div>
                    <div className="text-[9px] text-gray-600">vs current price</div>
                  </div>
                </div>
                <div className="mt-2 text-[9px] text-gray-600">
                  Current FCF yield: {percent(result.current_fcf_yield, 2)}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {result.scenarios.map((scenario) => (
                  <div key={scenario.name} className="rounded-lg border border-gray-800 bg-gray-950/60 p-2">
                    <div className="text-[9px] font-semibold uppercase text-gray-600">{scenario.name}</div>
                    <div className="mt-1 text-sm font-medium text-gray-200">
                      {dollars(scenario.fair_value_per_share)}
                    </div>
                    <div className="text-[9px] text-gray-600">{percent(scenario.upside_downside)}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-2.5">
                <div className="text-[9px] font-semibold uppercase text-gray-600">
                  Reverse DCF implied growth
                </div>
                <div className="mt-1 text-sm font-medium text-gray-200">
                  {percent(result.reverse_dcf.required_annual_fcf_growth)}
                </div>
                <p className="mt-1 text-[9px] leading-4 text-gray-600">
                  Uses the base discount rate and terminal growth. This is an implied expectation, not a
                  forecast.
                </p>
              </div>
              <p className="text-[9px] leading-4 text-gray-700">{result.disclaimer}</p>
            </div>
          ) : null}
        </form>
      ) : (
        <p className="px-4 pb-4 text-[10px] leading-4 text-gray-600">
          DCF, probability-weighted scenarios, and reverse-DCF expectations. No model is used.
        </p>
      )}
    </section>
  );
}
