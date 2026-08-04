import { causalEvidenceProfile, causalEvidenceSteps } from './causal-evidence.mjs';

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const series = causalEvidenceProfile([{ value: 1, period: '2020', metric: 'crime', dimensions: { geo: 'ES' } }, { value: 2, period: '2021', metric: 'crime', dimensions: { geo: 'ES' } }]);
assert(series.hasTemporalSequence && !series.hasCrossContextComparison && !series.supportsCausalConclusion, 'A single time series was incorrectly treated as causal evidence');
const comparison = causalEvidenceProfile([{ value: 1, period: '2021', metric: 'crime', dimensions: { geo: 'Madrid' } }, { value: 2, period: '2021', metric: 'crime', dimensions: { geo: 'Andalucía' } }]);
assert(comparison.hasCrossContextComparison && !comparison.supportsCausalConclusion, 'A cross-territory comparison was incorrectly treated as a causal study');
const study = causalEvidenceProfile([{ value: 1, period: '2021', metric: 'impact study', kind: 'academic_research', dimensions: { geo: 'Madrid' } }, { value: 2, period: '2022', metric: 'impact study', kind: 'academic_research', dimensions: { geo: 'Madrid' } }]);
assert(study.hasDirectCausalStudy && study.supportsCausalConclusion, 'Direct causal-study evidence was not recognized');
assert(causalEvidenceSteps(series).some((step) => step.label === 'Estudio o mecanismo causal' && step.status === 'missing'), 'Causal evidence steps did not expose the missing mechanism');
console.log('Causal evidence validation passed: trends, comparisons, and causal studies remain distinct.');
