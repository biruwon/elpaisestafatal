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

const stripSensitiveDetails = (value: string): string => value
  .replace(/https?:\/\/\S+|www\.[^\s]+/giu, ' ')
  .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/giu, ' ')
  .replace(/\b(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?/giu, ' ')
  .replace(/@[a-z0-9_]{2,}/giu, ' ')
  .replace(/\b[A-Z]{2}\d{2}(?:[\s-]?[A-Z0-9]){11,30}\b/giu, ' ')
  .replace(/\b[XYZ]\s?\d{7}\s?[A-Z]\b/giu, ' ')
  .replace(/\b\d{8}[\s-]?[A-Z]\b/giu, ' ')
  .replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b/gu, ' ')
  .replace(/\b(?:\+?\d{1,3}[\s.-]?)?(?:\d[\s().-]?){9,12}\b/gu, ' ')
  .replace(/\b(?:calle|c\/|avenida|avda?\.?|paseo|plaza|camino|carretera|ronda|traves[ií]a)\s+[^,;\n]{1,80}?\s+(?:n(?:[uú]mero|[º°o.]?)\s*)?\d+[a-z]?\b/giu, ' ')
  .replace(/\b(?:me llamo|mi nombre es|mi contacto es|contacta con|habla con|señor|señora|sr\.?|sra\.?|don|doña)\s+[a-záéíóúüñ]+(?:\s+[a-záéíóúüñ]+){0,2}\b/giu, ' ')
  // Catch common full-name forms while keeping place names and ordinary
  // sentence-initial capitalization. This is a heuristic, not full PII detection.
  .replace(/(^|[^\p{L}\p{N}_])[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+(?:\s+(?:de|del|la|las|los|y)\s+)?[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+(?=$|[^\p{L}\p{N}_])/gu, '$1 ');

const normalizedClaim = (value: string): string => normalize(stripSensitiveDetails(String(value || '').slice(0, 12_000))).slice(0, 600);

const digest = async (value: string): Promise<string> => {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Save a privacy-filtered claim submission for internal demand clustering.
 * Each invocation gets a fresh ID, so repeated submissions count separately.
 * The raw text is never passed to D1, and callers must not supply IDs/signatures.
 */
export const captureClaimDemand = async (
  database: ClaimDemandDatabase | undefined,
  submittedText: string,
  requestedInputType: string,
): Promise<void> => {
  if (!database) return;
  try {
    const normalized = normalizedClaim(submittedText);
    // A URL-only or upload-only request contains no claim text to cluster.
    if (!normalized) return;

    const canonical = normalized;
    const signature = canonicalQuerySignature(canonical) || canonical;
    const semanticSignature = semanticQuerySignature(canonical) || signature;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const inputType = ['text', 'image', 'audio', 'url'].includes(requestedInputType) ? requestedInputType : 'text';
    const clusterId = 'cluster-' + (await digest(semanticSignature)).slice(0, 32);

    await database.prepare('INSERT INTO resolve_requests (id, normalized_text, canonical_signature, semantic_signature, input_type, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(id, normalized, signature, semanticSignature, inputType, 'received', now).run();
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
