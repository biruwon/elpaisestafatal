import assert from 'node:assert/strict';
import { claimFocusFor, focusedMetricIdsFor } from '../../src/lib/knowledge/claim-focus.mjs';
import { focusedEvidencePlan } from '../../src/lib/knowledge/focused-evidence-plan.mjs';
import { localPublicCheckResponse } from '../lib/local-public-check-response.mjs';
import { validateAnswerPlan } from './answer-plan-validation.mjs';

const now = Date.parse('2026-11-26T10:00:00Z');
const METRICS = {
  gva_chain_volume_by_activity: { unit: 'CLV20_MEUR', na_item: 'B1G', dataset: 'nama_10_a10', date: '2026-11-24T23:00:00+0100' },
  employment_hours_by_activity: { unit: 'THS_HW', na_item: 'EMP_DC', dataset: 'nama_10_a10_e', date: '2026-10-21T23:00:00+0200' },
  employment_jobs_by_activity: { unit: 'THS_JOB', na_item: 'EMP_DC', dataset: 'nama_10_a10_e', date: '2026-10-21T23:00:00+0200' },
};
const ACTIVITIES = ['A', 'B-E', 'F', 'G-I', 'J', 'K', 'L', 'M_N', 'O-Q', 'R-U'];
const belowCodes = new Set(['A', 'B-E', 'F', 'G-I']);
const sourceFor = (metricId, spec, index, overrides = {}) => ({
  id: `fixture-${metricId}`,
  title: `Fixture: ${metricId}`,
  publisher: 'Eurostat',
  url: `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/${spec.dataset}?freq=A&geo=ES&na_item=${spec.na_item}&unit=${spec.unit}&sinceTimePeriod=2015`,
  retrievedAt: new Date(now - 60000 + index * 1000).toISOString(),
  dataUpdatedAt: spec.date,
  role: 'primary',
  ...overrides,
});
const observationsFor = () => Object.entries(METRICS).flatMap(([metricId, spec], metricIndex) => {
  const source = sourceFor(metricId, spec, metricIndex);
  return [2019, 2024, 2025].flatMap((year) => {
    const belowJobs = year === 2019 ? 1500 : year === 2024 ? 1625 : 1750;
    const aboveJobs = (10000 - belowJobs * belowCodes.size) / (ACTIVITIES.length - belowCodes.size);
    const codes = ['TOTAL', ...ACTIVITIES, 'C'];
    return codes.map((activity) => {
      const total = activity === 'TOTAL';
      const nestedManufacturing = activity === 'C';
      const below = belowCodes.has(activity) || nestedManufacturing;
      const hours = total ? 100000 : 10000;
      const valuePerHour = total ? 50 : nestedManufacturing ? 20 : below ? 40 : 60;
      const jobs = total ? 10000 : nestedManufacturing ? (year === 2019 ? 700 : year === 2024 ? 750 : 800)
        : belowCodes.has(activity) ? belowJobs : aboveJobs;
      const value = metricId === 'gva_chain_volume_by_activity' ? hours * valuePerHour / 1000
        : metricId === 'employment_hours_by_activity' ? hours : jobs;
      return {
        id: `${metricId}-${year}-${activity}`,
        kind: 'observation',
        metricId,
        period: String(year),
        value,
        unit: spec.unit,
        status: year === 2025 ? 'p' : undefined,
        source,
        dimensions: { freq: 'A', unit: spec.unit, nace_r2: activity, na_item: spec.na_item, geo: 'ES', time: String(year) },
      };
    });
  });
});
const fixture = observationsFor();
const mainClaim = 'España depende demasiado de empleos de poco valor añadido.';
const expectedMetrics = Object.keys(METRICS);

const paraphrases = [
  mainClaim,
  'España se apoya excesivamente en puestos con poco valor agregado.',
  'El país tiene demasiada ocupación en sectores de baja productividad.',
  '¿Qué parte de los puestos está en actividades con menor valor añadido por hora?',
];
const plans = paraphrases.map((claim) => {
  assert.equal(claimFocusFor(claim)?.id, 'employment-value-added-by-activity', claim);
  assert.deepEqual([...focusedMetricIdsFor(claim)], expectedMetrics, claim);
  return focusedEvidencePlan(claim, { observations: fixture, now });
});
assert.ok(plans.every((plan) => plan?.id === 'measurement-employment-value-added-by-activity'));
assert.equal(new Set(plans.map((plan) => plan.headline)).size, 1, 'Paraphrases should use the same evidence and derived answer.');

const mainPlan = plans[0];
const mainItem = mainPlan.blocks.find((block) => block.type === 'claim_breakdown').items[0];
assert.equal(mainPlan.claimType, 'normative');
assert.equal(mainItem.verdict, 'insufficient', 'A contextual share cannot decide whether the mix is excessive.');
assert.deepEqual(mainItem.evidenceIds, [], 'Sector averages must not be treated as direct proof of the normative claim.');
assert.deepEqual(mainItem.sourceIds, []);
assert.equal(mainItem.contextSourceIds.length, 3);
assert.match(mainPlan.shareableReply, /34,5|50,0/);
assert.match(mainPlan.shareableReply, /70,0\s*%/);
assert.match(mainPlan.shareableReply, /Eurostat marca como provisionales los datos de 2025/i);
assert.match(mainPlan.shareableReply, /21 de octubre de 2026.*24 de noviembre de 2026/i);
assert.match(mainPlan.limitation, /no mide cada puesto, salarios ni calidad del empleo/i);
assert.match(mainPlan.limitation, /alquileres imputados/i);
assert.ok(validateAnswerPlan(mainPlan, { provisional: true }).ok, JSON.stringify(validateAnswerPlan(mainPlan, { provisional: true }).errors));
const publicResponse = localPublicCheckResponse({ status: 'complete', requestId: 'sectoral-value-added', result: mainPlan }, mainClaim);
assert.equal(publicResponse.state, 'limited', 'The response may share reviewed context while the claim verdict stays insufficient.');
assert.equal(publicResponse.result.arguments?.[0]?.verdict, 'insufficient');
assert.equal(publicResponse.result.sources.length, 3, 'Every data source should remain attributable.');

const trend = focusedEvidencePlan('España depende cada vez más de empleos de bajo valor añadido desde 2019.', { observations: fixture, now });
assert.equal(trend.claimType, 'trend');
assert.match(trend.shareableReply, /Entre 2019 y 2025/);
assert.match(trend.shareableReply, /60,0\s*% al 70,0\s*%/);
assert.match(trend.shareableReply, /10,0 puntos porcentuales/);
assert.equal(trend.blocks.find((block) => block.type === 'claim_breakdown').items[0].verdict, 'insufficient');

const unavailableYear = focusedEvidencePlan('España depende demasiado de empleos de poco valor añadido en 2014.', { observations: fixture, now });
assert.equal(unavailableYear.id, 'measurement-employment-value-added-gap');
assert.doesNotMatch(unavailableYear.shareableReply, /\d+[,.]\d+\s*%/);
const futureYear = focusedEvidencePlan('España depende demasiado de empleos de poco valor añadido en 2028.', { observations: fixture, now });
assert.equal(futureYear.id, 'measurement-employment-value-added-gap');
assert.doesNotMatch(futureYear.shareableReply, /\d+[,.]\d+\s*%/);
const regional = focusedEvidencePlan('Cataluña tiene demasiados empleos de poco valor añadido.', { observations: fixture, now });
assert.equal(regional.id, 'measurement-employment-value-added-gap');
assert.match(regional.shareableReply, /territorio solicitado/);

const missingReleaseMetadata = fixture.map((row) => row.metricId === 'employment_jobs_by_activity'
  ? { ...row, source: { ...row.source, dataUpdatedAt: undefined } } : row);
assert.equal(focusedEvidencePlan(mainClaim, { observations: missingReleaseMetadata, now }).id, 'measurement-employment-value-added-gap');
const mismatchedRetrieval = fixture.map((row) => row.metricId === 'employment_jobs_by_activity'
  ? { ...row, source: { ...row.source, retrievedAt: new Date(now - 8 * 86400000).toISOString() } } : row);
assert.equal(focusedEvidencePlan(mainClaim, { observations: mismatchedRetrieval, now }).id, 'measurement-employment-value-added-gap');
const stale = fixture.map((row) => ({ ...row, source: { ...row.source, retrievedAt: new Date(now - 15 * 86400000).toISOString() } }));
assert.equal(focusedEvidencePlan(mainClaim, { observations: stale, now }).id, 'measurement-employment-value-added-gap');
const brokenSeries = fixture.map((row) => row.metricId === 'employment_hours_by_activity' && row.period === '2025' && row.dimensions.nace_r2 === 'A'
  ? { ...row, status: 'b' } : row);
assert.equal(focusedEvidencePlan(`${mainClaim} en 2025`, { observations: brokenSeries, now }).id, 'measurement-employment-value-added-gap');

const nearMisses = [
  'Las empresas pequeñas son menos productivas por falta de inversión.',
  'Los salarios de los trabajadores jóvenes son bajos.',
  'El crecimiento económico español depende demasiado del aumento de empleo y poco de la productividad.',
  'La antigüedad aumenta la productividad de los trabajadores.',
  'El presentismo reduce la productividad de los empleados.',
];
for (const claim of nearMisses) assert.notEqual(claimFocusFor(claim)?.id, 'employment-value-added-by-activity', claim);
const hospitalityClaim = 'El empleo de hostelería genera poco valor añadido en España.';
assert.equal(claimFocusFor(hospitalityClaim)?.id, 'employment-value-added-by-activity');
const hospitalityPlan = focusedEvidencePlan(hospitalityClaim, { observations: fixture, now });
assert.match(hospitalityPlan.limitation, /no permite atribuir este resultado solo a turismo u hostelería/i);

console.log(`Sectoral value-added analysis validated: ${paraphrases.length} paraphrases, trend and scope boundaries, source revisions, public state, and neighboring claims.`);
