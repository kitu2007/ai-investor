import { NextRequest, NextResponse } from "next/server";

export type GrowthAction = "New" | "Add" | "Reduce" | "Hold" | "Exit";

export interface GrowthHolding {
  ticker: string;
  cusip: string;
  name: string;
  sector: string;
  pctPortfolio: number;
  sharesM: number;
  valueB: number;
  action: GrowthAction;
}

export interface GrowthMove {
  ticker: string;
  cusip: string;
  name: string;
  action: Exclude<GrowthAction, "Hold">;
  priorSharesM: number;
  currentSharesM: number;
  priorPctPortfolio: number;
  currentPctPortfolio: number;
  quarterReported: string;
  approximatePrice?: string;
  priceBasis?: string;
}

export interface GrowthInvestorProfile {
  id: string;
  name: string;
  firm: string;
  style: string;
  philosophy: string;
  reportedValue: string;
  asOf: string;
  filingSource: string;
  filingUrl: string;
  coverageNote?: string;
  holdings: GrowthHolding[];
  recentMoves: GrowthMove[];
}

const holding = (
  ticker: string,
  cusip: string,
  name: string,
  sector: string,
  pctPortfolio: number,
  sharesM: number,
  valueB: number,
  action: GrowthAction,
): GrowthHolding => ({ ticker, cusip, name, sector, pctPortfolio, sharesM, valueB, action });

const move = (
  ticker: string,
  cusip: string,
  name: string,
  action: GrowthMove["action"],
  priorSharesM: number,
  currentSharesM: number,
  priorPctPortfolio: number,
  currentPctPortfolio: number,
): GrowthMove => ({ ticker, cusip, name, action, priorSharesM, currentSharesM, priorPctPortfolio, currentPctPortfolio, quarterReported: "Q2 2026 vs Q1 2026" });

function approximateQuarterEndPrice(valueB: number | null, sharesM: number | null): string | undefined {
  if (!valueB || !sharesM) return undefined;
  return `~$${((valueB / sharesM) * 1000).toFixed(0)}`;
}

function priceBasis(action: GrowthMove["action"]): string {
  if (action === "New" || action === "Add") {
    return "Approximate Q2 2026 quarter-end price, not the investor's execution price.";
  }
  return "Approximate Q2 2026 remaining-position quarter-end price, not the investor's sale price.";
}

const GROWTH_INVESTORS: GrowthInvestorProfile[] = [
  {
    id: "cathie-wood-ark",
    name: "Cathie Wood",
    firm: "ARK Investment Management",
    style: "Disruptive innovation and long-duration growth",
    philosophy: "Concentrates on technology-enabled disruption across artificial intelligence, robotics, energy storage, genomic medicine, and digital assets. The portfolio can be highly volatile and valuation-sensitive.",
    reportedValue: "$15.40B reported 13-F securities",
    asOf: "Q2 2026 (holdings June 30; filed August 14, 2026)",
    filingSource: "SEC Form 13F-HR · ARK Investment Management LLC · CIK 0001697748",
    filingUrl: "https://www.sec.gov/Archives/edgar/data/1697748/000110465926096910/0001104659-26-096910-index.html",
    coverageNote: "ARK's filing includes securities across multiple strategies and funds. This view is the manager-level 13-F, not a single ARK ETF.",
    holdings: [
      holding("TSLA", "88160R101", "Tesla", "Consumer Discretionary", 7.54, 2.760, 1.161, "Reduce"),
      holding("AMD", "007903107", "Advanced Micro Devices", "Technology", 5.34, 1.416, 0.823, "Reduce"),
      holding("TEM", "88023B103", "Tempus AI", "Health Care", 3.77, 10.023, 0.581, "Add"),
      holding("HOOD", "770700102", "Robinhood Markets", "Financials", 3.41, 5.236, 0.525, "Reduce"),
      holding("CRSP", "H17182108", "CRISPR Therapeutics", "Health Care", 3.35, 9.461, 0.516, "Reduce"),
      holding("SHOP", "82509L107", "Shopify", "Technology", 3.08, 4.156, 0.475, "Reduce"),
      holding("TWST", "90184D100", "Twist Bioscience", "Health Care", 3.04, 4.550, 0.468, "Reduce"),
      holding("TXG", "88025U109", "10x Genomics", "Health Care", 2.49, 10.003, 0.384, "Reduce"),
      holding("AMZN", "023135106", "Amazon", "Consumer Discretionary", 2.46, 1.591, 0.379, "Add"),
      holding("PLTR", "69608A108", "Palantir Technologies", "Technology", 2.43, 3.212, 0.375, "Add"),
    ],
    recentMoves: [
      move("TSLA", "88160R101", "Tesla", "Reduce", 2.831, 2.760, 8.18, 7.54),
      move("AMD", "007903107", "Advanced Micro Devices", "Reduce", 2.713, 1.416, 4.29, 5.34),
      move("SPACEX", "84615Q103", "Space Exploration Technologies (private)", "New", 0, 4.478, 0, 4.97),
      move("CRSP", "H17182108", "CRISPR Therapeutics", "Reduce", 11.314, 9.461, 4.19, 3.35),
      move("SHOP", "82509L107", "Shopify", "Reduce", 4.178, 4.156, 3.85, 3.08),
      move("TEM", "88023B103", "Tempus AI", "Add", 9.608, 10.023, 3.38, 3.77),
      move("PLTR", "69608A108", "Palantir Technologies", "Add", 3.110, 3.212, 3.54, 2.43),
      move("HOOD", "770700102", "Robinhood Markets", "Reduce", 6.003, 5.236, 3.24, 3.41),
      move("COIN", "19260Q107", "Coinbase Global", "Add", 2.373, 2.511, 3.22, 2.38),
      move("ROKU", "77543R102", "Roku", "Reduce", 3.820, 0.596, 2.81, 0.53),
    ],
  },
  {
    id: "tiger-global",
    name: "Chase Coleman / Tiger Global",
    firm: "Tiger Global Management",
    style: "Internet, software, consumer technology, and global growth",
    philosophy: "Combines public and private growth investing with a focus on scalable technology and internet businesses. The 13-F shows only reportable US-listed long positions, not Tiger's private-company book.",
    reportedValue: "$23.98B reported 13-F securities",
    asOf: "Q2 2026 (holdings June 30; filed August 14, 2026)",
    filingSource: "SEC Form 13F-HR · Tiger Global Management LLC · CIK 0001167483",
    filingUrl: "https://www.sec.gov/Archives/edgar/data/1167483/000091957426005427/0000919574-26-005427-index.html",
    holdings: [
      holding("TSM", "874039100", "Taiwan Semiconductor ADR", "Technology", 9.72, 4.881, 2.331, "Reduce"),
      holding("AMZN", "023135106", "Amazon", "Consumer Discretionary", 9.62, 9.684, 2.308, "Reduce"),
      holding("NVDA", "67066G104", "NVIDIA", "Technology", 9.34, 11.199, 2.241, "Reduce"),
      holding("GOOGL", "02079K305", "Alphabet Class A", "Communication Services", 8.65, 5.806, 2.075, "Reduce"),
      holding("META", "30303M102", "Meta Platforms", "Communication Services", 6.63, 2.823, 1.590, "Reduce"),
      holding("LRCX", "512807306", "Lam Research", "Technology", 5.72, 3.163, 1.371, "Reduce"),
      holding("SE", "81141R100", "Sea Ltd ADR", "Communication Services", 5.02, 12.559, 1.204, "Reduce"),
      holding("AMAT", "038222105", "Applied Materials", "Technology", 4.92, 1.632, 1.180, "Reduce"),
      holding("GEV", "36828A101", "GE Vernova", "Industrials", 3.91, 0.798, 0.937, "Reduce"),
      holding("MSFT", "594918104", "Microsoft", "Technology", 3.53, 2.267, 0.846, "Reduce"),
    ],
    recentMoves: [
      move("GOOGL", "02079K305", "Alphabet Class A", "Reduce", 10.631, 5.806, 13.38, 8.65),
      move("TSM", "874039100", "Taiwan Semiconductor ADR", "Reduce", 5.565, 4.881, 8.23, 9.72),
      move("AMZN", "023135106", "Amazon", "Reduce", 10.000, 9.684, 9.12, 9.62),
      move("NVDA", "67066G104", "NVIDIA", "Reduce", 12.012, 11.199, 9.17, 9.34),
      move("META", "30303M102", "Meta Platforms", "Reduce", 3.087, 2.823, 7.73, 6.63),
      move("LRCX", "512807306", "Lam Research", "Reduce", 3.900, 3.163, 3.65, 5.72),
      move("SE", "81141R100", "Sea Ltd ADR", "Reduce", 15.416, 12.559, 5.59, 5.02),
      move("AVGO", "11135F101", "Broadcom", "Reduce", 3.585, 1.754, 4.86, 2.76),
      move("CPAY", "219948106", "Corpay", "Add", 1.752, 2.150, 2.23, 2.99),
      move("CBRS", "15675D103", "Cerebras Systems", "New", 0, 2.999, 0, 2.76),
    ],
  },
  {
    id: "pat-dorsey",
    name: "Pat Dorsey",
    firm: "Dorsey Asset Management",
    style: "Concentrated quality growth and economic moats",
    philosophy: "Looks for durable competitive advantages, strong incremental returns on capital, and long reinvestment runways. The concentrated portfolio makes position-level changes especially visible.",
    reportedValue: "$1.56B reported 13-F securities",
    asOf: "Q2 2026 (holdings June 30; filed August 14, 2026)",
    filingSource: "SEC Form 13F-HR · Dorsey Asset Management LLC · CIK 0001671657",
    filingUrl: "https://www.sec.gov/Archives/edgar/data/1671657/000139834426014470/0001398344-26-014470-index.html",
    coverageNote: "Raw share-count changes can be distorted by stock splits or other corporate actions. Treat unusually large changes as a prompt to verify, not as a standalone buy signal.",
    holdings: [
      holding("ASML", "N07059210", "ASML Holding", "Technology", 16.61, 0.130, 0.259, "Reduce"),
      holding("APP", "03831W108", "AppLovin", "Technology", 14.50, 0.439, 0.226, "Add"),
      holding("RPRX", "G7709Q104", "Royalty Pharma", "Health Care", 8.82, 2.457, 0.138, "Add"),
      holding("BKNG", "09857L108", "Booking Holdings", "Consumer Discretionary", 8.46, 0.742, 0.132, "Add"),
      holding("SPGI", "78409V104", "S&P Global", "Financials", 8.25, 0.316, 0.129, "Add"),
      holding("UBER", "90353T100", "Uber Technologies", "Industrials", 8.14, 1.762, 0.127, "Add"),
      holding("LYV", "538034109", "Live Nation Entertainment", "Communication Services", 7.69, 0.656, 0.120, "Add"),
      holding("DHR", "235851102", "Danaher", "Health Care", 7.64, 0.626, 0.119, "Add"),
      holding("META", "30303M102", "Meta Platforms", "Communication Services", 7.21, 0.200, 0.113, "Add"),
      holding("AER", "N00985106", "AerCap Holdings", "Industrials", 7.16, 0.767, 0.112, "Reduce"),
    ],
    recentMoves: [
      move("ASML", "N07059210", "ASML Holding", "Reduce", 0.140, 0.130, 14.76, 16.61),
      move("APP", "03831W108", "AppLovin", "Add", 0.317, 0.439, 10.04, 14.50),
      move("AER", "N00985106", "AerCap Holdings", "Reduce", 1.123, 0.767, 12.27, 7.16),
      move("SUNB", "866966104", "Sunbelt Rentals Holdings", "Reduce", 2.205, 1.151, 11.43, 5.51),
      move("RPRX", "G7709Q104", "Royalty Pharma", "Add", 2.277, 2.457, 8.70, 8.82),
      move("BKNG", "09857L108", "Booking Holdings", "Add", 0.016, 0.742, 5.51, 8.46),
      move("SPGI", "78409V104", "S&P Global", "Add", 0.223, 0.316, 7.54, 8.25),
      move("UBER", "90353T100", "Uber Technologies", "Add", 1.090, 1.762, 6.24, 8.14),
      move("LYV", "538034109", "Live Nation Entertainment", "Add", 0.608, 0.656, 7.38, 7.69),
      move("META", "30303M102", "Meta Platforms", "Add", 0.162, 0.200, 7.37, 7.21),
    ],
  },
  {
    id: "terry-smith-fundsmith",
    name: "Terry Smith",
    firm: "Fundsmith LLP",
    style: "High-quality global compounders bought to hold",
    philosophy: "Seeks good companies with high returns on operating capital, resilient cash generation, and repeatable growth, while avoiding weak balance sheets and businesses requiring excessive reinvestment.",
    reportedValue: "$13.65B reported 13-F securities",
    asOf: "Q2 2026 (holdings June 30; filed August 14, 2026; US-listed securities only)",
    filingSource: "SEC Form 13F-HR · Fundsmith LLP · CIK 0001569205",
    filingUrl: "https://www.sec.gov/Archives/edgar/data/1569205/000156920526000012/0001569205-26-000012-index.html",
    coverageNote: "Fundsmith is a global manager. Its 13-F omits non-US-listed ordinary shares and therefore is not the complete Fundsmith Equity Fund portfolio.",
    holdings: [
      holding("MAR", "571903202", "Marriott International", "Consumer Discretionary", 7.02, 2.586, 0.958, "Reduce"),
      holding("SYK", "863667101", "Stryker", "Health Care", 6.72, 2.914, 0.917, "Reduce"),
      holding("WAT", "941848103", "Waters", "Health Care", 6.25, 2.274, 0.853, "Reduce"),
      holding("V", "92826C839", "Visa", "Financials", 5.08, 2.020, 0.693, "Reduce"),
      holding("UBER", "90353T100", "Uber Technologies", "Industrials", 4.73, 8.943, 0.645, "New"),
      holding("MA", "57636Q104", "Mastercard", "Financials", 4.69, 1.245, 0.639, "New"),
      holding("GOOGL", "02079K305", "Alphabet Class A", "Communication Services", 4.64, 1.773, 0.634, "Reduce"),
      holding("CHD", "171340102", "Church & Dwight", "Consumer Staples", 4.58, 6.457, 0.626, "Reduce"),
      holding("PG", "742718109", "Procter & Gamble", "Consumer Staples", 4.38, 4.078, 0.598, "Reduce"),
      holding("MSFT", "594918104", "Microsoft", "Technology", 4.36, 1.597, 0.596, "Reduce"),
    ],
    recentMoves: [
      move("MAR", "571903202", "Marriott International", "Reduce", 3.371, 2.586, 8.59, 7.02),
      move("SYK", "863667101", "Stryker", "Reduce", 3.061, 2.914, 7.84, 6.72),
      move("WAT", "941848103", "Waters", "Reduce", 3.212, 2.274, 7.46, 6.25),
      move("V", "92826C839", "Visa", "Reduce", 3.104, 2.020, 7.31, 5.08),
      move("GOOGL", "02079K305", "Alphabet Class A", "Reduce", 2.956, 1.773, 6.63, 4.64),
      move("MSFT", "594918104", "Microsoft", "Reduce", 2.080, 1.597, 6.00, 4.36),
      move("META", "30303M102", "Meta Platforms", "Reduce", 1.321, 1.052, 5.89, 4.34),
      move("MTD", "592688105", "Mettler-Toledo", "Exit", 0.569, 0, 5.59, 0),
      move("UBER", "90353T100", "Uber Technologies", "New", 0, 8.943, 0, 4.73),
      move("MA", "57636Q104", "Mastercard", "New", 0, 1.245, 0, 4.69),
    ],
  },
  {
    id: "polen-capital",
    name: "Polen Capital",
    firm: "Polen Capital Management",
    style: "Quality growth, durable earnings, and long reinvestment runways",
    philosophy: "Builds concentrated quality-growth strategies around competitively advantaged companies with strong balance sheets, recurring demand, and the capacity to compound earnings over long periods.",
    reportedValue: "$11.61B reported 13-F securities",
    asOf: "Q2 2026 (holdings June 30; filed August 4, 2026)",
    filingSource: "SEC Form 13F-HR · Polen Capital Management LLC · CIK 0001034524",
    filingUrl: "https://www.sec.gov/Archives/edgar/data/1034524/000117266126003035/0001172661-26-003035-index.html",
    coverageNote: "The Q2 filing shows broad share-count reductions across many positions. This may reflect client flows, mandate changes, or other portfolio-level effects; the filing itself does not state why.",
    holdings: [
      holding("LLY", "532457108", "Eli Lilly", "Health Care", 6.89, 0.667, 0.800, "Reduce"),
      holding("NVDA", "67066G104", "NVIDIA", "Technology", 6.86, 3.978, 0.796, "Reduce"),
      holding("MSFT", "594918104", "Microsoft", "Technology", 6.74, 2.099, 0.783, "Reduce"),
      holding("GOOG", "02079K107", "Alphabet Class C", "Communication Services", 6.59, 2.165, 0.765, "Reduce"),
      holding("AVGO", "11135F101", "Broadcom", "Technology", 6.38, 1.960, 0.740, "Reduce"),
      holding("AMZN", "023135106", "Amazon", "Consumer Discretionary", 5.77, 2.810, 0.670, "Reduce"),
      holding("V", "92826C839", "Visa", "Financials", 5.34, 1.806, 0.619, "Reduce"),
      holding("MA", "57636Q104", "Mastercard", "Financials", 5.05, 1.142, 0.587, "Reduce"),
      holding("NOW", "81762P102", "ServiceNow", "Technology", 4.59, 5.370, 0.533, "Reduce"),
      holding("ORCL", "68389X105", "Oracle", "Technology", 4.51, 3.574, 0.524, "Reduce"),
    ],
    recentMoves: [
      move("MSFT", "594918104", "Microsoft", "Reduce", 2.846, 2.099, 7.29, 6.74),
      move("LLY", "532457108", "Eli Lilly", "Reduce", 0.915, 0.667, 5.82, 6.89),
      move("NVDA", "67066G104", "NVIDIA", "Reduce", 4.104, 3.978, 4.95, 6.86),
      move("GOOG", "02079K107", "Alphabet Class C", "Reduce", 2.947, 2.165, 5.85, 6.59),
      move("AVGO", "11135F101", "Broadcom", "Reduce", 2.698, 1.960, 5.78, 6.38),
      move("AMZN", "023135106", "Amazon", "Reduce", 3.897, 2.810, 5.61, 5.77),
      move("V", "92826C839", "Visa", "Reduce", 2.446, 1.806, 5.11, 5.34),
      move("MA", "57636Q104", "Mastercard", "Reduce", 1.541, 1.142, 5.33, 5.05),
      move("NOW", "81762P102", "ServiceNow", "Reduce", 7.269, 5.370, 5.26, 4.59),
      move("ORCL", "68389X105", "Oracle", "Reduce", 5.024, 3.574, 5.11, 4.51),
    ],
  },
];

interface CompanyAggregate {
  ticker: string;
  cusip: string;
  name: string;
  owners: { manager: string; weight: number; action: GrowthAction }[];
  buyers: string[];
  sellers: string[];
  net: number;
}

function companyAggregate(): CompanyAggregate[] {
  const companies = new Map<string, CompanyAggregate>();
  const ensure = (ticker: string, cusip: string, name: string) => {
    const existing = companies.get(cusip);
    if (existing) return existing;
    const created: CompanyAggregate = { ticker, cusip, name, owners: [], buyers: [], sellers: [], net: 0 };
    companies.set(cusip, created);
    return created;
  };

  for (const investor of GROWTH_INVESTORS) {
    for (const position of investor.holdings) {
      ensure(position.ticker, position.cusip, position.name).owners.push({
        manager: investor.firm,
        weight: position.pctPortfolio,
        action: position.action,
      });
    }
    for (const activity of investor.recentMoves) {
      const company = ensure(activity.ticker, activity.cusip, activity.name);
      const label = `${investor.firm} (${activity.action})`;
      if (activity.action === "New" || activity.action === "Add") company.buyers.push(label);
      else company.sellers.push(label);
      company.net = company.buyers.length - company.sellers.length;
    }
  }

  return [...companies.values()].sort((a, b) =>
    b.net - a.net
      || b.owners.length - a.owners.length
      || (b.buyers.length + b.sellers.length) - (a.buyers.length + a.sellers.length)
      || a.name.localeCompare(b.name),
  );
}

function withMovePriceContext(investor: GrowthInvestorProfile): GrowthInvestorProfile {
  const holdingsByCusip = new Map(investor.holdings.map((holding) => [holding.cusip, holding]));
  return {
    ...investor,
    recentMoves: investor.recentMoves.map((move) => {
      const holding = holdingsByCusip.get(move.cusip);
      const approximatePrice = approximateQuarterEndPrice(holding?.valueB ?? null, holding?.sharesM ?? null);
      return {
        ...move,
        approximatePrice,
        priceBasis: approximatePrice ? priceBasis(move.action) : "No quarter-end price approximation is available for this move.",
      };
    }),
  };
}

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("view") === "companies") {
    return NextResponse.json({
      reportingPeriod: "2026-Q2",
      comparisonPeriod: "Q2 2026 vs Q1 2026",
      sourceCatalog: "Stockcircle growth-investor directory",
      sourceCatalogUrl: "https://stockcircle.com/growth-investors",
      includedManagers: GROWTH_INVESTORS.map((investor) => investor.firm),
      methodology: "Ownership overlap uses each manager's ten largest displayed 13-F positions. Buy and sell labels compare raw reported share counts between Q1 and Q2 2026 and may be affected by corporate actions. Counts represent managers, not dollars. The All companies view sorts by net buyers minus sellers, high to low.",
      rows: companyAggregate(),
    });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const investor = GROWTH_INVESTORS.find((candidate) => candidate.id === id);
    if (!investor) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(withMovePriceContext(investor));
  }

  return NextResponse.json(GROWTH_INVESTORS.map(({ holdings, recentMoves, ...summary }) => summary));
}
