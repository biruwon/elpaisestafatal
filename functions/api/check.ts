interface Env { LOCAL_CLASSIFIER_ENDPOINT?: string; LOCAL_CLASSIFIER_TOKEN?: string; LOCAL_MODEL_VERSION?: string; CATALOGUE_VERSION?: string }
interface Context { request: Request; env: Env }
type InputType = 'text' | 'image' | 'audio' | 'url';

import { allowRateLimitedRequest } from '../lib/rate-limit';
import { INPUT_LIMITS, validateInputMetadata } from '../../src/lib/knowledge/input-contract.mjs';
import { deterministicApiFallback } from '../../src/lib/knowledge/deterministic-api-fallback.mjs';
import { publicResolveResponse } from '../../src/lib/knowledge/public-response.mjs';
import type { AnswerPlan, ResolveResult } from '../../src/lib/knowledge/contracts';
import { routeCatalogueQuery } from '../lib/catalogue-resolver';
import { checkFromCatalogue, checkFromPlan, processingCheck, unavailableCheck } from '../lib/public-check-response';
import type { PublicCheckResponse } from '../../src/lib/knowledge/public-check';

const cache = new Map<string, { expiresAt: number; response: PublicCheckResponse }>();
let localCircuitOpenUntil = 0;
let localFailureCount = 0;
const circuitBreakAfter = 2;
const circuitCooldownMs = 30_000;

const semanticFingerprint = (text: string): string => text.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, ' ').trim();
const cacheKeyFor = (body: { text: string; inputType: InputType; file?: File; clarification?: Clarification }, env: Env): string => {
  const media = body.file ? `${body.file.type}:${body.file.size}:${body.file.name}` : '';
  return [semanticFingerprint(body.text), semanticFingerprint(body.clarification?.prompt || ''), body.inputType, media, env.LOCAL_MODEL_VERSION || 'local', env.CATALOGUE_VERSION || 'catalogue'].join('|');
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
    const inputType = value.inputType === 'image' || value.inputType === 'audio' || value.inputType === 'url' ? value.inputType : 'text';
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
    inputType: ['image', 'audio', 'url'].includes(String(form.get('inputType') || '')) ? String(form.get('inputType')) as InputType : 'text',
    file: candidate instanceof File ? candidate : undefined,
    clarification,
  };
};

const planFrom = (value: ResolveResult): AnswerPlan | undefined => value.result;

const fallbackResponse = (claim: string, inputType: InputType): PublicCheckResponse => {
  const fallback = deterministicApiFallback({ text: claim, inputType }) as ResolveResult & { guidance?: { limitation?: string; questions?: string[] } };
  const plan = planFrom(fallback);
  if (plan) return checkFromPlan(claim, plan, fallback.requestId);
  return unavailableCheck(claim, fallback.guidance?.limitation || 'La comprobación no está disponible en este momento.');
};

const rhetoricalClaim = (claim: string): boolean => {
  const text = semanticFingerprint(claim);
  return /\b(?:mienten|miente|engañan|enganan|manipulan|manipula|ocultan|oculta|falsean|falsea|maquillan|maquilla|invaden|invade|destruyendo|destruye|no se puede salir|imposible salir|da miedo)\b/.test(text);
};

// A related warehouse hit is not automatically better than a reviewed
// contextual answer. For rhetorical claims, require the dynamic plan to
// explicitly carry qualification; otherwise use the domain packet, which
// preserves the distinction between measurable facts and the slogan.
const chooseResponse = (claim: string, model: PublicCheckResponse | undefined, contextual: PublicCheckResponse): PublicCheckResponse => {
  const contextualPlan = (contextual as PublicCheckResponse & { result?: AnswerPlan }).result;
  // A reviewed broad-domain packet is an answerable, sourced fallback. Never
  // let a malformed or empty provider response hide it, regardless of whether
  // the provider labelled that response limited or insufficient.
  if ((contextualPlan as ({ id?: string } | undefined))?.id?.startsWith('broad-') && model?.state !== 'supported') return contextual;
  if (!model || model.state === 'insufficient') return contextual.state !== 'insufficient' ? contextual : model || contextual;
  if (contextual.state === 'supported' && model.state === 'limited' && !(model.result?.sources?.length) && !(model.result?.criteria?.length)) return contextual;
  if (contextual.state === 'insufficient' || !rhetoricalClaim(claim)) return model;
  const plan = (model as PublicCheckResponse & { result?: AnswerPlan }).result;
  const summary = plan?.evidenceSummary;
  const hasQualification = Boolean(plan?.limitation || plan?.blocks?.some((block) => block.type === 'cannot_conclude') || summary?.missingDimensions?.length);
  const contextualFamilies = contextualPlan?.evidenceSummary?.families?.length || 0;
  if (!hasQualification || (summary?.mode === 'none' && contextualFamilies >= 2)) return contextual;
  return model;
};

export const onRequestPost = async ({ request, env }: Context): Promise<Response> => {
  if (!(await allowRateLimitedRequest(request, env, { scope: 'check', limit: 30 }))) return json(unavailableCheck('', 'Has alcanzado el límite temporal de comprobaciones.'), 429);
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > INPUT_LIMITS.maxRequestBytes) return json(unavailableCheck('', 'El archivo o texto supera el tamaño permitido.'), 413);

  let body: { text: string; inputType: InputType; file?: File; clarification?: Clarification };
  try { body = await requestBody(request); } catch { return json(unavailableCheck('', 'No hemos podido leer la solicitud.'), 400); }
  const validation = validateInputMetadata({ text: body.text, inputType: body.inputType, hasFile: Boolean(body.file), fileSize: body.file?.size, mimeType: body.file?.type });
  if (!validation.ok) return json(validation.code === 'empty' ? fallbackResponse(body.text, body.inputType) : unavailableCheck(body.text, validation.code), validation.code === 'file_too_large' || validation.code === 'text_too_large' ? 413 : 400);

  const cacheKey = cacheKeyFor(body, env);
  const cached = cacheKey ? cache.get(cacheKey) : undefined;
  if (cached && cached.expiresAt > Date.now()) return json(cached.response);
  if (cached) cache.delete(cacheKey);
  const effectiveClaim = body.clarification?.interpretation?.normalizedClaim || body.clarification?.prompt || body.text;

  if (body.inputType === 'text') {
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
      cache.set(cacheKey, { expiresAt: Date.now() + 15 * 60_000, response });
      return json(response);
    }
  if (body.clarification) {
      const response = fallbackResponse(effectiveClaim, body.inputType);
      if (cacheKey) cache.set(cacheKey, { expiresAt: Date.now() + 5 * 60_000, response });
      return json(response);
    }
  }

  // Broad-domain packets are already reviewed and deterministic. Return them
  // immediately instead of queueing a slow local-model job; this keeps common
  // open-ended claims answerable even when the provider is saturated.
  const immediateContext = fallbackResponse(effectiveClaim, body.inputType);
  const immediatePlan = (immediateContext as PublicCheckResponse & { result?: AnswerPlan }).result;
  if (immediatePlan && (immediatePlan as ({ id?: string })).id?.startsWith('broad-')) {
    if (cacheKey) cache.set(cacheKey, { expiresAt: Date.now() + 5 * 60_000, response: immediateContext });
    return json(immediateContext);
  }

  if (!env.LOCAL_CLASSIFIER_ENDPOINT || !env.LOCAL_CLASSIFIER_TOKEN) {
    const response = fallbackResponse(effectiveClaim, body.inputType);
    if (cacheKey && response.state === 'supported') cache.set(cacheKey, { expiresAt: Date.now() + 5 * 60_000, response });
    return json(response);
  }

  if (localCircuitOpenUntil > Date.now()) return json(fallbackResponse(effectiveClaim, body.inputType));

  try {
    const isMultipart = Boolean(body.file);
    const payload = isMultipart ? (() => {
      const form = new FormData();
      form.set('text', body.text);
      form.set('inputType', body.inputType);
      if (body.clarification) form.set('clarification', JSON.stringify(body.clarification));
      if (body.file) form.set('file', body.file, body.file.name || 'upload');
      return form;
    })() : JSON.stringify({ text: body.text, inputType: body.inputType, clarification: body.clarification });
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
      return json(fallbackResponse(effectiveClaim, body.inputType));
    }
    localFailureCount = 0;
    const upstreamPayload = await upstreamResponse.json().catch(() => undefined);
    const safe = publicResolveResponse(upstreamPayload) as ResolveResult | undefined;
    if (safe?.status === 'processing' && safe.requestId) {
      return json(processingCheck(body.text, safe.requestId), 202);
    }
    const plan = safe?.result;
    const modelResponse = plan ? checkFromPlan(effectiveClaim, plan, safe?.requestId, !body.clarification) : undefined;
    // A local model may correctly reject the slogan as too broad while the
    // deterministic knowledge layer can still provide scoped, sourced
    // context. Prefer that context only when it improves an insufficient
    // model result; never replace a supported or clarification response.
    const contextualFallback = fallbackResponse(effectiveClaim, body.inputType);
    const response = chooseResponse(effectiveClaim, modelResponse, contextualFallback);
    if (cacheKey && response.state === 'supported') cache.set(cacheKey, { expiresAt: Date.now() + 10 * 60_000, response });
    return json(response);
  } catch {
    localFailureCount += 1;
    if (localFailureCount >= circuitBreakAfter) localCircuitOpenUntil = Date.now() + circuitCooldownMs;
    return json(fallbackResponse(effectiveClaim, body.inputType));
  }
};

export const onRequestGet = async ({ request, env }: Context): Promise<Response> => {
  const id = new URL(request.url).pathname.split('/').filter(Boolean).pop() || '';
  if (!id || !env.LOCAL_CLASSIFIER_ENDPOINT || !env.LOCAL_CLASSIFIER_TOKEN) return json(unavailableCheck('', 'El análisis local no está disponible ahora.'));
  try {
    const upstream = await fetch(`${env.LOCAL_CLASSIFIER_ENDPOINT}/v1/classify/${encodeURIComponent(id)}`, { headers: { authorization: `Bearer ${env.LOCAL_CLASSIFIER_TOKEN}` }, signal: AbortSignal.timeout(2000) });
    const payload = await upstream.json().catch(() => undefined);
    const safe = publicResolveResponse(payload) as ResolveResult | undefined;
    const claim = typeof (payload as { claim?: unknown })?.claim === 'string' ? (payload as { claim: string }).claim : '';
    if (safe?.status === 'processing') return json(processingCheck(claim, id), 202);
    const response = safe?.result ? checkFromPlan(claim, safe.result, id) : unavailableCheck(claim, 'La comprobación no pudo completarse.');
    return json(response);
  } catch {
    // A slow local resolver is still working; preserve the job state so the
    // client can continue polling instead of converting a transient 2s edge
    // timeout into a terminal unavailable result.
    return json(processingCheck('', id), 202);
  }
};
