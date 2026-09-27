import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join } from 'node:path';

const root = new URL('../../', import.meta.url).pathname;
const warehouseRoot = join(root, '.local/source-warehouse');
const inputPath = join(warehouseRoot, 'warehouse-load.sql');
const tempPath = join(warehouseRoot, 'd1-import');
const database = process.env.WAREHOUSE_D1_DATABASE || 'elpaisestafatal-ops';
const batchSize = 80;

const run = (command, args) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { cwd: root, stdio: 'inherit', shell: false });
  child.on('error', reject);
  child.on('exit', (code, signal) => code === 0
    ? resolve()
    : reject(new Error(`${command} ${args.join(' ')} exited with ${signal || `code ${code}`}`)));
});

try {
  const sql = await readFile(inputPath, 'utf8');
  await mkdir(tempPath, { recursive: true });
  await rm(tempPath, { recursive: true, force: true });
  await mkdir(tempPath, { recursive: true });
  const statements = sql.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('/*'));
  const chunks = [];
  for (let offset = 0; offset < statements.length; offset += batchSize) chunks.push(statements.slice(offset, offset + batchSize));
  for (const [index, chunk] of chunks.entries()) {
    const part = join(tempPath, `part-${String(index + 1).padStart(5, '0')}.sql`);
    await writeFile(part, `${chunk.join('\n')}\n`);
    await run('./node_modules/.bin/wrangler', ['d1', 'execute', database, '--remote', '--file', part, '--yes']);
    console.log(`Loaded D1 warehouse batch ${index + 1}/${chunks.length} (${chunk.length} statements).`);
  }
  console.log(`Loaded ${statements.length} idempotent warehouse statements into ${database}.`);
} finally {
  await rm(tempPath, { recursive: true, force: true }).catch(() => {});
}
