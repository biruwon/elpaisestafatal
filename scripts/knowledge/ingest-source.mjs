import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { normalizeJsonPayload } from './normalize-json.mjs';
import { normalizeXmlPayload } from './normalize-xml.mjs';
import { sourceForHost } from './source-registry.mjs';
import { connectorForId, connectorSupports, formatForContentType } from './connector-registry.mjs';
import { hasMetric } from './metric-registry.mjs';
import { isBoeLegalDiscoveryUrl } from './refresh-utils.mjs';

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

const accept = sourceUrl.hostname.endsWith('boe.es') && sourceUrl.pathname.includes('/texto/bloque/')
  ? 'application/xml'
  : 'application/json,text/html,application/xml;q=0.9,application/pdf;q=0.8,*/*;q=0.4';
const response = await fetch(sourceUrl, { headers: { accept }, signal: AbortSignal.timeout(15000) });
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
const schedule = isBoeLegalDiscoveryUrl(sourceUrl) ? 'weekly' : sourceDefinition?.schedule;
// The same payload can legitimately back multiple metric views (for example,
// two Eurostat datasets with identical current observations). Include the
// metric and URL in the manifest identity so one refresh cannot overwrite the
// other metric's record while still deduplicating the raw object by content hash.
const manifestId = createHash('sha256').update(`${metricId || ''}|${sourceUrl.toString()}|${hash}`).digest('hex');
const manifest = { id: `source-${manifestId.slice(0, 16)}`, sourceRegistryId: sourceDefinition?.id, schedule, metricId, url: sourceUrl.toString(), publisher: resolvedPublisher, title, aliases, contentType, retrievedAt: new Date().toISOString(), sha256: hash, objectPath, trust: approved ? sourceDefinition.trustTier : 'discovery-only', connector, parserVersion: connectorDefinition?.parserVersion || 'discovery-v1' };
await writeFile(join(root, 'manifests', `${manifest.id}.json`), JSON.stringify(manifest, null, 2));
let records = [];
const parseDelimited = (text) => {
  const sample = text.split(/\r?\n/, 1)[0] || '';
  const delimiter = [';', '\t', ','].sort((left, right) => (sample.split(right).length - 1) - (sample.split(left).length - 1))[0];
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"' && text[index + 1] === '"' && quoted) { field += '"'; index += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === delimiter && !quoted) { row.push(field.trim()); field = ''; continue; }
    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field.trim()); field = '';
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
      continue;
    }
    field += char;
  }
  if (field || row.length) { row.push(field.trim()); if (row.some((value) => value !== '')) rows.push(row); }
  const [header, ...data] = rows;
  if (!header?.length) return [];
  return data.slice(0, 100000).map((values, index) => ({ id: `${manifest.id}-row-${index + 1}`, sourceId: manifest.id, metricId, dimensions: Object.fromEntries(header.map((key, column) => [key || `column_${column + 1}`, values[column] ?? ''])), retrievedAt: manifest.retrievedAt }));
};
if (contentType.includes('json')) {
  try { records = normalizeJsonPayload(JSON.parse(bytes.toString('utf8')), { id: manifest.id, title: manifest.title }); } catch { /* Keep the raw source when it is not a supported JSON shape. */ }
}
if (contentType.includes('csv') || contentType.includes('tab-separated')) records = parseDelimited(bytes.toString('utf8'));
if (contentType.includes('xml')) {
  try { records = normalizeXmlPayload(bytes.toString('utf8'), { id: manifest.id, title: manifest.title, url: sourceUrl.toString(), metricId }); } catch { /* Keep unsupported XML as a source snapshot. */ }
}
if (records.length) {
  manifest.recordCount = records.length;
  manifest.recordPath = join(root, 'records', `${manifest.id}.json`);
  await mkdir(join(root, 'records'), { recursive: true });
  await writeFile(manifest.recordPath, JSON.stringify({ source: manifest, records }, null, 2));
}
await writeFile(join(root, 'manifests', `${manifest.id}.json`), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify(manifest, null, 2));
