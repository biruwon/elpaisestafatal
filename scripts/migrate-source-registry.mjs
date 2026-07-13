import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const concerns = await readFile(join(root, 'src/data/concerns.ts'), 'utf8');
const topics = ['politica','vivienda','empleo','inmigracion','sanidad','economia','corrupcion','juventud','seguridad','impuestos','desigualdad'];
const sourceRecords = new Map();

function slug(value) {
  return value.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 72);
}
function unquote(value) { return value.replace(/^['"]|['"]$/g, '').replace(/\\'/g, "'"); }

for (const topic of topics) {
  const start = concerns.indexOf(`slug: '${topic}'`);
  if (start < 0) continue;
  const end = concerns.indexOf("slug: '", start + 8);
  const block = concerns.slice(start, end < 0 ? concerns.length : end);
  const pattern = /\{\s*label:\s*(['"])(.*?)\1,\s*publisher:\s*(['"])(.*?)\3,\s*url:\s*(['"])(.*?)\5,\s*date:\s*(['"])(.*?)\7\s*\}/gs;
  let match;
  while ((match = pattern.exec(block))) {
    const title = unquote(match[2]);
    const url = unquote(match[6]);
    const date = unquote(match[8]);
    const id = `${topic}-${slug(title)}`;
    sourceRecords.set(id, { id, title, url, date, type: 'existing-investigation-source' });
  }
}

await mkdir(join(root, 'content/sources'), { recursive: true });
await mkdir(join(root, 'content/evidence'), { recursive: true });
for (const source of sourceRecords.values()) {
  const safe = (value) => String(value).replace(/\n/g, ' ').replace(/:/g, ' -');
  await writeFile(join(root, `content/sources/${source.id}.md`), ['---', `id: ${source.id}`, `title: ${JSON.stringify(safe(source.title))}`, `url: ${source.url}`, `date: ${JSON.stringify(safe(source.date))}`, `type: ${source.type}`, '---', '', 'Source record migrated from the existing investigation source inventory.'].join('\n') + '\n');
  await writeFile(join(root, `content/evidence/${source.id}.md`), ['---', `id: ${source.id}`, 'kind: official-report', `sourceIds: ["${source.id}"]`, `period: ${JSON.stringify(safe(source.date))}`, 'geography: España', 'unit: source reference', '---', '', 'Reusable source evidence. The original claim-specific interpretation and limitation remain on the claim page.'].join('\n') + '\n');
}
const claimsDir = join(root, 'content/claims');
const claimFiles = (await import('node:fs/promises')).readdir(claimsDir);
for (const file of await claimFiles) {
  if (!file.endsWith('.md')) continue;
  const filePath = join(claimsDir, file);
  let raw = await readFile(filePath, 'utf8');
  if (!/^status: published$/m.test(raw)) continue;
  const topic = raw.match(/^sourceTopic: ([^\n]+)$/m)?.[1];
  if (!topic) continue;
  const ids = [...sourceRecords.keys()].filter((id) => id.startsWith(`${topic}-`));
  if (!ids.length) continue;
  raw = raw.replace(/^sourceRefs: .*$/m, `sourceRefs: ${JSON.stringify(ids)}`);
  raw = raw.replace(/^evidenceIds: .*$/m, `evidenceIds: ${JSON.stringify(ids)}`);
  await writeFile(filePath, raw);
}
console.log(`Migrated ${sourceRecords.size} source/evidence records.`);
