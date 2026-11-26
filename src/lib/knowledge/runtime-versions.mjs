// Internal cache and contract versions. Keep provider names and deployment
// details out of this manifest because these values can travel in result data.
export const RUNTIME_VERSIONS = Object.freeze({
  answerPlanSchema: '1',
  evidencePacketSchema: '1',
  compilerContract: '3',
  knowledge: '2026-08-04.2',
  fallbackKnowledge: 'deterministic-fallback-95-text-answer-digest-2026-11',
  warehouseKnowledge: 'warehouse-2026-11-26.49-text-answer-digest',
  indexKnowledge: 'index-only-2026-08-05.9',
});
