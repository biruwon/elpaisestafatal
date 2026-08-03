import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'node:http';
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
  'La inmigración está provocando más inseguridad en España',
  'La inmigración tiene la culpa de la delincuencia en España',
  'La inmigración hace crecer la delincuencia en España',
  'Desde que llegaron más inmigrantes hay más delitos en España',
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
  assert(merged?.exampleCount === 9, 'Equivalent causal inputs were not merged into one review cluster');
  assert(merged.surfaceSignatures.length === 9, 'Merged cluster did not retain all causal surface signatures');
  assert(!result.clusters.some((cluster) => /audio|transcription|example m4a/i.test(cluster.text)), 'Failed media input entered the review queue');
  assert(!result.clusters.some((cluster) => /brecha salarial/i.test(cluster.text)), 'Evaluation-origin input entered the review queue');

  const d1Input = join(directory, 'd1.json');
  const d1Output = join(directory, 'd1-clusters.json');
  await writeFile(d1Input, JSON.stringify({ clusters: [
    { id: 'd1-causal', canonical_text: 'La inmigración aumenta la delincuencia', canonical_signature: 'surface-v1', semantic_signature: `${equivalent.semanticSignature}|surface-v1`, query_count: 4, count_7d: 3, count_30d: 4, coverage_status: 'uncovered', review_status: 'unreviewed' },
    { id: 'd1-opposite', canonical_text: 'La inmigración no aumenta la delincuencia', canonical_signature: 'opposite-surface', semantic_signature: deterministicFallbackCompiler('La inmigración no aumenta la delincuencia').semanticSignature, query_count: 2, count_7d: 2, count_30d: 2, coverage_status: 'uncovered', review_status: 'unreviewed' },
  ] }));
  await execFileAsync(process.execPath, ['scripts/knowledge/cluster-gaps.mjs', '--input', input, '--d1-input', d1Input, '--output', d1Output]);
  const d1Result = JSON.parse(await readFile(d1Output, 'utf8'));
  const mergedD1 = d1Result.clusters.find((cluster) => cluster.signature === first.semanticSignature);
  assert(mergedD1?.exampleCount === 9, 'A D1 semantic family did not merge with an equivalent local family');
  assert(d1Result.clusters.length === 3, 'Cross-source clustering merged or split incompatible families');

  const embeddingInput = join(directory, 'embedding-gaps.jsonl');
  const embeddingOutput = join(directory, 'embedding-clusters.json');
  const embeddingRecords = [
    { id: 'embedding-born-1', input: 'España tiene muchos residentes nacidos fuera', text: 'España tiene muchos residentes nacidos fuera', semanticSignature: 'descriptive|geo:espana|subject:foreign_born_population', status: 'uncovered', createdAt: new Date().toISOString() },
    { id: 'embedding-born-2', input: 'Hay muchas personas que nacieron en otro país', text: 'Hay muchas personas que nacieron en otro país', semanticSignature: 'descriptive|geo:espana|subject:population_born_abroad', status: 'uncovered', createdAt: new Date().toISOString() },
    { id: 'embedding-tax-1', input: 'España recauda muchos impuestos', text: 'España recauda muchos impuestos', semanticSignature: 'descriptive|geo:espana|subject:tax_revenue', status: 'uncovered', createdAt: new Date().toISOString() },
  ].map((record) => JSON.stringify(record)).join('\n');
  await writeFile(embeddingInput, `${embeddingRecords}\n`);
  const embeddingServer = createServer(async (request, response) => {
    let body = '';
    for await (const chunk of request) body += chunk;
    const parsed = JSON.parse(body || '{}');
    const inputs = Array.isArray(parsed.input) ? parsed.input : [parsed.input];
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ embeddings: inputs.map((text) => /nacid|otro pais|fuera/i.test(String(text)) ? [1, 0, 0] : [0, 1, 0]) }));
  });
  await new Promise((resolve) => embeddingServer.listen(0, '127.0.0.1', resolve));
  const embeddingPort = embeddingServer.address().port;
  try {
    await execFileAsync(process.execPath, [
      'scripts/knowledge/cluster-gaps.mjs',
      '--input', embeddingInput,
      '--output', embeddingOutput,
      '--embedding-endpoint', `http://127.0.0.1:${embeddingPort}`,
      '--embedding-threshold', '0.95',
    ]);
    const embeddingResult = JSON.parse(await readFile(embeddingOutput, 'utf8'));
    assert(embeddingResult.semanticClustering?.enabled === true, 'Local semantic clustering did not activate with a local embedding endpoint');
    assert(embeddingResult.semanticClustering.merged === 1, 'Embedding-assisted clustering did not merge the two equivalent foreign-born families');
    assert(embeddingResult.clusters.length === 2, 'Embedding-assisted clustering merged an unrelated family');
  } finally {
    await new Promise((resolve) => embeddingServer.close(resolve));
  }

  const remoteOutput = join(directory, 'remote-embedding-clusters.json');
  await execFileAsync(process.execPath, [
    'scripts/knowledge/cluster-gaps.mjs',
    '--input', embeddingInput,
    '--output', remoteOutput,
    '--embedding-endpoint', 'https://example.com',
  ]);
  const remoteResult = JSON.parse(await readFile(remoteOutput, 'utf8'));
  assert(remoteResult.semanticClustering?.enabled === false && /local/i.test(remoteResult.semanticClustering?.skipped || ''), 'Non-local embedding endpoints were not rejected before sending gap text');
} finally {
  await rm(directory, { recursive: true, force: true });
}
console.log('Semantic clustering validation passed: equivalent claim wording merges while unrelated wording remains separate.');
