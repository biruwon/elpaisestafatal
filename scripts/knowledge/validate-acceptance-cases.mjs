import { acceptanceCases } from './evaluation-cases.mjs';
import { deterministicApiFallback } from '../../src/lib/knowledge/deterministic-api-fallback.mjs';
import { detectCurrentEvent } from './current-events.mjs';

const errors = [];
const broad = acceptanceCases.find((item) => item.id === 'acceptance-broad-left-country-worse');
const broadResult = deterministicApiFallback({ text: broad.input });
if (broadResult.result?.answerMode !== 'scorecard' || broadResult.result?.resultState !== 'answered' || broadResult.result?.reviewed !== false) {
  errors.push('Broad political acceptance case must resolve to an answered, non-reviewed scorecard.');
}
if (broadResult.result?.blocks?.some((block) => block.type === 'verdict' || block.type === 'overall_grade')) {
  errors.push('Broad political acceptance case must not publish an overall partisan verdict.');
}

const event = acceptanceCases.find((item) => item.id === 'acceptance-ceuta-cross-border-allegation');
const frame = detectCurrentEvent(event.input);
const ids = frame?.propositions?.map((item) => item.id) || [];
for (const id of event.expected.propositionIds) if (!ids.includes(id)) errors.push(`Ceuta acceptance case is missing proposition: ${id}`);
if (!frame || frame.urgency !== 'high') errors.push('Ceuta acceptance case must route to a high-urgency current event frame.');
if (frame?.propositions?.some((item) => /delincuencia|criminalidad|estadística nacional/i.test(`${item.query} ${item.text}`))) errors.push('Ceuta acceptance case must not use national crime statistics as incident proof.');

if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('Acceptance cases valid: broad scorecard and Ceuta event/allegation/attribution routing.');
