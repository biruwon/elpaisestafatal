import { validateAnswerPlan } from './answer-plan-validation.mjs';

const valid = {
  schemaVersion: '1',
  headline: 'A checked result',
  summary: 'A concise summary.',
  coverage: 'qualified',
  claimType: 'descriptive',
  blocks: [{ type: 'key_number', evidenceId: 'e1', evidenceIds: ['e1'], label: 'Value', value: '10' }, { type: 'conversation_reply', evidenceIds: ['e1'], text: 'The evidence supports this limited statement.' }],
  evidenceIds: ['e1'],
  sourceIds: ['s1'],
  sourceLinks: [{ id: 's1', title: 'Official source', url: 'https://example.org/source' }],
  knowledgeVersion: 'test',
};
const provisional = validateAnswerPlan(valid, { provisional: true });
if (!provisional.ok) throw new Error(`Valid plan rejected: ${provisional.errors.join('; ')}`);

const missingEvidence = validateAnswerPlan({ ...valid, evidenceIds: [], blocks: [{ type: 'conversation_reply', evidenceIds: ['e1'], text: 'Unsupported' }] }, { provisional: true });
if (missingEvidence.ok || !missingEvidence.errors.some((error) => error.includes('outside plan'))) throw new Error('Untraceable evidence was accepted');

const missingSource = validateAnswerPlan({ ...valid, sourceLinks: [] }, { provisional: true });
if (missingSource.ok || !missingSource.errors.some((error) => error.includes('source link'))) throw new Error('Provisional plan without a source was accepted');

const malformed = validateAnswerPlan({ ...valid, blocks: [{ type: 'conversation_reply', text: 'No citation' }] });
if (malformed.ok || !malformed.errors.some((error) => error.includes('no evidence IDs'))) throw new Error('Malformed reply was accepted');

console.log('Answer-plan validation passed: traceability and provisional-source gates are enforced.');
