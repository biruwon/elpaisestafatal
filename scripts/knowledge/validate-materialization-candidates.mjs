import { rankMaterializationCandidates } from './materialization-candidates.mjs';

const candidates = rankMaterializationCandidates([
  { id: 'popular', text: 'España tiene demasiados impuestos', signature: 'espana demasiados impuestos', count: 7, priorityScore: 10, sourceIds: ['e1'] },
  { id: 'rare', text: 'Pregunta rara', signature: 'pregunta rara', count: 2, priorityScore: 99, sourceIds: ['e2'] },
  { id: 'no-source', text: 'Sin fuente', signature: 'sin fuente', count: 8, priorityScore: 20, sourceIds: [] },
], { minCount: 3, max: 10 });
if (candidates.length !== 1 || candidates[0].clusterId !== 'popular') throw new Error('candidate ranking did not enforce popularity and source gates');
if (candidates[0].reviewStatus !== 'needs_review' || !candidates[0].suggestedSlug || candidates[0].requiredActions.length < 3) throw new Error('candidate lacks review metadata');
console.log('Materialization candidate validation passed: popularity never bypasses review gates.');
