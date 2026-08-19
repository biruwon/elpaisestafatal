import type { AnswerPlan } from '../../src/lib/knowledge/contracts';
import type { CatalogueEntry } from '../../src/data/catalogue';
import type { CatalogueEntry as RuntimeCatalogueEntry } from './catalogue-resolver';
import type { ClaimAssessment, CheckResult, CheckSource, CheckVisual, PublicCheckResponse } from '../../src/lib/knowledge/public-check';

const sourceLinks = (plan?: AnswerPlan): CheckSource[] => (plan?.sourceLinks || []).map((source) => ({ id: source.id, title: source.title, publisher: source.publisher, url: source.url, publishedAt: source.publishedAt, retrievedAt: source.retrievedAt }));
const replyFromPlan = (plan?: AnswerPlan): string => plan?.blocks?.find((block) => block.type === 'conversation_reply')?.text || plan?.summary || '';
const visualFromCatalogue = (entry: CatalogueEntry | RuntimeCatalogueEntry): CheckVisual | undefined => {
  const visual = 'visual' in entry ? entry.visual : undefined;
  if (!visual || visual.type === 'none' || !visual.labels?.length || !visual.values?.length || visual.labels.length !== visual.values.length) return undefined;
  if (!visual.evidenceIds.length || visual.evidenceIds.some((id: string) => !entry.evidenceIds.includes(id)) || visual.values.some((value: number) => !Number.isFinite(value))) return undefined;
  return { type: visual.type, title: visual.title, unit: visual.unit, labels: visual.labels, values: visual.values, evidenceIds: visual.evidenceIds };
};
const assessmentFor = (entry: CatalogueEntry | RuntimeCatalogueEntry): ClaimAssessment | undefined => {
  const value = 'assessment' in entry ? entry.assessment : undefined;
  return typeof value === 'string' && ['true', 'mostly-true', 'misleading', 'unsupported', 'uncertain', 'false'].includes(value) ? value as ClaimAssessment : undefined;
};
const scopeFor = (entry: CatalogueEntry | RuntimeCatalogueEntry) => ({ geography: entry.geography, period: entry.period, reviewedAt: 'evidenceVerifiedAt' in entry ? entry.evidenceVerifiedAt : undefined });
const resultFor = (entry: CatalogueEntry | RuntimeCatalogueEntry, claim: string, reviewed: boolean): CheckResult => ({
  claim, reply: 'reply' in entry ? entry.reply : entry.answer, answer: entry.answer, keyFact: entry.explanation,
  whatWeKnow: [entry.explanation].filter(Boolean), limitations: 'limitations' in entry ? entry.limitations : [], scope: scopeFor(entry),
  sources: 'sources' in entry ? entry.sources.map((source) => ({ id: source.id, title: source.title, publisher: source.publisher, url: source.url, publishedAt: source.date })) : [],
  assessment: reviewed ? assessmentFor(entry) : undefined, visual: visualFromCatalogue(entry), canonicalSlug: reviewed ? entry.slug : undefined, canonicalHref: reviewed ? `/comprobar/${entry.slug}` : undefined,
});
export const checkFromCatalogue = (claim: string, entry: CatalogueEntry | RuntimeCatalogueEntry): PublicCheckResponse => ({ state: 'reviewed', id: entry.slug, result: resultFor(entry, claim, true) });
export const clarificationCheck = (claim: string, missingDimensions: string[] = []): PublicCheckResponse => ({ state: 'clarification', id: `clarify-${Date.now().toString(36)}`, claim, question: `¿Qué quieres comprobar exactamente? Concreta ${missingDimensions.length ? missingDimensions.join(', ') : 'el hecho o indicador'}.`, options: [
  { id: 'national', label: 'La situación general en España', prompt: `${claim} en España` },
  { id: 'period', label: 'Un periodo concreto', prompt: `${claim} en el periodo que indiques` },
  { id: 'quality', label: 'La calidad o el impacto', prompt: `${claim}: calidad, impacto y límites` },
] });
export const checkFromPlan = (claim: string, plan: AnswerPlan, requestId?: string): PublicCheckResponse => {
  const reviewed = plan.reviewed === true && plan.evidenceIds.length > 0 && plan.sourceIds.length > 0 && sourceLinks(plan).length > 0;
  const result: CheckResult = { claim, reply: replyFromPlan(plan), answer: plan.summary || plan.headline, keyFact: plan.headline, whatWeKnow: plan.blocks.filter((block) => block.type === 'confirmed' || block.type === 'data_finding').flatMap((block) => 'points' in block ? block.points || [] : []), limitations: [plan.limitation].filter((value): value is string => Boolean(value)), scope: { reviewedAt: plan.asOf }, sources: sourceLinks(plan) };
  return { state: reviewed ? 'reviewed' : plan.resultState === 'unresolved' ? 'unresolved' : 'provisional', id: requestId || `check-${Date.now().toString(36)}`, result: reviewed ? result : { ...result, reply: `${result.reply}\n\nOrientación provisional; no es un veredicto revisado.` } };
};
export const unavailableCheck = (claim: string, message: string): PublicCheckResponse => ({ state: 'unavailable', id: `unavailable-${Date.now().toString(36)}`, claim, message, retryable: true });
export const processingCheck = (claim: string, requestId: string): PublicCheckResponse => ({ state: 'processing', id: requestId, claim });
