"use client";

import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Database,
  FilePlus2,
  LoaderCircle,
  RefreshCw,
  Scale,
  ShieldCheck,
  Target,
} from "lucide-react";
import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import type {
  CompanyComparison,
  ProviderDataStatus,
  ReviewReminderSummary,
  WatchRecord,
} from "@/lib/investment-os-types";

type JsonRecord = Record<string, unknown>;

const inputClass =
  "w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-xs text-gray-200 outline-none placeholder:text-gray-700 focus:border-blue-400/60";
const buttonClass =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-400/25 bg-blue-400/10 px-3 py-2 text-xs font-semibold text-blue-200 hover:bg-blue-400/15 disabled:cursor-not-allowed disabled:opacity-50";

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "The local Investment OS request failed.");
  }
  return (await response.json()) as T;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateAfter(days: number): string {
  const value = new Date();
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

function friendly(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function Card({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900/45 p-5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-300">
        {eyebrow}
      </div>
      <h2 className="mt-1 text-base font-semibold text-white">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function DecisionToolsWorkspace() {
  const [ticker, setTicker] = useState("NVDA");
  const [status, setStatus] = useState<ProviderDataStatus | null>(null);
  const [watches, setWatches] = useState<WatchRecord[]>([]);
  const [reminders, setReminders] = useState<ReviewReminderSummary | null>(null);
  const [comparison, setComparison] = useState<CompanyComparison | null>(null);
  const [comparisonTickers, setComparisonTickers] = useState("NVDA, MSFT");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [watchThesis, setWatchThesis] = useState("");
  const [watchConcern, setWatchConcern] = useState("");
  const [watchTriggers, setWatchTriggers] = useState("");
  const [watchReviewDate, setWatchReviewDate] = useState(dateAfter(30));
  const [eventTitle, setEventTitle] = useState("");
  const [eventSummary, setEventSummary] = useState("");
  const [eventUrl, setEventUrl] = useState("");
  const [eventMaterial, setEventMaterial] = useState(true);
  const [reviewRationale, setReviewRationale] = useState("");
  const [reviewOutcome, setReviewOutcome] = useState("continue_watching");
  const [nextReviewDate, setNextReviewDate] = useState(dateAfter(30));

  const [showImport, setShowImport] = useState(false);
  const [documentType, setDocumentType] = useState("earnings_transcript");
  const [documentProvider, setDocumentProvider] = useState("manual_curated");
  const [documentId, setDocumentId] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentPublisher, setDocumentPublisher] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [documentDate, setDocumentDate] = useState(today());
  const [documentContent, setDocumentContent] = useState("");

  const selectedWatch = useMemo(
    () => watches.find((watch) => watch.status !== "closed") || null,
    [watches],
  );

  const loadReminders = useCallback(async () => {
    setReminders(
      await requestJson<ReviewReminderSummary>(
        "/api/investment-os/decision-tools?action=reminders",
      ),
    );
  }, []);

  const loadTicker = useCallback(async (symbol: string) => {
    const normalized = symbol.trim().toUpperCase();
    if (!normalized) return;
    setBusy("load");
    setError("");
    const [providerResult, watchResult] = await Promise.allSettled([
      requestJson<ProviderDataStatus>(
        `/api/investment-os/decision-tools?action=status&ticker=${encodeURIComponent(normalized)}`,
      ),
      requestJson<WatchRecord[]>(
        `/api/investment-os/decision-tools?action=watches&ticker=${encodeURIComponent(normalized)}`,
      ),
    ]);
    setStatus(providerResult.status === "fulfilled" ? providerResult.value : null);
    setWatches(watchResult.status === "fulfilled" ? watchResult.value : []);
    if (providerResult.status === "rejected") {
      setError(providerResult.reason instanceof Error ? providerResult.reason.message : "Company data could not be loaded.");
    } else if (watchResult.status === "rejected") {
      setError(watchResult.reason instanceof Error ? watchResult.reason.message : "Watch records could not be loaded.");
    }
    setBusy("");
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    requestJson<ReviewReminderSummary>(
      "/api/investment-os/decision-tools?action=reminders",
      { signal: controller.signal },
    ).then(setReminders).catch(() => undefined);
    Promise.allSettled([
      requestJson<ProviderDataStatus>(
        "/api/investment-os/decision-tools?action=status&ticker=NVDA",
        { signal: controller.signal },
      ),
      requestJson<WatchRecord[]>(
        "/api/investment-os/decision-tools?action=watches&ticker=NVDA",
        { signal: controller.signal },
      ),
    ]).then(([providerResult, watchResult]) => {
      if (providerResult.status === "fulfilled") setStatus(providerResult.value);
      if (watchResult.status === "fulfilled") setWatches(watchResult.value);
    });
    return () => controller.abort();
  }, []);

  async function post<T>(payload: JsonRecord): Promise<T> {
    return requestJson<T>("/api/investment-os/decision-tools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  async function refreshSec() {
    setBusy("sec");
    setError("");
    setMessage("");
    try {
      await post({ action: "refresh_sec", ticker: ticker.trim().toUpperCase() });
      await loadTicker(ticker);
      setMessage("SEC filings, filing text, and company facts were refreshed.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "SEC refresh failed.");
    } finally {
      setBusy("");
    }
  }

  async function importDocument(event: FormEvent) {
    event.preventDefault();
    setBusy("document");
    setError("");
    setMessage("");
    try {
      await post({
        action: "import_document",
        ticker: ticker.trim().toUpperCase(),
        provider: documentProvider,
        source_type: documentType,
        external_id: documentId,
        title: documentTitle,
        publisher: documentPublisher,
        source_url: documentUrl,
        published_at: `${documentDate}T12:00:00Z`,
        content: documentContent,
      });
      setDocumentContent("");
      setDocumentTitle("");
      setDocumentId("");
      await loadTicker(ticker);
      setMessage("The source text was validated, hashed, and saved locally.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Document import failed.");
    } finally {
      setBusy("");
    }
  }

  async function createWatch(event: FormEvent) {
    event.preventDefault();
    setBusy("watch");
    setError("");
    try {
      const record = await post<WatchRecord>({
        action: "create_watch",
        ticker: ticker.trim().toUpperCase(),
        quality_thesis: watchThesis,
        valuation_concern: watchConcern,
        triggers: watchTriggers.split("\n").map((item) => item.trim()).filter(Boolean),
        review_date: watchReviewDate,
      });
      setWatchThesis("");
      setWatchConcern("");
      setWatchTriggers("");
      setWatches([record, ...watches]);
      await loadReminders();
      setMessage("Missed-opportunity watch created.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Watch could not be created.");
    } finally {
      setBusy("");
    }
  }

  async function addEvent(event: FormEvent) {
    event.preventDefault();
    if (!selectedWatch) return;
    setBusy("event");
    setError("");
    try {
      const record = await post<WatchRecord>({
        action: "add_watch_event",
        record_id: selectedWatch.id,
        event_date: today(),
        category: "valuation",
        classification: eventUrl ? "fact" : "inference",
        impact: "neutral",
        material: eventMaterial,
        title: eventTitle,
        summary: eventSummary,
        source_url: eventUrl || null,
      });
      setWatches((current) => current.map((item) => (item.id === record.id ? record : item)));
      setEventTitle("");
      setEventSummary("");
      setEventUrl("");
      await loadReminders();
      setMessage(eventMaterial ? "Material evidence saved and review triggered." : "Watch evidence saved.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Watch evidence could not be saved.");
    } finally {
      setBusy("");
    }
  }

  async function reviewWatch(event: FormEvent) {
    event.preventDefault();
    if (!selectedWatch) return;
    setBusy("review");
    setError("");
    try {
      const record = await post<WatchRecord>({
        action: "review_watch",
        record_id: selectedWatch.id,
        outcome: reviewOutcome,
        rationale: reviewRationale,
        next_review_date: reviewOutcome === "continue_watching" ? nextReviewDate : null,
      });
      setWatches((current) => current.map((item) => (item.id === record.id ? record : item)));
      setReviewRationale("");
      await loadReminders();
      setMessage("Watch review recorded without overwriting its history.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Watch review failed.");
    } finally {
      setBusy("");
    }
  }

  async function compare(event: FormEvent) {
    event.preventDefault();
    const tickers = Array.from(
      new Set(
        comparisonTickers
          .split(/[\s,]+/)
          .map((item) => item.trim().toUpperCase())
          .filter(Boolean),
      ),
    );
    setBusy("compare");
    setError("");
    try {
      setComparison(await post<CompanyComparison>({ action: "compare", tickers }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Companies could not be compared.");
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-gray-950">
      <header className="sticky top-0 z-10 border-b border-gray-800 bg-gray-950/90 px-7 py-4 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">
              <Scale size={13} /> Evidence to decision
            </div>
            <h1 className="mt-1 text-lg font-semibold text-white">Decision tools</h1>
            <p className="mt-1 text-xs text-gray-500">
              Refresh evidence, monitor missed opportunities, compare candidates, and review what is due.
            </p>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); void loadTicker(ticker); }} className="flex items-center gap-2">
            <input value={ticker} onChange={(event) => setTicker(event.target.value.toUpperCase())} aria-label="Company ticker" className="w-28 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400/60" placeholder="Ticker" />
            <button className={buttonClass} disabled={busy === "load"}>
              {busy === "load" ? <LoaderCircle size={13} className="animate-spin" /> : <RefreshCw size={13} />} Load
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-5 p-6">
        {error ? <div className="flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-400/[0.06] p-3 text-xs text-red-200"><AlertTriangle size={14} className="mt-0.5 shrink-0" /> {error}</div> : null}
        {message ? <div className="flex items-start gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3 text-xs text-emerald-200"><CheckCircle2 size={14} className="mt-0.5 shrink-0" /> {message}</div> : null}

        <div className="grid gap-5 xl:grid-cols-2">
          <Card eyebrow="1 · Current evidence" title={`${ticker || "Company"} source freshness`}>
            {status ? (
              <>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[["Documents", status.source_document_count], ["Financial facts", status.financial_fact_count], ["Price points", status.market_price_count]].map(([label, value]) => (
                    <div key={String(label)} className="rounded-xl border border-gray-800 bg-gray-950/60 p-3"><div className="text-lg font-semibold text-white">{value}</div><div className="mt-1 text-[9px] uppercase tracking-wide text-gray-600">{label}</div></div>
                  ))}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {status.sources.map((source) => (
                    <div key={source.source_type} className="flex items-center justify-between rounded-lg border border-gray-800 px-3 py-2 text-xs">
                      <span className="text-gray-400">{friendly(source.source_type)}</span>
                      <span className={source.status === "current" ? "text-emerald-300" : source.status === "stale" ? "text-amber-300" : "text-gray-600"}>{source.status} · {source.document_count}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : <p className="text-xs leading-5 text-gray-500">Load a company to see source-by-source freshness.</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => void refreshSec()} disabled={busy === "sec"} className={buttonClass}>{busy === "sec" ? <LoaderCircle size={13} className="animate-spin" /> : <Database size={13} />} Refresh SEC evidence</button>
              <button type="button" onClick={() => setShowImport((value) => !value)} className={buttonClass}><FilePlus2 size={13} /> {showImport ? "Hide source import" : "Import transcript or news"}</button>
            </div>
            {showImport ? (
              <form onSubmit={importDocument} className="mt-4 grid gap-2 rounded-xl border border-gray-800 bg-gray-950/50 p-4 sm:grid-cols-2">
                <select value={documentType} onChange={(event) => setDocumentType(event.target.value)} className={inputClass}><option value="earnings_transcript">Earnings transcript</option><option value="news">News</option></select>
                <input value={documentProvider} onChange={(event) => setDocumentProvider(event.target.value)} className={inputClass} placeholder="Provider label" required />
                <input value={documentId} onChange={(event) => setDocumentId(event.target.value)} className={inputClass} placeholder="Unique document ID" required />
                <input type="date" value={documentDate} onChange={(event) => setDocumentDate(event.target.value)} className={inputClass} required />
                <input value={documentTitle} onChange={(event) => setDocumentTitle(event.target.value)} className={`${inputClass} sm:col-span-2`} placeholder="Document title" required />
                <input value={documentPublisher} onChange={(event) => setDocumentPublisher(event.target.value)} className={inputClass} placeholder="Publisher" required />
                <input type="url" value={documentUrl} onChange={(event) => setDocumentUrl(event.target.value)} className={inputClass} placeholder="Public source URL" required />
                <textarea value={documentContent} onChange={(event) => setDocumentContent(event.target.value)} className={`${inputClass} min-h-32 sm:col-span-2`} placeholder="Paste licensed or user-authorized source text" required />
                <button disabled={busy === "document"} className={`${buttonClass} sm:col-span-2`}>{busy === "document" ? <LoaderCircle size={13} className="animate-spin" /> : <ShieldCheck size={13} />} Validate and save locally</button>
              </form>
            ) : null}
          </Card>

          <Card eyebrow="2 · Review cadence" title="What needs attention">
            <div className="flex gap-2 text-[10px] uppercase tracking-wide">
              <span className="rounded-full bg-red-400/10 px-2 py-1 text-red-200">{reminders?.overdue_count || 0} overdue</span>
              <span className="rounded-full bg-amber-400/10 px-2 py-1 text-amber-200">{reminders?.due_count || 0} due</span>
              <span className="rounded-full bg-violet-400/10 px-2 py-1 text-violet-200">{reminders?.triggered_count || 0} triggered</span>
            </div>
            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
              {reminders?.items.length ? reminders.items.map((item) => (
                <article key={`${item.kind}-${item.reference_id}`} className="rounded-xl border border-gray-800 bg-gray-950/55 p-3">
                  <div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold text-gray-200">{item.ticker} · {item.title}</span><span className="text-[9px] font-semibold uppercase text-amber-300">{item.status}</span></div>
                  <p className="mt-1 text-[10px] leading-4 text-gray-500">{item.reason} Review: {item.review_date}</p>
                </article>
              )) : <div className="flex items-center gap-2 py-8 text-xs text-gray-600"><BellRing size={14} /> Nothing is due in the next 45 days.</div>}
            </div>
          </Card>
        </div>

        <Card eyebrow="3 · Missed opportunity" title="Exceptional business — price concern">
          {selectedWatch ? (
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-gray-800 bg-gray-950/55 p-4">
                <div className="flex items-center justify-between"><span className="text-sm font-semibold text-white">{selectedWatch.ticker}</span><span className="text-[10px] uppercase text-amber-300">{friendly(selectedWatch.status)}</span></div>
                <p className="mt-3 text-xs leading-5 text-gray-300">{selectedWatch.quality_thesis}</p>
                <p className="mt-2 text-xs leading-5 text-gray-500">Concern: {selectedWatch.valuation_concern}</p>
                <p className="mt-3 text-[10px] text-gray-600">Next review: {selectedWatch.review_date} · {selectedWatch.events.length} events</p>
              </div>
              <form onSubmit={addEvent} className="space-y-2 rounded-xl border border-gray-800 bg-gray-950/55 p-4">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Append evidence</div>
                <input value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} className={inputClass} placeholder="What changed?" required />
                <textarea value={eventSummary} onChange={(event) => setEventSummary(event.target.value)} className={`${inputClass} min-h-20`} placeholder="Evidence and interpretation" required />
                <input type="url" value={eventUrl} onChange={(event) => setEventUrl(event.target.value)} className={inputClass} placeholder="Source URL for facts (optional)" />
                <label className="flex items-center gap-2 text-[10px] text-gray-500"><input type="checkbox" checked={eventMaterial} onChange={(event) => setEventMaterial(event.target.checked)} /> Material enough to trigger review</label>
                <button disabled={busy === "event"} className={buttonClass}><Target size={13} /> Save evidence</button>
              </form>
              <form onSubmit={reviewWatch} className="space-y-2 rounded-xl border border-gray-800 bg-gray-950/55 p-4">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Record review</div>
                <select value={reviewOutcome} onChange={(event) => setReviewOutcome(event.target.value)} className={inputClass}><option value="continue_watching">Continue watching</option><option value="ready_for_research">Ready for research</option><option value="thesis_invalidated">Thesis invalidated</option><option value="closed">Close watch</option></select>
                {reviewOutcome === "continue_watching" ? <input type="date" value={nextReviewDate} onChange={(event) => setNextReviewDate(event.target.value)} className={inputClass} /> : null}
                <textarea value={reviewRationale} onChange={(event) => setReviewRationale(event.target.value)} className={`${inputClass} min-h-20`} placeholder="Why this outcome?" required />
                <button disabled={busy === "review"} className={buttonClass}><CheckCircle2 size={13} /> Record review</button>
              </form>
            </div>
          ) : (
            <form onSubmit={createWatch} className="grid gap-3 lg:grid-cols-2">
              <textarea value={watchThesis} onChange={(event) => setWatchThesis(event.target.value)} className={`${inputClass} min-h-24`} placeholder="Why is this an exceptional business?" required />
              <textarea value={watchConcern} onChange={(event) => setWatchConcern(event.target.value)} className={`${inputClass} min-h-24`} placeholder="Why does valuation prevent action today?" required />
              <textarea value={watchTriggers} onChange={(event) => setWatchTriggers(event.target.value)} className={`${inputClass} min-h-24`} placeholder="One evidence or price trigger per line" required />
              <div className="space-y-2"><label className="text-[10px] uppercase tracking-wide text-gray-600">Next review date</label><input type="date" value={watchReviewDate} onChange={(event) => setWatchReviewDate(event.target.value)} className={inputClass} required /><button disabled={busy === "watch"} className={`${buttonClass} w-full`}><Target size={13} /> Create watch</button></div>
            </form>
          )}
        </Card>

        <Card eyebrow="4 · Opportunity cost" title="Compare companies with portfolio context">
          <form onSubmit={compare} className="flex flex-wrap gap-2">
            <input value={comparisonTickers} onChange={(event) => setComparisonTickers(event.target.value)} className={`${inputClass} min-w-64 flex-1`} placeholder="Two to eight tickers, separated by commas" />
            <button disabled={busy === "compare"} className={buttonClass}>{busy === "compare" ? <LoaderCircle size={13} className="animate-spin" /> : <Scale size={13} />} Compare saved evidence</button>
          </form>
          {comparison ? (
            <div className="mt-4 space-y-3">
              <div className="text-[10px] text-gray-500">Review order: <span className="font-semibold text-blue-200">{comparison.allocation_review_order.join(" → ")}</span>{comparison.portfolio ? ` · Portfolio as of ${comparison.portfolio.as_of}` : " · No private portfolio snapshot selected"}</div>
              <div className="grid gap-3 lg:grid-cols-2">
                {comparison.candidates.map((candidate) => (
                  <article key={candidate.ticker} className="rounded-xl border border-gray-800 bg-gray-950/55 p-4">
                    <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-white">{candidate.ticker} · {candidate.company_name}</h3><span className="text-[10px] text-gray-500">Current weight {percent(candidate.current_portfolio_weight)}</span></div>
                    <p className="mt-3 text-xs leading-5 text-gray-300">{candidate.cio?.executive_summary || candidate.research?.executive_summary || "No completed saved dossier yet."}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-gray-500"><span>CIO: {candidate.cio ? friendly(candidate.cio.ownership_action) : "missing"}</span><span>Expected multiple: {candidate.cio?.expected_value_multiple?.toFixed(2) || "—"}</span><span>Max overlap: {percent(candidate.maximum_overlap_weight)}</span><span>Watch: {candidate.open_watch_status ? friendly(candidate.open_watch_status) : "none"}</span></div>
                    <p className="mt-3 border-t border-gray-800 pt-3 text-[10px] leading-4 text-blue-200">Next: {candidate.next_step}</p>
                    {candidate.gaps.length ? <p className="mt-2 text-[10px] leading-4 text-amber-200">Gaps: {candidate.gaps.join(" · ")}</p> : null}
                  </article>
                ))}
              </div>
              <details className="rounded-lg border border-gray-800 p-3 text-[10px] text-gray-500"><summary className="cursor-pointer font-semibold text-gray-300">How the order was calculated</summary><ul className="mt-2 space-y-1">{comparison.method.map((item) => <li key={item}>• {item}</li>)}</ul></details>
            </div>
          ) : null}
        </Card>
      </div>
    </main>
  );
}
