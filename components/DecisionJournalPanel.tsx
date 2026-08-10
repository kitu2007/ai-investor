"use client";

import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  History,
  LoaderCircle,
  Save,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type {
  AllocationAnalysis,
  CioAllocationDraft,
  DecisionJournalEntry,
} from "@/lib/investment-os-types";

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? response.statusText);
  }
  return (await response.json()) as T;
}

function plusDays(days: number): string {
  const value = new Date();
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

function actionFromCio(action: string | undefined): DecisionJournalEntry["action"] {
  if (action === "strong_buy" || action === "buy") return "initiate";
  if (action === "trim") return "trim";
  if (action === "pass") return "pass";
  return "watch";
}

export default function DecisionJournalPanel({
  ticker,
  analysis,
  cioDraft,
}: {
  ticker: string;
  analysis: AllocationAnalysis | null;
  cioDraft: CioAllocationDraft | null;
}) {
  const [expanded, setExpanded] = useState(Boolean(analysis));
  const [history, setHistory] = useState<DecisionJournalEntry[]>([]);
  const [entryType, setEntryType] = useState<DecisionJournalEntry["entry_type"]>("decision");
  const [action, setAction] = useState<DecisionJournalEntry["action"]>(
    actionFromCio(cioDraft?.ownership_action),
  );
  const [headline, setHeadline] = useState("");
  const [thesis, setThesis] = useState("");
  const [rationale, setRationale] = useState("");
  const [invalidationText, setInvalidationText] = useState(
    cioDraft?.invalidation_conditions.join("\n") ?? "",
  );
  const [reviewDate, setReviewDate] = useState(() => plusDays(90));
  const [supersedesEntryId, setSupersedesEntryId] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void jsonRequest<DecisionJournalEntry[]>(
      "/api/investment-os/journal/history?ticker=" + encodeURIComponent(ticker),
    )
      .then((entries) => {
        if (!cancelled) setHistory(entries);
      })
      .catch((reason) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : "Could not load decision history.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  const invalidationConditions = useMemo(
    () =>
      invalidationText
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    [invalidationText],
  );
  const provenanceCouncilId = analysis?.council_run_id ?? cioDraft?.council_run_id ?? null;
  const canSave = Boolean(
    (analysis || provenanceCouncilId) &&
      headline.trim() &&
      thesis.trim() &&
      rationale.trim() &&
      invalidationConditions.length &&
      reviewDate,
  );

  async function saveEntry() {
    if (!canSave) return;
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const entry = await jsonRequest<DecisionJournalEntry>(
        "/api/investment-os/journal/entries",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticker,
            entry_type: entryType,
            action,
            headline: headline.trim(),
            thesis: thesis.trim(),
            rationale: rationale.trim(),
            invalidation_conditions: invalidationConditions,
            decision_date: new Date().toISOString().slice(0, 10),
            review_date: reviewDate,
            council_run_id: provenanceCouncilId,
            allocation_analysis_id: analysis?.id ?? null,
            supersedes_entry_id: supersedesEntryId || null,
          }),
        },
      );
      setHistory((current) => [entry, ...current]);
      setSaved(true);
      setSupersedesEntryId("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save the journal entry.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-lg border border-cyan-400/15 bg-cyan-400/[0.025]">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-start justify-between gap-3 p-3 text-left"
      >
        <div>
          <div className="flex items-center gap-2 text-[10px] font-semibold text-cyan-200">
            <History size={12} /> Decision journal
          </div>
          <p className="mt-1 text-[9px] leading-4 text-gray-600">
            Append-only decisions with frozen CIO and allocation context.
          </p>
        </div>
        {expanded ? (
          <ChevronUp size={13} className="text-gray-600" />
        ) : (
          <ChevronDown size={13} className="text-gray-600" />
        )}
      </button>

      {expanded ? (
        <div className="space-y-3 border-t border-gray-800 p-3">
          {analysis || provenanceCouncilId ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[9px] text-gray-600">
                  Entry type
                  <select
                    value={entryType}
                    onChange={(event) =>
                      setEntryType(event.target.value as DecisionJournalEntry["entry_type"])
                    }
                    className="mt-1 w-full rounded-md border border-gray-800 bg-gray-950 px-2 py-1.5 text-[10px] text-gray-200"
                  >
                    <option value="decision">Decision</option>
                    <option value="review">Review</option>
                    <option value="thesis_update">Thesis update</option>
                    <option value="postmortem">Postmortem</option>
                  </select>
                </label>
                <label className="text-[9px] text-gray-600">
                  Action
                  <select
                    value={action}
                    onChange={(event) =>
                      setAction(event.target.value as DecisionJournalEntry["action"])
                    }
                    className="mt-1 w-full rounded-md border border-gray-800 bg-gray-950 px-2 py-1.5 text-[10px] text-gray-200"
                  >
                    {[
                      "initiate",
                      "add",
                      "hold",
                      "trim",
                      "exit",
                      "watch",
                      "pass",
                    ].map((value) => (
                      <option key={value} value={value}>
                        {value.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block text-[9px] text-gray-600">
                Decision headline
                <input
                  value={headline}
                  onChange={(event) => setHeadline(event.target.value)}
                  placeholder="What did you decide?"
                  className="mt-1 w-full rounded-md border border-gray-800 bg-gray-950 px-2 py-1.5 text-[10px] text-gray-200"
                />
              </label>
              <label className="block text-[9px] text-gray-600">
                Thesis
                <textarea
                  value={thesis}
                  onChange={(event) => setThesis(event.target.value)}
                  placeholder="Why should this be owned, watched, or passed?"
                  rows={3}
                  className="mt-1 w-full resize-y rounded-md border border-gray-800 bg-gray-950 px-2 py-1.5 text-[10px] leading-4 text-gray-200"
                />
              </label>
              <label className="block text-[9px] text-gray-600">
                Rationale
                <textarea
                  value={rationale}
                  onChange={(event) => setRationale(event.target.value)}
                  placeholder="Connect the evidence, CIO disagreement, and allocation result."
                  rows={3}
                  className="mt-1 w-full resize-y rounded-md border border-gray-800 bg-gray-950 px-2 py-1.5 text-[10px] leading-4 text-gray-200"
                />
              </label>
              <label className="block text-[9px] text-gray-600">
                Invalidation conditions, one per line
                <textarea
                  value={invalidationText}
                  onChange={(event) => setInvalidationText(event.target.value)}
                  rows={3}
                  className="mt-1 w-full resize-y rounded-md border border-gray-800 bg-gray-950 px-2 py-1.5 text-[10px] leading-4 text-gray-200"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[9px] text-gray-600">
                  Review date
                  <input
                    type="date"
                    value={reviewDate}
                    onChange={(event) => setReviewDate(event.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-800 bg-gray-950 px-2 py-1.5 text-[10px] text-gray-200"
                  />
                </label>
                <label className="text-[9px] text-gray-600">
                  Supersedes
                  <select
                    value={supersedesEntryId}
                    onChange={(event) => setSupersedesEntryId(event.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-800 bg-gray-950 px-2 py-1.5 text-[10px] text-gray-200"
                  >
                    <option value="">New decision</option>
                    {history.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.decision_date} · {entry.action}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button
                type="button"
                onClick={() => void saveEntry()}
                disabled={!canSave || saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-700 px-3 py-2 text-[10px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? <LoaderCircle size={12} className="animate-spin" /> : <Save size={12} />}
                Append decision entry
              </button>
              {saved ? (
                <p className="inline-flex items-center gap-1.5 text-[9px] text-emerald-300">
                  <CheckCircle2 size={11} /> Saved locally without changing prior entries.
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-[9px] leading-4 text-gray-600">
              Load a completed CIO council or calculate an allocation before recording a decision.
            </p>
          )}

          {history.length ? (
            <div className="space-y-2 border-t border-gray-800 pt-3">
              <p className="text-[8px] font-semibold uppercase tracking-wide text-gray-700">
                Decision history
              </p>
              {history.slice(0, 6).map((entry) => (
                <article key={entry.id} className="rounded-md border border-gray-800 bg-gray-950/60 p-2">
                  <div className="flex items-center justify-between gap-2 text-[9px]">
                    <span className="font-semibold text-gray-300">{entry.action.toUpperCase()}</span>
                    <span className="text-gray-700">{entry.decision_date}</span>
                  </div>
                  <p className="mt-1 text-[9px] leading-4 text-gray-500">{entry.headline}</p>
                  <p className="mt-1 text-[8px] text-gray-700">Review {entry.review_date}</p>
                </article>
              ))}
            </div>
          ) : null}
          <p className="text-[8px] leading-4 text-gray-700">
            Local PostgreSQL only · no edit/delete route · no trade is placed.
          </p>
          {error ? <p className="text-[9px] leading-4 text-rose-300">{error}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
