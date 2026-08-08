export type WatchlistKind = "fallen" | "rising";

export interface WatchlistEntry {
  id: string;
  kind: WatchlistKind;

  // Identity
  ticker: string;
  name: string;
  exchange: string;
  sector: string;
  industry: string;
  marketCapB: number | null;

  // Why it's on this list
  thesis: string;          // why fallen/rising
  keyRisks: string;
  catalysts: string;
  moatTypes: string[];
  overallScore: number | null;
  conviction: string;

  // Snapshot financials (optional — can be filled manually)
  grossMarginPct: number | null;
  operatingMarginPct: number | null;
  revenueGrowth1Y: number | null;
  roic: number | null;
  pe: number | null;

  // Price returns — fetched live, stored as cache
  currentPrice: number | null;
  return3M: number | null;
  return6M: number | null;
  return1Y: number | null;
  return2Y: number | null;
  return3Y: number | null;
  return5Y: number | null;
  allTimeHigh: number | null;
  pctOffHigh: number | null;
  returnsLastFetched: string | null;

  dateAdded: string;
  lastUpdated: string;
}
