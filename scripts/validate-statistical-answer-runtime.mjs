import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { build } from 'esbuild';
import { normalizeJsonPayload } from './knowledge/normalize-json.mjs';
import { TOURISM_EMPLOYMENT_SNAPSHOT } from '../src/lib/knowledge/tourism-employment-snapshot.mjs';
import { EDUCATION_EMPLOYMENT_SNAPSHOT } from '../src/lib/knowledge/education-employment-snapshot.mjs';

// Exercise the real Pages handler, D1 hydration, local resolver and public
// response together; nullable dates and source flags cross all four boundaries.
const compiled = await build({ entryPoints: ['functions/api/check.ts'], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const api = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].contents).toString('base64')}`);
const d1Compiled = await build({ entryPoints: ['functions/lib/d1-warehouse.ts'], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const { searchD1Warehouse } = await import(`data:text/javascript;base64,${Buffer.from(d1Compiled.outputFiles[0].contents).toString('base64')}`);
const warehouseRoot = await mkdtemp(join(tmpdir(), 'statistical-break-fixture-'));
try {
  await mkdir(join(warehouseRoot, 'manifests'));
  const fixtureSource = { id: 'break-source', title: 'Statistical series', publisher: 'Eurostat', url: 'https://ec.europa.eu/eurostat/fixture', metricId: 'rental_price_index', retrievedAt: new Date().toISOString() };
  const records = normalizeJsonPayload({ id: ['time'], size: [3], dimension: { time: { category: { index: { '2015': 0, '2020': 1, '2025': 2 } } } }, value: { 0: 100, 2: 120 }, status: { 1: 'b' } }, fixtureSource);
  const recordPath = join(warehouseRoot, 'records.json');
  await writeFile(recordPath, JSON.stringify({ source: fixtureSource, records }));
  await writeFile(join(warehouseRoot, 'manifests', 'fixture.json'), JSON.stringify({ ...fixtureSource, recordPath }));
  execFileSync(process.execPath, ['scripts/knowledge/export-warehouse-sql.mjs'], { env: { ...process.env, SOURCE_WAREHOUSE_ROOT: warehouseRoot }, stdio: 'pipe' });
  const sql = await readFile(join(warehouseRoot, 'warehouse-load.sql'), 'utf8');
  const marker = sql.split('\n').find((line) => line.startsWith('INSERT INTO observations') && line.includes('break-source-observation-1'));
  assert.ok(marker && marker.includes("'rental_price_index', NULL") && marker.includes('"status":"b"'), 'A missing cell carrying a break must survive normalization and SQL export');
} finally { await rm(warehouseRoot, { recursive: true, force: true }); }
const db = new DatabaseSync(':memory:');
db.exec(`
  CREATE TABLE source_documents (id TEXT PRIMARY KEY, publisher TEXT, title TEXT, url TEXT, published_at TEXT, retrieved_at TEXT, trust_tier TEXT, aliases_json TEXT, source_registry_id TEXT, schedule TEXT);
  CREATE TABLE observations (id TEXT PRIMARY KEY, kind TEXT, dataset_id TEXT, metric TEXT, metric_id TEXT, value REAL, unit TEXT, period TEXT, geography TEXT, population TEXT, dimensions_json TEXT, dimension_labels_json TEXT, url TEXT, excerpt TEXT, payload_json TEXT, source_document_id TEXT, search_text TEXT);
  CREATE VIRTUAL TABLE observations_fts USING fts5(search_text, content='observations', content_rowid='rowid');
  CREATE TRIGGER observations_fts_insert AFTER INSERT ON observations BEGIN INSERT INTO observations_fts(rowid, search_text) VALUES (new.rowid, new.search_text); END;
  CREATE TRIGGER observations_fts_update AFTER UPDATE ON observations BEGIN INSERT INTO observations_fts(observations_fts, rowid, search_text) VALUES ('delete', old.rowid, old.search_text); INSERT INTO observations_fts(rowid, search_text) VALUES (new.rowid, new.search_text); END;
`);
const retrieved = new Date().toISOString();
const url = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_minr?geo=ES&coicop18=CP041&unit=I15&unit=RCH_A';
db.prepare('INSERT INTO source_documents VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)').run('rent-source', 'Eurostat', 'Índice de rentas de alquiler efectivamente pagadas en España', url, retrieved, 'primary', '[]', 'eurostat', 'daily');
const rentArchiveUrl = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_midx?geo=ES&coicop=CP041';
db.prepare('INSERT INTO source_documents VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)').run('rent-archive-source', 'Eurostat', 'Índice histórico de precios del alquiler', rentArchiveUrl, '2025-10-01T00:00:00Z', 'primary', '[]', 'eurostat', 'daily');
const inflationUrl = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_minr?geo=ES&coicop18=TOTAL&unit=RCH_A';
db.prepare('INSERT INTO source_documents VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)').run('inflation-source', 'Eurostat', 'Inflación armonizada anual de España', inflationUrl, retrieved, 'primary', '[]', 'eurostat', 'daily');
const inflationEuropeUrl = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_minr?geo=ES&geo=EU27_2020&coicop18=TOTAL&unit=RCH_A';
db.prepare('INSERT INTO source_documents VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)').run('inflation-europe-source', 'Eurostat', 'Inflación armonizada: España y Unión Europea', inflationEuropeUrl, retrieved, 'primary', '[]', 'eurostat', 'daily');
const touristCountUrl = 'https://www.ine.es/jaxiT3/Tabla.htm?t=39364';
const touristShareUrl = 'https://www.ine.es/jaxiT3/Tabla.htm?t=39365';
db.prepare('INSERT INTO source_documents VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)').run('tourist-count-source', 'INE', 'Viviendas turísticas estimadas', touristCountUrl, retrieved, 'primary', '[]', 'ine', 'monthly');
db.prepare('INSERT INTO source_documents VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)').run('tourist-share-source', 'INE', 'Porcentaje de viviendas turísticas sobre el parque', touristShareUrl, retrieved, 'primary', '[]', 'ine', 'monthly');
const educationPayUrl = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/earn_ses22_16?freq=A&sex=T&indic_se=ERN&isced11=ED0-2&isced11=ED3_4&isced11=ED5-8&sizeclas=GE10&nace_r2=B-S_X_O&unit=EUR&geo=ES&time=2022&lang=EN';
db.prepare('INSERT INTO source_documents VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)').run('education-pay-source', 'Eurostat', 'Salario bruto medio por hora según estudios alcanzados, 2022', educationPayUrl, retrieved, 'primary', '[]', 'eurostat', 'daily');
const vacancyUrl = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/jvs_q_r21?geo=ES&sinceTimePeriod=2015&nace_r2_1=B-T&sizeclas=TOTAL&s_adj=NSA';
db.prepare('INSERT INTO source_documents VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)').run('vacancy-source', 'Eurostat', 'Vacantes, puestos ocupados y tasa de vacantes en España', vacancyUrl, retrieved, 'primary', '[]', 'eurostat', 'daily');
const vacancyLegacyUrl = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/jvs_q_nace2?geo=ES&sinceTimePeriod=2015';
db.prepare('INSERT INTO source_documents VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)').run('vacancy-legacy-source', 'Eurostat', 'Serie histórica NACE Rev. 2 de vacantes', vacancyLegacyUrl, retrieved, 'primary', '[]', 'eurostat', 'daily');
for (const source of new Map(TOURISM_EMPLOYMENT_SNAPSHOT.observations.map((item) => [item.source.id, item.source])).values()) {
  db.prepare('INSERT INTO source_documents VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    source.id, source.publisher, source.title, source.url, source.publishedAt || null, source.retrievedAt,
    'primary', '[]', 'ine', 'daily',
  );
}
const insert = db.prepare('INSERT INTO observations VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
for (const [year, value] of [[2015, 100], [2020, 110], [2025, 120]]) {
  for (const [code, unit, measured] of [['I15', 'Index, 2015=100', value], ['RCH_A', 'Annual rate of change', 5]]) {
    insert.run(`${code}-${year}`, 'observation', 'rent-data', 'Índice de precios del alquiler', 'rental_price_index', measured, unit, String(year), 'España', null,
      JSON.stringify({ geo: 'ES', unit: code, time: String(year) }), JSON.stringify({ geo: 'Spain', unit }), null, null, '{}', 'rent-source', 'índice precios alquiler España evolución subida tasa interanual');
  }
}
insert.run('I15-2026-09', 'observation', 'rent-data', 'Índice de precios del alquiler', 'rental_price_index', 117.05, 'Index, 2015=100', '2026-09', 'España', null,
  JSON.stringify({ geo: 'ES', unit: 'I15', time: '2026-09' }), JSON.stringify({ geo: 'Spain', unit: 'Index, 2015=100' }), null, null, '{}', 'rent-source', 'índice precios alquiler España evolución');
insert.run('I15-2010-01', 'observation', 'rent-data', 'Índice de rentas de alquiler efectivamente pagadas', 'rental_price_index', 98.6, 'Index, 2015=100', '2010-01', 'España', null,
  JSON.stringify({ geo: 'ES', unit: 'I15', time: '2010-01' }), JSON.stringify({ geo: 'Spain', unit: 'Index, 2015=100' }), null, null, '{}', 'rent-source', 'índice rentas alquiler efectivamente pagadas España evolución');
for (const [year, value] of [['2026-08', 3.1], ['2026-10', 3.4]]) {
  insert.run(`inflation-${year}`, 'observation', 'prc_hicp_minr', 'Inflación armonizada anual de España', 'inflation_rate', value, 'Annual rate of change', year, 'España', null,
    JSON.stringify({ geo: 'ES', coicop18: 'TOTAL', unit: 'RCH_A', time: year }), JSON.stringify({ geo: 'Spain', unit: 'Annual rate of change', coicop18: 'All-items HICP' }), null, null, year === '2026-10' ? '{"status":"e"}' : '{}', 'inflation-source', 'inflación armonizada anual España tasa interanual precios Eurostat');
}
for (const [geo, value] of [['ES', 3.4], ['EU27_2020', 2.8]]) {
  insert.run(`inflation-europe-${geo}`, 'observation', 'prc_hicp_minr', 'Inflación armonizada: España y Unión Europea', 'inflation_rate_europe', value, 'Annual rate of change', '2026-10', geo === 'ES' ? 'España' : 'Unión Europea', null,
    JSON.stringify({ geo, coicop18: 'TOTAL', unit: 'RCH_A', time: '2026-10' }), JSON.stringify({ geo: geo === 'ES' ? 'Spain' : 'European Union', unit: 'Annual rate of change', coicop18: 'All-items HICP' }), null, null, '{}', 'inflation-europe-source', 'inflación armonizada anual España unión europea tasa interanual precios Eurostat');
}
insert.run('tourist-housing-count-2026M05', 'observation', 'ine-tourist-housing', 'Viviendas turísticas estimadas', 'tourist_housing_count', 341001, 'viviendas', '2026M05', 'España', 'viviendas turísticas estimadas',
  JSON.stringify({ geo: 'ES', time: '2026M05', geographyLevel: 'country' }), JSON.stringify({ geo: 'Spain', geographyLevel: 'Country' }), null, null, '{}', 'tourist-count-source', 'viviendas turísticas estimadas España anuncios plataformas mayo 2026');
insert.run('tourist-housing-share-2026M05', 'observation', 'ine-tourist-housing', 'Porcentaje de viviendas turísticas sobre el parque', 'tourist_housing_share', 1.28, '%', '2026M05', 'España', 'viviendas turísticas como proporción del parque total de viviendas',
  JSON.stringify({ geo: 'ES', time: '2026M05', geographyLevel: 'country', denominator: 'total housing stock in the 2021 Population and Housing Census' }), JSON.stringify({ geo: 'Spain', geographyLevel: 'Country', denominator: 'total housing stock in the 2021 Population and Housing Census' }), null, null, '{}', 'tourist-share-source', 'porcentaje viviendas turísticas sobre parque total España Censo 2021 mayo 2026');
for (const item of TOURISM_EMPLOYMENT_SNAPSHOT.observations) {
  insert.run(
    item.id, 'observation', 'ine-tourism-employment', item.metric, item.metricId, item.value, item.unit, item.period,
    item.geography, item.population, JSON.stringify(item.dimensions), '{}', null, null,
    JSON.stringify({ denominator: item.denominator, dataKind: 'observed', ...(item.status ? { status: item.status } : {}) }),
    item.source.id, `empleo turístico ramas características turismo total empleo España ${item.period} INE ${item.metricId}`,
  );
}
for (const [education, value, educationLabel] of [
  ['ED0-2', 10.04, 'Less than primary, primary and lower secondary education (levels 0-2)'],
  ['ED3_4', 11.48, 'Upper secondary and post-secondary non-tertiary education (levels 3 and 4)'],
  ['ED5-8', 17.71, 'Tertiary education (levels 5-8)'],
]) insert.run(`education-earnings-${education}`, 'observation', 'earn_ses22_16', 'Salario bruto medio por hora según estudios alcanzados', 'mean_hourly_earnings_by_education', value, 'Euro', '2022', 'España', 'employees of all sexes in Spanish enterprises with 10 or more employees, in industry, construction and services except public administration, defense and compulsory social security',
  JSON.stringify({ freq: 'A', sex: 'T', indic_se: 'ERN', isced11: education, sizeclas: 'GE10', nace_r2: 'B-S_X_O', unit: 'EUR', geo: 'ES', time: '2022' }), JSON.stringify({ freq: 'Annual', sex: 'Total', indic_se: 'Gross earnings', isced11: educationLabel, sizeclas: '10 employees or more', nace_r2: 'Industry, construction and services (except public administration, defense, compulsory social security)', unit: 'Euro', geo: 'Spain', time: '2022' }), null, null, '{}', 'education-pay-source', `salario bruto medio por hora estudios alcanzados ${education} España 2022 Eurostat`);
const vacancyMetricMap = { indic_em: {
  JOBVAC: 'job_vacancy_count', JOBOCC: 'occupied_job_post_count',
  JVR: 'job_vacancy_rate', JVRCH_Q: 'job_vacancy_rate_quarterly_change',
} };
const vacancyRecords = normalizeJsonPayload({
  id: ['geo', 'nace_r2_1', 'sizeclas', 's_adj', 'indic_em', 'time'], size: [1, 1, 1, 1, 4, 1],
  dimension: {
    geo: { category: { index: { ES: 0 }, label: { ES: 'Spain' } } },
    nace_r2_1: { category: { index: { 'B-T': 0 }, label: { 'B-T': 'Industry, construction and services, NACE Rev. 2.1' } } },
    sizeclas: { category: { index: { TOTAL: 0 }, label: { TOTAL: 'Total' } } },
    s_adj: { category: { index: { NSA: 0 }, label: { NSA: 'Unadjusted data' } } },
    indic_em: { category: { index: { JOBVAC: 0, JOBOCC: 1, JVR: 2, JVRCH_Q: 3 }, label: { JOBVAC: 'Number of job vacancies', JOBOCC: 'Number of occupied posts', JVR: 'Job vacancy rate', JVRCH_Q: 'Quarterly change in job vacancy rate' } } },
    time: { category: { index: { '2026-Q3': 0 }, label: { '2026-Q3': '2026-Q3' } } },
  },
  value: { 0: 148944, 1: 17598304, 2: 0.8, 3: 0 },
  status: { 0: 'p', 1: 'p', 2: 'p', 3: 'p' },
}, { id: 'vacancy-source', title: 'Vacantes, puestos ocupados y tasa de vacantes en España · NACE Rev. 2.1', metricId: 'job_vacancy_rate', metricIdByDimension: vacancyMetricMap });
const vacancyUnits = {
  job_vacancy_count: 'posts', occupied_job_post_count: 'posts',
  job_vacancy_rate: 'percent of jobs', job_vacancy_rate_quarterly_change: 'percentage points quarter-on-quarter',
};
for (const record of vacancyRecords) {
  const label = record.dimensionLabels.indic_em;
  insert.run(record.id, 'observation', 'jvs_q_r21', label, record.metricId, record.value, vacancyUnits[record.metricId], record.period, 'España', record.metricId === 'occupied_job_post_count' ? 'paid occupied posts in NACE Rev. 2.1 B-T' : 'vacant and occupied paid posts in NACE Rev. 2.1 B-T',
    JSON.stringify(record.dimensions), JSON.stringify(record.dimensionLabels), vacancyUrl, null, JSON.stringify(record.status ? { status: record.status } : {}), 'vacancy-source', `vacantes puestos ocupados tasa de vacantes empleo España ${label} ${record.period} Eurostat NACE Rev. 2.1`);
}
insert.run('vacancy-rate-legacy-2025-Q4', 'observation', 'jvs_q_nace2', 'Job vacancy rate', 'job_vacancy_rate', 0.9, 'percent of jobs', '2025-Q4', 'España', 'vacant and occupied paid posts in NACE Rev. 2 B-S',
  JSON.stringify({ geo: 'ES', nace_r2: 'B-S', sizeclas: 'TOTAL', s_adj: 'NSA', indic_em: 'JVR', time: '2025-Q4' }), JSON.stringify({ geo: 'Spain', nace_r2: 'Industry, construction and services', sizeclas: 'Total', s_adj: 'Unadjusted', indic_em: 'Job vacancy rate', time: '2025-Q4' }), vacancyLegacyUrl, null, '{}', 'vacancy-legacy-source', 'tasa de vacantes empleo España 0,9 2025-Q4 Eurostat NACE Rev. 2');
for (const [year, value] of [['2015', 100], ['2020', 110], ['2025', 120]]) {
    insert.run(`rent-archive-${year}`, 'observation', 'prc_hicp_midx', 'Índice histórico de precios del alquiler', 'rental_price_index', value, 'Index, 1996=100', year, 'España', null,
    JSON.stringify({ geo: 'ES', unit: 'I96', time: year }), JSON.stringify({ geo: 'Spain', unit: 'Index, 1996=100' }), null, null, '{}', 'rent-archive-source', 'índice histórico precios alquiler España evolución subida Eurostat');
}
const d1 = { prepare(sql) { let values = []; return { bind(...args) { values = args; return this; }, async all() { return { results: db.prepare(sql).all(...values) }; }, async run() { return {}; } }; } };
const reservation = createServer();
reservation.listen(0, '127.0.0.1');
await once(reservation, 'listening');
const port = reservation.address().port;
await new Promise((resolve) => reservation.close(resolve));
const child = spawn(process.execPath, ['scripts/local-claim-service.mjs'], {
  env: { ...process.env, LOCAL_CLASSIFIER_BIND_HOST: '127.0.0.1', LOCAL_CLASSIFIER_PORT: String(port), LOCAL_CLASSIFIER_TOKEN: '',
    LOCAL_CLAIM_COMPILER: '0', LOCAL_ANSWER_PLANNER: '0', CURRENT_EVENT_RESEARCH: '0', GENERAL_WEB_RESEARCH: '0' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
child.stderr.on('data', (chunk) => { logs += chunk.toString(); });
const pending = [];
const env = { DB: d1, LOCAL_CLASSIFIER_ENDPOINT: `http://127.0.0.1:${port}`, LOCAL_CLASSIFIER_TOKEN: 'fixture' };
const context = (request, overrides = {}) => ({ request, env: { ...env, ...overrides }, waitUntil: (promise) => pending.push(promise) });
const emptyD1 = { prepare() { return { bind() { return this; }, async all() { return { results: [] }; }, async run() { return {}; } }; } };
  let checkRequestNumber = 0;
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Resolver did not start: ${logs.slice(-1000)}`)), 20000);
    child.once('error', reject);
    child.once('exit', (code) => reject(new Error(`Resolver exited ${code}: ${logs.slice(-1000)}`)));
    child.stdout.on('data', (chunk) => { if (chunk.toString().includes('Local claim service listening')) { clearTimeout(timer); resolve(); } });
  });
  const check = async (text, clarification, overrides = {}) => {
    checkRequestNumber += 1;
    const request = new Request('https://site.test/api/check?fresh=1', { method: 'POST', headers: { 'content-type': 'application/json', 'x-development-no-cache': '1', 'cf-connecting-ip': `192.0.2.${checkRequestNumber}` }, body: JSON.stringify({ text, inputType: 'text', ...(clarification ? { clarification } : {}) }) });
    let response = await api.onRequestPost(context(request, overrides));
    let result = await response.json();
    let pollCount = 0;
    let lastPollMs = 0;
    const deadline = Date.now() + Number(process.env.STATISTICAL_RUNTIME_DEADLINE_MS || 45000);
    while (result.state === 'processing' && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      const pollStarted = Date.now();
      response = await api.onRequestGet(context(new Request(`https://site.test/api/check/${result.id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ claim: text }) }), overrides));
      lastPollMs = Date.now() - pollStarted;
      pollCount += 1;
      result = await response.json();
    }
    const serviceHealth = result.state === 'processing' ? await fetch(`http://127.0.0.1:${port}/healthz`).then((health) => health.json()).catch(() => undefined) : undefined;
    const resolverJob = result.state === 'processing' ? await fetch(`http://127.0.0.1:${port}/v1/classify/${encodeURIComponent(result.id)}`).then(async (job) => ({ status: job.status, body: (await job.text()).slice(0, 1200) })).catch((error) => String(error)) : undefined;
    if (result.state === 'processing' && resolverJob?.status === 200) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      response = await api.onRequestGet(context(new Request(`https://site.test/api/check/${result.id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ claim: text }) }), overrides));
      result = await response.json();
    }
    assert.notEqual(result.state, 'processing', `Timed out: ${text}\nPolls: ${pollCount}, last poll: ${lastPollMs}ms\nHealth: ${JSON.stringify(serviceHealth?.metrics || serviceHealth)}\nResolver job: ${JSON.stringify(resolverJob)}\n${logs.slice(-2000)}`);
    return result;
  };
  const checkPaidRentParaphrases = async () => {
    let expectedEvidenceIds;
    for (const query of [
      '¿Cómo han cambiado las rentas efectivamente pagadas por los hogares desde 2015?',
      '¿Qué evolución han tenido los alquileres que pagan los hogares desde el año 2015?',
    ]) {
      const response = await check(query);
      assert.match(response.result.reply, /2026-0[9]|2026-10/, JSON.stringify(response));
      assert.ok(response.result.sources.some((source) => source.url === url), `Paid-rent answer omitted Eurostat's actual-rent source: ${query}`);
      const family = response.result.evidenceSummary.families.find((item) => item.metricId === 'rental_price_index');
      assert.ok(family, `Paid-rent paraphrase did not retain the rental-index evidence family: ${query}\n${JSON.stringify(response)}`);
      const evidenceIds = family.evidenceIds || [];
      assert.ok(evidenceIds.length, `Paid-rent paraphrase returned no traceable observations: ${query}`);
      if (expectedEvidenceIds) assert.deepEqual(evidenceIds, expectedEvidenceIds, `Paid-rent paraphrase changed its direct evidence: ${query}`);
      expectedEvidenceIds = evidenceIds;
    }
  };
  const vacancyOnly = process.env.STATISTICAL_RUNTIME_VACANCY_ONLY === '1';
  const rentMagnitudeOnly = process.env.STATISTICAL_RUNTIME_RENT_MAGNITUDE_ONLY === '1';
  const paidRentOnly = process.env.STATISTICAL_RUNTIME_PAID_RENT_ONLY === '1';
  if (!vacancyOnly && !rentMagnitudeOnly && !paidRentOnly) {
  const internshipSubstitution = await check('Las prácticas y becas sustituyen puestos de entrada que antes eran empleos normales');
  assert.equal(internshipSubstitution.state, 'insufficient', 'Contextual placement and inspection counts must not confirm a causal replacement claim');
  assert.equal(internshipSubstitution.result.answerScope?.family, 'internship-labour-substitution');
  assert.deepEqual(internshipSubstitution.result.answerScope.directMetrics, []);
  assert.deepEqual(internshipSubstitution.result.answerScope.contextMetrics, []);
  assert.equal(internshipSubstitution.result.arguments?.[0]?.verdict, 'insufficient');
  assert.match(internshipSubstitution.result.reply, /1\.580\.637.*2\.688.*6\.519/s);
  assert.match(internshipSubstitution.result.reply, /no indican cu[aá]ntos puestos sustituyen las pr[aá]cticas ni el ahorro empresarial/i);
  assert.deepEqual(internshipSubstitution.result.sources.map((source) => source.id).sort(), [
    'mites-false-intern-inspection-detections-2021-2025',
    'social-security-unpaid-training-practice-registrations-2025',
  ]);
  const tourismEmploymentQueries = [
    'España depende demasiado del turismo para sostener el empleo',
    'El turismo representa una parte excesiva del empleo español',
    'El empleo en España depende demasiado de las actividades turísticas',
  ];
  let tourismEmploymentSourceIds;
  for (const query of tourismEmploymentQueries) {
    const result = await check(query);
    assert.equal(result.state, 'limited', JSON.stringify(result));
    assert.equal(result.result.answerScope?.family, 'tourism-employment-contribution');
    assert.deepEqual(result.result.answerScope.directMetrics, ['tourism_characteristic_employment_share']);
    assert.deepEqual(result.result.answerScope.contextMetrics, ['tourism_characteristic_employment_jobs']);
    assert.equal(result.result.arguments?.[0]?.verdict, 'insufficient', 'The data must not decide whether sector dependence is excessive');
    assert.match(result.result.reply, /En 2024.*12,3 %.*empleo total en España/s);
    assert.match(result.result.reply, /2,78 millones de puestos/);
    assert.match(result.result.reply, /estimaci[oó]n de avance/);
    assert.match(result.result.reply, /La evidencia no basta para confirmar toda la afirmaci[oó]n/);
    assert.doesNotMatch(result.result.reply, /Tasa de vacantes|15[234]\d{3}|2025-Q[234]/, 'An unrelated vacancy series must never stand in for tourism employment');
    const sourceIds = result.result.sources.map((source) => source.id).sort();
    assert.deepEqual(sourceIds, ['ine-tourism-characteristic-jobs-2024', 'ine-tourism-employment-share-cste-2024'].sort());
    if (tourismEmploymentSourceIds) assert.deepEqual(sourceIds, tourismEmploymentSourceIds, `Tourism-employment paraphrase changed its source family: ${query}`);
    tourismEmploymentSourceIds = sourceIds;
  }
  const regionalTourismEmployment = await check('El turismo genera más empleo en Andalucía que la agricultura');
  assert.equal(regionalTourismEmployment.state, 'insufficient');
  assert.equal(regionalTourismEmployment.result.answerScope?.family, 'tourism-employment-contribution');
  assert.deepEqual(regionalTourismEmployment.result.answerScope.directMetrics, []);
  assert.deepEqual(regionalTourismEmployment.result.answerScope.contextMetrics, []);
  assert.deepEqual(regionalTourismEmployment.result.sources, [], 'National figures must not settle a regional cross-sector comparison');
  assert.doesNotMatch(regionalTourismEmployment.result.reply, /12,3 %|2,78 millones/);
  assert.match(regionalTourismEmployment.result.reply, /recuentos comparables de empleo en turismo y agricultura/);
  for (const [query, family, requiredText] of [
    ['El empleo crece más en la industria que en la hostelería', 'sector-employment-growth-comparison', /valores iniciales y finales/],
    ['El turismo genera más empleo que la agricultura', 'sector-employment-level-comparison', /recuentos de empleo/],
  ]) {
    const result = await check(query);
    assert.equal(result.state, 'insufficient', JSON.stringify(result));
    assert.equal(result.result.answerScope?.family, family);
    assert.deepEqual(result.result.answerScope.directMetrics, []);
    assert.deepEqual(result.result.answerScope.contextMetrics, []);
    assert.deepEqual(result.result.sources, [], 'A sector comparison must not borrow unrelated national employment or tourism figures');
    assert.match(result.result.reply, requiredText);
    assert.doesNotMatch(result.result.reply, /80,2 %|12,3 %|2,78 millones/);
  }
  const tourismWageNeighbour = await check('Los empleos turísticos están peor pagados que los agrícolas');
  assert.equal(tourismWageNeighbour.result.answerScope?.family, 'sector-wage-comparison');
  assert.ok(!tourismWageNeighbour.result.sources.some((source) => source.id === 'ine-tourism-employment-share-cste-2024' || source.id === 'ine-tourism-characteristic-jobs-2024'));
  assert.doesNotMatch(tourismWageNeighbour.result.reply, /12,3 %|2,78 millones/);

  const tourismHousingCostQueries = [
    'El turismo encarece el coste de la vivienda en España',
    'Las viviendas turísticas han hecho más caro el alquiler en España',
  ];
  for (const query of tourismHousingCostQueries) {
    const result = await check(query);
    assert.equal(result.state, 'insufficient', JSON.stringify(result));
    assert.equal(result.result.answerScope.family, 'tourism-urban-housing-cost');
    assert.deepEqual(result.result.answerScope.directMetrics, []);
    assert.deepEqual(result.result.answerScope.contextMetrics, ['tourist_housing_count', 'tourist_housing_share']);
    assert.match(result.result.reply, /341\.001 viviendas/);
    assert.match(result.result.reply, /1,28 %/);
    assert.match(result.result.reply, /Censo.*2021/);
    assert.match(result.result.reply, /no mide.*residentes|no mide.*coste/i);
    assert.deepEqual(result.result.sources.map((source) => source.url).sort(), [touristCountUrl, touristShareUrl].sort());
    assert.equal(result.result.arguments?.[0]?.verdict, 'insufficient');
  }
  const cityCentreTourismClaim = await check('El turismo masivo ha hecho que vivir en el centro de algunas ciudades sea un lujo');
  assert.equal(cityCentreTourismClaim.state, 'insufficient');
  assert.equal(cityCentreTourismClaim.result.answerScope?.family, 'tourism-urban-housing-cost');
  assert.deepEqual(cityCentreTourismClaim.result.sources, [], 'National tourist-housing data cannot be used to answer a city-centre cost claim');
  assert.doesNotMatch(cityCentreTourismClaim.result.reply, /341\.001|1,28 %/, 'A city-centre answer must not present national figures as if they measured that place');
  const residentialDisplacementQueries = [
    'La gentrificación está expulsando a residentes de barrios donde han vivido toda su vida',
    'El aumento del alquiler obliga a vecinos de toda la vida a abandonar el barrio',
  ];
  const atlasUrl = 'https://www.ine.es/experimental/atlas/experimental_atlas.htm/';
  const atlasMethodologyUrl = 'https://www.ine.es/metodologia/metodologia_adrh.pdf';
  for (const query of residentialDisplacementQueries) {
    const result = await check(query);
    assert.equal(result.state, 'insufficient', JSON.stringify(result));
    assert.equal(result.result.answerScope?.family, 'residential-gentrification-displacement');
    assert.deepEqual(result.result.answerScope.directMetrics, []);
    assert.deepEqual(result.result.answerScope.contextMetrics, []);
    assert.equal(result.result.arguments?.[0]?.verdict, 'insufficient');
    assert.match(result.result.reply, /qui[eé]n se mud[oó]|cambios de residencia/i);
    assert.match(result.result.reply, /por qu[eé]|motivo/i);
    assert.match(result.result.reply, /barrio|secci[oó]n censal/i);
    assert.match(result.result.reply, /2024/);
    assert.doesNotMatch(result.result.reply, /\d+(?:[,.]\d+)?\s*(?:%|euros?|€)/i, 'Area-level context must not become an unsupported displacement or rent figure');
    assert.deepEqual(result.result.sources.map((source) => source.url).sort(), [atlasUrl, atlasMethodologyUrl].sort());
    assert.ok(result.result.evidenceSummary.families.every((family) => family.dataKind === 'context'));
  }
  const educationPayQueries = [
    'Los sueldos de muchos trabajos cualificados son demasiado parecidos a los de puestos que exigen mucha menos formación',
    'Los empleos que requieren estudios superiores no pagan mucho más que los que exigen menos estudios',
    'Tener un máster o un doctorado no garantiza cobrar un salario acorde con la cualificación',
  ];
  let educationPayEvidenceIds;
  for (const query of educationPayQueries) {
    const result = await check(query);
    assert.equal(result.state, 'insufficient', JSON.stringify(result));
    assert.equal(result.result.answerScope?.family, 'education-pay-comparison');
    assert.deepEqual(result.result.answerScope.directMetrics, []);
    assert.deepEqual(result.result.answerScope.contextMetrics, ['mean_hourly_earnings_by_education']);
    assert.ok(result.result.reply.includes('10,04 €/hora'));
    assert.ok(result.result.reply.includes('11,48 €/hora'));
    assert.ok(result.result.reply.includes('17,71 €/hora'));
    assert.match(result.result.reply, /estudios alcanzados.*no los exigidos por el puesto/);
    assert.match(result.result.reply, /empresas con al menos 10 empleados/);
    assert.match(result.result.reply, /cualificaciones exigidas comparables por ocupaci[oó]n, jornada, experiencia, sector, territorio y periodo/);
    assert.deepEqual(result.result.sources.map((source) => source.url), [educationPayUrl]);
    assert.equal(result.result.arguments?.[0]?.verdict, 'insufficient');
    const evidenceIds = result.result.evidenceSummary.families.find((family) => family.familyId === 'mean_hourly_earnings_by_education')?.evidenceIds || [];
    assert.equal(evidenceIds.length, 3, 'The answer must show all education levels instead of silently dropping the highest category');
    if (educationPayEvidenceIds) assert.deepEqual([...evidenceIds].sort(), educationPayEvidenceIds, `A paraphrase selected different education-pay observations: ${query}`);
    educationPayEvidenceIds = [...evidenceIds].sort();
  }
  const educationSocioeconomicQueries = [
    'El rendimiento escolar depende demasiado de los recursos económicos de la familia',
    'Las notas del alumnado están relacionadas con el nivel socioeconómico de sus hogares',
    'El origen social condiciona los resultados académicos en ciencias',
    'Los estudiantes de familias de bajos ingresos sacan peores notas',
  ];
  let educationSocioeconomicSourceIds;
  for (const query of educationSocioeconomicQueries) {
    const result = await check(query, undefined, { DB: emptyD1 });
    assert.equal(result.state, 'insufficient', JSON.stringify(result));
    assert.equal(result.result.answerScope?.family, 'education-socioeconomic-performance');
    assert.deepEqual(result.result.answerScope.directMetrics, []);
    assert.deepEqual(result.result.answerScope.contextMetrics, []);
    assert.equal(result.result.arguments?.[0]?.verdict, 'insufficient');
    assert.match(result.result.reply, /PISA 2025.*15 a[nñ]os.*71 puntos.*25 %.*85 puntos/s);
    assert.match(result.result.reply, /9 %.*12 %/);
    assert.match(result.result.reply, /no mide solo los ingresos familiares/i);
    assert.match(result.result.reply, /correlaciones emp[ií]ricas, no efectos causales/i);
    assert.match(result.result.reply, /no mide las notas de todas las etapas/);
    assert.doesNotMatch(result.result.reply, /^La evidencia no basta para confirmar toda la afirmaci[oó]n\./, 'The useful PISA context should remain visible after public causal-claim qualification');
    assert.ok(result.result.reply.split(/\s+/).length <= 150, 'The final text response should stay concise');
    assert.deepEqual(result.result.sources.map((source) => source.id), [
      'oecd-pisa-2025-spain-socioeconomic-results', 'oecd-pisa-2025-framework',
    ]);
    assert.deepEqual(result.result.criteria.map((criterion) => criterion.sourceIds), [
      ['oecd-pisa-2025-spain-socioeconomic-results'],
      ['oecd-pisa-2025-spain-socioeconomic-results'],
      ['oecd-pisa-2025-framework'],
    ]);
    const sourceIds = result.result.sources.map((source) => source.id);
    if (educationSocioeconomicSourceIds) assert.deepEqual(sourceIds, educationSocioeconomicSourceIds, `A text paraphrase changed the socioeconomic evidence sources: ${query}`);
    educationSocioeconomicSourceIds = sourceIds;
  }
  for (const nearby of [
    'El acceso a buenos centros educativos depende demasiado del barrio donde se vive',
    'Las familias con dinero pueden compensar fallos del sistema educativo con academias y refuerzo',
  ]) {
    const result = await check(nearby, undefined, { DB: emptyD1 });
    assert.notEqual(result.result.answerScope?.family, 'education-socioeconomic-performance');
    assert.ok(!result.result.sources.some((source) => source.id.startsWith('oecd-pisa-')), `A nearby education claim inherited PISA performance evidence: ${nearby}`);
    assert.doesNotMatch(result.result.reply, /71 puntos|9 %/);
  }
  const differentPeriodPisaNeighbour = await check('El rendimiento escolar depende de los ingresos familiares en 2022', undefined, { DB: emptyD1 });
  assert.equal(differentPeriodPisaNeighbour.result.answerScope?.family, 'education-socioeconomic-performance');
  assert.deepEqual(differentPeriodPisaNeighbour.result.sources, [], 'PISA 2025 must not be shown for an explicit 2022 claim');
  assert.doesNotMatch(differentPeriodPisaNeighbour.result.reply, /71 puntos|9 %/);
  const educationOverqualificationNeighbour = await check('La tasa de sobrecualificación de titulados universitarios es alta');
  assert.notEqual(educationOverqualificationNeighbour.state, 'supported');
  assert.equal(educationOverqualificationNeighbour.result.answerScope?.family, 'education-employment-outcomes');
  assert.ok(!educationOverqualificationNeighbour.result.sources.some((source) => source.url === educationPayUrl), 'Education-level earnings must not be attributed to an overqualification claim');
  assert.doesNotMatch(educationOverqualificationNeighbour.result.reply, /10,04|11,48|17,71/, 'A nearby overqualification claim must not inherit salary figures');
  const youthEmploymentCauseQueries = [
    'Los jóvenes aceptan empleos por debajo de su cualificación porque no encuentran oportunidades acordes a sus estudios',
    'Jóvenes titulados trabajan en puestos de menor cualificación porque no hay ofertas que encajen con sus estudios',
    'La falta de puestos acordes lleva a jóvenes titulados a aceptar empleos por debajo de su preparación',
    'Por no hallar un empleo de su nivel, los jóvenes titulados acaban aceptando trabajos de menor cualificación',
    'Los jóvenes ocupan empleos por debajo de sus estudios debido a que hay pocas oportunidades acordes',
  ];
  const youthOverqualificationSnapshot = EDUCATION_EMPLOYMENT_SNAPSHOT.observations
    .find((item) => item.metricId === 'tertiary_overqualification_rate_age_20_34');
  const youthOverqualificationSourceId = youthOverqualificationSnapshot?.source.id;
  const youthOverqualificationSourceUrl = youthOverqualificationSnapshot?.source.url;
  let youthEmploymentCauseSourceIds;
  for (const query of youthEmploymentCauseQueries) {
    const result = await check(query, undefined, { DB: emptyD1 });
    assert.equal(result.state, 'insufficient', JSON.stringify(result));
    assert.equal(result.result.answerScope?.family, 'education-employment-outcomes');
    assert.deepEqual(result.result.answerScope.directMetrics, []);
    assert.deepEqual(result.result.answerScope.contextMetrics, ['tertiary_overqualification_rate_age_20_34']);
    assert.equal(result.result.arguments?.[0]?.verdict, 'insufficient');
    assert.deepEqual(result.result.arguments?.[0]?.evidenceIds, []);
    assert.match(result.result.reply, /34,4 % de las personas ocupadas de 20 a 34 a[nñ]os/);
    assert.match(result.result.reply, /no mide ofertas adecuadas ni por qu[eé] aceptaron esos puestos/);
    assert.match(result.result.reply, /34,4 % de las personas ocupadas de 20 a 34 a[nñ]os con educaci[oó]n terciaria/);
    assert.match(result.result.reply, /fuente señala una diferencia de definici[oó]n; compara a[nñ]os con cautela/);
    assert.deepEqual(result.result.criteria.map((criterion) => criterion.label), ['Contexto']);
    const [overqualificationSource] = result.result.sources;
    assert.equal(result.result.sources.length, 1);
    const overqualificationUrl = new URL(overqualificationSource.url);
    const reviewedSnapshotSource = overqualificationSource.id === youthOverqualificationSourceId
      && overqualificationSource.url === youthOverqualificationSourceUrl;
    const currentEurostatSource = overqualificationUrl.hostname === 'ec.europa.eu'
      && overqualificationUrl.pathname.endsWith('/data/lfsa_eoqgan')
      && overqualificationUrl.searchParams.get('freq') === 'A'
      && overqualificationUrl.searchParams.get('citizen') === 'TOTAL'
      && overqualificationUrl.searchParams.get('age') === 'Y20-34'
      && overqualificationUrl.searchParams.get('sex') === 'T'
      && overqualificationUrl.searchParams.get('unit') === 'PC'
      && overqualificationUrl.searchParams.get('geo') === 'ES';
    assert.ok(reviewedSnapshotSource || currentEurostatSource, `Overqualification context must cite its reviewed snapshot or matching Eurostat series: ${JSON.stringify(overqualificationSource)}`);
    const sourceIds = result.result.sources.map((source) => source.id);
    if (youthEmploymentCauseSourceIds) assert.deepEqual(sourceIds, youthEmploymentCauseSourceIds, `A causal paraphrase changed its evidence source: ${query}`);
    youthEmploymentCauseSourceIds = sourceIds;
  }
  const youthUnemploymentNeighbour = await check('Los jóvenes con estudios superiores tienen más paro que antes', undefined, { DB: emptyD1 });
  assert.equal(youthUnemploymentNeighbour.result.answerScope?.family, 'education-employment-outcomes');
  assert.deepEqual(youthUnemploymentNeighbour.result.sources, [], 'Youth overqualification must not stand in for youth unemployment');
  assert.doesNotMatch(youthUnemploymentNeighbour.result.reply, /34,4 %/);
  const mastersRequirementNeighbour = await check('Cada vez se exige un máster para trabajos que antes pedían solo una carrera', undefined, { DB: emptyD1 });
  assert.equal(mastersRequirementNeighbour.result.answerScope?.family, 'education-employment-outcomes');
  assert.deepEqual(mastersRequirementNeighbour.result.sources, [], 'Overqualification data must not stand in for changing job-ad requirements');
  assert.doesNotMatch(mastersRequirementNeighbour.result.reply, /83,2 %|34 %/);
  const touristHousingQueries = [
    'Los pisos turísticos están retirando demasiada vivienda del alquiler residencial',
    'El alquiler turístico es solo una parte del problema y la escasez estructural de oferta pesa más',
  ];
  let touristHousingEvidenceIds;
  for (const query of touristHousingQueries) {
    const result = await check(query, undefined, { DB: emptyD1 });
    assert.equal(result.state, 'insufficient', JSON.stringify(result));
    assert.equal(result.result.answerScope?.family, 'tourist-housing-supply');
    assert.deepEqual(result.result.answerScope.directMetrics, []);
    assert.deepEqual(result.result.answerScope.contextMetrics, ['tourist_housing_count', 'tourist_housing_share']);
    assert.ok(['snapshot', 'dynamic'].includes(result.result.evidenceSummary.mode));
    assert.match(result.result.reply, /mayo de 2026.*341\.001 viviendas.*1,28 % del parque total/s);
    assert.match(result.result.reply, /Censo de 2021 como denominador/);
    assert.match(result.result.reply, /no mide viviendas que dejaron el alquiler residencial/i);
    assert.equal(result.result.sources.length, 2);
    assert.ok(result.result.sources.every((source) => /(^|\.)ine\.es$/i.test(new URL(source.url).hostname)));
    assert.equal(result.result.arguments?.[0]?.verdict, 'insufficient');
    const evidenceIds = result.result.evidenceSummary.families.flatMap((family) => family.evidenceIds || []);
    assert.ok(evidenceIds.length >= 2, 'The reply must retain source-linked observations for both count and denominator');
    if (touristHousingEvidenceIds) assert.deepEqual([...evidenceIds].sort(), touristHousingEvidenceIds, `A tourist-housing paraphrase selected different observations: ${query}`);
    touristHousingEvidenceIds = [...evidenceIds].sort();
  }
  const touristHousingNeighbour = await check('Las viviendas turísticas han reducido la oferta para residentes en los barrios más céntricos', undefined, { DB: emptyD1 });
  assert.equal(touristHousingNeighbour.state, 'insufficient');
  assert.equal(touristHousingNeighbour.result.answerScope?.family, 'tourist-housing-supply');
  assert.deepEqual(touristHousingNeighbour.result.sources, [], 'National housing estimates must not be shown as neighborhood evidence');
  assert.doesNotMatch(touristHousingNeighbour.result.reply, /341\.001|1,28 %/);
  const touristHousingCount = await check('¿Cuántas viviendas turísticas hay en España?', undefined, { DB: emptyD1 });
  assert.equal(touristHousingCount.state, 'limited');
  assert.equal(touristHousingCount.result.answerScope?.family, 'tourist-housing-count');
  assert.match(touristHousingCount.result.reply, /341\.001 viviendas.*mayo de 2026/s);
  assert.equal(touristHousingCount.result.sources.length, 1);
  assert.ok(['INE', 'Instituto Nacional de Estadística'].includes(touristHousingCount.result.sources[0].publisher));
  const renewableGrid = await check('La falta de capacidad de las redes eléctricas obliga a verter energía solar y eólica', undefined, { DB: emptyD1 });
  assert.equal(renewableGrid.state, 'insufficient');
  assert.equal(renewableGrid.result.answerScope?.family, 'renewable-grid-integration');
  assert.match(renewableGrid.result.reply, /154 GW.*reducci[oó]n significativa de los vertidos/s);
  assert.match(renewableGrid.result.reply, /no una medici[oó]n de los MWh que hoy no se integran por l[ií]mites de red/);
  assert.equal(renewableGrid.result.shareableReply?.split(/\n{2,}/).length, 2);
  assert.deepEqual(renewableGrid.result.sources.map((source) => source.id), ['miteco-electricity-plan-2030']);
  const gridInvestment = await check('La inversión en redes eléctricas no acompasa el crecimiento de renovables y nueva demanda', undefined, { DB: emptyD1 });
  assert.equal(gridInvestment.state, 'insufficient');
  assert.equal(gridInvestment.result.answerScope?.family, 'electricity-grid-investment-gap');
  assert.match(gridInvestment.result.reply, /17\.142 millones de euros.*47 GW.*importes planificados, no gasto ya ejecutado/s);
  assert.equal(gridInvestment.result.shareableReply?.split(/\n{2,}/).length, 2);
  assert.deepEqual(gridInvestment.result.sources.map((source) => source.id), ['miteco-electricity-investment-limits-2026', 'miteco-electricity-plan-2030']);
  const selfConsumptionDelay = await check('La burocracia de acceso a red retrasa proyectos de autoconsumo solar viables', undefined, { DB: emptyD1 });
  assert.equal(selfConsumptionDelay.state, 'insufficient');
  assert.equal(selfConsumptionDelay.result.answerScope?.family, 'self-consumption-connection-delays');
  assert.match(selfConsumptionDelay.result.reply, /est[aá]n exentas de permisos de acceso y conexi[oó]n.*15 kW/s);
  assert.match(selfConsumptionDelay.result.reply, /no mide cu[aá]nto tardan los tr[aá]mites ni cu[aá]ntos proyectos rentables se frenan/);
  assert.equal(selfConsumptionDelay.result.shareableReply?.split(/\n{2,}/).length, 2);
  assert.deepEqual(selfConsumptionDelay.result.sources.map((source) => source.id), ['miteco-autoconsumo-access-connection']);
  const urbanPlanningDelay = await check('Se construye demasiado poco por la lentitud de las licencias urbanísticas', undefined, { DB: emptyD1 });
  assert.equal(urbanPlanningDelay.state, 'insufficient');
  assert.equal(urbanPlanningDelay.result.answerScope?.family, 'urban-planning-license-delays');
  assert.match(urbanPlanningDelay.result.reply, /licencias de obra mayor concedidas.*duraci[oó]n prevista.*no el plazo de tramitaci[oó]n/s);
  assert.match(urbanPlanningDelay.result.reply, /no mide cu[aá]ntos d[ií]as tard[oó] cada expediente/);
  assert.equal(urbanPlanningDelay.result.shareableReply?.split(/\n{2,}/).length, 2);
  assert.deepEqual(urbanPlanningDelay.result.sources.map((source) => source.id), ['ine-building-permits-methodology']);
  const receivedBeforeSelfEmployment = (await fetch(`http://127.0.0.1:${port}/healthz`).then((health) => health.json())).metrics.received;
  const selfEmploymentCost = await check('La cuota y los costes fijos hacen inviable ser autónomo con ingresos bajos o irregulares', undefined, { DB: emptyD1 });
  const receivedAfterSelfEmployment = (await fetch(`http://127.0.0.1:${port}/healthz`).then((health) => health.json())).metrics.received;
  assert.equal(receivedAfterSelfEmployment, receivedBeforeSelfEmployment, 'A context-only family with no warehouse metric should return its reviewed scope without queuing a generic resolver search');
  assert.equal(selfEmploymentCost.state, 'insufficient');
  assert.equal(selfEmploymentCost.result.answerScope?.family, 'self-employment-cost-viability');
  assert.match(selfEmploymentCost.result.reply, /hasta 670 €.*653,59 € a 718,94 €.*205,88 € al mes/s);
  assert.match(selfEmploymentCost.result.reply, /antes de reducciones o bonificaciones/);
  assert.equal(selfEmploymentCost.result.shareableReply?.split(/\n{2,}/).length, 2);
  assert.deepEqual(selfEmploymentCost.result.sources.map((source) => source.id), ['boe-reta-contributions-2026']);
  }
  if (!rentMagnitudeOnly && !paidRentOnly) {
  let vacancyRateEvidenceIds;
  for (const query of [
    '¿Cuál fue la tasa de vacantes de empleo en España en el tercer trimestre de 2026?',
    '¿Qué porcentaje de puestos vacantes se registró en España durante el tercer trimestre de 2026?',
  ]) {
    const result = await check(query);
    assert.match(result.result.reply, /Tasa de vacantes de empleo en España: 0,8 %/, JSON.stringify(result));
    assert.match(result.result.reply, /provisional/i, `The source quality flag must be visible in the answer: ${JSON.stringify(result.result)}`);
    assert.doesNotMatch(result.result.reply, /148\.944|17\.598\.304/, 'A vacancy-rate answer must not use a post count');
    assert.deepEqual(result.result.sources.map((source) => source.url), [vacancyUrl]);
    assert.equal(result.result.evidenceSummary.families[0].metricId, 'job_vacancy_rate', 'The API must preserve the selected rate metric through response validation');
    const evidenceIds = result.result.evidenceSummary.families.flatMap((family) => family.evidenceIds || []);
    assert.deepEqual(evidenceIds, ['vacancy-source-observation-2'], `Rate paraphrase selected the wrong indicator: ${query}`);
    assert.match(result.result.evidenceSummary.families[0].limitation, /La tasa divide los puestos vacantes/);
    if (vacancyRateEvidenceIds) assert.deepEqual(evidenceIds, vacancyRateEvidenceIds, `Rate paraphrase selected different evidence: ${query}`);
    vacancyRateEvidenceIds = [...evidenceIds];
  }
  const latestVacancyRate = await check('¿Cuál fue la tasa de vacantes de empleo más reciente en España?');
  assert.match(latestVacancyRate.result.reply, /Tasa de vacantes de empleo en España: 0,8 %.*2026-Q3/s, JSON.stringify(latestVacancyRate));
  assert.match(latestVacancyRate.result.reply, /provisional/i, 'A latest-period answer must retain the source provisional flag');
  assert.deepEqual(latestVacancyRate.result.evidenceSummary.families.flatMap((family) => family.evidenceIds || []), ['vacancy-source-observation-2'], 'A current vacancy query must exclude the older NACE Rev. 2 series');
  let vacancyCountEvidenceIds;
  for (const query of [
    '¿Cuántos puestos de trabajo sin cubrir había en España en el tercer trimestre de 2026?',
    '¿Cuál fue el número de vacantes laborales en España durante el tercer trimestre de 2026?',
  ]) {
    const result = await check(query);
    assert.match(result.result.reply, /Número de puestos de trabajo vacantes en España: 148\.944 puestos/, JSON.stringify(result));
    assert.match(result.result.reply, /provisional/i, 'The source quality flag must be visible in the count answer');
    assert.doesNotMatch(result.result.reply, /17\.598\.304|0,8 %/, 'A vacancy-count answer must not use occupied posts or a rate');
    assert.deepEqual(result.result.sources.map((source) => source.url), [vacancyUrl]);
    assert.equal(result.result.evidenceSummary.families[0].metricId, 'job_vacancy_count', 'The API must preserve the selected count metric through response validation');
    const evidenceIds = result.result.evidenceSummary.families.flatMap((family) => family.evidenceIds || []);
    assert.deepEqual(evidenceIds, ['vacancy-source-observation-0'], `Count paraphrase selected the wrong indicator: ${query}`);
    if (vacancyCountEvidenceIds) assert.deepEqual(evidenceIds, vacancyCountEvidenceIds, `Count paraphrase selected different evidence: ${query}`);
    vacancyCountEvidenceIds = [...evidenceIds];
  }
  const occupiedPosts = await check('¿Cuántos puestos de trabajo ocupados había en España en el tercer trimestre de 2026?');
  assert.match(occupiedPosts.result.reply, /Número de puestos de trabajo ocupados en España: 17\.598\.304 puestos/, JSON.stringify(occupiedPosts));
  assert.match(occupiedPosts.result.reply, /provisional/i, 'The source quality flag must be visible in the occupied-post answer');
  assert.doesNotMatch(occupiedPosts.result.reply, /148\.944|0,8 %/, 'Occupied-post claims must not borrow vacancy counts or rates');
  assert.equal(occupiedPosts.result.evidenceSummary.families[0].metricId, 'occupied_job_post_count');
  assert.deepEqual(occupiedPosts.result.evidenceSummary.families.flatMap((family) => family.evidenceIds || []), ['vacancy-source-observation-1']);
  assert.match(occupiedPosts.result.evidenceSummary.families[0].limitation, /no personas empleadas únicas/);
  let vacancyRateChangeEvidenceIds;
  for (const query of [
    '¿Cómo cambió la tasa de vacantes de empleo frente al trimestre anterior en España en el tercer trimestre de 2026?',
    '¿Cuántos puntos porcentuales cambió la tasa de vacantes frente al trimestre anterior en España en el tercer trimestre de 2026?',
  ]) {
    const vacancyRateChange = await check(query);
    assert.match(vacancyRateChange.result.reply, /Variación trimestral de la tasa de vacantes en España: 0 puntos porcentuales/, JSON.stringify(vacancyRateChange));
    assert.match(vacancyRateChange.result.reply, /provisional/i, 'The source quality flag must be visible in the quarterly-change answer');
    assert.doesNotMatch(vacancyRateChange.result.reply, /148\.944|17\.598\.304|0,8 %/, 'Quarterly rate change must not be expressed as a count or rate level');
    assert.equal(vacancyRateChange.result.evidenceSummary.families[0].metricId, 'job_vacancy_rate_quarterly_change');
    const evidenceIds = vacancyRateChange.result.evidenceSummary.families.flatMap((family) => family.evidenceIds || []);
    assert.deepEqual(evidenceIds, ['vacancy-source-observation-3']);
    if (vacancyRateChangeEvidenceIds) assert.deepEqual(evidenceIds, vacancyRateChangeEvidenceIds, `Quarter-change paraphrase selected different evidence: ${query}`);
    vacancyRateChangeEvidenceIds = evidenceIds;
  }
  const mixedVacancyMeasures = await check('¿Cuál fue la tasa de vacantes y el número de puestos vacantes en España en el tercer trimestre de 2026?');
  assert.equal(mixedVacancyMeasures.state, 'clarification', JSON.stringify(mixedVacancyMeasures));
  assert.deepEqual(mixedVacancyMeasures.options.map((option) => option.id), ['job_vacancy_count', 'job_vacancy_rate']);
  const selectedCount = mixedVacancyMeasures.options[0];
  const selectedCountResult = await check(mixedVacancyMeasures.claim, {
    id: selectedCount.id,
    prompt: selectedCount.interpretation.normalizedClaim,
    interpretation: selectedCount.interpretation,
  });
  assert.match(selectedCountResult.result.reply, /Número de puestos de trabajo vacantes en España: 148\.944 puestos/, JSON.stringify(selectedCountResult));
  assert.deepEqual(selectedCountResult.result.evidenceSummary.families.flatMap((family) => family.evidenceIds || []), ['vacancy-source-observation-0']);
  const selectedRate = mixedVacancyMeasures.options[1];
  const selectedRateResult = await check(mixedVacancyMeasures.claim, {
    id: selectedRate.id,
    prompt: selectedRate.interpretation.normalizedClaim,
    interpretation: selectedRate.interpretation,
  });
  assert.match(selectedRateResult.result.reply, /Tasa de vacantes de empleo en España: 0,8 %/, JSON.stringify(selectedRateResult));
  assert.deepEqual(selectedRateResult.result.evidenceSummary.families.flatMap((family) => family.evidenceIds || []), ['vacancy-source-observation-2']);
  }
  if (rentMagnitudeOnly) {
    const magnitude = await check('El índice de precios del alquiler subió un 300 % desde 2015');
    assert.ok(magnitude.result, `Expected a source-backed response: ${JSON.stringify(magnitude)}`);
    assert.match(magnitude.result.reply, /variaci[oó]n relativa fue \+?17,05 %.*no coincide con el \+?300 % indicado/i, JSON.stringify(magnitude));
  }
  if (!vacancyOnly && !rentMagnitudeOnly && !paidRentOnly) {
  const plainRentTrend = await check('El precio del alquiler subió en España durante 2025');
  assert.notEqual(plainRentTrend.result.answerScope?.family, 'residential-gentrification-displacement', 'A rent trend without resident movement must not be presented as displacement');
  for (const query of ['¿Cómo ha evolucionado el índice de precios del alquiler desde 2015?', '¿Ha subido el índice del alquiler en España desde 2015?']) {
    const result = await check(query);
    assert.match(result.result.reply, /índice \(2015=100\)/, JSON.stringify(result));
    assert.match(result.result.reply, /2015/);
    assert.match(result.result.reply, /2026-09/);
    assert.match(result.result.reply, /índice \(2015=100\)/);
    assert.doesNotMatch(result.result.reply, /1996=100|no ha pasado todos los controles/);
    assert.deepEqual(result.result.sources.map((source) => source.url), [url]);
    assert.doesNotMatch(result.result.limitations?.join(' ') || '', /fuente necesita una actualizaci[oó]n/i);
  }
  const currentInflationQueries = [
    '¿Cuál es la inflación armonizada actual de España?',
    '¿Qué tasa anual de inflación registra España ahora?',
  ];
  for (const query of currentInflationQueries) {
    const result = await check(query);
    assert.match(result.result.reply, /3,4 % interanual \(2026-10\)/, JSON.stringify(result));
    assert.match(result.result.keyFact, /3,4 % interanual \(2026-10\)/, JSON.stringify(result.result));
    assert.ok(result.result.whatWeKnow.some((point) => /3,4 % interanual \(2026-10\)/.test(point)));
    assert.match(result.result.reply, /variaci[oó]n frente al mismo periodo del a[nñ]o anterior/i);
    assert.match(result.result.reply, /estimado/i);
    assert.doesNotMatch(result.result.reply, /cu[ií]a fiscal|pensiones|IRPF/);
    assert.equal(result.result.sources.length, 1, JSON.stringify(result.result.sources));
    assert.equal(result.result.sources[0].url, inflationUrl);
    assert.equal(result.result.visual, undefined);
    const responseEvidence = result.result.evidenceSummary.families.flatMap((family) => family.evidenceIds || []);
    assert.deepEqual([...new Set(responseEvidence)], ['inflation-2026-10']);
  }
  const explicitEuropeanComparison = await check('¿Cuál es la inflación armonizada de España frente a la Unión Europea ahora?');
  assert.match(explicitEuropeanComparison.result.reply, /3,4 % interanual.*España.*2,8 % interanual.*Unión Europea/);
  assert.equal(explicitEuropeanComparison.result.sources.length, 1);
  assert.equal(explicitEuropeanComparison.result.sources[0].url, inflationEuropeUrl);
  for (const query of [
    '¿Cuánto cuesta el alquiler medio ahora?',
    '¿Cuál es el importe en euros del alquiler medio más reciente en España?',
    '¿Qué importe mensual en euros tiene el alquiler vigente de una vivienda en España?',
    'En España, ¿cuánto se paga de alquiler al mes en euros según el dato oficial más reciente?',
    '¿Qué último dato oficial indica cuánto cuesta alquilar una vivienda al mes, en euros, en España?',
  ]) {
    const absoluteRentPrice = await check(query);
    assert.notEqual(absoluteRentPrice.state, 'supported');
    assert.equal(absoluteRentPrice.result.answerScope?.family, 'rental-price-amount');
    assert.match(absoluteRentPrice.result.reply, /(?:no el importe del alquiler en euros|no publica el importe mensual medio en euros)/);
    assert.doesNotMatch(absoluteRentPrice.result.reply, /compraventa|precio de la vivienda/i);
    assert.equal(absoluteRentPrice.result.visual, undefined);
    assert.deepEqual(absoluteRentPrice.result.sources.map((source) => source.url), [url], JSON.stringify(absoluteRentPrice.result.sources));
  }
  const quotaLimitedDb = {
    prepare(sql) {
      const statement = d1.prepare(sql);
      return {
        bind(...values) {
          const bound = statement.bind(...values);
          return {
            async all() {
              if (sql.includes('WHERE o.metric_id = ?')) throw new Error('D1 daily row read limit');
              return bound.all();
            },
            async run() { return bound.run(); },
          };
        },
      };
    },
  };
  const quotaRequest = new Request('https://site.test/api/check?fresh=1', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: '¿Cuánto cuesta el alquiler medio ahora?', inputType: 'text' }) });
  const quotaResponse = await api.onRequestPost(context(quotaRequest, { DB: quotaLimitedDb }));
  const quotaBody = await quotaResponse.json();
  assert.equal(quotaBody.state, 'unavailable');
  assert.match(quotaBody.message, /no hemos podido consultar la serie estad[ií]stica/i);
  const currentRentIndex = await check('¿Cuál es el índice de precios del alquiler actual?');
  assert.match(currentRentIndex.result.reply, /índice \(2015=100\).*2026-09/);
  assert.deepEqual(currentRentIndex.result.sources.map((source) => source.url), [url]);
  assert.equal(currentRentIndex.result.visual, undefined);
  const historicalRentTrend = await check('¿Cómo ha cambiado el índice de alquiler desde 2010?');
  assert.notEqual(historicalRentTrend.state, 'insufficient', JSON.stringify(historicalRentTrend));
  assert.match(historicalRentTrend.result.reply, /98,6.*2010-01.*117,05.*2026-09/s, JSON.stringify(historicalRentTrend));
  assert.match(historicalRentTrend.result.reply, /no mide los precios anunciados/i);
  assert.deepEqual(historicalRentTrend.result.sources.map((source) => source.url), [url]);
  await checkPaidRentParaphrases();
  const missing = await check('¿Cómo ha cambiado el índice de alquiler desde 2012?');
  assert.equal(missing.state, 'insufficient', JSON.stringify(missing));
  assert.match(missing.result.reply, /serie del mismo indicador que incluya 2012 y el periodo final/);
  assert.doesNotMatch(missing.result.reply, /100|120/, 'A source-free gap should name the missing time coverage without revealing unlinked nearby values');
  assert.equal(missing.result.visual, undefined);
  const missingParaphrase = await check('¿Qué evolución ha tenido el índice de alquiler desde el año 2012?');
  assert.equal(missingParaphrase.state, 'insufficient');
  assert.match(missingParaphrase.result.reply, /serie del mismo indicador que incluya 2012 y el periodo final/);
  assert.doesNotMatch(missingParaphrase.result.reply, /100|120/);
  for (const query of [
    '¿Cómo han cambiado los precios anunciados del alquiler en portales desde 2015?',
    '¿Qué precio de oferta tienen los alquileres publicados desde 2015?',
    '¿Qué evolución ha tenido el precio de oferta de las viviendas en alquiler?',
    'How have advertised asking rents changed since 2015?',
    'How have listed rental prices changed since 2015?',
  ]) {
    const askingRent = await check(query);
    assert.ok(!askingRent.result?.sources?.some((source) => source.url === url), `Actual-rent HICP must not answer advertised rents: ${JSON.stringify(askingRent)}`);
    assert.doesNotMatch(askingRent.result?.reply || '', /Índice de rentas de alquiler efectivamente pagadas|117,05 índice/i);
  }
  for (const query of ['El índice de precios del alquiler subió un 300 % desde 2015', 'El índice del alquiler ha aumentado en un 300 % desde 2015']) {
    const magnitude = await check(query);
    assert.notEqual(magnitude.state, 'supported', JSON.stringify(magnitude));
    assert.ok(magnitude.result, `Expected a source-backed response: ${JSON.stringify(magnitude)}`);
    assert.match(magnitude.result.reply, /pas[oó] de 100.*\(2015\).*117,05.*\(2026-09\)/i, JSON.stringify(magnitude));
    assert.match(magnitude.result.reply, /variaci[oó]n relativa fue \+?17,05 %.*no coincide con el \+?300 % indicado/i, JSON.stringify(magnitude));
    assert.equal(magnitude.result.arguments?.[0]?.verdict, 'contradicted', JSON.stringify(magnitude));
    assert.deepEqual(magnitude.result.sources.map((source) => source.url), [url], JSON.stringify(magnitude.result.sources));
  }
  const matchingMagnitude = await check('El índice de precios del alquiler subió un 17,05 % desde 2015');
  assert.equal(matchingMagnitude.result.arguments?.[0]?.verdict, 'supported', JSON.stringify(matchingMagnitude));
  assert.match(matchingMagnitude.result.reply, /variaci[oó]n relativa fue \+?17,05 % y coincide/i, JSON.stringify(matchingMagnitude));
  const unscopedMagnitude = await check('El índice de precios del alquiler subió un 300 %');
  assert.notEqual(unscopedMagnitude.result.arguments?.[0]?.verdict, 'contradicted', JSON.stringify(unscopedMagnitude));
  assert.match(unscopedMagnitude.result.reply, /hay que indicar desde qu[eé] a[nñ]o|entre qu[eé] periodos/i, JSON.stringify(unscopedMagnitude));
  assert.equal(unscopedMagnitude.result.visual, undefined);
  assert.deepEqual(unscopedMagnitude.result.sources.map((source) => source.url), [url]);
  db.prepare('UPDATE source_documents SET retrieved_at = ? WHERE id = ?').run('2020-01-01T00:00:00Z', 'rent-source');
  const stale = await check('¿Ha cambiado el índice de precios del alquiler en España desde 2015?');
  assert.notEqual(stale.state, 'supported');
  assert.match(stale.result.reply, /no se ha actualizado.*revisiones recientes/);
  db.prepare('UPDATE source_documents SET retrieved_at = ? WHERE id = ?').run(retrieved, 'rent-source');
  db.prepare('UPDATE observations SET value = NULL, payload_json = ? WHERE id = ?').run('{"status":"b"}', 'I15-2020');
  const broken = await check('¿Cómo han evolucionado los precios del alquiler desde 2015?');
  assert.equal(broken.state, 'insufficient', JSON.stringify(broken));
  assert.match(broken.result.reply, /ruptura de serie en 2020/);
  assert.equal(broken.result.visual, undefined);
  assert.doesNotMatch(logs, /invalid publishedAt/);
  for (let index = 0; index < 600; index += 1) {
    insert.run(`noise-${index}`, 'observation', 'rent-data', 'Índice de precios del alquiler', 'rental_price_index', 130, 'Index, 1996=100', '2025', 'España', null,
      JSON.stringify({ geo: 'ES', unit: `NOISE${index}`, time: '2025' }), '{}', null, null, '{}', 'rent-source', 'índice precios alquiler España evolución subida tasa interanual');
  }
  const baselineRows = await searchD1Warehouse(d1, '¿Cómo ha evolucionado el índice de precios del alquiler desde 2015?');
  assert.ok(baselineRows.some((row) => row.id === 'I15-2015'), 'A crowded search must retain observations from the requested baseline year');
  assert.ok(baselineRows.some((row) => row.id === 'I15-2020' && row.status === 'b'), 'A crowded historical search must retain a break between the endpoints');
  assert.ok(baselineRows.length <= 500, 'Historical retrieval must respect the public payload cap');
  }
  if (paidRentOnly) await checkPaidRentParaphrases();
  await Promise.allSettled(pending);
} finally {
  child.kill('SIGTERM');
  await Promise.race([once(child, 'exit').catch(() => {}), new Promise((resolve) => setTimeout(resolve, 2000))]);
  if (child.exitCode === null) child.kill('SIGKILL');
  db.close();
}
console.log('Statistical answer runtime passed: public API, nullable dates, units, requested years and missing-cell break flags.');
