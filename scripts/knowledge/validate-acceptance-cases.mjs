import { acceptanceCases } from './evaluation-cases.mjs';
import { deterministicApiFallback } from '../../src/lib/knowledge/deterministic-api-fallback.mjs';
import { detectCurrentEvent } from './current-events.mjs';

const errors = [];
for (const id of ['acceptance-broad-left-country-worse', 'acceptance-named-government-country-worse',
  'acceptance-named-government-country-worse-variant', 'acceptance-named-government-country-better', 'acceptance-country-better']) {
  const entry = acceptanceCases.find((item) => item.id === id);
  const result = entry && deterministicApiFallback({ text: entry.input });
  const scorecard = result?.result?.blocks?.find((block) => block.type === 'scorecard');
  if (result?.status !== 'complete' || !scorecard?.items?.length || !result.result.sourceLinks?.length) errors.push(`${id} must resolve to a sourced indicator scorecard.`);
  if (result?.result?.blocks?.some((block) => block.type === 'verdict' || block.type === 'overall_grade')) errors.push(`${id} must not publish an overall partisan verdict.`);
  if (!result?.result?.blocks?.some((block) => block.type === 'cannot_conclude' && block.points?.some((point) => /causalidad/i.test(point)))) errors.push(`${id} must not attribute changes to the government without causal evidence.`);
}

const event = acceptanceCases.find((item) => item.id === 'acceptance-ceuta-cross-border-allegation');
const frame = detectCurrentEvent(event.input);
const ids = frame?.propositions?.map((item) => item.id) || [];
for (const id of event.expected.propositionIds) if (!ids.includes(id)) errors.push(`Ceuta acceptance case is missing proposition: ${id}`);
if (!frame || frame.urgency !== 'high') errors.push('Ceuta acceptance case must route to a high-urgency current event frame.');
if (frame?.propositions?.some((item) => /delincuencia|criminalidad|estadística nacional/i.test(`${item.query} ${item.text}`))) errors.push('Ceuta acceptance case must not use national crime statistics as incident proof.');

if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('Acceptance cases valid: broad scorecard and Ceuta event/allegation/attribution routing.');
