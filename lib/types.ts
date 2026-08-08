export type MoatType =
  | "Brand"
  | "Switching Costs"
  | "Network Effects"
  | "Cost Advantage"
  | "IP / Patents"
  | "Regulatory"
  | "Efficient Scale"
  | "None";

export type ConvictionLevel = "High" | "Medium" | "Low" | "Watch";

export const VALUE_INVESTORS = [
  "Warren Buffett",
  "Charlie Munger",
  "Bill Ackman",
  "Li Lu",
  "Terry Smith",
  "Mohnish Pabrai",
  "Guy Spier",
  "Chuck Akre",
  "Joel Greenblatt",
  "Seth Klarman",
  "David Tepper",
  "Michael Burry",
  "Chris Hohn",
  "Tom Russo",
  "Howard Marks",
  "David Einhorn",
  "Pat Dorsey",
  "Nick Sleep",
  "Francisco Parames",
  "Allan Mecham",
] as const;

export type ValueInvestor = typeof VALUE_INVESTORS[number];

export interface Company {
  id: string;

  // Identity
  name: string;
  ticker: string;
  exchange: string;
  sector: string;
  industry: string;
  description: string;
  keyProducts: string[];
  revenueSegments: { name: string; pct: number }[];

  // Moat & Qualitative (Fisher / Buffett)
  moatTypes: MoatType[];
  moatScore: number | null;         // 1–5
  brandStrength: number | null;     // 1–5
  switchingCosts: number | null;    // 1–5
  networkEffects: number | null;    // 1–5
  pricingPower: number | null;      // 1–5
  managementQuality: number | null; // 1–5
  insiderOwnershipPct: number | null;
  rdEffectiveness: number | null;   // 1–5
  rdPctRevenue: number | null;      // R&D spend as % of revenue
  laborRelations: number | null;    // 1–5
  ceoName: string;
  ceoTenureYears: number | null;
  founderLed: boolean | null;
  nextCatalyst: string;
  lastEarningsBeat: boolean | null;
  gurus: string[];
  scuttlebuttNotes: string;

  // Financials (%)
  grossMarginPct: number | null;
  operatingMarginPct: number | null;
  netMarginPct: number | null;
  fcfMarginPct: number | null;
  revenueGrowth1Y: number | null;
  revenueCAGR3Y: number | null;
  revenueCAGR5Y: number | null;
  epsGrowth3Y: number | null;
  roic: number | null;
  roe: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;

  // Price context
  currentPrice: number | null;
  pe: number | null;
  pFcf: number | null;
  evEbitda: number | null;
  week52High: number | null;
  week52Low: number | null;
  marketCapB: number | null; // billions

  // Meta
  overallScore: number | null; // 1–10
  conviction: ConvictionLevel;
  notes: string;
  dateAdded: string;
  lastUpdated: string;
  financialsLastFetched: string | null;
}

export type CompanyFormData = Omit<Company, "id" | "dateAdded" | "lastUpdated" | "financialsLastFetched">;
