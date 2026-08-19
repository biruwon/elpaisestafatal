import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const root = new URL('../../', import.meta.url).pathname;
const input = process.env.CATALOGUE_ENRICHMENT_OUTPUT || path.join(root, '.local/catalogue-enrichment-results.json');
const limit = Math.max(1, Number(process.env.CATALOGUE_PROMOTION_LIMIT || 50));
const data = JSON.parse(await readFile(input, 'utf8'));
const stop = new Set('para como desde sobre entre este esta estos estas una uno unos unas que con por del las los una españa datos fuente según tiene han más menos puede todo toda'.split(' '));
const words = (text) => String(text).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').match(/[a-záéíóúñü]{5,}/gi)?.filter((word) => !stop.has(word)) || [];
const idFor = (prefix, value) => `${prefix}-${crypto.createHash('sha1').update(value).digest('hex').slice(0, 12)}`;
const replaceFrontmatter = (raw, key, value) => raw.replace(new RegExp(`^${key}:\\s*.+$`, 'm'), `${key}: ${value}`);
let promoted = 0;
for (const result of data.results || []) {
  if (promoted >= limit || result.state !== 'sourced') continue;
  const slug = String(result.slug || '').replace(/^['"]|['"]$/g, '');
  const source = (result.sources || []).find((entry) => entry.kind === 'official-lead' && entry.url && entry.excerpt);
  if (!slug || !source) continue;
  const claimPath = path.join(root, 'content/claims', `${slug}.md`);
  let claim;
  try { claim = await readFile(claimPath, 'utf8'); } catch { continue; }
  if (!/^basis:\s*model\s*$/m.test(claim) || !/^status:\s*planned\s*$/m.test(claim)) continue;
  const overlap = [...new Set(words(result.claim))].filter((word) => words(source.excerpt).includes(word));
  const claimNumbers = String(result.claim).match(/\d+(?:[.,]\d+)?/g) || [];
  const excerptNumbers = String(source.excerpt).match(/\d+(?:[.,]\d+)?/g) || [];
  if (overlap.length < 2 || claimNumbers.some((number) => !excerptNumbers.includes(number))) continue;
  const sourceId = idFor('enrichment-source', source.url);
  const evidenceId = idFor('enrichment-evidence', `${slug}:${source.url}`);
  const propositionId = idFor('enrichment-proposition', slug);
  claim = replaceFrontmatter(claim, 'basis', 'sourced');
  claim = replaceFrontmatter(claim, 'status', 'published');
  claim = replaceFrontmatter(claim, 'sourceRefs', JSON.stringify([sourceId]));
  claim = replaceFrontmatter(claim, 'evidenceIds', JSON.stringify([evidenceId]));
  claim = replaceFrontmatter(claim, 'propositionIds', JSON.stringify([propositionId]));
  await writeFile(claimPath, claim);
  const sourcePath = path.join(root, 'content/sources', `${sourceId}.md`);
  const evidencePath = path.join(root, 'content/evidence', `${evidenceId}.md`);
  const propositionPath = path.join(root, 'content/propositions', `${propositionId}.json`);
  try { await Promise.all([readFile(sourcePath), readFile(evidencePath), readFile(propositionPath)]); } catch { continue; }
  for (const [file, key, value] of [[sourcePath, 'reviewStatus', 'verified'], [evidencePath, 'kind', 'verified-source-excerpt']]) {
    const raw = await readFile(file, 'utf8');
    await writeFile(file, replaceFrontmatter(raw, key, value));
  }
  const proposition = JSON.parse(await readFile(propositionPath, 'utf8'));
  proposition.status = 'supported';
  await writeFile(propositionPath, JSON.stringify(proposition, null, 2) + '\n');
  promoted++;
  console.log(`Promoted ${slug} using ${sourceId} (${overlap.length} matching claim terms).`);
}
console.log(`Promotion complete: ${promoted} claims upgraded to sourced.`);
