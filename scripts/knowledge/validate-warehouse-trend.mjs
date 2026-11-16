import { compatibleTrendSeries, requestsLatestObservation, summarizeWarehouseLatest, summarizeWarehouseTrend } from './warehouse-trend.mjs';
import assert from 'node:assert/strict';

const source = { id: 'eurostat', title: 'Población de España', url: 'https://ec.europa.eu/eurostat/' };
const records = [
  { id: 'total-2015', datasetId: 'Population', value: 46, unit: 'million', period: '2015', dimensions: { age: 'TOTAL', sex: 'T', geo: 'ES' }, source },
  { id: 'female-2015', datasetId: 'Population', value: 24, unit: 'million', period: '2015', dimensions: { age: 'TOTAL', sex: 'F', geo: 'ES' }, source },
  { id: 'total-2020', datasetId: 'Population', value: 47, unit: 'million', period: '2020', dimensions: { age: 'TOTAL', sex: 'T', geo: 'ES' }, source },
  { id: 'female-2020', datasetId: 'Population', value: 25, unit: 'million', period: '2020', dimensions: { age: 'TOTAL', sex: 'F', geo: 'ES' }, source },
  { id: 'total-2025', datasetId: 'Population', value: 49, unit: 'million', period: '2025', dimensions: { age: 'TOTAL', sex: 'T', geo: 'ES' }, source },
];
const compatible = compatibleTrendSeries(records);
if (compatible.map((item) => item.id).join(',') !== 'total-2015,total-2020,total-2025') throw new Error('Trend handler mixed incompatible dimensions');
const rising = summarizeWarehouseTrend('España tiene más población que hace diez años', records);
if (!rising || !rising.points.some((point) => point.includes('coincide'))) throw new Error('Trend handler did not recognize a matching direction');
const falling = summarizeWarehouseTrend('España tiene más población que hace diez años', records.map((item) => ({ ...item, value: 100 - item.value })));
if (!falling || !falling.points.some((point) => point.includes('no coincide'))) throw new Error('Trend handler did not flag a contradictory direction');
const minimumWageRecords = [
  { id: 'smi-2015-s1', datasetId: 'earn_mw_cur', metricId: 'minimum_wage_monthly', value: 757, unit: 'Euro', period: '2015-S1', dimensions: { currency: 'EUR', geo: 'ES', freq: 'S' }, source },
  { id: 'smi-2026-s1', datasetId: 'earn_mw_cur', metricId: 'minimum_wage_monthly', value: 1425, unit: 'Euro', period: '2026-S1', dimensions: { currency: 'EUR', geo: 'ES', freq: 'S' }, source },
];
const minimumWage = summarizeWarehouseTrend('¿Ha subido el salario mínimo en España?', minimumWageRecords);
if (!minimumWage || !minimumWage.headline.includes('primer semestre de 2015') || !minimumWage.headline.includes('primer semestre de 2026') || !minimumWage.points.some((point) => point.includes('€ al mes')) || !minimumWage.reply.includes('no demuestra la causa')) throw new Error('Trend handler did not keep minimum wage distinct, readable, and caveated');
const socialProtectionRecords = [
  { id: 'social-2015', datasetId: 'spr_exp_func', metricId: 'social_protection_benefits_per_capita', value: 5630.92, unit: 'Euro per inhabitant', period: '2015', dimensions: { geo: 'ES', spdeps: 'SPR', spfunc: 'TOTAL', unit: 'EUR_HAB' }, source },
  { id: 'social-2024', datasetId: 'spr_exp_func', metricId: 'social_protection_benefits_per_capita', value: 8221.52, unit: 'Euro per inhabitant', period: '2024', dimensions: { geo: 'ES', spdeps: 'SPR', spfunc: 'TOTAL', unit: 'EUR_HAB' }, source },
];
const socialProtection = summarizeWarehouseTrend('¿Cuánto gasta España en prestaciones de protección social por habitante?', socialProtectionRecords);
if (!socialProtection || !socialProtection.headline.includes('2015') || !socialProtection.headline.includes('2024') || !socialProtection.points.some((point) => point.includes('€ por habitante')) || !socialProtection.reply.includes('no demuestra la causa')) throw new Error('Trend handler did not keep social protection benefits distinct, readable, and caveated');
const oldAgeSurvivorsRecords = [
  { id: 'pensions-2015', datasetId: 'spr_exp_func', metricId: 'old_age_survivors_benefits_per_capita', value: 2803.07, unit: 'Euro per inhabitant', period: '2015', dimensions: { geo: 'ES', spdeps: 'SPR', spfunc: 'OLD_SRV', unit: 'EUR_HAB' }, source },
  { id: 'pensions-2024', datasetId: 'spr_exp_func', metricId: 'old_age_survivors_benefits_per_capita', value: 4194.66, unit: 'Euro per inhabitant', period: '2024', dimensions: { geo: 'ES', spdeps: 'SPR', spfunc: 'OLD_SRV', unit: 'EUR_HAB' }, source },
];
const oldAgeSurvivors = summarizeWarehouseTrend('¿Cuánto gasta España en pensiones y prestaciones de supervivencia por habitante?', oldAgeSurvivorsRecords);
if (!oldAgeSurvivors || !oldAgeSurvivors.headline.includes('2015') || !oldAgeSurvivors.headline.includes('2024') || !oldAgeSurvivors.points.some((point) => point.includes('€ por habitante')) || !/no equivale a la pensión media/i.test(oldAgeSurvivors.reply)) throw new Error('Trend handler did not keep old-age benefits distinct, readable, and caveated');
const prices = (unit, code = '') => [2015, 2020, 2025].map((year, index) => ({ id: `${unit}-${year}`, metricId: 'rental_price_index', datasetId: 'rents', value: [100, 110, 120][index], unit, period: String(year), dimensions: { unit: code, geo: 'ES' }, source }));
for (const [unit, label] of [['Index, 1996=100', 'índice (1996=100)'], ['Index, 2025=100', 'índice (2025=100)'], ['Index', 'índice']]) {
  const result = summarizeWarehouseTrend('¿Cómo ha evolucionado el índice de alquiler desde 2015?', prices(unit));
  assert.match(result.reply, new RegExp(label.replace(/[()]/g, '\\$&')));
  if (unit !== 'Index, 2015=100') assert.doesNotMatch(result.reply, /2015=100/);
}
const rate = prices('Annual rate of change', 'RCH_A');
const levelQuery = summarizeWarehouseTrend('¿Han subido los alquileres desde 2015?', rate);
assert.equal(levelQuery.comparisonBlocked, true);
assert.match(levelQuery.reply, /tasas de variación/);
const rateQuery = summarizeWarehouseTrend('¿Cómo ha cambiado la tasa interanual del alquiler desde 2015?', rate);
assert.match(rateQuery.reply, /% interanual/);
assert.match(rateQuery.reply, /no implica que hayan bajado/);
const missingYear = summarizeWarehouseTrend('¿Qué ocurrió con los alquileres desde 2012?', prices('Index, 1996=100'));
assert.equal(missingYear.comparisonBlocked, true);
assert.match(missingYear.reply, /no incluye 2012/);
const limitedRange = summarizeWarehouseTrend('Compara los alquileres entre 2015 y 2020', prices('Index, 1996=100'));
assert.match(limitedRange.reply, /2020/);
assert.doesNotMatch(limitedRange.reply, /2025/);
for (const status of ['b', 'd', 'u', 'z']) {
  const rows = prices('Index, 1996=100').map((item, index) => index === 1 ? { ...item, status } : item);
  const result = summarizeWarehouseTrend('¿Han subido los alquileres desde 2015?', rows);
  assert.equal(result.comparisonBlocked, true, `Flag ${status} must block an unverified comparison`);
  assert.doesNotMatch(result.reply, /pasó de|coincide/);
}
const missingBreakCell = prices('Index, 1996=100').map((item, index) => index === 1 ? { ...item, value: null, status: 'b' } : item);
assert.match(summarizeWarehouseTrend('¿Cómo cambió el alquiler desde 2015?', missingBreakCell).reply, /ruptura de serie en 2020/);
const baselineBreak = prices('Index, 1996=100').map((item, index) => index === 0 ? { ...item, status: 'b' } : item);
assert.equal(summarizeWarehouseTrend('¿Cómo cambió el alquiler desde 2015?', baselineBreak).comparisonBlocked, undefined);
const provisional = prices('Index, 1996=100').map((item, index) => index === 2 ? { ...item, status: 'pe' } : item);
assert.match(summarizeWarehouseTrend('¿Cómo cambió el alquiler desde 2015?', provisional).reply, /provisional.*estimado/);
const older = prices('Index, 1996=100').map((item) => ({ ...item, id: `old-${item.id}`, source: { ...source, id: 'old', retrievedAt: '2025-01-01T00:00:00Z' } }));
const revised = prices('Index, 1996=100').slice(1).map((item) => ({ ...item, value: item.value + 10, id: `new-${item.id}`, source: { ...source, id: 'new', retrievedAt: '2026-01-01T00:00:00Z' } }));
const revisionResult = summarizeWarehouseTrend('¿Cómo cambió el alquiler desde 2015?', [...older, ...revised]);
assert.equal(revisionResult.comparisonBlocked, true, 'An older, longer source revision must not supply a missing requested year');
assert.ok(revisionResult.observations.every((item) => item.source.id === 'new'));

for (const query of [
  '¿Cuál es la inflación armonizada actual de España?',
  '¿Qué tasa anual de inflación registra España ahora?',
  '¿Cuál es el último dato de inflación en España?',
]) assert.equal(requestsLatestObservation(query), true, `Single-value paraphrase was not recognized: ${query}`);
for (const query of [
  '¿Cómo ha cambiado la inflación desde 2015?',
  '¿Cómo ha evolucionado el alquiler en España?',
  '¿Cuánto gastó España en pensiones durante 2024?',
]) assert.equal(requestsLatestObservation(query), false, `Historical or comparative wording was routed to one value: ${query}`);

const inflationSource = { id: 'inflation-current', title: 'Inflación armonizada · Eurostat', publisher: 'Eurostat', url: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_minr?geo=ES&coicop18=TOTAL&unit=RCH_A', retrievedAt: '2026-11-15T10:00:00Z' };
const inflationRows = [
  { id: 'inflation-2026-08', metricId: 'inflation_rate', metric: 'HICP annual rate', value: 3.1, unit: 'Annual rate of change', period: '2026-08', dimensions: { geo: 'ES', coicop18: 'TOTAL', unit: 'RCH_A' }, source: inflationSource },
  { id: 'inflation-2026-10', metricId: 'inflation_rate', metric: 'HICP annual rate', value: 3.4, unit: 'Annual rate of change', period: '2026-10', dimensions: { geo: 'ES', coicop18: 'TOTAL', unit: 'RCH_A' }, source: inflationSource },
];
const inflationArchiveSource = { ...inflationSource, id: 'inflation-archive', url: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_manr?geo=ES', retrievedAt: '2026-10-01T10:00:00Z' };
const inflationArchive = Array.from({ length: 12 }, (_, index) => ({
  ...inflationRows[0], id: `inflation-archive-${index}`, value: 2 + index / 10,
  period: `2025-${String(index + 1).padStart(2, '0')}`, source: inflationArchiveSource,
}));
for (const query of ['¿Cuál es la inflación armonizada actual de España?', '¿Qué tasa anual de inflación registra España ahora?']) {
  const latest = summarizeWarehouseLatest(query, [...inflationArchive, ...inflationRows], ['inflation_rate']);
  assert.equal(latest.observations[0].id, 'inflation-2026-10', 'The latest observation must win even when a retired archive has a longer history');
  assert.match(latest.reply, /3,4 % interanual \(2026-10\)/);
  assert.match(latest.reply, /variaci[oó]n frente al mismo periodo del a[nñ]o anterior/i);
  assert.match(latest.reply, /Eurostat/);
  assert.doesNotMatch(latest.reply, /cu[ií]a fiscal|pensiones|IRPF/);
  assert.deepEqual(latest.replyEvidenceIds, ['inflation-2026-10']);
}
const unrelatedMetric = summarizeWarehouseLatest('¿Cuál es la inflación armonizada actual de España?', inflationRows, ['cpi_index']);
assert.equal(unrelatedMetric, null, 'A candidate from another metric family must not be substituted for the requested inflation rate');
const staleLatest = summarizeWarehouseLatest('¿Cuál es la inflación actual?', inflationRows.map((item) => ({ ...item, freshness: 'stale' })), ['inflation_rate']);
assert.match(staleLatest.reply, /fuente necesita una actualización/i);
const flaggedLatest = summarizeWarehouseLatest('¿Cuál es la inflación actual?', inflationRows.map((item) => item.id.endsWith('10') ? { ...item, status: 'p' } : item), ['inflation_rate']);
assert.match(flaggedLatest.reply, /provisional/i);
const countrySource = { id: 'unemployment-country-feed', title: 'Tasa de desempleo · Eurostat', publisher: 'Eurostat', url: 'https://ec.europa.eu/eurostat/fixture' };
const unemploymentCountries = [
  { id: 'unemployment-de', metricId: 'unemployment_rate', metric: 'Unemployment', value: 4.2, unit: 'Percentage', period: '2026-10', dimensions: { geo: 'DE' }, dimensionLabels: { geo: 'Germany' }, source: countrySource },
  { id: 'unemployment-es', metricId: 'unemployment_rate', metric: 'Unemployment', value: 10.8, unit: 'Percentage', period: '2026-09', dimensions: { geo: 'ES' }, dimensionLabels: { geo: 'Spain' }, source: countrySource },
];
const spanishUnemployment = summarizeWarehouseLatest('¿Cuál es la tasa de paro actual en España?', unemploymentCountries, ['unemployment_rate']);
assert.equal(spanishUnemployment.observations[0].id, 'unemployment-es', 'An explicitly named territory must win over a newer observation from another country');
assert.equal(summarizeWarehouseLatest('¿Cuál es la tasa de paro actual en España y Alemania?', unemploymentCountries, ['unemployment_rate']), null, 'A one-value answer must not choose arbitrarily between multiple requested territories');
const rentRateLatest = summarizeWarehouseLatest('¿Cuál es el precio del alquiler ahora?', rate, ['rental_price_index']);
assert.equal(rentRateLatest.comparisonBlocked, true, 'A rate must not be presented as a rent price index');
assert.match(rentRateLatest.reply, /no el nivel del precio solicitado/i);
console.log('Warehouse trend validation passed: compatible dimensions are isolated.');
