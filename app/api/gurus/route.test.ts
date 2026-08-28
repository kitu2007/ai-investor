import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { GET } from "./route";

describe("guru portfolio API", () => {
  it("lists David Tepper with a dated SEC source", async () => {
    const response = await GET(new NextRequest("http://localhost/api/gurus"));
    const profiles = await response.json();
    const tepper = profiles.find((profile: { id: string }) => profile.id === "david-tepper");

    expect(response.status).toBe(200);
    expect(tepper).toMatchObject({
      name: "David Tepper",
      firm: "Appaloosa LP",
      asOf: "Q2 2026 (holdings June 30; filed Aug 14, 2026)",
    });
    expect(tepper.filingUrl).toContain("sec.gov/Archives/edgar/data/1656456/");
  });

  it("returns Tepper's sourced portfolio snapshot", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/gurus?id=david-tepper"),
    );
    const profile = await response.json();

    expect(response.status).toBe(200);
    expect(profile.holdings).toHaveLength(10);
    expect(profile.holdings[0]).toMatchObject({
      ticker: "AMZN",
      action: "Add",
      quarterReported: "Q2 2026",
    });
    expect(profile.holdings.some((holding: { ticker: string }) => holding.ticker === "NVDA")).toBe(true);
    expect(profile.recentMoves).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ticker: "AMZN",
        action: "Add",
        approximatePrice: expect.stringMatching(/^~\$/),
      }),
      expect.objectContaining({ ticker: "MU", action: "Reduce" }),
    ]));
  });

  it("includes the requested investor roster with dated primary sources", async () => {
    const response = await GET(new NextRequest("http://localhost/api/gurus"));
    const profiles = await response.json();
    const ids = profiles.map((profile: { id: string }) => profile.id);

    expect(ids).toEqual(expect.arrayContaining([
      "bill-ackman",
      "chris-hohn",
      "david-einhorn",
      "david-tepper",
      "joel-greenblatt",
      "li-lu",
      "mario-gabelli",
      "mohnish-pabrai",
      "ray-dalio",
      "valueact-capital",
    ]));
    for (const id of ids.filter((profileId: string) => [
      "bill-ackman",
      "chris-hohn",
      "david-einhorn",
      "david-tepper",
      "joel-greenblatt",
      "li-lu",
      "mario-gabelli",
      "mohnish-pabrai",
      "ray-dalio",
      "valueact-capital",
    ].includes(profileId))) {
      const profile = profiles.find((candidate: { id: string }) => candidate.id === id);
      expect(profile.reportingPeriod).toBe("2026-Q2");
      expect(profile.filingUrl).toContain("sec.gov/Archives/edgar/data/");

      const detailResponse = await GET(
        new NextRequest(`http://localhost/api/gurus?id=${id}`),
      );
      const detail = await detailResponse.json();
      expect(detail.recentMoves.length).toBeGreaterThan(0);
    }
  });

  it("returns manager-counted consensus activity and its methodology", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/gurus?view=consensus"),
    );
    const payload = await response.json();
    const amazon = payload.rows.find((row: { ticker: string }) => row.ticker === "AMZN");

    expect(response.status).toBe(200);
    expect(payload.reportingPeriod).toBe("2026-Q2");
    expect(payload.methodology).toContain("share-count changes");
    expect(payload.rows[0].net).toBeGreaterThanOrEqual(payload.rows[1].net);
    expect(amazon.buyers).toHaveLength(3);
    expect(amazon.sellers).toHaveLength(3);
  });
});
