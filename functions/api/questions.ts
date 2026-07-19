interface DatabaseStatement {
  bind(...values: unknown[]): DatabaseStatement;
  run(): Promise<unknown>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
}

interface Database {
  prepare(query: string): DatabaseStatement;
}

interface Env { DB?: Database }
interface Context { request: Request; env: Env }

const requestWindows = new Map<string, { startedAt: number; count: number }>();
const allowRequest = (request: Request): boolean => {
  const key = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anonymous';
  const now = Date.now();
  const current = requestWindows.get(key);
  if (!current || now - current.startedAt >= 60_000) { requestWindows.set(key, { startedAt: now, count: 1 }); return true; }
  if (current.count >= 60) return false;
  current.count += 1;
  return true;
};

const json = (body: unknown, status = 200): Response => Response.json(body, {
  status,
  headers: { 'Cache-Control': 'no-store' },
});

const normalise = (value: string): string => value.toLocaleLowerCase('es').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 12000);

const digest = async (value: string): Promise<string> => {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

export const onRequestPost = async ({ request, env }: Context): Promise<Response> => {
  if (!allowRequest(request)) return json({ status: 'unavailable' }, 429);
  if (Number(request.headers.get('content-length') || 0) > 64 * 1024) return json({ status: 'invalid' }, 413);
  if (!env.DB) return json({ status: 'unavailable' }, 503);
  const body = await request.json() as { text?: unknown; canonical?: unknown; inputType?: unknown; status?: unknown; requestId?: unknown };
  const text = typeof body.text === 'string' ? body.text.trim().slice(0, 12000) : '';
  if (!text) return json({ status: 'invalid' }, 400);
  const normalized = normalise(text);
  const canonical = typeof body.canonical === 'string' && body.canonical.trim() ? normalise(body.canonical).slice(0, 12000) : normalized;
  const id = typeof body.requestId === 'string' && body.requestId ? body.requestId.slice(0, 80) : (await digest(normalized)).slice(0, 32);
  const now = new Date().toISOString();
  const inputType = typeof body.inputType === 'string' ? body.inputType.slice(0, 20) : 'text';
  const status = typeof body.status === 'string' ? body.status.slice(0, 30) : 'received';
  try {
    await env.DB.prepare(`INSERT OR IGNORE INTO resolve_requests (id, normalized_text, canonical_signature, input_type, status, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(id, normalized, canonical, inputType, status, now).run();
    await env.DB.prepare(`UPDATE resolve_requests SET status = ?, canonical_signature = ? WHERE id = ?`)
      .bind(status, canonical, id).run();
    const clusterId = `cluster-${id}`;
    await env.DB.prepare(`INSERT INTO query_clusters (id, canonical_text, canonical_signature, query_count, last_seen_at, coverage_status) VALUES (?, ?, ?, 1, ?, ?) ON CONFLICT(canonical_signature) DO UPDATE SET query_count = query_count + 1, last_seen_at = excluded.last_seen_at, coverage_status = CASE WHEN query_clusters.coverage_status = 'covered' THEN 'covered' ELSE excluded.coverage_status END`)
      .bind(clusterId, canonical, canonical, now, status === 'complete' ? 'covered' : status).run();
    const cluster = await env.DB.prepare(`SELECT id FROM query_clusters WHERE canonical_signature = ? LIMIT 1`).bind(canonical).all<{ id: string }>();
    const resolvedClusterId = cluster.results[0]?.id || clusterId;
    await env.DB.prepare(`INSERT OR IGNORE INTO query_cluster_members (request_id, cluster_id) VALUES (?, ?)`)
      .bind(id, resolvedClusterId).run();
    return json({ status: 'accepted', requestId: id }, 202);
  } catch {
    return json({ status: 'unavailable' }, 503);
  }
};

export const onRequestGet = async ({ env }: Context): Promise<Response> => {
  if (!env.DB) return json({ status: 'unavailable', claims: [] }, 503);
  try {
    // Raw submissions may contain insults, personal details, or unreviewed
    // allegations. Only explicitly approved canonical questions belong in the
    // public popularity feed.
    const rows = await env.DB.prepare(`SELECT id, canonical_text AS text, query_count AS count, coverage_status AS status FROM query_clusters WHERE review_status = 'published' ORDER BY query_count DESC, last_seen_at DESC LIMIT 12`).all();
    return json({ status: 'ok', claims: rows.results });
  } catch {
    return json({ status: 'unavailable', claims: [] }, 503);
  }
};
