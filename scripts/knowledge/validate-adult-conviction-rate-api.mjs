import assert from 'node:assert/strict';
import { build } from 'esbuild';

const compiled = await build({ entryPoints: ['functions/api/check.ts'], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const api = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].contents).toString('base64')}`);
const source = {
  id: 'ine-adult-convictions-2025',
  publisher: 'Instituto Nacional de Estadística',
  title: 'INE adult convicted population rates by nationality, 2025',
  source_url: 'https://www.ine.es/dyngs/Prensa/EPCAEPCM2025.pdf',
  retrieved_at: '2026-11-16T17:47:00.000Z',
};
const observations = [
  { id: 'convicted-foreign-2025', group: 'Extranjera', value: 15.3 },
  { id: 'convicted-spanish-2025', group: 'Española', value: 6.1 },
].map(({ id, group, value }) => ({
  id,
  kind: 'observation',
  dataset_id: source.title,
  metric: 'Tasa de personas adultas condenadas por nacionalidad',
  metric_id: 'crime_conviction_rate_by_nationality',
  value,
  unit: 'personas condenadas por 1.000 habitantes de 18 y más años',
  period: '2025',
  geography: 'España',
  population: 'personas adultas de 18 y más años',
  dimensions_json: JSON.stringify({ geo: 'ES', group, measure: 'conviction rate', legalStage: 'conviction', category: 'all offences', denominator: 'residents aged 18 and over' }),
  dimension_labels_json: JSON.stringify({ geo: 'Spain' }),
  url: source.source_url,
  excerpt: null,
  payload_json: JSON.stringify({ denominator: 'residents aged 18 and over' }),
  source_id: source.id,
  publisher: source.publisher,
  title: source.title,
  source_url: source.source_url,
  published_at: null,
  retrieved_at: source.retrieved_at,
  trust_tier: 'primary',
  aliases_json: '[]',
  source_registry_id: 'ine',
  schedule: 'yearly',
}));

const database = {
  prepare(sql) {
    let bindings = [];
    return {
      bind(...values) { bindings = values; return this; },
      async all() {
        return { results: sql.includes('o.metric_id = ?') ? observations.filter((row) => bindings.includes(row.metric_id)) : [] };
      },
      async run() { return { success: true }; },
    };
  },
};

const request = new Request('https://site.test/api/check?fresh=1', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'cf-connecting-ip': '192.0.2.241' },
  body: JSON.stringify({ text: '¿Cuál es la tasa de personas adultas condenadas por cada 1.000 residentes según nacionalidad?', inputType: 'text' }),
});
const response = await api.onRequestPost({ request, env: { DB: database }, waitUntil: () => {} });
const result = await response.json();

assert.equal(response.status, 200);
assert.equal(result.state, 'limited');
assert.equal(result.result.answerScope.family, 'adult-conviction-rate-by-nationality');
assert.deepEqual(result.result.answerScope.directMetrics, ['crime_conviction_rate_by_nationality']);
assert.match(result.result.reply, /2025.*15,3 personas adultas con nacionalidad extranjera condenadas por cada 1\.000 residentes de 18 años o más de nacionalidad extranjera.*6,1 personas adultas con nacionalidad española condenadas por cada 1\.000 residentes adultos de nacionalidad española/s);
assert.match(result.result.reply, /no todos los delitos registrados.*no por país de nacimiento o situación administrativa.*no demuestra que la inmigración cause delincuencia/s);
assert.deepEqual(result.result.sources.map(({ id }) => id), [source.id]);
assert.deepEqual(result.result.sources.map(({ url }) => url), [source.source_url]);

console.log('Adult conviction rate API validation passed: D1 lookup, source attribution, paired denominators, and limited public response.');
