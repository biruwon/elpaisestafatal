import type { AnswerPlan } from '../../src/lib/knowledge/contracts';
import type { CatalogueEntry } from '../../src/data/catalogue';
import type { CatalogueEntry as RuntimeCatalogueEntry } from './catalogue-resolver';
import type { ClaimAssessment, CheckResult, CheckSource, CheckVisual, PublicCheckResponse, ClaimInterpretation, CheckCriterion } from '../../src/lib/knowledge/public-check';

const normalise = (value: string): string[] => String(value).toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter((token) => token.length > 3);
const sourceLinks = (plan?: AnswerPlan, claim = ''): CheckSource[] => {
  const claimTokens = new Set(normalise(claim));
  return (plan?.sourceLinks || []).map((source) => ({ id: source.id, title: source.title, publisher: source.publisher, url: source.url, publishedAt: source.publishedAt, retrievedAt: source.retrievedAt })).filter((source) => {
    if (!claimTokens.size) return false;
    const sourceTokens = new Set(normalise(`${source.title} ${source.publisher || ''} ${source.url}`));
    return [...claimTokens].some((token) => sourceTokens.has(token));
  });
};
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
const resultFor = (entry: CatalogueEntry | RuntimeCatalogueEntry, claim: string, stable: boolean): CheckResult => ({
  claim, reply: 'reply' in entry ? entry.reply : entry.answer, answer: entry.answer, keyFact: entry.explanation,
  whatWeKnow: [entry.explanation].filter(Boolean), limitations: 'limitations' in entry ? entry.limitations : [], scope: scopeFor(entry),
  sources: 'sources' in entry ? entry.sources.map((source) => ({ id: source.id, title: source.title, publisher: source.publisher, url: source.url, publishedAt: source.date })) : [],
  assessment: stable ? assessmentFor(entry) : undefined, visual: visualFromCatalogue(entry), canonicalSlug: stable ? entry.slug : undefined, canonicalHref: stable ? `/comprobar/${entry.slug}` : undefined,
});
export const checkFromCatalogue = (claim: string, entry: CatalogueEntry | RuntimeCatalogueEntry): PublicCheckResponse => ({ state: 'supported', id: entry.slug, result: { ...resultFor(entry, claim, true), evidenceLevel: 'supported' } });
const interpretationFor = (claim: string): ClaimInterpretation => { const normalizedClaim = claim.trim(); const lower = normalizedClaim.toLocaleLowerCase('es'); const institutional = lower.match(/\b(dictador|dictadura|autoritario|autoritaria|fascista|comunista)\b/); const allegation = lower.match(/\b(corrupto|corrupta|traidor|traidora|ladron|criminal)\b/); const evaluative = lower.match(/\b(incompetente|desastre|fracaso|mentiroso|mentirosa)\b/); const kind = institutional ? 'institutional_label' : allegation ? 'factual_allegation' : evaluative ? 'evaluative_judgment' : 'specific_fact'; return { kind, predicate: institutional?.[1] || allegation?.[1] || evaluative?.[1], normalizedClaim, criteriaProfile: institutional ? 'democratic-power' : allegation ? 'allegation' : evaluative ? 'performance-judgment' : undefined }; };
export const directInterpretation = (claim: string): ClaimInterpretation | undefined => { const interpretation = interpretationFor(claim); return interpretation.kind === 'institutional_label' || interpretation.kind === 'factual_allegation' || interpretation.kind === 'evaluative_judgment' ? interpretation : undefined; };
export const directClaimCheck = (claim: string): PublicCheckResponse | undefined => { const interpretation = directInterpretation(claim); if (!interpretation) return undefined; const lower = claim.toLocaleLowerCase('es'); if (interpretation.kind === 'institutional_label' && /dictador|dictadura/.test(lower)) { const sources: CheckSource[] = [{ id: 'constitution-spain', title: 'Constitución Española', publisher: 'BOE', url: 'https://www.boe.es/legislacion/documentos/ConstitucionCASTELLANO.pdf' }, { id: 'congress-investiture', title: 'Investidura del presidente del Gobierno', publisher: 'Congreso de los Diputados', url: 'https://www.congreso.es/cem/constitu' }]; const criteria: CheckCriterion[] = [{ id: 'office', label: 'Acceso al cargo', finding: 'El presidente del Gobierno necesita la investidura del Congreso.', sourceIds: ['constitution-spain', 'congress-investiture'] }, { id: 'checks', label: 'Controles democráticos', finding: 'El Gobierno está sometido al Parlamento, a las leyes y a los tribunales.', sourceIds: ['constitution-spain'] }, { id: 'opposition', label: 'Competencia política', finding: 'Existen elecciones, oposición parlamentaria y mecanismos para sustituir al Gobierno.', sourceIds: ['constitution-spain'] }]; const subject = claim.replace(/\b(dictador|dictadura)\b/i, '').trim() || 'La persona mencionada'; const reply = `${subject} no encaja en la definición de dictador: llegó al cargo mediante mecanismos parlamentarios, existe oposición electoral y su poder está sujeto a leyes, tribunales y controles políticos. Eso no impide examinar decisiones concretas por abuso de poder o deterioro institucional.`; return { state: 'supported', id: `interpret-${Date.now().toString(36)}`, result: { claim, interpretation, reply, answer: reply, evidenceLevel: 'supported', keyFact: criteria[0].finding, criteria, whatWeKnow: criteria.map((item) => item.finding), limitations: ['Esta conclusión se refiere a la definición institucional de dictadura; no resuelve acusaciones concretas sobre decisiones concretas.'], scope: { geography: 'España', period: 'Situación constitucional vigente' }, sources } }; } const reply = `La frase «${claim}» contiene una acusación o valoración, pero por sí sola no identifica un hecho comprobable. Para sostenerla haría falta una conducta concreta, una fecha y fuentes directamente relacionadas; no es responsable convertir una coincidencia de nombres en una conclusión.`; return { state: 'insufficient', id: `interpret-${Date.now().toString(36)}`, result: { claim, interpretation, reply, answer: reply, evidenceLevel: 'insufficient', keyFact: 'La frase no especifica el hecho que debería comprobarse.', whatWeKnow: [], limitations: ['Una acusación general no permite distinguir entre opinión, investigación, acusación formal o condena.'], scope: {}, sources: [] } }; };
export const clarificationCheck = (claim: string, missingDimensions: string[] = []): PublicCheckResponse => ({ state: 'clarification', id: `clarify-${Date.now().toString(36)}`, claim, question: `¿Qué quieres medir con «${claim}»?`, options: [
  { id: 'unemployment', label: 'Personas sin empleo', interpretation: { kind: 'quantitative', predicate: 'desempleo', normalizedClaim: `${claim}: tasa de desempleo` } },
  { id: 'access', label: 'Encontrar una oferta', interpretation: { kind: 'comparative', predicate: 'acceso al empleo', normalizedClaim: `${claim}: acceso a ofertas de empleo` } },
  { id: 'quality', label: 'Condiciones del trabajo', interpretation: { kind: 'quantitative', predicate: 'calidad del empleo', normalizedClaim: `${claim}: calidad del empleo` } },
] });
export const checkFromPlan = (claim: string, plan: AnswerPlan, requestId?: string): PublicCheckResponse => {
  const sources = sourceLinks(plan, claim);
  const reviewed = plan.reviewed === true && plan.evidenceIds.length > 0 && plan.sourceIds.length > 0 && sources.length > 0;
  const result: CheckResult = { claim, reply: replyFromPlan(plan), answer: plan.summary || plan.headline, keyFact: plan.headline, whatWeKnow: plan.blocks.filter((block) => block.type === 'confirmed' || block.type === 'data_finding').flatMap((block) => 'points' in block ? block.points || [] : []), limitations: [plan.limitation].filter((value): value is string => Boolean(value)), scope: { reviewedAt: plan.asOf }, sources };
  const state = reviewed ? 'supported' : plan.resultState === 'unresolved' ? 'insufficient' : 'limited'; return { state, id: requestId || `check-${Date.now().toString(36)}`, result: { ...result, evidenceLevel: state } };
};
export const unavailableCheck = (claim: string, message: string): PublicCheckResponse => ({ state: 'unavailable', id: `unavailable-${Date.now().toString(36)}`, claim, message, retryable: true });
export const processingCheck = (claim: string, requestId: string): PublicCheckResponse => ({ state: 'processing', id: requestId, claim });
