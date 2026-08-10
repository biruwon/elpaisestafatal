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
import { canonicalQuerySignature, semanticQuerySignature } from '../../src/lib/knowledge/querySignature';
import { allowRateLimitedRequest } from '../lib/rate-limit';

const json = (body: unknown, status = 200): Response => Response.json(body, {
  status,
  headers: { 'Cache-Control': 'no-store' },
});

const normalise = (value: string): string => value.toLocaleLowerCase('es').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 12000);

const neutralise = (value: string): string => normalise(String(value || '')
  .replace(/https?\S+|www\.[^\s]+/gi, ' url ')
  .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, ' contacto ')
  .replace(/\b\d[\d\s().+-]{7,}\b/g, ' telefono ')
  .replace(/\b(invasion|invadir)\b/g, 'entrada fronteriza')
  .replace(/\b(violando|violacion|violar)\b/g, 'agresion sexual')
  .replace(/\b(?:dice|afirma|acusa)\s+[a-z]+\b/gi, 'alegacion'))
  .slice(0, 600);

const digest = async (value: string): Promise<string> => {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

const inputTypes = new Set(['text', 'image', 'audio', 'url']);
const statuses = new Set(['received', 'processing', 'published', 'related', 'draft', 'uncovered', 'unavailable', 'complete', 'partial']);
const resultStates = new Set(['answered', 'provisional', 'unresolved']);
const researchOutcomes = new Set(['reviewed', 'warehouse', 'live_provisional', 'unresolved', 'unavailable']);
const sourceTierList = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const allowed = new Set(['primary', 'technical', 'corroboration', 'discovery']);
  const tiers = [...new Set(value.split(',').map((item) => item.trim()).filter((item) => allowed.has(item)))].slice(0, 4);
  return tiers.length ? tiers.join(',') : undefined;
};

export const onRequestPost = async ({ request, env }: Context): Promise<Response> => {
  if (!(await allowRateLimitedRequest(request, env, { scope: 'questions', limit: 60 }))) return json({ status: 'unavailable' }, 429);
  if (Number(request.headers.get('content-length') || 0) > 64 * 1024) return json({ status: 'invalid' }, 413);
  if (!env.DB) return json({ status: 'unavailable' }, 503);
  let body: { text?: unknown; canonical?: unknown; semanticSignature?: unknown; inputType?: unknown; status?: unknown; requestId?: unknown; resultState?: unknown; researchOutcome?: unknown; sourceTiersChecked?: unknown };
  try { body = await request.json() as typeof body; } catch { return json({ status: 'invalid' }, 400); }
  const submitted = typeof body.canonical === 'string' && body.canonical.trim() ? body.canonical : typeof body.text === 'string' ? body.text : '';
  const normalized = neutralise(submitted);
  if (!normalized) return json({ status: 'invalid' }, 400);
  const canonical = normalized;
  const signature = canonicalQuerySignature(canonical) || canonical;
  const semanticSignature = typeof body.semanticSignature === 'string' && body.semanticSignature.trim()
    ? body.semanticSignature.trim().slice(0, 600)
    : semanticQuerySignature(canonical) || signature;
  const id = typeof body.requestId === 'string' && body.requestId ? body.requestId.slice(0, 80) : (await digest(normalized)).slice(0, 32);
  const now = new Date().toISOString();
  const requestedInputType = typeof body.inputType === 'string' ? body.inputType.slice(0, 20) : 'text';
  const requestedStatus = typeof body.status === 'string' ? body.status.slice(0, 30) : 'received';
  const inputType = inputTypes.has(requestedInputType) ? requestedInputType : 'text';
  const status = statuses.has(requestedStatus) ? requestedStatus : 'received';
  const resultState = typeof body.resultState === 'string' && resultStates.has(body.resultState) ? body.resultState : undefined;
  const researchOutcome = typeof body.researchOutcome === 'string' && researchOutcomes.has(body.researchOutcome) ? body.researchOutcome : undefined;
  const sourceTiersChecked = sourceTierList(body.sourceTiersChecked);
  try {
    const inserted = await env.DB.prepare('INSERT OR IGNORE INTO resolve_requests (id, normalized_text, canonical_signature, semantic_signature, input_type, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(id, normalized, signature, semanticSignature, inputType, status, now).run();
    const isNewRequest = Number((inserted as { meta?: { changes?: number } })?.meta?.changes || 0) > 0;
    let effectiveSemanticSignature = semanticSignature;
    if (!isNewRequest) {
      // A retry may carry a rewritten canonical signature. Preserve the
      // request's existing cluster identity so it cannot orphan its member
      // row or inflate demand in a second semantic family.
      const membership = await env.DB.prepare('SELECT c.semantic_signature AS semanticSignature FROM query_cluster_members m JOIN query_clusters c ON c.id = m.cluster_id WHERE m.request_id = ? LIMIT 1').bind(id).all<{ semanticSignature?: string }>();
      effectiveSemanticSignature = membership.results[0]?.semanticSignature || semanticSignature;
    }
    const clusterId = 'cluster-' + (await digest(effectiveSemanticSignature)).slice(0, 32);
    await env.DB.prepare('UPDATE resolve_requests SET status = ?, canonical_signature = ?, semantic_signature = ?, input_type = ?, result_state = COALESCE(?, result_state), research_outcome = COALESCE(?, research_outcome) WHERE id = ?')
      .bind(status, signature, effectiveSemanticSignature, inputType, resultState, researchOutcome, id).run();
    if (isNewRequest) {
      await env.DB.prepare("INSERT INTO query_clusters (id, canonical_text, canonical_signature, semantic_signature, query_count, last_seen_at, coverage_status, result_state, research_outcome, source_tiers_checked) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?) ON CONFLICT(semantic_signature) DO UPDATE SET query_count = query_count + 1, last_seen_at = excluded.last_seen_at, coverage_status = CASE WHEN query_clusters.coverage_status = 'covered' THEN 'covered' ELSE excluded.coverage_status END, result_state = COALESCE(excluded.result_state, query_clusters.result_state), research_outcome = COALESCE(excluded.research_outcome, query_clusters.research_outcome), source_tiers_checked = COALESCE(excluded.source_tiers_checked, query_clusters.source_tiers_checked)")
        .bind(clusterId, canonical, signature, effectiveSemanticSignature, now, status === 'complete' ? 'covered' : status, resultState, researchOutcome, sourceTiersChecked).run();
    } else {
      await env.DB.prepare("INSERT INTO query_clusters (id, canonical_text, canonical_signature, semantic_signature, query_count, last_seen_at, coverage_status, result_state, research_outcome, source_tiers_checked) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?) ON CONFLICT(semantic_signature) DO UPDATE SET canonical_text = excluded.canonical_text, canonical_signature = excluded.canonical_signature, last_seen_at = excluded.last_seen_at, coverage_status = CASE WHEN query_clusters.coverage_status = 'covered' THEN 'covered' WHEN excluded.coverage_status = 'covered' THEN 'covered' ELSE query_clusters.coverage_status END, result_state = COALESCE(excluded.result_state, query_clusters.result_state), research_outcome = COALESCE(excluded.research_outcome, query_clusters.research_outcome), source_tiers_checked = COALESCE(excluded.source_tiers_checked, query_clusters.source_tiers_checked)")
        .bind(clusterId, canonical, signature, effectiveSemanticSignature, now, status === 'complete' ? 'covered' : status, resultState, researchOutcome, sourceTiersChecked).run();
    }
    const cluster = await env.DB.prepare('SELECT id FROM query_clusters WHERE semantic_signature = ? LIMIT 1').bind(effectiveSemanticSignature).all<{ id: string }>();
    const resolvedClusterId = cluster.results[0]?.id || clusterId;
    await env.DB.prepare('INSERT OR IGNORE INTO query_cluster_members (request_id, cluster_id) VALUES (?, ?)')
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
    const rows = await env.DB.prepare(`SELECT id, canonical_text AS text, query_count AS count, coverage_status AS status, linked_claim_slug AS linkedClaimSlug FROM query_clusters WHERE review_status = 'published' ORDER BY query_count DESC, last_seen_at DESC LIMIT 12`).all();
    return json({ status: 'ok', claims: rows.results });
  } catch {
    return json({ status: 'unavailable', claims: [] }, 503);
  }
};
