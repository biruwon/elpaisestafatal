import { mkdir, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { coalesceObservationInserts, parseD1CompletedSourceSnapshots, skipUnchangedSourceData, warehouseImportBatches } from './warehouse-import.mjs';
import { join, resolve } from 'node:path';

const root = new URL('../../', import.meta.url).pathname;
const warehouseRoot = join(root, '.local/source-warehouse');
const optionValue = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const configuredInput = optionValue('--input') || process.env.WAREHOUSE_D1_INPUT || join(warehouseRoot, 'warehouse-load.sql');
const inputPath = resolve(root, configuredInput);
const tempPath = join(warehouseRoot, 'd1-import');
const database = optionValue('--database') || process.env.WAREHOUSE_D1_DATABASE || 'elpaisestafatal-ops';

const capture = (command, args) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], shell: false });
  let stdout = '', stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  child.on('error', reject);
  child.on('exit', (code, signal) => code === 0
    ? resolve(stdout)
    : reject(new Error(`Remote source manifest query failed (${signal || `code ${code}`}): ${stderr.slice(-2000)}`)));
});

const run = (command, args) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { cwd: root, stdio: 'inherit', shell: false });
  child.on('error', reject);
  child.on('exit', (code, signal) => code === 0
    ? resolve()
    : reject(new Error(`${command} ${args.join(' ')} exited with ${signal || `code ${code}`}`)));
});

try {
  await rm(tempPath, { recursive: true, force: true });
  await mkdir(tempPath, { recursive: true });
  const existingOutput = await capture('./node_modules/.bin/wrangler', [
    'd1', 'execute', database, '--remote', '--command', 'SELECT sd.id, sd.sha256 AS source_sha256, sd.parser_version, wsi.sha256 AS imported_sha256, wsi.status AS import_status FROM source_documents sd LEFT JOIN warehouse_source_imports wsi ON wsi.source_id = sd.id;', '--json',
  ]);
  const completedSnapshots = parseD1CompletedSourceSnapshots(existingOutput);
  const lines = createInterface({ input: createReadStream(inputPath, { encoding: 'utf8' }), crlfDelay: Infinity });
  const skippedSourceIds = new Set();
  const changedSourceLines = skipUnchangedSourceData(lines, completedSnapshots, skippedSourceIds);
  let batches = 0, statements = 0;
  for await (const chunk of warehouseImportBatches(coalesceObservationInserts(changedSourceLines))) {
    const part = join(tempPath, 'batch.sql');
    await writeFile(part, `${chunk.join('\n')}\n`);
    await run('./node_modules/.bin/wrangler', ['d1', 'execute', database, '--remote', '--file', part, '--yes']);
    batches += 1; statements += chunk.length;
    console.log(`Loaded D1 warehouse batch ${batches} (${chunk.length} statements).`);
  }
  console.log(`Loaded ${statements} warehouse statements in ${batches} batches; skipped observation data for ${skippedSourceIds.size} unchanged source snapshots in ${database}.`);
} finally {
  await rm(tempPath, { recursive: true, force: true }).catch(() => {});
}
