interface DatabaseStatement {
  bind(...values: unknown[]): DatabaseStatement;
  run(): Promise<unknown>;
}

interface Database { prepare(query: string): DatabaseStatement }
interface Env { DB?: Database }
interface Context { request: Request; env: Env }
import { allowRateLimitedRequest } from '../lib/rate-limit';

const json = (body: unknown, status = 200): Response => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export const onRequestPost = async ({ request, env }: Context): Promise<Response> => {
  if (!(await allowRateLimitedRequest(request, env, { scope: 'feedback', limit: 30 }))) return json({ status: 'unavailable' }, 429);
  if (!env.DB) return json({ status: 'unavailable' }, 503);
  let body: { requestId?: unknown; value?: unknown };
  try { body = await request.json() as { requestId?: unknown; value?: unknown }; } catch { return json({ status: 'invalid' }, 400); }
  const requestId = typeof body.requestId === 'string' ? body.requestId.trim().slice(0, 80) : '';
  const value = body.value === 'yes' || body.value === 'partly' || body.value === 'no' ? body.value : '';
  if (!requestId || !value) return json({ status: 'invalid' }, 400);
  const id = `${requestId}-${value}`;
  try {
    await env.DB.prepare(`INSERT OR IGNORE INTO answer_feedback (id, request_id, value, created_at) VALUES (?, ?, ?, ?)`)
      .bind(id, requestId, value, new Date().toISOString()).run();
    return json({ status: 'accepted' }, 202);
  } catch { return json({ status: 'unavailable' }, 503); }
};
