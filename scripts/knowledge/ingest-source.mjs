import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { normalizeJsonPayload } from './normalize-json.mjs';
import { sourceForHost } from './source-registry.mjs';
import { connectorForId, connectorSupports, formatForContentType } from './connector-registry.mjs';
import { hasMetric } from './metric-registry.mjs';

const args = new Map(process.argv.slice(2).reduce((pairs, value, index, values) => {
  if (!value.startsWith('--')) return pairs;
  pairs.push([value.slice(2), values[index + 1] && !values[index + 1].startsWith('--') ? values[index + 1] : 'true']);
  return pairs;
}, []));
const urlValue = args.get('url');
const publisher = args.get('publisher') || 'unclassified';
const title = args.get('title') || publisher;
const metricId = args.get('metric-id');
let aliases = [];
try { aliases = args.has('aliases') ? JSON.parse(args.get('aliases')) : []; } catch { aliases = []; }
if (!Array.isArray(aliases)) aliases = [];
const allowUnlisted = args.get('allow-unlisted') === 'true';
if (!urlValue) {
  console.error('Usage: npm run knowledge:ingest -- --url https://official.example/source --publisher "Publisher"');
  process.exit(1);
}
if (metricId && !(await hasMetric(metricId))) {
  console.error(`Unknown metric id: ${metricId}`);
  process.exit(1);
}

const sourceUrl = new URL(urlValue);
const sourceDefinition = sourceForHost(sourceUrl.hostname);
const approved = Boolean(sourceDefinition);
if (!approved && !allowUnlisted) {
  console.error(`Host ${sourceUrl.hostname} is not in the approved source registry. Use --allow-unlisted only for a deliberate discovery source.`);
  process.exit(1);
}

const response = await fetch(sourceUrl, { headers: { accept: 'text/html,application/json,application/pdf;q=0.9,*/*;q=0.5' }, signal: AbortSignal.timeout(15000) });
if (!response.ok) throw new Error(`Source returned ${response.status}`);
const contentType = response.headers.get('content-type') || 'application/octet-stream';
const connector = sourceDefinition?.connector || 'official-document';
if (sourceDefinition && !connectorSupports(connector, contentType)) {
  throw new Error(`Connector ${connector} does not support ${formatForContentType(contentType)} resources`);
}
const bytes = Buffer.from(await response.arrayBuffer());
const hash = createHash('sha256').update(bytes).digest('hex');
const root = new URL('../../.local/source-warehouse/', import.meta.url).pathname;
await mkdir(join(root, 'objects'), { recursive: true });
await mkdir(join(root, 'manifests'), { recursive: true });
const objectPath = join(root, 'objects', hash);
try { await readFile(objectPath); } catch { await writeFile(objectPath, bytes); }
const resolvedPublisher = publisher === 'unclassified' ? sourceDefinition?.publisher || publisher : publisher;
const connectorDefinition = connectorForId(connector);
const manifest = { id: `source-${hash.slice(0, 16)}`, sourceRegistryId: sourceDefinition?.id, schedule: sourceDefinition?.schedule, metricId, url: sourceUrl.toString(), publisher: resolvedPublisher, title, aliases, contentType, retrievedAt: new Date().toISOString(), sha256: hash, objectPath, trust: approved ? sourceDefinition.trustTier : 'discovery-only', connector, parserVersion: connectorDefinition?.parserVersion || 'discovery-v1' };
await writeFile(join(root, 'manifests', `${manifest.id}.json`), JSON.stringify(manifest, null, 2));
let records = [];
if (contentType.includes('json')) {
  try { records = normalizeJsonPayload(JSON.parse(bytes.toString('utf8')), { id: manifest.id, title: manifest.title }); } catch { /* Keep the raw source when it is not a supported JSON shape. */ }
}
if (records.length) {
  manifest.recordCount = records.length;
  manifest.recordPath = join(root, 'records', `${manifest.id}.json`);
  await mkdir(join(root, 'records'), { recursive: true });
  await writeFile(manifest.recordPath, JSON.stringify({ source: manifest, records }, null, 2));
}
await writeFile(join(root, 'manifests', `${manifest.id}.json`), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify(manifest, null, 2));
