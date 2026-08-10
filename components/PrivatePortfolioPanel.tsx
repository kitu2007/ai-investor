"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileUp,
  LoaderCircle,
  LockKeyhole,
  Scale,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type {
  AllocationAnalysis,
  AllocationScenario,
  CioAllocationDraft,
  CouncilRun,
  PortfolioImportResult,
  PortfolioSnapshot,
  PrivatePortfolio,
} from "@/lib/investment-os-types";
import DecisionJournalPanel from "@/components/DecisionJournalPanel";

const MAX_FILE_BYTES = 1_000_000;

function percent(value: number, digits = 1): string {
  return (value * 100).toFixed(digits) + "%";
}

function money(value: number, currency = "USD"): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function labels(value: string): string[] {
  return value
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? response.statusText);
  }
  return (await response.json()) as T;
}

const INITIAL_SCENARIOS: AllocationScenario[] = [
  { name: "bear", probability: 0.25, value_multiple: 0.5 },
  { name: "base", probability: 0.5, value_multiple: 1.5 },
  { name: "bull", probability: 0.25, value_multiple: 3 },
];

function NumericInput({
  value,
  onChange,
  step = "0.1",
}: {
  value: number;
  onChange: (value: number) => void;
  step?: string;
}) {
  return (
    <input
      type="number"
      min="0"
      step={step}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="w-full rounded-md border border-gray-800 bg-gray-950 px-2 py-1.5 text-[10px] text-gray-200 outline-none focus:border-blue-400/50"
    />
  );
}

export default function PrivatePortfolioPanel({ ticker }: { ticker: string }) {
  const [expanded, setExpanded] = useState(false);
  const [portfolios, setPortfolios] = useState<PrivatePortfolio[]>([]);
  const [portfolioId, setPortfolioId] = useState("");
  const [snapshot, setSnapshot] = useState<PortfolioSnapshot | null>(null);
  const [portfolioName, setPortfolioName] = useState("Local portfolio");
  const [asOf, setAsOf] = useState(() => new Date().toISOString().slice(0, 10));
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [candidateTicker, setCandidateTicker] = useState(ticker);
  const [targetPercent, setTargetPercent] = useState(5);
  const [sleeve, setSleeve] = useState("growth");
  const [sector, setSector] = useState("");
  const [themes, setThemes] = useState("");
  const [economicExposures, setEconomicExposures] = useState("");
  const [scenarios, setScenarios] = useState(INITIAL_SCENARIOS);
  const [permanentLossPercent, setPermanentLossPercent] = useState(100);
  const [analysis, setAnalysis] = useState<AllocationAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [cioDraft, setCioDraft] = useState<CioAllocationDraft | null>(null);
  const [cioLoading, setCioLoading] = useState(false);
  const [cioApproved, setCioApproved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void jsonRequest<PrivatePortfolio[]>("/api/investment-os/portfolio/list")
      .then(async (items) => {
        if (cancelled) return;
        setPortfolios(items);
        if (!items.length) return;
        const selected = items[0];
        setPortfolioId(selected.id);
        setPortfolioName(selected.name);
        const latest = await jsonRequest<PortfolioSnapshot>(
          "/api/investment-os/portfolio/" + encodeURIComponent(selected.id) + "/latest",
        );
        if (!cancelled) setSnapshot(latest);
      })
      .catch((reason) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : "Could not load local portfolios.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedPortfolio = useMemo(
    () => portfolios.find((item) => item.id === portfolioId) ?? null,
    [portfolios, portfolioId],
  );

  async function choosePortfolio(id: string) {
    setPortfolioId(id);
    setAnalysis(null);
    setError("");
    if (!id) {
      setSnapshot(null);
      return;
    }
    try {
      setSnapshot(
        await jsonRequest<PortfolioSnapshot>(
          "/api/investment-os/portfolio/" + encodeURIComponent(id) + "/latest",
        ),
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load the portfolio snapshot.");
    }
  }

  async function chooseFile(file: File | undefined) {
    setAnalysis(null);
    setError("");
    if (!file) {
      setCsvText("");
      setFileName("");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("The CSV must be smaller than 1 MB.");
      return;
    }
    setFileName(file.name);
    setCsvText(await file.text());
  }

  async function importCsv() {
    if (!csvText || !portfolioName.trim() || !asOf) return;
    setImporting(true);
    setError("");
    try {
      const result = await jsonRequest<PortfolioImportResult>(
        "/api/investment-os/portfolio/import",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            portfolio_name: portfolioName.trim(),
            as_of: asOf,
            base_currency: "USD",
            csv_text: csvText,
          }),
        },
      );
      setPortfolios((current) => {
        const others = current.filter((item) => item.id !== result.portfolio.id);
        return [result.portfolio, ...others];
      });
      setPortfolioId(result.portfolio.id);
      setSnapshot(result.snapshot);
      setFileName(result.created ? `${fileName} imported` : `${fileName} already imported`);
      setCsvText("");
      setAnalysis(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not import the portfolio.");
    } finally {
      setImporting(false);
    }
  }

  function updateScenario(
    index: number,
    field: "probability" | "value_multiple",
    value: number,
  ) {
    setCioApproved(false);
    setScenarios((current) =>
      current.map((scenario, scenarioIndex) =>
        scenarioIndex === index ? { ...scenario, [field]: value } : scenario,
      ),
    );
  }

  async function loadCioScenarios() {
    setCioLoading(true);
    setCioApproved(false);
    setAnalysis(null);
    setError("");
    try {
      const council = await jsonRequest<CouncilRun>(
        "/api/investment-os/council/latest?ticker=" + encodeURIComponent(ticker),
      );
      const draft = await jsonRequest<CioAllocationDraft>(
        "/api/investment-os/council/run/" +
          encodeURIComponent(council.id) +
          "/allocation-draft",
      );
      setCioDraft(draft);
      setCandidateTicker(draft.ticker);
      setScenarios((current) =>
        draft.scenarios.map((scenario) => ({
          name: scenario.name,
          probability: scenario.probability,
          value_multiple:
            scenario.value_multiple ??
            current.find((item) => item.name === scenario.name)?.value_multiple ??
            1,
        })),
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load the latest CIO scenarios.");
    } finally {
      setCioLoading(false);
    }
  }

  async function analyze() {
    if (!snapshot || !candidateTicker.trim() || !sector.trim()) return;
    setAnalyzing(true);
    setAnalysis(null);
    setError("");
    try {
      const useCioProvenance = Boolean(
        cioApproved && cioDraft?.ready_for_allocation && cioDraft.ticker === candidateTicker,
      );
      setAnalysis(
        await jsonRequest<AllocationAnalysis>("/api/investment-os/portfolio/allocation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            snapshot_id: snapshot.id,
            scenario_source: useCioProvenance ? "cio_approved" : "manual",
            council_run_id: useCioProvenance ? cioDraft?.council_run_id : null,
            candidate_ticker: candidateTicker.trim().toUpperCase(),
            target_weight: targetPercent / 100,
            sleeve,
            sector: sector.trim(),
            themes: labels(themes),
            economic_exposures: labels(economicExposures),
            scenarios,
            permanent_loss_fraction: permanentLossPercent / 100,
          }),
        }),
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not calculate the allocation.");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <section className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.035]">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-start justify-between gap-3 p-4 text-left"
      >
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-200">
            <LockKeyhole size={14} /> Private portfolio & allocation
          </div>
          <p className="mt-1 text-[10px] leading-4 text-gray-500">
            Local CSV snapshot and deterministic position sizing. No model call.
          </p>
        </div>
        {expanded ? (
          <ChevronUp size={14} className="mt-0.5 text-gray-500" />
        ) : (
          <ChevronDown size={14} className="mt-0.5 text-gray-500" />
        )}
      </button>

      {expanded ? (
        <div className="space-y-4 border-t border-gray-800/80 p-4">
          <div className="rounded-lg border border-blue-400/15 bg-blue-400/[0.04] p-3">
            <p className="text-[10px] font-semibold text-blue-200">Privacy-safe import</p>
            <p className="mt-1 text-[10px] leading-4 text-gray-500">
              Accepted columns: ticker, market_value, name, quantity, price, sleeve, sector,
              themes, economic_exposures, currency. Account and tax-lot fields are rejected.
            </p>
          </div>

          {portfolios.length ? (
            <label className="block text-[9px] font-semibold uppercase tracking-wide text-gray-600">
              Saved local portfolio
              <select
                value={portfolioId}
                onChange={(event) => void choosePortfolio(event.target.value)}
                className="mt-1.5 w-full rounded-md border border-gray-800 bg-gray-950 px-2 py-2 text-[10px] normal-case tracking-normal text-gray-200"
              >
                {portfolios.map((portfolio) => (
                  <option key={portfolio.id} value={portfolio.id}>
                    {portfolio.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <label className="text-[9px] font-semibold uppercase tracking-wide text-gray-600">
              Portfolio name
              <input
                value={portfolioName}
                onChange={(event) => setPortfolioName(event.target.value)}
                className="mt-1.5 w-full rounded-md border border-gray-800 bg-gray-950 px-2 py-2 text-[10px] normal-case tracking-normal text-gray-200"
              />
            </label>
            <label className="text-[9px] font-semibold uppercase tracking-wide text-gray-600">
              Snapshot date
              <input
                type="date"
                value={asOf}
                onChange={(event) => setAsOf(event.target.value)}
                className="mt-1.5 w-full rounded-md border border-gray-800 bg-gray-950 px-2 py-2 text-[10px] normal-case tracking-normal text-gray-200"
              />
            </label>
          </div>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-gray-700 px-3 py-3 text-[10px] text-gray-400 hover:border-emerald-400/40 hover:text-emerald-200">
            <FileUp size={13} /> {fileName || "Choose a manually prepared CSV"}
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(event) => void chooseFile(event.target.files?.[0])}
            />
          </label>
          <button
            type="button"
            onClick={() => void importCsv()}
            disabled={!csvText || importing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {importing ? <LoaderCircle size={12} className="animate-spin" /> : <FileUp size={12} />}
            Import local snapshot
          </button>

          {snapshot ? (
            <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold text-gray-200">
                    {selectedPortfolio?.name ?? portfolioName}
                  </p>
                  <p className="mt-0.5 text-[9px] text-gray-600">
                    {snapshot.as_of} · {snapshot.position_count} positions · cash {percent(snapshot.cash_value / snapshot.total_value)}
                  </p>
                </div>
                <span className="text-[10px] text-gray-500">
                  {money(snapshot.total_value, selectedPortfolio?.base_currency)}
                </span>
              </div>
              <div className="mt-2 space-y-1 border-t border-gray-800 pt-2">
                {snapshot.positions.slice(0, 6).map((position) => (
                  <div key={position.id} className="flex justify-between text-[9px] text-gray-500">
                    <span>{position.ticker} · {position.sleeve}</span>
                    <span>{percent(position.weight)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {snapshot ? (
            <div className="space-y-3 border-t border-gray-800 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-semibold text-emerald-200">
                  <Scale size={12} /> Would this position matter?
                </div>
                <span className="text-[9px] text-gray-600">Deterministic</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[9px] text-gray-600">
                  Ticker
                  <input
                    value={candidateTicker}
                    onChange={(event) => {
                      setCandidateTicker(event.target.value.toUpperCase());
                      setCioApproved(false);
                    }}
                    className="mt-1 w-full rounded-md border border-gray-800 bg-gray-950 px-2 py-1.5 text-[10px] text-gray-200"
                  />
                </label>
                <label className="text-[9px] text-gray-600">
                  Target weight %
                  <NumericInput value={targetPercent} onChange={setTargetPercent} />
                </label>
                <label className="text-[9px] text-gray-600">
                  Sleeve
                  <select
                    value={sleeve}
                    onChange={(event) => setSleeve(event.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-800 bg-gray-950 px-2 py-1.5 text-[10px] text-gray-200"
                  >
                    <option value="core">Core</option>
                    <option value="growth">Growth</option>
                    <option value="opportunistic">Opportunistic</option>
                  </select>
                </label>
                <label className="text-[9px] text-gray-600">
                  Sector
                  <input
                    value={sector}
                    onChange={(event) => setSector(event.target.value)}
                    placeholder="Required"
                    className="mt-1 w-full rounded-md border border-gray-800 bg-gray-950 px-2 py-1.5 text-[10px] text-gray-200"
                  />
                </label>
              </div>
              <label className="block text-[9px] text-gray-600">
                Themes, separated by |
                <input
                  value={themes}
                  onChange={(event) => setThemes(event.target.value)}
                  placeholder="AI | Semiconductors"
                  className="mt-1 w-full rounded-md border border-gray-800 bg-gray-950 px-2 py-1.5 text-[10px] text-gray-200"
                />
              </label>
              <label className="block text-[9px] text-gray-600">
                Shared economic exposures, separated by |
                <input
                  value={economicExposures}
                  onChange={(event) => setEconomicExposures(event.target.value)}
                  placeholder="AI infrastructure spending"
                  className="mt-1 w-full rounded-md border border-gray-800 bg-gray-950 px-2 py-1.5 text-[10px] text-gray-200"
                />
              </label>

              <div className="rounded-lg border border-violet-400/15 bg-violet-400/[0.035] p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-semibold text-violet-200">CIO scenario handoff</p>
                    <p className="mt-0.5 text-[9px] leading-4 text-gray-600">
                      Read the latest saved CIO assumptions. This starts no model run.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadCioScenarios()}
                    disabled={cioLoading}
                    className="rounded-md border border-violet-400/25 px-2 py-1.5 text-[9px] font-semibold text-violet-200 disabled:opacity-40"
                  >
                    {cioLoading ? "Loading…" : "Load CIO"}
                  </button>
                </div>
                {cioDraft ? (
                  <div className="mt-3 space-y-2 border-t border-gray-800 pt-2">
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="text-gray-400">
                        CIO {cioDraft.ownership_action.replaceAll("_", " ")} · {percent(cioDraft.confidence)} confidence
                      </span>
                      <span className={cioApproved ? "text-emerald-300" : "text-amber-300"}>
                        {cioApproved ? "Approved" : "Review required"}
                      </span>
                    </div>
                    {cioDraft.scenarios.map((scenario) => (
                      <div key={scenario.name} className="rounded-md bg-gray-950/60 p-2">
                        <p className="text-[9px] capitalize text-gray-300">
                          {scenario.name} · {percent(scenario.probability)} · {scenario.value_multiple == null ? "no saved multiple" : `${scenario.value_multiple.toFixed(2)}×`}
                        </p>
                        <p className="mt-1 text-[8px] leading-4 text-gray-600">{scenario.summary}</p>
                      </div>
                    ))}
                    {cioDraft.warnings.map((warning) => (
                      <p key={warning} className="text-[9px] leading-4 text-amber-200">{warning}</p>
                    ))}
                    {cioDraft.ready_for_allocation ? (
                      <button
                        type="button"
                        onClick={() => setCioApproved(true)}
                        disabled={cioApproved}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-emerald-400/25 bg-emerald-400/10 px-2 py-2 text-[9px] font-semibold text-emerald-200 disabled:opacity-60"
                      >
                        <CheckCircle2 size={11} />
                        {cioApproved ? "CIO assumptions approved" : "Approve CIO assumptions"}
                      </button>
                    ) : null}
                    <p className="text-[8px] leading-4 text-gray-700">
                      Editing any probability or multiple returns provenance to manual.
                    </p>
                  </div>
                ) : null}
              </div>

              <div>
                <div className="grid grid-cols-[1fr_78px_78px] gap-2 text-[8px] uppercase tracking-wide text-gray-700">
                  <span>Scenario assumption</span><span>Probability %</span><span>Value multiple</span>
                </div>
                <div className="mt-1.5 space-y-1.5">
                  {scenarios.map((scenario, index) => (
                    <div key={scenario.name} className="grid grid-cols-[1fr_78px_78px] items-center gap-2">
                      <span className="text-[10px] capitalize text-gray-400">{scenario.name}</span>
                      <NumericInput
                        value={scenario.probability * 100}
                        onChange={(value) => updateScenario(index, "probability", value / 100)}
                      />
                      <NumericInput
                        value={scenario.value_multiple}
                        onChange={(value) => updateScenario(index, "value_multiple", value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <label className="block text-[9px] text-gray-600">
                Permanent-loss fraction %
                <NumericInput value={permanentLossPercent} onChange={setPermanentLossPercent} />
              </label>
              <button
                type="button"
                onClick={() => void analyze()}
                disabled={analyzing || !candidateTicker || !sector}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-[10px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {analyzing ? <LoaderCircle size={12} className="animate-spin" /> : <Scale size={12} />}
                Calculate proposed allocation
              </button>
            </div>
          ) : null}

          {analysis ? (
            <div className="space-y-3 rounded-lg border border-gray-800 bg-gray-950/70 p-3">
              <div className="flex items-center gap-2">
                {analysis.result.feasible ? (
                  <CheckCircle2 size={13} className="text-emerald-300" />
                ) : (
                  <AlertTriangle size={13} className="text-amber-300" />
                )}
                <p className="text-[10px] font-semibold text-gray-200">
                  {analysis.result.feasible ? "Within hard constraints" : "Review policy blockers"}
                </p>
                <span className="ml-auto text-[8px] uppercase text-gray-600">
                  {analysis.scenario_source.replaceAll("_", " ")}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[9px] text-gray-500">
                <span>Policy ceiling <b className="text-gray-200">{percent(analysis.result.policy_ceiling_weight)}</b></span>
                <span>Trade <b className="text-gray-200">{money(analysis.result.trade_value, selectedPortfolio?.base_currency)}</b></span>
                <span>Cash before <b className="text-gray-200">{percent(analysis.result.pre_cash_weight)}</b></span>
                <span>Cash after <b className="text-gray-200">{percent(analysis.result.post_cash_weight)}</b></span>
                <span>Expected contribution <b className="text-gray-200">{percent(analysis.result.expected_portfolio_contribution)}</b></span>
                <span>Permanent-loss impact <b className="text-rose-300">{percent(analysis.result.permanent_loss_contribution)}</b></span>
              </div>
              <div className="border-t border-gray-800 pt-2">
                {analysis.result.scenario_contributions.map((scenario) => (
                  <div key={scenario.name} className="flex justify-between py-0.5 text-[9px] text-gray-500">
                    <span className="capitalize">{scenario.name} · {scenario.value_multiple.toFixed(1)}×</span>
                    <span>{percent(scenario.portfolio_contribution)}</span>
                  </div>
                ))}
              </div>
              {analysis.result.warnings.map((warning) => (
                <p
                  key={warning.code}
                  className={
                    "text-[9px] leading-4 " +
                    (warning.severity === "blocker" ? "text-amber-200" : "text-gray-500")
                  }
                >
                  {warning.message}
                </p>
              ))}
              <p className="border-t border-gray-800 pt-2 text-[8px] leading-4 text-gray-700">
                {analysis.result.disclaimer}
              </p>
            </div>
          ) : null}

          <DecisionJournalPanel
            key={analysis?.id ?? "history"}
            ticker={ticker}
            analysis={analysis}
            cioDraft={cioDraft}
          />

          {error ? <p className="text-[10px] leading-4 text-rose-300">{error}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
