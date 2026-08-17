import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseCrimeSeriesText, parseDelimited, parseDomainPayload, parseHealthEmergencyReportText, parseImvWorkbookBuffer, parsePdfText, parsePublicHousingActionsText, parseSpreadsheetBuffer, parseWildfireReportText } from './domain-connectors.mjs';
import { sourceForHost } from './source-registry.mjs';

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
const fetchSource = async (candidate) => {
  const response = await fetch(candidate, { headers: { accept: 'application/json,text/csv,text/plain;q=0.9,text/html;q=0.8' }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Source returned ${response.status}`);
  const contentType = response.headers.get('content-type') || '';
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 25 * 1024 * 1024) throw new Error('Source exceeds 25 MB limit');
  return { candidate, contentType, bytes };
};
const extractLinkedDataUrls = (html, baseUrl) => [...String(html).matchAll(/(?:href|data-url)=["']([^"']+)["']/gi)]
  .map((match) => { try { return new URL(match[1], baseUrl); } catch { return null; } })
  .filter((candidate) => candidate && candidate.protocol === 'https:' && (candidate.pathname + candidate.search).match(/\.(?:csv|json|xlsx?|pdf)(?:$|[?#])|(?:csv|json|xlsx?|pdf)/i))
  .filter((candidate) => candidate.hostname === baseUrl.hostname || sourceForHost(candidate.hostname))
  .filter((candidate, index, all) => all.findIndex((item) => item.href === candidate.href) === index)
  .slice(0, 12);
let fetched = await fetchSource(sourceUrl);
if (fetched.contentType.includes('html')) {
  const linked = extractLinkedDataUrls(fetched.bytes.toString('utf8'), sourceUrl);
  let selected = null;
  for (const candidate of linked) {
    try {
      const attempt = await fetchSource(candidate);
      if (!attempt.contentType.includes('html')) { selected = attempt; break; }
    } catch { /* Continue through the bounded export list. */ }
  }
  if (!selected) throw new Error(`Landing page contained no accessible CSV/JSON export (${linked.length} candidates)`);
  fetched = selected;
}
const response = { contentType: fetched.contentType, bytes: fetched.bytes, url: fetched.candidate };
const contentType = response.contentType;
const bytes = response.bytes;
const text = bytes.toString('utf8');
let payload;
try {
  if (domain === 'immigration_benefits' && (contentType.includes('spreadsheet') || /\.xlsx?(?:$|[?#])/i.test(response.url.pathname))) payload = { __records: await parseImvWorkbookBuffer(bytes, { id: 'pending', title, url: response.url.toString() }) };
  else if (contentType.includes('spreadsheet') || /\.xlsx?(?:$|[?#])/i.test(response.url.pathname)) payload = await parseSpreadsheetBuffer(bytes);
  else if (contentType.includes('pdf') || /\.pdf(?:$|[?#])/i.test(response.url.pathname)) {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: bytes });
    const extracted = await parser.getText();
    await parser.destroy();
    if (domain === 'wildfire_statistics') payload = { __records: parseWildfireReportText(extracted.text, { id: 'pending', title, url: response.url.toString() }) };
    else if (domain === 'health_emergency_wait') payload = { __records: parseHealthEmergencyReportText(extracted.text, { id: 'pending', title, url: response.url.toString() }) };
    else payload = parsePdfText(extracted.text);
} else if (domain === 'immigration_crime' && /Series anuales|Hechos conocidos por comunidades/i.test(text)) payload = parseCrimeSeriesText(text);
  else if (domain === 'public_housing_allocation' && /Número de viviendas|Numero de viviendas/i.test(text)) payload = parsePublicHousingActionsText(text);
  else payload = contentType.includes('json') || /^\s*[\[{]/.test(text) ? JSON.parse(text) : parseDelimited(text);
} catch (error) { throw new Error(`Source could not be parsed as JSON, CSV, XLSX, or PDF: ${error instanceof Error ? error.message : String(error)}`); }
const hash = createHash('sha256').update(bytes).digest('hex');
const source = { id: `domain-${hash.slice(0, 16)}`, title, publisher: title, url: response.url.toString(), landingUrl: sourceUrl.toString() };
const records = payload?.__records
  ? payload.__records.map((record) => ({ ...record, sourceId: source.id, id: record.id.replace('pending', source.id) }))
  : parseDomainPayload(domain, payload, source);
const root = new URL('../../.local/source-warehouse/', import.meta.url).pathname;
await mkdir(join(root, 'records'), { recursive: true });
const outputPath = join(root, 'records', `${source.id}.json`);
await writeFile(outputPath, JSON.stringify({ source: { ...source, domain, contentType, sha256: hash, retrievedAt: new Date().toISOString(), recordCount: records.length }, records }, null, 2));
console.log(JSON.stringify({ domain, source: source.id, recordCount: records.length, outputPath }, null, 2));
