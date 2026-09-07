import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { discoverOfficialDocuments } from './official-discovery.mjs';
import { searchTrustedWeb, enrichTrustedWebResults } from './trusted-web-discovery.mjs';

const directory = new URL('../../.local/family-research/', import.meta.url).pathname;
const inFlight = new Map();
const ttl = 24 * 60 * 60_000;

export const familyResearchRequests = (plan) => {
  const groups = new Map();
  for (const family of plan?.evidenceSummary?.families || []) {
    const criteria = family.criteria?.length ? family.criteria : [family];
    const missing = [...new Set(criteria.flatMap((criterion) => criterion.missingDimensions?.length ? criterion.missingDimensions : !criterion.data?.length ? [criterion.label] : []))];
    if (!missing.length) continue;
    const id = family.familyId || family.label;
    const current = groups.get(id) || { familyId: id, label: family.familyLabel || family.label, missing: [], metricIds: [], sources: [] };
    current.missing = [...new Set([...current.missing, ...missing])];
    current.sources = [...new Set([...current.sources, ...(family.sourceIds || [])])];
    groups.set(id, current);
  }
  return [...groups.values()].map((group) => ({ ...group, query: `España ${group.label} ${group.missing.slice(0, 3).join(' ')} fuentes datos metodología`.slice(0, 360) }));
};

// Search results are research leads, never numbers or established findings.
// Keeping receipts separate lets subsequent assessment/materialization audit
// them without silently promoting topical search hits to claim evidence.
export const researchFamilyGaps = async (plan, {
  discover = discoverOfficialDocuments,
  search = searchTrustedWeb,
  enrich = enrichTrustedWebResults,
  token = process.env.BRAVE_SEARCH_TOKEN || process.env.CURRENT_SEARCH_TOKEN,
  cacheDirectory = directory,
  now = Date.now(),
} = {}) => {
  const requests = familyResearchRequests(plan);
  const receipts = [];
  await mkdir(cacheDirectory, { recursive: true });
  const investigate = async (request) => {
    const key = createHash('sha256').update(JSON.stringify(request)).digest('hex').slice(0, 24);
    const path = join(cacheDirectory, `${key}.json`);
    try {
      const cached = JSON.parse(await readFile(path, 'utf8'));
      if (cached.completedAt && now - Date.parse(cached.completedAt) < ttl) return cached;
    } catch { /* Missing cache is expected on the first research pass. */ }
    if (inFlight.has(key)) return inFlight.get(key);
    const work = (async () => {
      const outcomes = await Promise.allSettled([
        discover(request.query, 3),
        search({ queries: [request.query], token, limit: 3 }),
      ]);
      const leads = [...new Map(outcomes.filter((item) => item.status === 'fulfilled').flatMap((item) => item.value).filter((item) => item?.url).map((item) => [item.url, item])).values()];
      const documents = leads.length ? await enrich(leads, { query: request.query, max: 3 }) : [];
      const receipt = { ...request, status: documents.length ? 'leads_found' : 'no_compatible_measurement', completedAt: new Date(now).toISOString(), documents, remainingMeasurements: request.missing };
      await writeFile(path, JSON.stringify(receipt, null, 2));
      return receipt;
    })();
    inFlight.set(key, work);
    try { return await work; } finally { inFlight.delete(key); }
  };
  // Bound network and document work, while covering every unresolved family.
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(3, requests.length) }, async () => {
    while (next < requests.length) {
      const index = next++;
      try { receipts[index] = await investigate(requests[index]); }
      catch { receipts[index] = { ...requests[index], status: 'unavailable', remainingMeasurements: requests[index].missing }; }
    }
  }));
  for (const family of plan?.evidenceSummary?.families || []) {
    const receipt = receipts.find((item) => item.familyId === (family.familyId || family.label));
    if (!receipt) continue;
    family.researchNote = receipt.status === 'leads_found'
      ? 'Se han buscado fuentes específicas y localizado documentos para revisar. Los documentos nuevos no se cuentan como mediciones validadas; los puntos pendientes siguen abiertos.'
      : receipt.status === 'unavailable'
        ? 'La búsqueda de fuentes para esta familia no pudo completarse. Las mediciones pendientes siguen abiertas.'
        : 'Se ha realizado una búsqueda específica para esta familia sin localizar una medición que cierre los puntos pendientes.';
  }
  return receipts;
};
