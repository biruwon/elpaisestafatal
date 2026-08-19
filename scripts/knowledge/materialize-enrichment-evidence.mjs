import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const root = new URL('../../', import.meta.url).pathname;
const input = process.env.CATALOGUE_ENRICHMENT_OUTPUT || path.join(root, '.local/catalogue-enrichment-results.json');
const limit = Math.max(1, Number(process.env.CATALOGUE_MATERIALIZE_LIMIT || 50));
const data = JSON.parse(await readFile(input, 'utf8'));
const claimsDir = path.join(root, 'content/claims');
const sourcesDir = path.join(root, 'content/sources');
const evidenceDir = path.join(root, 'content/evidence');
const propositionsDir = path.join(root, 'content/propositions');
await Promise.all([mkdir(sourcesDir, { recursive: true }), mkdir(evidenceDir, { recursive: true }), mkdir(propositionsDir, { recursive: true })]);

const idFor = (prefix, value) => `${prefix}-${crypto.createHash('sha1').update(value).digest('hex').slice(0, 12)}`;
const quote = (value) => JSON.stringify(String(value || ''));
const appendId = (raw, key, id) => {
  const match = raw.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  if (!match) return raw.replace(/\n---\n/, `\n${key}: [${quote(id)}]\n---\n`);
  let values;
  try { values = JSON.parse(match[1]); } catch { values = []; }
  if (!Array.isArray(values) || values.includes(id)) return raw;
  return raw.replace(match[0], `${key}: ${JSON.stringify([...values, id])}`);
};

let materialized = 0;
for (const result of data.results || []) {
  if (materialized >= limit || result.state !== 'sourced') continue;
  result.slug = String(result.slug || '').replace(/^['"]|['"]$/g, '');
  if (!result.slug) continue;
  const source = (result.sources || []).find((entry) => entry.url && entry.excerpt);
  if (!source) continue;
  const sourceId = idFor('enrichment-source', source.url);
  const evidenceId = idFor('enrichment-evidence', `${result.slug}:${source.url}`);
  const propositionId = idFor('enrichment-proposition', result.slug);
  await writeFile(path.join(sourcesDir, `${sourceId}.md`), `---\nid: ${sourceId}\ntitle: ${quote(source.title || result.claim)}\nurl: ${quote(source.url)}\ndate: ${quote(new Date().toISOString().slice(0, 10))}\ntype: ${source.kind === 'official-lead' ? 'official-lead' : 'trusted-lead'}\nretrievedAt: ${quote(new Date().toISOString())}\nreviewStatus: lead\n---\n\n${source.excerpt}\n\nThis is a retrieved source lead. It requires proposition-level verification before publication as sourced evidence.\n`);
  await writeFile(path.join(evidenceDir, `${evidenceId}.md`), `---\nid: ${evidenceId}\nkind: source-excerpt\nsourceIds: [${quote(sourceId)}]\nperiod: "unspecified"\ngeography: "unspecified"\nunit: "unspecified"\n---\n\nThe retrieved source excerpt is:\n\n> ${String(source.excerpt).replace(/\n/g, '\n> ')}\n\nThe excerpt has not been validated as sufficient to establish the full claim.\n`);
  await writeFile(path.join(propositionsDir, `${propositionId}.json`), JSON.stringify({ id: propositionId, claimSlug: result.slug, text: result.claim, type: 'unverified-enrichment', status: 'lead', evidenceIds: [evidenceId] }, null, 2) + '\n');
  const claimPath = path.join(claimsDir, `${result.slug}.md`);
  let claim = await readFile(claimPath, 'utf8');
  claim = appendId(appendId(appendId(claim, 'sourceRefs', sourceId), 'evidenceIds', evidenceId), 'propositionIds', propositionId);
  await writeFile(claimPath, claim);
  materialized++;
}
console.log(`Materialized ${materialized} enrichment evidence leads. Claims remain model-labelled until promotion gates pass.`);
