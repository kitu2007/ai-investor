"use client";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Database,
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
  InvestmentCompany,
  ResearchResponse,
  TechnicalAnalysis,
} from "@/lib/investment-os-types";

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
  const [loading, setLoading] = useState(false);
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
    void fetchBackendStatus().then((result) => {
      if (!active) return;
      setStatus(result);
      setStatusLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

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
      setQuestion("");
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
                Ask a company question. Get a measurable technical read.
              </h1>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-gray-500">
                Live daily prices feed your FastAPI analysis engine; company facts and evidence stay in PostgreSQL.
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
              <button
                disabled={loading || !normalizedTicker || !question.trim() || !status?.connected}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Run research"
              >
                {loading ? <LoaderCircle size={17} className="animate-spin" /> : <ArrowRight size={17} />}
              </button>
            </div>
            {error ? <p className="mx-auto mt-2 max-w-3xl text-xs text-rose-300">{error}</p> : null}
            <p className="mx-auto mt-2 max-w-3xl text-center text-[10px] text-gray-700">
              Research support only—not personalized financial advice. Market data may be delayed.
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
            Today this workspace provides deterministic technical analysis and durable evidence storage.
            Fundamental, macro, valuation, and LLM research agents are the next layers—not simulated here.
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-gray-600">
            <BookOpen size={11} /> Explainable signals · no automatic trading
          </div>
        </div>
      </aside>
    </main>
  );
}
