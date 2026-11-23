import { evaluateOutcome, traceabilityFor } from './evaluation-metrics.mjs';

const known = evaluateOutcome({ item: { id: 'known', expected: { status: 'known', slug: 'claim-a' } }, result: { status: 'complete', relatedClaims: [{ slug: 'claim-a' }], result: { coverage: 'strong', blocks: [{ type: 'key_number', evidenceId: 'e1', evidenceIds: ['e1'] }], evidenceIds: ['e1'], sourceIds: ['source-a'], sourceLinks: [{ id: 'source-a', url: 'https://example.test/source' }], shareableSourceIds: ['source-a'] } }, latencyMs: 10 });
if (!known.knownPass || !known.traceabilityPass || known.coverage !== 'strong') throw new Error('Known traceability metrics were calculated incorrectly');

const unsafe = evaluateOutcome({ item: { id: 'unknown', expected: { status: 'unknown' } }, result: { status: 'draft', relatedClaims: [{ slug: 'unrelated' }] }, latencyMs: 10 });
if (unsafe.unknownPass || !unsafe.irrelevantMatch) throw new Error('Irrelevant unknown match was not counted as unsafe');

const scorecard = evaluateOutcome({ item: { id: 'broad', expected: { status: 'unknown' } }, result: { status: 'complete', relatedClaims: [], result: { answerMode: 'scorecard' } }, latencyMs: 10 });
if (!scorecard.unknownPass || scorecard.irrelevantMatch) throw new Error('Evidence-backed scorecard was incorrectly treated as an unsafe unknown verdict');

const relatedContext = evaluateOutcome({ item: { id: 'context', expected: { status: 'unknown' } }, result: { status: 'related', relatedClaims: [], result: { answerMode: 'guidance' } }, latencyMs: 10 });
if (!relatedContext.unknownPass || relatedContext.irrelevantMatch) throw new Error('Related context without a claim verdict was incorrectly treated as unsafe');

const broken = traceabilityFor({ result: { blocks: [{ type: 'conversation_reply', evidenceIds: ['missing'] }], evidenceIds: ['e1'], sourceLinks: [{ url: 'http://insecure.test' }] } });
if (broken.passed) throw new Error('Broken evidence/source traceability was accepted');

const brokenProposition = traceabilityFor({ result: {
  blocks: [{ type: 'claim_breakdown', items: [{ text: 'Unlinked clause', verdict: 'supported', evidenceIds: ['missing'], sourceIds: ['unlinked-source'] }] }],
  evidenceIds: ['e1'],
  sourceIds: ['source-a'],
  sourceLinks: [{ id: 'source-a', title: 'Reviewed source', url: 'https://example.test/source' }],
} });
if (brokenProposition.passed) throw new Error('Unlinked compound-claim evidence/source references were accepted');

const propositionWithoutReferences = traceabilityFor({ result: {
  blocks: [{ type: 'claim_breakdown', items: [{ text: 'A clause labelled supported', verdict: 'supported' }] }],
  evidenceIds: ['e1'],
  sourceIds: ['source-a'],
  sourceLinks: [{ id: 'source-a', title: 'Reviewed source', url: 'https://example.test/source' }],
  shareableSourceIds: ['source-a'],
} });
if (propositionWithoutReferences.passed) throw new Error('A supported proposition without its own evidence/source IDs passed traceability');

const evidenceWithoutCitation = traceabilityFor({ result: {
  blocks: [{ type: 'key_number', evidenceIds: ['e1'] }],
  evidenceIds: ['e1'],
  sourceIds: ['source-a'],
  sourceLinks: [{ id: 'source-a', title: 'Available but uncited source', url: 'https://example.test/source' }],
} });
if (evidenceWithoutCitation.passed) throw new Error('Evidence with an uncited HTTPS source passed traceability');

const publicCheck = traceabilityFor({ state: 'supported', result: {
  evidenceLevel: 'supported',
  sources: [{ id: 'source-a', title: 'Reviewed source', url: 'https://example.test/source' }],
  arguments: [{ id: 'part-1', verdict: 'supported', evidenceIds: ['e1'], sourceIds: ['source-a'] }],
} });
if (!publicCheck.checked || !publicCheck.passed) throw new Error('A sourced public claim assessment failed traceability');

const mismatchedPublicSource = traceabilityFor({ state: 'supported', result: {
  evidenceLevel: 'supported',
  sources: [{ id: 'source-a', title: 'Reviewed source', url: 'https://example.test/source' }],
  arguments: [{ id: 'part-1', verdict: 'supported', evidenceIds: ['e1'], sourceIds: ['another-source'] }],
} });
if (mismatchedPublicSource.passed) throw new Error('A supported public claim with a non-matching source ID passed traceability');

const unsupportedPublicData = traceabilityFor({ state: 'limited', result: {
  evidenceLevel: 'limited',
  sources: [{ id: 'source-a', title: 'Reviewed source', url: 'https://example.test/source' }],
  evidenceSummary: { families: [{ familyId: 'family-a', label: 'Observed data', status: 'available', evidenceIds: [], sourceIds: [], data: ['42'] }] },
} });
if (unsupportedPublicData.passed) throw new Error('Public family data without evidence/source IDs passed traceability');

console.log('Evaluation metrics validation passed: routing, unknown safety, public/plan traceability, and proposition references are measured.');
