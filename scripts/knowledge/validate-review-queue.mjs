import { buildResearchCandidates, buildReviewQueue, renderReviewQueueMarkdown } from './review-queue.mjs';

const document = {
  generatedAt: '2026-08-03T08:00:00.000Z',
  inputs: { localRecords: 12, excludedLocalRecords: 3, excludedReasons: { low_signal: 2, operational_failure: 1 } },
  clusters: [
    { id: 'new', text: 'Una afirmación nueva con fuentes', signature: 'fact|subject:one', count: 8, count7d: 4, growthRate: 1.2, priorityScore: 12, sourceIds: ['source-direct'], coverageStatus: 'partial' },
    { id: 'covered', text: 'España tiene demasiados impuestos', signature: 'fact|subject:tax', count: 10, sourceIds: ['source-tax'], coverageStatus: 'covered', linkedClaimSlug: 'impuestos-europa' },
  ],
};
const queue = buildReviewQueue(document, { minCount: 3, max: 10 });
if (queue.summary.candidates !== 1 || queue.summary.unresolved !== 1 || queue.candidates[0].clusterId !== 'new') throw new Error('review queue did not exclude covered claims');
if (queue.summary.researchCandidates !== 1 || queue.researchCandidates[0].clusterId !== 'new' || queue.researchCandidates[0].reviewStatus !== 'research_needed') throw new Error('review queue did not surface unresolved research work');
if (queue.candidates[0].nextAction !== 'Check which proposition is missing evidence and record the limitation before writing an answer.') throw new Error('review queue did not provide a coverage-specific action');
if (!queue.researchCandidates[0].nextAction.includes('missing proposition') || !queue.researchCandidates[0].nextAction.includes('limitation')) throw new Error('research queue did not provide a coverage-specific action');
const markdown = renderReviewQueueMarkdown(queue);
if (!markdown.includes('Local review queue') || !markdown.includes('operational_failure: 1') || !markdown.includes('Una afirmación nueva con fuentes') || !markdown.includes('Research gaps requiring source work')) throw new Error('review queue markdown omitted maintainer context');
if (markdown.includes('source-direct') === false) throw new Error('review queue markdown should remain inspectable through the JSON source IDs');
const localGap = buildResearchCandidates([{ id: 'local', text: 'En mi barrio ha subido la inseguridad', count: 20, priorityScore: 30, coverageStatus: 'uncovered', sourceIds: ['discovery-lead'] }], { minCount: 3, max: 10 })[0];
if (!localGap || !localGap.localSpecific || localGap.sourceAvailability !== 'discovery_only' || !localGap.researchOnly) throw new Error('research queue did not preserve local and discovery-only guardrails');
const discoveryGap = buildResearchCandidates([{ id: 'lead', text: 'Una acusación nueva', count: 20, priorityScore: 30, coverageStatus: 'partial', sourceIds: ['example-discovery-lead'] }], { minCount: 3, max: 10 })[0];
if (!discoveryGap.nextAction.includes('discovery records as leads only')) throw new Error('research queue did not prioritise discovery-source verification');
console.log('Review queue validation passed: covered claims stay out and unresolved work is ranked for one maintainer.');
