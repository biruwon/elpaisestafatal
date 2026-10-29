import assert from 'node:assert/strict';
import { alignPropositionOutcomes } from '../lib/compound-evidence.mjs';
import { measurementMeaningPlan } from '../../src/lib/knowledge/measurement-meaning.mjs';
import { broadDomainPacketsFor } from '../../src/lib/knowledge/broad-domain-snapshot.mjs';
import { parseDomainPayload, parsePublicHousingActionsText } from './domain-connectors.mjs';
import { selectEvidence, evidenceSummaryForPublic } from './evidence-selection.mjs';
import { refreshBatch } from './refresh-batch.mjs';
import { deterministicApiFallback } from '../../src/lib/knowledge/deterministic-api-fallback.mjs';
import { spanishInstitutionalScope } from '../../src/lib/knowledge/institutional-scope.mjs';

const row = (id, value, extra = {}) => ({ id, metricId: 'unemployment_rate', metric: 'Tasa de paro', value, unit: '%', period: '2025', geography: 'España', population: 'Población activa', evidenceFit: 'direct', freshness: 'fresh', source: { id: 'ine', sourceType: 'official', retrievedAt: new Date().toISOString() }, ...extra });
const select = (observations) => selectEvidence({ query: 'La tasa de paro en España', observations, candidateIds: ['unemployment_rate'] });
for (const value of [null, undefined, '', ' ', NaN, Infinity]) assert.equal(select([row('bad', value)]).selected.length, 0, `Missing value ${value} must not become zero`);
assert.match(select([row('zero', 0)]).selected[0].finding, /0 %/, 'A measured zero must be preserved');
const mixed = select([row('old-fresh', 10, { period: '2024' }), row('new-stale', 9, { freshness: 'stale' })]);
assert.equal(mixed.selected[0].freshness, 'stale');
assert.equal(mixed.overallLevel, 'insufficient');
assert.match(mixed.selected[0].limitation, /actualizaci/);
const scope = evidenceSummaryForPublic(select([row('scoped', 9)]));
assert.equal(scope.families[0].dimensions.population, 'Población activa');
assert.equal(scope.families[0].period, '2025');
assert.deepEqual(scope.families[0].sourceIds, ['ine']);
const different = select([row('es', 10), row('fr', 8, { geography: 'Francia' })]);
assert.match(different.selected[0].finding, /España.*10.*Francia.*8/);
assert.match(different.selected[0].limitation, /ámbitos distintos/);

for (const text of ['Sánchez es un dictador', 'Pedro Sánchez actúa como dictador', 'España es una dictadura', 'El Gobierno de España gobierna como un dictador']) {
  assert.ok(spanishInstitutionalScope(text), `Lost institutional paraphrase: ${text}`);
  const result = deterministicApiFallback({ text });
  assert.equal(result.result.evidenceLevel, 'limited');
  assert.match(JSON.stringify(result.result), /cumplimiento|práctica/);
}
for (const text of ['Franco fue un dictador', 'Maduro es un dictador', 'España era una dictadura en 1940', 'Venezuela es una dictadura', 'Mi jefe actúa como dictador', 'Sánchez dice que Maduro es un dictador']) {
  assert.equal(spanishInstitutionalScope(text), undefined, `Cross-routed subject or period: ${text}`);
  assert.ok(!deterministicApiFallback({ text }).result?.sourceIds?.includes('fallback-constitution'), `Current Spanish institutions used as foreign/historical proof: ${text}`);
}
const attempted = [];
const report = await refreshBatch([{ sourceId: 'broken', url: 'https://example.org/broken' }, { sourceId: 'working', url: 'https://example.org/working' }], { ingest: async (job) => { attempted.push(job.sourceId); if (job.sourceId === 'broken') throw new Error('down'); } });
assert.deepEqual(attempted, ['broken', 'working']);
assert.equal(report.failed, 1);
assert.equal(report.succeeded, 1);
assert.equal(report.failures[0].sourceId, 'broken');
console.log('Truth boundaries passed: missing values, mixed freshness, explicit scope/source attribution, institutional paraphrases and negative neighbours, independent source refresh.');

for (const text of ['La tasa de paro juvenil no es la tasa de paro total en España.', 'El desempleo juvenil no equivale al paro general.', '¿Qué diferencia hay entre la tasa de empleo y la tasa de paro?']) {
  const plan = measurementMeaningPlan(text);
  assert.equal(plan?.evidenceLevel, 'limited');
  assert.equal(plan.sourceIds.length, 2);
  assert.match(plan.summary, /Denominador/);
  assert.equal(broadDomainPacketsFor(text).length, 0, 'A definition must not inherit a general employment answer');
}
for (const text of ['El paro juvenil alcanza el 20 %.', 'El empleo ha aumentado este año.', 'Los contratos temporales han bajado.']) assert.equal(measurementMeaningPlan(text), undefined, 'A numeric/trend claim must use actual observations');
for (const value of [null, '', ':', 'n.d.']) assert.throws(() => parseDomainPayload('immigration_benefits', [{period: '2025', territorio: 'España', value}], {id: 'test'}), 'Missing domain values must not become measured zeros');
const housing = parsePublicHousingActionsText('CODAUTO;COMUNIDAD_AUTONOMA;PROVINCIA;TIPO_VIVIENDA;TIPO_TRAMITE;ESTADO;MES;AÑO;NUM_VIVIENDAS\n1;Andalucía;Jaén;Protegida;Calificación;Provisional;4;2009;2');
assert.equal(housing[0].geography, 'Jaén');
assert.equal(housing[0].period, '2009-04');
assert.equal(housing[0].value, 2);
assert.match(housing[0].category, /Provisional/);
assert.equal(parsePublicHousingActionsText('provincia;año;mes;num_viviendas\nJaén;2025;;2').length, 0, 'A missing month must not be invented as January');

const groupedHousing = parsePublicHousingActionsText('provincia;año;mes;num_viviendas\nJaén;2025;1;12.500');
assert.equal(groupedHousing[0].value, 12500, 'CSV parsing must preserve Spanish thousands separators until numeric interpretation');

const aligned = alignPropositionOutcomes([{text: 'A'}, {text: 'B'}, {text: 'C'}], [
  {status: 'fulfilled', value: {result: {evidenceIds: ['e-a'], sourceIds: ['s-a'], evidenceLevel: 'supported'}}},
  {status: 'rejected', reason: new Error('unavailable')},
  {status: 'fulfilled', value: {result: {evidenceIds: ['e-c'], sourceIds: ['s-c'], evidenceLevel: 'limited'}}},
]);
assert.deepEqual(aligned[0].evidenceIds, ['e-a']);
assert.equal(aligned[1].evidenceIds, undefined, 'Failed research must not inherit a different proposition’s evidence');
assert.deepEqual(aligned[2].sourceIds, ['s-c']);

const projection = evidenceSummaryForPublic(select([row('projection', 12, {dataKind: 'projected', periodType: 'projection', period: '2050'})]));
assert.equal(projection.families[0].dataKind, 'projected', 'Projection status must reach the public answer');
