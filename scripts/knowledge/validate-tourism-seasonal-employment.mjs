import assert from 'node:assert/strict';
import { claimFocusFor, focusedMetricIdsFor } from '../../src/lib/knowledge/claim-focus.mjs';
import { focusedEvidencePlan } from '../../src/lib/knowledge/focused-evidence-plan.mjs';
import { localPublicCheckResponse } from '../lib/local-public-check-response.mjs';
import { validateAnswerPlan } from './answer-plan-validation.mjs';

const now = Date.parse('2026-11-26T10:00:00Z');
const RELEASE = '2026-09-11T11:00:00+0200';
const specs = {
  lfs_employed_persons_hospitality_quarterly: { nace: 'I', label: 'accommodation and food services' },
  lfs_employed_persons_total_quarterly: { nace: 'TOTAL', label: 'total employed persons' },
};
const sourceFor = (metricId, index, overrides = {}) => ({
  id: 'fixture-' + metricId,
  title: 'Fixture: ' + specs[metricId].label,
  publisher: 'Eurostat',
  url: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/lfsq_egan2?geo=ES',
  retrievedAt: new Date(now - 60000 + index * 1000).toISOString(),
  dataUpdatedAt: RELEASE,
  role: 'primary',
  ...overrides,
});
const years = {
  2019: {
    lfs_employed_persons_hospitality_quarterly: [1579.1, 1700, 1770, 1698.6],
    lfs_employed_persons_total_quarterly: [19000, 19200, 19300, 19400],
  },
  2021: {
    lfs_employed_persons_hospitality_quarterly: [1450, 1600, 1700, 1550],
    lfs_employed_persons_total_quarterly: [20000, 20500, 21000, 20800],
  },
  2024: {
    lfs_employed_persons_hospitality_quarterly: [1716.3, 1905, 1941.2, 1842.7],
    lfs_employed_persons_total_quarterly: [21100, 21500, 21800, 22000],
  },
  2025: {
    lfs_employed_persons_hospitality_quarterly: [1699.8, 1880.5, 1910.8, 1818.4],
    lfs_employed_persons_total_quarterly: [21746.4, 22252.7, 22369, 22443.2],
  },
};
const fixture = Object.entries(specs).flatMap(([metricId, spec], sourceIndex) => {
  const source = sourceFor(metricId, sourceIndex);
  return Object.entries(years).flatMap(([year, series]) => series[metricId].map((value, quarter) => ({
    id: metricId + '-' + year + '-Q' + (quarter + 1),
    kind: 'observation',
    metricId,
    period: year + '-Q' + (quarter + 1),
    value,
    unit: 'THS_PER',
    status: Number(year) === 2025 ? 'd' : Number(year) === 2021 && quarter === 0 ? 'bd' : undefined,
    source,
    dimensions: { freq: 'Q', unit: 'THS_PER', sex: 'T', age: 'Y15-74', nace_r2: spec.nace, geo: 'ES', time: year + '-Q' + (quarter + 1) },
  })));
});

const mainClaim = 'La estacionalidad turística obliga a muchos trabajadores a encadenar periodos de empleo e inactividad.';
const paraphrases = [
  mainClaim,
  'La actividad turística hace que la ocupación de hoteles y restaurantes suba en verano y baje en invierno.',
  'En hostelería cambia el número de personas ocupadas según la temporada.',
  '¿Cuánto varía la ocupación en alojamiento y servicios de comida entre los trimestres del año?',
];
assert.deepEqual([...focusedMetricIdsFor(mainClaim)].sort(), Object.keys(specs).sort(), 'The family must retrieve both the sector and total-employment series from its evidence shard.');
const plans = paraphrases.map((claim) => {
  assert.equal(claimFocusFor(claim)?.id, 'tourism-seasonal-employment', claim);
  return focusedEvidencePlan(claim, { observations: fixture, now });
});
assert.ok(plans.every((plan) => plan?.id === 'measurement-tourism-seasonal-employment'));
assert.equal(new Set(plans.map((plan) => plan.headline)).size, 1, 'Paraphrases should use the same period and evidence.');
assert.deepEqual(plans[0].evidenceIds, plans[1].evidenceIds);
assert.deepEqual(plans[0].sourceIds, plans[1].sourceIds);

const mainPlan = plans[0];
const mainItem = mainPlan.blocks.find((block) => block.type === 'claim_breakdown').items[0];
assert.equal(mainPlan.claimType, 'causal');
assert.equal(mainItem.verdict, 'insufficient', 'Aggregate employment counts cannot establish individual transitions or causality.');
assert.deepEqual(mainItem.evidenceIds, [], 'Quarterly totals are context, not direct proof of individual employment spells.');
assert.equal(mainItem.contextSourceIds.length, 2);
assert.match(mainPlan.shareableReply, /1,70 millones de personas/);
assert.match(mainPlan.shareableReply, /1,91 millones de personas/);
assert.match(mainPlan.shareableReply, /12,4\s*%/);
assert.match(mainPlan.shareableReply, /2,9\s*%/);
assert.match(mainPlan.shareableReply, /7,8\s*%.*8,5\s*%/);
assert.match(mainPlan.shareableReply, /Eurostat marca España con «d»/);
assert.match(mainPlan.limitation, /ni prueban que el turismo cause la variación/i);
assert.match(mainPlan.limitation, /Un año no confirma un patrón que se repita/i);
assert.match(mainPlan.limitation, /no mide puestos ni contratos/i);
assert.ok(validateAnswerPlan(mainPlan, { provisional: true }).ok, JSON.stringify(validateAnswerPlan(mainPlan, { provisional: true }).errors));

const publicResponse = localPublicCheckResponse({ status: 'complete', requestId: 'tourism-seasonality', result: mainPlan }, mainClaim);
assert.equal(publicResponse.state, 'limited', 'Reviewed sector context is useful while the compound claim verdict remains insufficient.');
assert.equal(publicResponse.result.arguments?.[0]?.verdict, 'insufficient');
assert.equal(publicResponse.result.sources.length, 2);

const explicitYear = focusedEvidencePlan('¿Cómo varió la ocupación en hostelería según la temporada en 2024?', { observations: fixture, now });
assert.equal(explicitYear.id, 'measurement-tourism-seasonal-employment');
assert.match(explicitYear.shareableReply, /En 2024/);
assert.equal(explicitYear.blocks.find((block) => block.type === 'claim_breakdown').items[0].verdict, 'insufficient');

for (const claim of [
  'La ocupación turística estacional viene aumentando desde 2019.',
  'La ocupación de hostelería fluctuó por temporadas en 2021.',
  'La ocupación hotelera fluctuó por temporadas en 2018.',
  'La ocupación en hostelería fluctuó por temporadas en 2026.',
  'La ocupación turística fluctuará por temporadas en 2029.',
]) {
  const gap = focusedEvidencePlan(claim, { observations: fixture, now });
  assert.ok(gap, claim);
  assert.equal(gap.id, 'measurement-tourism-seasonal-employment-gap', claim);
  assert.doesNotMatch(gap.shareableReply, /\d+[,.]\d+\s*%/, claim);
}
const regional = focusedEvidencePlan('La ocupación hotelera fluctúa según la temporada en Canarias.', { observations: fixture, now });
assert.equal(regional.id, 'measurement-tourism-seasonal-employment-gap');
assert.match(regional.shareableReply, /territorio solicitado/);

const noReleaseDate = fixture.map((row) => row.metricId === 'lfs_employed_persons_hospitality_quarterly'
  ? { ...row, source: { ...row.source, dataUpdatedAt: undefined } } : row);
assert.equal(focusedEvidencePlan(mainClaim, { observations: noReleaseDate, now }).id, 'measurement-tourism-seasonal-employment-gap');
const mismatchedRefresh = fixture.map((row) => row.metricId === 'lfs_employed_persons_total_quarterly'
  ? { ...row, source: { ...row.source, retrievedAt: new Date(now - 8 * 86400000).toISOString() } } : row);
assert.equal(focusedEvidencePlan(mainClaim, { observations: mismatchedRefresh, now }).id, 'measurement-tourism-seasonal-employment-gap');
const stale = fixture.map((row) => ({ ...row, source: { ...row.source, retrievedAt: new Date(now - 15 * 86400000).toISOString() } }));
assert.equal(focusedEvidencePlan(mainClaim, { observations: stale, now }).id, 'measurement-tourism-seasonal-employment-gap');
const breakInYear = fixture.map((row) => row.metricId === 'lfs_employed_persons_hospitality_quarterly' && row.period === '2025-Q1'
  ? { ...row, status: 'bd' } : row);
assert.equal(focusedEvidencePlan('La ocupación hotelera fluctúa según la temporada en 2025.', { observations: breakInYear, now }).id,
  'measurement-tourism-seasonal-employment-gap');

const neighboringClaims = [
  ['¿Cuántas vacantes hay para camareros y bármanes en España?', 'waiter-vacancy-and-conditions'],
  ['España depende demasiado del turismo para crear empleo.', 'tourism-employment-contribution'],
  ['Los salarios de hostelería son bajos frente a otros sectores.', 'sector-wage-comparison'],
  ['Los contratos fijos-discontinuos alternan periodos de actividad e inactividad.', 'fixed-discontinuous-employment-status'],
  ['El turismo eleva el precio del alquiler para residentes.', 'tourism-urban-housing-cost'],
];
for (const [claim, expected] of neighboringClaims) assert.equal(claimFocusFor(claim)?.id, expected, claim);

console.log('Tourism seasonal employment validated: paraphrases, same-year quarter comparison, individual-transition limits, data flags, scope, freshness, public state, and neighboring claims.');
