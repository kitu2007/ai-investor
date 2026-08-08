export interface InvestmentCompany {
  id: number;
  ticker: string;
  name: string;
  sector: string | null;
  created_at: string;
  updated_at: string;
}

export interface EvidenceItem {
  id: number;
  company_id: number;
  evidence_type: string;
  title: string;
  summary: string;
  source_url: string | null;
  observed_at: string;
  confidence: number;
  created_at: string;
}

export interface TechnicalAnalysis {
  ticker: string;
  as_of: string;
  observations: number;
  last_close: number;
  moving_averages: Record<string, number | null>;
  rsi_14: number | null;
  macd: {
    line: number | null;
    signal: number | null;
    histogram: number | null;
  };
  drawdown: {
    current: number;
    maximum: number;
  };
  momentum: Record<string, number | null>;
  relative_strength: Record<string, number | null>;
  momentum_score: number;
  signal: string;
  flags: string[];
}

export interface ResearchResponse {
  sessionId: string;
  reply: string;
  technical: TechnicalAnalysis | null;
  evidenceCount: number;
  company: InvestmentCompany | null;
  evidence: EvidenceItem[];
  marketDataSource: string;
}

export interface BackendStatus {
  connected: boolean;
  service: string;
  detail?: string;
}
