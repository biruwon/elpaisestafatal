import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const args = new Map(process.argv.slice(2).reduce((pairs, value, index, values) => {
  if (!value.startsWith('--')) return pairs;
  pairs.push([value.slice(2), values[index + 1] && !values[index + 1].startsWith('--') ? values[index + 1] : 'true']);
  return pairs;
}, []));
const urlValue = args.get('url');
const publisher = args.get('publisher') || 'unclassified';
const allowUnlisted = args.get('allow-unlisted') === 'true';
if (!urlValue) {
  console.error('Usage: npm run knowledge:ingest -- --url https://official.example/source --publisher "Publisher"');
  process.exit(1);
}

const sourceUrl = new URL(urlValue);
const approvedHosts = ['ine.es', 'ec.europa.eu', 'boe.es', 'lamoncloa.gob.es', 'hacienda.gob.es', 'interior.gob.es', 'seg-social.es', 'sepe.es', 'bde.es', 'datos.gob.es', 'congreso.es', 'senado.es', 'poderjudicial.es'];
const approved = approvedHosts.some((host) => sourceUrl.hostname === host || sourceUrl.hostname.endsWith(`.${host}`));
if (!approved && !allowUnlisted) {
  console.error(`Host ${sourceUrl.hostname} is not in the approved source registry. Use --allow-unlisted only for a deliberate discovery source.`);
  process.exit(1);
}

const response = await fetch(sourceUrl, { headers: { accept: 'text/html,application/json,application/pdf;q=0.9,*/*;q=0.5' }, signal: AbortSignal.timeout(15000) });
if (!response.ok) throw new Error(`Source returned ${response.status}`);
const contentType = response.headers.get('content-type') || 'application/octet-stream';
const bytes = Buffer.from(await response.arrayBuffer());
const hash = createHash('sha256').update(bytes).digest('hex');
const root = new URL('../../.local/source-warehouse/', import.meta.url).pathname;
await mkdir(join(root, 'objects'), { recursive: true });
await mkdir(join(root, 'manifests'), { recursive: true });
const objectPath = join(root, 'objects', hash);
try { await readFile(objectPath); } catch { await writeFile(objectPath, bytes); }
const manifest = { id: `source-${hash.slice(0, 16)}`, url: sourceUrl.toString(), publisher, contentType, retrievedAt: new Date().toISOString(), sha256: hash, objectPath, trust: approved ? 'approved-domain' : 'discovery-only' };
await writeFile(join(root, 'manifests', `${manifest.id}.json`), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify(manifest, null, 2));
