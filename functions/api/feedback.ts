interface DatabaseStatement {
  bind(...values: unknown[]): DatabaseStatement;
  run(): Promise<unknown>;
}

interface Database { prepare(query: string): DatabaseStatement }
interface Env { DB?: Database }
interface Context { request: Request; env: Env }

const requestWindows = new Map<string, { startedAt: number; count: number }>();
const allowRequest = (request: Request): boolean => {
  const key = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anonymous';
  const now = Date.now();
  const current = requestWindows.get(key);
  if (!current || now - current.startedAt >= 60_000) { requestWindows.set(key, { startedAt: now, count: 1 }); return true; }
  if (current.count >= 30) return false;
  current.count += 1;
  return true;
};

const json = (body: unknown, status = 200): Response => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export const onRequestPost = async ({ request, env }: Context): Promise<Response> => {
  if (!allowRequest(request)) return json({ status: 'unavailable' }, 429);
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
