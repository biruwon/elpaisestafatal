import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';

const directoryArg = process.env.BACKUP_DIR || process.argv[2] || '';
if (!directoryArg) {
  console.error('Usage: BACKUP_DIR=/path/to/backup npm run backup:artifact:validate');
  process.exit(1);
}
const directory = resolve(directoryArg);

let manifest;
try {
  manifest = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8'));
} catch (error) {
  throw new Error(`Could not read backup manifest: ${error instanceof Error ? error.message : error}`);
}
if (manifest?.schemaVersion !== 1 || !Array.isArray(manifest.entries)) throw new Error('Backup manifest schema is unsupported or incomplete');

const failures = [];
for (const entry of manifest.entries) {
  if (!entry || typeof entry.path !== 'string' || !Number.isInteger(entry.bytes) || !/^[a-f0-9]{64}$/.test(entry.sha256)) {
    failures.push('manifest contains an invalid file entry');
    continue;
  }
  const path = resolve(directory, entry.path);
  if (!path.startsWith(`${directory}/`)) {
    failures.push(`${entry.path}: path escapes backup directory`);
    continue;
  }
  try {
    const contents = await readFile(path);
    const metadata = await stat(path);
    const digest = createHash('sha256').update(contents).digest('hex');
    if (metadata.size !== entry.bytes) failures.push(`${entry.path}: size mismatch`);
    if (digest !== entry.sha256) failures.push(`${entry.path}: SHA-256 mismatch`);
  } catch (error) {
    failures.push(`${entry.path}: missing or unreadable (${error instanceof Error ? error.message : error})`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`Backup artifact valid: ${manifest.entries.length} file entr${manifest.entries.length === 1 ? 'y' : 'ies'} verified.`);
