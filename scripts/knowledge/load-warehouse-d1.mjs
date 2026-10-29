import { mkdir, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { coalesceObservationInserts, warehouseImportBatches } from './warehouse-import.mjs';
import { join } from 'node:path';

const root = new URL('../../', import.meta.url).pathname;
const warehouseRoot = join(root, '.local/source-warehouse');
const inputPath = process.env.WAREHOUSE_D1_INPUT || join(warehouseRoot, 'warehouse-load.sql');
const tempPath = join(warehouseRoot, 'd1-import');
const database = process.env.WAREHOUSE_D1_DATABASE || 'elpaisestafatal-ops';

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
  const lines = createInterface({ input: createReadStream(inputPath, { encoding: 'utf8' }), crlfDelay: Infinity });
  let batches = 0, statements = 0;
  for await (const chunk of warehouseImportBatches(coalesceObservationInserts(lines))) {
    const part = join(tempPath, 'batch.sql');
    await writeFile(part, `${chunk.join('\n')}\n`);
    await run('./node_modules/.bin/wrangler', ['d1', 'execute', database, '--remote', '--file', part, '--yes']);
    batches += 1; statements += chunk.length;
    console.log(`Loaded D1 warehouse batch ${batches} (${chunk.length} statements).`);
  }
  console.log(`Loaded ${statements} idempotent warehouse statements in ${batches} batches into ${database}.`);
} finally {
  await rm(tempPath, { recursive: true, force: true }).catch(() => {});
}
