interface Env { LOCAL_CLASSIFIER_ENDPOINT?: string; LOCAL_CLASSIFIER_TOKEN?: string }
interface Context { request: Request; env: Env }
interface SafeMetrics { received?: number; completed?: number; unavailable?: number; cacheHitRate?: number; p95LatencyMs?: number; statusCounts?: Record<string, number> }

const response = (body: unknown): Response => Response.json(body, {
  headers: { 'Cache-Control': 'no-store' },
});

export const onRequestGet = async ({ env }: Context): Promise<Response> => {
  if (!env.LOCAL_CLASSIFIER_ENDPOINT) {
    return response({ status: 'ok', deterministic: true, dynamic: false });
  }
  try {
    const headers = new Headers();
    if (env.LOCAL_CLASSIFIER_TOKEN) headers.set('authorization', `Bearer ${env.LOCAL_CLASSIFIER_TOKEN}`);
    const upstream = await fetch(`${env.LOCAL_CLASSIFIER_ENDPOINT}/healthz`, {
      headers,
      signal: AbortSignal.timeout(1500),
    });
    const body = await upstream.json().catch(() => ({})) as { metrics?: SafeMetrics; queue?: number };
    return response({ status: upstream.ok ? 'ok' : 'degraded', deterministic: true, dynamic: upstream.ok, ...(body.metrics ? { metrics: body.metrics } : {}), ...(typeof body.queue === 'number' ? { queue: body.queue } : {}) });
  } catch {
    // The static application remains healthy when the optional dynamic origin
    // is unavailable. Do not expose the origin or failure details publicly.
    return response({ status: 'degraded', deterministic: true, dynamic: false });
  }
};
