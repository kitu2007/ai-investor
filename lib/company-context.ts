export interface CompanyContext {
  ticker: string;
  name: string;
  sector?: string;
  description: string;
}

const COMPANY_CONTEXT: Record<string, Omit<CompanyContext, "ticker">> = {
  AAPL: {
    name: "Apple",
    sector: "Technology",
    description: "Apple designs iPhones, Macs, iPads, wearables, and services around its consumer technology ecosystem.",
  },
  AMZN: {
    name: "Amazon",
    sector: "Consumer Discretionary",
    description: "Amazon operates e-commerce, logistics, advertising, subscriptions, and AWS cloud infrastructure.",
  },
  BAC: {
    name: "Bank of America",
    sector: "Financials",
    description: "Bank of America provides consumer banking, commercial banking, wealth management, and capital markets services.",
  },
  ELAN: {
    name: "Elanco Animal Health",
    sector: "Healthcare",
    description: "Elanco Animal Health develops medicines, vaccines, parasiticides, and animal-health products for pets and livestock.",
  },
  EXPE: {
    name: "Expedia Group",
    sector: "Consumer Discretionary",
    description: "Expedia Group operates online travel brands for lodging, flights, vacation rentals, travel advertising, and travel services.",
  },
  GEHC: {
    name: "GE HealthCare",
    sector: "Healthcare",
    description: "GE HealthCare sells medical imaging, ultrasound, patient monitoring, diagnostics, and healthcare technology products.",
  },
  GOOG: {
    name: "Alphabet Class C",
    sector: "Communication Services",
    description: "Alphabet is the parent of Google Search, YouTube, Google Cloud, Android, advertising technology, and AI research assets.",
  },
  GOOGL: {
    name: "Alphabet Class A",
    sector: "Communication Services",
    description: "Alphabet is the parent of Google Search, YouTube, Google Cloud, Android, advertising technology, and AI research assets.",
  },
  IAC: {
    name: "IAC / InterActiveCorp",
    sector: "Communication Services",
    description: "IAC owns and operates internet and media businesses, historically including marketplaces, publishing, and consumer services.",
  },
  LUMN: {
    name: "Lumen Technologies",
    sector: "Communication Services",
    description: "Lumen Technologies provides fiber, networking, cloud connectivity, and communications infrastructure.",
  },
  META: {
    name: "Meta Platforms",
    sector: "Communication Services",
    description: "Meta operates Facebook, Instagram, WhatsApp, Threads, advertising platforms, AI infrastructure, and Reality Labs.",
  },
  MSFT: {
    name: "Microsoft",
    sector: "Technology",
    description: "Microsoft sells enterprise software, cloud infrastructure, productivity tools, gaming, and AI-enabled services.",
  },
  NVDA: {
    name: "NVIDIA",
    sector: "Technology",
    description: "NVIDIA designs GPUs, AI accelerators, networking, software, and systems for data centers, gaming, and professional visualization.",
  },
  QRTEA: {
    name: "Qurate Retail",
    sector: "Consumer Discretionary",
    description: "Qurate Retail operates video commerce, e-commerce, and retail brands including QVC and HSN.",
  },
  REZI: {
    name: "Resideo Technologies",
    sector: "Industrials",
    description: "Resideo provides residential comfort, security, connected-home products, and related distribution.",
  },
  VIASP: {
    name: "Viasat",
    sector: "Communication Services",
    description: "Viasat provides satellite communications, broadband, defense connectivity, and aviation/maritime connectivity services.",
  },
};

export function companyContextForTicker(ticker: string): CompanyContext | null {
  const normalized = ticker.trim().toUpperCase().replace(".", "_");
  const context = COMPANY_CONTEXT[normalized] ?? COMPANY_CONTEXT[ticker.trim().toUpperCase()];
  return context ? { ticker: ticker.trim().toUpperCase(), ...context } : null;
}
