export type ForwardEstimatePeriodKey =
  | "current_quarter"
  | "next_quarter"
  | "current_year"
  | "next_year";

export interface EstimateRange {
  average: number | null;
  low: number | null;
  high: number | null;
  priorActual: number | null;
  growth: number | null;
  analystCount: number | null;
}

export interface ForwardEstimatePeriod {
  key: ForwardEstimatePeriodKey;
  label: string;
  endDate: string | null;
  revenue: EstimateRange;
  eps: EstimateRange;
  epsCurrent: number | null;
  eps30DaysAgo: number | null;
  upwardRevisions30Days: number | null;
  downwardRevisions30Days: number | null;
}

export interface ForwardEstimatesResponse {
  ticker: string;
  methodology: string;
  source: string;
  sourceUrl: string;
  retrievedAt: string;
  periods: ForwardEstimatePeriod[];
}

export interface RawEstimateRange {
  avg?: number | null;
  low?: number | null;
  high?: number | null;
  yearAgoEps?: number | null;
  yearAgoRevenue?: number | null;
  growth?: number | null;
  numberOfAnalysts?: number | null;
}

export interface RawForwardTrend {
  period?: string;
  endDate?: Date | string | null;
  earningsEstimate?: RawEstimateRange;
  revenueEstimate?: RawEstimateRange;
  epsTrend?: {
    current?: number | null;
    "30daysAgo"?: number | null;
  };
  epsRevisions?: {
    upLast30days?: number | null;
    downLast30days?: number | null;
  };
}

const PERIODS: Record<
  string,
  { key: ForwardEstimatePeriodKey; label: string; order: number }
> = {
  "0q": { key: "current_quarter", label: "Current quarter", order: 0 },
  "+1q": { key: "next_quarter", label: "Next quarter", order: 1 },
  "0y": { key: "current_year", label: "Current fiscal year", order: 2 },
  "+1y": { key: "next_year", label: "Next fiscal year", order: 3 },
};

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isoDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : null;
}

function estimateRange(
  estimate: RawEstimateRange | undefined,
  priorKey: "yearAgoEps" | "yearAgoRevenue",
): EstimateRange {
  return {
    average: finiteNumber(estimate?.avg),
    low: finiteNumber(estimate?.low),
    high: finiteNumber(estimate?.high),
    priorActual: finiteNumber(estimate?.[priorKey]),
    growth: finiteNumber(estimate?.growth),
    analystCount: finiteNumber(estimate?.numberOfAnalysts),
  };
}

export function normalizeForwardEstimates(
  ticker: string,
  rawTrends: RawForwardTrend[],
  methodology: string | null | undefined,
  retrievedAt = new Date(),
): ForwardEstimatesResponse {
  const periods = rawTrends
    .flatMap((trend) => {
      const definition = trend.period ? PERIODS[trend.period] : null;
      if (!definition) return [];
      return [
        {
          order: definition.order,
          period: {
            key: definition.key,
            label: definition.label,
            endDate: isoDate(trend.endDate),
            revenue: estimateRange(trend.revenueEstimate, "yearAgoRevenue"),
            eps: estimateRange(trend.earningsEstimate, "yearAgoEps"),
            epsCurrent: finiteNumber(trend.epsTrend?.current),
            eps30DaysAgo: finiteNumber(trend.epsTrend?.["30daysAgo"]),
            upwardRevisions30Days: finiteNumber(trend.epsRevisions?.upLast30days),
            downwardRevisions30Days: finiteNumber(trend.epsRevisions?.downLast30days),
          } satisfies ForwardEstimatePeriod,
        },
      ];
    })
    .sort((left, right) => left.order - right.order)
    .map((item) => item.period);

  return {
    ticker: ticker.trim().toUpperCase(),
    methodology:
      methodology === "nongaap"
        ? "Non-GAAP analyst consensus"
        : methodology === "gaap"
          ? "GAAP analyst consensus"
          : "Analyst consensus; methodology not specified",
    source: "Yahoo Finance analyst estimates",
    sourceUrl: `https://finance.yahoo.com/quote/${encodeURIComponent(ticker.trim().toUpperCase())}/analysis/`,
    retrievedAt: retrievedAt.toISOString(),
    periods,
  };
}

export function annualEstimateForMetric(
  estimates: ForwardEstimatesResponse | null,
  metricKey: string,
): Array<{
  period: ForwardEstimatePeriod;
  average: number;
  low: number | null;
  high: number | null;
}> {
  if (!estimates || !["revenue", "diluted_eps"].includes(metricKey)) return [];
  return estimates.periods.flatMap((period) => {
    if (!["current_year", "next_year"].includes(period.key)) return [];
    const range = metricKey === "revenue" ? period.revenue : period.eps;
    return range.average == null
      ? []
      : [{ period, average: range.average, low: range.low, high: range.high }];
  });
}
