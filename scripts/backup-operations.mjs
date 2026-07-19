import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = new URL('../', import.meta.url).pathname;
const stamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
const destination = process.env.BACKUP_DIR || join(root, '.local/backups', stamp);
await mkdir(destination, { recursive: true });

const copyIfPresent = async (source, target) => {
  try { await cp(join(root, source), join(destination, target), { recursive: true }); return true; } catch { return false; }
};

const copied = [];
for (const [source, target] of [
  ['.local/source-warehouse', 'source-warehouse'],
  ['config/source-refresh.json', 'source-refresh.json'],
  ['config/metric-registry.json', 'metric-registry.json'],
  ['wrangler.jsonc', 'wrangler.jsonc'],
  ['migrations', 'migrations'],
]) if (await copyIfPresent(source, target)) copied.push(target);

const d1Path = join(destination, 'd1.sql');
try {
  await execFileAsync('npx', ['wrangler', 'd1', 'export', 'elpaisestafatal-ops', '--remote', '--skip-confirmation', '--output', d1Path], { cwd: root, timeout: 120_000, maxBuffer: 2 * 1024 * 1024 });
  copied.push('d1.sql');
} catch (error) {
  if (process.env.BACKUP_REQUIRE_D1 === '1') throw new Error(`D1 export failed: ${error instanceof Error ? error.message : error}`);
  console.warn('D1 export skipped; run with BACKUP_REQUIRE_D1=1 to make it mandatory.');
}

if (process.env.WAREHOUSE_DATABASE_URL) {
  try {
    await execFileAsync('pg_dump', ['--no-owner', '--no-privileges', '--file', join(destination, 'postgres.sql'), process.env.WAREHOUSE_DATABASE_URL], { cwd: root, timeout: 120_000, maxBuffer: 2 * 1024 * 1024 });
    copied.push('postgres.sql');
  } catch (error) {
    if (process.env.BACKUP_REQUIRE_POSTGRES === '1') throw new Error(`PostgreSQL export failed: ${error instanceof Error ? error.message : error}`);
    console.warn('PostgreSQL export skipped; run with BACKUP_REQUIRE_POSTGRES=1 to make it mandatory.');
  }
}

const manifest = { createdAt: new Date().toISOString(), destination, files: copied, d1: copied.includes('d1.sql'), postgres: copied.includes('postgres.sql') };
await writeFile(join(destination, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`Operations backup created: ${destination}`);
console.log(`Included: ${copied.join(', ') || 'no local files'}`);
