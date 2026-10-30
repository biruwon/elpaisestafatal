interface Env { DB?: ClaimDemandDatabase; LOCAL_CLASSIFIER_ENDPOINT?: string; LOCAL_CLASSIFIER_TOKEN?: string; LOCAL_MODEL_VERSION?: string; CATALOGUE_VERSION?: string }
interface Context { request: Request; env: Env; waitUntil(promise: Promise<unknown>): void }
type InputType = 'text' | 'image' | 'audio' | 'document' | 'video' | 'url';

import { allowRateLimitedRequest } from '../lib/rate-limit';
import { INPUT_LIMITS, validateInputMetadata, inputErrorMessage } from '../../src/lib/knowledge/input-contract.mjs';
import { boundedRequest, RequestTooLargeError } from '../../src/lib/knowledge/bounded-request.mjs';
import { attachExtraction, extractedClaim } from '../../src/lib/knowledge/submission.mjs';
import { measurementMeaningPlan } from '../../src/lib/knowledge/measurement-meaning.mjs';
import { claimFocusFor } from '../../src/lib/knowledge/claim-focus.mjs';
import { deterministicApiFallback } from '../../src/lib/knowledge/deterministic-api-fallback.mjs';
import { publicResolveResponse } from '../../src/lib/knowledge/public-response.mjs';
import type { AnswerPlan, ResolveResult } from '../../src/lib/knowledge/contracts';
import { routeCatalogueQuery } from '../lib/catalogue-resolver';
import { checkFromCatalogue, checkFromPlan, processingCheck, unavailableCheck } from '../lib/public-check-response';
import { reviewedContextualAnswer } from '../lib/reviewed-contextual-answer.mjs';
import type { PublicCheckResponse } from '../../src/lib/knowledge/public-check';
import { captureClaimDemand, type ClaimDemandDatabase } from '../lib/claim-demand';
import { searchD1Warehouse } from '../lib/d1-warehouse';

const cache = new Map<string, { expiresAt: number; response: PublicCheckResponse }>();
// Bump this when response-selection semantics change so a warm Worker isolate
// cannot serve a result produced by an older precedence rule.
const responseCacheVersion = 'claim-measurement-focus-21-2026-10';
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
const responseCacheBypassed = (request: Request): boolean => {
  const url = new URL(request.url);
  return ['1', 'true'].includes((url.searchParams.get('fresh') || '').toLocaleLowerCase())
    || request.headers.get('x-development-no-cache') === '1';
};
const cacheKeyFor = (body: { text: string; inputType: InputType; file?: File; clarification?: Clarification }, env: Env): string => {
  // Names, sizes and lossy text fingerprints cannot identify submitted content.
  // Uploads and fetched pages are never shared through this response cache.
  if (body.file || body.inputType !== 'text') return '';
  return JSON.stringify([responseCacheVersion, body.text.normalize('NFC'), body.clarification || null, env.LOCAL_MODEL_VERSION || 'local', env.CATALOGUE_VERSION || 'catalogue']);
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
  if ((model?.state === 'supported' || model?.state === 'limited' || model?.state === 'insufficient')
    && model.result.answerScope?.kind === 'measurement' && claimFocusFor(claim)?.id === model.result.answerScope.family) return model;
  const reviewed = reviewedContextualAnswer(model, contextual);
  if (reviewed) return reviewed as PublicCheckResponse;
  const contextualPlan = (contextual as PublicCheckResponse & { result?: AnswerPlan }).result;
  const modelPlan = (model as PublicCheckResponse & { result?: AnswerPlan } | undefined)?.result;
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

const resolvedResponse = (claim: string, safe: ResolveResult | undefined, id?: string, requireExtraction = false, allowClarification = true): PublicCheckResponse => {
  if (requireExtraction && !safe?.extraction) return unavailableCheck(claim, 'No se ha podido leer el contenido. Pega la afirmación para comprobarla.');
  const extraction = safe?.extraction;
  const actualClaim = extraction ? extractedClaim(extraction) : claim;
  const meaning = measurementMeaningPlan(actualClaim) as AnswerPlan | undefined;
  if (meaning) return attachExtraction(checkFromPlan(actualClaim, meaning, id || safe?.requestId), extraction) as PublicCheckResponse;
  if (!safe?.result && extraction) return attachExtraction(unavailableCheck(actualClaim, extraction.warnings[0] || 'No se ha podido completar la comprobación.'), extraction) as PublicCheckResponse;
  const model = safe?.result ? checkFromPlan(actualClaim, safe.result, id || safe.requestId, allowClarification) : undefined;
  const response = chooseResponse(actualClaim, model, fallbackResponse(actualClaim, 'text'));
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
  const submissionFallback = (): PublicCheckResponse => body.inputType === 'text'
    ? fallbackResponse(effectiveClaim, 'text')
    : unavailableCheck(body.text, 'No hemos podido leer el contenido ahora. Pega el texto de la afirmación para comprobarlo.');
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
  }

  // Broad-domain packets are already reviewed and deterministic. Return them
  // immediately instead of queueing a slow local-model job; this keeps common
  // open-ended claims answerable even when the provider is saturated.
  const immediateContext = submissionFallback();
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
    const response = submissionFallback();
    if (!bypassResponseCache && cacheKey && response.state === 'supported') storeResponse(cacheKey, { expiresAt: Date.now() + 5 * 60_000, response });
    return json(response);
  }

  if (localCircuitOpenUntil > Date.now()) return json(submissionFallback());

  try {
    // D1 is the production retrieval index. The local resolver still ranks
    // and checks evidence compatibility, but receives bounded observations
    // from the mirror populated by the daily refresh workflow.
    let warehouseRecords: Record<string, unknown>[] | undefined;
    if (env.DB && body.inputType === 'text') {
      try { warehouseRecords = await searchD1Warehouse(env.DB, effectiveClaim); } catch { /* Fall back to the local source snapshot if D1 is unavailable. */ }
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
      return json(submissionFallback());
    }
    localFailureCount = 0;
    const upstreamPayload = await upstreamResponse.json().catch(() => undefined);
    const safe = publicResolveResponse(upstreamPayload) as ResolveResult | undefined;
    if (safe?.status === 'processing' && safe.requestId) {
      // The local resolver has already accepted the job. Expose a deterministic
      // answer when it is sufficiently grounded so the user gets useful
      // context while optional model enrichment continues in the background.
      const previewResponse = submissionFallback();
      const preview = usefulPreview(previewResponse);
      return json(processingCheck(body.text, safe.requestId, preview), 202);
    }
    // A local model may correctly reject the slogan as too broad while the
    // deterministic knowledge layer can still provide scoped, sourced
    // context. Prefer that context only when it improves an insufficient
    // model result; never replace a supported or clarification response.
    const response = resolvedResponse(effectiveClaim, safe, safe?.requestId, body.inputType !== 'text', !body.clarification);
    if (safe?.extraction && safe.requestId && safe.extraction.status !== 'failed') context.waitUntil(captureClaimDemand(env.DB, extractedClaim(safe.extraction), safe.extraction.inputType, safe.requestId));
    if (!bypassResponseCache && cacheKey && response.state === 'supported') storeResponse(cacheKey, { expiresAt: Date.now() + 10 * 60_000, response });
    return json(response);
  } catch {
    localFailureCount += 1;
    if (localFailureCount >= circuitBreakAfter) localCircuitOpenUntil = Date.now() + circuitCooldownMs;
    return json(submissionFallback());
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
