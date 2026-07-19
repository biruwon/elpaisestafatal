import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const searchEndpoint = 'https://www.boe.es/buscar/redirector.php';
const moncloaRssEndpoint = 'https://www.lamoncloa.gob.es/Paginas/rss.aspx?tipo=16';
const dataCatalogueEndpoint = 'https://datos.gob.es/apidata/catalog/dataset/title/';
const cacheTtlMs = 5 * 60 * 1000;
const documentCacheTtlMs = 24 * 60 * 60 * 1000;
const cache = new Map();
const documentCache = new Map();
const persistentCachePath = join(new URL('../../.local/', import.meta.url).pathname, 'official-discovery-cache.json');
let persistentCachePromise;

const loadPersistentCache = async () => {
  if (persistentCachePromise) return persistentCachePromise;
  persistentCachePromise = readFile(persistentCachePath, 'utf8').then((raw) => {
    const saved = JSON.parse(raw);
    for (const [key, item] of Object.entries(saved?.entries || {})) {
      if (item && item.expiresAt > Date.now() && Array.isArray(item.results)) cache.set(key, item);
    }
    for (const [key, item] of Object.entries(saved?.documents || {})) {
      if (item?.expiresAt > Date.now() && item.document?.url) documentCache.set(key, item);
    }
  }).catch(() => { /* A missing or malformed derived cache is rebuilt from official sources. */ });
  return persistentCachePromise;
};

const persistCache = async () => {
  const entries = Object.fromEntries([...cache.entries()].slice(-100).map(([key, item]) => [key, item]));
  const documents = Object.fromEntries([...documentCache.entries()].slice(-500).map(([key, item]) => [key, item]));
  await mkdir(new URL('../../.local/', import.meta.url).pathname, { recursive: true });
  await writeFile(persistentCachePath, JSON.stringify({ version: 2, entries, documents }));
};

const normalise = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, ' ').trim();
const stopWords = new Set(['como', 'esta', 'este', 'para', 'pero', 'que', 'sus', 'tiene', 'una', 'uno', 'en', 'el', 'la', 'los', 'las', 'un', 'del', 'de', 'y', 'o', 'a', 'por', 'con', 'segun', 'dicen', 'dice', 'grupo', 'insiste', 'he', 'hay', 'datos', 'más', 'mas', 'todo', 'va', 'peor', 'verdad', 'cierto', 'cierta', 'mi', 'me', 'creo', 'esto', 'eso']);
const tokens = (value) => [...new Set(normalise(value).split(' ').filter((token) => token.length > 2 && !stopWords.has(token)))].slice(0, 8);
const entityTerms = new Set(['gobierno', 'presidencia', 'ministerio', 'educacion', 'justicia', 'hacienda', 'interior', 'sanidad', 'empleo', 'vivienda', 'ayuntamiento', 'congreso', 'senado', 'banco', 'seguridad', 'transicion']);
const decodeHtml = (value) => String(value || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&#(d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&(aacute|eacute|iacute|oacute|uacute|ntilde|uuml|Aacute|Eacute|Iacute|Oacute|Uacute|Ntilde|Uuml);/g, (_, entity) => ({ aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', uuml: 'ü', Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ', Uuml: 'Ü' })[entity] || entity);
const stripHtml = (value) => decodeHtml(String(value || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());

export const parseBoeSearchResults = (html, query, limit = 5) => {
  const wanted = tokens(query);
  if (wanted.length < 2) return [];
  const explicitYear = /\b([12]\d{3})\b/.test(String(query));
  const freshnessCutoff = new Date().getUTCFullYear() - 5;
  const results = [];
  const pattern = /<li\s+class="resultado-busqueda">([\s\S]*?)<a\s+href="(?:\.\.\/)?buscar\/doc\.php\?id=([^"]+)"/gi;
  for (const match of html.matchAll(pattern)) {
    const fragment = match[1];
    const paragraphs = [...fragment.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((item) => stripHtml(item[1])).filter(Boolean);
    const title = paragraphs.at(-1) || '';
    const department = paragraphs[0] || '';
    const publication = paragraphs[1] || '';
    if (!title) continue;
    const searchable = normalise([department, publication, title].join(' '));
    const matchedTerms = wanted.filter((token) => searchable.includes(token));
    const publishedYear = Number(publication.match(/\b([12]\d{3})\b/)?.[1] || 0);
    const recency = publishedYear ? Math.max(0, 1 - Math.abs(new Date().getUTCFullYear() - publishedYear) / 10) : 0;
    results.push({
      id: match[2],
      title: title.slice(0, 500),
      department: department.slice(0, 240),
      publication: publication.slice(0, 240),
      publishedYear: publishedYear || undefined,
      url: `https://www.boe.es/buscar/doc.php?id=${encodeURIComponent(match[2])}`,
      matchedTerms,
      score: matchedTerms.length / wanted.length,
      searchScore: matchedTerms.length / wanted.length + recency * 0.2,
    });
    if (results.length >= limit * 5) break;
  }
  return results.filter((item) => item.matchedTerms.length >= 2 && item.score >= 0.5 && (explicitYear || (item.publishedYear && item.publishedYear >= freshnessCutoff))).sort((left, right) => right.searchScore - left.searchScore || left.title.localeCompare(right.title, 'es')).slice(0, limit);
};

export const parseMoncloaRssItems = (xml, limit = 8) => {
  const items = [];
  for (const match of String(xml || '').matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const fragment = match[1];
    const read = (name) => stripHtml(fragment.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'))?.[1] || '');
    const link = decodeHtml(fragment.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] || '').trim();
    const pubDate = read('pubDate');
    if (!link.startsWith('https://www.lamoncloa.gob.es/')) continue;
    items.push({ title: read('title'), link, pubDate, publishedAt: pubDate ? new Date(pubDate).toISOString() : undefined });
    if (items.length >= limit) break;
  }
  return items;
};

const catalogueText = (value) => Array.isArray(value)
  ? value.map((item) => item?._value || item?.value || '').filter(Boolean).join(' ')
  : String(value?._value || value?.value || value || '');

export const parseDatosGobCatalogResults = (payload, query, limit = 5) => {
  const wanted = tokens(query);
  if (wanted.length < 2 || !Array.isArray(payload?.result?.items)) return [];
  return payload.result.items.map((item) => {
    const title = catalogueText(item.title).trim();
    const description = catalogueText(item.description).trim();
    const searchable = normalise(`${title} ${description}`);
    const matchedTerms = wanted.filter((token) => searchable.includes(token));
    const url = String(item._about || item.about || '').trim();
    return {
      id: `datos-gob-${Buffer.from(url || `${title}-${description}`).toString('base64url')}`,
      title: title.slice(0, 500),
      description: description.slice(0, 700),
      url,
      publisher: catalogueText(item.publisher || item.organization).slice(0, 240),
      matchedTerms,
      score: wanted.length ? matchedTerms.length / wanted.length : 0,
      searchScore: wanted.length ? matchedTerms.length / wanted.length : 0,
    };
  }).filter((item) => item.title && item.url.startsWith('https://datos.gob.es/') && item.matchedTerms.length >= 2 && item.score >= 0.5)
    .sort((left, right) => right.searchScore - left.searchScore || left.title.localeCompare(right.title, 'es'))
    .slice(0, limit);
};

export const discoverDatosGobCatalog = async (query, limit = 3) => {
  const wanted = tokens(query);
  if (wanted.length < 2) return [];
  const queryTerms = [...new Set([wanted.slice(0, 3).join(' '), wanted.slice(-2).join(' ')])];
  const deadline = Date.now() + 5000;
  const results = [];
  for (const term of queryTerms) {
    const remaining = deadline - Date.now();
    if (remaining < 250) break;
    try {
      const url = `${dataCatalogueEndpoint}${encodeURIComponent(term)}.json?_pageSize=5`;
      const response = await fetch(url, { headers: { accept: 'application/json', 'user-agent': 'elpaisestafatal-local-resolver/1.0' }, signal: AbortSignal.timeout(Math.min(2500, remaining)) });
      if (!response.ok) continue;
      results.push(...parseDatosGobCatalogResults(await response.json(), query, limit));
    } catch { /* Catalogue discovery is optional and never blocks the official path. */ }
  }
  return [...new Map(results.map((item) => [item.url, item])).values()]
    .sort((left, right) => right.searchScore - left.searchScore)
    .slice(0, limit);
};

const extractPageText = (html) => stripHtml(String(html || '').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')).slice(0, 500_000);
const extractHeading = (html, fallback) => stripHtml(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || fallback).slice(0, 500);
const parseEuroAmount = (value) => {
  const numeric = String(value || '').replace(/\./g, '').replace(',', '.');
  const amount = Number(numeric);
  return Number.isFinite(amount) ? amount : undefined;
};
export const parseBudgetTransferExcerpt = (text) => {
  const match = String(text || '').match(/por importe de\s+([\d.]+(?:,\d+)?)\s+euros,?\s+desde el\s+(.+?),\s+al\s+(.+?)\s+para financiar\s+(.+?)(?:\.|$)/i);
  if (!match) return undefined;
  const amount = parseEuroAmount(match[1]);
  if (!amount) return undefined;
  return { type: 'budget_transfer', amount, currency: 'EUR', originEntity: match[2].trim(), destinationEntity: match[3].trim(), purpose: match[4].trim() };
};
export const extractRelevantExcerpt = (text, wanted, maxLength = 420) => {
  const sentences = String(text || '').replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+/).filter(Boolean);
  const ranked = sentences.map((sentence, index) => ({ sentence, index, matches: wanted.filter((token) => normalise(sentence).includes(token)).length }))
    .filter((item) => item.matches > 0)
    .sort((left, right) => right.matches - left.matches || left.index - right.index);
  if (!ranked.length) return '';
  const selected = ranked.slice(0, 2).sort((left, right) => left.index - right.index).map((item) => item.sentence).join(' ');
  return selected.length <= maxLength ? selected : `${selected.slice(0, maxLength - 1).trimEnd()}…`;
};

export const discoverMoncloaDocuments = async (query, limit = 3) => {
  const wanted = tokens(query);
  if (wanted.length < 2) return [];
  try {
    const rssResponse = await fetch(moncloaRssEndpoint, { headers: { accept: 'application/rss+xml,text/xml', 'user-agent': 'elpaisestafatal-local-resolver/1.0' }, signal: AbortSignal.timeout(5000) });
    if (!rssResponse.ok) return [];
    const items = parseMoncloaRssItems((await rssResponse.text()).slice(0, 1_000_000), 4);
    const deadline = Date.now() + 8000;
    const pages = await Promise.all(items.map(async (item) => {
      try {
        const remaining = deadline - Date.now();
        if (remaining < 250) return null;
        const response = await fetch(item.link, { headers: { accept: 'text/html', 'user-agent': 'elpaisestafatal-local-resolver/1.0' }, signal: AbortSignal.timeout(Math.min(3500, remaining)) });
        if (!response.ok) return null;
        const html = (await response.text()).slice(0, 2_000_000);
        const pageText = extractPageText(html);
        const text = normalise(pageText);
        const matchedTerms = wanted.filter((token) => text.includes(token));
        const score = matchedTerms.length / wanted.length;
        if (matchedTerms.length < 2 || score < 0.5) return null;
        return { id: `moncloa-${Buffer.from(item.link).toString('base64url')}`, title: extractHeading(html, item.title), url: item.link, publication: item.pubDate, publishedYear: Number(item.pubDate.match(/\b([12]\d{3})\b/)?.[1] || 0), matchedTerms, excerpt: extractRelevantExcerpt(pageText, matchedTerms), finding: parseBudgetTransferExcerpt(pageText), score, searchScore: score + 0.2 };
      } catch { return null; }
    }));
    return pages.filter(Boolean).sort((left, right) => right.searchScore - left.searchScore).slice(0, limit);
  } catch { return []; }
};

const enrichBoeResults = async (results, limit = 3) => {
  const deadline = Date.now() + 5000;
  const enriched = await Promise.all(results.slice(0, limit).map(async (item) => {
    try {
      const remaining = deadline - Date.now();
      if (remaining < 250) return item;
      const response = await fetch(item.url, { headers: { accept: 'text/html', 'user-agent': 'elpaisestafatal-local-resolver/1.0' }, signal: AbortSignal.timeout(Math.min(2500, remaining)) });
      if (!response.ok) return item;
      const pageText = extractPageText((await response.text()).slice(0, 2 * 1024 * 1024));
      return { ...item, excerpt: extractRelevantExcerpt(pageText, item.matchedTerms), finding: parseBudgetTransferExcerpt(pageText) };
    } catch { return item; }
  }));
  return enriched;
};

const cacheKey = (query) => tokens(query).join(' ');
const documentMatch = (query, document) => {
  const wanted = tokens(query);
  const searchable = normalise([document.title, document.excerpt, JSON.stringify(document.finding || {})].join(' '));
  const matchedTerms = wanted.filter((token) => searchable.includes(token));
  const score = wanted.length ? matchedTerms.length / wanted.length : 0;
  return matchedTerms.length >= 2 && score >= 0.5 ? { ...document, matchedTerms, score, searchScore: score + 0.15 } : null;
};
const findCachedDocuments = (query, limit = 3) => [...documentCache.values()]
  .map((item) => documentMatch(query, item.document, limit))
  .filter(Boolean)
  .sort((left, right) => right.searchScore - left.searchScore)
  .slice(0, limit);

export const discoverBoeDocuments = async (query, limit = 3) => {
  const key = cacheKey(query);
  if (!key || key.split(' ').length < 2) return [];
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    if (cached.results.some((item) => !item.excerpt)) cached.results = await enrichBoeResults(cached.results, limit);
    return cached.results;
  }
  if (cached) cache.delete(key);
  try {
    const terms = key.split(' ');
    const entities = terms.filter((term) => entityTerms.has(term));
    const searchQueries = [...new Set([key, entities.slice(0, 3).join(' '), terms.slice(0, 3).join(' '), terms.slice(-3).join(' '), terms.slice(0, 2).join(' ')].filter((value) => value.split(' ').length >= 2))];
    const deadline = Date.now() + 8000;
    let results = [];
    for (const searchQuery of searchQueries) {
      const remaining = deadline - Date.now();
      if (remaining < 250) break;
      const url = new URL(searchEndpoint);
      url.searchParams.set('accion', 'Buscar');
      url.searchParams.set('bd', 'boe');
      url.searchParams.set('texto', searchQuery);
      const response = await fetch(url, { redirect: 'follow', headers: { accept: 'text/html', 'user-agent': 'elpaisestafatal-local-resolver/1.0' }, signal: AbortSignal.timeout(Math.min(5000, remaining)) });
      if (!response.ok) continue;
      const html = (await response.text()).slice(0, 2 * 1024 * 1024);
      results = parseBoeSearchResults(html, key, limit);
      if (results.length) break;
    }
    results = await enrichBoeResults(results, limit);
    cache.set(key, { results, expiresAt: Date.now() + cacheTtlMs });
    while (cache.size > 100) cache.delete(cache.keys().next().value);
    return results;
  } catch { return []; }
};

export const discoverOfficialDocuments = async (query, limit = 3) => {
  const wanted = tokens(query);
  const hasEntity = wanted.some((token) => entityTerms.has(token));
  const hasNumber = /\b\d[\d.,%]*\b/.test(String(query));
  if (wanted.length < 3 && !hasEntity && !hasNumber) return [];
  await loadPersistentCache();
  const key = `official-v1:${cacheKey(query)}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.results.slice(0, limit);
  if (cached) cache.delete(key);
  const cachedDocuments = findCachedDocuments(query, limit);
  if (cachedDocuments.length) {
    const results = cachedDocuments;
    cache.set(key, { results, expiresAt: Date.now() + cacheTtlMs });
    return results;
  }
  const [moncloa, boe, catalogue] = await Promise.all([discoverMoncloaDocuments(query, limit), discoverBoeDocuments(query, limit), discoverDatosGobCatalog(query, limit)]);
  const results = [...moncloa, ...boe, ...catalogue].sort((left, right) => right.searchScore - left.searchScore).slice(0, limit);
  for (const result of results) if (result.url) documentCache.set(result.url, { document: result, expiresAt: Date.now() + documentCacheTtlMs });
  cache.set(key, { results, expiresAt: Date.now() + cacheTtlMs });
  while (cache.size > 100) cache.delete(cache.keys().next().value);
  await persistCache().catch(() => { /* Derived caching must never block a response. */ });
  return results;
};

export const discoveryObservation = (item) => {
  const publisher = item.url.includes('lamoncloa.gob.es') ? 'La Moncloa' : item.url.includes('datos.gob.es') ? 'Datos.gob.es' : 'BOE';
  const sourceKind = item.url.includes('datos.gob.es') ? 'dataset_catalogue' : 'official_publication';
  const publication = String(item.publication || item.publishedAt || '');
  const source = { id: `${publisher.toLocaleLowerCase().replaceAll(' ', '-')}-discovery-${item.id}`, title: `${publisher} · ${item.title}`, url: item.url };
  return {
    id: `discovered-${item.id}`,
    kind: sourceKind,
    sourceKind,
    metric: item.title,
    value: null,
    period: publication.match(/\b(\d{4})\b/)?.[1],
    url: item.url,
    dimensions: { department: item.department, publication },
    dimensionLabels: { department: item.department, publication },
    source,
    score: item.score,
    matchedTerms: item.matchedTerms,
    excerpt: item.excerpt || (item.description ? item.description.slice(0, 420) : ''),
    finding: item.finding,
    evidenceFit: item.score >= 0.67 ? 'direct' : 'qualified',
  };
};
