interface Env { DB?: ClaimDemandDatabase; SEASONAL_DB?: ClaimDemandDatabase; LOCAL_CLASSIFIER_ENDPOINT?: string; LOCAL_CLASSIFIER_TOKEN?: string; LOCAL_MODEL_VERSION?: string; CATALOGUE_VERSION?: string }
interface Context { request: Request; env: Env; waitUntil(promise: Promise<unknown>): void }
type InputType = 'text' | 'image' | 'audio' | 'document' | 'video' | 'url';

import { allowRateLimitedRequest } from '../lib/rate-limit';
import { INPUT_LIMITS, validateInputMetadata, inputErrorMessage } from '../../src/lib/knowledge/input-contract.mjs';
import { isMissingTextClaim, missingTextClaimResponse } from '../../src/lib/knowledge/text-claim-intent.mjs';
import { boundedRequest, RequestTooLargeError } from '../../src/lib/knowledge/bounded-request.mjs';
import { attachExtraction, extractedClaim } from '../../src/lib/knowledge/submission.mjs';
import { measurementMeaningPlan } from '../../src/lib/knowledge/measurement-meaning.mjs';
import { claimFocusFor, focusedMetricIdsFor } from '../../src/lib/knowledge/claim-focus.mjs';
import { directMetricIdsForQuery } from '../../src/lib/knowledge/direct-metric-route.mjs';
import { focusedEvidencePlan } from '../../src/lib/knowledge/focused-evidence-plan.mjs';
import { deterministicApiFallback } from '../../src/lib/knowledge/deterministic-api-fallback.mjs';
import { PRIMARY_CARE_WAIT_SNAPSHOT } from '../../src/lib/knowledge/primary-care-wait-snapshot.mjs';
import { TOURISM_EMPLOYMENT_SNAPSHOT } from '../../src/lib/knowledge/tourism-employment-snapshot.mjs';
import { FOREIGN_AFFILIATE_SECTOR_SNAPSHOT } from '../../src/lib/knowledge/foreign-affiliate-sector-snapshot.mjs';
import { WAITER_VACANCY_SNAPSHOT } from '../../src/lib/knowledge/waiter-vacancy-snapshot.mjs';
import { INE_ECV_PERSONAL_BENEFIT_RECEIPT_SNAPSHOT } from '../../src/lib/knowledge/ine-ecv-personal-benefit-receipt-snapshot.mjs';
import { EDUCATION_EMPLOYMENT_SNAPSHOT } from '../../src/lib/knowledge/education-employment-snapshot.mjs';
import { EDUCATION_FIRST_JOB_SNAPSHOT } from '../../src/lib/knowledge/education-first-job-snapshot.mjs';
import { snapshotLifecycle } from '../../src/lib/knowledge/snapshot-lifecycle.mjs';
import { publicResolveResponse } from '../../src/lib/knowledge/public-response.mjs';
import type { AnswerPlan, ResolveResult } from '../../src/lib/knowledge/contracts';
import { routeCatalogueQuery } from '../lib/catalogue-resolver';
import { checkFromCatalogue, checkFromPlan, processingCheck, unavailableCheck } from '../lib/public-check-response';
import { reviewedContextualAnswer } from '../lib/reviewed-contextual-answer.mjs';
import type { PublicCheckResponse } from '../../src/lib/knowledge/public-check';
import { captureClaimDemand, type ClaimDemandDatabase } from '../lib/claim-demand';
import { searchD1Warehouse, searchD1WarehouseByMetricIds } from '../lib/d1-warehouse';
import { vacancyMeasurementClarificationMetricIdsForQuery, vacancyMeasurementMetricIdsForQuery } from '../../src/lib/knowledge/vacancy-measurement-route.mjs';
import { RUNTIME_VERSIONS } from '../../src/lib/knowledge/runtime-versions.mjs';

const cache = new Map<string, { expiresAt: number; response: PublicCheckResponse }>();
// Bump this when response-selection semantics change. The cache key also
// includes the central knowledge versions so answer revisions cannot reuse an
// older public response from a warm Worker isolate.
const responseCacheVersion = 'claim-causal-tourist-housing-evidence-store-availability-education-health-snapshot-gap-replies-housing-supply-semantic-family-compound-support-mortgage-entry-vacancy-metric-clarification-education-earnings-tourist-housing-snapshots-rail-punctuality-sourced-family-selection-intergenerational-housing-landlord-context-pension-finance-routing-energy-price-pass-through-fixed-discontinuous-status-price-wage-eu-convergence-real-wage-living-standard-reported-worked-hours-rural-health-access-retirement-age-61-pension-private-savings-62-rent-series-scope-advertised-rent-claim-scope-metric-quality-notes-adult-conviction-rate-nationality-2026-11-scoped-source-2026-11-direct-metric-d1-2026-11-second-home-scope-2026-11-pension-wage-distribution-2026-11-business-size-productivity-context-2026-11-foreign-affiliation-sector-snapshot-2026-11-waiter-vacancy-experimental-context-2026-11-sectoral-value-added-activity-2026-11-tourism-seasonal-employment-2026-11-professional-emigration-2026-11-regional-housing-context-2026-11-professional-medical-emigration-context-2026-11-mental-health-psychology-context-2026-11-housing-mobility-concise-2026-11-sme-regulatory-evidence-correction-2026-11-internship-substitution-answer-2026-11-rental-regulation-context-2026-11-rail-maintenance-concise-2026-11-tourism-urban-cost-concise-2026-11-graduate-outcomes-public-reply-2026-11-recent-graduate-employment-evidence-2026-11-education-first-job-timing-2013-cohort-2026-11-precarious-employment-shift-2026-11-migration-fiscal-context-2026-11-ine-housing-access-barriers-ecv-2025-2026-11-public-psychotherapy-frequency-context-2026-11';
const storeResponse = (key: string, value: { expiresAt: number; response: PublicCheckResponse }): void => {
  if (!key) return;
  while (cache.size >= 200) cache.delete(cache.keys().next().value!);
  cache.set(key, value);
};
let localCircuitOpenUntil = 0;
let localFailureCount = 0;
const circuitBreakAfter = 2;
const circuitCooldownMs = 30_000;

const semanticFingerprint = (text: string): string => text.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, ' ').trim();
const vacancyMetricIds = new Set(['job_vacancy_count', 'occupied_job_post_count', 'job_vacancy_rate', 'job_vacancy_rate_quarterly_change']);
const vacancyMetricIdsFor = (text: string): string[] => [...(vacancyMeasurementMetricIdsForQuery(text) || [])].filter((id) => vacancyMetricIds.has(id));
const vacancyClarificationFor = (claim: string): PublicCheckResponse => {
  const labels: Record<string, string> = {
    job_vacancy_count: 'Número de puestos de trabajo vacantes',
    occupied_job_post_count: 'Número de puestos de trabajo ocupados',
    job_vacancy_rate: 'Tasa de vacantes de empleo',
  };
  return {
    state: 'clarification',
    id: `clarify-vacancy-${Date.now().toString(36)}`,
    claim,
    question: '¿Qué medida quieres comprobar?',
    options: vacancyMeasurementClarificationMetricIdsForQuery(claim).map((metricId) => ({
      id: metricId,
      label: labels[metricId] || metricId,
      interpretation: {
        kind: 'quantitative',
        predicate: labels[metricId] || metricId,
        normalizedClaim: `${claim} Quiero comprobar: ${labels[metricId] || metricId}.`,
      },
    })),
  };
};
const responseCacheBypassed = (request: Request): boolean => {
  const url = new URL(request.url);
  return ['1', 'true'].includes((url.searchParams.get('fresh') || '').toLocaleLowerCase())
    || request.headers.get('x-development-no-cache') === '1';
};
const cacheKeyFor = (body: { text: string; inputType: InputType; file?: File; clarification?: Clarification }, env: Env): string => {
  // Names, sizes and lossy text fingerprints cannot identify submitted content.
  // Uploads and fetched pages are never shared through this response cache.
  if (body.file || body.inputType !== 'text') return '';
  return JSON.stringify([responseCacheVersion, 'text-reviewed-snapshot-fallback-ecv-personal-benefit-2026-11', RUNTIME_VERSIONS.fallbackKnowledge, RUNTIME_VERSIONS.warehouseKnowledge, body.text.normalize('NFC'), body.clarification || null, env.LOCAL_MODEL_VERSION || 'local', env.CATALOGUE_VERSION || 'catalogue']);
};

const json = (body: PublicCheckResponse, status = 200): Response => Response.json(body, {
  status,
  headers: { 'Cache-Control': 'no-store' },
});

const linkedTimeout = (request: Request, milliseconds: number): { signal: AbortSignal; dispose: () => void } => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), milliseconds);
  const cancel = () => controller.abort();
  if (request.signal.aborted) cancel();
  else request.signal.addEventListener('abort', cancel, { once: true });
  return { signal: controller.signal, dispose: () => { clearTimeout(timer); request.signal.removeEventListener('abort', cancel); } };
};

type Clarification = { id: string; prompt: string; interpretation?: { kind?: string; normalizedClaim?: string } };
const requestBody = async (request: Request): Promise<{ text: string; inputType: InputType; file?: File; clarification?: Clarification }> => {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const value = await request.json() as { text?: unknown; inputType?: unknown; clarification?: unknown };
    const inputType = (typeof value.inputType === 'string' ? value.inputType : 'text') as InputType;
    const clarification = value.clarification && typeof value.clarification === 'object' ? value.clarification as { id?: unknown; prompt?: unknown; interpretation?: { kind?: unknown; normalizedClaim?: unknown } } : undefined;
    return { text: typeof value.text === 'string' ? value.text.trim() : '', inputType, clarification: clarification && typeof clarification.prompt === 'string' ? { id: String(clarification.id || 'custom'), prompt: clarification.prompt.trim(), interpretation: clarification.interpretation && typeof clarification.interpretation.normalizedClaim === 'string' ? { kind: typeof clarification.interpretation.kind === 'string' ? clarification.interpretation.kind : undefined, normalizedClaim: clarification.interpretation.normalizedClaim } : undefined } : undefined };
  }
  const form = await request.formData();
  const candidate = form.get('file');
  const clarificationValue = form.get('clarification');
  let clarification: Clarification | undefined;
  if (typeof clarificationValue === 'string') {
    try { const parsed = JSON.parse(clarificationValue) as { id?: unknown; prompt?: unknown; interpretation?: { kind?: unknown; normalizedClaim?: unknown } }; if (typeof parsed.prompt === 'string' && parsed.prompt.trim()) clarification = { id: String(parsed.id || 'custom'), prompt: parsed.prompt.trim(), interpretation: parsed.interpretation && typeof parsed.interpretation.normalizedClaim === 'string' ? { kind: typeof parsed.interpretation.kind === 'string' ? parsed.interpretation.kind : undefined, normalizedClaim: parsed.interpretation.normalizedClaim } : undefined }; } catch { /* ignore malformed optional context */ }
  }
  return {
    text: String(form.get('text') || '').trim(),
    inputType: String(form.get('inputType') || 'text') as InputType,
    file: candidate instanceof File ? candidate : undefined,
    clarification,
  };
};

const planFrom = (value: ResolveResult): AnswerPlan | undefined => value.result;

const fallbackResponse = (claim: string, inputType: InputType): PublicCheckResponse => {
  const fallback = deterministicApiFallback({ text: claim, inputType }) as ResolveResult & { guidance?: { limitation?: string; questions?: string[] } };
  const plan = planFrom(fallback);
  if (plan) {
    const response = checkFromPlan(claim, plan, fallback.requestId);
    // Keep the internal packet identifier available to routing decisions; it
    // is never rendered as machine provenance in the public response.
    const internal = response as PublicCheckResponse & { result?: Record<string, unknown> };
    return { ...response, result: internal.result ? { ...internal.result, id: (plan as AnswerPlan & { id?: string }).id } : internal.result } as unknown as PublicCheckResponse;
  }
  return unavailableCheck(claim, fallback.guidance?.limitation || 'La comprobación no está disponible en este momento.');
};

const usefulPreview = (response: PublicCheckResponse): Extract<PublicCheckResponse, { state: 'supported' | 'limited' | 'insufficient' }> | undefined => {
  if (response.state === 'supported') return response;
  if (response.state === 'insufficient') {
    const result = response.result;
    const hasSpecificGap = !result.sources.length
      && !result.criteria?.length
      && !result.whatWeKnow.length
      && Boolean(result.nextQuestion?.trim())
      && Boolean(result.evidenceSummary?.missingDimensions?.length)
      && /Qué se necesita para comprobarla:/i.test(result.reply)
      && /Siguiente paso:/i.test(result.reply);
    return hasSpecificGap ? response : undefined;
  }
  if (response.state !== 'limited') return undefined;
  return response.result.criteria?.length && response.result.sources?.length ? response : undefined;
};

const rhetoricalClaim = (claim: string): boolean => {
  const text = semanticFingerprint(claim);
  return /\b(?:mienten|miente|engañan|enganan|manipulan|manipula|ocultan|oculta|falsean|falsea|maquillan|maquilla|invaden|invade|destruyendo|destruye|no se puede salir|imposible salir|da miedo)\b/.test(text);
};

// A related warehouse hit is not automatically better than a reviewed
// contextual answer. For rhetorical claims, require the dynamic plan to
// explicitly carry qualification; otherwise use the domain packet, which
// preserves the distinction between measurable facts and the slogan.
export const chooseResponse = (claim: string, model: PublicCheckResponse | undefined, contextual: PublicCheckResponse): PublicCheckResponse => {
  const requestedVacancyMetrics = vacancyMetricIdsFor(claim);
  const modelResult = model && 'result' in model ? model.result : undefined;
  const modelEvidenceMetrics = [
    ...(modelResult?.evidenceSummary?.families || []).map((family) => family.metricId).filter((id): id is string => Boolean(id)),
    ...(modelResult?.answerScope?.directMetrics || []),
  ];
  if (requestedVacancyMetrics.length > 0
    && requestedVacancyMetrics.some((id) => modelEvidenceMetrics.includes(id))
    && model
    && modelResult
    && ['supported', 'limited', 'insufficient'].includes(model.state)
    && modelResult.sources.length > 0
    && modelResult.evidenceSummary?.families.some((family) => family.evidenceIds.length > 0)) return model;
  const reviewed = reviewedContextualAnswer(model, contextual);
  if (reviewed) return reviewed as PublicCheckResponse;
  const contextualPlan = (contextual as PublicCheckResponse & { result?: AnswerPlan }).result;
  const modelPlan = (model as PublicCheckResponse & { result?: AnswerPlan } | undefined)?.result;
  const focusedFamily = claimFocusFor(claim)?.id;
  const contextualFocusMatchesClaim = contextualPlan?.answerScope?.kind === 'measurement'
    && contextualPlan.answerScope.family === focusedFamily;
  const modelFocusMatchesClaim = modelPlan?.answerScope?.kind === 'measurement'
    && modelPlan.answerScope.family === focusedFamily;
  const contextualSourceIds = (contextual as PublicCheckResponse & { result?: { sources?: Array<{ id: string }> } }).result?.sources?.map((source) => source.id) || [];
  const modelSourceIds = modelResult?.sources?.map((source) => source.id) || [];
  const hasSourcedFamilyData = (plan: AnswerPlan | undefined, sourceIds: string[]): boolean => sourceIds.length > 0
    && Boolean(plan?.evidenceSummary?.families?.some((family) => family.data?.length
      && family.evidenceIds.length
      && family.sourceIds?.some((sourceId) => sourceIds.includes(sourceId))));
  const contextualHasSourcedFamilyData = hasSourcedFamilyData(contextualPlan, contextualSourceIds);
  const modelHasSourcedFamilyData = hasSourcedFamilyData(modelPlan, modelSourceIds);
  // A matching family label is not enough to replace scoped context: the
  // candidate must carry findings with evidence IDs linked to visible sources.
  if (contextualFocusMatchesClaim && (!modelFocusMatchesClaim
    || contextualHasSourcedFamilyData && !modelHasSourcedFamilyData)) return contextual;
  if (model && modelFocusMatchesClaim && modelHasSourcedFamilyData) return model;
  const modelHasFamilyData = Boolean(modelPlan?.evidenceSummary?.families?.some((family) => family.data?.length));
  const dataCount = (plan: AnswerPlan | undefined): number => plan?.evidenceSummary?.families?.reduce((total, family) => total + (family.data?.length || 0), 0) || 0;
  const criterionDataCount = (plan: AnswerPlan | undefined): Map<string, number> => new Map((plan?.evidenceSummary?.families || []).map((family) => {
    const criterion = family as typeof family & { criterionId?: string };
    return [criterion.criterionId || criterion.label, criterion.data?.length || 0];
  }));
  const contextualPlanId = (contextualPlan as (AnswerPlan & { id?: string }) | undefined)?.id;
  const modelPlanId = (modelPlan as (AnswerPlan & { id?: string }) | undefined)?.id;
  const contextualIsBroadPacket = contextualPlanId?.startsWith('broad-') === true;
  // A late local-model answer must not replace a reviewed broad packet with a
  // generic headline and empty criteria. If it has no family-scoped values, or
  // it belongs to a different packet, it is not an enrichment of this claim.
  if (contextualIsBroadPacket && (!model || !modelPlan || !modelHasFamilyData)) return contextual;
  if (contextualIsBroadPacket && modelPlanId && modelPlanId !== contextualPlanId) return contextual;
  // A reviewed broad-domain packet is an answerable, sourced fallback. Never
  // let a malformed or empty provider response hide it, regardless of whether
  // the provider labelled that response limited or insufficient.
  // A validated limited result with family data is different: it is the
  // warehouse-backed answer for the same packet, and must retain its newer
  // observations instead of being replaced by the older snapshot fallback.
  if ((contextualPlan as ({ id?: string } | undefined))?.id?.startsWith('broad-') && model?.state !== 'supported' && !modelHasFamilyData) return contextual;
  if (!model || model.state === 'insufficient') return contextual.state !== 'insufficient' ? contextual : model || contextual;
  if (contextual.state === 'supported' && model.state === 'limited' && !(model.result?.sources?.length) && !(model.result?.criteria?.length)) return contextual;
  // The optional resolver can return a same-packet result built from an older
  // warehouse snapshot. Prefer the reviewed packet when it contains more
  // family-scoped values; otherwise a sparse provider result can silently
  // hide newly added official projections or account figures. A provider
  // result that genuinely contains more compatible observations still wins.
  const sameBroadPacket = Boolean(contextualPlanId?.startsWith('broad-')
    && modelPlan
    && (!modelPlanId || contextualPlanId === modelPlanId)
    && modelPlan.headline === contextualPlan?.headline);
  // A resolver can return accurate family metadata while still carrying an
  // older flattened conversation reply. Never let that representation hide a
  // reviewed multi-family answer: it must name every family and preserve the
  // paragraph breaks needed by the public result view.
  const contextualFamilies = contextualPlan?.evidenceSummary?.families || [];
  const modelReply = modelPlan?.blocks?.find((block) => block.type === 'conversation_reply')?.text || '';
  const familyLabels = contextualFamilies.map((family) => family.familyLabel || family.label).filter(Boolean);
  const modelReplyIsFamilyStructured = familyLabels.length < 2
    || (familyLabels.every((label) => modelReply.includes(label)) && /\n\s*\n/.test(modelReply));
  if (contextualIsBroadPacket && contextualFamilies.length > 1 && !modelReplyIsFamilyStructured) return contextual;
  if (sameBroadPacket) {
    const contextualCriteria = criterionDataCount(contextualPlan);
    const modelCriteria = criterionDataCount(modelPlan);
    const hasRicherCriterion = [...contextualCriteria].some(([criterionId, count]) => count > (modelCriteria.get(criterionId) || 0));
    if (hasRicherCriterion || dataCount(contextualPlan) > dataCount(modelPlan)) return contextual;
  }
  if (contextual.state === 'insufficient' || !rhetoricalClaim(claim)) return model;
  const plan = (model as PublicCheckResponse & { result?: AnswerPlan }).result;
  const summary = plan?.evidenceSummary;
  const hasQualification = Boolean(plan?.limitation || plan?.blocks?.some((block) => block.type === 'cannot_conclude') || summary?.missingDimensions?.length);
  const contextualFamilyCount = contextualPlan?.evidenceSummary?.families?.length || 0;
  if (!hasQualification || (summary?.mode === 'none' && contextualFamilyCount >= 2)) return contextual;
  return model;
};

const resolvedResponse = (claim: string, safe: ResolveResult | undefined, id?: string, requireExtraction = false, allowClarification = true, contextual?: PublicCheckResponse): PublicCheckResponse => {
  if (requireExtraction && !safe?.extraction) return unavailableCheck(claim, 'No se ha podido leer el contenido. Pega la afirmación para comprobarla.');
  const extraction = safe?.extraction;
  const actualClaim = extraction ? extractedClaim(extraction) : claim;
  const meaning = measurementMeaningPlan(actualClaim) as AnswerPlan | undefined;
  if (meaning) return attachExtraction(checkFromPlan(actualClaim, meaning, id || safe?.requestId), extraction) as PublicCheckResponse;
  if (!safe?.result && extraction) return attachExtraction(unavailableCheck(actualClaim, extraction.warnings[0] || 'No se ha podido completar la comprobación.'), extraction) as PublicCheckResponse;
  const model = safe?.result ? checkFromPlan(actualClaim, safe.result, id || safe.requestId, allowClarification) : undefined;
  const response = chooseResponse(actualClaim, model, contextual || fallbackResponse(actualClaim, 'text'));
  return attachExtraction(response, extraction) as PublicCheckResponse;
};

export const onRequestPost = async (context: Context): Promise<Response> => {
  const { request, env } = context;
  if (!(await allowRateLimitedRequest(request, env, { scope: 'check', limit: 30 }))) return json(unavailableCheck('', 'Has alcanzado el límite temporal de comprobaciones.'), 429);
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > INPUT_LIMITS.maxRequestBytes) return json(unavailableCheck('', 'El archivo o texto supera el tamaño permitido.'), 413);

  let body: { text: string; inputType: InputType; file?: File; clarification?: Clarification };
  try { body = await requestBody(await boundedRequest(request, INPUT_LIMITS.maxRequestBytes)); } catch (error) { return json(unavailableCheck('', error instanceof RequestTooLargeError ? 'El archivo o texto supera el tamaño permitido.' : 'No hemos podido leer la solicitud.'), error instanceof RequestTooLargeError ? 413 : 400); }
  const validation = validateInputMetadata({ text: body.text, inputType: body.inputType, hasFile: Boolean(body.file), fileSize: body.file?.size, mimeType: body.file?.type, fileName: body.file?.name });
  if (!validation.ok) return json(unavailableCheck(body.text, inputErrorMessage(validation.code)), validation.code === 'file_too_large' || validation.code === 'text_too_large' ? 413 : 400);
  const effectiveClaim = body.clarification?.interpretation?.normalizedClaim || body.clarification?.prompt || body.text;
  if (effectiveClaim.length > INPUT_LIMITS.maxTextCharacters || (body.clarification?.prompt.length || 0) > INPUT_LIMITS.maxTextCharacters) return json(unavailableCheck('', inputErrorMessage('text_too_large')), 413);
  if (body.inputType === 'text' && isMissingTextClaim(effectiveClaim)) return json(missingTextClaimResponse(body.text));
  const initialFocus = body.inputType === 'text' ? claimFocusFor(effectiveClaim) : undefined;
  const vacancyRoute = body.inputType === 'text' && !['foreign-affiliation-in-tourism-and-agriculture', 'waiter-vacancy-and-conditions', 'employment-value-added-by-activity'].includes(initialFocus?.id || '')
    ? vacancyMeasurementMetricIdsForQuery(effectiveClaim) : undefined;
  if (vacancyRoute && vacancyRoute.size === 0) return json(vacancyClarificationFor(effectiveClaim));
  const vacancyMetrics = [...(vacancyRoute || [])].filter((id) => vacancyMetricIds.has(id));
  const submissionFallback = (): PublicCheckResponse => body.inputType === 'text'
    ? fallbackResponse(effectiveClaim, 'text')
    : unavailableCheck(body.text, 'No hemos podido leer el contenido ahora. Pega el texto de la afirmación para comprobarlo.');
  let focusedObservations: Record<string, unknown>[] | undefined;
  let warehouseFocusedResponse: PublicCheckResponse | undefined;
  let warehouseUnavailableResponse: PublicCheckResponse | undefined;
  if (effectiveClaim.trim() && body.inputType === 'text') context.waitUntil(captureClaimDemand(env.DB, effectiveClaim, body.inputType));

  // `fresh=1` is an explicit development escape hatch. Responses are already
  // marked no-store at the HTTP layer, but the Worker also keeps a short-lived
  // in-memory result cache; bypass both the read and the write when iterating
  // on answer selection or evidence presentation.
  const bypassResponseCache = responseCacheBypassed(request);
  const cacheKey = cacheKeyFor(body, env);
  const cached = bypassResponseCache ? undefined : cacheKey ? cache.get(cacheKey) : undefined;
  if (cached && cached.expiresAt > Date.now()) return json(cached.response);
  if (cached) cache.delete(cacheKey);

  if (body.inputType === 'text') {
    const meaning = measurementMeaningPlan(effectiveClaim) as AnswerPlan | undefined;
    if (meaning) return json(checkFromPlan(effectiveClaim, meaning));
    const routedText = body.clarification?.interpretation?.normalizedClaim || body.clarification?.prompt || body.text;
    const route = routeCatalogueQuery(routedText, { skipClarification: true });
    // Canonical catalogue entries are safe to serve only when the submitted
    // text is their exact published claim. Aliases and semantic neighbours
    // must pass through the interpretation/evidence pipeline first; otherwise
    // a broad allegation can inherit an unrelated sourced answer.
    const normalize = (value: string) => value.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, ' ').trim();
    const entry = route.entry && normalize(route.entry.claim) === normalize(routedText) ? route.entry : undefined;
    if (entry) {
      const response = checkFromCatalogue(body.text, entry);
      if (!bypassResponseCache) storeResponse(cacheKey, { expiresAt: Date.now() + 15 * 60_000, response });
      return json(response);
    }
    const focus = vacancyMetrics.length ? undefined : initialFocus;
    const localResolverAvailable = Boolean(env.LOCAL_CLASSIFIER_ENDPOINT && env.LOCAL_CLASSIFIER_TOKEN && localCircuitOpenUntil <= Date.now());
    const warehouseUnavailableMessage = 'No hemos podido consultar las series estadísticas ahora. Inténtalo de nuevo; todavía no sabemos si hay una medición compatible.';
    if (vacancyMetrics.length) {
      warehouseUnavailableResponse = unavailableCheck(effectiveClaim, 'No podemos verificar la serie que corresponde a esta medida ahora. No presentamos una cifra hasta comprobar que pertenece al indicador solicitado.');
      if (!localResolverAvailable) {
        return json(warehouseUnavailableResponse);
      }
      if (!env.DB) {
        warehouseUnavailableResponse = unavailableCheck(effectiveClaim, warehouseUnavailableMessage);
      } else {
        let lookupFailed = false;
        focusedObservations = await searchD1WarehouseByMetricIds(env.DB, vacancyMetrics).catch(() => {
          lookupFailed = true;
          return [];
        });
        if (lookupFailed) {
          warehouseUnavailableResponse = unavailableCheck(effectiveClaim, warehouseUnavailableMessage);
          focusedObservations = undefined;
        }
      }
    }
    if (focus) {
      const metricIds = vacancyMetrics.length ? vacancyMetrics : [...(focusedMetricIdsFor(effectiveClaim) || [])];
      const warehouseUnavailableMessage = 'No hemos podido consultar las series estadísticas ahora. Inténtalo de nuevo; todavía no sabemos si hay una medición compatible.';
      const localResolverAvailable = Boolean(env.LOCAL_CLASSIFIER_ENDPOINT && env.LOCAL_CLASSIFIER_TOKEN && localCircuitOpenUntil <= Date.now());
      const focusDatabase = focus.id === 'tourism-seasonal-employment' ? env.SEASONAL_DB : env.DB;
      if (focus.id === 'rental-price-amount' && (!env.DB || !metricIds.length)) return json(unavailableCheck(effectiveClaim, 'No podemos consultar la serie estadística ahora. No presentamos un importe sin una fuente que mida alquileres en euros.'));
      if (!focusDatabase && metricIds.length) {
        // Reuse the same reviewed, expiring text snapshots as deterministic fallback.
        // Inline fallback data for other metric families is not a substitute
        // for a warehouse read. The sectoral value-added family is explicitly
        // reviewed for this path; other families need snapshot-mode evidence.
        const reviewedFallback = fallbackResponse(effectiveClaim, 'text');
        const reviewedResult = reviewedFallback.state === 'supported' || reviewedFallback.state === 'limited' || reviewedFallback.state === 'insufficient'
          ? reviewedFallback.result : undefined;
        const reviewedSnapshotAvailable = reviewedResult?.evidenceSummary?.mode === 'snapshot'
          || focus.id === 'employment-value-added-by-activity';
        if (reviewedSnapshotAvailable && reviewedResult?.sources.length && reviewedResult.whatWeKnow.length) return json(reviewedFallback);
      }
      // A focused metric family with no D1 binding has not been checked. Do not
      // turn missing retrieval infrastructure into an evidence-gap conclusion.
      if (metricIds.length && !focusDatabase) {
        warehouseUnavailableResponse = unavailableCheck(effectiveClaim, warehouseUnavailableMessage);
        if (!localResolverAvailable || focus.id === 'tourism-seasonal-employment') return json(warehouseUnavailableResponse);
      }
      if (focusDatabase && metricIds.length) {
        let lookupFailed = false;
        const warehouseRowLimit = focus.id === 'employment-value-added-by-activity' ? 240 : 40;
        focusedObservations = await searchD1WarehouseByMetricIds(focusDatabase, metricIds, warehouseRowLimit).catch(() => {
          lookupFailed = true;
          return [];
        });
        if (lookupFailed) {
          if (focus.id === 'migration-benefit-receipt' && snapshotLifecycle(INE_ECV_PERSONAL_BENEFIT_RECEIPT_SNAPSHOT).usable) {
            // This reviewed ECV snapshot is complete for the bounded measure
            // and carries its own source, period and scope. D1 is only a
            // retrieval mirror here, so a temporary warehouse failure need
            // not erase this independently verified comparison.
            const selectedMetrics = new Set(metricIds);
            const snapshotObservations = INE_ECV_PERSONAL_BENEFIT_RECEIPT_SNAPSHOT.observations
              .filter((item) => selectedMetrics.has(item.metricId));
            const plan = focusedEvidencePlan(effectiveClaim, { observations: snapshotObservations }) as AnswerPlan | undefined;
            if (plan) warehouseFocusedResponse = checkFromPlan(effectiveClaim, plan);
          } else if (focus.id === 'rental-price-amount') {
            return json(unavailableCheck(effectiveClaim, 'No hemos podido consultar la serie estadística ahora. No presentamos un importe sin una fuente que mida alquileres en euros.'));
          } else {
            // An exception is different from a successful lookup with no rows.
            // Keep this distinction for context-only families too: their
            // contextual series may still exist even when they cannot prove the
            // submitted claim on their own.
            warehouseUnavailableResponse = unavailableCheck(effectiveClaim, warehouseUnavailableMessage);
            if (!localResolverAvailable || focus.id === 'tourism-seasonal-employment') return json(warehouseUnavailableResponse);
            focusedObservations = undefined;
          }
        } else {
          if (focus.id === 'migration-benefit-receipt' && snapshotLifecycle(INE_ECV_PERSONAL_BENEFIT_RECEIPT_SNAPSHOT).usable) {
            const selectedMetrics = new Set(metricIds);
            const observationKey = (item: Record<string, unknown>): string => {
              const dimensions = item.dimensions as Record<string, unknown> | undefined;
              return [item.metricId || '', item.period || '', dimensions?.groupKind || '', dimensions?.group || ''].join('|');
            };
            const observed = new Set(focusedObservations.map((item) => observationKey(item as Record<string, unknown>)));
            focusedObservations = [...focusedObservations, ...INE_ECV_PERSONAL_BENEFIT_RECEIPT_SNAPSHOT.observations
              .filter((item) => selectedMetrics.has(item.metricId)
                && !observed.has(observationKey(item as unknown as Record<string, unknown>)))];
          }
          if (['working-poverty', 'education-employment-outcomes', 'education-pay-comparison', 'primary-care-waits', 'primary-care-wait-trend', 'primary-care-wait-causes', 'real-wages', 'collective-agreement-wages', 'gdp-total-per-capita-comparison', 'labour-productivity-and-growth', 'household-inflation-basket', 'tourism-employment-contribution', 'foreign-affiliation-in-tourism-and-agriculture', 'waiter-vacancy-and-conditions', 'tourist-housing-registration', 'tourist-housing-count', 'tourist-housing-share', 'tourist-housing-supply', 'tourism-urban-housing-cost'].includes(focus.id) && focusedObservations.length === 0) {
            // Reviewed text snapshots can answer from their own dated source
            // when a successful warehouse lookup has no rows. A failed D1
            // query still follows the unavailable path above; absence and
            // infrastructure failure are not interchangeable.
            warehouseFocusedResponse = fallbackResponse(effectiveClaim, 'text');
          } else {
            if (focus.id === 'education-employment-outcomes') {
              const selectedMetrics = new Set(metricIds);
              const observationKey = (item: Record<string, unknown>): string => {
                const dimensions = item.dimensions as Record<string, unknown> | undefined;
                const dimensionKey = JSON.stringify(Object.entries(dimensions || {}).sort(([left], [right]) => left.localeCompare(right)));
                return [item.metricId || '', item.period || '', dimensionKey].join('|');
              };
              const observed = new Set(focusedObservations.map((item) => observationKey(item as Record<string, unknown>)));
              const educationSnapshots = [EDUCATION_EMPLOYMENT_SNAPSHOT, EDUCATION_FIRST_JOB_SNAPSHOT]
                .filter((snapshot) => snapshotLifecycle(snapshot).usable);
              focusedObservations = [...focusedObservations, ...educationSnapshots.flatMap((snapshot) => snapshot.observations
                .filter((item) => selectedMetrics.has(item.metricId) && !observed.has(observationKey(item as unknown as Record<string, unknown>))))];
            }
            if (focus.id.startsWith('primary-care-wait-') || focus.id === 'primary-care-waits') {
              // Keep the reviewed latest wave available while the scheduled
              // source refresh catches up with an older but non-empty D1 row.
              if (snapshotLifecycle(PRIMARY_CARE_WAIT_SNAPSHOT).usable) {
                focusedObservations = [...focusedObservations, ...PRIMARY_CARE_WAIT_SNAPSHOT.observations];
              }
            }
            if (focus.id === 'tourism-employment-contribution' && snapshotLifecycle(TOURISM_EMPLOYMENT_SNAPSHOT).usable) {
              // The reviewed INE release publishes both the employment share
              // and job count; the source API refreshes the count separately.
              // Keep the same dated share available while that refresh runs.
              focusedObservations = [...focusedObservations, ...TOURISM_EMPLOYMENT_SNAPSHOT.observations];
            }
            if (focus.id === 'foreign-affiliation-in-tourism-and-agriculture' && snapshotLifecycle(FOREIGN_AFFILIATE_SECTOR_SNAPSHOT).usable) {
              const observed = new Set(focusedObservations.map((item) => `${item.metricId || ''}|${item.period || ''}`));
              focusedObservations = [...focusedObservations, ...FOREIGN_AFFILIATE_SECTOR_SNAPSHOT.observations
                .filter((item) => !observed.has(`${item.metricId}|${item.period}`))];
            }
            if (focus.id === 'waiter-vacancy-and-conditions' && snapshotLifecycle(WAITER_VACANCY_SNAPSHOT).usable) {
              const observed = new Set(focusedObservations.map((item) => `${item.metricId || ''}|${item.period || ''}|${String((item.dimensions as Record<string, unknown> | undefined)?.geo || '')}`));
              focusedObservations = [...focusedObservations, ...WAITER_VACANCY_SNAPSHOT.observations
                .filter((item) => !observed.has(`${item.metricId}|${item.period}|${String((item.dimensions as Record<string, unknown> | undefined)?.geo || '')}`))];
            }
            const plan = focusedEvidencePlan(effectiveClaim, {
              observations: focusedObservations as never[],
              allowReviewedSnapshotFallback: ['household-inflation-basket', 'employment-value-added-by-activity'].includes(focus.id),
            }) as AnswerPlan | undefined;
            if (plan) warehouseFocusedResponse = checkFromPlan(effectiveClaim, plan);
          }
          // This family has a reviewed, deterministic interpretation of its
          // quarterly series. Do not let a generic resolver replace a sourced
          // same-year comparison with an unscoped missing-data answer.
          if (focus.id === 'tourism-seasonal-employment') {
            return json(warehouseFocusedResponse || unavailableCheck(effectiveClaim, warehouseUnavailableMessage));
          }
          if (warehouseFocusedResponse
            && (focus.id === 'rental-price-amount' || focus.id === 'migration-benefit-receipt'
              || !env.LOCAL_CLASSIFIER_ENDPOINT || !env.LOCAL_CLASSIFIER_TOKEN || localCircuitOpenUntil > Date.now())) return json(warehouseFocusedResponse);
        }
      } else if (focus.id !== 'rental-price-amount' && focus.direct.length === 0 && metricIds.length === 0) {
        // If no warehouse metric is defined for this family, its reviewed
        // explanation can identify the missing measurement without a lookup.
        // A generic resolver cannot add direct evidence when the family has
        // no registered metric, so return the scoped context instead of
        // queuing an unrelated warehouse search.
        const plan = focusedEvidencePlan(effectiveClaim, { observations: [], allowReviewedSnapshotFallback: true }) as AnswerPlan | undefined;
        if (plan) {
          // A focused measurement gap may have a separately reviewed, sourced
          // family packet that can provide bounded context. Reuse the same
          // bridge as the deterministic fallback, but only when it returns a
          // sourced broad packet; otherwise keep the focused gap unchanged.
          const contextualFallback = plan.evidenceLevel === 'insufficient'
            ? fallbackResponse(effectiveClaim, 'text')
            : undefined;
          const contextualResult = contextualFallback?.state === 'limited' ? contextualFallback.result : undefined;
          const contextualResultId = contextualResult && 'id' in contextualResult ? String(contextualResult.id) : '';
          if (contextualFallback?.state === 'limited' && contextualResult
            && contextualResultId.startsWith('broad-')
            && contextualResult.sources.length && contextualResult.whatWeKnow.length) {
            return json(contextualFallback);
          }
          warehouseFocusedResponse = checkFromPlan(effectiveClaim, plan);
          return json(warehouseFocusedResponse);
        }
      }
    }
  }

  // Broad-domain packets are already reviewed and deterministic. Return them
  // immediately instead of queueing a slow local-model job; this keeps common
  // open-ended claims answerable even when the provider is saturated.
  const immediateContext = warehouseFocusedResponse || submissionFallback();
  const immediatePlan = (immediateContext as PublicCheckResponse & { result?: AnswerPlan }).result;
  // When the warehouse-backed resolver is configured, let it enrich broad
  // packets with actual observations before returning. The packet remains a
  // safe fallback for deployments without the optional resolver.
  if (immediatePlan && (immediatePlan as ({ id?: string })).id?.startsWith('broad-')
    && (!env.LOCAL_CLASSIFIER_ENDPOINT || !env.LOCAL_CLASSIFIER_TOKEN)) {
    if (!bypassResponseCache && cacheKey) storeResponse(cacheKey, { expiresAt: Date.now() + 5 * 60_000, response: immediateContext });
    return json(immediateContext);
  }

  if (!env.LOCAL_CLASSIFIER_ENDPOINT || !env.LOCAL_CLASSIFIER_TOKEN) {
    const response = warehouseFocusedResponse || submissionFallback();
    if (!bypassResponseCache && cacheKey && response.state === 'supported') storeResponse(cacheKey, { expiresAt: Date.now() + 5 * 60_000, response });
    return json(response);
  }

  if (localCircuitOpenUntil > Date.now()) return json(warehouseUnavailableResponse || warehouseFocusedResponse || submissionFallback());

  try {
    // D1 is the production retrieval index. The local resolver still ranks
    // and checks evidence compatibility, but receives bounded observations
    // from the mirror populated by the daily refresh workflow.
    let warehouseRecords: Record<string, unknown>[] | undefined;
    if (env.DB && body.inputType === 'text') {
      const focus = vacancyMetrics.length ? undefined : initialFocus;
      const comparisonMetrics = vacancyMetrics.length ? vacancyMetrics : focus
        ? [...(focusedMetricIdsFor(effectiveClaim) || [])]
        : [...directMetricIdsForQuery(effectiveClaim)];
      const [contractRows, searchRows] = await Promise.all([
        focusedObservations ? Promise.resolve(focusedObservations) : comparisonMetrics.length ? searchD1WarehouseByMetricIds(env.DB, comparisonMetrics).catch(() => []) : Promise.resolve([]),
        searchD1Warehouse(env.DB, effectiveClaim).catch(() => []),
      ]);
      // Put the typed series first: the downstream payload has a 500-row cap.
      warehouseRecords = [...new Map([...contractRows, ...searchRows].map((row) => [row.id, row])).values()].slice(0, 500);
    }
    const isMultipart = Boolean(body.file);
    const payload = isMultipart ? (() => {
      const form = new FormData();
      form.set('text', body.text);
      form.set('inputType', body.inputType);
      if (warehouseRecords) form.set('warehouseRecords', JSON.stringify(warehouseRecords));
      if (body.clarification) form.set('clarification', JSON.stringify(body.clarification));
      if (body.file) form.set('file', body.file, body.file.name || 'upload');
      return form;
    })() : JSON.stringify({ text: body.inputType === 'text' ? effectiveClaim : body.text, inputType: body.inputType, clarification: body.clarification, ...(warehouseRecords ? { warehouseRecords } : {}) });
    const headers = new Headers();
    if (!isMultipart) headers.set('content-type', 'application/json');
    headers.set('authorization', `Bearer ${env.LOCAL_CLASSIFIER_TOKEN}`);
    const upstream = linkedTimeout(request, 8000);
    let upstreamResponse: Response;
    try {
      upstreamResponse = await fetch(`${env.LOCAL_CLASSIFIER_ENDPOINT}/v1/classify`, { method: 'POST', headers, body: payload, signal: upstream.signal });
    } finally { upstream.dispose(); }
    if (!upstreamResponse.ok) {
      localFailureCount += 1;
      if (localFailureCount >= circuitBreakAfter) localCircuitOpenUntil = Date.now() + circuitCooldownMs;
      return json(warehouseUnavailableResponse || warehouseFocusedResponse || submissionFallback());
    }
    localFailureCount = 0;
    const upstreamPayload = await upstreamResponse.json().catch(() => undefined);
    const safe = publicResolveResponse(upstreamPayload) as ResolveResult | undefined;
    if (safe?.status === 'processing' && safe.requestId) {
      // The local resolver has already accepted the job. Expose a deterministic
      // answer when it is sufficiently grounded so the user gets useful
      // context while optional model enrichment continues in the background.
      const previewResponse = warehouseUnavailableResponse || warehouseFocusedResponse || submissionFallback();
      const preview = usefulPreview(previewResponse);
      return json(processingCheck(body.text, safe.requestId, preview), 202);
    }
    // A local model may correctly reject the slogan as too broad while the
    // deterministic knowledge layer can still provide scoped, sourced
    // context. Prefer that context only when it improves an insufficient
    // model result; never replace a supported or clarification response.
    const response = safe?.result
      ? resolvedResponse(effectiveClaim, safe, safe?.requestId, body.inputType !== 'text', !body.clarification, warehouseUnavailableResponse || warehouseFocusedResponse)
      : warehouseUnavailableResponse || resolvedResponse(effectiveClaim, safe, safe?.requestId, body.inputType !== 'text', !body.clarification, warehouseFocusedResponse);
    if (safe?.extraction && safe.requestId && safe.extraction.status !== 'failed') context.waitUntil(captureClaimDemand(env.DB, extractedClaim(safe.extraction), safe.extraction.inputType, safe.requestId));
    if (!bypassResponseCache && cacheKey && response.state === 'supported') storeResponse(cacheKey, { expiresAt: Date.now() + 10 * 60_000, response });
    return json(response);
  } catch {
    localFailureCount += 1;
    if (localFailureCount >= circuitBreakAfter) localCircuitOpenUntil = Date.now() + circuitCooldownMs;
    return json(warehouseUnavailableResponse || warehouseFocusedResponse || submissionFallback());
  }
};

export const onRequestGet = async (context: Context): Promise<Response> => {
  const { request, env } = context;
  const id = new URL(request.url).pathname.split('/').filter(Boolean).pop() || '';
  if (!id || !env.LOCAL_CLASSIFIER_ENDPOINT || !env.LOCAL_CLASSIFIER_TOKEN) return json(unavailableCheck('', 'El análisis local no está disponible ahora.'));
  try {
    const upstream = await fetch(`${env.LOCAL_CLASSIFIER_ENDPOINT}/v1/classify/${encodeURIComponent(id)}`, { headers: { authorization: `Bearer ${env.LOCAL_CLASSIFIER_TOKEN}` }, signal: AbortSignal.timeout(2000) });
    const payload = await upstream.json().catch(() => undefined);
    const safe = publicResolveResponse(payload) as ResolveResult | undefined;
    // New clients send the submitted text as UTF-8 JSON. HTTP field values are
    // not a reliable transport for arbitrary Unicode text (for example, ñ/á
    // may be replaced while a delayed result is rebuilt). Keep the old header
    // as a compatibility fallback for already-open clients.
    const pollBody = request.method === 'POST'
      ? await request.json().catch(() => undefined) as { claim?: unknown } | undefined
      : undefined;
    const requestedClaim = (typeof pollBody?.claim === 'string' ? pollBody.claim : request.headers.get('x-claim-text'))?.slice(0, 12_000).trim() || '';
    const claim = (typeof (payload as { claim?: unknown })?.claim === 'string' ? (payload as { claim: string }).claim.slice(0, INPUT_LIMITS.maxTextCharacters) : '')
      || requestedClaim;
    if (safe?.status === 'processing') return json(processingCheck(claim, id), 202);
    const response = resolvedResponse(claim, safe, id, Boolean((payload as { inputType?: string })?.inputType && (payload as { inputType?: string }).inputType !== 'text'));
    if (safe?.extraction && safe.extraction.status !== 'failed') context.waitUntil(captureClaimDemand(env.DB, extractedClaim(safe.extraction), safe.extraction.inputType, id));
    return json(response);
  } catch {
    // A slow local resolver is still working; preserve the job state so the
    // client can continue polling instead of converting a transient 2s edge
    // timeout into a terminal unavailable result.
    return json(processingCheck('', id), 202);
  }
};
