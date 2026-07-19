export type ClaimType =
  | 'descriptive'
  | 'comparative'
  | 'causal'
  | 'predictive'
  | 'legal'
  | 'normative'
  | 'mixed';

export type CoverageStatus = 'strong' | 'qualified' | 'partial' | 'insufficient' | 'values';
export type EvidenceRelationship = 'supports' | 'contradicts' | 'qualifies' | 'context' | 'insufficient';

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
  relationship: EvidenceRelationship;
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
  | { type: 'claim_breakdown'; propositionIds: string[] }
  | { type: 'key_number'; evidenceId: string; label: string; value: string; caveat?: string }
  | { type: 'line_chart' | 'bar_chart' | 'comparison_chart'; visualId: string; evidenceIds: string[] }
  | { type: 'money_flow'; evidenceIds: string[] }
  | { type: 'data_finding'; evidenceIds: string[]; points: string[] }
  | { type: 'confirmed'; propositionIds: string[]; evidenceIds?: string[]; points?: string[] }
  | { type: 'cannot_conclude'; evidenceIds: string[]; points: string[] }
  | { type: 'conversation_reply'; text: string }
  | { type: 'sources'; sourceIds: string[] };

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
  sourceLinks?: Array<{ id: string; title: string; url: string }>;
  knowledgeVersion: string;
  warehouseSeries?: { labels: string[]; values: number[]; label: string; unit: string };
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
