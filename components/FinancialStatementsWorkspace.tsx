"use client";

import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Database,
  ExternalLink,
  FileSpreadsheet,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  dashboardMetric,
  formatFinancialValue,
  metricCagr,
  metricValue,
} from "@/lib/financial-statements";
import type {
  AnnualFinancialStatement,
  FinancialStatementDashboard,
} from "@/lib/investment-os-types";

type StatementKey = AnnualFinancialStatement["key"];
type Scale = "millions" | "billions";

const TREND_METRICS = [
  { key: "revenue", label: "Revenue", color: "#60a5fa" },
  { key: "net_income", label: "Net income", color: "#a78bfa" },
  { key: "free_cash_flow", label: "Free cash flow", color: "#34d399" },
];

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || "Request failed.");
  return body;
}

function TrendChart({ dashboard }: { dashboard: FinancialStatementDashboard }) {
  const periods = [...dashboard.periods].reverse();
  const series = TREND_METRICS.map((definition) => ({
    ...definition,
    metric: dashboardMetric(dashboard, definition.key),
  }));
  const values = series.flatMap(({ metric }) => metric?.values.map((item) => item.value) ?? []);
  if (periods.length < 2 || values.length === 0) {
    return (
      <div className="grid h-56 place-items-center text-xs text-gray-600">
        At least two annual periods are needed for a trend chart.
      </div>
    );
  }

  const width = 920;
  const height = 250;
  const left = 64;
  const right = 24;
  const top = 24;
  const bottom = 42;
  const minimum = Math.min(0, ...values);
  const maximum = Math.max(0, ...values);
  const range = maximum - minimum || 1;
  const x = (index: number) =>
    left + (index * (width - left - right)) / Math.max(periods.length - 1, 1);
  const y = (value: number) => top + ((maximum - value) * (height - top - bottom)) / range;
  const zeroY = y(0);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 px-1 pb-3 text-[10px] text-gray-400">
        {series.map((item) => (
          <span key={item.key} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-64 w-full overflow-visible"
        role="img"
        aria-label="Revenue, net income, and free cash flow annual trend"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
          const gridY = top + fraction * (height - top - bottom);
          return (
            <line
              key={fraction}
              x1={left}
              x2={width - right}
              y1={gridY}
              y2={gridY}
              stroke="#1f2937"
              strokeWidth="1"
            />
          );
        })}
        {minimum < 0 ? (
          <line
            x1={left}
            x2={width - right}
            y1={zeroY}
            y2={zeroY}
            stroke="#6b7280"
            strokeDasharray="4 4"
          />
        ) : null}
        <text x="4" y={top + 4} fill="#6b7280" fontSize="10">
          {formatFinancialValue(maximum, "currency", "billions")}B
        </text>
        <text x="4" y={height - bottom + 4} fill="#6b7280" fontSize="10">
          {formatFinancialValue(minimum, "currency", "billions")}B
        </text>
        {series.map(({ key, metric, color }) => {
          const points = periods.flatMap((period, index) => {
            const value = metricValue(metric, period.period_end);
            return value ? [{ x: x(index), y: y(value.value), value }] : [];
          });
          const path = points
            .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
            .join(" ");
          return (
            <g key={key}>
              {points.length > 1 ? (
                <path d={path} fill="none" stroke={color} strokeWidth="2.5" />
              ) : null}
              {points.map((point) => (
                <circle
                  key={`${point.x}-${point.y}`}
                  cx={point.x}
                  cy={point.y}
                  r="3.5"
                  fill={color}
                >
                  <title>
                    {formatFinancialValue(point.value.value, "currency", "billions")} billion
                  </title>
                </circle>
              ))}
            </g>
          );
        })}
        {periods.map((period, index) => (
          <text
            key={period.period_end}
            x={x(index)}
            y={height - 14}
            textAnchor="middle"
            fill="#6b7280"
            fontSize="10"
          >
            {period.fiscal_year}
          </text>
        ))}
      </svg>
    </div>
  );
}

function SummaryCard({
  dashboard,
  metricKey,
  label,
}: {
  dashboard: FinancialStatementDashboard;
  metricKey: string;
  label: string;
}) {
  const metric = dashboardMetric(dashboard, metricKey);
  const latestPeriod = dashboard.periods[0];
  const latest = latestPeriod ? metricValue(metric, latestPeriod.period_end) : null;
  const fiscalYears = new Map(
    dashboard.periods.map((period) => [period.period_end, period.fiscal_year]),
  );
  const cagr = metricCagr(metric, fiscalYears);
  return (
    <article className="rounded-xl border border-gray-800 bg-gray-900/65 p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">
        {label}
      </div>
      <div className="mt-2 text-xl font-semibold tabular-nums text-white">
        {latest ? `$${formatFinancialValue(latest.value, "currency", "billions")}B` : "—"}
      </div>
      <div className="mt-1 text-[10px] text-gray-500">
        {cagr == null
          ? latestPeriod?.label || "No annual data"
          : `${(cagr * 100).toFixed(1)}% CAGR across available history`}
      </div>
    </article>
  );
}

function StatementTable({
  dashboard,
  statement,
  scale,
}: {
  dashboard: FinancialStatementDashboard;
  statement: AnnualFinancialStatement;
  scale: Scale;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800">
      <table className="w-full min-w-[1050px] border-collapse text-xs">
        <thead className="sticky top-0 z-10 bg-gray-900">
          <tr>
            <th className="sticky left-0 z-20 min-w-60 border-b border-r border-gray-800 bg-gray-900 px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              {statement.title}
            </th>
            {dashboard.periods.map((period) => (
              <th
                key={period.period_end}
                className="min-w-24 border-b border-gray-800 px-3 py-3 text-right"
              >
                <span className="block font-semibold text-gray-200">{period.label}</span>
                <span className="mt-0.5 block text-[9px] font-normal text-gray-600">
                  {period.period_end}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {statement.metrics.map((metric) => (
            <tr
              key={metric.key}
              className={metric.emphasis ? "bg-blue-400/[0.035]" : "hover:bg-gray-900/55"}
            >
              <th
                className={
                  "sticky left-0 z-[5] border-r border-t border-gray-800 px-4 py-3 text-left " +
                  (metric.emphasis
                    ? "bg-[#09111f] font-semibold text-gray-100"
                    : "bg-gray-950 font-medium text-gray-400")
                }
              >
                <span>{metric.label}</span>
                {metric.key === "free_cash_flow" ? (
                  <span className="ml-2 rounded bg-emerald-400/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase text-emerald-300">
                    calculated
                  </span>
                ) : null}
              </th>
              {dashboard.periods.map((period) => {
                const value = metricValue(metric, period.period_end);
                return (
                  <td
                    key={period.period_end}
                    className="border-t border-gray-800 px-3 py-3 text-right tabular-nums text-gray-300"
                  >
                    {value ? (
                      <a
                        href={value.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="group inline-flex items-center gap-1 hover:text-blue-300"
                        title={
                          `${value.filed_at ? `Filed ${value.filed_at}. ` : ""}` +
                          (value.calculation || "Reported SEC XBRL fact")
                        }
                      >
                        {formatFinancialValue(value.value, metric.value_kind, scale)}
                        <ExternalLink
                          size={9}
                          className="opacity-0 transition-opacity group-hover:opacity-100"
                        />
                      </a>
                    ) : (
                      <span className="text-gray-700">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function FinancialStatementsWorkspace() {
  const [ticker, setTicker] = useState("NVDA");
  const [years, setYears] = useState(10);
  const [scale, setScale] = useState<Scale>("billions");
  const [activeStatement, setActiveStatement] = useState<StatementKey>("income");
  const [dashboard, setDashboard] = useState<FinancialStatementDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadDashboard(requestedTicker: string, requestedYears: number) {
    const normalized = requestedTicker.trim().toUpperCase();
    if (!normalized) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const result = await jsonRequest<FinancialStatementDashboard>(
        `/api/investment-os/financial-statements?ticker=${encodeURIComponent(normalized)}` +
          `&years=${requestedYears}`,
      );
      setDashboard(result);
      setTicker(result.ticker);
    } catch (reason) {
      setDashboard(null);
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not load the financial statements.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    void jsonRequest<FinancialStatementDashboard>(
      "/api/investment-os/financial-statements?ticker=NVDA&years=10",
    )
      .then((result) => {
        if (!active) return;
        setDashboard(result);
        setTicker(result.ticker);
      })
      .catch((reason) => {
        if (!active) return;
        setDashboard(null);
        setError(
          reason instanceof Error
            ? reason.message
            : "Could not load the financial statements.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedStatement = useMemo(
    () => dashboard?.statements.find((item) => item.key === activeStatement) ?? null,
    [activeStatement, dashboard],
  );

  function submitTicker(event: FormEvent) {
    event.preventDefault();
    void loadDashboard(ticker, years);
  }

  async function refreshSec() {
    const normalized = ticker.trim().toUpperCase();
    if (!normalized || refreshing) return;
    setRefreshing(true);
    setError("");
    setMessage("");
    try {
      const result = await jsonRequest<FinancialStatementDashboard>(
        "/api/investment-os/financial-statements",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticker: normalized, years }),
        },
      );
      setDashboard(result);
      setTicker(result.ticker);
      setMessage("SEC filings and annual financial statements were refreshed.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "SEC refresh failed.");
    } finally {
      setRefreshing(false);
    }
  }

  function chooseYears(value: number) {
    setYears(value);
    void loadDashboard(ticker, value);
  }

  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-gray-950">
      <header className="border-b border-gray-800 bg-gradient-to-r from-blue-500/[0.07] via-gray-950 to-emerald-500/[0.04] px-6 py-5">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-start justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-300">
              <FileSpreadsheet size={13} /> Ten-year company financials
            </div>
            <h1 className="mt-1.5 text-xl font-semibold text-white">
              Income statement, balance sheet, cash flow, and free cash flow
            </h1>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-gray-500">
              Deterministic annual figures normalized from official SEC filings. Every displayed value
              links back to its filing; no model or LLM API is used.
            </p>
          </div>
          <form onSubmit={submitTicker} className="flex items-center gap-2">
            <input
              value={ticker}
              onChange={(event) =>
                setTicker(
                  event.target.value.toUpperCase().replace(/[^A-Z.-]/g, "").slice(0, 16),
                )
              }
              aria-label="Company ticker"
              className="w-28 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm font-bold uppercase text-blue-200 outline-none focus:border-blue-400"
            />
            <button
              disabled={loading || !ticker.trim()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-40"
            >
              {loading ? <LoaderCircle size={13} className="animate-spin" /> : <BarChart3 size={13} />}
              Load
            </button>
            <button
              type="button"
              onClick={() => void refreshSec()}
              disabled={refreshing || !ticker.trim()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-3 text-xs font-semibold text-emerald-200 hover:bg-emerald-400/15 disabled:opacity-40"
            >
              {refreshing ? (
                <LoaderCircle size={13} className="animate-spin" />
              ) : (
                <RefreshCw size={13} />
              )}
              Refresh SEC data
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] space-y-5 p-6">
        {error ? (
          <div className="flex items-start justify-between gap-4 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-4 text-xs text-rose-200">
            <span className="flex items-start gap-2">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              {error} Use “Refresh SEC data” to import public filings for a new ticker.
            </span>
          </div>
        ) : null}
        {message ? (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3 text-xs text-emerald-200">
            <CheckCircle2 size={14} /> {message}
          </div>
        ) : null}

        {dashboard ? (
          <>
            <section className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-white">
                    {dashboard.ticker} · {dashboard.company_name}
                  </h2>
                  <a
                    href={dashboard.provider_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-gray-700 px-2 py-1 text-[9px] font-semibold uppercase text-gray-400 hover:text-blue-300"
                  >
                    SEC EDGAR <ExternalLink size={9} />
                  </a>
                </div>
                <p className="mt-1 text-[10px] text-gray-600">
                  Last refreshed {dashboard.last_refreshed_at?.slice(0, 10) || "not available"}
                  {" · "}{dashboard.periods.length} annual periods
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-lg border border-gray-800 bg-gray-900 p-0.5">
                  {[5, 10, 15, 20].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => chooseYears(value)}
                      className={
                        "rounded-md px-2.5 py-1.5 text-[10px] font-semibold " +
                        (years === value
                          ? "bg-blue-600 text-white"
                          : "text-gray-500 hover:text-gray-200")
                      }
                    >
                      {value}Y
                    </button>
                  ))}
                </div>
                <div className="flex rounded-lg border border-gray-800 bg-gray-900 p-0.5">
                  {(["billions", "millions"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setScale(value)}
                      className={
                        "rounded-md px-2.5 py-1.5 text-[10px] font-semibold capitalize " +
                        (scale === value
                          ? "bg-gray-700 text-white"
                          : "text-gray-500 hover:text-gray-200")
                      }
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard dashboard={dashboard} metricKey="revenue" label="Latest revenue" />
              <SummaryCard dashboard={dashboard} metricKey="net_income" label="Latest net income" />
              <SummaryCard dashboard={dashboard} metricKey="free_cash_flow" label="Latest free cash flow" />
              <SummaryCard dashboard={dashboard} metricKey="total_assets" label="Latest total assets" />
            </section>

            <section className="rounded-xl border border-gray-800 bg-gray-900/35 p-4">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                <BarChart3 size={12} /> Annual scale and profitability trend · USD billions
              </div>
              <TrendChart dashboard={dashboard} />
            </section>

            {dashboard.warnings.length ? (
              <section className="grid gap-2 md:grid-cols-2">
                {dashboard.warnings.map((warning) => (
                  <div
                    key={warning}
                    className="flex items-start gap-2 rounded-lg border border-amber-400/15 bg-amber-400/[0.04] px-3 py-2 text-[10px] leading-4 text-amber-200/80"
                  >
                    <AlertTriangle size={11} className="mt-0.5 shrink-0" /> {warning}
                  </div>
                ))}
              </section>
            ) : null}

            <section>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex rounded-lg border border-gray-800 bg-gray-900 p-1">
                  {dashboard.statements.map((statement) => (
                    <button
                      key={statement.key}
                      type="button"
                      onClick={() => setActiveStatement(statement.key)}
                      className={
                        "rounded-md px-4 py-2 text-xs font-semibold " +
                        (activeStatement === statement.key
                          ? "bg-blue-600 text-white"
                          : "text-gray-400 hover:bg-gray-800 hover:text-white")
                      }
                    >
                      {statement.title}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-600">
                  USD in {scale}; per-share values and share counts are labelled by row
                </p>
              </div>
              {selectedStatement ? (
                <StatementTable
                  dashboard={dashboard}
                  statement={selectedStatement}
                  scale={scale}
                />
              ) : null}
            </section>

            <section className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-gray-800 bg-gray-900/35 p-4">
              <div className="flex max-w-3xl items-start gap-3">
                <Database size={16} className="mt-0.5 shrink-0 text-blue-300" />
                <div>
                  <h3 className="text-xs font-semibold text-gray-200">Data and calculation policy</h3>
                  <p className="mt-1 text-[10px] leading-5 text-gray-500">
                    Reported values come from SEC Company Facts and annual 10-K/20-F filings. The backend
                    selects the latest filed annual observation for each period and preserves restatements.
                    Free cash flow is the transparent calculation “cash from operations − capital
                    expenditures.” Missing facts remain blank rather than being estimated.
                  </p>
                </div>
              </div>
              <span className="rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wide text-blue-200">
                Model-free · source-linked
              </span>
            </section>
          </>
        ) : loading ? (
          <div className="grid min-h-96 place-items-center text-sm text-gray-500">
            <span className="flex items-center gap-2">
              <LoaderCircle size={16} className="animate-spin text-blue-300" />
              Loading annual financial statements…
            </span>
          </div>
        ) : null}
      </div>
    </main>
  );
}
