import { acceptanceCases } from './evaluation-cases.mjs';
import { deterministicApiFallback } from '../../src/lib/knowledge/deterministic-api-fallback.mjs';
import { GOVERNMENT_SCORECARD_SNAPSHOT } from '../../src/lib/knowledge/scorecard-snapshot.mjs';
import { publicEvidenceGapReply } from '../../src/lib/knowledge/public-answer-composition.mjs';
import { detectCurrentEvent } from './current-events.mjs';

const errors = [];
const priorScorecardFlag = process.env.BROAD_SCORECARD;
process.env.BROAD_SCORECARD = '1';
const reviewedSnapshotDate = Date.parse('2026-09-01T12:00:00Z');
for (const id of ['acceptance-broad-left-country-worse', 'acceptance-named-government-country-worse',
  'acceptance-named-government-country-worse-variant', 'acceptance-named-government-country-better', 'acceptance-country-better']) {
  const entry = acceptanceCases.find((item) => item.id === id);
  const result = entry && deterministicApiFallback({ text: entry.input, now: reviewedSnapshotDate });
  const scorecard = result?.result?.blocks?.find((block) => block.type === 'scorecard');
  if (result?.status !== 'complete' || !scorecard?.items?.length || !result.result.sourceLinks?.length) errors.push(`${id} must resolve to a sourced indicator scorecard.`);
  if (result?.result?.blocks?.some((block) => block.type === 'verdict' || block.type === 'overall_grade')) errors.push(`${id} must not publish an overall partisan verdict.`);
  if (!result?.result?.blocks?.some((block) => block.type === 'cannot_conclude' && block.points?.some((point) => /causalidad/i.test(point)))) errors.push(`${id} must not attribute changes to the government without causal evidence.`);
}
if (priorScorecardFlag === undefined) delete process.env.BROAD_SCORECARD;
else process.env.BROAD_SCORECARD = priorScorecardFlag;

const expiredDate = Date.parse('2026-11-23T12:00:00Z');
for (const id of ['acceptance-broad-left-country-worse', 'acceptance-named-government-country-worse',
  'acceptance-named-government-country-worse-variant', 'acceptance-named-government-country-better', 'acceptance-country-better']) {
  const entry = acceptanceCases.find((item) => item.id === id);
  const result = entry && deterministicApiFallback({ text: entry.input, now: expiredDate });
  const plan = result?.result;
  const gapReply = publicEvidenceGapReply(plan) || '';
  if (result?.status !== 'uncovered' || plan?.id !== 'broad-government-scorecard-gap') errors.push(`${id} must explain that the expired scorecard is unavailable.`);
  if (plan?.blocks?.some((block) => block.type === 'scorecard') || plan?.evidenceIds?.length || plan?.sourceIds?.length) errors.push(`${id} must not expose expired scorecard values or sources.`);
  if (!plan?.clarificationQuestion || !/resultado|tema|periodo|años/i.test(plan.clarificationQuestion)) errors.push(`${id} must ask for a measurable result and period when the scorecard has expired.`);
  if (!gapReply.includes(GOVERNMENT_SCORECARD_SNAPSHOT.expiresAt) || !/no permite confirmar ni descartar/i.test(gapReply)) errors.push(`${id} must disclose expiry without turning missing current data into a verdict.`);
}

for (const text of ['El déficit público bajó en España en 2025', 'La tasa de paro juvenil empeoró entre 2024 y 2025']) {
  const result = deterministicApiFallback({ text, now: expiredDate });
  if (result?.result?.blocks?.some((block) => block.type === 'scorecard')) errors.push(`${text}: a specific indicator claim must not cross-route to the broad political scorecard.`);
}

const enabledFlag = process.env.BROAD_SCORECARD;
process.env.BROAD_SCORECARD = '0';
const disabledScorecard = deterministicApiFallback({ text: 'Sánchez está hundiendo España', now: reviewedSnapshotDate });
if (enabledFlag === undefined) delete process.env.BROAD_SCORECARD;
else process.env.BROAD_SCORECARD = enabledFlag;
if (disabledScorecard?.status !== 'uncovered'
  || !disabledScorecard.result?.limitation?.includes('no está habilitado')
  || disabledScorecard.result?.sourceIds?.length || disabledScorecard.result?.evidenceIds?.length) {
  errors.push('A deliberately disabled but otherwise current scorecard must explain that its figures are withheld, without claiming the snapshot is missing or expired.');
}

const event = acceptanceCases.find((item) => item.id === 'acceptance-ceuta-cross-border-allegation');
const frame = detectCurrentEvent(event.input);
const ids = frame?.propositions?.map((item) => item.id) || [];
for (const id of event.expected.propositionIds) if (!ids.includes(id)) errors.push(`Ceuta acceptance case is missing proposition: ${id}`);
if (!frame || frame.urgency !== 'high') errors.push('Ceuta acceptance case must route to a high-urgency current event frame.');
if (frame?.propositions?.some((item) => /delincuencia|criminalidad|estadística nacional/i.test(`${item.query} ${item.text}`))) errors.push('Ceuta acceptance case must not use national crime statistics as incident proof.');

if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('Acceptance cases valid: scorecard paraphrases, expired-data gaps, nearby metric claims, and Ceuta event/allegation routing.');
