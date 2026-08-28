import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { GET } from "./route";

describe("growth investor API", () => {
  it("returns a curated roster with dated SEC sources", async () => {
    const response = await GET(new NextRequest("http://localhost/api/growth-investors"));
    const profiles = await response.json();

    expect(response.status).toBe(200);
    expect(profiles.map((profile: { id: string }) => profile.id)).toEqual(expect.arrayContaining([
      "cathie-wood-ark",
      "tiger-global",
      "pat-dorsey",
      "terry-smith-fundsmith",
      "polen-capital",
    ]));
    for (const profile of profiles) {
      expect(profile.filingUrl).toContain("sec.gov/Archives/edgar/data/");
      expect(profile.asOf).toContain("Q2 2026");
    }
  });

  it("returns holdings and recent moves for a selected manager", async () => {
    const response = await GET(new NextRequest("http://localhost/api/growth-investors?id=cathie-wood-ark"));
    const profile = await response.json();

    expect(response.status).toBe(200);
    expect(profile.holdings).toHaveLength(10);
    expect(profile.recentMoves).toHaveLength(10);
    expect(profile.recentMoves[0]).toMatchObject({
      quarterReported: "Q2 2026 vs Q1 2026",
      approximatePrice: expect.stringMatching(/^~\$/),
    });
    expect(profile.holdings).toEqual(expect.arrayContaining([
      expect.objectContaining({ ticker: "TSLA" }),
      expect.objectContaining({ ticker: "TEM" }),
    ]));
  });

  it("aggregates company overlap and activity by manager", async () => {
    const response = await GET(new NextRequest("http://localhost/api/growth-investors?view=companies"));
    const payload = await response.json();
    const amazon = payload.rows.find((row: { ticker: string }) => row.ticker === "AMZN");

    expect(response.status).toBe(200);
    expect(payload.includedManagers).toHaveLength(5);
    expect(payload.methodology).toContain("ten largest displayed");
    expect(payload.rows[0].net).toBeGreaterThanOrEqual(payload.rows[1].net);
    expect(amazon.owners.length).toBeGreaterThanOrEqual(3);
    expect(amazon.sellers.length).toBeGreaterThanOrEqual(2);
  });

  it("returns 404 for an unknown manager", async () => {
    const response = await GET(new NextRequest("http://localhost/api/growth-investors?id=unknown"));
    expect(response.status).toBe(404);
  });
});
