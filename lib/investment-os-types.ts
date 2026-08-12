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

export interface ResearchClaim {
  statement: string;
  classification: "fact" | "inference" | "assumption" | "calculation";
  source_ids: string[];
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
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
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
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  runner: string;
  artifact: FollowUpArtifact | null;
  artifact_path: string | null;
  markdown_path: string | null;
  error: string | null;
  requested_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface ValuationScenarioInput {
  name: "bear" | "base" | "bull";
  probability: number;
  annual_fcf_growth: number;
  discount_rate: number;
  terminal_growth: number;
}

export interface ValuationScenarioResult extends ValuationScenarioInput {
  projected_fcfs: number[];
  pv_forecast_fcfs: number;
  pv_terminal_value: number;
  enterprise_value: number;
  equity_value: number;
  fair_value_per_share: number;
  upside_downside: number;
}

export interface ValuationResponse {
  ticker: string;
  units: string;
  current_price: number;
  normalized_fcf: number;
  shares_outstanding: number;
  net_debt: number;
  market_cap: number;
  market_enterprise_value: number;
  current_fcf_yield: number;
  forecast_years: number;
  scenarios: ValuationScenarioResult[];
  probability_weighted_fair_value: number;
  probability_weighted_upside_downside: number;
  reverse_dcf: {
    discount_rate: number;
    terminal_growth: number;
    forecast_years: number;
    required_annual_fcf_growth: number | null;
    interpretation: string;
  };
  disclaimer: string;
}

export type RunnerId = "codex" | "claude";

export type CouncilAgentName =
  | "evidence"
  | "valuation"
  | "bear"
  | "buffett"
  | "munger"
  | "fisher"
  | "asymmetric_growth"
  | "technical_momentum"
  | "macro_industry";

/** Mirrors ALL_COUNCIL_AGENTS in the backend council contract, in the same order. */
export const COUNCIL_AGENTS: CouncilAgentName[] = [
  "evidence",
  "valuation",
  "bear",
  "buffett",
  "munger",
  "fisher",
  "asymmetric_growth",
  "technical_momentum",
  "macro_industry",
];

/** The backend rejects fewer than two agents; the CIO synthesis is the extra call. */
export const MINIMUM_COUNCIL_AGENTS = 2;

export interface RunnerCapability {
  id: RunnerId;
  label: string;
  enabled: boolean;
  installed: boolean;
  authenticated: boolean;
  authentication: string;
  version: string | null;
}

export interface QuickAnswerArtifact {
  schema_version: "1.0";
  ticker: string;
  question: string;
  generated_at: string;
  as_of: string;
  answer: string;
  claims: ResearchClaim[];
  limitations: string[];
  sources: ResearchSource[];
  disclaimer: string;
}

export interface QuickAnswer {
  id: string;
  ticker: string;
  company_name: string;
  question: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  runner: string;
  artifact: QuickAnswerArtifact | null;
  artifact_path: string | null;
  markdown_path: string | null;
  error: string | null;
  requested_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface ResearchCapabilities {
  /** Retained for older builds; prefer `runners`. */
  codex: {
    enabled: boolean;
    installed: boolean;
    authenticated: boolean;
    authentication: string;
  };
  runners?: Record<RunnerId, RunnerCapability>;
  default_runner?: RunnerId;
  api_key_required: boolean;
  durable_jobs?: boolean;
  independent_council: {
    default_agents: number;
    maximum_codex_calls: number;
    maximum_model_calls?: number;
    explicit_confirmation_required: boolean;
  };
}

export const RUNNER_IDS: RunnerId[] = ["codex", "claude"];

export function runnerLabel(
  capabilities: ResearchCapabilities | null,
  runner: RunnerId,
): string {
  return capabilities?.runners?.[runner]?.label ?? (runner === "claude" ? "Claude Code" : "Codex");
}

/** Recover the runner id from a stored run value such as `claude_local`. */
export function runnerIdFromValue(stored: string | null | undefined): RunnerId {
  const candidate = stored?.split("_")[0];
  return RUNNER_IDS.includes(candidate as RunnerId) ? (candidate as RunnerId) : "codex";
}

export function runnerReady(
  capabilities: ResearchCapabilities | null,
  runner: RunnerId,
): boolean {
  const capability = capabilities?.runners?.[runner];
  if (capability) {
    return capability.enabled && capability.installed && capability.authenticated;
  }
  // A backend without the runners map only ever supports Codex.
  if (runner !== "codex" || !capabilities) return false;
  return (
    capabilities.codex.enabled &&
    capabilities.codex.installed &&
    capabilities.codex.authenticated
  );
}

export interface SourceFreshness {
  source_type: string;
  document_count: number;
  latest_published_at: string | null;
  latest_retrieved_at: string | null;
  stale_after_days: number;
  status: "current" | "stale" | "missing";
}

export interface ProviderDataStatus {
  ticker: string;
  sec_cik: string | null;
  source_document_count: number;
  financial_fact_count: number;
  market_price_count: number;
  last_sec_retrieved_at: string | null;
  last_market_retrieved_at: string | null;
  stale: boolean;
  stale_after_hours: number;
  sources: SourceFreshness[];
}

export interface WatchEvent {
  id: string;
  event_date: string;
  category: string;
  classification: "fact" | "inference" | "assumption" | "calculation";
  impact: "supports" | "contradicts" | "neutral";
  material: boolean;
  title: string;
  summary: string;
  source_url: string | null;
  created_at: string;
}

export interface WatchRecord {
  id: string;
  ticker: string;
  status: "active" | "triggered" | "ready_for_research" | "closed";
  quality_thesis: string;
  valuation_concern: string;
  triggers: string[];
  review_date: string;
  needs_review: boolean;
  events: WatchEvent[];
}

export interface ReviewReminder {
  kind: "decision_journal" | "watch";
  reference_id: string;
  ticker: string;
  title: string;
  review_date: string;
  days_until: number;
  status: "triggered" | "overdue" | "due" | "upcoming";
  reason: string;
}

export interface ReviewReminderSummary {
  as_of: string;
  horizon_days: number;
  overdue_count: number;
  due_count: number;
  triggered_count: number;
  items: ReviewReminder[];
}

export interface CompanyComparison {
  generated_at: string;
  portfolio: { portfolio_id: string; snapshot_id: string; as_of: string } | null;
  candidates: Array<{
    ticker: string;
    company_name: string;
    research: {
      status: string;
      confidence: number;
      executive_summary: string;
      source_count: number;
    } | null;
    cio: {
      ownership_action: string;
      confidence: number;
      evidence_sufficiency: string;
      executive_summary: string;
      expected_value_multiple: number | null;
      conditions_to_act: string[];
      invalidation_conditions: string[];
    } | null;
    current_portfolio_weight: number;
    economic_exposures: string[];
    overlapping_exposure_weights: Record<string, number>;
    maximum_overlap_weight: number;
    source_freshness: SourceFreshness[];
    open_watch_status: string | null;
    next_step: string;
    gaps: string[];
  }>;
  allocation_review_order: string[];
  method: string[];
  disclaimer: string;
}

export interface IndustryDocumentSummary {
  id: string;
  title: string;
  category: string;
  description: string;
  updated_at: string;
}

export interface IndustryDocument extends IndustryDocumentSummary {
  content: string;
}

export interface IndustrySearchHit {
  document_id: string;
  title: string;
  category: string;
  snippet: string;
  line_number: number;
  matched_terms: string[];
  score: number;
}

export interface IndustrySearchResponse {
  query: string;
  documents_searched: number;
  hits: IndustrySearchHit[];
}

export interface CouncilAgentArtifact {
  schema_version: "1.0";
  ticker: string;
  question: string;
  context_hash: string;
  prompt_version: "council-agent-v1";
  generated_at: string;
  as_of: string;
  perspective: ResearchPerspective;
  sources: ResearchSource[];
}

export interface CioSynthesisArtifact {
  schema_version: "1.0" | "1.1";
  ticker: string;
  question: string;
  context_hash: string;
  prompt_version: "council-cio-v1" | "council-cio-v2";
  generated_at: string;
  as_of: string;
  perspective_run_ids: string[];
  ownership_action: string;
  confidence: number;
  evidence_sufficiency: string;
  executive_summary: string;
  key_claims: ResearchPerspective["claims"];
  agreements: string[];
  disagreements: string[];
  conditions_to_act: string[];
  invalidation_conditions: string[];
  next_questions: string[];
  scenarios: Array<
    ResearchArtifact["scenarios"][number] & { value_multiple?: number | null }
  >;
  sources: ResearchSource[];
  disclaimer: string;
}

export interface CouncilAgentRun {
  id: string;
  council_run_id: string;
  agent: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  runner: string;
  contract_version: string;
  prompt_version: string;
  context_hash: string;
  model_identifier: string | null;
  artifact: CouncilAgentArtifact | null;
  error: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface CouncilRun {
  id: string;
  ticker: string;
  company_name: string;
  question: string;
  status:
    | "queued"
    | "running"
    | "synthesizing"
    | "completed"
    | "partial"
    | "failed"
    | "cancelled";
  runner: string;
  requested_agents: string[];
  technical_snapshot: TechnicalAnalysis | null;
  context_hash: string;
  cio_artifact: CioSynthesisArtifact | null;
  artifact_path: string | null;
  markdown_path: string | null;
  error: string | null;
  requested_at: string;
  started_at: string | null;
  completed_at: string | null;
  agent_runs: CouncilAgentRun[];
  estimated_codex_calls: number;
}

export interface CioAllocationDraft {
  council_run_id: string;
  ticker: string;
  context_hash: string;
  ownership_action: string;
  confidence: number;
  evidence_sufficiency: string;
  generated_at: string;
  scenarios: Array<
    ResearchArtifact["scenarios"][number] & { value_multiple: number | null }
  >;
  invalidation_conditions: string[];
  conditions_to_act: string[];
  ready_for_allocation: boolean;
  warnings: string[];
}

export interface PortfolioPosition {
  id: number;
  snapshot_id: string;
  ticker: string;
  name: string | null;
  market_value: number;
  weight: number;
  quantity: number | null;
  price: number | null;
  sleeve: string;
  sector: string;
  themes: string[];
  economic_exposures: string[];
  currency: string;
}

export interface PortfolioSnapshot {
  id: string;
  portfolio_id: string;
  as_of: string;
  import_source: "local_csv";
  file_hash: string;
  total_value: number;
  cash_value: number;
  position_count: number;
  created_at: string;
  positions: PortfolioPosition[];
}

export interface PrivatePortfolio {
  id: string;
  name: string;
  base_currency: string;
  created_at: string;
  updated_at: string;
}

export interface PortfolioImportResult {
  portfolio: PrivatePortfolio;
  snapshot: PortfolioSnapshot;
  created: boolean;
}

export interface AllocationScenario {
  name: "bear" | "base" | "bull";
  probability: number;
  value_multiple: number;
}

export interface AllocationWarning {
  severity: "info" | "warning" | "blocker";
  code: string;
  message: string;
}

export interface AllocationAnalysis {
  id: string;
  snapshot_id: string;
  policy_id: string;
  council_run_id: string | null;
  scenario_source: "manual" | "cio_approved";
  candidate_ticker: string;
  request: {
    snapshot_id: string;
    policy_id: string | null;
    council_run_id: string | null;
    scenario_source: "manual" | "cio_approved";
    candidate_ticker: string;
    candidate_name: string | null;
    target_weight: number;
    sleeve: string;
    sector: string;
    themes: string[];
    economic_exposures: string[];
    scenarios: AllocationScenario[];
    permanent_loss_fraction: number;
  };
  result: {
    feasible: boolean;
    classification: "within_policy" | "policy_warning" | "insufficient_cash";
    candidate_ticker: string;
    current_weight: number;
    target_weight: number;
    trade_value: number;
    pre_cash_weight: number;
    post_cash_weight: number;
    policy_ceiling_weight: number;
    meaningful_bull_weight: number | null;
    expected_portfolio_contribution: number;
    permanent_loss_contribution: number;
    scenario_contributions: Array<AllocationScenario & { portfolio_contribution: number }>;
    pre_exposures: Record<string, Record<string, number>>;
    post_exposures: Record<string, Record<string, number>>;
    warnings: AllocationWarning[];
    disclaimer: string;
  };
  created_at: string;
}

export interface DecisionJournalEntry {
  id: string;
  ticker: string;
  company_id: number | null;
  entry_type: "decision" | "review" | "thesis_update" | "postmortem";
  action: "initiate" | "add" | "hold" | "trim" | "exit" | "watch" | "pass";
  headline: string;
  thesis: string;
  rationale: string;
  invalidation_conditions: string[];
  decision_date: string;
  review_date: string;
  council_run_id: string | null;
  allocation_analysis_id: string | null;
  supersedes_entry_id: string | null;
  decision_context: Record<string, unknown>;
  created_at: string;
}
