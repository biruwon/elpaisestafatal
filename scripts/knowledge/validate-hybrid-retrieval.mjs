import { readFile } from 'node:fs/promises';
import { reciprocalRankFusion, validateEmbedding } from './hybrid-retrieval.mjs';

const vector = Array.from({ length: 1024 }, (_, index) => index === 0 ? 1 : 0);
if (!validateEmbedding(vector)) throw new Error('Valid 1024-dimension embedding was rejected');
if (validateEmbedding(vector.slice(1))) throw new Error('Wrong embedding dimensions were accepted');
if (validateEmbedding([...vector.slice(0, -1), Number.NaN])) throw new Error('Non-finite embedding value was accepted');

const lexical = [
  { id: 'shared', score: 0.7, metric: 'house_price' },
  { id: 'lexical-only', score: 0.6, metric: 'housing_stock' },
];
const semantic = [
  { id: 'semantic-only', score: 0.84, metric: 'rent_burden' },
  { id: 'shared', score: 0.8, metric: 'house_price' },
  { id: 'unsafe-low', score: 0.69, metric: 'taxes' },
];
const fused = reciprocalRankFusion(lexical, semantic, { limit: 5 });
if (fused[0]?.id !== 'shared') throw new Error('A candidate supported by both retrieval channels must rank first');
if (!fused.some((item) => item.id === 'semantic-only' && item.evidenceFit === 'direct')) throw new Error('Strong semantic paraphrase was not retained');
if (fused.some((item) => item.id === 'unsafe-low')) throw new Error('Weak semantic-only candidate passed the safety threshold');
if (!fused.find((item) => item.id === 'shared')?.retrievalChannels.includes('lexical') || !fused.find((item) => item.id === 'shared')?.retrievalChannels.includes('semantic')) throw new Error('Fusion did not retain retrieval provenance');

const migration = await readFile(new URL('../../migrations/postgres/0004_warehouse_vectors.sql', import.meta.url), 'utf8');
for (const required of ['CREATE EXTENSION IF NOT EXISTS vector', 'vector(1024)', 'vector_cosine_ops']) {
  if (!migration.includes(required)) throw new Error(`Vector migration is missing: ${required}`);
}

console.log('Hybrid retrieval validation passed: vector shape, semantic thresholds, provenance, and reciprocal-rank fusion are enforced.');
