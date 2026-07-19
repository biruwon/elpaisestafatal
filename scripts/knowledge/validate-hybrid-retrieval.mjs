import { readFile } from 'node:fs/promises';
import { reciprocalRankFusion, resolveMetricConflict, validateEmbedding } from './hybrid-retrieval.mjs';

const vector = Array.from({ length: 1024 }, (_, index) => index === 0 ? 1 : 0);
if (!validateEmbedding(vector)) throw new Error('Valid 1024-dimension embedding was rejected');
if (validateEmbedding(vector.slice(1))) throw new Error('Wrong embedding dimensions were accepted');
if (validateEmbedding([...vector.slice(0, -1), Number.NaN])) throw new Error('Non-finite embedding value was accepted');

const lexical = [
  { id: 'shared', score: 0.7, metric: 'house_price' },
  { id: 'lexical-only', score: 0.6, metric: 'housing_stock' },
];
const semantic = [
  { id: 'semantic-only', score: 0.58, metric: 'rent_burden' },
  { id: 'shared', score: 0.8, metric: 'house_price' },
  { id: 'unsafe-low', score: 0.39, metric: 'taxes' },
];
const fused = reciprocalRankFusion(lexical, semantic, { limit: 5 });
if (fused[0]?.id !== 'shared') throw new Error('A candidate supported by both retrieval channels must rank first');
if (!fused.some((item) => item.id === 'semantic-only' && item.evidenceFit === 'direct')) throw new Error('Strong semantic paraphrase was not retained');
if (fused.some((item) => item.id === 'unsafe-low')) throw new Error('Weak semantic-only candidate passed the safety threshold');
if (!fused.find((item) => item.id === 'shared')?.retrievalChannels.includes('lexical') || !fused.find((item) => item.id === 'shared')?.retrievalChannels.includes('semantic')) throw new Error('Fusion did not retain retrieval provenance');

const semanticConflict = resolveMetricConflict(
  [{ id: 'employment', score: 0.6, notEquivalentTo: ['unemployment'] }],
  [{ id: 'unemployment', score: 0.62, notEquivalentTo: ['employment'] }, { id: 'employment', score: 0.5, notEquivalentTo: ['unemployment'] }],
);
if (semanticConflict.winner !== 'semantic' || semanticConflict.lexical.length) throw new Error('Confident semantic metric conflict was not resolved');
const lexicalConflict = resolveMetricConflict(
  [{ id: 'density', score: 0.6, notEquivalentTo: ['population'] }],
  [{ id: 'population', score: 0.55, notEquivalentTo: ['density'] }, { id: 'density', score: 0.545, notEquivalentTo: ['population'] }],
);
if (lexicalConflict.winner !== 'lexical' || lexicalConflict.semantic.some((item) => item.id === 'population')) throw new Error('Ambiguous semantic metric conflict did not retain lexical evidence');

const migration = await readFile(new URL('../../migrations/postgres/0004_warehouse_vectors.sql', import.meta.url), 'utf8');
for (const required of ['CREATE EXTENSION IF NOT EXISTS vector', 'vector(1024)', 'vector_cosine_ops']) {
  if (!migration.includes(required)) throw new Error(`Vector migration is missing: ${required}`);
}

console.log('Hybrid retrieval validation passed: vector shape, semantic thresholds, provenance, and reciprocal-rank fusion are enforced.');
