import { cp, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
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

const collectFiles = async (path, prefix = '') => {
  const entries = [];
  for (const entry of await readdir(path, { withFileTypes: true })) {
    if (entry.name === 'manifest.json') continue;
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const fullPath = join(path, entry.name);
    if (entry.isDirectory()) entries.push(...await collectFiles(fullPath, relativePath));
    else if (entry.isFile()) entries.push({ path: relativePath, fullPath });
  }
  return entries;
};

const files = [];
for (const item of await collectFiles(destination)) {
  const contents = await readFile(item.fullPath);
  const metadata = await stat(item.fullPath);
  files.push({ path: item.path, bytes: metadata.size, sha256: createHash('sha256').update(contents).digest('hex') });
}
files.sort((left, right) => left.path.localeCompare(right.path));

const manifest = { schemaVersion: 1, createdAt: new Date().toISOString(), destination, files: copied, entries: files, d1: copied.includes('d1.sql') };
await writeFile(join(destination, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`Operations backup created: ${destination}`);
console.log(`Included: ${copied.join(', ') || 'no local files'}`);
