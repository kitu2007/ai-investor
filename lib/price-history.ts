export const PRICE_HISTORY_RANGES = ["all", "10y", "5y", "2y", "1y", "6m", "3m"] as const;

export type PriceHistoryRange = (typeof PRICE_HISTORY_RANGES)[number];
export type PriceScale = "linear" | "log";

export interface RawPricePoint {
  date: string;
  close: number;
}

export interface DerivedPricePoint extends RawPricePoint {
  runningHigh: number;
  runningLow: number;
  drawdown: number;
  drawup: number;
}

export interface PriceHistorySummary {
  startDate: string;
  endDate: string;
  startClose: number;
  latestClose: number;
  totalReturn: number;
  periodHigh: number;
  periodLow: number;
  currentDrawdown: number;
  maximumDrawdown: number;
  currentDrawup: number;
  maximumDrawup: number;
}

export interface PriceHistoryResponse {
  ticker: string;
  range: PriceHistoryRange;
  interval: "1d" | "1wk";
  source: string;
  sourceUrl: string;
  retrievedAt: string;
  points: DerivedPricePoint[];
  summary: PriceHistorySummary;
}

const RANGE_OFFSETS: Record<Exclude<PriceHistoryRange, "all">, { years?: number; months?: number }> = {
  "10y": { years: 10 },
  "5y": { years: 5 },
  "2y": { years: 2 },
  "1y": { years: 1 },
  "6m": { months: 6 },
  "3m": { months: 3 },
};

export function isPriceHistoryRange(value: string): value is PriceHistoryRange {
  return PRICE_HISTORY_RANGES.includes(value as PriceHistoryRange);
}

export function priceRangeStart(range: PriceHistoryRange, now = new Date()): Date {
  if (range === "all") return new Date("1900-01-01T00:00:00.000Z");
  const offset = RANGE_OFFSETS[range];
  const start = new Date(now);
  const day = start.getUTCDate();
  const absoluteMonth =
    start.getUTCFullYear() * 12 +
    start.getUTCMonth() -
    (offset.years ?? 0) * 12 -
    (offset.months ?? 0);
  const targetYear = Math.floor(absoluteMonth / 12);
  const targetMonth = ((absoluteMonth % 12) + 12) % 12;
  const finalDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  start.setUTCFullYear(targetYear, targetMonth, Math.min(day, finalDay));
  return start;
}

export function derivePriceHistory(rawPoints: RawPricePoint[]): {
  points: DerivedPricePoint[];
  summary: PriceHistorySummary | null;
} {
  const deduplicated = new Map<string, number>();
  for (const point of rawPoints) {
    const close = Number(point.close);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(point.date) || !Number.isFinite(close) || close <= 0) {
      continue;
    }
    deduplicated.set(point.date, close);
  }

  const ordered = [...deduplicated.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, close]) => ({ date, close }));

  let runningHigh = Number.NEGATIVE_INFINITY;
  let runningLow = Number.POSITIVE_INFINITY;
  const points = ordered.map((point) => {
    runningHigh = Math.max(runningHigh, point.close);
    runningLow = Math.min(runningLow, point.close);
    return {
      ...point,
      runningHigh,
      runningLow,
      drawdown: point.close / runningHigh - 1,
      drawup: point.close / runningLow - 1,
    };
  });

  if (points.length === 0) return { points, summary: null };
  const first = points[0];
  const last = points[points.length - 1];
  return {
    points,
    summary: {
      startDate: first.date,
      endDate: last.date,
      startClose: first.close,
      latestClose: last.close,
      totalReturn: last.close / first.close - 1,
      periodHigh: Math.max(...points.map((point) => point.close)),
      periodLow: Math.min(...points.map((point) => point.close)),
      currentDrawdown: last.drawdown,
      maximumDrawdown: Math.min(...points.map((point) => point.drawdown)),
      currentDrawup: last.drawup,
      maximumDrawup: Math.max(...points.map((point) => point.drawup)),
    },
  };
}

export function formatPrice(value: number): string {
  const maximumFractionDigits = value >= 100 ? 2 : value >= 1 ? 2 : 4;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits,
  }).format(value);
}

export function formatPricePercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(1)}%`;
}
