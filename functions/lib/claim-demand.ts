import { canonicalQuerySignature, semanticQuerySignature } from '../../src/lib/knowledge/querySignature';

export interface ClaimDemandStatement {
  bind(...values: unknown[]): ClaimDemandStatement;
  run(): Promise<unknown>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
}

export interface ClaimDemandDatabase {
  prepare(query: string): ClaimDemandStatement;
}

const normalize = (value: string): string => value.toLocaleLowerCase('es').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, ' ').trim();

const normalizedClaim = (value: string): string => normalize(String(value || '').slice(0, 12_000)).slice(0, 600);

const digest = async (value: string): Promise<string> => {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Save a normalized claim submission for internal demand clustering.
 * Each invocation gets a fresh ID, so repeated submissions count separately.
 * Caller-supplied IDs/signatures are ignored. Normalization lowercases text,
 * removes punctuation, and truncates it; it does not remove personal details.
 */
export const captureClaimDemand = async (
  database: ClaimDemandDatabase | undefined,
  submittedText: string,
  requestedInputType: string,
): Promise<void> => {
  if (!database) return;
  try {
    const inputType = ['text', 'image', 'audio', 'url'].includes(requestedInputType) ? requestedInputType : 'text';
    if (inputType === 'url' && /^https?:\/\//i.test(submittedText.trim())) return;
    const normalized = normalizedClaim(submittedText);
    // A URL-only or upload-only request contains no claim text to cluster.
    if (!normalized) return;

    const canonical = normalized;
    const signature = canonicalQuerySignature(canonical) || canonical;
    const semanticSignature = semanticQuerySignature(canonical) || signature;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const clusterId = 'cluster-' + (await digest(semanticSignature)).slice(0, 32);

    await database.prepare('INSERT INTO resolve_requests (id, normalized_text, input_type, created_at) VALUES (?, ?, ?, ?)')
      .bind(id, normalized, inputType, now).run();
    await database.prepare("INSERT INTO query_clusters (id, canonical_text, canonical_signature, semantic_signature, query_count, last_seen_at, coverage_status) VALUES (?, ?, ?, ?, 1, ?, 'received') ON CONFLICT(semantic_signature) DO UPDATE SET query_count = query_count + 1, last_seen_at = excluded.last_seen_at")
      .bind(clusterId, canonical, signature, semanticSignature, now).run();
    const cluster = await database.prepare('SELECT id FROM query_clusters WHERE semantic_signature = ? LIMIT 1')
      .bind(semanticSignature).all<{ id: string }>();
    const resolvedClusterId = cluster.results[0]?.id || clusterId;
    await database.prepare('INSERT OR IGNORE INTO query_cluster_members (request_id, cluster_id) VALUES (?, ?)')
      .bind(id, resolvedClusterId).run();
  } catch {
    // Demand capture is best-effort; a D1 issue must not delay or fail a check.
  }
};
