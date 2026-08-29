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
  RotateCcw,
  Search,
  Settings2,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  CORE_FINANCIAL_METRIC_KEYS,
  DEFAULT_TREND_METRIC_KEYS,
  dashboardMetric,
  formatFinancialValue,
  formatYearOverYear,
  metricCagr,
  metricValue,
  metricYearOverYear,
  toggleFinancialChartMetric,
  visibleFinancialMetrics,
  type FinancialDisplayMode,
  type FinancialMetricView,
  type YearOverYearResult,
} from "@/lib/financial-statements";
import {
  annualEstimateForMetric,
  type ForwardEstimatePeriod,
  type ForwardEstimatesResponse,
} from "@/lib/forward-estimates";
import { companyContextForTicker } from "@/lib/company-context";
import type {
  AnnualFinancialMetric,
  AnnualFinancialStatement,
  FinancialStatementDashboard,
} from "@/lib/investment-os-types";

type StatementKey = AnnualFinancialStatement["key"];
type Scale = "millions" | "billions";

const FINANCIAL_PREFERENCES_KEY = "investment-os:financials:preferences:v1";
const TREND_COLORS = [
  "#60a5fa",
  "#a78bfa",
  "#34d399",
  "#fbbf24",
  "#fb7185",
];

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || "Request failed.");
  return body;
}

async function optionalForwardEstimates(ticker: string): Promise<{
  data: ForwardEstimatesResponse | null;
  error: string;
}> {
  try {
    const data = await jsonRequest<ForwardEstimatesResponse>(
      `/api/investment-os/forward-estimates?ticker=${encodeURIComponent(ticker)}`,
    );
    return { data, error: "" };
  } catch (reason) {
    return {
      data: null,
      error: reason instanceof Error ? reason.message : "Consensus estimates are unavailable.",
    };
  }
}

function TrendChart({
  dashboard,
  metricKeys,
  estimates,
}: {
  dashboard: FinancialStatementDashboard;
  metricKeys: string[];
  estimates: ForwardEstimatesResponse | null;
}) {
  const periods = [...dashboard.periods].reverse();
  const series = metricKeys.flatMap((key, index) => {
    const metric = dashboardMetric(dashboard, key);
    return metric
      ? [
          {
            key,
            label: metric.label,
            color: TREND_COLORS[index % TREND_COLORS.length],
            metric,
            forecasts: annualEstimateForMetric(estimates, key),
          },
        ]
      : [];
  });
  const forecastPeriods = estimates?.periods.filter(
    (period) =>
      period.endDate &&
      ["current_year", "next_year"].includes(period.key) &&
      series.some((item) => item.forecasts.some((forecast) => forecast.period.key === period.key)),
  ) ?? [];
  const columns = [
    ...periods.map((period) => ({
      key: period.period_end,
      label: String(period.fiscal_year),
      estimate: false,
    })),
    ...forecastPeriods.map((period) => ({
      key: period.endDate ?? period.key,
      label: `FY ${period.endDate?.slice(0, 4) ?? "?"}E`,
      estimate: true,
    })),
  ];
  const values = series.flatMap(({ metric, forecasts }) => [
    ...metric.values.map((item) => item.value),
    ...forecasts.flatMap((forecast) => [forecast.average, forecast.low, forecast.high]),
  ]).filter((value): value is number => value != null && Number.isFinite(value));
  if (metricKeys.length === 0) {
    return (
      <div className="grid h-56 place-items-center text-xs text-gray-600">
        Click a financial-statement row to add it to this chart.
      </div>
    );
  }
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
  const valueKind = series[0]?.metric.value_kind ?? "currency";
  const minimum = Math.min(0, ...values);
  const maximum = Math.max(0, ...values);
  const range = maximum - minimum || 1;
  const x = (index: number) =>
    left + (index * (width - left - right)) / Math.max(columns.length - 1, 1);
  const y = (value: number) => top + ((maximum - value) * (height - top - bottom)) / range;
  const zeroY = y(0);
  const formatChartValue = (value: number) => {
    if (valueKind === "per_share") {
      return `$${formatFinancialValue(value, valueKind, "billions")}`;
    }
    const suffix = "B";
    return `${valueKind === "currency" ? "$" : ""}${formatFinancialValue(value, valueKind, "billions")}${suffix}`;
  };
  const firstForecastIndex = columns.findIndex((column) => column.estimate);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 px-1 pb-3 text-[10px] text-gray-400">
        {series.map((item) => (
          <span key={item.key} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
        {firstForecastIndex >= 0 ? (
          <span className="inline-flex items-center gap-1.5 text-blue-300/80">
            <span className="w-4 border-t border-dashed border-blue-300" /> Analyst consensus
          </span>
        ) : null}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-64 w-full overflow-visible"
        role="img"
        aria-label={`${series.map((item) => item.label).join(", ")} annual trend`}
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
          {formatChartValue(maximum)}
        </text>
        <text x="4" y={height - bottom + 4} fill="#6b7280" fontSize="10">
          {formatChartValue(minimum)}
        </text>
        {firstForecastIndex >= 0 ? (
          <g>
            <line
              x1={(x(firstForecastIndex - 1) + x(firstForecastIndex)) / 2}
              x2={(x(firstForecastIndex - 1) + x(firstForecastIndex)) / 2}
              y1={top}
              y2={height - bottom}
              stroke="#475569"
              strokeDasharray="3 5"
            />
            <text
              x={(x(firstForecastIndex - 1) + x(firstForecastIndex)) / 2 + 5}
              y={top + 10}
              fill="#64748b"
              fontSize="9"
            >
              CONSENSUS
            </text>
          </g>
        ) : null}
        {series.map(({ key, metric, color, forecasts }) => {
          const points = periods.flatMap((period, index) => {
            const value = metricValue(metric, period.period_end);
            return value ? [{ x: x(index), y: y(value.value), value }] : [];
          });
          const path = points
            .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
            .join(" ");
          const forecastPoints = forecasts.flatMap((forecast) => {
            const index = columns.findIndex((column) => column.key === forecast.period.endDate);
            return index < 0 ? [] : [{ ...forecast, x: x(index), y: y(forecast.average) }];
          });
          const forecastPathPoints = [
            ...(points.length ? [points[points.length - 1]] : []),
            ...forecastPoints,
          ];
          const forecastPath = forecastPathPoints
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
                  <title>{formatChartValue(point.value.value)}</title>
                </circle>
              ))}
              {forecastPathPoints.length > 1 ? (
                <path
                  d={forecastPath}
                  fill="none"
                  stroke={color}
                  strokeWidth="2.5"
                  strokeDasharray="7 5"
                />
              ) : null}
              {forecastPoints.map((point) => (
                <g key={point.period.key}>
                  {point.low != null && point.high != null ? (
                    <line
                      x1={point.x}
                      x2={point.x}
                      y1={y(point.high)}
                      y2={y(point.low)}
                      stroke={color}
                      strokeWidth="5"
                      strokeOpacity="0.2"
                    />
                  ) : null}
                  <circle cx={point.x} cy={point.y} r="4" fill="#030712" stroke={color} strokeWidth="2">
                    <title>
                      {point.period.label}: {formatChartValue(point.average)} consensus
                      {point.low != null && point.high != null
                        ? `; range ${formatChartValue(point.low)}–${formatChartValue(point.high)}`
                        : ""}
                    </title>
                  </circle>
                </g>
              ))}
            </g>
          );
        })}
        {columns.map((column, index) => (
          <text
            key={column.key}
            x={x(index)}
            y={height - 14}
            textAnchor="middle"
            fill={column.estimate ? "#93c5fd" : "#6b7280"}
            fontSize="10"
          >
            {column.label}
          </text>
        ))}
      </svg>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[9px] text-gray-600">
        <span>
          Solid lines are SEC annual actuals. Dashed lines and ranges are analyst averages and low/high estimates.
        </span>
        {series.some((item) => item.forecasts.length === 0) ? (
          <span>Free consensus chart extensions are currently available for Revenue and Diluted EPS.</span>
        ) : null}
      </div>
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

function forwardValue(value: number | null, kind: "revenue" | "eps"): string {
  if (value == null) return "—";
  return kind === "revenue"
    ? `$${formatFinancialValue(value, "currency", "billions")}B`
    : `$${value.toFixed(2)}`;
}

function forwardGrowth(value: number | null): string {
  if (value == null) return "growth unavailable";
  return `${forwardPercent(value)} YoY`;
}

function forwardPercent(value: number): string {
  return `${value > 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
}

function ConsensusCard({ period }: { period: ForwardEstimatePeriod }) {
  const revisionChange =
    period.epsCurrent != null && period.eps30DaysAgo != null
      ? period.epsCurrent / period.eps30DaysAgo - 1
      : null;
  return (
    <article className="rounded-xl border border-blue-400/15 bg-blue-400/[0.035] p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold text-blue-100">{period.label}</h3>
          <p className="mt-0.5 text-[9px] text-gray-600">Ending {period.endDate || "date unavailable"}</p>
        </div>
        <span className="rounded-full border border-blue-400/20 px-2 py-0.5 text-[8px] font-semibold uppercase text-blue-300">
          Estimate
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-wide text-gray-600">Revenue</div>
          <div className="mt-1 text-sm font-semibold tabular-nums text-white">
            {forwardValue(period.revenue.average, "revenue")}
          </div>
          <div className="mt-0.5 text-[9px] text-emerald-400/80">
            {forwardGrowth(period.revenue.growth)}
          </div>
          <div className="mt-1 text-[9px] text-gray-600">
            Range {forwardValue(period.revenue.low, "revenue")}–{forwardValue(period.revenue.high, "revenue")}
            {period.revenue.analystCount == null ? "" : ` · ${period.revenue.analystCount} analysts`}
          </div>
        </div>
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-wide text-gray-600">Diluted EPS</div>
          <div className="mt-1 text-sm font-semibold tabular-nums text-white">
            {forwardValue(period.eps.average, "eps")}
          </div>
          <div className="mt-0.5 text-[9px] text-emerald-400/80">{forwardGrowth(period.eps.growth)}</div>
          <div className="mt-1 text-[9px] text-gray-600">
            Range {forwardValue(period.eps.low, "eps")}–{forwardValue(period.eps.high, "eps")}
            {period.eps.analystCount == null ? "" : ` · ${period.eps.analystCount} analysts`}
          </div>
        </div>
      </div>
      {revisionChange != null || period.upwardRevisions30Days != null ? (
        <div className="mt-3 border-t border-gray-800 pt-2 text-[9px] text-gray-500">
          EPS consensus 30-day change {revisionChange == null ? "—" : forwardPercent(revisionChange)}
          {period.upwardRevisions30Days == null
            ? ""
            : ` · ${period.upwardRevisions30Days} up / ${period.downwardRevisions30Days ?? 0} down revisions`}
        </div>
      ) : null}
    </article>
  );
}

function ForwardConsensusPanel({
  estimates,
  error,
}: {
  estimates: ForwardEstimatesResponse | null;
  error: string;
}) {
  if (!estimates) {
    return (
      <section className="rounded-xl border border-amber-400/15 bg-amber-400/[0.035] p-4 text-xs text-amber-200/80">
        <div className="flex items-start gap-2">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          <span>{error || "No structured analyst consensus is available for this ticker."}</span>
        </div>
      </section>
    );
  }
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-300">
            Forward outlook · {estimates.methodology}
          </div>
          <p className="mt-1 text-[10px] leading-4 text-gray-500">
            Analyst consensus is not company guidance. Ranges expose disagreement; revisions show how expectations are moving.
          </p>
        </div>
        <a
          href={estimates.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-full border border-blue-400/20 px-2.5 py-1 text-[9px] font-semibold text-blue-300 hover:text-blue-200"
        >
          {estimates.source} <ExternalLink size={9} />
        </a>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {estimates.periods.map((period) => (
          <ConsensusCard key={period.key} period={period} />
        ))}
      </div>
      <p className="mt-2 text-[9px] text-gray-600">
        Company-issued guidance is not yet normalized in this feed. No unsupported line item is projected or filled by an LLM.
      </p>
    </section>
  );
}

function StatementTable({
  dashboard,
  statement,
  metrics,
  scale,
  displayMode,
  chartMetricKeys,
  onToggleChartMetric,
}: {
  dashboard: FinancialStatementDashboard;
  statement: AnnualFinancialStatement;
  metrics: AnnualFinancialMetric[];
  scale: Scale;
  displayMode: FinancialDisplayMode;
  chartMetricKeys?: string[];
  onToggleChartMetric: (metric: AnnualFinancialMetric) => void;
}) {
  const selectedChartMetricKeys = Array.isArray(chartMetricKeys) ? chartMetricKeys : [];

  function growthTone(result: YearOverYearResult): string {
    if (result.status === "not_meaningful") return "text-amber-300/80";
    if (result.status !== "available" || result.value === 0) return "text-gray-600";
    return (result.value ?? 0) > 0 ? "text-emerald-400" : "text-rose-400";
  }

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
          {metrics.map((metric) => {
            const chartSelected = selectedChartMetricKeys.includes(metric.key);
            return (
              <tr
                key={metric.key}
                className={
                  chartSelected
                    ? "bg-blue-500/[0.08]"
                    : metric.emphasis
                      ? "bg-blue-400/[0.035]"
                      : "hover:bg-gray-900/55"
                }
              >
              <th
                className={
                  "sticky left-0 z-[5] border-r border-t border-gray-800 px-4 py-3 text-left " +
                  (chartSelected
                    ? "bg-[#0b1930] font-semibold text-blue-100"
                    : metric.emphasis
                    ? "bg-[#09111f] font-semibold text-gray-100"
                    : "bg-gray-950 font-medium text-gray-400")
                }
              >
                <button
                  type="button"
                  aria-pressed={chartSelected}
                  onClick={() => onToggleChartMetric(metric)}
                  className="group inline-flex items-center gap-1.5 text-left hover:text-blue-300"
                  title={chartSelected ? "Remove this row from the chart" : "Add this row to the chart"}
                >
                  <BarChart3
                    size={11}
                    className={chartSelected ? "text-blue-300" : "text-gray-700 group-hover:text-blue-400"}
                  />
                  <span>{metric.label}</span>
                </button>
                {metric.key === "free_cash_flow" ? (
                  <span className="ml-2 rounded bg-emerald-400/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase text-emerald-300">
                    calculated
                  </span>
                ) : null}
              </th>
              {dashboard.periods.map((period, periodIndex) => {
                const value = metricValue(metric, period.period_end);
                const priorPeriod = dashboard.periods[periodIndex + 1];
                const priorPeriodEnd =
                  priorPeriod && period.fiscal_year - priorPeriod.fiscal_year === 1
                    ? priorPeriod.period_end
                    : null;
                const yearOverYear = metricYearOverYear(
                  metric,
                  period.period_end,
                  priorPeriodEnd,
                );
                return (
                  <td
                    key={period.period_end}
                    className="border-t border-gray-800 px-3 py-2.5 text-right tabular-nums text-gray-300"
                  >
                    {value ? (
                      <a
                        href={value.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="group inline-flex min-h-9 flex-col items-end justify-center hover:text-blue-300"
                        title={
                          `${value.filed_at ? `Filed ${value.filed_at}. ` : ""}` +
                          (value.calculation || "Reported SEC XBRL fact") +
                          (yearOverYear.status === "not_meaningful"
                            ? ". YoY is not meaningful because the prior value was zero or negative."
                            : "")
                        }
                      >
                        {displayMode !== "yoy" ? (
                          <span className="inline-flex items-center gap-1">
                            {formatFinancialValue(value.value, metric.value_kind, scale)}
                            <ExternalLink
                              size={9}
                              className="opacity-0 transition-opacity group-hover:opacity-100"
                            />
                          </span>
                        ) : null}
                        {displayMode !== "values" ? (
                          <span className={`mt-0.5 text-[9px] font-medium ${growthTone(yearOverYear)}`}>
                            {formatYearOverYear(yearOverYear, displayMode === "both")}
                          </span>
                        ) : null}
                      </a>
                    ) : (
                      <span className="text-gray-700">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface StoredFinancialPreferences {
  metricView: FinancialMetricView;
  displayMode: FinancialDisplayMode;
  customMetricKeys: string[];
  trendMetricKeys: string[];
}

function storedFinancialPreferences(raw: string | null): StoredFinancialPreferences | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const candidate = parsed as Record<string, unknown>;
    const metricView = candidate.metricView;
    const displayMode = candidate.displayMode;
    const customMetricKeys = candidate.customMetricKeys;
    const trendMetricKeys = candidate.trendMetricKeys;
    if (
      !["core", "all", "custom"].includes(String(metricView)) ||
      !["values", "both", "yoy"].includes(String(displayMode)) ||
      !Array.isArray(customMetricKeys) ||
      !customMetricKeys.every((item) => typeof item === "string") ||
      !Array.isArray(trendMetricKeys) ||
      !trendMetricKeys.every((item) => typeof item === "string")
    ) {
      return null;
    }
    return {
      metricView: metricView as FinancialMetricView,
      displayMode: displayMode as FinancialDisplayMode,
      customMetricKeys: [...new Set(customMetricKeys)].slice(0, 100),
      trendMetricKeys: [...new Set(trendMetricKeys)].slice(0, 5),
    };
  } catch {
    return null;
  }
}

export default function FinancialStatementsWorkspace({ initialTicker = "NVDA" }: { initialTicker?: string }) {
  // The page supplies this value during server rendering. Reading window.location
  // here made the server render NVDA while the browser rendered the URL ticker,
  // which caused a hydration mismatch on direct ticker links.
  const [ticker, setTicker] = useState(initialTicker);
  const [years, setYears] = useState(10);
  const [scale, setScale] = useState<Scale>("billions");
  const [activeStatement, setActiveStatement] = useState<StatementKey>("income");
  const [metricView, setMetricView] = useState<FinancialMetricView>("core");
  const [displayMode, setDisplayMode] = useState<FinancialDisplayMode>("both");
  const [customMetricKeys, setCustomMetricKeys] = useState<string[]>([
    ...CORE_FINANCIAL_METRIC_KEYS,
  ]);
  const [trendMetricKeys, setTrendMetricKeys] = useState<string[]>([
    ...DEFAULT_TREND_METRIC_KEYS,
  ]);
  const [customizing, setCustomizing] = useState(false);
  const [metricSearch, setMetricSearch] = useState("");
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [dashboard, setDashboard] = useState<FinancialStatementDashboard | null>(null);
  const [forwardEstimates, setForwardEstimates] = useState<ForwardEstimatesResponse | null>(null);
  const [forwardError, setForwardError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const preferences = storedFinancialPreferences(
        window.localStorage.getItem(FINANCIAL_PREFERENCES_KEY),
      );
      if (preferences) {
        setMetricView(preferences.metricView);
        setDisplayMode(preferences.displayMode);
        setCustomMetricKeys(preferences.customMetricKeys);
        setTrendMetricKeys(preferences.trendMetricKeys);
      }
      setPreferencesLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) return;
    const preferences: StoredFinancialPreferences = {
      metricView,
      displayMode,
      customMetricKeys,
      trendMetricKeys,
    };
    window.localStorage.setItem(FINANCIAL_PREFERENCES_KEY, JSON.stringify(preferences));
  }, [customMetricKeys, displayMode, metricView, preferencesLoaded, trendMetricKeys]);

  async function loadDashboard(requestedTicker: string, requestedYears: number) {
    const normalized = requestedTicker.trim().toUpperCase();
    if (!normalized) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const [result, forward] = await Promise.all([
        jsonRequest<FinancialStatementDashboard>(
          `/api/investment-os/financial-statements?ticker=${encodeURIComponent(normalized)}` +
            `&years=${requestedYears}`,
        ),
        optionalForwardEstimates(normalized),
      ]);
      setDashboard(result);
      setForwardEstimates(forward.data);
      setForwardError(forward.error);
      setTicker(result.ticker);
    } catch (reason) {
      setDashboard(null);
      setForwardEstimates(null);
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
    setTicker(initialTicker);
    void Promise.all([
      jsonRequest<FinancialStatementDashboard>(
        `/api/investment-os/financial-statements?ticker=${encodeURIComponent(initialTicker)}&years=10`,
      ),
      optionalForwardEstimates(initialTicker),
    ])
      .then(([result, forward]) => {
        if (!active) return;
        setDashboard(result);
        setForwardEstimates(forward.data);
        setForwardError(forward.error);
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
  }, [initialTicker]);

  const selectedStatement = useMemo(
    () => dashboard?.statements.find((item) => item.key === activeStatement) ?? null,
    [activeStatement, dashboard],
  );
  const visibleMetrics = useMemo(
    () =>
      selectedStatement
        ? visibleFinancialMetrics(selectedStatement.metrics, metricView, customMetricKeys)
        : [],
    [customMetricKeys, metricView, selectedStatement],
  );
  const matchingMetrics = useMemo(() => {
    if (!selectedStatement) return [];
    const query = metricSearch.trim().toLowerCase();
    return query
      ? selectedStatement.metrics.filter((metric) => metric.label.toLowerCase().includes(query))
      : selectedStatement.metrics;
  }, [metricSearch, selectedStatement]);
  const trendCandidates = useMemo(
    () =>
      dashboard?.statements
        .flatMap((statement) => statement.metrics) ?? [],
    [dashboard],
  );
  const selectedTrendKind = useMemo(
    () =>
      trendMetricKeys
        .map((key) => dashboardMetric(dashboard, key))
        .find((metric) => metric)?.value_kind ?? null,
    [dashboard, trendMetricKeys],
  );
  const companyContext = useMemo(() => companyContextForTicker(ticker), [ticker]);

  function submitTicker(event: FormEvent) {
    event.preventDefault();
    const normalized = ticker.trim().toUpperCase();
    if (normalized) {
      window.history.replaceState(null, "", `/financials?ticker=${encodeURIComponent(normalized)}`);
    }
    void loadDashboard(ticker, years);
  }

  async function refreshSec() {
    const normalized = ticker.trim().toUpperCase();
    if (!normalized || refreshing) return;
    setRefreshing(true);
    setError("");
    setMessage("");
    try {
      const [result, forward] = await Promise.all([
        jsonRequest<FinancialStatementDashboard>(
          "/api/investment-os/financial-statements",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ticker: normalized, years }),
          },
        ),
        optionalForwardEstimates(normalized),
      ]);
      setDashboard(result);
      setForwardEstimates(forward.data);
      setForwardError(forward.error);
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

  function setMetricsSelected(keys: string[], selected: boolean) {
    const changed = new Set(keys);
    setCustomMetricKeys((current) => {
      const next = new Set(current);
      changed.forEach((key) => (selected ? next.add(key) : next.delete(key)));
      return [...next];
    });
    setMetricView("custom");
  }

  function toggleTrendMetric(metric: AnnualFinancialMetric) {
    setTrendMetricKeys((current) => {
      const currentKind = current
        .map((key) => dashboardMetric(dashboard, key))
        .find((item) => item)?.value_kind;
      return toggleFinancialChartMetric(current, currentKind ?? null, metric);
    });
  }

  function restoreFinancialDefaults() {
    setMetricView("core");
    setDisplayMode("both");
    setCustomMetricKeys([...CORE_FINANCIAL_METRIC_KEYS]);
    setTrendMetricKeys([...DEFAULT_TREND_METRIC_KEYS]);
    setMetricSearch("");
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
        {companyContext ? (
          <section className="rounded-xl border border-blue-400/15 bg-blue-400/[0.06] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-blue-100">
                  {companyContext.ticker} · {companyContext.name}
                </h2>
                <p className="mt-1 max-w-4xl text-xs leading-5 text-gray-300">{companyContext.description}</p>
                {companyContext.sector ? <p className="mt-1 text-[11px] text-gray-500">Sector: {companyContext.sector}</p> : null}
              </div>
              <a
                href={`https://finance.yahoo.com/quote/${encodeURIComponent(companyContext.ticker)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-300 underline underline-offset-2"
              >
                Yahoo Finance <ExternalLink size={12} />
              </a>
            </div>
          </section>
        ) : null}

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

            <ForwardConsensusPanel estimates={forwardEstimates} error={forwardError} />

            <section className="rounded-xl border border-gray-800 bg-gray-900/35 p-4">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                <BarChart3 size={12} /> Selected annual actuals and estimates · {selectedTrendKind === "per_share"
                  ? "USD per share"
                  : selectedTrendKind === "shares"
                    ? "billions of shares"
                    : "USD billions"}
              </div>
              <TrendChart
                dashboard={dashboard}
                metricKeys={trendMetricKeys}
                estimates={forwardEstimates}
              />
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
                  Click any row name to add or remove it from the chart · USD in {scale}
                </p>
              </div>

              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-800 bg-gray-900/35 px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="mr-1 text-[9px] font-semibold uppercase tracking-wide text-gray-600">
                      Rows
                    </span>
                    {(
                      [
                        ["core", "Core"],
                        ["all", "All"],
                        ["custom", "Custom"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setMetricView(value);
                          if (value === "custom") setCustomizing(true);
                        }}
                        className={
                          "rounded-md px-2.5 py-1.5 text-[10px] font-semibold " +
                          (metricView === value
                            ? "bg-blue-600 text-white"
                            : "text-gray-500 hover:bg-gray-800 hover:text-gray-200")
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="h-5 w-px bg-gray-800" />
                  <div className="flex items-center gap-1">
                    <span className="mr-1 text-[9px] font-semibold uppercase tracking-wide text-gray-600">
                      Display
                    </span>
                    {(
                      [
                        ["values", "Values"],
                        ["both", "Values + YoY"],
                        ["yoy", "YoY only"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setDisplayMode(value)}
                        className={
                          "rounded-md px-2.5 py-1.5 text-[10px] font-semibold " +
                          (displayMode === value
                            ? "bg-gray-700 text-white"
                            : "text-gray-500 hover:bg-gray-800 hover:text-gray-200")
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCustomizing((current) => !current)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-[10px] font-semibold text-gray-300 hover:border-blue-400/50 hover:text-blue-200"
                >
                  <Settings2 size={12} />
                  {customizing ? "Close customize" : "Customize"}
                </button>
              </div>

              {customizing && selectedStatement ? (
                <section className="mb-3 rounded-xl border border-blue-400/15 bg-blue-400/[0.035] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-semibold text-gray-100">
                        Customize visible {selectedStatement.title.toLowerCase()} rows
                      </h3>
                      <p className="mt-1 text-[10px] text-gray-500">
                        Selections are saved only in this browser and apply across company tickers.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-1.5 rounded-lg border border-gray-800 bg-gray-950 px-2.5 py-1.5">
                        <Search size={11} className="text-gray-600" />
                        <input
                          value={metricSearch}
                          onChange={(event) => setMetricSearch(event.target.value)}
                          placeholder="Find a row"
                          className="w-32 bg-transparent text-[10px] text-gray-200 outline-none placeholder:text-gray-700"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setMetricsSelected(matchingMetrics.map((metric) => metric.key), true)}
                        className="rounded-md border border-gray-700 px-2 py-1.5 text-[9px] font-semibold text-gray-400 hover:text-white"
                      >
                        Select shown
                      </button>
                      <button
                        type="button"
                        onClick={() => setMetricsSelected(matchingMetrics.map((metric) => metric.key), false)}
                        className="rounded-md border border-gray-700 px-2 py-1.5 text-[9px] font-semibold text-gray-400 hover:text-white"
                      >
                        Clear shown
                      </button>
                      <button
                        type="button"
                        onClick={restoreFinancialDefaults}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-700 px-2 py-1.5 text-[9px] font-semibold text-gray-400 hover:text-white"
                      >
                        <RotateCcw size={10} /> Restore defaults
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {matchingMetrics.map((metric) => (
                      <label
                        key={metric.key}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-800 bg-gray-950/70 px-3 py-2 text-[10px] text-gray-300 hover:border-gray-700"
                      >
                        <input
                          type="checkbox"
                          checked={customMetricKeys.includes(metric.key)}
                          onChange={(event) => setMetricsSelected([metric.key], event.target.checked)}
                          className="accent-blue-500"
                        />
                        <span>{metric.label}</span>
                      </label>
                    ))}
                  </div>

                  <div className="mt-4 border-t border-gray-800 pt-4">
                    <div className="flex flex-wrap items-end justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-semibold text-gray-100">Trend chart metrics</h3>
                        <p className="mt-1 text-[10px] text-gray-500">
                          Choose up to five rows with the same unit. Selecting a different unit starts a new chart.
                        </p>
                      </div>
                      <span className="text-[9px] font-semibold uppercase text-gray-600">
                        {trendMetricKeys.length} of 5 selected
                      </span>
                    </div>
                    <div className="mt-3 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {trendCandidates.map((metric) => {
                        const selected = trendMetricKeys.includes(metric.key);
                        const disabled =
                          !selected &&
                          trendMetricKeys.length >= 5 &&
                          metric.value_kind === selectedTrendKind;
                        return (
                          <label
                            key={metric.key}
                            className={
                              "flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-950/70 px-3 py-2 text-[10px] " +
                              (disabled
                                ? "cursor-not-allowed text-gray-700"
                                : "cursor-pointer text-gray-300 hover:border-gray-700")
                            }
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              disabled={disabled}
                              onChange={() => toggleTrendMetric(metric)}
                              className="accent-blue-500"
                            />
                            <span>{metric.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </section>
              ) : null}

              {selectedStatement && visibleMetrics.length ? (
                <StatementTable
                  dashboard={dashboard}
                  statement={selectedStatement}
                  metrics={visibleMetrics}
                  scale={scale}
                  displayMode={displayMode}
                  chartMetricKeys={trendMetricKeys}
                  onToggleChartMetric={toggleTrendMetric}
                />
              ) : selectedStatement ? (
                <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-gray-800 text-xs text-gray-600">
                  No rows are selected for this statement. Open Customize or switch to Core/All.
                </div>
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
                    expenditures.” YoY is “current ÷ prior − 1” and is marked N/M when the prior value is
                    zero or negative. Missing facts remain blank rather than being estimated.
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
