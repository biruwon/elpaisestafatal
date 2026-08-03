import { safeHealthEnvelope } from '../../src/lib/knowledge/safe-health.mjs';

interface Env { LOCAL_CLASSIFIER_ENDPOINT?: string; LOCAL_CLASSIFIER_TOKEN?: string }
interface Context { request: Request; env: Env }

const response = (body: unknown): Response => Response.json(body, {
  headers: { 'Cache-Control': 'no-store' },
});

export const onRequestGet = async ({ env }: Context): Promise<Response> => {
  if (!env.LOCAL_CLASSIFIER_ENDPOINT || !env.LOCAL_CLASSIFIER_TOKEN) {
    return response({ status: 'ok', deterministic: true, dynamic: false });
  }
  try {
    const headers = new Headers();
    if (env.LOCAL_CLASSIFIER_TOKEN) headers.set('authorization', `Bearer ${env.LOCAL_CLASSIFIER_TOKEN}`);
    const upstream = await fetch(`${env.LOCAL_CLASSIFIER_ENDPOINT}/healthz`, {
      headers,
      signal: AbortSignal.timeout(1500),
    });
    const body = await upstream.json().catch(() => undefined);
    const envelope = upstream.ok ? safeHealthEnvelope(body) : undefined;
    return response({ status: envelope ? 'ok' : 'degraded', deterministic: true, dynamic: envelope?.dynamic === true, ...(envelope?.metrics ? { metrics: envelope.metrics } : {}), ...(envelope?.queue !== undefined ? { queue: envelope.queue } : {}) });
  } catch {
    // The static application remains healthy when the optional dynamic origin
    // is unavailable. Do not expose the origin or failure details publicly.
    return response({ status: 'degraded', deterministic: true, dynamic: false });
  }
};
