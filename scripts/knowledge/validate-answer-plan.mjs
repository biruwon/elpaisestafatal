import { validateAnswerPlan } from './answer-plan-validation.mjs';

const valid = {
  schemaVersion: '1',
  headline: 'A checked result',
  summary: 'A concise summary.',
  coverage: 'qualified',
  claimType: 'descriptive',
  evidenceLevel: 'supported',
  blocks: [{ type: 'key_number', evidenceId: 'e1', evidenceIds: ['e1'], label: 'Value', value: '10' }, { type: 'conversation_reply', evidenceIds: ['e1'], text: 'The evidence supports this limited statement.' }],
  evidenceIds: ['e1'],
  sourceIds: ['s1'],
  sourceLinks: [{ id: 's1', title: 'Official source', url: 'https://example.org/source' }],
  knowledgeVersion: 'test',
};
const provisional = validateAnswerPlan(valid, { provisional: true });
if (!provisional.ok) throw new Error(`Valid plan rejected: ${provisional.errors.join('; ')}`);
if (!validateAnswerPlan({ ...valid, evidenceLevel: 'limited' }).ok) throw new Error('Limited evidence level was rejected');
if (!validateAnswerPlan({ ...valid, evidenceLevel: 'insufficient', blocks: [{ type: 'evidence_gap', missing: ['Period'], needed: ['Compatible series'], nextAction: 'Define the period.' }], evidenceIds: [], sourceIds: [] }).ok) throw new Error('Evidence-gap block was rejected');
if (validateAnswerPlan({ ...valid, evidenceLevel: 'unknown' }).ok) throw new Error('Unknown evidence level was accepted');
if (!validateAnswerPlan({ ...valid, sourceLinks: [{ id: 's1', title: 'Live report', url: 'https://efe.com/story', publisher: 'EFE', publishedAt: '2026-08-10T10:00:00Z', retrievedAt: '2026-08-10T10:05:00Z', role: 'corroboration', originPublisher: 'EFE' }] }).ok) throw new Error('Enriched source metadata was rejected');
const malformedSource = validateAnswerPlan({ ...valid, sourceLinks: [{ id: 's1', title: 'Live report', url: 'https://efe.com/story', role: 'unknown', retrievedAt: 'not-a-date' }] });
if (malformedSource.ok || !malformedSource.errors.some((error) => error.includes('invalid role')) || !malformedSource.errors.some((error) => error.includes('invalid retrievedAt'))) throw new Error('Malformed source metadata was accepted');

const missingEvidence = validateAnswerPlan({ ...valid, evidenceIds: [], blocks: [{ type: 'conversation_reply', evidenceIds: ['e1'], text: 'Unsupported' }] }, { provisional: true });
if (missingEvidence.ok || !missingEvidence.errors.some((error) => error.includes('outside plan'))) throw new Error('Untraceable evidence was accepted');

const missingSource = validateAnswerPlan({ ...valid, sourceLinks: [] }, { provisional: true });
if (missingSource.ok || !missingSource.errors.some((error) => error.includes('source link'))) throw new Error('Provisional plan without a source was accepted');

const malformed = validateAnswerPlan({ ...valid, blocks: [{ type: 'conversation_reply', text: 'No citation' }] });
if (malformed.ok || !malformed.errors.some((error) => error.includes('no evidence IDs'))) throw new Error('Malformed reply was accepted');

const methodPlan = validateAnswerPlan({ ...valid, evidenceIds: [], sourceIds: [], sourceLinks: [], blocks: [
  { type: 'strongest_valid_concern', text: 'The concern can be valid without proving the proposed cause.' },
  { type: 'evidence_ladder', steps: [{ label: 'Observed change', status: 'missing', detail: 'A comparable series is required.' }] },
  { type: 'legal_decision_tree', items: [{ label: 'Jurisdiction', status: 'missing', detail: 'Identify the applicable law.' }] },
  { type: 'prediction_conditions', items: [{ label: 'Deadline', value: 'A concrete date', status: 'missing' }] },
  { type: 'trade_offs', principle: 'Evidence describes effects.', alternatives: [{ label: 'A', consequence: 'Effect A' }, { label: 'B', consequence: 'Effect B' }] },
  { type: 'group_comparison_requirements', items: [{ label: 'Denominator', status: 'missing', detail: 'Use equivalent populations.' }] },
] });
if (!methodPlan.ok) throw new Error(`Valid methodological blocks rejected: ${methodPlan.errors.join('; ')}`);

const malformedMethod = validateAnswerPlan({ ...valid, blocks: [{ type: 'trade_offs', principle: '', alternatives: [] }] });
if (malformedMethod.ok || !malformedMethod.errors.some((error) => error.includes('trade-offs'))) throw new Error('Malformed methodological block was accepted');

const oversizedExcerpt = validateAnswerPlan({ ...valid, blocks: [{ type: 'source_excerpt', evidenceIds: ['e1'], title: 'Official article', excerpt: 'x'.repeat(1201) }] });
if (oversizedExcerpt.ok || !oversizedExcerpt.errors.some((error) => error.includes('too long'))) throw new Error('Oversized source excerpt was accepted');

console.log('Answer-plan validation passed: traceability and provisional-source gates are enforced.');
