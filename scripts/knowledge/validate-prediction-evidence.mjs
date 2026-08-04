import { predictionSpecFor, predictionStepsFor } from './prediction-evidence.mjs';

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const vague = predictionSpecFor('La vivienda caerá pronto');
assert(!vague.measurable && !vague.deadline && !vague.threshold, 'Vague prediction was incorrectly considered measurable');
const measurable = predictionSpecFor('El paro bajará al 8% en 2027', { numbers: ['8%'] });
assert(measurable.measurable && measurable.indicator === 'paro' && measurable.deadline === '2027', 'Measurable prediction fields were not extracted');
assert(predictionStepsFor(vague).some((step) => step.label === 'Resultado comprobable' && step.status === 'missing'), 'Prediction steps did not expose the missing test');
console.log('Prediction evidence validation passed: forecasts remain distinct from present facts and become testable specifications.');
