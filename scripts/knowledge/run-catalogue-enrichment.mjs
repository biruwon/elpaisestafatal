import { readFile, writeFile } from 'node:fs/promises';
import { discoverOfficialDocuments } from './official-discovery.mjs';
import { enrichTrustedWebResults, searchTrustedWeb } from './trusted-web-discovery.mjs';

const input = process.env.CATALOGUE_ENRICHMENT_INPUT || '.local/catalogue-enrichment-queue.json';
const output = process.env.CATALOGUE_ENRICHMENT_OUTPUT || '.local/catalogue-enrichment-results.json';
const limit = Math.max(1, Number(process.env.CATALOGUE_ENRICHMENT_LIMIT || 25));
const queue = JSON.parse(await readFile(input, 'utf8'));
const previous = await readFile(output, 'utf8').then(JSON.parse).catch(() => ({ results: [] }));
const completed = new Set((previous.results || []).map((item) => item.slug));
const pending = (queue.queue || []).filter((item) => !completed.has(item.slug)).slice(0, limit);
const results = [...(previous.results || [])];
for (const item of pending) {
  const query = `${item.claim} España datos oficiales ${item.topics.join(' ')}`.trim();
  const official = await discoverOfficialDocuments(query, 3);
  let trusted = [];
  if (!official.length && process.env.BRAVE_SEARCH_TOKEN) {
    trusted = await searchTrustedWeb({ queries: [query], token: process.env.BRAVE_SEARCH_TOKEN, limit: 3 });
    trusted = await enrichTrustedWebResults(trusted, { query, max: 3 });
  }
  const sources = [...official.map((entry) => ({ url: entry.url, title: entry.title, publisher: entry.source?.publisher || 'Fuente oficial', excerpt: entry.excerpt || '', kind: 'official-lead' })), ...trusted.map((entry) => ({ url: entry.url, title: entry.title, publisher: entry.publisher, excerpt: entry.excerpt || '', kind: 'trusted-lead' }))];
  results.push({ slug: item.slug, claim: item.claim, state: sources.some((source) => source.excerpt) ? 'sourced' : 'model', query, sources, note: 'A sourced state is only eligible for promotion after proposition/evidence materialization gates pass.' });
  await writeFile(output, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
  console.log(`${item.slug}: ${sources.length ? 'source leads found' : 'no source lead'}`);
}
console.log(`Enrichment run complete: processed ${pending.length}, total results ${results.length}.`);
