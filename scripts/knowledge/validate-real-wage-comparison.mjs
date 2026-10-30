import assert from 'node:assert/strict';
import { realWagePlan } from '../../src/lib/knowledge/real-wage-comparison.mjs';
import { focusedEvidencePlan } from '../../src/lib/knowledge/focused-evidence-plan.mjs';
import { validateAnswerPlan } from './answer-plan-validation.mjs';
import { publicResolveResponse } from '../../src/lib/knowledge/public-response.mjs';

const now = Date.parse('2026-10-30T20:00:00Z');
const wageSource = { id: 'wages', title: 'Índice anual salarial · Eurostat', publisher: 'Eurostat', url: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/lc_lci_r2_a?geo=ES', retrievedAt: '2026-10-30T18:00:00Z' };
const priceSource = { id: 'prices', title: 'Índice anual de precios · Eurostat', publisher: 'Eurostat', url: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_ainr?geo=ES', retrievedAt: '2026-10-30T18:00:00Z' };
const data = [
  [2018, 94.1, 81.69], [2019, 96.3, 82.33], [2020, 100, 82.05], [2021, 100.3, 84.52],
  [2022, 103.4, 91.55], [2023, 108.5, 94.66], [2024, 112.9, 97.38], [2025, 116.3, 100],
];
const observations = data.flatMap(([year, wage, price]) => [
  { id: `wage-${year}`, metricId: 'annual_hourly_wage_index', value: wage, period: String(year), unit: 'Index, 2020=100', freshness: 'fresh', dimensions: { freq: 'A', geo: 'ES', unit: 'I20', nace_r2: 'B-S', lcstruct: 'D11', time: String(year) }, source: wageSource },
  { id: `price-${year}`, metricId: 'annual_hicp_index', value: price, period: String(year), unit: 'Annual average index', freshness: 'fresh', dimensions: { freq: 'A', geo: 'ES', unit: 'INX_A_AVG', coicop18: 'TOTAL', time: String(year) }, source: priceSource },
]);
const options = { observations, now };
for (const claim of ['Los salarios pierden poder adquisitivo frente al coste de la vida', 'Los sueldos no siguen el ritmo de los precios', 'La inflación se come la nómina', 'El salario real ha bajado', 'Los salarios no compensan la inflación']) {
  const plan = focusedEvidencePlan(claim, options);
  assert.equal(plan?.answerScope?.family, 'real-wages', claim);
  assert.equal(plan.evidenceLevel, 'limited');
  assert.match(plan.shareableReply, /En España/);
  assert.match(plan.shareableReply, /2020 y 2025/);
  assert.match(plan.shareableReply, /subió aproximadamente un 16,3 %/);
  assert.match(plan.shareableReply, /índice armonizado de precios de consumo subió aproximadamente un 21,9 %/);
  assert.match(plan.shareableReply, /índice salarial bajó aproximadamente un 4,6 %/);
  assert.match(plan.shareableReply, /2022 y 2025.*subió aproximadamente un 3 %/);
  assert.match(plan.shareableReply, /No es el sueldo neto o mediano/);
  assert.match(plan.shareableReply, /no mide el coste de vida de cada hogar/);
  assert.match(plan.shareableReply, /no demuestra que haya ocurrido lo mismo cada año/);
  assert.deepEqual(new Set(plan.sourceIds), new Set(['wages', 'prices']));
  assert.ok(validateAnswerPlan(plan).ok, JSON.stringify(validateAnswerPlan(plan).errors));
  assert.ok(publicResolveResponse({ status: 'complete', requestId: 'test-real-wages', result: plan }));
}
const since = realWagePlan('Los salarios han perdido poder adquisitivo desde 2018', options);
assert.match(since.shareableReply, /2018 y 2025/);
assert.match(since.shareableReply, /índice salarial subió aproximadamente un 1 %/);
assert.doesNotMatch(since.shareableReply, /2022 y 2025/, 'An explicit comparison must not silently change the requested period');
const year = realWagePlan('En 2022 los salarios perdieron poder adquisitivo', options);
assert.match(year.shareableReply, /2021 y 2022/);
const recentTwo = realWagePlan('Los salarios pierden poder adquisitivo en los últimos dos años', options);
assert.match(recentTwo.shareableReply, /2023 y 2025/);
assert.equal(realWagePlan('Los salarios pierden poder adquisitivo durante diez años', options), undefined, 'A requested ten-year interval must not become a five-year comparison');
const later = Date.parse('2027-10-30T20:00:00Z');
const oldPeriods = observations.map((item) => ({ ...item, source: { ...item.source, retrievedAt: '2027-10-30T18:00:00Z' } }));
assert.equal(realWagePlan('Los salarios pierden poder adquisitivo en los últimos dos años', { observations: oldPeriods, now: later }), undefined, 'A lagging series must not masquerade as the latest two years');
assert.ok(realWagePlan('Los salarios han perdido poder adquisitivo entre 2018 y 2025', { observations: oldPeriods, now: later }), 'Explicit historical periods remain usable when their sources are current');
const reversed = realWagePlan('Los salarios no han perdido poder adquisitivo desde 2018', options);
assert.match(reversed.shareableReply, /2018 y 2025/);
assert.equal(reversed.blocks[0].items[0].verdict, 'insufficient', 'A calculated index must not assert an unverified verdict');

for (const claim of [
  'Las mujeres han perdido poder adquisitivo con sus salarios',
  'Los salarios de las trabajadoras han perdido poder adquisitivo',
  'Los salarios a tiempo parcial han perdido poder adquisitivo',
  'Los salarios bajos han perdido poder adquisitivo frente a la inflación',
  'Los salarios de los médicos han perdido poder adquisitivo',
  'Mi sueldo ha perdido poder adquisitivo frente a la inflación',
  'El salario mínimo ha perdido poder adquisitivo por los precios',
  'Los salarios mínimos han perdido poder adquisitivo frente a la inflación',
  'Los salarios públicos han perdido poder adquisitivo por la inflación',
  'El salario neto ha perdido poder adquisitivo con la inflación',
  'El sueldo por trabajador ha perdido poder adquisitivo frente a los precios',
  'El salario medio mensual ha perdido poder adquisitivo frente a los precios',
  'El mismo puesto ha perdido poder adquisitivo en sus salarios',
  'Los salarios en Madrid pierden poder adquisitivo frente a los precios',
  'Los salarios en Zaragoza pierden poder adquisitivo frente a los precios',
  'Los salarios en Francia pierden poder adquisitivo frente a los precios',
  'Los salarios españoles pierden poder adquisitivo frente a Europa',
  'Los salarios han perdido poder adquisitivo desde que empezó la pandemia',
  'Los salarios han perdido poder adquisitivo desde 2001',
  'Los salarios han perdido poder adquisitivo en 2026',
]) assert.equal(realWagePlan(claim, options), undefined, `Incompatible scope or missing period was treated as a national comparison: ${claim}`);

const without = (predicate) => observations.filter((item) => !predicate(item));
for (const rows of [
  without((item) => item.id === 'price-2023'),
  observations.map((item) => item.id === 'wage-2022' ? { ...item, status: 'b' } : item),
  observations.map((item) => item.id === 'wage-2022' ? { ...item, status: 'u' } : item),
  observations.map((item) => item.metricId === 'annual_hourly_wage_index' ? { ...item, freshness: 'stale' } : item),
  observations.map((item) => item.id === 'price-2025' ? { ...item, value: 0 } : item),
  observations.map((item) => item.metricId === 'annual_hicp_index' ? { ...item, dimensions: { ...item.dimensions, geo: 'FR' } } : item),
  observations.map((item) => item.metricId === 'annual_hourly_wage_index' ? { ...item, dimensions: { ...item.dimensions, lcstruct: 'D1_D4_MD5' } } : item),
]) assert.equal(realWagePlan('Los salarios pierden poder adquisitivo frente al coste de la vida', { observations: rows, now }), undefined, 'A missing, broken, stale or incompatible series must not produce a numeric answer');
const provisional = realWagePlan('Los salarios pierden poder adquisitivo frente al coste de la vida', { observations: observations.map((item) => item.id === 'wage-2025' ? { ...item, status: 'p' } : item), now });
assert.match(provisional.shareableReply, /datos provisionales/);
const twoFlags = realWagePlan('Los salarios pierden poder adquisitivo frente al coste de la vida', { observations: observations.map((item) => item.id === 'wage-2025' ? { ...item, status: 'p' } : item.id === 'price-2024' ? { ...item, status: 'e' } : item), now });
assert.match(twoFlags.shareableReply, /datos provisionales/);
assert.match(twoFlags.shareableReply, /datos estimados/);
const newerIncomplete = [...observations, { ...observations.find((item) => item.id === 'wage-2025'), id: 'new-wage-2025', source: { ...wageSource, id: 'new-wage-source', retrievedAt: '2026-10-30T19:00:00Z' } }];
assert.equal(realWagePlan('Los salarios pierden poder adquisitivo frente al coste de la vida', { observations: newerIncomplete, now }), undefined, 'Different source revisions must not be combined');
console.log('Real-wage comparison passed: aligned annual data, periods, source versions, flags, populations and negative neighbours.');
