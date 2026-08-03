import { validateMaterializationRecords } from './materialization-contract.mjs';

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const knownEvidence = new Set(['evidence-1']);
const knownSources = new Set(['source-1']);
const knownPropositions = new Map([
  ['prop-1', { claimSlug: 'new-claim', evidenceIds: ['evidence-1'] }],
]);

const valid = validateMaterializationRecords({
  slug: 'new-claim',
  answer: { propositionIds: ['prop-1'], evidenceIds: ['evidence-1'], sourceIds: ['source-1'] },
  knownEvidence,
  knownSources,
  knownPropositions,
});
const errorKeys = ['missingEvidence', 'missingSources', 'missingPropositions', 'wrongClaimPropositions', 'unlinkedEvidence'];
assert(!errorKeys.some((key) => valid[key].length), 'Valid materialization records were rejected');

const missingProposition = validateMaterializationRecords({
  slug: 'new-claim',
  answer: { evidenceIds: ['evidence-1'], sourceIds: ['source-1'] },
  knownEvidence,
  knownSources,
  knownPropositions,
});
assert(missingProposition.propositionIds.length === 0, 'Missing proposition IDs were not represented');

const wrongClaim = validateMaterializationRecords({
  slug: 'new-claim',
  answer: { propositionIds: ['prop-1'], evidenceIds: [], sourceIds: ['source-1'] },
  knownEvidence,
  knownSources,
  knownPropositions: new Map([['prop-1', { claimSlug: 'other-claim', evidenceIds: ['evidence-1'] }]]),
});
assert(wrongClaim.wrongClaimPropositions.includes('prop-1'), 'A proposition from another claim bypassed validation');
assert(wrongClaim.unlinkedEvidence.includes('prop-1:evidence-1'), 'Unlinked proposition evidence bypassed validation');
console.log('Materialization contract validation passed: proposition-level review traceability is mandatory.');
