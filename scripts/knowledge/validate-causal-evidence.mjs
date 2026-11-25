import { claimFocusFor } from '../../src/lib/knowledge/claim-focus.mjs';
import { causalContextObservations, causalEvidenceProfile, causalEvidenceSteps } from './causal-evidence.mjs';

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const series = causalEvidenceProfile([{ value: 1, period: '2020', metric: 'crime', dimensions: { geo: 'ES' } }, { value: 2, period: '2021', metric: 'crime', dimensions: { geo: 'ES' } }]);
assert(series.hasTemporalSequence && !series.hasCrossContextComparison && !series.supportsCausalConclusion, 'A single time series was incorrectly treated as causal evidence');
const comparison = causalEvidenceProfile([{ value: 1, period: '2021', metric: 'crime', dimensions: { geo: 'Madrid' } }, { value: 2, period: '2021', metric: 'crime', dimensions: { geo: 'Andalucía' } }]);
assert(comparison.hasCrossContextComparison && !comparison.supportsCausalConclusion, 'A cross-territory comparison was incorrectly treated as a causal study');
const groupComparison = causalEvidenceProfile([
  { value: 11, period: '2021', metricId: 'unemployment_rate', metric: 'Unemployment rate', unit: '%', dimensions: { geo: 'Madrid', sex: 'women' } },
  { value: 9, period: '2021', metricId: 'unemployment_rate', metric: 'Unemployment rate', unit: '%', dimensions: { geo: 'Madrid', sex: 'men' } },
]);
assert(groupComparison.hasCrossContextComparison, 'A same-period, same-metric comparison across matched population groups was not recognized');
const mismatchedGeographyGroups = causalEvidenceProfile([
  { value: 11, period: '2021', metricId: 'unemployment_rate', metric: 'Unemployment rate', unit: '%', dimensions: { sex: 'women' } },
  { value: 9, period: '2021', metricId: 'unemployment_rate', metric: 'Unemployment rate', unit: '%', dimensions: { geo: 'Madrid', sex: 'men' } },
]);
assert(!mismatchedGeographyGroups.hasCrossContextComparison, 'A missing geography was treated as matching a named territory');
const distinctMeasures = causalEvidenceProfile([
  { value: 1, period: '2021', metricId: 'unemployment_rate', metric: 'Unemployment rate', unit: '%', dimensions: { geo: 'ES' } },
  { value: 2, period: '2021', metricId: 'mean_hourly_earnings', metric: 'Mean hourly earnings', unit: 'EUR', dimensions: { geo: 'ES' } },
]);
assert(!distinctMeasures.hasCrossContextComparison && !distinctMeasures.supportsCausalConclusion, 'Two different measures from the same period were treated as a like-for-like comparison');
const researchSeries = causalEvidenceProfile([
  { value: 1, period: '2021', metric: 'Research and development expenditure', kind: 'statistical_observation', dimensions: { geo: 'Madrid' } },
  { value: 2, period: '2022', metric: 'Research and development expenditure', kind: 'statistical_observation', dimensions: { geo: 'Madrid' } },
]);
assert(researchSeries.hasTemporalSequence && !researchSeries.hasDirectCausalStudy && !researchSeries.supportsCausalConclusion, 'A statistical series with “research” in its title was mistaken for a causal study');
const study = causalEvidenceProfile([{ value: 1, period: '2021', metric: 'impact estimate', kind: 'causal_study', dimensions: { geo: 'Madrid' } }, { value: 2, period: '2022', metric: 'impact estimate', kind: 'causal_study', dimensions: { geo: 'Madrid' } }]);
assert(study.hasDirectCausalStudy && study.supportsCausalConclusion, 'Direct causal-study evidence was not recognized');
const studyBesideTrend = causalEvidenceProfile([
  { value: 0.2, period: '2021', metricId: 'causal_estimate', metric: 'Reviewed effect estimate', kind: 'causal_study', unit: 'effect size' },
  { value: 1, period: '2021', metricId: 'unemployment_rate', metric: 'Unemployment rate', unit: '%', dimensions: { geo: 'ES' } },
  { value: 2, period: '2022', metricId: 'unemployment_rate', metric: 'Unemployment rate', unit: '%', dimensions: { geo: 'ES' } },
]);
assert(studyBesideTrend.hasDirectCausalStudy && studyBesideTrend.hasTemporalSequence && !studyBesideTrend.supportsCausalConclusion, 'An unrelated time series was allowed to upgrade a single causal-study estimate');
assert(causalEvidenceSteps(series).some((step) => step.label === 'Estudio o mecanismo causal' && step.status === 'missing'), 'Causal evidence steps did not expose the missing mechanism');

const unrelated = { id: 'unrelated-waiting-list', metricId: 'primary_care_wait_days', value: 14, period: '2025', unit: 'days' };
const wageRows = [
  { id: 'wage-2024', metricId: 'real_wage_index', metric: 'Real wage index', value: 98, period: '2024', unit: 'index' },
  { id: 'wage-2025', metricId: 'real_wage_index', metric: 'Real wage index', value: 99, period: '2025', unit: 'index' },
  unrelated,
];
const wageSelection = { selected: [{ metricId: 'real_wage_index', evidenceIds: ['wage-2024', 'wage-2025'] }] };
const wageClaims = [
  'El paro estructural permite a las empresas ofrecer salarios bajos porque siempre hay candidatos',
  'El desempleo elevado debilita la negociación salarial y presiona los sueldos a la baja',
  'Cuando abundan los candidatos, las empresas pueden contener los salarios',
  'Con mucho paro, los empleadores pueden frenar las subidas de sueldo',
];
for (const claim of wageClaims) assert(claimFocusFor(claim)?.id === 'unemployment-wage-pressure', `A wage-pressure paraphrase changed evidence family: ${claim}`);
const sameFamilyEvidence = wageClaims.map(() => causalContextObservations({ observations: wageRows, evidenceSelection: wageSelection }).map((item) => item.id));
for (const ids of sameFamilyEvidence) assert(JSON.stringify(ids) === JSON.stringify(['wage-2024', 'wage-2025']), 'Paraphrases in one family should reuse only that family’s selected evidence');
assert(claimFocusFor('¿Cuál es la tasa de paro estructural en España?')?.id !== 'unemployment-wage-pressure', 'A nearby unemployment-rate question must not inherit the wage-pressure evidence family');
const unemploymentSelection = { selected: [{ metricId: 'unemployment_rate', evidenceIds: ['unemployment-2025'] }] };
const unemploymentEvidence = causalContextObservations({ observations: [...wageRows, { id: 'unemployment-2025', metricId: 'unemployment_rate', value: 10, period: '2025', unit: '%' }], evidenceSelection: unemploymentSelection });
assert(JSON.stringify(unemploymentEvidence.map((item) => item.id)) === JSON.stringify(['unemployment-2025']), 'A nearby unemployment-rate claim must keep its own metric and exclude wage evidence');

console.log('Causal evidence validation passed: aligned measures, explicit study metadata, and claim-scoped context are required.');
