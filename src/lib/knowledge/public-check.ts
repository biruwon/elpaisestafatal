export type ClaimAssessment = 'true' | 'mostly-true' | 'misleading' | 'unsupported' | 'uncertain' | 'false';
export type CheckSource = { id: string; title: string; publisher?: string; url: string; publishedAt?: string; retrievedAt?: string };
export type CheckVisual = { type: 'line' | 'bar' | 'comparison' | 'money-flow'; title?: string; unit?: string; labels: string[]; values: number[]; evidenceIds: string[] };
export type CheckScope = { geography?: string; period?: string; checkedAt?: string };
export type ClaimKind = 'institutional_label' | 'factual_allegation' | 'evaluative_judgment' | 'quantitative' | 'comparative' | 'causal' | 'specific_fact';
export type EvidenceLevel = 'supported' | 'limited' | 'insufficient';
export type ClaimInterpretation = { kind: ClaimKind; subject?: string; predicate?: string; normalizedClaim: string; criteriaProfile?: string };
export type CheckCriterion = { id: string; label: string; finding: string; sourceIds?: string[] };
export type CheckResult = { claim: string; interpretation?: ClaimInterpretation; reply: string; answer: string; evidenceLevel?: EvidenceLevel; keyFact?: string; criteria?: CheckCriterion[]; whatWeKnow: string[]; limitations: string[]; scope: CheckScope; sources: CheckSource[]; assessment?: ClaimAssessment; visual?: CheckVisual; canonicalHref?: string; canonicalSlug?: string };
export type PublicCheckResponse =
  | { state: 'clarification'; id: string; claim: string; question: string; interpretation?: ClaimInterpretation; options: Array<{ id: string; label: string; interpretation: ClaimInterpretation }> }
  | { state: 'supported' | 'limited' | 'insufficient'; id: string; result: CheckResult }
  | { state: 'processing'; id: string; claim: string }
  | { state: 'unavailable'; id: string; claim: string; message: string; retryable: boolean };
export const checkResponse = (value: unknown): value is PublicCheckResponse => {
  if (!value || typeof value !== 'object' || typeof (value as { state?: unknown }).state !== 'string') return false;
  const item = value as { state: string; id?: unknown; result?: CheckResult; question?: unknown; options?: unknown };
  if (typeof item.id !== 'string') return false;
  if (item.state === 'clarification') return typeof item.question === 'string' && Array.isArray(item.options);
  if (item.state === 'processing' || item.state === 'unavailable') return true;
  return Boolean(item.result && typeof item.result.reply === 'string' && Array.isArray(item.result.sources));
};
