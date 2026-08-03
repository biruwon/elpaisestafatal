interface Env { LOCAL_CLASSIFIER_ENDPOINT?: string; LOCAL_CLASSIFIER_TOKEN?: string }
import { publicResolveResponse } from '../../../src/lib/knowledge/public-response.mjs';
import { allowRateLimitedRequest } from '../../lib/rate-limit';
interface Context { request: Request; env: Env; params: { requestId: string } }

const linkedTimeout = (request: Request, milliseconds: number): { signal: AbortSignal; dispose: () => void } => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), milliseconds);
  const cancel = () => controller.abort();
  if (request.signal.aborted) cancel();
  else request.signal.addEventListener('abort', cancel, { once: true });
  return { signal: controller.signal, dispose: () => { clearTimeout(timer); request.signal.removeEventListener('abort', cancel); } };
};

export const onRequestGet = async ({ request, env, params }: Context): Promise<Response> => {
  if (!(await allowRateLimitedRequest(request, env, { scope: 'classify-poll', limit: 120 }))) return Response.json({ status: 'unavailable' }, { status: 429, headers: { 'Cache-Control': 'no-store' } });
  if (!env.LOCAL_CLASSIFIER_ENDPOINT) return Response.json({ status: 'unavailable' }, { headers: { 'Cache-Control': 'no-store' } });
  try {
    const headers = new Headers();
    if (env.LOCAL_CLASSIFIER_TOKEN) headers.set('authorization', `Bearer ${env.LOCAL_CLASSIFIER_TOKEN}`);
    const upstream = linkedTimeout(request, 5000);
    let response: Response;
    try {
      response = await fetch(`${env.LOCAL_CLASSIFIER_ENDPOINT}/v1/classify/${encodeURIComponent(params.requestId)}`, { headers, signal: upstream.signal });
    } finally { upstream.dispose(); }
    if (!response.ok) return Response.json({ status: 'unavailable' }, { headers: { 'Cache-Control': 'no-store' } });
    const payload = await response.json().catch(() => undefined);
    const safe = publicResolveResponse(payload);
    return safe
      ? Response.json(safe, { headers: { 'Cache-Control': 'no-store' } })
      : Response.json({ status: 'unavailable' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ status: 'unavailable' }, { headers: { 'Cache-Control': 'no-store' } });
  }
};
