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
const unrelated = deterministicFallbackCompiler('España cobra demasiados impuestos');
const records = [
  { id: 'gap-1', input: 'Los inmigrantes crean inseguridad en España', canonical: 'crean espana inmigrantes inseguridad', semanticSignature: first.semanticSignature, status: 'uncovered', createdAt: new Date().toISOString() },
  { id: 'gap-2', input: 'La inmigración aumenta la delincuencia en España', canonical: 'aumenta delincuencia espana inmigracion', semanticSignature: equivalent.semanticSignature, status: 'uncovered', createdAt: new Date().toISOString() },
  { id: 'gap-3', input: 'España cobra demasiados impuestos', canonical: 'cobra demasiados espana impuestos', semanticSignature: unrelated.semanticSignature, status: 'uncovered', createdAt: new Date().toISOString() },
].map((record) => JSON.stringify(record)).join('\n');
try {
  await writeFile(input, `${records}\n`);
  await execFileAsync(process.execPath, ['scripts/knowledge/cluster-gaps.mjs', '--input', input, '--output', output]);
  const result = JSON.parse(await readFile(output, 'utf8'));
  assert(result.clusters.length === 2, `Expected two semantic families, received ${result.clusters.length}`);
  const merged = result.clusters.find((cluster) => cluster.signature === first.semanticSignature);
  assert(merged?.exampleCount === 2, 'Equivalent causal inputs were not merged into one review cluster');
  assert(merged.surfaceSignatures.length === 2, 'Merged cluster did not retain both surface signatures');
} finally {
  await rm(directory, { recursive: true, force: true });
}
console.log('Semantic clustering validation passed: equivalent claim wording merges while unrelated wording remains separate.');
