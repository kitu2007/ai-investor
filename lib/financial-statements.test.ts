import { describe, expect, it } from "vitest";

import type { AnnualFinancialMetric } from "./investment-os-types";
import {
  formatFinancialValue,
  metricCagr,
  metricValue,
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
});
