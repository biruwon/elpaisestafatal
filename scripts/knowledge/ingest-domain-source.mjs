import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseDelimited, parseDomainPayload } from './domain-connectors.mjs';

const args = new Map(process.argv.slice(2).reduce((pairs, value, index, values) => {
  if (value.startsWith('--')) pairs.push([value.slice(2), values[index + 1] && !values[index + 1].startsWith('--') ? values[index + 1] : 'true']);
  return pairs;
}, []));
const domain = args.get('domain');
const url = args.get('url');
const title = args.get('title') || `${domain || 'domain'} source`;
if (!domain || !url) throw new Error('Usage: node scripts/knowledge/ingest-domain-source.mjs --domain immigration_crime --url https://official.example/data --title "Official data"');
const sourceUrl = new URL(url);
if (sourceUrl.protocol !== 'https:') throw new Error('Domain sources must use HTTPS');
const response = await fetch(sourceUrl, { headers: { accept: 'application/json,text/csv,text/plain;q=0.9' }, signal: AbortSignal.timeout(30000) });
if (!response.ok) throw new Error(`Source returned ${response.status}`);
const contentType = response.headers.get('content-type') || '';
const bytes = Buffer.from(await response.arrayBuffer());
if (bytes.length > 25 * 1024 * 1024) throw new Error('Source exceeds 25 MB limit');
const text = bytes.toString('utf8');
let payload;
try { payload = contentType.includes('json') || /^\s*[\[{]/.test(text) ? JSON.parse(text) : parseDelimited(text); } catch { throw new Error('Source is not valid JSON or delimited text'); }
const hash = createHash('sha256').update(bytes).digest('hex');
const source = { id: `domain-${hash.slice(0, 16)}`, title, url: sourceUrl.toString() };
const records = parseDomainPayload(domain, payload, source);
const root = new URL('../../.local/source-warehouse/', import.meta.url).pathname;
await mkdir(join(root, 'records'), { recursive: true });
const outputPath = join(root, 'records', `${source.id}.json`);
await writeFile(outputPath, JSON.stringify({ source: { ...source, domain, contentType, sha256: hash, retrievedAt: new Date().toISOString(), recordCount: records.length }, records }, null, 2));
console.log(JSON.stringify({ domain, source: source.id, recordCount: records.length, outputPath }, null, 2));
