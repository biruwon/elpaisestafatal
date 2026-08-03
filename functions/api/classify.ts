interface Env { LOCAL_CLASSIFIER_ENDPOINT?: string; LOCAL_CLASSIFIER_TOKEN?: string }
interface Context { request: Request; env: Env }
type InputType = 'text' | 'image' | 'audio' | 'url';
import { allowRateLimitedRequest } from '../lib/rate-limit';
import { INPUT_LIMITS, validateInputMetadata } from '../../src/lib/knowledge/input-contract.mjs';
import { deterministicApiFallback } from '../../src/lib/knowledge/deterministic-api-fallback.mjs';
import { publicResolveResponse } from '../../src/lib/knowledge/public-response.mjs';

const json = (body: unknown, status = 200): Response => Response.json(body, {
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

const requestBody = async (request: Request): Promise<{ text: string; inputType: InputType; file?: File }> => {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const value = await request.json() as { text?: unknown; inputType?: unknown };
    const inputType = value.inputType === 'image' || value.inputType === 'audio' || value.inputType === 'url' ? value.inputType : 'text';
    return { text: typeof value.text === 'string' ? value.text.trim() : '', inputType };
  }
  const form = await request.formData();
  const candidate = form.get('file');
  return {
    text: String(form.get('text') || '').trim(),
    inputType: ['image', 'audio', 'url'].includes(String(form.get('inputType') || '')) ? String(form.get('inputType')) as InputType : 'text',
    file: candidate instanceof File ? candidate : undefined,
  };
};

export const onRequestPost = async ({ request, env }: Context): Promise<Response> => {
  if (!(await allowRateLimitedRequest(request, env, { scope: 'classify', limit: 30 }))) return json({ status: 'unavailable', relatedClaims: [] }, 429);
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > INPUT_LIMITS.maxRequestBytes) return json({ status: 'unavailable', relatedClaims: [] }, 413);
  let body: { text: string; inputType: InputType; file?: File };
  try { body = await requestBody(request); } catch { return json({ status: 'unavailable', relatedClaims: [] }, 400); }
  const validation = validateInputMetadata({ text: body.text, inputType: body.inputType, hasFile: Boolean(body.file), fileSize: body.file?.size, mimeType: body.file?.type });
  if (!validation.ok) {
    if (validation.code === 'empty') return json(deterministicApiFallback({ text: body.text, inputType: body.inputType }), 400);
    return json({ status: validation.code === 'text_too_large' || validation.code === 'invalid_url' ? 'uncovered' : 'unavailable', relatedClaims: [] }, validation.code === 'file_too_large' || validation.code === 'text_too_large' ? 413 : validation.code === 'invalid_url' ? 400 : 415);
  }
  if (!env.LOCAL_CLASSIFIER_ENDPOINT) return json(deterministicApiFallback({ text: body.text, inputType: body.inputType }));
  try {
    const isMultipart = Boolean(body.file);
    const payload = isMultipart ? (() => {
      const form = new FormData();
      form.set('text', body.text);
      form.set('inputType', body.inputType);
      if (body.file) form.set('file', body.file, body.file.name || 'upload');
      return form;
    })() : JSON.stringify({ text: body.text, inputType: body.inputType });
    const headers = new Headers();
    if (!isMultipart) headers.set('content-type', 'application/json');
    if (env.LOCAL_CLASSIFIER_TOKEN) headers.set('authorization', `Bearer ${env.LOCAL_CLASSIFIER_TOKEN}`);
    const upstream = linkedTimeout(request, 12000);
    let response: Response;
    try {
      response = await fetch(`${env.LOCAL_CLASSIFIER_ENDPOINT}/v1/classify`, { method: 'POST', headers, body: payload, signal: upstream.signal });
    } finally { upstream.dispose(); }
    if (!response.ok) return json(deterministicApiFallback({ text: body.text, inputType: body.inputType }));
    const upstreamPayload = await response.json().catch(() => undefined);
    const safe = publicResolveResponse(upstreamPayload);
    return safe ? json(safe) : json(deterministicApiFallback({ text: body.text, inputType: body.inputType }));
  } catch {
    return json(deterministicApiFallback({ text: body.text, inputType: body.inputType }));
  }
};
