"use client";

import {
  BookOpenText,
  CalendarClock,
  ChevronRight,
  FileSearch,
  LibraryBig,
  LoaderCircle,
  Search,
  ShieldCheck,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import type {
  IndustryDocument,
  IndustryDocumentSummary,
  IndustrySearchResponse,
} from "@/lib/investment-os-types";

async function jsonRequest<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { cache: "no-store", signal });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "The local research library could not be loaded.");
  }
  return (await response.json()) as T;
}

function updatedLabel(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function internalDocumentId(href: string | undefined): string | null {
  if (!href) return null;
  const review = href.match(/reviews\/(\d{4}-\d{2}-\d{2})\.md$/);
  if (review) return `review-${review[1]}`;
  if (href.includes("portfolio-policy/current.md")) return "portfolio-policy";
  if (href.includes("ai-infrastructure/current.md")) return "ai-infrastructure";
  if (href.includes("quantum-computing/current.md")) return "quantum-computing";
  if (href.includes("biotech-ai-medicine/current.md")) return "biotech-ai-medicine";
  if (href === "README.md") return "industry-overview";
  return null;
}

export default function IndustryResearchWorkspace() {
  const [documents, setDocuments] = useState<IndustryDocumentSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [document, setDocument] = useState<IndustryDocument | null>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<IndustrySearchResponse | null>(null);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const documentLoading = Boolean(selectedId && document?.id !== selectedId);

  useEffect(() => {
    const controller = new AbortController();
    jsonRequest<IndustryDocumentSummary[]>(
      "/api/investment-os/industry-documents",
      controller.signal,
    )
      .then((items) => {
        setDocuments(items);
        setSelectedId((current) => current || items[0]?.id || "");
        setError("");
      })
      .catch((reason) => {
        if (reason instanceof Error && reason.name !== "AbortError") setError(reason.message);
      })
      .finally(() => setLibraryLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    jsonRequest<IndustryDocument>(
      "/api/investment-os/industry-documents/" + encodeURIComponent(selectedId),
      controller.signal,
    )
      .then((item) => {
        setDocument(item);
        setError("");
      })
      .catch((reason) => {
        if (reason instanceof Error && reason.name !== "AbortError") setError(reason.message);
      });
    return () => controller.abort();
  }, [selectedId]);

  const openDocument = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const markdownComponents = useMemo<Components>(
    () => ({
      h1: () => null,
      h2: ({ children }) => (
        <h2 className="mt-9 border-t border-gray-800 pt-7 text-lg font-semibold text-white">
          {children}
        </h2>
      ),
      h3: ({ children }) => <h3 className="mt-6 text-sm font-semibold text-gray-100">{children}</h3>,
      p: ({ children }) => <p className="mt-3 text-sm leading-7 text-gray-300">{children}</p>,
      ul: ({ children }) => <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-gray-300">{children}</ul>,
      ol: ({ children }) => <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-gray-300">{children}</ol>,
      blockquote: ({ children }) => (
        <blockquote className="mt-4 border-l-2 border-blue-400/60 bg-blue-400/[0.05] px-4 py-1 text-blue-100">
          {children}
        </blockquote>
      ),
      table: ({ children }) => (
        <div className="mt-4 overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full border-collapse text-left text-xs">{children}</table>
        </div>
      ),
      th: ({ children }) => <th className="border-b border-gray-700 bg-gray-900 px-3 py-2 font-semibold text-gray-200">{children}</th>,
      td: ({ children }) => <td className="border-b border-gray-800 px-3 py-2.5 align-top leading-5 text-gray-400">{children}</td>,
      code: ({ children }) => <code className="rounded bg-gray-800 px-1.5 py-0.5 text-xs text-blue-200">{children}</code>,
      a: ({ href, children }) => {
        const internalId = internalDocumentId(href);
        if (internalId) {
          return (
            <button
              type="button"
              onClick={() => openDocument(internalId)}
              className="font-medium text-blue-300 underline decoration-blue-400/30 underline-offset-2 hover:text-blue-200"
            >
              {children}
            </button>
          );
        }
        if (href?.startsWith("http")) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-blue-300 underline decoration-blue-400/30 underline-offset-2 hover:text-blue-200"
            >
              {children}
            </a>
          );
        }
        if (href?.startsWith("/research?") || href?.startsWith("/prices?") || href?.startsWith("/financials?")) {
          return (
            <a
              href={href}
              className="text-blue-300 underline decoration-blue-400/30 underline-offset-2 hover:text-blue-200"
            >
              {children}
            </a>
          );
        }
        return <span className="text-gray-400">{children}</span>;
      },
    }),
    [openDocument],
  );

  async function submitSearch(event: FormEvent) {
    event.preventDefault();
    const normalized = query.trim();
    if (normalized.length < 2) return;
    setSearching(true);
    setError("");
    try {
      setSearch(
        await jsonRequest<IndustrySearchResponse>(
          "/api/investment-os/industry-documents/search?q=" + encodeURIComponent(normalized),
        ),
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <main className="flex min-w-0 flex-1 overflow-hidden bg-gray-950">
      <aside className="w-[280px] shrink-0 overflow-y-auto border-r border-gray-800 bg-gray-950/80 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-blue-300">
          <LibraryBig size={15} /> Research library
        </div>
        <p className="mt-2 text-[11px] leading-5 text-gray-600">
          Living local notes distilled from your portfolio and industry conversations.
        </p>

        <div className="mt-5 space-y-2">
          {libraryLoading ? (
            <div className="flex items-center gap-2 px-2 py-3 text-xs text-gray-500">
              <LoaderCircle size={13} className="animate-spin" /> Loading documents…
            </div>
          ) : documents.length === 0 ? (
            <p className="rounded-lg border border-amber-400/15 bg-amber-400/[0.04] p-3 text-xs leading-5 text-amber-200">
              No local industry notes were found.
            </p>
          ) : (
            documents.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openDocument(item.id)}
                className={
                  "w-full rounded-xl border p-3 text-left transition-colors " +
                  (selectedId === item.id
                    ? "border-blue-400/30 bg-blue-400/[0.08]"
                    : "border-gray-800 bg-gray-900/45 hover:border-gray-700 hover:bg-gray-900")
                }
              >
                <span className="flex items-start justify-between gap-2">
                  <span>
                    <span className="block text-xs font-semibold text-gray-200">{item.title}</span>
                    <span className="mt-1 block text-[9px] font-semibold uppercase tracking-wide text-gray-600">
                      {item.category}
                    </span>
                  </span>
                  <ChevronRight size={13} className="mt-0.5 shrink-0 text-gray-600" />
                </span>
                <span className="mt-2 line-clamp-2 block text-[10px] leading-4 text-gray-500">
                  {item.description}
                </span>
              </button>
            ))
          )}
        </div>

        <div className="mt-5 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.04] p-3">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
            <ShieldCheck size={13} /> Private and local
          </div>
          <p className="mt-2 text-[10px] leading-4 text-gray-600">
            These source files remain outside Git. Reading and searching them does not call Codex or use an API key.
          </p>
        </div>
      </aside>

      <section className="min-w-0 flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 border-b border-gray-800 bg-gray-950/90 px-7 py-4 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">
                <BookOpenText size={13} /> Industry thesis and portfolio context
              </div>
              <h1 className="mt-1 text-lg font-semibold text-white">
                {document?.title || "Industry research"}
              </h1>
            </div>
            {document ? (
              <div className="flex shrink-0 items-center gap-1.5 text-[10px] text-gray-600">
                <CalendarClock size={12} /> Updated {updatedLabel(document.updated_at)}
              </div>
            ) : null}
          </div>
        </header>

        <div className="mx-auto max-w-4xl px-7 py-8">
          {documentLoading ? (
            <div className="flex items-center gap-2 py-12 text-sm text-gray-500">
              <LoaderCircle size={15} className="animate-spin" /> Opening local note…
            </div>
          ) : document ? (
            <article>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {document.content}
              </ReactMarkdown>
            </article>
          ) : (
            <div className="grid min-h-96 place-items-center text-center">
              <div>
                <BookOpenText size={30} className="mx-auto text-gray-700" />
                <p className="mt-3 text-sm text-gray-500">Choose a document from the library.</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <aside className="w-[340px] shrink-0 overflow-y-auto border-l border-gray-800 bg-gray-950/65 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-200">
          <FileSearch size={14} className="text-violet-300" /> Search your research
        </div>
        <p className="mt-1 text-[10px] leading-4 text-gray-600">
          Find a company, bottleneck, risk, falsifier, or portfolio principle across every local note.
        </p>
        <form onSubmit={submitSearch} className="mt-3 flex gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-gray-700 bg-gray-900 px-3 focus-within:border-violet-500">
            <Search size={13} className="shrink-0 text-gray-600" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="e.g. power cooling"
              className="min-w-0 flex-1 bg-transparent py-2.5 text-xs text-white outline-none placeholder:text-gray-700"
              aria-label="Search industry research"
            />
          </div>
          <button
            disabled={searching || query.trim().length < 2}
            className="grid w-10 place-items-center rounded-lg bg-violet-600 text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Search"
          >
            {searching ? <LoaderCircle size={14} className="animate-spin" /> : <Search size={14} />}
          </button>
        </form>

        {error ? (
          <p className="mt-3 rounded-lg border border-rose-400/20 bg-rose-400/[0.06] p-3 text-[11px] leading-5 text-rose-200">
            {error}
          </p>
        ) : null}

        {search ? (
          <div className="mt-4">
            <div className="flex items-center justify-between text-[10px] text-gray-600">
              <span>{search.hits.length} matching passages</span>
              <span>{search.documents_searched} documents</span>
            </div>
            {search.hits.length > 0 ? (
              <div className="mt-2 space-y-2">
                {search.hits.map((hit, index) => (
                  <button
                    key={`${hit.document_id}-${hit.line_number}-${index}`}
                    type="button"
                    onClick={() => openDocument(hit.document_id)}
                    className="w-full rounded-xl border border-gray-800 bg-gray-900/45 p-3 text-left hover:border-violet-400/25 hover:bg-violet-400/[0.04]"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-semibold text-violet-200">{hit.title}</span>
                      <span className="shrink-0 text-[9px] text-gray-700">line {hit.line_number}</span>
                    </span>
                    <span className="mt-2 line-clamp-5 block text-[10px] leading-4 text-gray-500">
                      {hit.snippet}
                    </span>
                    <span className="mt-2 flex flex-wrap gap-1">
                      {hit.matched_terms.map((term) => (
                        <span key={term} className="rounded bg-gray-800 px-1.5 py-0.5 text-[9px] text-gray-500">
                          {term}
                        </span>
                      ))}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-lg border border-gray-800 p-3 text-[11px] leading-5 text-gray-600">
                No matching passage. Try a company name, technology, risk, or shorter phrase.
              </p>
            )}
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-gray-800 bg-gray-900/35 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Useful searches</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {["power cooling", "custom silicon", "commercial revenue", "clinical delivery", "position sizing"].map(
                (example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setQuery(example)}
                    className="rounded-md border border-gray-800 px-2 py-1 text-[10px] text-gray-500 hover:border-gray-700 hover:text-gray-300"
                  >
                    {example}
                  </button>
                ),
              )}
            </div>
          </div>
        )}
      </aside>
    </main>
  );
}
