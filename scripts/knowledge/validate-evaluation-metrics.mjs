import { evaluateOutcome, traceabilityFor } from './evaluation-metrics.mjs';

const known = evaluateOutcome({ item: { id: 'known', expected: { status: 'known', slug: 'claim-a' } }, result: { status: 'complete', relatedClaims: [{ slug: 'claim-a' }], result: { coverage: 'strong', blocks: [{ type: 'key_number', evidenceId: 'e1', evidenceIds: ['e1'] }], evidenceIds: ['e1'], sourceLinks: [{ url: 'https://example.test/source' }] } }, latencyMs: 10 });
if (!known.knownPass || !known.traceabilityPass || known.coverage !== 'strong') throw new Error('Known traceability metrics were calculated incorrectly');

const unsafe = evaluateOutcome({ item: { id: 'unknown', expected: { status: 'unknown' } }, result: { status: 'draft', relatedClaims: [{ slug: 'unrelated' }] }, latencyMs: 10 });
if (unsafe.unknownPass || !unsafe.irrelevantMatch) throw new Error('Irrelevant unknown match was not counted as unsafe');

const broken = traceabilityFor({ result: { blocks: [{ type: 'conversation_reply', evidenceIds: ['missing'] }], evidenceIds: ['e1'], sourceLinks: [{ url: 'http://insecure.test' }] } });
if (broken.passed) throw new Error('Broken evidence/source traceability was accepted');
console.log('Evaluation metrics validation passed: recall, irrelevant matches, coverage, and traceability are measured.');
