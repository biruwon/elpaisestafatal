export type ClaimAssessment = 'true' | 'mostly-true' | 'misleading' | 'unsupported' | 'uncertain' | 'false';
export type CheckSource = { id: string; title: string; publisher?: string; url: string; publishedAt?: string; retrievedAt?: string };
export type CheckVisual = { type: 'line' | 'bar' | 'comparison' | 'money-flow'; title?: string; unit?: string; labels: string[]; values: number[]; evidenceIds: string[] };
export type PublicEvidenceSummary = { mode: 'dynamic' | 'snapshot' | 'mixed' | 'none'; families: Array<{ label: string; direction: 'supports' | 'qualifies' | 'contradicts' | 'neutral'; evidenceIds: string[] }>; missingDimensions?: string[]; fallbackReason?: string };
export type CheckScope = { geography?: string; period?: string; checkedAt?: string };
export type CheckScorecardItem = { label: string; unit: string; baseline?: { value: string; period: string }; comparison?: { value: string; period: string }; change?: string; direction: 'improved' | 'worsened' | 'roughly_unchanged' | 'unavailable'; caveat?: string; sources: CheckSource[] };
export type CheckScorecard = { title: string; baselinePeriod: string; comparisonPeriod: string; snapshotDate?: string; items: CheckScorecardItem[]; scope?: string; explanation?: string };
export type ClaimKind = 'institutional_label' | 'factual_allegation' | 'evaluative_judgment' | 'quantitative' | 'comparative' | 'causal' | 'specific_fact' | 'normative';
export type EvidenceLevel = 'supported' | 'limited' | 'insufficient';
export type ClaimSubjectType = 'person' | 'group' | 'institution' | 'country' | 'unknown';
export type ClaimPolarity = 'affirmed' | 'negated' | 'uncertain';
export type ClaimAlternative = { normalizedClaim: string; kind?: ClaimKind; interpretation: string; evidenceDifference: 'same' | 'material'; confidence?: number };
export type ClaimInterpretation = {
  kind: ClaimKind;
  subject?: string;
  subjectType?: ClaimSubjectType;
  predicate?: string;
  action?: string;
  object?: string;
  polarity?: ClaimPolarity;
  normalizedClaim: string;
  interpretation?: string;
  criteriaProfile?: string;
  confidence?: number;
  evidenceNeeds?: string[];
  alternatives?: ClaimAlternative[];
};
export type CheckCriterion = { id: string; label: string; finding: string; sourceIds?: string[] };
export type ArgumentVerdict = 'supported' | 'contradicted' | 'mixed' | 'insufficient' | 'not_verifiable';
export type ArgumentAssessment = { id: string; claim: string; kind: ClaimKind; verdict: ArgumentVerdict; evidenceLevel: 'strong' | 'moderate' | 'limited' | 'none'; finding: string; evidenceIds: string[]; sourceIds: string[]; limitations: string[] };
export type CheckResult = { claim: string; interpretation?: ClaimInterpretation; thesis?: { text: string; kind: 'factual' | 'evaluative'; conclusion: string; criteria?: string[] }; reply: string; answer: string; evidenceLevel?: EvidenceLevel; keyFact?: string; criteria?: CheckCriterion[]; arguments?: ArgumentAssessment[]; coverageSummary?: { total: number; supported: number; contradicted: number; mixed: number; insufficient: number; notVerifiable: number }; whatWeKnow: string[]; limitations: string[]; scope: CheckScope; sources: CheckSource[]; assessment?: ClaimAssessment; visual?: CheckVisual; scorecard?: CheckScorecard; canonicalHref?: string; canonicalSlug?: string; evidenceSummary?: PublicEvidenceSummary };
export type PublicCheckResponse =
  | { state: 'clarification'; id: string; claim: string; question: string; interpretation?: ClaimInterpretation; options: Array<{ id: string; label: string; interpretation: ClaimInterpretation }> }
  | { state: 'supported' | 'limited' | 'insufficient'; id: string; result: CheckResult }
  | { state: 'processing'; id: string; claim: string; preview?: Extract<PublicCheckResponse, { state: 'supported' | 'limited' | 'insufficient' }> }
  | { state: 'unavailable'; id: string; claim: string; message: string; retryable: boolean };
const validScorecard = (value: unknown): value is CheckScorecard => {
  if (!value || typeof value !== 'object') return false;
  const scorecard = value as CheckScorecard;
  return typeof scorecard.title === 'string' && typeof scorecard.baselinePeriod === 'string' && typeof scorecard.comparisonPeriod === 'string'
    && Array.isArray(scorecard.items) && scorecard.items.every((item) => item && typeof item.label === 'string' && typeof item.unit === 'string'
      && ['improved', 'worsened', 'roughly_unchanged', 'unavailable'].includes(item.direction) && Array.isArray(item.sources));
};
export const checkResponse = (value: unknown): value is PublicCheckResponse => {
  if (!value || typeof value !== 'object' || typeof (value as { state?: unknown }).state !== 'string') return false;
  const item = value as { state: string; id?: unknown; result?: CheckResult; question?: unknown; options?: unknown };
  if (typeof item.id !== 'string') return false;
  if (item.state === 'clarification') return typeof item.question === 'string' && Array.isArray(item.options);
  if (item.state === 'processing' || item.state === 'unavailable') return true;
  return Boolean(item.result && typeof item.result.reply === 'string' && Array.isArray(item.result.sources) && (!item.result.scorecard || validScorecard(item.result.scorecard)));
};
