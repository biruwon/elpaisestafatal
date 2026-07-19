import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../dist/', import.meta.url).pathname;
const forbidden = [
  /ollama/i,
  /127\.0\.0\.1/i,
  /localhost/i,
  /host\.docker\.internal/i,
  /LOCAL_CLASSIFIER/i,
  /WHISPER_COMMAND/i,
  /CLOUDFLARE_API_TOKEN/i,
  /\bcors\b/i,
];
const files = [];
const walk = async (directory) => {
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (/\.(html|js|css|json|xml|txt)$/i.test(entry.name)) files.push(path);
  }
};
await walk(root);
const failures = [];
for (const file of files) {
  const text = await readFile(file, 'utf8');
  for (const pattern of forbidden) if (pattern.test(text)) failures.push(`${file}: public surface contains ${pattern}`);
}
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`Public surface audit passed: ${files.length} built assets contain no provider or local-runtime details.`);
