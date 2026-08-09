"use client";

import {
  Activity,
  AlertTriangle,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Database,
  ExternalLink,
  LoaderCircle,
  MessageSquareText,
  Plus,
  Radar,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import type {
  BackendStatus,
  EvidenceItem,
  FollowUpRun,
  InvestmentCompany,
  ResearchCapabilities,
  ResearchRun,
  ResearchResponse,
  TechnicalAnalysis,
} from "@/lib/investment-os-types";
import ValuationLab from "@/components/ValuationLab";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const DEFAULT_QUESTION =
  "Evaluate momentum, drawdown, trend, and relative strength. What should I investigate next?";

function percent(value: number | null | undefined, digits = 1): string {
  return value == null ? "—" : (value * 100).toFixed(digits) + "%";
}

function number(value: number | null | undefined, digits = 2): string {
  return value == null ? "—" : value.toFixed(digits);
}

function friendlyFlag(value: string): string {
  return value.replaceAll("_", " ");
}

function friendlyLabel(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(body.error || "Request failed.");
  }
  return body;
}

async function fetchBackendStatus(): Promise<BackendStatus> {
  try {
    return await jsonRequest<BackendStatus>("/api/investment-os/status");
  } catch (reason) {
    return {
      connected: false,
      service: "Investment OS",
      detail: reason instanceof Error ? reason.message : "Backend unavailable.",
    };
  }
}

function SignalBadge({ analysis }: { analysis: TechnicalAnalysis }) {
  const color =
    analysis.signal === "strong" || analysis.signal === "positive"
      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
      : analysis.signal === "weak"
        ? "border-rose-400/25 bg-rose-400/10 text-rose-300"
        : "border-amber-400/25 bg-amber-400/10 text-amber-300";
  return (
    <span className={"rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide " + color}>
      {analysis.signal}
    </span>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-3.5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">
        {label}
      </div>
      <div className="mt-1.5 text-xl font-semibold tabular-nums text-white">{value}</div>
      <div className="mt-1 text-[11px] text-gray-500">{detail}</div>
    </div>
  );
}

function TechnicalPanel({ analysis }: { analysis: TechnicalAnalysis | null }) {
  if (!analysis) {
    return (
      <div className="flex min-h-[250px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-800 bg-gray-950/30 p-8 text-center">
        <Radar className="mb-3 text-gray-700" size={30} />
        <p className="text-sm font-medium text-gray-400">No analysis yet</p>
        <p className="mt-1 max-w-xs text-xs leading-5 text-gray-600">
          Enter a ticker and run research to calculate trend, momentum, drawdown, and relative strength.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900/70 px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white">{analysis.ticker}</span>
            <SignalBadge analysis={analysis} />
          </div>
          <p className="mt-0.5 text-[11px] text-gray-500">
            {analysis.as_of} · {analysis.observations} daily observations
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold tabular-nums text-blue-300">
            {analysis.momentum_score}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-gray-500">score / 100</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MetricCard
          label="Last close"
          value={"$" + number(analysis.last_close)}
          detail={"SMA 50: $" + number(analysis.moving_averages.sma_50)}
        />
        <MetricCard
          label="Current drawdown"
          value={percent(analysis.drawdown.current)}
          detail={"Maximum: " + percent(analysis.drawdown.maximum)}
        />
        <MetricCard
          label="RSI (14)"
          value={number(analysis.rsi_14, 1)}
          detail="30 oversold · 70 overbought"
        />
        <MetricCard
          label="MACD histogram"
          value={number(analysis.macd.histogram, 3)}
          detail={"Signal: " + number(analysis.macd.signal, 3)}
        />
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Moving averages
        </h3>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {(["sma_20", "sma_50", "sma_100", "sma_200"] as const).map((key) => (
            <div key={key}>
              <div className="text-[10px] text-gray-600">{key.replace("sma_", "")} day</div>
              <div className="mt-0.5 text-sm font-medium tabular-nums text-gray-200">
                {"$" + number(analysis.moving_averages[key])}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Momentum</h3>
          <div className="mt-3 space-y-2">
            {Object.entries(analysis.momentum).map(([period, value]) => (
              <div key={period} className="flex justify-between text-xs">
                <span className="text-gray-500">{period}</span>
                <span className={value != null && value >= 0 ? "text-emerald-300" : "text-rose-300"}>
                  {percent(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">vs SPY</h3>
          <div className="mt-3 space-y-2">
            {Object.entries(analysis.relative_strength).map(([period, value]) => (
              <div key={period} className="flex justify-between text-xs">
                <span className="text-gray-500">{period}</span>
                <span className={value != null && value >= 0 ? "text-emerald-300" : "text-rose-300"}>
                  {percent(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {analysis.flags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {analysis.flags.map((flag) => (
            <span
              key={flag}
              className="rounded-md border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-[10px] font-medium text-amber-300"
            >
              {friendlyFlag(flag)}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ResearchPanel({
  run,
  history,
  onSelectRun,
  followUp,
  capabilities,
  loading,
  followUpLoading,
}: {
  run: ResearchRun | null;
  history: ResearchRun[];
  onSelectRun: (run: ResearchRun) => void;
  followUp: FollowUpRun | null;
  capabilities: ResearchCapabilities | null;
  loading: boolean;
  followUpLoading: boolean;
}) {
  const artifact = run?.artifact;
  const completedHistory = history.filter((item) => item.status === "completed" && item.artifact);
  const codexReady = Boolean(
    capabilities?.codex.enabled && capabilities.codex.installed && capabilities.codex.authenticated,
  );

  return (
    <section className="rounded-xl border border-violet-400/20 bg-violet-400/[0.04] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-violet-200">
          <Sparkles size={14} /> Codex research dossier
        </div>
        <span
          className={
            "rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide " +
            (codexReady
              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
              : "border-amber-400/20 bg-amber-400/10 text-amber-300")
          }
        >
          {codexReady ? "Codex ready" : "Codex unavailable"}
        </span>
      </div>

      {completedHistory.length > 0 ? (
        <details className="mt-3 rounded-lg border border-gray-800 bg-gray-950/50">
          <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-[10px] font-medium text-gray-400">
            <span>Saved dossier history</span>
            <span>{completedHistory.length} versions</span>
          </summary>
          <div className="max-h-48 space-y-1 overflow-y-auto border-t border-gray-800 p-2">
            {completedHistory.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectRun(item)}
                className={
                  "w-full rounded-md border px-2.5 py-2 text-left " +
                  (item.id === run?.id
                    ? "border-violet-400/30 bg-violet-400/10"
                    : "border-transparent hover:border-gray-800 hover:bg-gray-900")
                }
              >
                <div className="flex items-center justify-between gap-2 text-[9px] text-gray-600">
                  <span>{item.completed_at ? new Date(item.completed_at).toLocaleString() : "Saved"}</span>
                  <span>{item.artifact ? friendlyLabel(item.artifact.synthesis.status) : "Completed"}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-gray-400">{item.question}</p>
              </button>
            ))}
          </div>
        </details>
      ) : null}

      {loading || run?.status === "queued" || run?.status === "running" ? (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-violet-400/15 bg-gray-950/50 p-3">
          <LoaderCircle size={14} className="mt-0.5 shrink-0 animate-spin text-violet-300" />
          <div>
            <p className="text-xs font-medium text-gray-200">
              {run?.status === "running" ? "Codex is analyzing" : "Preparing Codex analysis"}
            </p>
            <p className="mt-1 text-[10px] leading-4 text-gray-500">
              Independent perspectives, evidence checks, scenarios and disagreements are being assembled.
            </p>
          </div>
        </div>
      ) : run?.status === "failed" ? (
        <div className="mt-3 rounded-lg border border-rose-400/20 bg-rose-400/[0.06] p-3 text-[11px] leading-5 text-rose-200">
          {run.error || "The local Codex analysis failed."}
        </div>
      ) : artifact ? (
        <div className="mt-4 space-y-3">
          <div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] uppercase tracking-wide text-gray-500">
                {friendlyLabel(artifact.synthesis.status)}
              </span>
              <span className="text-[10px] text-gray-500">
                {Math.round(artifact.synthesis.confidence * 100)}% confidence
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-gray-300">{artifact.executive_summary}</p>
            <p className="mt-2 text-[10px] text-gray-600">As of {artifact.as_of}</p>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {artifact.scenarios.map((scenario) => (
              <div key={scenario.name} className="rounded-lg border border-gray-800 bg-gray-950/60 p-2">
                <div className="text-[9px] font-semibold uppercase text-gray-500">{scenario.name}</div>
                <div className="mt-0.5 text-sm font-semibold text-gray-200">
                  {Math.round(scenario.probability * 100)}%
                </div>
              </div>
            ))}
          </div>

          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Independent perspectives
            </h3>
            <div className="mt-2 space-y-1.5">
              {artifact.perspectives.map((perspective) => (
                <details key={perspective.agent} className="rounded-lg border border-gray-800 bg-gray-950/60">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-[11px]">
                    <span className="font-medium text-gray-300">{friendlyLabel(perspective.agent)}</span>
                    <span className="text-gray-600">
                      {friendlyLabel(perspective.stance)} · {Math.round(perspective.confidence * 100)}%
                    </span>
                  </summary>
                  <div className="border-t border-gray-800 px-3 py-2 text-[10px] leading-4 text-gray-500">
                    {perspective.summary}
                  </div>
                </details>
              ))}
            </div>
          </div>

          {artifact.synthesis.disagreements.length > 0 ? (
            <div className="rounded-lg border border-amber-400/15 bg-amber-400/[0.04] p-3">
              <h3 className="text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                Disagreements
              </h3>
              <ul className="mt-2 space-y-1 text-[10px] leading-4 text-gray-400">
                {artifact.synthesis.disagreements.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {artifact.sources.length > 0 ? (
            <div>
              <h3 className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                Sources
              </h3>
              <div className="mt-2 space-y-1.5">
                {artifact.sources.slice(0, 8).map((source) =>
                  source.url.startsWith("http") ? (
                    <a
                      key={source.id}
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-start justify-between gap-2 text-[10px] leading-4 text-blue-300 hover:text-blue-200"
                    >
                      <span>{source.title}</span>
                      <ExternalLink size={10} className="mt-0.5 shrink-0" />
                    </a>
                  ) : (
                    <div
                      key={source.id}
                      className="flex items-start justify-between gap-2 text-[10px] leading-4 text-gray-400"
                    >
                      <span>{source.title}</span>
                      <span className="shrink-0 text-[9px] uppercase text-gray-600">Local input</span>
                    </div>
                  ),
                )}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-[11px] leading-5 text-gray-500">
          Request a Codex analysis to create a saved, question-specific dossier. Viewing saved research and
          recalculating technicals do not invoke a model.
        </p>
      )}

      {followUpLoading || followUp?.status === "queued" || followUp?.status === "running" ? (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-blue-400/15 bg-blue-400/[0.05] p-3">
          <LoaderCircle size={14} className="mt-0.5 shrink-0 animate-spin text-blue-300" />
          <div>
            <p className="text-[11px] font-medium text-blue-200">Answering from the saved dossier</p>
            <p className="mt-1 text-[10px] leading-4 text-gray-500">
              Codex is reusing the selected report and will browse only if its evidence is insufficient.
            </p>
          </div>
        </div>
      ) : followUp?.status === "failed" ? (
        <div className="mt-3 rounded-lg border border-rose-400/20 bg-rose-400/[0.06] p-3 text-[11px] leading-5 text-rose-200">
          {followUp.error || "The contextual follow-up failed."}
        </div>
      ) : followUp?.artifact ? (
        <div className="mt-3 rounded-lg border border-blue-400/20 bg-blue-400/[0.05] p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-blue-300">
              Follow-up answer
            </h3>
            <span className="text-[9px] text-gray-600">As of {followUp.artifact.as_of}</span>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-gray-300">{followUp.artifact.answer}</p>
          {followUp.artifact.limitations.length > 0 ? (
            <div className="mt-2 border-t border-blue-400/10 pt-2">
              <div className="text-[9px] font-semibold uppercase text-gray-600">Limitations</div>
              <ul className="mt-1 space-y-1 text-[10px] leading-4 text-gray-500">
                {followUp.artifact.limitations.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {followUp.artifact.sources.length > 0 ? (
            <div className="mt-2 border-t border-blue-400/10 pt-2">
              <div className="text-[9px] font-semibold uppercase text-gray-600">Follow-up sources</div>
              <div className="mt-1 space-y-1">
                {followUp.artifact.sources.slice(0, 5).map((source) =>
                  source.url.startsWith("http") ? (
                    <a
                      key={source.id}
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-start justify-between gap-2 text-[10px] leading-4 text-blue-300"
                    >
                      <span>{source.title}</span>
                      <ExternalLink size={10} className="mt-0.5 shrink-0" />
                    </a>
                  ) : (
                    <div key={source.id} className="text-[10px] leading-4 text-gray-500">
                      {source.title} · local input
                    </div>
                  ),
                )}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 border-t border-violet-400/10 pt-3 text-[9px] leading-4 text-gray-600">
        ChatGPT/Codex sign-in · no project API key · local reports stay outside Git
      </div>
    </section>
  );
}

function CompanyPanel({
  ticker,
  company,
  evidence,
  onChanged,
}: {
  ticker: string;
  company: InvestmentCompany | null;
  evidence: EvidenceItem[];
  onChanged: (company: InvestmentCompany | null, evidence: EvidenceItem[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState("");
  const [sector, setSector] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function createCompany(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const created = await jsonRequest<InvestmentCompany>("/api/investment-os/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, name, sector }),
      });
      onChanged(created, []);
      setName("");
      setSector("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save company.");
    } finally {
      setSaving(false);
    }
  }

  async function addEvidence(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const created = await jsonRequest<EvidenceItem>("/api/investment-os/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker,
          evidence_type: "research_note",
          title,
          summary,
          source_url: sourceUrl,
          confidence: 0.7,
        }),
      });
      onChanged(company, [created, ...evidence]);
      setTitle("");
      setSummary("");
      setSourceUrl("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save evidence.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-gray-800 bg-gray-900/55">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2">
          <Database size={14} className="text-violet-300" />
          <span className="text-xs font-semibold text-gray-200">Company memory</span>
          <span className="rounded-full bg-gray-800 px-2 py-0.5 text-[10px] text-gray-400">
            {company ? evidence.length + " evidence" : "not registered"}
          </span>
        </span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded ? (
        <div className="border-t border-gray-800 p-4">
          {company ? (
            <>
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-violet-400/10 p-2 text-violet-300">
                  <Building2 size={16} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{company.name}</div>
                  <div className="text-[11px] text-gray-500">
                    {company.ticker} · {company.sector || "Sector not set"}
                  </div>
                </div>
              </div>
              <form onSubmit={addEvidence} className="space-y-2">
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                  placeholder="Evidence title"
                  className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                />
                <textarea
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                  required
                  rows={3}
                  placeholder="What did you learn, and why does it matter?"
                  className="w-full resize-none rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-xs leading-5 text-white outline-none focus:border-blue-500"
                />
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(event) => setSourceUrl(event.target.value)}
                  placeholder="Source URL (optional)"
                  className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                />
                <button
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
                >
                  <Plus size={13} /> Add evidence
                </button>
              </form>
              {evidence.length > 0 ? (
                <div className="mt-4 max-h-48 space-y-2 overflow-y-auto">
                  {evidence.map((item) => (
                    <div key={item.id} className="rounded-lg border border-gray-800 bg-gray-950/60 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-xs font-medium text-gray-200">{item.title}</div>
                        <span className="shrink-0 text-[10px] text-gray-600">
                          {Math.round(item.confidence * 100)}% confidence
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] leading-4 text-gray-500">{item.summary}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <form onSubmit={createCompany} className="space-y-2">
              <p className="mb-3 text-xs leading-5 text-gray-500">
                Register {ticker || "this ticker"} to attach durable research evidence.
              </p>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                placeholder="Company name"
                className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
              />
              <input
                value={sector}
                onChange={(event) => setSector(event.target.value)}
                placeholder="Sector (optional)"
                className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
              />
              <button
                disabled={saving || !ticker}
                className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
              >
                <Plus size={13} /> Register company
              </button>
            </form>
          )}
          {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
        </div>
      ) : null}
    </section>
  );
}

export default function InvestmentWorkspace() {
  const [ticker, setTicker] = useState("AAPL");
  const [question, setQuestion] = useState(DEFAULT_QUESTION);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<TechnicalAnalysis | null>(null);
  const [company, setCompany] = useState<InvestmentCompany | null>(null);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [status, setStatus] = useState<BackendStatus | null>(null);
  const [capabilities, setCapabilities] = useState<ResearchCapabilities | null>(null);
  const [researchRun, setResearchRun] = useState<ResearchRun | null>(null);
  const [researchHistory, setResearchHistory] = useState<ResearchRun[]>([]);
  const [followUpRun, setFollowUpRun] = useState<FollowUpRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [codexLoading, setCodexLoading] = useState(false);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [error, setError] = useState("");

  const normalizedTicker = useMemo(() => ticker.trim().toUpperCase(), [ticker]);

  const checkStatus = useCallback(async () => {
    setStatusLoading(true);
    const result = await fetchBackendStatus();
    setStatus(result);
    setStatusLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetchBackendStatus(),
      jsonRequest<ResearchCapabilities>("/api/investment-os/research/capabilities").catch(() => null),
    ]).then(([result, researchCapabilities]) => {
      if (!active) return;
      setStatus(result);
      setCapabilities(researchCapabilities);
      setStatusLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!normalizedTicker) return;
    let active = true;
    const timeout = window.setTimeout(() => {
      void fetch("/api/investment-os/research/history?ticker=" + encodeURIComponent(normalizedTicker))
        .then(async (response) => {
          if (response.status === 404) return [];
          if (!response.ok) throw new Error("Could not load saved research.");
          return (await response.json()) as ResearchRun[];
        })
        .then((history) => {
          if (!active) return;
          setResearchHistory(history);
          setResearchRun(history.find((item) => item.status === "completed") ?? null);
          setFollowUpRun(null);
        })
        .catch(() => {
          if (!active) return;
          setResearchHistory([]);
          setResearchRun(null);
          setFollowUpRun(null);
        });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [normalizedTicker]);

  useEffect(() => {
    if (!researchRun || !["queued", "running"].includes(researchRun.status)) return;
    let active = true;
    const interval = window.setInterval(() => {
      void jsonRequest<ResearchRun>(
        "/api/investment-os/research/run/" + encodeURIComponent(researchRun.id),
      )
        .then((run) => {
          if (!active) return;
          setResearchRun(run);
          if (run.status === "completed" || run.status === "failed") {
            setCodexLoading(false);
            setResearchHistory((current) => [run, ...current.filter((item) => item.id !== run.id)]);
            window.clearInterval(interval);
          }
        })
        .catch(() => {
          if (active) setCodexLoading(false);
        });
    }, 3000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [researchRun]);

  useEffect(() => {
    if (!followUpRun || !["queued", "running"].includes(followUpRun.status)) return;
    let active = true;
    const interval = window.setInterval(() => {
      void jsonRequest<FollowUpRun>(
        "/api/investment-os/research/followup/" + encodeURIComponent(followUpRun.id),
      )
        .then((run) => {
          if (!active) return;
          setFollowUpRun(run);
          if (run.status === "completed" || run.status === "failed") {
            setFollowUpLoading(false);
            window.clearInterval(interval);
            if (run.artifact) {
              setMessages((current) => [
                ...current,
                { role: "assistant", content: run.artifact?.answer ?? "Follow-up completed." },
              ]);
            }
          }
        })
        .catch(() => {
          if (active) setFollowUpLoading(false);
        });
    }, 3000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [followUpRun]);

  async function runResearch(event: FormEvent) {
    event.preventDefault();
    if (!normalizedTicker || !question.trim()) return;
    const prompt = question.trim();
    setLoading(true);
    setError("");
    setMessages((current) => [...current, { role: "user", content: prompt }]);
    try {
      const result = await jsonRequest<ResearchResponse>("/api/investment-os/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: normalizedTicker, message: prompt, sessionId }),
      });
      setSessionId(result.sessionId);
      setAnalysis(result.technical);
      setCompany(result.company);
      setEvidence(result.evidence);
      setMessages((current) => [...current, { role: "assistant", content: result.reply }]);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Research request failed.";
      setError(message);
      setMessages((current) => [
        ...current,
        { role: "assistant", content: "I could not complete that analysis. " + message },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function requestCodexResearch() {
    if (!normalizedTicker || !question.trim()) return;
    const prompt = question.trim();
    setCodexLoading(true);
    setError("");
    setMessages((current) => [...current, { role: "user", content: prompt }]);
    try {
      const run = await jsonRequest<ResearchRun>("/api/investment-os/research/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: normalizedTicker, question: prompt }),
      });
      setResearchRun(run);
      setResearchHistory((current) => [run, ...current.filter((item) => item.id !== run.id)]);
      setFollowUpRun(null);
      setAnalysis(run.technical_snapshot);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "Codex analysis is queued. The saved dossier will appear in the research panel when complete.",
        },
      ]);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Could not request Codex analysis.";
      setError(message);
      setCodexLoading(false);
    }
  }

  async function requestCodexFollowUp() {
    if (!normalizedTicker || !question.trim() || researchRun?.status !== "completed") return;
    const prompt = question.trim();
    setFollowUpLoading(true);
    setError("");
    setMessages((current) => [...current, { role: "user", content: prompt }]);
    try {
      const run = await jsonRequest<FollowUpRun>("/api/investment-os/research/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: normalizedTicker,
          question: prompt,
          researchRunId: researchRun.id,
        }),
      });
      setFollowUpRun(run);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "Codex is answering from the selected saved dossier.",
        },
      ]);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Could not request the follow-up.";
      setError(message);
      setFollowUpLoading(false);
    }
  }

  return (
    <main className="flex min-w-0 flex-1 overflow-hidden bg-gray-950">
      <section className="flex min-w-0 flex-1 flex-col border-r border-gray-800">
        <div className="border-b border-gray-800 bg-gradient-to-r from-blue-500/[0.06] to-violet-500/[0.04] px-6 py-5">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-300">
                <Sparkles size={12} /> Evidence-first research workspace
              </div>
              <h1 className="text-xl font-semibold tracking-tight text-white">
                Ask a company question. Choose quick signals or a full Codex dossier.
              </h1>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-gray-500">
                Deterministic calculations stay separate from question-specific Codex research and cited sources.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void checkStatus()}
              className="flex shrink-0 items-center gap-2 rounded-full border border-gray-800 bg-gray-900/70 px-3 py-1.5 text-[11px]"
            >
              {statusLoading ? (
                <LoaderCircle size={12} className="animate-spin text-gray-400" />
              ) : status?.connected ? (
                <CheckCircle2 size={12} className="text-emerald-400" />
              ) : (
                <AlertTriangle size={12} className="text-rose-400" />
              )}
              <span className={status?.connected ? "text-emerald-300" : "text-gray-400"}>
                {statusLoading ? "Checking backend" : status?.connected ? "Backend connected" : "Backend offline"}
              </span>
              <RefreshCw size={11} className="text-gray-600" />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {messages.length === 0 ? (
              <div className="grid h-full place-items-center">
                <div className="max-w-xl text-center">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-blue-400/20 bg-blue-400/10 text-blue-300">
                    <MessageSquareText size={22} />
                  </div>
                  <h2 className="mt-4 text-sm font-semibold text-gray-200">Start with a ticker</h2>
                  <p className="mt-1 text-xs leading-5 text-gray-600">
                    The first run automatically loads 18 months of daily history, compares the stock with SPY,
                    calculates technical indicators, and checks your stored evidence.
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {["NVDA", "MSFT", "AMZN", "GOOGL"].map((symbol) => (
                      <button
                        key={symbol}
                        type="button"
                        onClick={() => setTicker(symbol)}
                        className="rounded-lg border border-gray-800 bg-gray-900 px-3 py-1.5 text-xs text-gray-400 hover:border-gray-700 hover:text-white"
                      >
                        {symbol}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-3xl space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
                  >
                    <div
                      className={
                        message.role === "user"
                          ? "max-w-[80%] rounded-2xl rounded-br-md bg-blue-600 px-4 py-3 text-sm leading-6 text-white"
                          : "max-w-[88%] rounded-2xl rounded-bl-md border border-gray-800 bg-gray-900 px-4 py-3 text-sm leading-6 text-gray-200"
                      }
                    >
                      {message.content}
                    </div>
                  </div>
                ))}
                {loading ? (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <LoaderCircle size={14} className="animate-spin text-blue-400" />
                    Loading market history and calculating signals…
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <form onSubmit={runResearch} className="border-t border-gray-800 bg-gray-950 p-4">
            <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-xl border border-gray-700 bg-gray-900 p-2 focus-within:border-blue-500">
              <div className="shrink-0 border-r border-gray-800 px-2 pb-1">
                <label className="block text-[9px] font-semibold uppercase tracking-wide text-gray-600">
                  Ticker
                </label>
                <input
                  value={ticker}
                  onChange={(event) => {
                    setTicker(event.target.value.toUpperCase().replace(/[^A-Z.-]/g, "").slice(0, 16));
                    setSessionId(null);
                  }}
                  className="w-20 bg-transparent text-sm font-bold uppercase text-blue-300 outline-none"
                  aria-label="Stock ticker"
                />
              </div>
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                rows={2}
                placeholder="Ask about momentum, risk, drawdown, or the investment thesis…"
                className="min-h-12 flex-1 resize-none bg-transparent px-2 py-1 text-sm leading-5 text-white outline-none placeholder:text-gray-600"
                aria-label="Research question"
              />
              <div className="flex shrink-0 flex-col gap-1.5">
                <button
                  disabled={loading || !normalizedTicker || !question.trim() || !status?.connected}
                  className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-[11px] font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Calculate quick signals"
                >
                  {loading ? <LoaderCircle size={14} className="animate-spin" /> : <Activity size={14} />}
                  Quick signals
                </button>
                <button
                  type="button"
                  onClick={() => void requestCodexResearch()}
                  disabled={
                    codexLoading ||
                    !normalizedTicker ||
                    !question.trim() ||
                    !capabilities?.codex.enabled ||
                    !capabilities.codex.installed ||
                    !capabilities.codex.authenticated
                  }
                  className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Request Codex analysis"
                >
                  {codexLoading ? (
                    <LoaderCircle size={14} className="animate-spin" />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  Request Codex
                </button>
                <button
                  type="button"
                  onClick={() => void requestCodexFollowUp()}
                  disabled={
                    followUpLoading ||
                    researchRun?.status !== "completed" ||
                    !question.trim() ||
                    !capabilities?.codex.authenticated
                  }
                  className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-blue-400/25 bg-blue-400/10 px-3 text-[11px] font-semibold text-blue-200 hover:bg-blue-400/15 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Ask a follow-up using saved research"
                >
                  {followUpLoading ? (
                    <LoaderCircle size={14} className="animate-spin" />
                  ) : (
                    <MessageSquareText size={14} />
                  )}
                  Ask follow-up
                </button>
              </div>
            </div>
            {error ? <p className="mx-auto mt-2 max-w-3xl text-xs text-rose-300">{error}</p> : null}
            <p className="mx-auto mt-2 max-w-3xl text-center text-[10px] text-gray-700">
              Quick signals use no model. Full dossiers and targeted follow-ups use your Codex allowance.
            </p>
          </form>
        </div>
      </section>

      <aside className="w-[390px] shrink-0 overflow-y-auto bg-gray-950/70 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={15} className="text-blue-300" />
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-300">Signal board</h2>
          </div>
          <span className="text-[10px] text-gray-600">SPY benchmark</span>
        </div>
        <TechnicalPanel analysis={analysis} />

        <div className="mt-3">
          <ResearchPanel
            run={researchRun}
            history={researchHistory}
            onSelectRun={(run) => {
              setResearchRun(run);
              setAnalysis(run.technical_snapshot);
              setFollowUpRun(null);
            }}
            followUp={followUpRun}
            capabilities={capabilities}
            loading={codexLoading}
            followUpLoading={followUpLoading}
          />
        </div>

        <div className="mt-3">
          <ValuationLab ticker={normalizedTicker} currentPrice={analysis?.last_close ?? null} />
        </div>

        <div className="mt-3">
          <CompanyPanel
            ticker={normalizedTicker}
            company={company}
            evidence={evidence}
            onChanged={(nextCompany, nextEvidence) => {
              setCompany(nextCompany);
              setEvidence(nextEvidence);
            }}
          />
        </div>

        <div className="mt-3 rounded-xl border border-blue-400/15 bg-blue-400/[0.04] p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-200">
            <ShieldCheck size={14} /> Foundation mode
          </div>
          <p className="mt-2 text-[11px] leading-5 text-gray-500">
            Deterministic technicals remain authoritative. Codex dossiers are validated, versioned and saved
            locally before the UI displays their perspectives, sources and disagreements.
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-gray-600">
            <BookOpen size={11} /> Explainable signals · no automatic trading
          </div>
        </div>
      </aside>
    </main>
  );
}
