import type {
  AnnualFinancialMetric,
  AnnualFinancialValue,
  FinancialStatementDashboard,
} from "./investment-os-types";

export type FinancialMetricView = "core" | "all" | "custom";
export type FinancialDisplayMode = "values" | "both" | "yoy";

export const CORE_FINANCIAL_METRIC_KEYS = [
  "revenue",
  "gross_profit",
  "operating_income",
  "net_income",
  "diluted_eps",
  "cash",
  "short_term_investments",
  "total_assets",
  "long_term_debt",
  "total_liabilities",
  "shareholders_equity",
  "operating_cash_flow",
  "capital_expenditures",
  "free_cash_flow",
  "stock_based_compensation",
  "share_repurchases",
] as const;

export const DEFAULT_TREND_METRIC_KEYS = [
  "revenue",
  "operating_income",
  "net_income",
  "free_cash_flow",
] as const;

export interface YearOverYearResult {
  status: "available" | "missing" | "not_meaningful";
  value: number | null;
}

export function dashboardMetric(
  dashboard: FinancialStatementDashboard | null,
  key: string,
): AnnualFinancialMetric | null {
  if (!dashboard) return null;
  for (const statement of dashboard.statements) {
    const metric = statement.metrics.find((item) => item.key === key);
    if (metric) return metric;
  }
  return null;
}

export function metricValue(
  metric: AnnualFinancialMetric | null,
  periodEnd: string,
): AnnualFinancialValue | null {
  return metric?.values.find((value) => value.period_end === periodEnd) ?? null;
}

export function metricYearOverYear(
  metric: AnnualFinancialMetric | null,
  currentPeriodEnd: string,
  previousPeriodEnd: string | null,
): YearOverYearResult {
  if (!metric || !previousPeriodEnd) return { status: "missing", value: null };
  const current = metricValue(metric, currentPeriodEnd);
  const previous = metricValue(metric, previousPeriodEnd);
  if (!current || !previous) return { status: "missing", value: null };
  if (previous.value <= 0) return { status: "not_meaningful", value: null };
  return { status: "available", value: current.value / previous.value - 1 };
}

export function formatYearOverYear(result: YearOverYearResult, bracketed = true): string {
  if (result.status === "missing") return "—";
  if (result.status === "not_meaningful") return bracketed ? "(YoY N/M)" : "N/M";
  const value = result.value ?? 0;
  const sign = value > 0 ? "+" : "";
  const formatted = `${sign}${(value * 100).toFixed(1)}%`;
  return bracketed ? `(YoY ${formatted})` : formatted;
}

export function visibleFinancialMetrics(
  metrics: AnnualFinancialMetric[],
  view: FinancialMetricView,
  customMetricKeys: Iterable<string>,
): AnnualFinancialMetric[] {
  if (view === "all") return metrics;
  const visible = new Set(view === "core" ? CORE_FINANCIAL_METRIC_KEYS : customMetricKeys);
  return metrics.filter((metric) => visible.has(metric.key));
}

export function metricCagr(
  metric: AnnualFinancialMetric | null,
  fiscalYears: Map<string, number>,
): number | null {
  if (!metric || metric.values.length < 2) return null;
  const ordered = [...metric.values].sort(
    (left, right) =>
      (fiscalYears.get(left.period_end) ?? 0) - (fiscalYears.get(right.period_end) ?? 0),
  );
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  const yearCount =
    (fiscalYears.get(last.period_end) ?? 0) -
    (fiscalYears.get(first.period_end) ?? 0);
  if (first.value <= 0 || last.value <= 0 || yearCount <= 0) return null;
  return Math.pow(last.value / first.value, 1 / yearCount) - 1;
}

export function formatFinancialValue(
  value: number | null,
  valueKind: AnnualFinancialMetric["value_kind"],
  scale: "millions" | "billions",
): string {
  if (value == null) return "—";
  if (valueKind === "per_share") {
    const formatted = Math.abs(value).toFixed(2);
    return value < 0 ? `(${formatted})` : formatted;
  }
  const divisor = scale === "billions" ? 1_000_000_000 : 1_000_000;
  const scaled = Math.abs(value) / divisor;
  const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  const formatted = scaled.toFixed(digits);
  return value < 0 ? `(${formatted})` : formatted;
}
