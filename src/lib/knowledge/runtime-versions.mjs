// Internal cache and contract versions. Keep provider names and deployment
// details out of this manifest because these values can travel in result data.
export const RUNTIME_VERSIONS = Object.freeze({
  answerPlanSchema: '1',
  evidencePacketSchema: '1',
  knowledge: '2026-08-04.2',
  fallbackKnowledge: 'deterministic-fallback-13',
  warehouseKnowledge: 'warehouse-2026-08-04.2',
  indexKnowledge: 'index-only-2026-08-05.1',
});
