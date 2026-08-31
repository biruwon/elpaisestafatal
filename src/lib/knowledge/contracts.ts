export type ClaimType =
  | 'descriptive'
  | 'comparative'
  | 'definition'
  | 'trend'
  | 'causal'
  | 'predictive'
  | 'legal'
  | 'normative'
  | 'mixed';

export type CoverageStatus = 'strong' | 'qualified' | 'partial' | 'insufficient' | 'values';
export type EvidenceRelationship = 'supports' | 'contradicts' | 'qualifies' | 'context' | 'insufficient';

export type EvidencePropositionLink = {
  evidenceId: string;
  propositionId: string;
  relationship: EvidenceRelationship;
  reviewStatus: 'unreviewed' | 'reviewed' | 'superseded';
  reviewedAt?: string;
};

export type Proposition = {
  id: string;
  text: string;
  type: ClaimType;
  subject?: string;
  predicate?: string;
  object?: string;
  geography?: string;
  period?: string;
  status: 'supported' | 'contradicted' | 'qualified' | 'insufficient' | 'unreviewed';
  evidenceIds: string[];
};

export type EvidenceRecord = {
  id: string;
  title: string;
  sourceId: string;
  relationships: EvidencePropositionLink[];
  finding: Record<string, unknown>;
  geography?: string;
  period?: string;
  population?: string;
  unit?: string;
  supportsPropositionIds: string[];
  doesNotEstablish: string[];
  limitations: string[];
  reviewStatus: 'unreviewed' | 'reviewed' | 'superseded';
  reviewedAt?: string;
};


export type ModelHealth = { available: boolean; provider: string; model?: string; detail?: string };
export type StructuredModelRequest<T> = { task: string; input: unknown; schema: unknown; model?: string; signal?: AbortSignal; resultType?: T };
export type EmbeddingRequest = { input: string | string[]; model?: string; signal?: AbortSignal };
export type EmbeddingResult = { vectors: number[][]; model?: string };
export type MediaInspectionRequest = { media: string; mimeType: string; context?: string };
export type MediaInspectionResult = { transcript?: string; description?: string; text?: string; language?: string };
export interface ModelProvider {
  generateStructured<T>(request: StructuredModelRequest<T>): Promise<T>;
  embed(request: EmbeddingRequest): Promise<EmbeddingResult>;
  inspectMedia?(request: MediaInspectionRequest): Promise<MediaInspectionResult>;
  health(): Promise<ModelHealth>;
}

export type ExtractedEntity = { text: string; type: 'person' | 'organization' | 'place' | 'date' | 'quantity' | 'other'; sensitive?: boolean };
export type ClaimProposition = { id: string; text: string; subject?: string; relation?: string; polarity?: 'positive' | 'negative' | 'uncertain'; modality?: string; population?: string; geography?: string; period?: string; quantity?: string; claimType: ClaimType };
export type ClarificationNeed = { question: string; reason: string; required: boolean };
export type ClaimUnderstanding = { normalized: string; propositions: ClaimProposition[]; entities: ExtractedEntity[]; clarificationNeeds: ClarificationNeed[] };
export type ResearchProposition = { id: string; evidenceNeeded: string[]; metricCandidates?: string[]; queries?: string[] };
export type ResearchPlan = { propositions: ResearchProposition[]; metricCandidates: string[]; neutralQueries: string[]; requiredDimensions: string[] };
export type EvidenceQuantity = { value: string; unit?: string; period?: string; population?: string };
export type ExtractedEvidence = { propositionId: string; sourceId: string; finding: string; quantities: EvidenceQuantity[]; stage?: 'report' | 'complaint' | 'investigation' | 'charge' | 'conviction'; support: 'supports' | 'contradicts' | 'context' | 'insufficient' };
export type GroundedAnswerDraft = { headline: string; directAnswer: string; blocks: AnswerBlock[]; factualClaims: Array<{ text: string; evidenceIds: string[] }>; limitations: string[]; followUps: string[] };
// Public MVP state. Detailed claim/evidence modes remain internal so the UI
// can explain the result without exposing resolver implementation details.
export type EvidenceLevel = 'supported' | 'limited' | 'insufficient';

export type ScorecardItem = {
  metricId: string;
  label: string;
  unit?: string;
  baseline?: { value: string; period: string };
  comparison?: { value: string; period: string };
  direction: 'improved' | 'worsened' | 'roughly_unchanged' | 'unavailable';
  evidenceIds: string[];
  caveat?: string;
  change?: string;
};

export type EventPropositionStatus = 'officially_reported' | 'corroborated_report' | 'single_report' | 'unconfirmed' | 'disputed' | 'context_only';

export type SourceRecord = {
  id: string;
  title: string;
  publisher: string;
  url: string;
  sourceType: 'official' | 'academic' | 'judicial' | 'independent' | 'media';
  jurisdiction: string;
  publishedAt?: string;
  retrievedAt: string;
  reviewStatus: 'unreviewed' | 'reviewed' | 'superseded';
};

export type StaticClaimReference = {
  kind: 'claim' | 'topic';
  slug: string;
  title: string;
  href: string;
  confidence: number;
};

export type AnswerBlock =
  | { type: 'claim_breakdown'; propositionIds: string[]; evidenceIds?: string[]; items?: Array<{ text: string; type: ClaimType; explicit: boolean; evidenceIds?: string[]; verdict?: 'supported' | 'contradicted' | 'mixed' | 'insufficient' | 'not_verifiable'; evidenceLevel?: 'strong' | 'moderate' | 'limited' | 'none'; finding?: string }> }
  | { type: 'key_number'; evidenceId: string; label: string; value: string; caveat?: string }
  | { type: 'line_chart' | 'bar_chart' | 'comparison_chart'; visualId: string; evidenceIds: string[] }
  | { type: 'money_flow'; evidenceIds: string[]; amount?: string; origin?: string; destination?: string; purpose?: string }
  | { type: 'data_finding'; evidenceIds: string[]; points: string[] }
  | { type: 'source_excerpt'; evidenceIds: string[]; title: string; excerpt: string }
  | { type: 'confirmed'; propositionIds: string[]; evidenceIds?: string[]; points?: string[] }
  | { type: 'strongest_valid_concern'; text: string }
  | { type: 'evidence_ladder'; evidenceIds?: string[]; steps: Array<{ label: string; status: 'available' | 'context' | 'missing'; detail: string }> }
  | { type: 'legal_decision_tree'; items: Array<{ label: string; status: 'known' | 'missing'; detail: string }> }
  | { type: 'prediction_conditions'; items: Array<{ label: string; value: string; status: 'specified' | 'missing' }> }
  | { type: 'trade_offs'; principle: string; alternatives: Array<{ label: string; consequence: string }> }
  | { type: 'group_comparison_requirements'; items: Array<{ label: string; status: 'available' | 'check' | 'missing'; detail: string }> }
  | { type: 'evidence_gap'; missing: string[]; needed: string[]; nextAction: string }
  | { type: 'cannot_conclude'; evidenceIds: string[]; points: string[] }
  | { type: 'conversation_reply'; text: string; evidenceIds?: string[] }
  | { type: 'sources'; sourceIds: string[] }
  | { type: 'scorecard'; baseline: { label: string; period: string }; comparison: { label: string; period: string }; items: ScorecardItem[]; geography?: string }
  | { type: 'event_status'; event: { label: string; geography?: string; period?: string }; propositions: Array<{ text: string; status: EventPropositionStatus; evidenceIds: string[]; detail?: string }> };


export type AnswerPlan = {
  schemaVersion: '1';
  headline: string;
  summary: string;
  coverage: CoverageStatus;
  claimType: ClaimType;
  blocks: AnswerBlock[];
  clarificationQuestion?: string;
  limitation?: string;
  evidenceIds: string[];
  sourceIds: string[];
  sourceLinks?: Array<{ id: string; title: string; url: string; publisher?: string; publishedAt?: string; retrievedAt?: string; role?: 'primary' | 'corroboration' | 'context'; originPublisher?: string }>;
  asOf?: string;
  knowledgeVersion: string;
  evidenceLevel?: EvidenceLevel;
  interpretation?: {
    normalizedClaim: string;
    kind: ClaimType | 'institutional_label' | 'factual_allegation' | 'evaluative_judgment' | 'specific_fact';
    subject?: string;
    subjectType?: 'person' | 'group' | 'institution' | 'country' | 'unknown';
    predicate?: string;
    action?: string;
    object?: string;
    polarity?: 'affirmed' | 'negated' | 'uncertain';
    interpretation?: string;
    confidence?: number;
    evidenceNeeds?: string[];
    alternatives?: Array<{ normalizedClaim: string; interpretation: string; evidenceDifference: 'same' | 'material'; confidence: number }>;
  };
  warehouseSeries?: { labels: string[]; values: number[]; label: string; unit: string };
  researchPlan?: ResearchPlan;
  evidenceSummary?: {
    mode: 'dynamic' | 'snapshot' | 'mixed' | 'none';
    families: Array<{ familyId?: string; familyLabel?: string; label: string; direction: 'supports' | 'qualifies' | 'contradicts' | 'neutral'; evidenceIds: string[]; sourceIds?: string[]; finding?: string; limitation?: string; period?: string; data?: string[]; missingDimensions?: string[]; criteria?: Array<{ id: string; label: string; finding: string; evidenceIds?: string[]; sourceIds?: string[]; data?: string[]; missingDimensions?: string[] }> }>;
    missingDimensions?: string[];
    fallbackReason?: string;
  };
  snapshotPolicy?: { owner: string; createdAt: string; expiresAt: string; refreshCommand: string; validationStatus: string; supportedScope: string; unsupportedScope: string };
};

export type ResolveResult = {
  status: 'complete' | 'partial' | 'draft' | 'uncovered' | 'unavailable' | 'processing';
  requestId?: string;
  result?: AnswerPlan;
  relatedClaims?: StaticClaimReference[];
};

export const isAnswerPlan = (value: unknown): value is AnswerPlan => {
  if (!value || typeof value !== 'object') return false;
  const plan = value as Partial<AnswerPlan>;
  return plan.schemaVersion === '1'
    && typeof plan.headline === 'string'
    && typeof plan.summary === 'string'
    && Array.isArray(plan.blocks)
    && Array.isArray(plan.evidenceIds)
    && Array.isArray(plan.sourceIds)
    && typeof plan.knowledgeVersion === 'string';
};
