import { renderReviewDashboard } from './review-dashboard.mjs';

const html = renderReviewDashboard({
  generatedAt: '2026-08-04T00:00:00.000Z',
  inputs: { reviewableLocalRecords: 3 },
  summary: { candidates: 1, unresolved: 1, researchCandidates: 1, sourceWorkItems: 1, newlyCoveredAuditItems: 1 },
  candidates: [{ rank: 1, clusterId: 'cluster-1', canonicalText: 'Pregunta neutral', queryCount: 4, count7d: 2, priorityScore: 8, coverageStatus: 'covered', suggestedSlug: 'pregunta-neutral', sourceIds: ['source-1'], nextAction: 'Review', reason: 'Direct evidence ready' }],
  researchCandidates: [{ rank: 1, clusterId: 'cluster-2', canonicalText: 'Pregunta sin fuente', queryCount: 5, count7d: 3, priorityScore: 9, researchOnly: true, sourceAvailability: 'none', sourceIds: [], requiredDimensions: ['geography', 'period'], nextAction: 'Find a direct primary source', reason: 'No direct source' }],
  sourceWork: [{ rank: 1, clusterId: 'cluster-2', canonicalText: 'Pregunta sin fuente', queryCount: 5, count7d: 3, rankScore: 12, harmScore: 2, urgencyScore: 1, evidenceReadiness: 0, requiredDimensions: ['geography', 'period'], auditClass: 'true_research_gap', action: 'find_source', nextAction: 'find_source', reason: 'No direct source', availableEvidence: ['Una cifra agregada'], missingFields: ['denominator'], nextEvidence: 'Find a compatible denominator', permittedConclusion: 'No está establecido' }],
});
const assert = (condition, message) => { if (!condition) throw new Error(message); };
assert(html.includes('Private maintainer tool'), 'Dashboard does not identify its private maintainer scope');
assert(html.includes('Pregunta neutral') && html.includes('Pregunta sin fuente'), 'Dashboard omitted queue candidates');
assert(html.includes('knowledge:promote-cluster'), 'Dashboard omitted the guarded promotion command');
assert(html.includes('data-tab="research"') && html.includes('data-copy'), 'Dashboard is missing research filtering or command copy controls');
assert(html.includes('Required evidence dimensions') && html.includes('geography · period'), 'Dashboard omitted required evidence dimensions');
assert(html.includes('Evidence contract') && html.includes('Find a compatible denominator') && html.includes('No está establecido'), 'Dashboard omitted the evidence contract details');
assert(html.includes('newly covered'), 'Dashboard omitted newly covered coverage metric');
assert(!html.includes('/api/') && !html.includes('wrangler d1 execute'), 'Dashboard exposed an operational API or direct mutation command');
console.log('Review dashboard validation passed: local-only queue rendering, filtering, and guarded promotion instructions are present.');
