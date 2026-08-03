import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { deterministicFallbackCompiler } from './fallback-compiler.mjs';

const execFileAsync = promisify(execFile);
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const directory = await mkdtemp(join(tmpdir(), 'elpaisestafatal-clusters-'));
const input = join(directory, 'gaps.jsonl');
const output = join(directory, 'clusters.json');
const first = deterministicFallbackCompiler('Los inmigrantes crean inseguridad en España');
const equivalent = deterministicFallbackCompiler('La inmigración aumenta la delincuencia en España');
const naturalEquivalents = [
  'Los migrantes hacen que aumenten los delitos en España',
  'La llegada de extranjeros vuelve inseguro a España',
  'Con más inmigración hay más delitos en España',
].map((input) => ({ input, compiled: deterministicFallbackCompiler(input) }));
const unrelated = deterministicFallbackCompiler('España cobra demasiados impuestos');
const records = [
  { id: 'gap-1', input: 'Los inmigrantes crean inseguridad en España', canonical: 'crean espana inmigrantes inseguridad', semanticSignature: first.semanticSignature, status: 'uncovered', createdAt: new Date().toISOString() },
  { id: 'gap-2', input: 'La inmigración aumenta la delincuencia en España', canonical: 'aumenta delincuencia espana inmigracion', semanticSignature: equivalent.semanticSignature, status: 'uncovered', createdAt: new Date().toISOString() },
  ...naturalEquivalents.map(({ input, compiled }, index) => ({ id: `gap-natural-${index + 1}`, input, canonical: compiled.canonicalSignature, semanticSignature: compiled.semanticSignature, status: 'uncovered', createdAt: new Date().toISOString() })),
  { id: 'gap-3', input: 'España cobra demasiados impuestos', canonical: 'cobra demasiados espana impuestos', semanticSignature: unrelated.semanticSignature, status: 'uncovered', createdAt: new Date().toISOString() },
  { id: 'gap-media-failure', inputType: 'audio', input: '/tmp/example.m4a', extractedText: 'Audio transcription is not available because no local transcription runtime is installed.', classification: { reason: 'Audio input requires a local transcription runtime.' }, status: 'uncovered', createdAt: new Date().toISOString() },
  { id: 'gap-test-origin', input: 'La brecha salarial de genero es un mito', origin: 'evaluation', semanticSignature: 'descriptive|descriptive:brecha+genero+mito+salarial', status: 'uncovered', createdAt: new Date().toISOString() },
].map((record) => JSON.stringify(record)).join('\n');
try {
  await writeFile(input, `${records}\n`);
  await execFileAsync(process.execPath, ['scripts/knowledge/cluster-gaps.mjs', '--input', input, '--output', output]);
  const result = JSON.parse(await readFile(output, 'utf8'));
  assert(result.clusters.length === 2, `Expected two semantic families, received ${result.clusters.length}`);
  const merged = result.clusters.find((cluster) => cluster.signature === first.semanticSignature);
  assert(merged?.exampleCount === 5, 'Equivalent causal inputs were not merged into one review cluster');
  assert(merged.surfaceSignatures.length === 5, 'Merged cluster did not retain all causal surface signatures');
  assert(!result.clusters.some((cluster) => /audio|transcription|example m4a/i.test(cluster.text)), 'Failed media input entered the review queue');
  assert(!result.clusters.some((cluster) => /brecha salarial/i.test(cluster.text)), 'Evaluation-origin input entered the review queue');

  const d1Input = join(directory, 'd1.json');
  const d1Output = join(directory, 'd1-clusters.json');
  await writeFile(d1Input, JSON.stringify({ clusters: [
    { id: 'd1-causal', canonical_text: 'La inmigración aumenta la delincuencia', canonical_signature: 'legacy-surface', semantic_signature: `${equivalent.semanticSignature}|legacy`, query_count: 4, count_7d: 3, count_30d: 4, coverage_status: 'uncovered', review_status: 'unreviewed' },
    { id: 'd1-opposite', canonical_text: 'La inmigración no aumenta la delincuencia', canonical_signature: 'opposite-surface', semantic_signature: deterministicFallbackCompiler('La inmigración no aumenta la delincuencia').semanticSignature, query_count: 2, count_7d: 2, count_30d: 2, coverage_status: 'uncovered', review_status: 'unreviewed' },
  ] }));
  await execFileAsync(process.execPath, ['scripts/knowledge/cluster-gaps.mjs', '--input', input, '--d1-input', d1Input, '--output', d1Output]);
  const d1Result = JSON.parse(await readFile(d1Output, 'utf8'));
  const mergedD1 = d1Result.clusters.find((cluster) => cluster.signature === first.semanticSignature);
  assert(mergedD1?.exampleCount === 5, 'A D1 semantic family did not merge with an equivalent local family');
  assert(d1Result.clusters.length === 3, 'Cross-source clustering merged or split incompatible families');
} finally {
  await rm(directory, { recursive: true, force: true });
}
console.log('Semantic clustering validation passed: equivalent claim wording merges while unrelated wording remains separate.');
