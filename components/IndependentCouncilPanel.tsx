"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  LoaderCircle,
  Scale,
  Square,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import {
  parseSelectedAgents,
  selectedAgentsServerSnapshot,
  selectedAgentsSnapshot,
  subscribeSelectedAgents,
  writeSelectedAgents,
} from "@/lib/council-preferences";
import {
  COUNCIL_AGENTS,
  MINIMUM_COUNCIL_AGENTS,
  runnerLabel,
  runnerReady,
} from "@/lib/investment-os-types";
import type {
  CouncilAgentName,
  CouncilAgentRun,
  CouncilRun,
  ResearchCapabilities,
  RunnerId,
} from "@/lib/investment-os-types";

const ACTIVE = new Set(["queued", "running", "synthesizing"]);

function label(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? response.statusText);
  }
  return (await response.json()) as T;
}

function AgentDetail({ run }: { run: CouncilAgentRun }) {
  const [expanded, setExpanded] = useState(false);
  const perspective = run.artifact?.perspective;
  if (!perspective) {
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-gray-300">{label(run.agent)}</span>
          <span className="text-[9px] uppercase text-gray-600">{label(run.status)}</span>
        </div>
        {run.error ? <p className="mt-1 text-[10px] text-rose-300">{run.error}</p> : null}
      </div>
    );
  }

  return (
    <article className="rounded-lg border border-gray-800 bg-gray-950/60">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-start justify-between gap-3 p-2.5 text-left"
      >
        <div>
          <p className="text-[11px] font-semibold text-gray-200">{label(run.agent)}</p>
          <p className="mt-0.5 text-[9px] text-gray-500">
            {label(perspective.stance)} · {Math.round(perspective.confidence * 100)}% confidence
          </p>
        </div>
        {expanded ? (
          <ChevronUp size={13} className="mt-0.5 text-gray-500" />
        ) : (
          <ChevronDown size={13} className="mt-0.5 text-gray-500" />
        )}
      </button>
      {expanded ? (
        <div className="space-y-3 border-t border-gray-800 px-2.5 py-3">
          <p className="text-[10px] leading-5 text-gray-300">{perspective.summary}</p>
          {perspective.claims.length ? (
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-600">Claims</p>
              <ul className="mt-1.5 space-y-1.5 text-[10px] leading-4 text-gray-400">
                {perspective.claims.map((claim, index) => (
                  <li key={`${claim.statement}-${index}`}>
                    <span className="text-blue-300">{claim.classification}:</span>{" "}
                    {claim.statement}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {[
            ["Risks", perspective.risks],
            ["Invalidation", perspective.invalidation_conditions],
            ["Open questions", perspective.unresolved_questions],
          ].map(([title, items]) =>
            items.length ? (
              <div key={title as string}>
                <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-600">
                  {title as string}
                </p>
                <ul className="mt-1 space-y-1 text-[10px] leading-4 text-gray-500">
                  {(items as string[]).map((item, index) => (
                    <li key={`${title}-${index}`}>• {item}</li>
                  ))}
                </ul>
              </div>
            ) : null,
          )}
          {run.artifact?.sources.length ? (
            <div className="flex flex-wrap gap-2 border-t border-gray-800 pt-2">
              {run.artifact.sources.slice(0, 6).map((source) => (
                <a
                  key={source.id}
                  href={source.url.startsWith("http") ? source.url : undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[9px] text-blue-300 hover:text-blue-200"
                >
                  {source.title} <ExternalLink size={9} />
                </a>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export default function IndependentCouncilPanel({
  ticker,
  question,
  capabilities,
  runner,
}: {
  ticker: string;
  question: string;
  capabilities: ResearchCapabilities | null;
  runner: RunnerId;
}) {
  const [run, setRun] = useState<CouncilRun | null>(null);
  const [review, setReview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAgents, setShowAgents] = useState(false);
  const active = Boolean(run && ACTIVE.has(run.status));

  // The remembered preference is the source of truth, so a change in another tab
  // is reflected here and hydration never disagrees with the server render.
  const storedAgents = useSyncExternalStore(
    subscribeSelectedAgents,
    selectedAgentsSnapshot,
    selectedAgentsServerSnapshot,
  );
  const agents = useMemo(() => parseSelectedAgents(storedAgents), [storedAgents]);
  // One call per agent plus the separate CIO synthesis.
  const estimatedCalls = agents.length + 1;

  function toggleAgent(agent: CouncilAgentName) {
    const next = agents.includes(agent)
      ? agents.filter((item) => item !== agent)
      : COUNCIL_AGENTS.filter((item) => item === agent || agents.includes(item));
    if (next.length < MINIMUM_COUNCIL_AGENTS) return;
    writeSelectedAgents(next);
    setReview(false);
  }

  useEffect(() => {
    if (!ticker) return;
    let cancelled = false;
    void fetch("/api/investment-os/council/latest?ticker=" + encodeURIComponent(ticker))
      .then(async (response) => (response.ok ? ((await response.json()) as CouncilRun) : null))
      .then((latest) => {
        if (!cancelled) setRun(latest);
      });
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  useEffect(() => {
    if (!run || !ACTIVE.has(run.status)) return;
    const timer = window.setInterval(() => {
      void jsonRequest<CouncilRun>(
        "/api/investment-os/council/run/" + encodeURIComponent(run.id),
      )
        .then((next) => {
          setRun(next);
          if (!ACTIVE.has(next.status)) setLoading(false);
        })
        .catch((reason) => {
          setError(reason instanceof Error ? reason.message : "Could not update council progress.");
          setLoading(false);
        });
    }, 2500);
    return () => window.clearInterval(timer);
  }, [run]);

  const completedCount = useMemo(
    () => run?.agent_runs.filter((item) => item.status === "completed").length ?? 0,
    [run],
  );

  async function start() {
    if (!ticker || !question.trim() || agents.length < MINIMUM_COUNCIL_AGENTS) return;
    setLoading(true);
    setReview(false);
    setError("");
    try {
      setRun(
        await jsonRequest<CouncilRun>("/api/investment-os/council/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticker, question: question.trim(), runner, agents }),
        }),
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not start the independent council.");
      setLoading(false);
    }
  }

  async function cancel() {
    if (!run || !ACTIVE.has(run.status)) return;
    setCancelLoading(true);
    setError("");
    try {
      setRun(
        await jsonRequest<CouncilRun>(
          "/api/investment-os/council/run/" + encodeURIComponent(run.id) + "/cancel",
          { method: "POST" },
        ),
      );
      setLoading(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not cancel the council.");
    } finally {
      setCancelLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-violet-400/20 bg-violet-400/[0.035] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-violet-200">
            <Users size={14} /> Independent council
          </div>
          <p className="mt-1 text-[10px] leading-4 text-gray-500">
            {agents.length} isolated opinion{agents.length === 1 ? "" : "s"}, then one separate CIO
            synthesis.
          </p>
        </div>
        {run ? (
          <span className="rounded-md border border-gray-800 px-2 py-1 text-[9px] uppercase text-gray-500">
            {label(run.status)}
          </span>
        ) : null}
      </div>

      {active ? (
        <div className="mt-3 rounded-lg border border-violet-400/15 bg-gray-950/50 p-3">
          <div className="flex items-center gap-2 text-[10px] text-violet-200">
            <LoaderCircle size={12} className="animate-spin" />
            {run?.status === "synthesizing"
              ? "CIO is synthesizing completed opinions"
              : `${completedCount}/${run?.requested_agents.length ?? 9} opinions complete`}
          </div>
          <button
            type="button"
            onClick={() => void cancel()}
            disabled={cancelLoading}
            className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-rose-400/25 bg-rose-400/10 px-2.5 py-1.5 text-[10px] font-semibold text-rose-200 disabled:opacity-50"
          >
            {cancelLoading ? <LoaderCircle size={11} className="animate-spin" /> : <Square size={10} />}
            Cancel council
          </button>
        </div>
      ) : null}

      {run?.status === "completed" && run.cio_artifact ? (
        <div className="mt-3 space-y-3">
          <div className="rounded-lg border border-emerald-400/15 bg-emerald-400/[0.04] p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-200">
                <Scale size={12} /> CIO: {label(run.cio_artifact.ownership_action)}
              </span>
              <span className="text-[9px] text-gray-500">
                {Math.round(run.cio_artifact.confidence * 100)}% confidence
              </span>
            </div>
            <p className="mt-2 text-[10px] leading-5 text-gray-300">
              {run.cio_artifact.executive_summary}
            </p>
            {run.cio_artifact.disagreements.length ? (
              <div className="mt-2 border-t border-gray-800 pt-2">
                <p className="text-[9px] font-semibold uppercase text-gray-600">Disagreements</p>
                {run.cio_artifact.disagreements.map((item, index) => (
                  <p key={`${item}-${index}`} className="mt-1 text-[10px] leading-4 text-gray-500">
                    • {item}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
          <div className="space-y-2">
            {run.agent_runs.map((agentRun) => (
              <AgentDetail key={agentRun.id} run={agentRun} />
            ))}
          </div>
          <a
            href={
              "/api/investment-os/council/run/" + encodeURIComponent(run.id) + "/markdown"
            }
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-violet-200 hover:text-violet-100"
          >
            <ExternalLink size={11} /> Open full saved council .md
          </a>
        </div>
      ) : null}

      {run && ["partial", "failed"].includes(run.status) ? (
        <div className="mt-3 flex gap-2 rounded-lg border border-rose-400/20 bg-rose-400/[0.04] p-2.5">
          <AlertTriangle size={12} className="mt-0.5 shrink-0 text-rose-300" />
          <p className="text-[10px] leading-4 text-rose-200">{run.error ?? "Council failed."}</p>
        </div>
      ) : null}

      {!active ? (
        <div className="mt-3 rounded-lg border border-gray-800 bg-gray-950/50">
          <button
            type="button"
            onClick={() => setShowAgents((current) => !current)}
            aria-expanded={showAgents}
            className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left"
          >
            <span className="text-[10px] font-medium text-gray-400">
              Perspectives · {agents.length} of {COUNCIL_AGENTS.length}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="rounded border border-amber-400/20 bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300">
                {estimatedCalls} calls
              </span>
              {showAgents ? <ChevronUp size={12} className="text-gray-500" /> : <ChevronDown size={12} className="text-gray-500" />}
            </span>
          </button>
          {showAgents ? (
            <div className="border-t border-gray-800 p-2">
              <div className="grid grid-cols-2 gap-1">
                {COUNCIL_AGENTS.map((agent) => {
                  const checked = agents.includes(agent);
                  // Keep the request valid: the last two cannot be unchecked.
                  const locked = checked && agents.length <= MINIMUM_COUNCIL_AGENTS;
                  return (
                    <label
                      key={agent}
                      title={locked ? `At least ${MINIMUM_COUNCIL_AGENTS} perspectives are required` : undefined}
                      className={
                        "flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-[10px] " +
                        (checked ? "text-gray-200" : "text-gray-500") +
                        (locked ? " cursor-not-allowed opacity-60" : " hover:bg-gray-900")
                      }
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={locked}
                        onChange={() => toggleAgent(agent)}
                        className="h-3 w-3 accent-violet-500"
                      />
                      {label(agent)}
                    </label>
                  );
                })}
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 border-t border-gray-800 pt-2">
                <p className="text-[9px] leading-3 text-gray-600">
                  Saved for next time. Fewer perspectives use less allowance.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    writeSelectedAgents(COUNCIL_AGENTS);
                    setReview(false);
                  }}
                  disabled={agents.length === COUNCIL_AGENTS.length}
                  className="shrink-0 rounded border border-gray-700 px-1.5 py-0.5 text-[9px] text-gray-400 hover:bg-gray-800 disabled:opacity-40"
                >
                  Select all
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {!active ? (
        <button
          type="button"
          onClick={() => setReview(true)}
          disabled={
            loading ||
            !ticker ||
            !question.trim() ||
            !runnerReady(capabilities, runner)
          }
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-violet-400/25 bg-violet-500/10 px-3 py-2 text-[10px] font-semibold text-violet-200 hover:bg-violet-500/15 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? <LoaderCircle size={12} className="animate-spin" /> : <Users size={12} />}
          Request independent council
        </button>
      ) : null}

      {review ? (
        <div className="mt-3 rounded-lg border border-amber-400/25 bg-amber-400/[0.05] p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-300" />
            <div>
              <p className="text-[10px] font-semibold text-amber-200">Confirm higher-cost mode</p>
              <p className="mt-1 text-[10px] leading-4 text-gray-400">
                This queues {estimatedCalls} separate {runnerLabel(capabilities, runner)} calls:{" "}
                {agents.length} isolated opinion{agents.length === 1 ? "" : "s"} plus the CIO. It uses
                substantially more allowance than the regular dossier.
              </p>
              <p className="mt-2 rounded border border-gray-800 bg-gray-950/60 p-2 text-[10px] text-gray-300">
                {ticker}: {question.trim()}
              </p>
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setReview(false)}
              className="rounded-md border border-gray-700 px-2.5 py-1.5 text-[10px] text-gray-300"
            >
              Go back
            </button>
            <button
              type="button"
              onClick={() => void start()}
              className="inline-flex items-center gap-1 rounded-md bg-violet-600 px-2.5 py-1.5 text-[10px] font-semibold text-white"
            >
              <CheckCircle2 size={11} /> Start 10-call council
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-2 text-[10px] text-rose-300">{error}</p> : null}
    </section>
  );
}
