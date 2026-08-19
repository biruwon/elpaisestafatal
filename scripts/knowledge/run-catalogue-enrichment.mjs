import { readFile, writeFile } from 'node:fs/promises';
import { discoverOfficialDocuments } from './official-discovery.mjs';
import { enrichTrustedWebResults, searchTrustedWeb } from './trusted-web-discovery.mjs';

const input = process.env.CATALOGUE_ENRICHMENT_INPUT || '.local/catalogue-enrichment-queue.json';
const output = process.env.CATALOGUE_ENRICHMENT_OUTPUT || '.local/catalogue-enrichment-results.json';
const limit = Math.max(1, Number(process.env.CATALOGUE_ENRICHMENT_LIMIT || 25));
const concurrency = Math.max(1, Math.min(8, Number(process.env.CATALOGUE_ENRICHMENT_CONCURRENCY || 4)));
const queue = JSON.parse(await readFile(input, 'utf8'));
const previous = await readFile(output, 'utf8').then(JSON.parse).catch(() => ({ results: [] }));
const normaliseSlug = (value) => String(value || '').replace(/^['"]|['"]$/g, '');
const retryModel = process.env.CATALOGUE_ENRICHMENT_RETRY_MODEL === '1';
const completed = new Set((previous.results || []).filter((item) => !retryModel || item.state !== 'model').map((item) => normaliseSlug(item.slug)));
const pending = (queue.queue || []).filter((item) => !completed.has(normaliseSlug(item.slug))).slice(0, limit);
const results = [...(previous.results || []).filter((item) => !retryModel || item.state !== 'model')];
const enrich = async (item) => {
  const slug = normaliseSlug(item.slug);
  const query = `${item.claim} España datos oficiales ${item.topics.join(' ')}`.trim();
  const alternateQuery = `${item.claim.replace(/^[¿¡]|[?!¡!]+$/g, '')} España ${item.topics.join(' ')}`.trim();
  let official = await discoverOfficialDocuments(query, 3);
  if (!official.length && alternateQuery !== query) official = await discoverOfficialDocuments(alternateQuery, 3);
  let trusted = [];
  if (!official.length && process.env.BRAVE_SEARCH_TOKEN) {
    trusted = await searchTrustedWeb({ queries: [query], token: process.env.BRAVE_SEARCH_TOKEN, limit: 3 });
    trusted = await enrichTrustedWebResults(trusted, { query, max: 3 });
  }
  const sources = [...official.map((entry) => ({ url: entry.url, title: entry.title, publisher: entry.source?.publisher || 'Fuente oficial', excerpt: entry.excerpt || '', kind: 'official-lead' })), ...trusted.map((entry) => ({ url: entry.url, title: entry.title, publisher: entry.publisher, excerpt: entry.excerpt || '', kind: 'trusted-lead' }))];
  return { slug, claim: item.claim, state: sources.some((source) => source.excerpt) ? 'sourced' : 'model', query, sources, reason: sources.length ? undefined : 'no-source-lead', note: 'A sourced state is only eligible for promotion after proposition/evidence materialization gates pass.' };
};
for (let offset = 0; offset < pending.length; offset += concurrency) {
  const batch = await Promise.all(pending.slice(offset, offset + concurrency).map(enrich));
  results.push(...batch);
  await writeFile(output, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
  for (const item of batch) console.log(`${item.slug}: ${item.sources.length ? 'source leads found' : 'no source lead'}`);
}
console.log(`Enrichment run complete: processed ${pending.length}, total results ${results.length}.`);
