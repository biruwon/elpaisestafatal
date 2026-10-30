interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
}

interface D1Database { prepare(query: string): D1Statement }

const normalize = (value: string): string => value.toLocaleLowerCase('es').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, ' ').trim();

const stopWords = new Set(['como', 'esta', 'este', 'para', 'pero', 'que', 'sus', 'tiene', 'una', 'uno', 'en', 'el', 'la', 'los', 'las', 'un', 'del', 'de', 'y', 'o', 'a', 'por', 'con', 'segun', 'dicen', 'hay', 'todo', 'hace', 'ano', 'anos', 'cada', 'vez', 'mas', 'menos', 'actual', 'actualmente', 'periodo', 'espana', 'pais']);
const tokens = (value: string): string[] => [...new Set(normalize(value).split(' ').filter((token) => token.length > 2 && !stopWords.has(token)))].slice(0, 16);
const parseJson = <T>(value: unknown, fallback: T): T => {
  if (typeof value !== 'string') return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
};

interface WarehouseRow {
  id: string;
  kind: string;
  dataset_id: string;
  metric: string | null;
  metric_id: string | null;
  value: number | null;
  unit: string | null;
  period: string | null;
  geography: string | null;
  population: string | null;
  dimensions_json: string;
  dimension_labels_json: string;
  url: string | null;
  excerpt: string | null;
  payload_json: string;
  source_id: string;
  publisher: string;
  title: string;
  source_url: string;
  published_at: string | null;
  retrieved_at: string;
  trust_tier: string;
  aliases_json: string;
  source_registry_id: string | null;
  schedule: string | null;
}

const warehouseColumns = `o.id, o.kind, o.dataset_id, o.metric, o.metric_id, o.value, o.unit,
      o.period, o.geography, o.population, o.dimensions_json,
      o.dimension_labels_json, o.url, o.excerpt, o.payload_json,
      s.id AS source_id, s.publisher, s.title, s.url AS source_url,
      s.published_at, s.retrieved_at, s.trust_tier, s.aliases_json,
      s.source_registry_id, s.schedule`;

const hydrateRows = (rows: WarehouseRow[]): Record<string, unknown>[] => rows.map((row) => {
  const payload = parseJson<Record<string, unknown>>(row.payload_json, {});
  return {
    id: row.id, kind: row.kind, datasetId: row.dataset_id, metric: row.metric, metricId: row.metric_id,
    value: row.value, unit: row.unit, period: row.period, geography: row.geography, population: row.population,
    denominator: payload.denominator, dimensions: parseJson<Record<string, unknown>>(row.dimensions_json, {}),
    dimensionLabels: parseJson<Record<string, unknown>>(row.dimension_labels_json, {}), url: row.url || row.source_url,
    excerpt: row.excerpt, finding: payload.finding, propositionId: payload.propositionId, clusterId: payload.clusterId,
    support: payload.support, status: payload.status, stage: payload.stage, dataKind: payload.dataKind,
    periodType: payload.periodType, comparison: payload.comparison, quantities: payload.quantities, limitations: payload.limitations,
    source: {
      id: row.source_id, publisher: row.publisher, title: row.title || row.publisher, url: row.source_url,
      publishedAt: row.published_at, retrievedAt: row.retrieved_at, trust: row.trust_tier,
      aliases: Array.isArray(parseJson<unknown>(row.aliases_json, [])) ? parseJson<string[]>(row.aliases_json, []) : [],
      sourceRegistryId: row.source_registry_id, schedule: row.schedule, domain: payload.sourceDomain,
    },
  };
});

// A direct metric contract must not depend on its words winning a broad FTS
// ranking. Retain a bounded, recent source revision for each requested annual
// series so a comparison sees both series and their full interval.
export const searchD1WarehouseByMetricIds = async (database: D1Database, metricIds: string[]): Promise<Record<string, unknown>[]> => {
  const ids = [...new Set(metricIds)].slice(0, 4);
  const results = await Promise.all(ids.map((id) => database.prepare(`
    SELECT ${warehouseColumns}
    FROM observations o JOIN source_documents s ON s.id = o.source_document_id
    WHERE o.metric_id = ?
    ORDER BY s.retrieved_at DESC, o.period DESC
    LIMIT 40
  `).bind(id).all<WarehouseRow>()));
  return hydrateRows(results.flatMap((result) => result.results));
};

export const searchD1Warehouse = async (database: D1Database, query: string): Promise<Record<string, unknown>[]> => {
  const terms = tokens(query);
  if (terms.length < 2) return [];
  const match = terms.map((term) => `${term}*`).join(' OR ');
  const rows = await database.prepare(`
    SELECT ${warehouseColumns}
    FROM observations_fts
    JOIN observations o ON o.rowid = observations_fts.rowid
    JOIN source_documents s ON s.id = o.source_document_id
    WHERE observations_fts MATCH ?
    ORDER BY bm25(observations_fts), o.period DESC
    LIMIT 500
  `).bind(match).all<WarehouseRow>();

  return hydrateRows(rows.results);
};
