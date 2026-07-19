import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { sourceRegistry } from './source-registry.mjs';

const args = new Map(process.argv.slice(2).reduce((pairs, value, index, values) => {
  if (!value.startsWith('--')) return pairs;
  pairs.push([value.slice(2), values[index + 1] && !values[index + 1].startsWith('--') ? values[index + 1] : 'true']);
  return pairs;
}, []));
const configPath = args.get('config') || process.env.SOURCE_REFRESH_CONFIG || '.local/source-refresh.json';
let config;
try { config = JSON.parse(await readFile(configPath, 'utf8')); } catch {
  console.log(`No refresh configuration found at ${configPath}. Create it with {"ine":["https://..."]}.`);
  process.exit(0);
}

const byId = new Map(sourceRegistry.map((source) => [source.id, source]));
const today = new Date();
const dateValue = (offsetDays = 0) => {
  const value = new Date(today);
  value.setUTCDate(value.getUTCDate() + offsetDays);
  return value.toISOString().slice(0, 10).replaceAll('-', '');
};
const expandUrl = (url) => String(url).replaceAll('{today}', dateValue()).replaceAll('{yesterday}', dateValue(-1));
const jobs = Object.entries(config).flatMap(([sourceId, urls]) => {
  const source = byId.get(sourceId);
  if (!source) throw new Error(`Unknown source registry id: ${sourceId}`);
  if (!Array.isArray(urls)) throw new Error(`Refresh URLs for ${sourceId} must be an array`);
  return urls.map((url) => ({ sourceId, url: expandUrl(url) }));
});
if (!jobs.length) { console.log('Refresh configuration contains no URLs.'); process.exit(0); }

for (const job of jobs) {
  console.log(`Refreshing ${job.sourceId}: ${job.url}`);
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/knowledge/ingest-source.mjs', '--url', job.url], { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`Ingestion failed for ${job.url} (${code})`)));
  });
}
console.log(`Refreshed ${jobs.length} configured source resource(s).`);
