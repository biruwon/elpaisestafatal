interface Env { LOCAL_CLASSIFIER_ENDPOINT?: string; LOCAL_CLASSIFIER_TOKEN?: string }
interface Context { request: Request; env: Env; params: { requestId: string } }

const linkedTimeout = (request: Request, milliseconds: number): { signal: AbortSignal; dispose: () => void } => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), milliseconds);
  const cancel = () => controller.abort();
  if (request.signal.aborted) cancel();
  else request.signal.addEventListener('abort', cancel, { once: true });
  return { signal: controller.signal, dispose: () => { clearTimeout(timer); request.signal.removeEventListener('abort', cancel); } };
};

const requestWindows = new Map<string, { startedAt: number; count: number }>();
const allowRequest = (request: Request): boolean => {
  const key = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anonymous';
  const now = Date.now();
  const current = requestWindows.get(key);
  if (!current || now - current.startedAt >= 60_000) { requestWindows.set(key, { startedAt: now, count: 1 }); return true; }
  if (current.count >= 120) return false;
  current.count += 1;
  return true;
};

export const onRequestGet = async ({ request, env, params }: Context): Promise<Response> => {
  if (!allowRequest(request)) return Response.json({ status: 'unavailable' }, { status: 429, headers: { 'Cache-Control': 'no-store' } });
  if (!env.LOCAL_CLASSIFIER_ENDPOINT) return Response.json({ status: 'unavailable' }, { headers: { 'Cache-Control': 'no-store' } });
  try {
    const headers = new Headers();
    if (env.LOCAL_CLASSIFIER_TOKEN) headers.set('authorization', `Bearer ${env.LOCAL_CLASSIFIER_TOKEN}`);
    const upstream = linkedTimeout(request, 5000);
    let response: Response;
    try {
      response = await fetch(`${env.LOCAL_CLASSIFIER_ENDPOINT}/v1/resolve/${encodeURIComponent(params.requestId)}`, { headers, signal: upstream.signal });
    } finally { upstream.dispose(); }
    if (!response.ok) return Response.json({ status: 'unavailable' }, { headers: { 'Cache-Control': 'no-store' } });
    return new Response(response.body, { status: response.status, headers: { 'content-type': 'application/json', 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ status: 'unavailable' }, { headers: { 'Cache-Control': 'no-store' } });
  }
};
