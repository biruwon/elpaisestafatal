import { allowRateLimitedRequest } from '../lib/rate-limit';

interface DatabaseStatement {
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

export const onRequestGet = async ({ request, env }: Context): Promise<Response> => {
  if (!(await allowRateLimitedRequest(request, env, { scope: 'questions', limit: 60 }))) return json({ status: 'unavailable', claims: [] }, 429);
  if (!env.DB) return json({ status: 'unavailable', claims: [] }, 503);
  try {
    // Raw submissions may contain personal details or unreviewed allegations.
    // Only explicitly approved canonical questions belong in the public feed.
    const rows = await env.DB.prepare(`SELECT id, canonical_text AS text, query_count AS count, coverage_status AS status, linked_claim_slug AS linkedClaimSlug FROM query_clusters WHERE review_status = 'published' ORDER BY query_count DESC, last_seen_at DESC LIMIT 12`).all();
    return json({ status: 'ok', claims: rows.results });
  } catch {
    return json({ status: 'unavailable', claims: [] }, 503);
  }
};
