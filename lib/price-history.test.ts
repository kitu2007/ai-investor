import { describe, expect, it } from "vitest";

import {
  derivePriceHistory,
  isPriceHistoryRange,
  priceRangeStart,
} from "./price-history";

describe("price history calculations", () => {
  it("calculates running highs, running lows, drawdown, and drawup", () => {
    const result = derivePriceHistory([
      { date: "2026-01-01", close: 100 },
      { date: "2026-01-02", close: 120 },
      { date: "2026-01-03", close: 90 },
      { date: "2026-01-04", close: 108 },
    ]);

    expect(result.points.map((point) => point.runningHigh)).toEqual([100, 120, 120, 120]);
    expect(result.points.map((point) => point.runningLow)).toEqual([100, 100, 90, 90]);
    expect(result.points.map((point) => point.drawdown)[2]).toBeCloseTo(-0.25);
    expect(result.points.map((point) => point.drawdown)[3]).toBeCloseTo(-0.1);
    expect(result.points.map((point) => point.drawup)[1]).toBeCloseTo(0.2);
    expect(result.points.map((point) => point.drawup)[3]).toBeCloseTo(0.2);
    expect(result.summary?.maximumDrawdown).toBe(-0.25);
    expect(result.summary?.maximumDrawup).toBeCloseTo(0.2);
    expect(result.summary?.totalReturn).toBeCloseTo(0.08);
  });

  it("sorts, deduplicates, and rejects invalid observations", () => {
    const result = derivePriceHistory([
      { date: "2026-01-03", close: 102 },
      { date: "bad-date", close: 100 },
      { date: "2026-01-01", close: 100 },
      { date: "2026-01-03", close: 103 },
      { date: "2026-01-02", close: 0 },
    ]);

    expect(result.points).toHaveLength(2);
    expect(result.points.map((point) => point.date)).toEqual(["2026-01-01", "2026-01-03"]);
    expect(result.summary?.latestClose).toBe(103);
  });

  it("creates calendar-safe start dates for each supported window", () => {
    const now = new Date("2024-08-31T15:00:00.000Z");
    expect(priceRangeStart("6m", now).toISOString()).toBe("2024-02-29T15:00:00.000Z");
    expect(priceRangeStart("1y", new Date("2024-02-29T15:00:00.000Z")).toISOString()).toBe(
      "2023-02-28T15:00:00.000Z",
    );
    expect(priceRangeStart("all", now).toISOString()).toBe("1900-01-01T00:00:00.000Z");
    expect(isPriceHistoryRange("3m")).toBe(true);
    expect(isPriceHistoryRange("3y")).toBe(false);
  });
});
