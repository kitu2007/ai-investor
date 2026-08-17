import { describe, expect, it } from "vitest";

import type { AnnualFinancialMetric } from "./investment-os-types";
import {
  formatYearOverYear,
  formatFinancialValue,
  metricCagr,
  metricValue,
  metricYearOverYear,
  visibleFinancialMetrics,
} from "./financial-statements";

const metric: AnnualFinancialMetric = {
  key: "revenue",
  label: "Revenue",
  value_kind: "currency",
  emphasis: true,
  values: [
    {
      period_end: "2026-01-25",
      value: 200_000_000_000,
      unit: "USD",
      filed_at: "2026-02-25",
      accession_number: "demo",
      source_url: "https://www.sec.gov/example",
      calculation: null,
    },
    {
      period_end: "2021-01-25",
      value: 100_000_000_000,
      unit: "USD",
      filed_at: "2021-02-25",
      accession_number: "older",
      source_url: "https://www.sec.gov/example-older",
      calculation: null,
    },
  ],
};

describe("financial statement helpers", () => {
  it("matches values to annual table columns", () => {
    expect(metricValue(metric, "2026-01-25")?.value).toBe(200_000_000_000);
    expect(metricValue(metric, "2020-01-25")).toBeNull();
  });

  it("calculates CAGR from the actual fiscal-year span", () => {
    const years = new Map([
      ["2021-01-25", 2021],
      ["2026-01-25", 2026],
    ]);
    expect(metricCagr(metric, years)).toBeCloseTo(Math.pow(2, 1 / 5) - 1);
  });

  it("formats currency, shares, per-share values, and negatives", () => {
    expect(formatFinancialValue(12_340_000_000, "currency", "billions")).toBe("12.3");
    expect(formatFinancialValue(-500_000_000, "currency", "millions")).toBe("(500)");
    expect(formatFinancialValue(4.125, "per_share", "billions")).toBe("4.13");
    expect(formatFinancialValue(null, "shares", "billions")).toBe("—");
  });

  it("calculates and formats year-over-year growth", () => {
    const annualMetric: AnnualFinancialMetric = {
      ...metric,
      values: [
        { ...metric.values[0], period_end: "2026-01-25", value: 120 },
        { ...metric.values[1], period_end: "2025-01-25", value: 100 },
      ],
    };
    const result = metricYearOverYear(annualMetric, "2026-01-25", "2025-01-25");
    expect(result.status).toBe("available");
    expect(result.value).toBeCloseTo(0.2);
    expect(formatYearOverYear(result)).toBe("(YoY +20.0%)");
  });

  it("marks missing and non-positive comparison bases without misleading percentages", () => {
    const lossMetric: AnnualFinancialMetric = {
      ...metric,
      values: [
        { ...metric.values[0], period_end: "2026-01-25", value: 10 },
        { ...metric.values[1], period_end: "2025-01-25", value: -10 },
      ],
    };
    expect(metricYearOverYear(lossMetric, "2026-01-25", "2025-01-25").status).toBe(
      "not_meaningful",
    );
    expect(
      formatYearOverYear(metricYearOverYear(lossMetric, "2026-01-25", "2025-01-25")),
    ).toBe("(YoY N/M)");
    expect(metricYearOverYear(lossMetric, "2026-01-25", null).status).toBe("missing");
  });

  it("supports core, all, and custom metric views", () => {
    const metrics = [
      metric,
      { ...metric, key: "operating_income", label: "Operating income" },
      { ...metric, key: "interest_expense", label: "Interest expense" },
    ];
    expect(visibleFinancialMetrics(metrics, "core", []).map((item) => item.key)).toEqual([
      "revenue",
      "operating_income",
    ]);
    expect(visibleFinancialMetrics(metrics, "all", []).map((item) => item.key)).toEqual([
      "revenue",
      "operating_income",
      "interest_expense",
    ]);
    expect(visibleFinancialMetrics(metrics, "custom", ["interest_expense"]).map((item) => item.key)).toEqual([
      "interest_expense",
    ]);
  });
});
