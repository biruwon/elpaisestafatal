import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import pg from 'pg';

const { Pool } = pg;
const connectionString = process.env.WAREHOUSE_DATABASE_URL || '';
let pool;

const getPool = () => {
  if (!connectionString) return null;
  if (!pool) pool = new Pool({ connectionString, max: Number(process.env.WAREHOUSE_DATABASE_POOL_SIZE || 4), idleTimeoutMillis: 30_000, connectionTimeoutMillis: 2_000 });
  return pool;
};

const normalise = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, ' ').trim();
const stopWords = new Set(['como', 'esta', 'este', 'para', 'pero', 'que', 'sus', 'tiene', 'una', 'uno', 'en', 'el', 'la', 'los', 'las', 'un', 'del', 'de', 'y', 'o', 'a', 'por', 'con', 'segun', 'dicen', 'grupo', 'insiste', 'hay', 'todo', 'va', 'peor', 'hace', 'ano', 'anos', 'diez', 'mas', 'menos', 'cada', 'vez', 'sube', 'baja', 'actual']);
const tokens = (value) => [...new Set(normalise(value).split(' ').filter((token) => token.length > 2 && !stopWords.has(token)))].slice(0, 24);
const json = (value, fallback = {}) => {
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
};

const migrationDirectory = new URL('../../migrations/', import.meta.url).pathname;
const migrationFiles = ['0002_evidence_warehouse.sql', '0003_warehouse_search.sql'];

export const postgresEnabled = () => Boolean(connectionString);

export const withWarehousePool = async (callback) => {
  const database = getPool();
  if (!database) return null;
  try { return await callback(database); } catch (error) {
    if (process.env.WAREHOUSE_DEBUG === '1') console.error('PostgreSQL warehouse unavailable:', error instanceof Error ? error.message : error);
    return null;
  }
};

export const migrateWarehouse = async () => withWarehousePool(async (database) => {
  for (const file of migrationFiles) await database.query(await readFile(join(migrationDirectory, file), 'utf8'));
  return true;
});

export const loadWarehouse = async () => withWarehousePool(async (database) => {
  for (const file of migrationFiles) await database.query(await readFile(join(migrationDirectory, file), 'utf8'));
  const root = new URL('../../.local/source-warehouse/', import.meta.url).pathname;
  const manifestFiles = (await readdir(join(root, 'manifests'))).filter((file) => file.endsWith('.json'));
  let sourceCount = 0;
  let observationCount = 0;
  await database.query('BEGIN');
  try {
    for (const file of manifestFiles) {
      const manifest = JSON.parse(await readFile(join(root, 'manifests', file), 'utf8'));
      if (!manifest?.id || !manifest.url) continue;
      await database.query(`
        INSERT INTO source_documents (id, publisher, title, aliases_json, url, content_type, retrieved_at, sha256, trust_tier, parser_version, object_path)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (id) DO UPDATE SET publisher=EXCLUDED.publisher, title=EXCLUDED.title, aliases_json=EXCLUDED.aliases_json, url=EXCLUDED.url, retrieved_at=EXCLUDED.retrieved_at, sha256=EXCLUDED.sha256, trust_tier=EXCLUDED.trust_tier, parser_version=EXCLUDED.parser_version, object_path=EXCLUDED.object_path
      `, [manifest.id, manifest.publisher || 'unclassified', manifest.title || '', JSON.stringify(manifest.aliases || []), manifest.url, manifest.contentType || 'application/octet-stream', manifest.retrievedAt || new Date().toISOString(), manifest.sha256 || '', manifest.trust === 'primary' || manifest.trust === 'approved-domain' ? 'primary' : 'discovery', manifest.connector || 'generic', manifest.objectPath || '']);
      sourceCount += 1;
      if (!manifest.recordPath) continue;
      const payload = JSON.parse(await readFile(manifest.recordPath, 'utf8'));
      for (const record of Array.isArray(payload.records) ? payload.records : []) {
        const datasetId = `${manifest.id}:${record.datasetId || 'observations'}`.slice(0, 240);
        const dimensions = record.dimensions || {};
        const labels = record.dimensionLabels || {};
        const searchText = normalise([manifest.publisher, manifest.title, ...(manifest.aliases || []), record.datasetId, record.metric, record.unit, record.period, record.geography, record.population, JSON.stringify(dimensions), JSON.stringify(labels), record.url].filter(Boolean).join(' '));
        await database.query(`
          INSERT INTO datasets (id, source_document_id, title, metric, unit, geography, population, period_start, period_end, definition)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8,NULL)
          ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, metric=EXCLUDED.metric, unit=EXCLUDED.unit, period_start=EXCLUDED.period_start, period_end=EXCLUDED.period_end
        `, [datasetId, manifest.id, record.datasetId || 'Observations', record.metric || null, record.unit || null, record.geography || null, record.population || null, record.period || null]);
        await database.query(`
          INSERT INTO observations (id, dataset_id, source_document_id, metric, value, unit, period, geography, population, dimensions_json, dimension_labels_json, kind, url, search_text)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
          ON CONFLICT (id) DO UPDATE SET dataset_id=EXCLUDED.dataset_id, metric=EXCLUDED.metric, value=EXCLUDED.value, unit=EXCLUDED.unit, period=EXCLUDED.period, geography=EXCLUDED.geography, population=EXCLUDED.population, dimensions_json=EXCLUDED.dimensions_json, dimension_labels_json=EXCLUDED.dimension_labels_json, kind=EXCLUDED.kind, url=EXCLUDED.url, search_text=EXCLUDED.search_text
        `, [record.id, datasetId, manifest.id, record.metric || null, typeof record.value === 'number' && Number.isFinite(record.value) ? record.value : null, record.unit || null, record.period || null, record.geography || null, record.population || null, JSON.stringify(dimensions), JSON.stringify(labels), record.kind || 'observation', record.url || null, searchText]);
        observationCount += 1;
      }
    }
    await database.query('COMMIT');
  } catch (error) {
    await database.query('ROLLBACK');
    throw error;
  }
  return { sourceCount, observationCount };
});

export const queryPostgresWarehouse = async (query, limit = 12) => {
  const wanted = tokens(query);
  if (!wanted.length) return null;
  return withWarehousePool(async (database) => {
    const clauses = wanted.map((_, index) => `o.search_text LIKE $${index + 1}`);
    const params = wanted.map((token) => `%${token}%`);
    const matchedExpression = wanted.map((_, index) => `(CASE WHEN o.search_text LIKE $${index + 1} THEN 1 ELSE 0 END)`).join(' + ');
    const result = await database.query(`
      SELECT o.id, o.kind, o.metric, o.value, o.unit, o.period, o.url,
             o.dimensions_json, o.dimension_labels_json, o.search_text,
             d.title AS dataset_id, s.id AS source_id, s.title AS source_title,
             s.publisher AS source_publisher, s.url AS source_url, s.aliases_json,
             (${matchedExpression})::float / $${wanted.length + 1}::float AS score
      FROM observations o
      JOIN datasets d ON d.id = o.dataset_id
      JOIN source_documents s ON s.id = o.source_document_id
      WHERE (${clauses.join(' OR ')})
        AND (${matchedExpression}) >= $${wanted.length + 3}::float
        AND ((o.value IS NOT NULL) OR o.kind = 'official_publication')
      ORDER BY score DESC, o.period DESC NULLS LAST
      LIMIT $${wanted.length + 2}
    `, [...params, wanted.length, Math.max(1, Math.min(100, limit)), Math.min(2, wanted.length)]);
    return result.rows.filter((row) => row.score >= (wanted.length >= 3 ? 0.34 : 0.5)).map((row) => ({
      id: row.id,
      kind: row.kind,
      datasetId: row.dataset_id,
      metric: row.metric,
      value: row.value === null ? null : Number(row.value),
      unit: row.unit,
      period: row.period,
      url: row.url,
      dimensions: json(row.dimensions_json),
      dimensionLabels: json(row.dimension_labels_json),
      source: { id: row.source_id, title: row.source_title || row.source_publisher || row.source_url, url: row.url || row.source_url, aliases: json(row.aliases_json, []) },
      score: Number(row.score),
      matchedTerms: wanted.filter((token) => row.search_text.includes(token)),
      evidenceFit: row.score >= 0.67 ? 'direct' : 'qualified',
    }));
  });
};

export const closeWarehousePool = async () => { if (pool) await pool.end(); pool = undefined; };
