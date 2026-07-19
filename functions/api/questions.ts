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
  if (!env.DB) return json({ status: 'unavailable' }, 503);
  const body = await request.json() as { text?: unknown; inputType?: unknown; status?: unknown; requestId?: unknown };
  const text = typeof body.text === 'string' ? body.text.trim().slice(0, 12000) : '';
  if (!text) return json({ status: 'invalid' }, 400);
  const normalized = normalise(text);
  const id = typeof body.requestId === 'string' && body.requestId ? body.requestId.slice(0, 80) : (await digest(normalized)).slice(0, 32);
  const now = new Date().toISOString();
  const inputType = typeof body.inputType === 'string' ? body.inputType.slice(0, 20) : 'text';
  const status = typeof body.status === 'string' ? body.status.slice(0, 30) : 'received';
  try {
    await env.DB.prepare(`INSERT OR IGNORE INTO resolve_requests (id, normalized_text, canonical_signature, input_type, status, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(id, normalized, normalized, inputType, status, now).run();
    await env.DB.prepare(`UPDATE resolve_requests SET status = ?, canonical_signature = ? WHERE id = ?`)
      .bind(status, normalized, id).run();
    const clusterId = `cluster-${id}`;
    await env.DB.prepare(`INSERT INTO query_clusters (id, canonical_text, canonical_signature, query_count, last_seen_at, coverage_status) VALUES (?, ?, ?, 1, ?, ?) ON CONFLICT(canonical_signature) DO UPDATE SET query_count = query_count + 1, last_seen_at = excluded.last_seen_at, coverage_status = excluded.coverage_status`)
      .bind(clusterId, normalized, normalized, now, status === 'complete' ? 'covered' : status).run();
    const cluster = await env.DB.prepare(`SELECT id FROM query_clusters WHERE canonical_signature = ? LIMIT 1`).bind(normalized).all<{ id: string }>();
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
    const rows = await env.DB.prepare(`SELECT id, canonical_text AS text, query_count AS count, coverage_status AS status FROM query_clusters WHERE review_status != 'hidden' ORDER BY query_count DESC, last_seen_at DESC LIMIT 12`).all();
    return json({ status: 'ok', claims: rows.results });
  } catch {
    return json({ status: 'unavailable', claims: [] }, 503);
  }
};
