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

export interface ResearchSource {
  id: string;
  title: string;
  publisher: string;
  url: string;
  published_at: string | null;
  retrieved_at: string;
  source_type: string;
}

export interface ResearchPerspective {
  agent: string;
  stance: string;
  confidence: number;
  evidence_sufficiency: string;
  summary: string;
  claims: Array<{
    statement: string;
    classification: "fact" | "inference" | "assumption" | "calculation";
    source_ids: string[];
  }>;
  risks: string[];
  invalidation_conditions: string[];
  unresolved_questions: string[];
}

export interface ResearchArtifact {
  schema_version: "1.0";
  ticker: string;
  company_name: string;
  question: string;
  generated_at: string;
  as_of: string;
  executive_summary: string;
  perspectives: ResearchPerspective[];
  scenarios: Array<{
    name: "bear" | "base" | "bull";
    probability: number;
    summary: string;
    assumptions: string[];
    valuation_note: string;
  }>;
  synthesis: {
    status: string;
    confidence: number;
    summary: string;
    what_changed: string[];
    agreements: string[];
    disagreements: string[];
    catalysts: string[];
    risks: string[];
    next_questions: string[];
  };
  sources: ResearchSource[];
  disclaimer: string;
}

export interface ResearchRun {
  id: string;
  ticker: string;
  company_name: string;
  question: string;
  status: "queued" | "running" | "completed" | "failed";
  runner: string;
  technical_snapshot: TechnicalAnalysis | null;
  artifact: ResearchArtifact | null;
  artifact_path: string | null;
  markdown_path: string | null;
  error: string | null;
  requested_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface FollowUpArtifact {
  schema_version: "1.0";
  ticker: string;
  question: string;
  generated_at: string;
  as_of: string;
  answer: string;
  claims: Array<{
    statement: string;
    classification: "fact" | "inference" | "assumption" | "calculation";
    source_ids: string[];
  }>;
  disagreements: string[];
  limitations: string[];
  next_questions: string[];
  sources: ResearchSource[];
  disclaimer: string;
}

export interface FollowUpRun {
  id: string;
  ticker: string;
  company_name: string;
  research_run_id: string;
  question: string;
  status: "queued" | "running" | "completed" | "failed";
  runner: string;
  artifact: FollowUpArtifact | null;
  artifact_path: string | null;
  markdown_path: string | null;
  error: string | null;
  requested_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface ResearchCapabilities {
  codex: {
    enabled: boolean;
    installed: boolean;
    authenticated: boolean;
    authentication: string;
  };
  api_key_required: boolean;
}
