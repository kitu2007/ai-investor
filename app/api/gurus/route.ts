import { NextRequest, NextResponse } from "next/server";

// Static guru portfolio data sourced from dated 13-F filings, annual reports,
// and public disclosures. Each profile carries its own as-of date because the
// source periods differ. CIK numbers are included for SEC EDGAR verification.

export interface GuruHolding {
  ticker: string;
  cusip?: string;
  name: string;
  sector: string;
  pctPortfolio: number;    // % of reported portfolio
  sharesM: number | null;  // millions of shares
  valueB: number | null;   // market value billions
  action: "New" | "Add" | "Reduce" | "Hold" | "Exit";
  quarterReported: string; // e.g. "Q4 2024"
  notes: string;
}

export interface GuruMove {
  ticker: string;
  cusip: string;
  name: string;
  action: Exclude<GuruHolding["action"], "Hold">;
  priorSharesM: number;
  currentSharesM: number;
  priorPctPortfolio: number;
  currentPctPortfolio: number;
  quarterReported: string;
  approximatePrice?: string;
  priceBasis?: string;
}

export interface GuruProfile {
  id: string;
  name: string;
  firm: string;
  style: string;
  aum: string;
  philosophy: string;
  holdings: GuruHolding[];
  recentMoves?: GuruMove[];
  filingSource: string;
  filingUrl?: string;
  asOf: string;
  reportingPeriod?: string;
}

export interface ConsensusActivity {
  ticker: string;
  cusip: string;
  name: string;
  buyers: string[];
  sellers: string[];
  net: number;
}

function approximateQuarterEndPrice(valueB: number | null, sharesM: number | null): string | undefined {
  if (!valueB || !sharesM) return undefined;
  return `~$${((valueB / sharesM) * 1000).toFixed(0)}`;
}

function priceBasis(action: GuruMove["action"]): string {
  if (action === "New" || action === "Add") {
    return "Approximate Q2 2026 quarter-end price, not the investor's execution price.";
  }
  return "Approximate Q2 2026 remaining-position quarter-end price, not the investor's sale price.";
}

const secHolding = (
  ticker: string,
  cusip: string,
  name: string,
  sector: string,
  pctPortfolio: number,
  sharesM: number,
  valueB: number,
  action: GuruHolding["action"],
  quarterReported = "Q2 2026",
): GuruHolding => ({
  ticker,
  cusip,
  name,
  sector,
  pctPortfolio,
  sharesM,
  valueB,
  action,
  quarterReported,
  notes: `${action} is based on the reported share-count change from the preceding 13-F. The filing does not disclose the investor's thesis or exact trade price.`,
});

const secMove = (
  ticker: string,
  cusip: string,
  name: string,
  action: GuruMove["action"],
  priorSharesM: number,
  currentSharesM: number,
  priorPctPortfolio: number,
  currentPctPortfolio: number,
): GuruMove => ({
  ticker,
  cusip,
  name,
  action,
  priorSharesM,
  currentSharesM,
  priorPctPortfolio,
  currentPctPortfolio,
  quarterReported: "Q2 2026 vs Q1 2026",
});

// Material share-count changes (at least 0.25% of either quarter's reported
// 13-F value) found in Q2 2026 and Q1 2026 SEC filings. Rows below require at
// least two managers on one side or two managers with opposing activity.
const consensusActivity = (
  ticker: string,
  cusip: string,
  name: string,
  buyers: string[],
  sellers: string[],
): ConsensusActivity => ({ ticker, cusip, name, buyers, sellers, net: buyers.length - sellers.length });

const CONSENSUS_ACTIVITY: ConsensusActivity[] = [
  consensusActivity("MSFT", "594918104", "Microsoft", ["Bill Ackman (Add)", "Joel Greenblatt / Gotham (Add)"], ["David Tepper (Exit)", "Chris Hohn / TCI (Exit)", "Mario Gabelli / GAMCO (Reduce)", "Bridgewater (Reduce)"]),
  consensusActivity("AMZN", "023135106", "Amazon", ["David Tepper (Add)", "ValueAct Capital (Add)", "Joel Greenblatt / Gotham (Add)"], ["Bill Ackman (Reduce)", "Mario Gabelli / GAMCO (Reduce)", "Bridgewater (Reduce)"]),
  consensusActivity("GOOG", "02079K107", "Alphabet Class C", ["Warren Buffett / Berkshire (Add)", "David Tepper (Add)", "Chris Hohn / TCI (Add)", "Mario Gabelli / GAMCO (Add)"], ["Bill Ackman (Exit)", "Bridgewater (Reduce)"]),
  consensusActivity("META", "30303M102", "Meta Platforms", ["David Tepper (Add)", "Bill Ackman (Add)", "Mario Gabelli / GAMCO (Add)"], ["Bridgewater (Reduce)"]),
  consensusActivity("AAPL", "037833100", "Apple", [], ["Joel Greenblatt / Gotham (Reduce)", "Mario Gabelli / GAMCO (Reduce)", "Bridgewater (Reduce)"]),
  consensusActivity("MU", "595112103", "Micron Technology", [], ["David Tepper (Reduce)", "Joel Greenblatt / Gotham (Reduce)", "Bridgewater (Reduce)"]),
  consensusActivity("NVDA", "67066G104", "NVIDIA", ["David Tepper (Add)", "Mario Gabelli / GAMCO (Add)"], ["Joel Greenblatt / Gotham (Reduce)", "Bridgewater (Reduce)"]),
  consensusActivity("AVGO", "11135F101", "Broadcom", ["David Tepper (New)"], ["Joel Greenblatt / Gotham (Reduce)", "Bridgewater (Reduce)"]),
  consensusActivity("IVV", "464287200", "iShares Core S&P 500 ETF", ["Joel Greenblatt / Gotham (Add)", "Bridgewater (Add)"], ["Mario Gabelli / GAMCO (Reduce)"]),
  consensusActivity("SPGI", "78409V104", "S&P Global", ["Bill Ackman (New)", "Chris Hohn / TCI (Add)"], ["Li Lu / Himalaya (Exit)"]),
  consensusActivity("GOOGL", "02079K305", "Alphabet Class A", ["Warren Buffett / Berkshire (Add)", "Joel Greenblatt / Gotham (Add)"], ["Bridgewater (Reduce)"]),
  consensusActivity("BAC", "060505104", "Bank of America", [], ["Warren Buffett / Berkshire (Reduce)", "Li Lu / Himalaya (Exit)"]),
  consensusActivity("AMD", "007903107", "Advanced Micro Devices", [], ["David Tepper (Reduce)", "Bridgewater (Reduce)"]),
  consensusActivity("CAT", "149123101", "Caterpillar", [], ["Joel Greenblatt / Gotham (Reduce)", "Bridgewater (Reduce)"]),
  consensusActivity("LLY", "532457108", "Eli Lilly", ["Mario Gabelli / GAMCO (Add)", "Bridgewater (Add)"], []),
  consensusActivity("LRCX", "512807306", "Lam Research", [], ["Joel Greenblatt / Gotham (Reduce)", "Bridgewater (Reduce)"]),
  consensusActivity("SNDK", "80004C200", "Sandisk", [], ["David Tepper (Exit)", "Joel Greenblatt / Gotham (Reduce)"]),
  consensusActivity("HSIC", "806407102", "Henry Schein", ["David Einhorn / DME (Add)", "Mario Gabelli / GAMCO (Add)"], []),
  consensusActivity("SPB", "84790A105", "Spectrum Brands", [], ["David Einhorn / DME (Reduce)", "Mario Gabelli / GAMCO (Reduce)"]),
  consensusActivity("SPY", "78462F103", "SPDR S&P 500 ETF Trust", ["Joel Greenblatt / Gotham (Add)", "Bridgewater (Add)"], []),
  consensusActivity("TPR", "876030107", "Tapestry", ["Joel Greenblatt / Gotham (Add)", "Bridgewater (Add)"], []),
  consensusActivity("FTI", "G87110105", "TechnipFMC", ["Joel Greenblatt / Gotham (Add)", "Bridgewater (Add)"], []),
  consensusActivity("UBER", "90353T100", "Uber Technologies", ["David Tepper (Add)", "Bill Ackman (Add)"], []),
  consensusActivity("VOO", "922908363", "Vanguard S&P 500 ETF", ["Joel Greenblatt / Gotham (Add)", "Bridgewater (Add)"], []),
  consensusActivity("V", "92826C839", "Visa", ["Bill Ackman (New)", "Chris Hohn / TCI (Add)"], []),
  consensusActivity("VST", "92840M102", "Vistra", ["David Tepper (Add)", "Bridgewater (Add)"], []),
  consensusActivity("WDC", "958102105", "Western Digital", [], ["Joel Greenblatt / Gotham (Reduce)", "Bridgewater (Reduce)"]),
];

const GURU_PORTFOLIOS: GuruProfile[] = [
  {
    id: "warren-buffett",
    name: "Warren Buffett",
    firm: "Berkshire Hathaway",
    style: "Quality compounder, concentrated, very long holding periods",
    aum: "$299.25B reported 13-F securities",
    philosophy: "Buy wonderful companies at fair prices. Focus on durable competitive advantages, strong management, and businesses you can understand. Time in market > timing the market.",
    asOf: "Q2 2026 (holdings June 30; filed Aug 14, 2026; US-listed securities only)",
    reportingPeriod: "2026-Q2",
    filingSource: "SEC Form 13F-HR · Berkshire Hathaway Inc · CIK 0001067983",
    filingUrl: "https://www.sec.gov/Archives/edgar/data/1067983/000119312526352200/0001193125-26-352200-index.html",
    recentMoves: [
      secMove("BAC", "060505104", "Bank of America", "Reduce", 513.624165, 483.394015, 9.52, 9.2),
      secMove("GOOGL", "02079K305", "Alphabet Class A", "Add", 54.249798, 78.791167, 5.93, 9.41),
      secMove("GOOG", "02079K107", "Alphabet Class C", "Add", 3.585215, 27.188433, 0.39, 3.21),
      secMove("DVA", "23918K108", "DaVita", "Reduce", 30.100585, 28.880209, 1.76, 2.15),
      secMove("DAL", "247361702", "Delta Air Lines", "Add", 39.809456, 57.32, 1.01, 1.79),
      secMove("KR", "501044101", "Kroger", "Reduce", 50, 39, 1.38, 0.72),
      secMove("COF", "14040H105", "Capital One Financial", "Reduce", 7.15, 3, 0.5, 0.2),
      secMove("NYT", "650111107", "New York Times", "Add", 15.146535, 15.7, 0.48, 0.37),
      secMove("ALLY", "02005N100", "Ally Financial", "Reduce", 29, 27, 0.43, 0.41),
      secMove("LEN", "526057104", "Lennar", "Add", 10.099642, 13.111741, 0.33, 0.4),
    ],
    holdings: [
      secHolding("AAPL", "037833100", "Apple", "Technology", 22.04, 227.917808, 65.95, "Hold"),
      secHolding("AXP", "025816109", "American Express", "Financials", 17.14, 151.6107, 51.282, "Hold"),
      secHolding("KO", "191216100", "Coca-Cola", "Consumer Staples", 10.86, 400, 32.508, "Hold"),
      secHolding("GOOGL", "02079K305", "Alphabet Class A", "Communication Services", 9.41, 78.791167, 28.158, "Add"),
      secHolding("BAC", "060505104", "Bank of America", "Financials", 9.2, 483.394015, 27.544, "Reduce"),
      secHolding("CVX", "166764100", "Chevron", "Energy", 4.67, 84.375856, 13.986, "Hold"),
      secHolding("OXY", "674599105", "Occidental Petroleum", "Energy", 4.3, 264.941431, 12.868, "Hold"),
      secHolding("CB", "H1467J104", "Chubb", "Financials", 3.9, 34.249183, 11.67, "Hold"),
      secHolding("MCO", "615369105", "Moody's", "Financials", 3.73, 24.669778, 11.173, "Hold"),
      secHolding("GOOG", "02079K107", "Alphabet Class C", "Communication Services", 3.21, 27.188433, 9.606, "Add"),
    ],
  },
  {
    id: "david-tepper",
    name: "David Tepper",
    firm: "Appaloosa LP",
    style: "Opportunistic value, distressed situations, macro-aware, concentrated",
    aum: "$7.73B reported 13-F securities",
    philosophy: "Uses fundamental value work with macro and cycle awareness. Tepper is willing to buy temporarily impaired or distressed securities and size positions aggressively when he believes the risk/reward is asymmetric.",
    asOf: "Q2 2026 (holdings June 30; filed Aug 14, 2026)",
    reportingPeriod: "2026-Q2",
    filingSource: "SEC Form 13F-HR · CIK 0001656456 · accession 0001656456-26-000003",
    filingUrl: "https://www.sec.gov/Archives/edgar/data/1656456/000165645626000003/0001656456-26-000003-index.html",
    recentMoves: [
      secMove("AMZN", "023135106", "Amazon", "Add", 4.32, 5, 15.16, 15.43),
      secMove("MU", "595112103", "Micron Technology", "Reduce", 1.665, 0.975, 9.48, 14.57),
      secMove("TSM", "874039100", "Taiwan Semiconductor ADR", "Add", 1.3275, 1.65, 7.56, 10.2),
      secMove("GOOG", "02079K107", "Alphabet Class C", "Add", 1.7327, 1.85, 8.38, 8.46),
      secMove("UBER", "90353T100", "Uber Technologies", "Add", 6.33272, 7.694071, 7.68, 7.19),
      secMove("BABA", "01609W102", "Alibaba ADR", "Reduce", 3.465, 2, 7.33, 2.48),
      secMove("EWY", "464286772", "iShares MSCI South Korea ETF", "Add", 2.4, 2.425, 4.98, 6.34),
      secMove("VST", "92840M102", "Vistra", "Add", 2.022332, 2.215272, 5.12, 4.55),
      secMove("META", "30303M102", "Meta Platforms", "Add", 0.4365, 0.675, 4.21, 4.92),
      secMove("NVDA", "67066G104", "NVIDIA", "Add", 1.4715, 1.525, 4.33, 3.95),
      secMove("NRG", "629377508", "NRG Energy", "Add", 1.734442, 1.76, 4.27, 3.33),
      secMove("SNDK", "80004C200", "Sandisk", "Exit", 0.28125, 0, 3.01, 0),
      secMove("GLW", "219350105", "Corning", "Exit", 1.1295, 0, 2.59, 0),
      secMove("BA", "097023105", "Boeing", "New", 0, 0.8, 0, 2.24),
    ],
    holdings: [
      { ticker: "AMZN", name: "Amazon", sector: "Consumer Discretionary", pctPortfolio: 15.43, sharesM: 5.0, valueB: 1.19, action: "Add", quarterReported: "Q2 2026", notes: "Reported position increased by 680,000 shares. A 13-F does not disclose Tepper's investment rationale." },
      { ticker: "MU", name: "Micron Technology", sector: "Technology", pctPortfolio: 14.57, sharesM: 0.975, valueB: 1.13, action: "Reduce", quarterReported: "Q2 2026", notes: "Reported position decreased by 690,000 shares but remained the second-largest disclosed position." },
      { ticker: "TSM", name: "Taiwan Semiconductor", sector: "Technology", pctPortfolio: 10.20, sharesM: 1.65, valueB: 0.788, action: "Add", quarterReported: "Q2 2026", notes: "Reported position increased by 322,500 shares. The filing reports ownership, not the underlying thesis." },
      { ticker: "GOOG", name: "Alphabet", sector: "Communication Services", pctPortfolio: 8.46, sharesM: 1.85, valueB: 0.654, action: "Add", quarterReported: "Q2 2026", notes: "Reported position increased by 117,300 shares." },
      { ticker: "UBER", name: "Uber Technologies", sector: "Industrials", pctPortfolio: 7.19, sharesM: 7.694071, valueB: 0.555, action: "Add", quarterReported: "Q2 2026", notes: "Reported position increased by 1,361,351 shares." },
      { ticker: "EWY", name: "iShares MSCI South Korea ETF", sector: "ETF", pctPortfolio: 6.34, sharesM: 2.425, valueB: 0.490, action: "Add", quarterReported: "Q2 2026", notes: "Reported position increased by 25,000 shares; the ETF adds country-level exposure." },
      { ticker: "META", name: "Meta Platforms", sector: "Communication Services", pctPortfolio: 4.92, sharesM: 0.675, valueB: 0.380, action: "Add", quarterReported: "Q2 2026", notes: "Reported position increased by 238,500 shares." },
      { ticker: "VST", name: "Vistra", sector: "Utilities", pctPortfolio: 4.55, sharesM: 2.215272, valueB: 0.351, action: "Add", quarterReported: "Q2 2026", notes: "Reported position increased by 192,940 shares." },
      { ticker: "NVDA", name: "NVIDIA", sector: "Technology", pctPortfolio: 3.95, sharesM: 1.525, valueB: 0.305, action: "Add", quarterReported: "Q2 2026", notes: "Reported position increased by 53,500 shares. This is a filing fact, not evidence that Tepper endorses the current price." },
      { ticker: "NRG", name: "NRG Energy", sector: "Utilities", pctPortfolio: 3.33, sharesM: 1.76, valueB: 0.257, action: "Add", quarterReported: "Q2 2026", notes: "Reported position increased by 25,558 shares." },
    ],
  },
  {
    id: "bill-ackman",
    name: "Bill Ackman",
    firm: "Pershing Square",
    style: "Concentrated activist, high-conviction, long-duration",
    aum: "$19.47B reported 13-F securities",
    philosophy: "Highly concentrated portfolio of 8–12 businesses. Seeks simple, predictable, free-cash-flow-generative companies with dominant market positions. Willing to engage management to unlock value.",
    asOf: "Q2 2026 (holdings June 30; filed Aug 14, 2026)",
    reportingPeriod: "2026-Q2",
    filingSource: "SEC Form 13F-HR · Pershing Square Inc. CIK 0002026053 · includes PSCM and affiliated managers",
    filingUrl: "https://www.sec.gov/Archives/edgar/data/2026053/000117266126003790/0001172661-26-003790-index.html",
    recentMoves: [
      secMove("BN", "11271J107", "Brookfield", "Reduce", 59.697208, 57.481047, 17.62, 12.58),
      secMove("AMZN", "023135106", "Amazon", "Reduce", 11.451981, 8.563857, 17.39, 10.49),
      secMove("UBER", "90353T100", "Uber Technologies", "Add", 29.958771, 34.3262, 15.71, 12.72),
      secMove("MSFT", "594918104", "Microsoft", "Add", 5.654078, 6.20673, 15.26, 11.89),
      secMove("QSR", "76131D103", "Restaurant Brands International", "Add", 22.645483, 25.821284, 12.2, 9.62),
      secMove("META", "30303M102", "Meta Platforms", "Add", 2.660861, 3.196062, 11.1, 9.25),
      secMove("HHH", "44267T102", "Howard Hughes Holdings", "Add", 18.852064, 27.852064, 8.7, 10.23),
      secMove("V", "92826C839", "Visa", "New", 0, 3.27047, 0, 5.76),
      secMove("MA", "57636Q104", "Mastercard", "New", 0, 2.124646, 0, 5.61),
      secMove("SPGI", "78409V104", "S&P Global", "New", 0, 2.593155, 0, 5.43),
    ],
    holdings: [
      secHolding("UBER", "90353T100", "Uber Technologies", "Industrials", 12.72, 34.3262, 2.477, "Add"),
      secHolding("BN", "11271J107", "Brookfield", "Financials", 12.58, 57.481047, 2.448, "Reduce"),
      secHolding("MSFT", "594918104", "Microsoft", "Technology", 11.89, 6.20673, 2.315, "Add"),
      secHolding("AMZN", "023135106", "Amazon", "Consumer Discretionary", 10.49, 8.563857, 2.041, "Reduce"),
      secHolding("HHH", "44267T102", "Howard Hughes Holdings", "Real Estate", 10.23, 27.852064, 1.991, "Add"),
      secHolding("QSR", "76131D103", "Restaurant Brands International", "Consumer Discretionary", 9.62, 25.821284, 1.872, "Add"),
      secHolding("META", "30303M102", "Meta Platforms", "Communication Services", 9.25, 3.196062, 1.8, "Add"),
      secHolding("V", "92826C839", "Visa", "Financials", 5.76, 3.27047, 1.122, "New"),
      secHolding("MA", "57636Q104", "Mastercard", "Financials", 5.61, 2.124646, 1.091, "New"),
      secHolding("SPGI", "78409V104", "S&P Global", "Financials", 5.43, 2.593155, 1.056, "New"),
    ],
  },
  {
    id: "seth-klarman",
    name: "Seth Klarman",
    firm: "Baupost Group",
    style: "Deep value, margin of safety, distressed, special situations",
    aum: "~$27B",
    philosophy: "The margin of safety is the central concept in investing. Buy assets at a significant discount to intrinsic value. Willing to hold cash for years waiting for the right opportunity. Focus on downside protection first.",
    asOf: "Q3 2024 (13-F filed Nov 2024)",
    filingSource: "SEC EDGAR CIK 0000893818",
    holdings: [
      { ticker: "ELAN", name: "Elanco Animal Health", sector: "Healthcare", pctPortfolio: 16.3, sharesM: 85.2, valueB: 0.85, action: "Hold", quarterReported: "Q3 2024", notes: "Turnaround story. Animal health duopoly with Zoetis. Cheap on normalized earnings." },
      { ticker: "IAC", name: "IAC / InterActiveCorp", sector: "Technology", pctPortfolio: 14.8, sharesM: 12.4, valueB: 0.52, action: "Add", quarterReported: "Q3 2024", notes: "Classic Klarman — SOTP discount. Owns Dotdash Meredith, Ask.com, Angi. Deep discount to NAV." },
      { ticker: "VIASP", name: "Viasat", sector: "Technology", pctPortfolio: 12.1, sharesM: 18.6, valueB: 0.41, action: "Hold", quarterReported: "Q3 2024", notes: "Distressed satellite play. Integration issues with Inmarsat created opportunity." },
      { ticker: "QRTEA", name: "Qurate Retail", sector: "Consumer Discretionary", pctPortfolio: 9.6, sharesM: 198.0, valueB: 0.18, action: "Hold", quarterReported: "Q3 2024", notes: "Deep distressed value. HSN/QVC parent trading at extreme discount. High risk." },
      { ticker: "EXPE", name: "Expedia", sector: "Consumer Discretionary", pctPortfolio: 8.4, sharesM: 4.1, valueB: 0.68, action: "New", quarterReported: "Q3 2024", notes: "OTA with brand moat. Cheaper than Booking Holdings on FCF. Recovery play." },
      { ticker: "LUMN", name: "Lumen Technologies", sector: "Communication", pctPortfolio: 7.2, sharesM: 145.0, valueB: 0.19, action: "Hold", quarterReported: "Q3 2024", notes: "Distressed telecom fiber play. AI data centre connectivity demand could re-rate." },
      { ticker: "GEHC", name: "GE HealthCare", sector: "Healthcare", pctPortfolio: 6.8, sharesM: 8.9, valueB: 0.88, action: "Add", quarterReported: "Q3 2024", notes: "Medical imaging leader post GE spin-off. AI-enhanced diagnostics growth." },
      { ticker: "REZI", name: "Resideo Technologies", sector: "Industrials", pctPortfolio: 5.9, sharesM: 22.1, valueB: 0.49, action: "Hold", quarterReported: "Q3 2024", notes: "Honeywell spin-off at discount. Home security and comfort products distribution." },
    ],
  },
  {
    id: "terry-smith",
    name: "Terry Smith",
    firm: "Fundsmith",
    style: "Quality growth, buy and hold forever, very low turnover",
    aum: "~£23B",
    philosophy: "Buy good companies, don't overpay, do nothing. Only invests in companies with high ROIC, strong brands, and the ability to reinvest at high rates. Refuses to own banks, miners, or capital-intensive businesses.",
    asOf: "Annual Report 2024",
    filingSource: "Fundsmith Annual Letter & UCITS fund holdings",
    holdings: [
      { ticker: "META", name: "Meta Platforms", sector: "Technology", pctPortfolio: 8.9, sharesM: null, valueB: null, action: "Hold", quarterReported: "Q4 2024", notes: "Largest social network. Advertising moat. Zuckerberg's capital allocation (buybacks, AI capex) praised." },
      { ticker: "MSFT", name: "Microsoft", sector: "Technology", pctPortfolio: 8.2, sharesM: null, valueB: null, action: "Hold", quarterReported: "Q4 2024", notes: "Azure + Office 365 recurring revenue. Copilot AI integration. Classic Fundsmith quality compounder." },
      { ticker: "GOOGL", name: "Alphabet", sector: "Technology", pctPortfolio: 7.6, sharesM: null, valueB: null, action: "Hold", quarterReported: "Q4 2024", notes: "Search monopoly + YouTube + Google Cloud. Bought at what Smith called 'bargain' prices." },
      { ticker: "NVDA", name: "NVIDIA", sector: "Technology", pctPortfolio: 6.8, sharesM: null, valueB: null, action: "Add", quarterReported: "Q4 2024", notes: "Added throughout 2024. CUDA ecosystem is the key moat. Best ROIC in semiconductors." },
      { ticker: "LLY", name: "Eli Lilly", sector: "Healthcare", pctPortfolio: 6.4, sharesM: null, valueB: null, action: "Hold", quarterReported: "Q4 2024", notes: "GLP-1 (Mounjaro/Zepbound) dominance. Pipeline depth. Pricing power in pharma." },
      { ticker: "IDEXY", name: "IDEXX Laboratories", sector: "Healthcare", pctPortfolio: 5.9, sharesM: null, valueB: null, action: "Hold", quarterReported: "Q4 2024", notes: "Veterinary diagnostics monopoly. Recurring consumables. Classic Fundsmith 'picks and shovels' moat." },
      { ticker: "POOL", name: "Pool Corporation", sector: "Industrials", pctPortfolio: 5.1, sharesM: null, valueB: null, action: "Hold", quarterReported: "Q4 2024", notes: "Pool supply distribution monopoly. 60% market share. Recurring maintenance consumables." },
      { ticker: "ADP", name: "Automatic Data Processing", sector: "Technology", pctPortfolio: 4.8, sharesM: null, valueB: null, action: "Hold", quarterReported: "Q4 2024", notes: "Payroll processing with massive switching costs. Float income. Boring but exceptional compounder." },
      { ticker: "ODFL", name: "Old Dominion Freight", sector: "Industrials", pctPortfolio: 4.2, sharesM: null, valueB: null, action: "Hold", quarterReported: "Q4 2024", notes: "Best-in-class LTL trucking with highest margins in industry. Service quality moat." },
    ],
  },
  {
    id: "mohnish-pabrai",
    name: "Mohnish Pabrai",
    firm: "Dalal Street, LLC",
    style: "Deep value, Buffett/Munger disciple, concentrated bets",
    aum: "$326.75M reported 13-F securities",
    philosophy: "Heads I win, tails I don't lose much. Seeks situations with asymmetric upside. Heavily influenced by Buffett and Munger. Runs very concentrated portfolios (5-10 names). Copies great investors (cloning).",
    asOf: "Q2 2026 (holdings June 30; filed Aug 13, 2026; US-listed securities only)",
    reportingPeriod: "2026-Q2",
    filingSource: "SEC Form 13F-HR · Dalal Street, LLC · CIK 0001549575",
    filingUrl: "https://www.sec.gov/Archives/edgar/data/1549575/000154957526000015/0001549575-26-000015-index.html",
    recentMoves: [
      secMove("HCC", "93627C101", "Warrior Met Coal", "Reduce", 1.810831, 1.74405, 39.89, 43.32),
      secMove("RIG", "H8817H100", "Transocean", "Add", 20.392672, 20.398659, 31.97, 30.53),
      secMove("AMR", "020764106", "Alpha Metallurgical Resources", "Reduce", 0.579738, 0.517194, 28.14, 26.11),
    ],
    holdings: [
      secHolding("HCC", "93627C101", "Warrior Met Coal", "Materials", 43.32, 1.74405, 0.142, "Reduce"),
      secHolding("RIG", "H8817H100", "Transocean", "Energy", 30.53, 20.398659, 0.1, "Add"),
      secHolding("AMR", "020764106", "Alpha Metallurgical Resources", "Materials", 26.11, 0.517194, 0.085, "Reduce"),
      secHolding("KSPI", "48581R205", "Kaspi.kz ADR", "Financials", 0.05, 0.001702, 0.00015, "New"),
    ],
  },
  {
    id: "li-lu",
    name: "Li Lu",
    firm: "Himalaya Capital",
    style: "Concentrated, long-term, deep Asia expertise",
    aum: "$3.70B reported 13-F securities",
    philosophy: "Charlie Munger's chosen successor and protégé. Highly concentrated, very long holding periods. Deep expertise in Chinese and Korean businesses. Seeks businesses with durable moats in large markets.",
    asOf: "Q2 2026 (holdings June 30; filed Aug 14, 2026; US-listed securities only)",
    reportingPeriod: "2026-Q2",
    filingSource: "SEC Form 13F-HR · Himalaya Capital Management LLC · CIK 0001709323",
    filingUrl: "https://www.sec.gov/Archives/edgar/data/1709323/000204358526000022/0002043585-26-000022-index.html",
    recentMoves: [
      secMove("PDD", "722304102", "PDD Holdings ADR", "Add", 4.608, 10.761119, 14.71, 22.17),
      secMove("BRK.B", "084670702", "Berkshire Hathaway Class B", "Add", 0.897749, 1.108318, 13.44, 14.98),
      secMove("BAC", "060505104", "Bank of America", "Exit", 2.997987, 0, 4.57, 0),
      secMove("OXY", "674599105", "Occidental Petroleum", "Exit", 1.4665, 0, 2.98, 0),
      secMove("SPGI", "78409V104", "S&P Global", "Exit", 0.121463, 0, 1.61, 0),
      secMove("HRB", "093671105", "H&R Block", "Exit", 1.626906, 0, 1.61, 0),
      secMove("MCO", "615369105", "Moody's", "Exit", 0.117784, 0, 1.61, 0),
      secMove("MSCI", "55354G100", "MSCI", "Exit", 0.018939, 0, 0.32, 0),
    ],
    holdings: [
      secHolding("GOOGL", "02079K305", "Alphabet Class A", "Communication Services", 24.55, 2.5433, 0.909, "Hold"),
      secHolding("GOOG", "02079K107", "Alphabet Class C", "Communication Services", 23.39, 2.4513, 0.866, "Hold"),
      secHolding("PDD", "722304102", "PDD Holdings ADR", "Consumer Discretionary", 22.17, 10.761119, 0.821, "Add"),
      secHolding("BRK.B", "084670702", "Berkshire Hathaway Class B", "Financials", 14.98, 1.108318, 0.555, "Add"),
      secHolding("EWBC", "27579R104", "East West Bancorp", "Financials", 9.68, 2.776351, 0.358, "Hold"),
      secHolding("CROX", "227046109", "Crocs", "Consumer Discretionary", 2.89, 0.887093, 0.107, "Hold"),
      secHolding("TME", "88034P109", "Tencent Music Entertainment ADR", "Communication Services", 1.49, 6.590836, 0.055, "Hold"),
      secHolding("AAPL", "037833100", "Apple", "Technology", 0.86, 0.1106, 0.032, "Hold"),
    ],
  },
  {
    id: "chris-hohn",
    name: "Chris Hohn",
    firm: "TCI Fund Management",
    style: "Concentrated quality-growth, activist engagement, long holding periods",
    aum: "$52.77B reported 13-F securities",
    philosophy: "TCI typically concentrates in high-quality businesses with strong competitive positions and can use active engagement when it believes governance, strategy, or capital allocation can improve.",
    asOf: "Q2 2026 (holdings June 30; filed Aug 14, 2026; US-listed securities only)",
    reportingPeriod: "2026-Q2",
    filingSource: "SEC Form 13F-HR · TCI Fund Management Ltd · CIK 0001647251",
    filingUrl: "https://www.sec.gov/Archives/edgar/data/1647251/000164725126000007/0001647251-26-000007-index.html",
    recentMoves: [
      secMove("GE", "369604301", "GE Aerospace", "Reduce", 47.510431, 47.428233, 29.85, 33.59),
      secMove("V", "92826C839", "Visa", "Add", 30.468133, 30.494133, 20.39, 19.83),
      secMove("SPGI", "78409V104", "S&P Global", "Add", 14.03531, 14.081957, 13.22, 10.87),
      secMove("CP", "13646K108", "Canadian Pacific Kansas City", "Reduce", 46.521923, 45.325726, 8.1, 7.44),
      secMove("GOOG", "02079K107", "Alphabet Class C", "Add", 8.854019, 9.938819, 5.62, 6.65),
      secMove("FER", "N3168P101", "Ferrovial", "Add", 20.740214, 20.940441, 2.94, 2.72),
      secMove("CNI", "136375102", "Canadian National Railway", "Reduce", 9.849934, 9.433422, 2.24, 2.13),
      secMove("MSFT", "594918104", "Microsoft", "Exit", 2.728412, 0, 2.24, 0),
      secMove("MLM", "573284106", "Martin Marietta Materials", "New", 0, 1.315109, 0, 1.44),
      secMove("VMC", "929160109", "Vulcan Materials", "New", 0, 2.447004, 0, 1.37),
    ],
    holdings: [
      secHolding("GE", "369604301", "GE Aerospace", "Industrials", 33.59, 47.428233, 17.725, "Reduce"),
      secHolding("V", "92826C839", "Visa", "Financials", 19.83, 30.494133, 10.462, "Add"),
      secHolding("MCO", "615369105", "Moody's", "Financials", 12.3, 14.334027, 6.492, "Hold"),
      secHolding("SPGI", "78409V104", "S&P Global", "Financials", 10.87, 14.081957, 5.735, "Add"),
      secHolding("CP", "13646K108", "Canadian Pacific Kansas City", "Industrials", 7.44, 45.325726, 3.926, "Reduce"),
      secHolding("GOOG", "02079K107", "Alphabet Class C", "Communication Services", 6.65, 9.938819, 3.512, "Add"),
      secHolding("FER", "N3168P101", "Ferrovial", "Industrials", 2.72, 20.940441, 1.435, "Add"),
      secHolding("CNI", "136375102", "Canadian National Railway", "Industrials", 2.13, 9.433422, 1.125, "Reduce"),
      secHolding("GOOGL", "02079K305", "Alphabet Class A", "Communication Services", 1.66, 2.457, 0.878, "Hold"),
      secHolding("MLM", "573284106", "Martin Marietta Materials", "Materials", 1.44, 1.315109, 0.758, "New"),
    ],
  },
  {
    id: "valueact-capital",
    name: "ValueAct Capital",
    firm: "ValueAct Holdings, L.P.",
    style: "Constructive activist, concentrated, business-model and governance focused",
    aum: "$5.63B reported 13-F securities",
    philosophy: "ValueAct generally builds concentrated positions and seeks long-term value creation through private, constructive engagement with boards and management teams.",
    asOf: "Q2 2026 (holdings June 30; filed Aug 14, 2026; US-listed securities only)",
    reportingPeriod: "2026-Q2",
    filingSource: "SEC Form 13F-HR · ValueAct Holdings, L.P. · CIK 0001418814",
    filingUrl: "https://www.sec.gov/Archives/edgar/data/1418814/000141881426000003/0001418814-26-000003-index.html",
    recentMoves: [
      secMove("AMZN", "023135106", "Amazon", "Add", 2.8846, 2.9417, 10.52, 12.44),
      secMove("RKT", "77311W101", "Rocket Companies", "Add", 28.214724, 41.668774, 7.04, 11.65),
      secMove("BLK", "09290D101", "BlackRock", "Add", 0.5461, 0.5817, 9.19, 9.93),
      secMove("TOST", "888787108", "Toast", "Add", 12.895438, 14.134038, 5.98, 6.98),
      secMove("LLYVK", "530909308", "Liberty Live Holdings Series C", "Reduce", 3.561208, 2.172388, 5.87, 4.07),
      secMove("KKR", "48251W104", "KKR", "Add", 3.2797, 3.5582, 5.31, 5.8),
      secMove("RBLX", "771049103", "Roblox", "Reduce", 5.848621, 3.147421, 5.79, 3.04),
      secMove("MDB", "60937P106", "MongoDB", "Reduce", 1.0378, 0.1657, 4.45, 0.99),
      secMove("SPOT", "L8681T102", "Spotify", "Add", 0.3585, 0.5268, 3.04, 4.29),
      secMove("SSD", "829073105", "Simpson Manufacturing", "Reduce", 1.398042, 0.830642, 4.2, 3.09),
      secMove("DIS", "254687106", "Walt Disney", "Exit", 0.400231, 0, 0.68, 0),
      secMove("PAYP", "70450C101", "PayPay", "New", 0, 2.1548, 0, 0.55),
    ],
    holdings: [
      secHolding("V", "92826C839", "Visa", "Financials", 14.1, 2.31625, 0.795, "Hold"),
      secHolding("AMZN", "023135106", "Amazon", "Consumer Discretionary", 12.44, 2.9417, 0.701, "Add"),
      secHolding("RKT", "77311W101", "Rocket Companies", "Financials", 11.65, 41.668774, 0.656, "Add"),
      secHolding("BLK", "09290D101", "BlackRock", "Financials", 9.93, 0.5817, 0.559, "Add"),
      secHolding("META", "30303M102", "Meta Platforms", "Communication Services", 9.15, 0.915674, 0.516, "Hold"),
      secHolding("CRM", "79466L302", "Salesforce", "Technology", 8.33, 2.994509, 0.469, "Hold"),
      secHolding("TOST", "888787108", "Toast", "Technology", 6.98, 14.134038, 0.393, "Add"),
      secHolding("KKR", "48251W104", "KKR", "Financials", 5.8, 3.5582, 0.327, "Add"),
      secHolding("SPOT", "L8681T102", "Spotify", "Communication Services", 4.29, 0.5268, 0.242, "Add"),
      secHolding("LLYVK", "530909308", "Liberty Live Holdings Series C", "Communication Services", 4.07, 2.172388, 0.229, "Reduce"),
    ],
  },
  {
    id: "david-einhorn",
    name: "David Einhorn",
    firm: "DME Capital Management / Greenlight",
    style: "Fundamental value, long/short, catalyst and downside focused",
    aum: "$3.91B reported 13-F securities",
    philosophy: "Einhorn is associated with detailed fundamental work, skepticism toward consensus narratives, and positions where valuation, catalysts, and downside protection can create an asymmetric payoff.",
    asOf: "Q2 2026 (holdings June 30; filed Aug 14, 2026; long US-listed 13-F securities only)",
    reportingPeriod: "2026-Q2",
    filingSource: "SEC Form 13F-HR · DME Capital Management, LP · CIK 0001489933",
    filingUrl: "https://www.sec.gov/Archives/edgar/data/1489933/000117266126003786/0001172661-26-003786-index.html",
    recentMoves: [
      secMove("FLR", "343412102", "Fluor", "Reduce", 4.74735, 4.65875, 6.94, 6.24),
      secMove("CNR", "218937100", "Core Natural Resources", "Add", 1.85814, 2.2832, 6.1, 4.67),
      secMove("VSNT", "925283103", "Versant Media Group", "Reduce", 3.028615, 1.922172, 3.51, 1.77),
      secMove("ACHC", "00404A109", "Acadia Healthcare", "Reduce", 4.518381, 4.400641, 3.31, 3.32),
      secMove("VSCO", "926400102", "Victoria's Secret", "Exit", 2.256889, 0, 3.28, 0),
      secMove("PENN", "707569109", "PENN Entertainment", "Reduce", 6.04444, 5.86027, 2.85, 3.2),
      secMove("FBIN", "34964C106", "Fortune Brands Innovations", "New", 0, 2.241875, 0, 3.15),
      secMove("DHT", "Y2065G121", "DHT Holdings", "Reduce", 5.27277, 5.03432, 3.02, 2.13),
      secMove("GPK", "388689101", "Graphic Packaging", "Add", 9.09998, 9.95343, 2.83, 2.69),
      secMove("CNC", "15135B101", "Centene", "Reduce", 2.73181, 1.65115, 2.8, 2.71),
    ],
    holdings: [
      secHolding("GRBK", "392709101", "Green Brick Partners", "Real Estate", 19.39, 9.467383, 0.758, "Hold"),
      secHolding("FLR", "343412102", "Fluor", "Industrials", 6.24, 4.65875, 0.244, "Reduce"),
      secHolding("CNR", "218937100", "Core Natural Resources", "Materials", 4.67, 2.2832, 0.183, "Add"),
      secHolding("BHF", "10922N103", "Brighthouse Financial", "Financials", 4.6, 2.8421, 0.18, "Hold"),
      secHolding("ACHC", "00404A109", "Acadia Healthcare", "Healthcare", 3.32, 4.400641, 0.13, "Reduce"),
      secHolding("PENN", "707569109", "PENN Entertainment", "Consumer Discretionary", 3.2, 5.86027, 0.125, "Reduce"),
      secHolding("FBIN", "34964C106", "Fortune Brands Innovations", "Industrials", 3.15, 2.241875, 0.123, "New"),
      secHolding("PCG", "69331C108", "PG&E", "Utilities", 2.85, 6.632852, 0.112, "Hold"),
      secHolding("CNC", "15135B101", "Centene", "Healthcare", 2.71, 1.65115, 0.106, "Reduce"),
      secHolding("GPK", "388689101", "Graphic Packaging", "Materials", 2.69, 9.95343, 0.105, "Add"),
    ],
  },
  {
    id: "joel-greenblatt",
    name: "Joel Greenblatt",
    firm: "Gotham Asset Management",
    style: "Systematic value and quality, diversified long/short strategies",
    aum: "$42.96B reported 13-F securities",
    philosophy: "Gotham applies systematic measures of business quality and valuation across broad portfolios. Its filing reflects firm strategies and fund exposures, not a short list of Greenblatt's personal stock picks.",
    asOf: "Q2 2026 (holdings June 30; filed Aug 14, 2026; long 13-F side only)",
    reportingPeriod: "2026-Q2",
    filingSource: "SEC Form 13F-HR · Gotham Asset Management, LLC · CIK 0001510387",
    filingUrl: "https://www.sec.gov/Archives/edgar/data/1510387/000139834426014644/0001398344-26-014644-index.html",
    recentMoves: [
      secMove("SPY", "78462F103", "SPDR S&P 500 ETF Trust", "Add", 9.005674, 11.393386, 17.94, 19.8),
      secMove("AAPL", "037833100", "Apple", "Reduce", 2.87325, 2.8605, 2.23, 1.93),
      secMove("NVDA", "67066G104", "NVIDIA", "Reduce", 4.132873, 4.018967, 2.21, 1.87),
      secMove("GSPY", "886364835", "Gotham Enhanced 500 ETF", "Reduce", 16.976096, 16.966988, 1.84, 1.6),
      secMove("IVV", "464287200", "iShares Core S&P 500 ETF", "Add", 0.435384, 0.445224, 0.87, 0.78),
      secMove("SNOW", "833445109", "Snowflake", "Add", 0.99142, 1.031926, 0.46, 0.61),
      secMove("VTV", "922908744", "Vanguard Value ETF", "Add", 0.858103, 0.875457, 0.52, 0.44),
      secMove("VOO", "922908363", "Vanguard S&P 500 ETF", "Add", 0.276774, 0.286051, 0.51, 0.46),
      secMove("AMZN", "023135106", "Amazon", "Add", 0.789833, 0.839512, 0.5, 0.47),
      secMove("GOOGL", "02079K305", "Alphabet Class A", "Add", 0.549121, 0.554564, 0.48, 0.46),
    ],
    holdings: [
      secHolding("SPY", "78462F103", "SPDR S&P 500 ETF Trust", "ETF", 19.8, 11.393386, 8.508, "Add"),
      secHolding("AAPL", "037833100", "Apple", "Technology", 1.93, 2.8605, 0.828, "Reduce"),
      secHolding("NVDA", "67066G104", "NVIDIA", "Technology", 1.87, 4.018967, 0.804, "Reduce"),
      secHolding("GSPY", "886364835", "Gotham Enhanced 500 ETF", "ETF", 1.6, 16.966988, 0.689, "Reduce"),
      secHolding("IVV", "464287200", "iShares Core S&P 500 ETF", "ETF", 0.78, 0.445224, 0.333, "Add"),
      secHolding("SNOW", "833445109", "Snowflake", "Technology", 0.61, 1.031926, 0.263, "Add"),
      secHolding("AMZN", "023135106", "Amazon", "Consumer Discretionary", 0.47, 0.839512, 0.2, "Add"),
      secHolding("GOOGL", "02079K305", "Alphabet Class A", "Communication Services", 0.46, 0.554564, 0.198, "Add"),
      secHolding("VOO", "922908363", "Vanguard S&P 500 ETF", "ETF", 0.46, 0.286051, 0.196, "Add"),
      secHolding("VTV", "922908744", "Vanguard Value ETF", "ETF", 0.44, 0.875457, 0.191, "Add"),
    ],
  },
  {
    id: "mario-gabelli",
    name: "Mario Gabelli",
    firm: "GAMCO Investors",
    style: "Private-market-value methodology, catalysts, diversified research coverage",
    aum: "$11.15B reported 13-F securities",
    philosophy: "GAMCO is known for estimating private-market value and identifying catalysts that may close the gap to public-market price. The filing is a large institutional portfolio, not a personal model portfolio.",
    asOf: "Q2 2026 (holdings June 30; filed July 27, 2026; US-listed securities only)",
    reportingPeriod: "2026-Q2",
    filingSource: "SEC Form 13F-HR · GAMCO Investors, Inc. et al · CIK 0000807249",
    filingUrl: "https://www.sec.gov/Archives/edgar/data/807249/000114036126032508/0001140361-26-032508-index.html",
    recentMoves: [
      secMove("MSGS", "55825T103", "Madison Square Garden Sports", "Add", 0.587652, 0.589128, 1.86, 2.12),
      secMove("CR", "224408104", "Crane", "Reduce", 0.998391, 0.978953, 1.68, 1.96),
      secMove("GATX", "361448103", "GATX", "Reduce", 1.100973, 1.054962, 1.85, 1.68),
      secMove("MLI", "624756102", "Mueller Industries", "Reduce", 1.63751, 1.54215, 1.79, 1.7),
      secMove("WTS", "942749102", "Watts Water Technologies", "Reduce", 0.404093, 0.399032, 1.16, 1.4),
      secMove("BK", "064058100", "Bank of New York Mellon", "Reduce", 1.043081, 0.976858, 1.22, 1.27),
      secMove("NFG", "636180101", "National Fuel Gas", "Add", 1.369326, 1.370347, 1.27, 0.95),
      secMove("HRI", "42704L104", "Herc Holdings", "Add", 0.973141, 0.976739, 0.95, 1.26),
      secMove("SPHR", "55826T102", "Sphere Entertainment", "Reduce", 0.794755, 0.765913, 0.92, 1.19),
      secMove("AME", "031100100", "AMETEK", "Reduce", 0.548597, 0.544372, 1.16, 1.18),
    ],
    holdings: [
      secHolding("MSGS", "55825T103", "Madison Square Garden Sports", "Communication Services", 2.12, 0.589128, 0.237, "Add"),
      secHolding("CR", "224408104", "Crane", "Industrials", 1.96, 0.978953, 0.218, "Reduce"),
      secHolding("MLI", "624756102", "Mueller Industries", "Industrials", 1.7, 1.54215, 0.19, "Reduce"),
      secHolding("GATX", "361448103", "GATX", "Industrials", 1.68, 1.054962, 0.187, "Reduce"),
      secHolding("WTS", "942749102", "Watts Water Technologies", "Industrials", 1.4, 0.399032, 0.156, "Reduce"),
      secHolding("BK", "064058100", "Bank of New York Mellon", "Financials", 1.27, 0.976858, 0.141, "Reduce"),
      secHolding("HRI", "42704L104", "Herc Holdings", "Industrials", 1.26, 0.976739, 0.14, "Add"),
      secHolding("SPHR", "55826T102", "Sphere Entertainment", "Communication Services", 1.19, 0.765913, 0.133, "Reduce"),
      secHolding("AME", "031100100", "AMETEK", "Industrials", 1.18, 0.544372, 0.132, "Reduce"),
      secHolding("AXP", "025816109", "American Express", "Financials", 1.18, 0.388962, 0.132, "Reduce"),
    ],
  },
  {
    id: "ray-dalio",
    name: "Ray Dalio / Bridgewater",
    firm: "Bridgewater Associates",
    style: "Systematic macro and risk balancing — not conventional value investing",
    aum: "$24.38B reported 13-F securities",
    philosophy: "This card tracks Bridgewater, the firm Ray Dalio founded. It should be read as an institutional systematic portfolio snapshot, not as Dalio's personal purchases or a traditional value-investor endorsement.",
    asOf: "Q2 2026 (holdings June 30; filed Aug 14, 2026; long US-listed 13-F securities only)",
    reportingPeriod: "2026-Q2",
    filingSource: "SEC Form 13F-HR · Bridgewater Associates, LP · CIK 0001350694",
    filingUrl: "https://www.sec.gov/Archives/edgar/data/1350694/000135069426000003/0001350694-26-000003-index.html",
    recentMoves: [
      secMove("SPY", "78462F103", "SPDR S&P 500 ETF Trust", "Add", 4.364862, 5.320308, 12.67, 16.3),
      secMove("IVV", "464287200", "iShares Core S&P 500 ETF", "Add", 2.679084, 3.002286, 7.81, 9.22),
      secMove("AMZN", "023135106", "Amazon", "Reduce", 4.388711, 2.025481, 4.08, 1.98),
      secMove("NVDA", "67066G104", "NVIDIA", "Reduce", 4.693003, 3.866195, 3.65, 3.17),
      secMove("GOOGL", "02079K305", "Alphabet Class A", "Reduce", 1.997674, 1.322176, 2.56, 1.94),
      secMove("AVGO", "11135F101", "Broadcom", "Reduce", 1.83538, 1.317923, 2.54, 2.04),
      secMove("MU", "595112103", "Micron Technology", "Reduce", 1.475704, 0.116666, 2.23, 0.55),
      secMove("MSFT", "594918104", "Microsoft", "Reduce", 1.084979, 0.711896, 1.79, 1.09),
      secMove("GEV", "36828A101", "GE Vernova", "Reduce", 0.434897, 0.122768, 1.69, 0.59),
      secMove("LRCX", "512807306", "Lam Research", "Reduce", 1.571229, 0.938224, 1.5, 1.67),
      secMove("TSM", "874039100", "Taiwan Semiconductor ADR", "Reduce", 1.077079, 0.034525, 1.62, 0.07),
      secMove("VOO", "922908363", "Vanguard S&P 500 ETF", "Add", 0.158628, 0.458381, 0.42, 1.29),
      secMove("AMD", "007903107", "Advanced Micro Devices", "Reduce", 1.292767, 0.538632, 1.17, 1.28),
      secMove("EWY", "464286772", "iShares MSCI South Korea ETF", "Reduce", 1.766264, 1.384772, 0.97, 1.15),
    ],
    holdings: [
      secHolding("SPY", "78462F103", "SPDR S&P 500 ETF Trust", "ETF", 16.3, 5.320308, 3.973, "Add"),
      secHolding("IVV", "464287200", "iShares Core S&P 500 ETF", "ETF", 9.22, 3.002286, 2.248, "Add"),
      secHolding("NVDA", "67066G104", "NVIDIA", "Technology", 3.17, 3.866195, 0.774, "Reduce"),
      secHolding("AVGO", "11135F101", "Broadcom", "Technology", 2.04, 1.317923, 0.498, "Reduce"),
      secHolding("AMZN", "023135106", "Amazon", "Consumer Discretionary", 1.98, 2.025481, 0.483, "Reduce"),
      secHolding("GOOGL", "02079K305", "Alphabet Class A", "Communication Services", 1.94, 1.322176, 0.473, "Reduce"),
      secHolding("LRCX", "512807306", "Lam Research", "Technology", 1.67, 0.938224, 0.407, "Reduce"),
      secHolding("VOO", "922908363", "Vanguard S&P 500 ETF", "ETF", 1.29, 0.458381, 0.315, "Add"),
      secHolding("AMD", "007903107", "Advanced Micro Devices", "Technology", 1.28, 0.538632, 0.313, "Reduce"),
      secHolding("EWY", "464286772", "iShares MSCI South Korea ETF", "ETF", 1.15, 1.384772, 0.28, "Reduce"),
    ],
  },
];

function withMovePriceContext(guru: GuruProfile): GuruProfile {
  const holdingsByCusip = new Map(
    guru.holdings.flatMap((holding) => (holding.cusip ? [[holding.cusip, holding]] : [])),
  );
  const holdingsByTicker = new Map(guru.holdings.map((holding) => [holding.ticker, holding]));
  const recentMoves = guru.recentMoves?.map((move) => {
    const holding = holdingsByCusip.get(move.cusip) ?? holdingsByTicker.get(move.ticker);
    const approximatePrice = approximateQuarterEndPrice(
      holding?.valueB ?? null,
      holding?.sharesM ?? null,
    );
    return {
      ...move,
      approximatePrice,
      priceBasis: approximatePrice ? priceBasis(move.action) : "No quarter-end price approximation is available for this move.",
    };
  });
  return { ...guru, recentMoves };
}

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("view") === "consensus") {
    return NextResponse.json({
      reportingPeriod: "2026-Q2",
      sourceCatalog: "Stockcircle value-investor directory",
      sourceCatalogUrl: "https://stockcircle.com/value-investors",
      includedManagers: ["Berkshire Hathaway", "Appaloosa", "Himalaya Capital", "Dalal Street", "Pershing Square", "TCI Fund Management", "ValueAct Capital", "DME Capital Management", "Gotham Asset Management", "GAMCO Investors", "Bridgewater Associates"],
      methodology: "SEC 13-F share-count changes from Q1 to Q2 2026. A material change is at least 0.25% of either quarter's reported value. Counts represent managers, not dollars. The All signals view sorts by net buyers minus sellers, high to low.",
      rows: [...CONSENSUS_ACTIVITY].sort((a, b) =>
        b.net - a.net
          || b.buyers.length - a.buyers.length
          || a.name.localeCompare(b.name),
      ),
    });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const guru = GURU_PORTFOLIOS.find((g) => g.id === id);
    if (!guru) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(withMovePriceContext(guru));
  }
  return NextResponse.json(
    GURU_PORTFOLIOS.map(
      ({ id, name, firm, style, aum, philosophy, filingSource, filingUrl, asOf, reportingPeriod }) => ({
        id,
        name,
        firm,
        style,
        aum,
        philosophy,
        filingSource,
        filingUrl,
        asOf,
        reportingPeriod,
      }),
    ),
  );
}
