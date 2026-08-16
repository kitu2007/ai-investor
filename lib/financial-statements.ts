import type {
  AnnualFinancialMetric,
  AnnualFinancialValue,
  FinancialStatementDashboard,
} from "./investment-os-types";

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
