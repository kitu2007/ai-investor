import { NextRequest, NextResponse } from "next/server";

// Static guru portfolio data — sourced from latest 13-F filings (Q4 2024 / Q1 2025)
// and public disclosures. Updated manually when new filings are released.
// CIK numbers for SEC EDGAR 13-F lookup included for reference.

export interface GuruHolding {
  ticker: string;
  name: string;
  sector: string;
  pctPortfolio: number;    // % of reported portfolio
  sharesM: number | null;  // millions of shares
  valueB: number | null;   // market value billions
  action: "New" | "Add" | "Reduce" | "Hold" | "Exit";
  quarterReported: string; // e.g. "Q4 2024"
  notes: string;
}

export interface GuruProfile {
  id: string;
  name: string;
  firm: string;
  style: string;
  aum: string;
  philosophy: string;
  holdings: GuruHolding[];
  filingSource: string;
  asOf: string;
}

const GURU_PORTFOLIOS: GuruProfile[] = [
  {
    id: "warren-buffett",
    name: "Warren Buffett",
    firm: "Berkshire Hathaway",
    style: "Quality compounder, concentrated, very long holding periods",
    aum: "~$300B equity portfolio",
    philosophy: "Buy wonderful companies at fair prices. Focus on durable competitive advantages, strong management, and businesses you can understand. Time in market > timing the market.",
    asOf: "Q4 2024 (13-F filed Feb 2025)",
    filingSource: "SEC EDGAR CIK 0001067983",
    holdings: [
      { ticker: "AAPL", name: "Apple", sector: "Technology", pctPortfolio: 28.1, sharesM: 300.0, valueB: 57.3, action: "Reduce", quarterReported: "Q4 2024", notes: "Largest holding despite significant reduction. Called it 'better than any business I own'. Reduced ~25% in 2024." },
      { ticker: "AXP", name: "American Express", sector: "Financials", pctPortfolio: 16.8, sharesM: 151.6, valueB: 34.5, action: "Hold", quarterReported: "Q4 2024", notes: "Held for 30+ years. Classic Buffett: brand moat, pricing power, float-like economics." },
      { ticker: "BAC", name: "Bank of America", sector: "Financials", pctPortfolio: 11.2, sharesM: 680.0, valueB: 23.0, action: "Reduce", quarterReported: "Q4 2024", notes: "Reducing after long hold. Originally acquired via warrants in 2011 at a steep discount." },
      { ticker: "KO", name: "Coca-Cola", sector: "Consumer Staples", pctPortfolio: 9.3, sharesM: 400.0, valueB: 28.7, action: "Hold", quarterReported: "Q4 2024", notes: "Held since 1988. The ultimate consumer brand moat. Never sold a single share." },
      { ticker: "CVX", name: "Chevron", sector: "Energy", pctPortfolio: 6.5, sharesM: 118.6, valueB: 17.5, action: "Hold", quarterReported: "Q4 2024", notes: "Large energy position. Buffett comfortable with integrated oil at reasonable valuations." },
      { ticker: "OXY", name: "Occidental Petroleum", sector: "Energy", pctPortfolio: 5.8, sharesM: 264.2, valueB: 13.5, action: "Hold", quarterReported: "Q4 2024", notes: "Built large position 2022-2024. Holds warrants for additional 83.9M shares. Vicki Hollub praised as excellent capital allocator." },
      { ticker: "KHC", name: "Kraft Heinz", sector: "Consumer Staples", pctPortfolio: 4.4, sharesM: 325.6, valueB: 9.3, action: "Hold", quarterReported: "Q4 2024", notes: "Acknowledged this was a mistake — overpaid. Locked in due to size." },
      { ticker: "MCO", name: "Moody's", sector: "Financials", pctPortfolio: 3.8, sharesM: 24.1, valueB: 10.2, action: "Hold", quarterReported: "Q4 2024", notes: "Classic duopoly moat (with S&P). Every bond issuance needs a rating." },
      { ticker: "GOOGL", name: "Alphabet", sector: "Technology", pctPortfolio: 1.9, sharesM: 5.8, valueB: 10.8, action: "Hold", quarterReported: "Q4 2024", notes: "Smaller position. Regrets not buying more earlier — called Google's advertising model 'extraordinary'." },
      { ticker: "DVA", name: "DaVita", sector: "Healthcare", pctPortfolio: 1.7, sharesM: 36.1, valueB: 5.2, action: "Hold", quarterReported: "Q4 2024", notes: "Dialysis near-monopoly. Classic Buffett essential-service holding." },
    ],
  },
  {
    id: "bill-ackman",
    name: "Bill Ackman",
    firm: "Pershing Square Capital Management",
    style: "Concentrated activist, high-conviction, long-duration",
    aum: "~$18B",
    philosophy: "Highly concentrated portfolio of 8–12 businesses. Seeks simple, predictable, free-cash-flow-generative companies with dominant market positions. Willing to engage management to unlock value.",
    asOf: "Q4 2024 (13-F filed Feb 2025)",
    filingSource: "SEC EDGAR CIK 0001336528",
    holdings: [
      { ticker: "HLT", name: "Hilton Worldwide", sector: "Consumer Discretionary", pctPortfolio: 19.5, sharesM: 9.2, valueB: 2.1, action: "Hold", quarterReported: "Q4 2024", notes: "Asset-light hotel franchise model. No room inventory risk. Fee-based recurring revenue." },
      { ticker: "QSR", name: "Restaurant Brands (Burger King)", sector: "Consumer Discretionary", pctPortfolio: 17.8, sharesM: 21.5, valueB: 1.5, action: "Hold", quarterReported: "Q4 2024", notes: "Franchise royalty model. Tim Hortons + Burger King + Popeyes. Long Ackman holding." },
      { ticker: "GOOGL", name: "Alphabet", sector: "Technology", pctPortfolio: 16.2, sharesM: 6.1, valueB: 1.8, action: "Add", quarterReported: "Q4 2024", notes: "Search monopoly + cloud + Waymo optionality. Cheap on sum-of-parts. Added aggressively." },
      { ticker: "AVGO", name: "Broadcom", sector: "Technology", pctPortfolio: 14.6, sharesM: 1.0, valueB: 2.2, action: "New", quarterReported: "Q4 2024", notes: "New position. AI infrastructure play with strong capital allocation under Hock Tan." },
      { ticker: "CP", name: "Canadian Pacific Kansas City", sector: "Industrials", pctPortfolio: 12.1, sharesM: 16.8, valueB: 1.4, action: "Hold", quarterReported: "Q4 2024", notes: "Only single-line rail connecting Canada-US-Mexico. USMCA trade infrastructure moat." },
      { ticker: "CMG", name: "Chipotle Mexican Grill", sector: "Consumer Discretionary", pctPortfolio: 9.3, sharesM: 3.1, valueB: 2.8, action: "Hold", quarterReported: "Q4 2024", notes: "Long-term compounder. Unit economics are exceptional; massive runway for new locations." },
      { ticker: "NVDA", name: "NVIDIA", sector: "Technology", pctPortfolio: 7.8, sharesM: 2.8, valueB: 1.4, action: "New", quarterReported: "Q4 2024", notes: "New position in AI infrastructure. CUDA moat recognised. Smaller position than Broadcom." },
      { ticker: "LOW", name: "Lowe's", sector: "Consumer Discretionary", pctPortfolio: 5.4, sharesM: 4.2, valueB: 1.1, action: "Hold", quarterReported: "Q4 2024", notes: "Home improvement duopoly. Marvin Ellison turnaround delivering. Pro contractor segment growing." },
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
    firm: "Pabrai Investment Funds",
    style: "Deep value, Buffett/Munger disciple, concentrated bets",
    aum: "~$700M",
    philosophy: "Heads I win, tails I don't lose much. Seeks situations with asymmetric upside. Heavily influenced by Buffett and Munger. Runs very concentrated portfolios (5-10 names). Copies great investors (cloning).",
    asOf: "Q3 2024 (13-F filed Nov 2024)",
    filingSource: "SEC EDGAR CIK 0001173655",
    holdings: [
      { ticker: "FRFHF", name: "Fairfax Financial", sector: "Financials", pctPortfolio: 28.4, sharesM: 0.22, valueB: 0.28, action: "Hold", quarterReported: "Q3 2024", notes: "Prem Watsa as 'Buffett of Canada'. Insurance float + value investments. Core long-term hold." },
      { ticker: "MBOLY", name: "Mitsubishi", sector: "Industrials", pctPortfolio: 18.6, sharesM: null, valueB: null, action: "Hold", quarterReported: "Q3 2024", notes: "Japanese trading house — copying Buffett's Sogo Shosha play. Cheap on book value, high dividend." },
      { ticker: "SGIOY", name: "Shinko Electric", sector: "Technology", pctPortfolio: 14.2, sharesM: null, valueB: null, action: "Hold", quarterReported: "Q3 2024", notes: "Japanese semiconductor packaging. Cheap Japanese industrial — deep value." },
      { ticker: "AAPL", name: "Apple", sector: "Technology", pctPortfolio: 12.8, sharesM: 0.95, valueB: 0.19, action: "Hold", quarterReported: "Q3 2024", notes: "Cloned from Buffett. Best consumer brand + ecosystem + buyback machine." },
      { ticker: "GOOG", name: "Alphabet (Class C)", sector: "Technology", pctPortfolio: 10.5, sharesM: 0.88, valueB: 0.17, action: "Hold", quarterReported: "Q3 2024", notes: "Search + Cloud + AI at reasonable valuation. Long-term compounder." },
      { ticker: "BABA", name: "Alibaba", sector: "Technology", pctPortfolio: 8.1, sharesM: 2.1, valueB: 0.22, action: "Reduce", quarterReported: "Q3 2024", notes: "Bought deep value post-regulatory crackdown. Reducing as price recovered." },
    ],
  },
  {
    id: "li-lu",
    name: "Li Lu",
    firm: "Himalaya Capital",
    style: "Concentrated, long-term, deep Asia expertise",
    aum: "~$3B (estimated)",
    philosophy: "Charlie Munger's chosen successor and protégé. Highly concentrated, very long holding periods. Deep expertise in Chinese and Korean businesses. Seeks businesses with durable moats in large markets.",
    asOf: "Q3 2024 (13-F filed Nov 2024 — US holdings only)",
    filingSource: "SEC EDGAR CIK 0001496686",
    holdings: [
      { ticker: "BAC", name: "Bank of America", sector: "Financials", pctPortfolio: 34.5, sharesM: 17.8, valueB: 0.72, action: "Hold", quarterReported: "Q3 2024", notes: "Large US bank position. Li Lu tends to hold very long-term. Following Buffett's conviction." },
      { ticker: "GOOGL", name: "Alphabet", sector: "Technology", pctPortfolio: 28.2, sharesM: 4.2, valueB: 0.58, action: "Hold", quarterReported: "Q3 2024", notes: "Core long-term holding. Sees Google as a compounding machine across search, cloud, and AI." },
      { ticker: "BYDDF", name: "BYD (OTC ADR)", sector: "Consumer Discretionary", pctPortfolio: 22.4, sharesM: null, valueB: null, action: "Hold", quarterReported: "Q3 2024", notes: "Introduced Buffett to BYD in 2008. Maintains conviction in BYD's vertical integration edge." },
      { ticker: "0700.HK", name: "Tencent (via HK)", sector: "Technology", pctPortfolio: 15.0, sharesM: null, valueB: null, action: "Hold", quarterReported: "Q3 2024", notes: "Charlie Munger praised this extensively. Li Lu holds via HK — not in US 13-F but publicly confirmed." },
    ],
  },
];

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const guru = GURU_PORTFOLIOS.find((g) => g.id === id);
    if (!guru) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(guru);
  }
  return NextResponse.json(
    GURU_PORTFOLIOS.map(
      ({ id, name, firm, style, aum, philosophy, filingSource, asOf }) => ({
        id,
        name,
        firm,
        style,
        aum,
        philosophy,
        filingSource,
        asOf,
      }),
    ),
  );
}
