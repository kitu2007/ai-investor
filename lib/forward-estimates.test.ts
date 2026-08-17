import { describe, expect, it } from "vitest";

import { annualEstimateForMetric, normalizeForwardEstimates } from "./forward-estimates";

describe("forward estimate normalization", () => {
  const response = normalizeForwardEstimates(
    "nvda",
    [
      {
        period: "+1y",
        endDate: "2028-01-31",
        revenueEstimate: {
          avg: 200,
          low: 180,
          high: 220,
          yearAgoRevenue: 150,
          growth: 1 / 3,
          numberOfAnalysts: 20,
        },
        earningsEstimate: { avg: 10, low: 8, high: 12, numberOfAnalysts: 18 },
      },
      {
        period: "0q",
        endDate: "2026-07-31",
        revenueEstimate: { avg: 50, numberOfAnalysts: 22 },
        earningsEstimate: { avg: 2.5, numberOfAnalysts: 21 },
        epsTrend: { current: 2.5, "30daysAgo": 2.4 },
        epsRevisions: { upLast30days: 4, downLast30days: 1 },
      },
      { period: "unsupported", revenueEstimate: { avg: 1 } },
    ],
    "nongaap",
    new Date("2026-08-17T12:00:00.000Z"),
  );

  it("orders and labels supported consensus horizons", () => {
    expect(response.ticker).toBe("NVDA");
    expect(response.methodology).toBe("Non-GAAP analyst consensus");
    expect(response.periods.map((period) => period.key)).toEqual([
      "current_quarter",
      "next_year",
    ]);
    expect(response.periods[0].upwardRevisions30Days).toBe(4);
  });

  it("returns annual chart points only for independently estimated metrics", () => {
    expect(annualEstimateForMetric(response, "revenue")).toEqual([
      {
        period: response.periods[1],
        average: 200,
        low: 180,
        high: 220,
      },
    ]);
    expect(annualEstimateForMetric(response, "diluted_eps")[0].average).toBe(10);
    expect(annualEstimateForMetric(response, "operating_income")).toEqual([]);
  });
});
