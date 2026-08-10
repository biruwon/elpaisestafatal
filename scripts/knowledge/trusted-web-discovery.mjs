import { liveSourceForHost } from './source-registry.mjs';

const braveEndpoint = 'https://api.search.brave.com/res/v1/web/search';
const normalise = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

const roleForHost = (hostname) => {
  const host = hostname.replace(/^www\./, '').toLocaleLowerCase('es');
  const source = liveSourceForHost(host);
  if (source) return { role: source.role, sourceRegistryId: source.id, publisher: source.publisher };
  return undefined;
};

// External search receives a neutral, bounded formulation. Private contact
// details and loaded allegation wording never leave the local resolver.
export const neutralWebQuery = (value) => normalise(value)
  .replace(/https?:\/\/\S+/gi, ' ')
  .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, ' ')
  .replace(/\b\+?\d[\d\s().-]{7,}\b/g, ' ')
  .replace(/\b(?:viola(?:cion|ciones)?|violando|invasion|asesinato|asesinar|culpable|ladrones?|terroristas?)\b/gi, 'reportado incidente')
  .replace(/["'“”«»]/g, ' ')
  .replace(/\s+/g, ' ').trim().slice(0, 360);

export const searchTrustedWeb = async ({ queries = [], token, limit = 6, fetchImpl = fetch } = {}) => {
  if (!token) return [];
  const results = [];
  for (const rawQuery of [...new Set(queries)].slice(0, 3)) {
    const query = neutralWebQuery(rawQuery);
    if (query.length < 8) continue;
    try {
      const url = new URL(braveEndpoint);
      url.searchParams.set('q', query);
      url.searchParams.set('country', 'ES');
      url.searchParams.set('search_lang', 'es');
      url.searchParams.set('count', String(Math.min(6, limit)));
      const response = await fetchImpl(url, { headers: { accept: 'application/json', 'x-subscription-token': token }, signal: AbortSignal.timeout(5000) });
      if (!response.ok) continue;
      const payload = await response.json();
      for (const item of payload.web?.results || []) {
        let parsed;
        try { parsed = new URL(item.url || item.link); } catch { continue; }
        const source = roleForHost(parsed.hostname);
        if (!source) continue;
        results.push({
          id: `web-${Buffer.from(parsed.toString()).toString('base64url').slice(0, 32)}`,
          title: String(item.title || parsed.hostname).slice(0, 240),
          url: parsed.toString(),
          publisher: source.publisher,
          role: source.role,
          sourceRegistryId: source.sourceRegistryId,
          description: String(item.description || '').slice(0, 420),
          retrievedAt: new Date().toISOString(),
        });
        if (results.length >= limit) break;
      }
    } catch { /* Live discovery is optional and must never block the resolver. */ }
    if (results.length >= limit) break;
  }
  return [...new Map(results.map((item) => [item.url, item])).values()].slice(0, limit);
};

export const trustedWebObservation = (item) => ({
  id: `discovered-${item.id}`,
  kind: 'trusted_web_source',
  sourceKind: item.role === 'primary' ? 'official_publication' : 'corroboration_report',
  metric: item.title,
  value: null,
  url: item.url,
  source: { id: item.id, title: item.title, url: item.url, publisher: item.publisher, role: item.role, retrievedAt: item.retrievedAt },
  excerpt: item.description,
  evidenceFit: item.role === 'primary' ? 'qualified' : 'context',
});

const stripHtml = (value) => String(value || '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ').trim();

const relevantExcerpt = (text, query, maximum = 700) => {
  const wanted = normalise(query).split(' ').filter((token) => token.length > 3).slice(0, 8);
  const sentences = stripHtml(text).split(/(?<=[.!?])\s+/).filter(Boolean);
  const ranked = sentences.map((sentence, index) => ({ sentence, index, matches: wanted.filter((token) => normalise(sentence).includes(token)).length }))
    .filter((item) => item.matches > 0).sort((left, right) => right.matches - left.matches || left.index - right.index);
  const selected = ranked.slice(0, 2).sort((left, right) => left.index - right.index).map((item) => item.sentence).join(' ');
  return (selected || stripHtml(text)).slice(0, maximum);
};

export const enrichTrustedWebResults = async (items = [], { query = '', fetchImpl = fetch, max = 6 } = {}) => {
  const enriched = [];
  for (const item of items.slice(0, max)) {
    let excerpt = item.description || '';
    try {
      let target = item.url;
      let response;
      for (let redirect = 0; redirect <= 2; redirect += 1) {
        response = await fetchImpl(target, { redirect: 'manual', headers: { accept: 'text/html,application/xhtml+xml,text/plain;q=0.8' }, signal: AbortSignal.timeout(5000) });
        if (![301, 302, 303, 307, 308].includes(response.status)) break;
        const location = response.headers?.get?.('location') || response.headers?.location;
        if (!location) { response = undefined; break; }
        const next = new URL(location, target);
        if (next.protocol !== 'https:' || !roleForHost(next.hostname)) { response = undefined; break; }
        target = next.toString();
      }
      if (response.ok) excerpt = relevantExcerpt((await response.text()).slice(0, 1_000_000), query) || excerpt;
    } catch { /* Search metadata remains useful when the page is unavailable. */ }
    enriched.push({ ...item, excerpt });
  }
  return enriched;
};
