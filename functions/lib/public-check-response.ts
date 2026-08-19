import type { AnswerPlan } from '../../src/lib/knowledge/contracts';
import type { CatalogueEntry } from '../../src/data/catalogue';
import type { CatalogueEntry as RuntimeCatalogueEntry } from './catalogue-resolver';
import type { ClaimAssessment, CheckResult, CheckSource, CheckVisual, PublicCheckResponse, ClaimInterpretation, CheckCriterion } from '../../src/lib/knowledge/public-check';

const normalise = (value: string): string[] => String(value).toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter((token) => token.length > 3);
type CriteriaProfile = { kind: 'institutional_label' | 'factual_allegation' | 'evaluative_judgment'; definition: string; criteria: string[]; defaultLimitation: string };
export const criteriaProfiles: Record<string, CriteriaProfile> = {
  'democratic-power': { kind: 'institutional_label', definition: 'Whether a person or government exercises unchecked dictatorial or authoritarian power.', criteria: ['Acceso al cargo', 'Controles institucionales', 'Competencia política'], defaultLimitation: 'Esta conclusión se refiere a la etiqueta institucional; no resuelve acusaciones sobre decisiones concretas.' },
  allegation: { kind: 'factual_allegation', definition: 'A concrete allegation of unlawful conduct by an identified person, group or institution.', criteria: ['Conducta concreta', 'Estado del procedimiento', 'Fuente directamente relacionada'], defaultLimitation: 'Una acusación general no permite distinguir entre opinión, investigación, acusación formal o condena.' },
  'collective-allegation': { kind: 'factual_allegation', definition: 'A generalized allegation that public or influential actors unlawfully take money or benefit from their position.', criteria: ['Qué conducta se atribuye', 'A quién y cuándo', 'Resolución o evidencia directa'], defaultLimitation: 'Una acusación colectiva mezcla posibles delitos, decisiones discutibles y una percepción política; hay que separar cada hecho y no atribuir una condena sin un caso identificado.' },
  'performance-judgment': { kind: 'evaluative_judgment', definition: 'A negative or positive evaluation that can be tested against an explicit criterion and comparable indicators.', criteria: ['Criterio evaluable', 'Indicadores relevantes', 'Periodo comparable'], defaultLimitation: 'Una valoración depende del criterio y periodo elegidos; no equivale por sí sola a un hecho.' },
};
const sourceLinks = (plan?: AnswerPlan, claim = ''): CheckSource[] => {
  const claimTokens = new Set(normalise(claim));
  return (plan?.sourceLinks || []).map((source) => ({ id: source.id, title: source.title, publisher: source.publisher, url: source.url, publishedAt: source.publishedAt, retrievedAt: source.retrievedAt })).filter((source) => {
    if (!claimTokens.size) return false;
    const sourceTokens = new Set(normalise(`${source.title} ${source.publisher || ''} ${source.url}`));
    return [...claimTokens].some((token) => sourceTokens.has(token));
  });
};
const replyFromPlan = (plan?: AnswerPlan): string => plan?.blocks?.find((block) => block.type === 'conversation_reply')?.text || plan?.summary || '';
const criteriaFromPlan = (plan: AnswerPlan): CheckCriterion[] => plan.blocks.filter((block) => block.type === 'confirmed' || block.type === 'data_finding').flatMap((block, index) => {
  const points = 'points' in block ? block.points || [] : [];
  const evidenceIds = 'evidenceIds' in block && Array.isArray(block.evidenceIds) ? block.evidenceIds : [];
  return points.slice(0, 3).map((finding, pointIndex) => ({ id: `evidence-${index + 1}-${pointIndex + 1}`, label: pointIndex === 0 ? 'Dato respaldado' : 'Contexto', finding, sourceIds: evidenceIds }));
});
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
const scopeFor = (entry: CatalogueEntry | RuntimeCatalogueEntry) => ({ geography: entry.geography, period: entry.period, checkedAt: 'evidenceVerifiedAt' in entry ? entry.evidenceVerifiedAt : undefined });
const resultFor = (entry: CatalogueEntry | RuntimeCatalogueEntry, claim: string, stable: boolean): CheckResult => ({
  claim, reply: 'reply' in entry ? entry.reply : entry.answer, answer: entry.answer, keyFact: entry.explanation,
  whatWeKnow: [entry.explanation].filter(Boolean), limitations: 'limitations' in entry ? entry.limitations : [], scope: scopeFor(entry),
  sources: 'sources' in entry ? entry.sources.map((source) => ({ id: source.id, title: source.title, publisher: source.publisher, url: source.url, publishedAt: source.date })) : [],
  assessment: stable ? assessmentFor(entry) : undefined, visual: visualFromCatalogue(entry), canonicalSlug: stable ? entry.slug : undefined, canonicalHref: stable ? `/comprobar/${entry.slug}` : undefined,
});
export const checkFromCatalogue = (claim: string, entry: CatalogueEntry | RuntimeCatalogueEntry): PublicCheckResponse => ({ state: 'supported', id: entry.slug, result: { ...resultFor(entry, claim, true), evidenceLevel: 'supported' } });
export const clarificationCheck = (claim: string, _missingDimensions: string[] = []): PublicCheckResponse => ({ state: 'clarification', id: `clarify-${Date.now().toString(36)}`, claim, question: `¿Qué quieres medir con «${claim}»?`, options: [
  { id: 'unemployment', label: 'Personas sin empleo', interpretation: { kind: 'quantitative', predicate: 'desempleo', normalizedClaim: `${claim}: tasa de desempleo` } },
  { id: 'access', label: 'Encontrar una oferta', interpretation: { kind: 'comparative', predicate: 'acceso al empleo', normalizedClaim: `${claim}: acceso a ofertas de empleo` } },
  { id: 'quality', label: 'Condiciones del trabajo', interpretation: { kind: 'quantitative', predicate: 'calidad del empleo', normalizedClaim: `${claim}: calidad del empleo` } },
] });
export const checkFromPlan = (claim: string, plan: AnswerPlan, requestId?: string): PublicCheckResponse => {
  const sources = sourceLinks(plan, claim);
  const supported = plan.evidenceLevel === 'supported' || (plan.evidenceLevel === undefined && plan.evidenceIds.length > 0 && plan.sourceIds.length > 0 && sources.length > 0);
  const criteria = criteriaFromPlan(plan); const interpretation = plan.interpretation ? plan.interpretation as ClaimInterpretation : undefined; const result: CheckResult = { claim, interpretation, reply: replyFromPlan(plan), answer: plan.summary || plan.headline, keyFact: plan.headline, criteria, whatWeKnow: criteria.map((item) => item.finding), limitations: [plan.limitation].filter((value): value is string => Boolean(value)), scope: { checkedAt: plan.asOf }, sources };
  const state = plan.evidenceLevel || (supported ? 'supported' : 'limited'); return { state, id: requestId || `check-${Date.now().toString(36)}`, result: { ...result, evidenceLevel: state } };
};
export const unavailableCheck = (claim: string, message: string): PublicCheckResponse => ({ state: 'unavailable', id: `unavailable-${Date.now().toString(36)}`, claim, message, retryable: true });
export const processingCheck = (claim: string, requestId: string): PublicCheckResponse => ({ state: 'processing', id: requestId, claim });
