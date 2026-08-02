import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { deterministicFallbackCompiler } from './fallback-compiler.mjs';

const root = new URL('../../', import.meta.url).pathname;
const args = new Map(process.argv.slice(2).reduce((pairs, value, index, values) => {
  if (value.startsWith('--')) pairs.push([value.slice(2), values[index + 1] && !values[index + 1].startsWith('--') ? values[index + 1] : 'true']);
  return pairs;
}, []));
const inputPath = args.get('input') || join(root, '.local/knowledge-gaps.jsonl');
const outputPath = args.get('output') || inputPath;

let source;
try { source = await readFile(inputPath, 'utf8'); } catch {
  console.log(`No knowledge-gap file found at ${inputPath}.`);
  process.exit(0);
}

let updated = 0;
const records = source.split('\n').filter(Boolean).flatMap((line) => {
  try {
    const record = JSON.parse(line);
    if (record.semanticSignature) return [record];
    const text = String(record.input || record.normalized || record.canonical || '').trim();
    if (!text) return [record];
    const compiler = deterministicFallbackCompiler(text);
    updated += 1;
    return [{ ...record, semanticSignature: compiler.semanticSignature, compilerClaimType: compiler.claimType }];
  } catch { return []; }
});

await writeFile(outputPath, records.map((record) => JSON.stringify(record)).join('\n') + (records.length ? '\n' : ''));
console.log(`Backfilled semantic signatures for ${updated} knowledge-gap record(s); wrote ${records.length} record(s) to ${outputPath}.`);
