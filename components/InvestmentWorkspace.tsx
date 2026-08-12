"use client";

import {
  Activity,
  AlertTriangle,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Database,
  ExternalLink,
  FileText,
  LoaderCircle,
  MessageSquareText,
  Plus,
  Radar,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import {
  RUNNER_IDS,
  runnerIdFromValue,
  runnerLabel,
  runnerReady,
} from "@/lib/investment-os-types";
import type {
  BackendStatus,
  EvidenceItem,
  FollowUpRun,
  InvestmentCompany,
  ResearchCapabilities,
  ResearchPerspective,
  ResearchRun,
  ResearchSource,
  ResearchResponse,
  QuickAnswer,
  QuickAnswerArtifact,
  RunnerId,
  TechnicalAnalysis,
} from "@/lib/investment-os-types";
import IndependentCouncilPanel from "@/components/IndependentCouncilPanel";
import PrivatePortfolioPanel from "@/components/PrivatePortfolioPanel";
import ValuationLab from "@/components/ValuationLab";

type Message = {
  role: "user" | "assistant";
  content: string;
  // Present when the message is a model-produced quick answer, so the chat can
  // show what the claims rest on instead of an unattributable paragraph.
  quickAnswer?: QuickAnswerArtifact;
  pending?: boolean;
};

function defaultResearchQuestion(ticker: string): string {
  const subject = ticker.trim().toUpperCase() || "<TICKER>";
  return `Is ${subject}'s valuation justified by its growth, and what evidence would invalidate the thesis?`;
}

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

function DetailList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">{title}</h3>
      <ul className="mt-2 space-y-2 text-xs leading-5 text-gray-300">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="flex gap-2">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gray-600" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SourceReference({ source }: { source: ResearchSource | undefined }) {
  if (!source) return <span className="text-gray-600">Unknown source</span>;
  if (source.url.startsWith("http")) {
    return (
      <a
        href={source.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-blue-300 hover:text-blue-200"
      >
        {source.title} <ExternalLink size={10} />
      </a>
    );
  }
  return <span className="text-gray-500">{source.title} · local input</span>;
}

function PerspectiveDetail({
  perspective,
  sources,
}: {
  perspective: ResearchPerspective;
  sources: ResearchSource[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-violet-400/25 bg-violet-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase text-violet-200">
            {friendlyLabel(perspective.stance)}
          </span>
          <span className="rounded-full border border-gray-700 px-2.5 py-1 text-[10px] text-gray-400">
            {Math.round(perspective.confidence * 100)}% confidence
          </span>
          <span className="rounded-full border border-gray-700 px-2.5 py-1 text-[10px] text-gray-400">
            {friendlyLabel(perspective.evidence_sufficiency)} evidence
          </span>
        </div>
        <p className="mt-4 text-sm leading-6 text-gray-200">{perspective.summary}</p>
      </div>

      <section>
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
          Evidence-backed claims
        </h3>
        <div className="mt-2 space-y-2">
          {perspective.claims.map((claim, index) => (
            <article key={`${claim.statement}-${index}`} className="rounded-xl border border-gray-800 bg-gray-950/60 p-3">
              <div className="flex items-start gap-2">
                <span className="shrink-0 rounded border border-blue-400/20 bg-blue-400/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-blue-300">
                  {claim.classification}
                </span>
                <p className="text-xs leading-5 text-gray-300">{claim.statement}</p>
              </div>
              {claim.source_ids.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-gray-800 pt-2 text-[10px]">
                  {claim.source_ids.map((sourceId) => (
                    <SourceReference
                      key={sourceId}
                      source={sources.find((source) => source.id === sourceId)}
                    />
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <DetailList title="Risks" items={perspective.risks} />
        <DetailList title="What invalidates this view" items={perspective.invalidation_conditions} />
        <DetailList title="Unresolved questions" items={perspective.unresolved_questions} />
      </div>
    </div>
  );
}

function DossierModal({
  run,
  initialSection,
  onClose,
}: {
  run: ResearchRun;
  initialSection: string;
  onClose: () => void;
}) {
  const artifact = run.artifact;
  const [section, setSection] = useState(initialSection);
  const [copyState, setCopyState] = useState<"idle" | "copying" | "copied" | "failed">("idle");

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  if (!artifact) return null;
  const selectedPerspective = artifact.perspectives.find((item) => item.agent === section);
  const markdownUrl =
    "/api/investment-os/research/run/" + encodeURIComponent(run.id) + "/markdown";

  async function copyMarkdown() {
    setCopyState("copying");
    try {
      const response = await fetch(markdownUrl);
      if (!response.ok) throw new Error("Saved Markdown could not be loaded.");
      await navigator.clipboard.writeText(await response.text());
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-gray-950/90 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-gray-800 px-5 py-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-300">
              <FileText size={13} /> Detailed research dossier
            </div>
            <h2 className="mt-1 text-lg font-semibold text-white">
              {artifact.ticker} · {artifact.company_name}
            </h2>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-gray-400">{artifact.question}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => void copyMarkdown()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-2 text-[11px] font-semibold text-gray-300 hover:bg-gray-800"
            >
              {copyState === "copied" ? <CheckCircle2 size={13} /> : <Copy size={13} />}
              {copyState === "copying"
                ? "Copying…"
                : copyState === "copied"
                  ? "Copied"
                  : copyState === "failed"
                    ? "Copy failed"
                    : "Copy full .md"}
            </button>
            <a
              href={markdownUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400/25 bg-violet-400/10 px-3 py-2 text-[11px] font-semibold text-violet-200 hover:bg-violet-400/15"
            >
              <ExternalLink size={13} /> Open saved .md
            </a>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white"
              aria-label="Close detailed dossier"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 md:grid-cols-[220px_1fr]">
          <nav className="overflow-y-auto border-r border-gray-800 bg-gray-950/45 p-3" aria-label="Dossier sections">
            <button
              type="button"
              onClick={() => setSection("overview")}
              className={
                "w-full rounded-lg px-3 py-2 text-left text-xs font-medium " +
                (section === "overview"
                  ? "bg-violet-400/10 text-violet-200"
                  : "text-gray-400 hover:bg-gray-800 hover:text-gray-200")
              }
            >
              CIO overview
            </button>
            <div className="my-3 border-t border-gray-800" />
            {artifact.perspectives.map((perspective) => (
              <button
                key={perspective.agent}
                type="button"
                onClick={() => setSection(perspective.agent)}
                className={
                  "mb-1 w-full rounded-lg px-3 py-2 text-left " +
                  (section === perspective.agent
                    ? "bg-violet-400/10 text-violet-200"
                    : "text-gray-400 hover:bg-gray-800 hover:text-gray-200")
                }
              >
                <span className="block text-xs font-medium">{friendlyLabel(perspective.agent)}</span>
                <span className="mt-0.5 block text-[9px] text-gray-600">
                  {friendlyLabel(perspective.stance)} · {Math.round(perspective.confidence * 100)}%
                </span>
              </button>
            ))}
          </nav>

          <div className="overflow-y-auto p-5 md:p-7">
            {selectedPerspective ? (
              <>
                <h2 className="mb-5 text-base font-semibold text-white">
                  {friendlyLabel(selectedPerspective.agent)} analysis
                </h2>
                <PerspectiveDetail perspective={selectedPerspective} sources={artifact.sources} />
              </>
            ) : (
              <div className="space-y-7">
                <section>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide text-gray-500">
                    <span>{friendlyLabel(artifact.synthesis.status)}</span>
                    <span>·</span>
                    <span>{Math.round(artifact.synthesis.confidence * 100)}% confidence</span>
                    <span>·</span>
                    <span>As of {artifact.as_of}</span>
                  </div>
                  <h2 className="mt-3 text-base font-semibold text-white">Executive synthesis</h2>
                  <p className="mt-3 text-sm leading-6 text-gray-200">{artifact.executive_summary}</p>
                  <p className="mt-3 text-sm leading-6 text-gray-400">{artifact.synthesis.summary}</p>
                </section>

                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  <DetailList title="What changed" items={artifact.synthesis.what_changed} />
                  <DetailList title="Agreements" items={artifact.synthesis.agreements} />
                  <DetailList title="Disagreements" items={artifact.synthesis.disagreements} />
                  <DetailList title="Catalysts" items={artifact.synthesis.catalysts} />
                  <DetailList title="Risks" items={artifact.synthesis.risks} />
                  <DetailList title="Next questions" items={artifact.synthesis.next_questions} />
                </div>

                <section>
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                    Scenarios
                  </h3>
                  <div className="mt-3 grid gap-3 lg:grid-cols-3">
                    {artifact.scenarios.map((scenario) => (
                      <article key={scenario.name} className="rounded-xl border border-gray-800 bg-gray-950/55 p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase text-gray-300">{scenario.name}</span>
                          <span className="text-sm font-semibold text-violet-200">
                            {Math.round(scenario.probability * 100)}%
                          </span>
                        </div>
                        <p className="mt-3 text-xs leading-5 text-gray-300">{scenario.summary}</p>
                        <p className="mt-3 text-[10px] leading-4 text-gray-500">{scenario.valuation_note}</p>
                        <ul className="mt-3 space-y-1 text-[10px] leading-4 text-gray-500">
                          {scenario.assumptions.map((assumption) => (
                            <li key={assumption}>• {assumption}</li>
                          ))}
                        </ul>
                      </article>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                    Complete source list
                  </h3>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {artifact.sources.map((source) => (
                      <div key={source.id} className="rounded-lg border border-gray-800 bg-gray-950/55 p-3 text-[10px] leading-4">
                        <SourceReference source={source} />
                        <div className="mt-1 text-gray-600">
                          {source.publisher} · {source.published_at || "date unavailable"} · {source.source_type}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {run.markdown_path ? (
                  <p className="border-t border-gray-800 pt-4 font-mono text-[10px] text-gray-600">
                    Saved locally: investment-os/{run.markdown_path}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
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

function QuickAnswerDetail({ artifact }: { artifact: QuickAnswerArtifact }) {
  const [open, setOpen] = useState(false);
  const facts = artifact.claims.filter((claim) => claim.classification === "fact");
  return (
    <div className="mt-2 border-t border-gray-800 pt-2">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-1 text-[10px] font-medium text-violet-300 hover:text-violet-200"
      >
        {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        {artifact.sources.length} source{artifact.sources.length === 1 ? "" : "s"}
        {facts.length ? ` · ${facts.length} cited fact${facts.length === 1 ? "" : "s"}` : ""}
      </button>
      {open ? (
        <div className="mt-2 space-y-2">
          {artifact.claims.length ? (
            <ul className="space-y-1">
              {artifact.claims.map((claim, index) => (
                <li key={index} className="text-[10px] leading-4 text-gray-400">
                  <span className="font-semibold uppercase text-gray-500">
                    {claim.classification}
                  </span>{" "}
                  {claim.statement}
                  {claim.source_ids.length ? (
                    <span className="text-gray-600">
                      {" "}
                      [{claim.source_ids.join(", ")}]
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          {artifact.limitations.length ? (
            <p className="text-[10px] leading-4 text-amber-300/80">
              Limitations: {artifact.limitations.join(" · ")}
            </p>
          ) : null}
          <ul className="space-y-1">
            {artifact.sources.map((source) => (
              <li key={source.id} className="text-[10px] leading-4">
                <span className="text-gray-600">[{source.id}]</span>{" "}
                {source.url.startsWith("http") ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-300 hover:underline"
                  >
                    {source.title}
                  </a>
                ) : (
                  <span className="text-gray-400">{source.title}</span>
                )}
                <span className="text-gray-600"> — {source.publisher}</span>
              </li>
            ))}
          </ul>
          <p className="text-[9px] text-gray-700">{artifact.disclaimer}</p>
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
  runner,
  loading,
  followUpLoading,
}: {
  run: ResearchRun | null;
  history: ResearchRun[];
  onSelectRun: (run: ResearchRun) => void;
  followUp: FollowUpRun | null;
  capabilities: ResearchCapabilities | null;
  runner: RunnerId;
  loading: boolean;
  followUpLoading: boolean;
}) {
  const artifact = run?.artifact;
  const [detailSection, setDetailSection] = useState<string | null>(null);
  const completedHistory = history.filter((item) => item.status === "completed" && item.artifact);
  const selectedLabel = runnerLabel(capabilities, runner);
  // A saved dossier is attributed to whichever runner actually produced it.
  const runLabel = run ? runnerLabel(capabilities, runnerIdFromValue(run.runner)) : selectedLabel;
  const ready = runnerReady(capabilities, runner);

  return (
    <>
      <section className="rounded-xl border border-violet-400/20 bg-violet-400/[0.04] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-violet-200">
          <Sparkles size={14} /> {selectedLabel} research dossier
        </div>
        <span
          className={
            "rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide " +
            (ready
              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
              : "border-amber-400/20 bg-amber-400/10 text-amber-300")
          }
        >
          {ready ? `${selectedLabel} ready` : `${selectedLabel} unavailable`}
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
              {run?.status === "running"
                ? `${runLabel} is analyzing`
                : `Preparing ${runLabel} analysis`}
            </p>
            <p className="mt-1 text-[10px] leading-4 text-gray-500">
              Independent perspectives, evidence checks, scenarios and disagreements are being assembled.
            </p>
          </div>
        </div>
      ) : run?.status === "failed" ? (
        <div className="mt-3 rounded-lg border border-rose-400/20 bg-rose-400/[0.06] p-3 text-[11px] leading-5 text-rose-200">
          {run.error || `The local ${runLabel} analysis failed.`}
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
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setDetailSection("overview")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-[10px] font-semibold text-white hover:bg-violet-500"
              >
                <FileText size={12} /> Read full dossier
              </button>
              <a
                href={
                  "/api/investment-os/research/run/" +
                  encodeURIComponent(run.id) +
                  "/markdown"
                }
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-2 text-[10px] font-semibold text-gray-300 hover:bg-gray-800"
              >
                <ExternalLink size={11} /> Open saved .md
              </a>
              <span className="ml-auto text-[10px] text-gray-600">As of {artifact.as_of}</span>
            </div>
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
                  <div className="border-t border-gray-800 px-3 py-2">
                    <p className="text-[10px] leading-4 text-gray-500">{perspective.summary}</p>
                    <div className="mt-2 flex items-center justify-between gap-2 border-t border-gray-800 pt-2 text-[9px] text-gray-600">
                      <span>
                        {perspective.claims.length} claims · {perspective.risks.length} risks ·{" "}
                        {perspective.invalidation_conditions.length} invalidation tests
                      </span>
                      <button
                        type="button"
                        onClick={() => setDetailSection(perspective.agent)}
                        className="shrink-0 font-semibold text-violet-300 hover:text-violet-200"
                      >
                        Read details
                      </button>
                    </div>
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
          Request a {selectedLabel} analysis to create a saved, question-specific dossier. Viewing saved
          research and recalculating technicals do not invoke a model.
        </p>
      )}

      {followUpLoading || followUp?.status === "queued" || followUp?.status === "running" ? (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-blue-400/15 bg-blue-400/[0.05] p-3">
          <LoaderCircle size={14} className="mt-0.5 shrink-0 animate-spin text-blue-300" />
          <div>
            <p className="text-[11px] font-medium text-blue-200">Answering from the saved dossier</p>
            <p className="mt-1 text-[10px] leading-4 text-gray-500">
              {runLabel} is reusing the selected report and will browse only if its evidence is
              insufficient.
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
          Local {selectedLabel} sign-in · no project API key · local reports stay outside Git
        </div>
      </section>
      {detailSection && run?.artifact ? (
        <DossierModal
          key={`${run.id}-${detailSection}`}
          run={run}
          initialSection={detailSection}
          onClose={() => setDetailSection(null)}
        />
      ) : null}
    </>
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
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<TechnicalAnalysis | null>(null);
  const [company, setCompany] = useState<InvestmentCompany | null>(null);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [status, setStatus] = useState<BackendStatus | null>(null);
  const [capabilities, setCapabilities] = useState<ResearchCapabilities | null>(null);
  const [runner, setRunner] = useState<RunnerId>("codex");
  const [quickAnswerId, setQuickAnswerId] = useState<string | null>(null);
  const [quickAnswerLoading, setQuickAnswerLoading] = useState(false);
  const [researchRun, setResearchRun] = useState<ResearchRun | null>(null);
  const [researchHistory, setResearchHistory] = useState<ResearchRun[]>([]);
  const [followUpRun, setFollowUpRun] = useState<FollowUpRun | null>(null);
  const [researchReview, setResearchReview] = useState<
    { ticker: string; question: string; runner: RunnerId } | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [researchLoading, setResearchLoading] = useState(false);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [followUpCancelLoading, setFollowUpCancelLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [error, setError] = useState("");

  const normalizedTicker = useMemo(() => ticker.trim().toUpperCase(), [ticker]);
  const researchActive = Boolean(
    researchRun && ["queued", "running"].includes(researchRun.status),
  );
  const followUpActive = Boolean(
    followUpRun && ["queued", "running"].includes(followUpRun.status),
  );

  function updateTicker(value: string) {
    const nextTicker = value.toUpperCase().replace(/[^A-Z.-]/g, "").slice(0, 16);
    setTicker(nextTicker);
    setSessionId(null);
    setResearchReview(null);
  }

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
      if (researchCapabilities?.default_runner) setRunner(researchCapabilities.default_runner);
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
          const selectedRun =
            history.find((item) => ["queued", "running"].includes(item.status)) ??
            history.find((item) => item.status === "completed") ??
            null;
          setResearchRun(selectedRun);
          setResearchLoading(Boolean(selectedRun && ["queued", "running"].includes(selectedRun.status)));
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
          if (["completed", "failed", "cancelled"].includes(run.status)) {
            setResearchLoading(false);
            setResearchHistory((current) => [run, ...current.filter((item) => item.id !== run.id)]);
            window.clearInterval(interval);
          }
        })
        .catch(() => {
          if (active) setResearchLoading(false);
        });
    }, 3000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [researchRun]);

  // Poll the queued quick answer and resolve the pending chat bubble in place.
  useEffect(() => {
    if (!quickAnswerId) return;
    let active = true;
    const interval = window.setInterval(() => {
      void jsonRequest<QuickAnswer>(
        "/api/investment-os/research/quick-answer/" + encodeURIComponent(quickAnswerId),
      )
        .then((answer) => {
          if (!active || ["queued", "running"].includes(answer.status)) return;
          window.clearInterval(interval);
          setQuickAnswerId(null);
          setQuickAnswerLoading(false);
          setMessages((current) => {
            const settled = current.filter((item) => !item.pending);
            if (answer.status === "completed" && answer.artifact) {
              return [
                ...settled,
                {
                  role: "assistant",
                  content: answer.artifact.answer,
                  quickAnswer: answer.artifact,
                },
              ];
            }
            if (answer.status === "cancelled") {
              return [...settled, { role: "assistant", content: "That question was cancelled." }];
            }
            return [
              ...settled,
              {
                role: "assistant",
                content: answer.error || "That question could not be answered.",
              },
            ];
          });
        })
        .catch((reason) => {
          if (!active) return;
          window.clearInterval(interval);
          setQuickAnswerId(null);
          setQuickAnswerLoading(false);
          setError(reason instanceof Error ? reason.message : "Lost track of that question.");
          setMessages((current) => current.filter((item) => !item.pending));
        });
    }, 2000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [quickAnswerId]);

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
          if (["completed", "failed", "cancelled"].includes(run.status)) {
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

  async function askQuickAnswer() {
    if (!normalizedTicker || !question.trim() || quickAnswerLoading) return;
    const prompt = question.trim();
    const label = runnerLabel(capabilities, runner);
    setQuickAnswerLoading(true);
    setError("");
    setMessages((current) => [
      ...current,
      { role: "user", content: prompt },
      { role: "assistant", content: `${label} is looking that up…`, pending: true },
    ]);
    try {
      const queued = await jsonRequest<QuickAnswer>("/api/investment-os/research/quick-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: normalizedTicker, question: prompt, runner }),
      });
      setQuickAnswerId(queued.id);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Could not ask that question.";
      setError(message);
      setQuickAnswerLoading(false);
      setMessages((current) => [
        ...current.filter((item) => !item.pending),
        { role: "assistant", content: "I could not answer that. " + message },
      ]);
    }
  }

  async function cancelQuickAnswer() {
    if (!quickAnswerId) return;
    const id = quickAnswerId;
    setQuickAnswerId(null);
    setQuickAnswerLoading(false);
    try {
      await jsonRequest<QuickAnswer>(
        `/api/investment-os/research/quick-answer/${encodeURIComponent(id)}/cancel`,
        { method: "POST" },
      );
    } catch {
      // The record is already gone or finished; the thread message is enough.
    }
    setMessages((current) => [
      ...current.filter((item) => !item.pending),
      { role: "assistant", content: "That question was cancelled." },
    ]);
  }

  function reviewResearchRequest() {
    if (!normalizedTicker || !question.trim()) return;
    setError("");
    setResearchReview({ ticker: normalizedTicker, question: question.trim(), runner });
  }

  async function requestResearchRun() {
    if (!researchReview) return;
    const request = researchReview;
    setResearchReview(null);
    setResearchLoading(true);
    setError("");
    setMessages((current) => [...current, { role: "user", content: request.question }]);
    try {
      const run = await jsonRequest<ResearchRun>("/api/investment-os/research/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...request, runner: request.runner }),
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
            `${runnerLabel(capabilities, request.runner)} analysis is queued. The saved dossier will ` +
            "appear in the research panel when complete.",
        },
      ]);
    } catch (reason) {
      const message =
        reason instanceof Error ? reason.message : "Could not request the analysis.";
      setError(message);
      setResearchLoading(false);
    }
  }

  async function cancelResearchRun() {
    if (!researchRun || !["queued", "running"].includes(researchRun.status)) return;
    setCancelLoading(true);
    setError("");
    try {
      const run = await jsonRequest<ResearchRun>(
        "/api/investment-os/research/run/" + encodeURIComponent(researchRun.id) + "/cancel",
        { method: "POST" },
      );
      setResearchRun(run);
      setResearchHistory((current) => [run, ...current.filter((item) => item.id !== run.id)]);
      setResearchLoading(false);
      setMessages((current) => [
        ...current,
        { role: "assistant", content: "The analysis was cancelled. No dossier was saved." },
      ]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not cancel the analysis.");
    } finally {
      setCancelLoading(false);
    }
  }

  async function requestFollowUpRun() {
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
          runner,
        }),
      });
      setFollowUpRun(run);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: `${runnerLabel(capabilities, runner)} is answering from the selected saved dossier.`,
        },
      ]);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Could not request the follow-up.";
      setError(message);
      setFollowUpLoading(false);
    }
  }

  async function cancelFollowUpRun() {
    if (!followUpRun || !["queued", "running"].includes(followUpRun.status)) return;
    setFollowUpCancelLoading(true);
    setError("");
    try {
      const run = await jsonRequest<FollowUpRun>(
        "/api/investment-os/research/followup/" +
          encodeURIComponent(followUpRun.id) +
          "/cancel",
        { method: "POST" },
      );
      setFollowUpRun(run);
      setFollowUpLoading(false);
      setMessages((current) => [
        ...current,
        { role: "assistant", content: "The follow-up was cancelled." },
      ]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not cancel the follow-up.");
    } finally {
      setFollowUpCancelLoading(false);
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
                Ask a company question. Get a cited answer in chat, or commission a full dossier.
              </h1>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-gray-500">
                Deterministic calculations stay separate from question-specific model research and cited
                sources.
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
                        onClick={() => updateTicker(symbol)}
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
                      {message.pending ? (
                        <span className="flex items-center gap-2 text-gray-400">
                          <LoaderCircle size={13} className="animate-spin text-violet-300" />
                          {message.content}
                        </span>
                      ) : (
                        message.content
                      )}
                      {message.quickAnswer ? (
                        <QuickAnswerDetail artifact={message.quickAnswer} />
                      ) : null}
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
            <div className="mx-auto mb-2 flex max-w-3xl items-center gap-2">
              <span className="text-[9px] font-semibold uppercase tracking-wide text-gray-600">
                Research agent
              </span>
              <div
                role="radiogroup"
                aria-label="Research agent"
                className="flex gap-1 rounded-lg border border-gray-800 bg-gray-900 p-0.5"
              >
                {RUNNER_IDS.map((option) => {
                  const optionReady = runnerReady(capabilities, option);
                  const selected = runner === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={!optionReady}
                      title={
                        optionReady
                          ? undefined
                          : `${runnerLabel(capabilities, option)} is not available locally`
                      }
                      onClick={() => {
                        setRunner(option);
                        setResearchReview(null);
                      }}
                      className={
                        "rounded-md px-2.5 py-1 text-[10px] font-semibold transition " +
                        (selected
                          ? "bg-violet-600 text-white"
                          : "text-gray-400 hover:text-gray-200") +
                        (optionReady ? "" : " cursor-not-allowed opacity-40")
                      }
                    >
                      {runnerLabel(capabilities, option)}
                    </button>
                  );
                })}
              </div>
              <span className="text-[9px] text-gray-700">
                Local sign-in · no project API key
              </span>
            </div>
            <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-xl border border-gray-700 bg-gray-900 p-2 focus-within:border-blue-500">
              <div className="shrink-0 border-r border-gray-800 px-2 pb-1">
                <label className="block text-[9px] font-semibold uppercase tracking-wide text-gray-600">
                  Ticker
                </label>
                <input
                  value={ticker}
                  onChange={(event) => updateTicker(event.target.value)}
                  className="w-20 bg-transparent text-sm font-bold uppercase text-blue-300 outline-none"
                  aria-label="Stock ticker"
                />
              </div>
              <textarea
                value={question}
                onChange={(event) => {
                  setQuestion(event.target.value);
                  setResearchReview(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                rows={2}
                placeholder={defaultResearchQuestion(normalizedTicker)}
                className="min-h-12 flex-1 resize-none bg-transparent px-2 py-1 text-sm leading-5 text-white outline-none placeholder:text-gray-600"
                aria-label="Research question"
              />
              <div className="flex shrink-0 flex-col gap-1.5">
                {quickAnswerLoading ? (
                  <button
                    type="button"
                    onClick={() => void cancelQuickAnswer()}
                    className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-rose-400/25 bg-rose-400/10 px-3 text-[11px] font-semibold text-rose-200 hover:bg-rose-400/15"
                    aria-label="Cancel the question"
                  >
                    <Square size={12} />
                    Cancel
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void askQuickAnswer()}
                    disabled={
                      !normalizedTicker ||
                      !question.trim() ||
                      !status?.connected ||
                      !runnerReady(capabilities, runner)
                    }
                    className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-[11px] font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Ask this question and answer in the chat"
                  >
                    <MessageSquareText size={14} />
                    Ask
                  </button>
                )}
                <button
                  disabled={loading || !normalizedTicker || !status?.connected}
                  title="Recalculates trend, momentum and drawdown. Does not read your question."
                  className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-gray-700 px-3 text-[11px] font-semibold text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Recalculate technical signals; does not read the question"
                >
                  {loading ? <LoaderCircle size={14} className="animate-spin" /> : <Activity size={14} />}
                  Signals
                </button>
                {researchActive ? (
                  <button
                    type="button"
                    onClick={() => void cancelResearchRun()}
                    disabled={cancelLoading}
                    className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-rose-400/25 bg-rose-400/10 px-3 text-[11px] font-semibold text-rose-200 hover:bg-rose-400/15 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Cancel the running analysis"
                  >
                    {cancelLoading ? (
                      <LoaderCircle size={14} className="animate-spin" />
                    ) : (
                      <Square size={12} />
                    )}
                    Cancel run
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={reviewResearchRequest}
                    disabled={
                      researchLoading ||
                      !normalizedTicker ||
                      !question.trim() ||
                      !runnerReady(capabilities, runner)
                    }
                    className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Review the analysis request"
                  >
                    <Sparkles size={14} />
                    Request {runnerLabel(capabilities, runner)}
                  </button>
                )}
                {followUpActive ? (
                  <button
                    type="button"
                    onClick={() => void cancelFollowUpRun()}
                    disabled={followUpCancelLoading}
                    className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-rose-400/25 bg-rose-400/10 px-3 text-[11px] font-semibold text-rose-200 hover:bg-rose-400/15 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Cancel the running follow-up"
                  >
                    {followUpCancelLoading ? (
                      <LoaderCircle size={14} className="animate-spin" />
                    ) : (
                      <Square size={12} />
                    )}
                    Cancel follow-up
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void requestFollowUpRun()}
                    disabled={
                      followUpLoading ||
                      researchRun?.status !== "completed" ||
                      !question.trim() ||
                      !runnerReady(capabilities, runner)
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
                )}
              </div>
            </div>
            {researchReview ? (
              <div
                role="dialog"
                aria-label="Review research request"
                className="mx-auto mt-3 max-w-3xl rounded-xl border border-violet-400/25 bg-violet-400/[0.06] p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-300">
                      Review before starting {runnerLabel(capabilities, researchReview.runner)}
                    </p>
                    <p className="mt-1 text-[10px] text-gray-500">
                      Nothing has been queued yet. This run will use your{" "}
                      {runnerLabel(capabilities, researchReview.runner)} allowance.
                    </p>
                  </div>
                  <span className="rounded-md border border-gray-700 bg-gray-950 px-2 py-1 text-[10px] font-bold text-blue-300">
                    {researchReview.ticker}
                  </span>
                </div>
                <p className="mt-3 rounded-lg border border-gray-800 bg-gray-950/70 px-3 py-2 text-xs leading-5 text-gray-200">
                  {researchReview.question}
                </p>
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setResearchReview(null)}
                    className="rounded-lg border border-gray-700 px-3 py-2 text-[11px] font-semibold text-gray-300 hover:bg-gray-800"
                  >
                    Edit question
                  </button>
                  <button
                    type="button"
                    onClick={() => void requestResearchRun()}
                    className="rounded-lg bg-violet-600 px-3 py-2 text-[11px] font-semibold text-white hover:bg-violet-500"
                  >
                    Start {runnerLabel(capabilities, researchReview.runner)} analysis
                  </button>
                </div>
              </div>
            ) : null}
            {error ? <p className="mx-auto mt-2 max-w-3xl text-xs text-rose-300">{error}</p> : null}
            <p className="mx-auto mt-2 max-w-3xl text-center text-[10px] text-gray-700">
              Signals are deterministic and ignore your question. Ask answers it in chat with one{" "}
              {runnerLabel(capabilities, runner)} call; a full dossier costs far more.
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
            runner={runner}
            loading={researchLoading}
            followUpLoading={followUpLoading}
          />
        </div>

        <div className="mt-3">
          <IndependentCouncilPanel
            key={normalizedTicker}
            ticker={normalizedTicker}
            question={question}
            capabilities={capabilities}
            runner={runner}
          />
        </div>

        <div className="mt-3">
          <PrivatePortfolioPanel key={normalizedTicker} ticker={normalizedTicker} />
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
            Deterministic technicals remain authoritative. Saved dossiers are validated, versioned and saved
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
