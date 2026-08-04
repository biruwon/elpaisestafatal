import { normalizeBoeLegalText } from './normalize-xml.mjs';
import { selectCurrentLegalRule } from './legal-rules.mjs';

const endpoint = 'https://www.boe.es/datosabiertos/api/legislacion-consolidada';
const cache = new Map();
const cacheTtlMs = 24 * 60 * 60 * 1000;
const stopWords = new Set(['como', 'esta', 'este', 'para', 'pero', 'que', 'sus', 'tiene', 'una', 'uno', 'del', 'los', 'las', 'con', 'por', 'segun', 'ley', 'legal', 'permite', 'permitir', 'prohibe', 'prohibido', 'obligatorio', 'derecho', 'espana', 'puede', 'cualquiera', 'normativa', 'norma', 'exige', 'condicion', 'condiciones']);
const normalise = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, ' ').trim();
const tokens = (value) => [...new Set(normalise(value).split(' ').filter((token) => token.length > 2 && !stopWords.has(token)))].slice(0, 6);
const asArray = (value) => Array.isArray(value) ? value : value && typeof value === 'object' ? [value] : [];
const stem = (value) => normalise(value).replace(/(amientos|imientos|aciones|adores|adoras|mente|acion|ucion|idades|idad|icos|icas|ico|ica|es|os|as|ar|er|ir)$/i, '').slice(0, 10);

// People describe legal situations with everyday words, while BOE titles and
// articles usually use formal terminology. Expand only high-signal legal
// concepts and keep the expansion bounded so discovery never becomes a broad
// web search or a substitute for evidence validation.
const legalTermExpansions = [
  { triggers: ['okup', 'ocupacion', 'echar', 'desalojo'], terms: ['ocupacion', 'desahucio', 'arrendamiento'] },
  { triggers: ['alquiler', 'casero', 'inquilino'], terms: ['arrendamiento', 'arrendador', 'desahucio'] },
  { triggers: ['inmigr', 'extranj', 'residencia'], terms: ['extranjeria', 'inmigracion', 'residencia'] },
  { triggers: ['dato personal', 'privacidad'], terms: ['proteccion', 'datos', 'personales'] },
  { triggers: ['despid', 'trabajo', 'empleo', 'jefe'], terms: ['laboral', 'trabajadores', 'estatuto'] },
  { triggers: ['violencia machista', 'violencia mujer'], terms: ['violencia', 'genero', 'integral'] },
  { triggers: ['herencia', 'heredar'], terms: ['sucesiones', 'donaciones'] },
  { triggers: ['multa', 'sancion'], terms: ['sancionador', 'infracciones'] },
  { triggers: ['fianza', 'deposito alquiler'], terms: ['arrendamiento', 'fianza', 'deposito'] },
  { triggers: ['custodia', 'divorcio', 'pension alimenticia'], terms: ['familia', 'menores', 'alimentos', 'custodia'] },
  { triggers: ['irpf', 'declaracion renta', 'hacienda'], terms: ['tributario', 'fiscal', 'renta'] },
  { triggers: ['garantia', 'devolver compra', 'tienda', 'consumidor'], terms: ['consumo', 'consumidores', 'usuarios'] },
  { triggers: ['carnet', 'velocidad', 'conducir', 'trafico'], terms: ['trafico', 'seguridad vial', 'circulacion'] },
  { triggers: ['paro', 'prestacion', 'pension', 'cotizacion'], terms: ['seguridad social', 'prestacion', 'desempleo', 'cotizaciones'] },
];

const triggerMatches = (text, trigger) => {
  const wanted = normalise(trigger);
  if (wanted.includes(' ')) return (` ${text} `).includes(` ${wanted} `);
  return new RegExp(`\\b${wanted.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}[a-z0-9]*\\b`).test(text);
};

const expansionTermsForQuery = (query) => {
  const text = normalise(query);
  return legalTermExpansions
    .filter(({ triggers }) => triggers.some((trigger) => triggerMatches(text, trigger)))
    .flatMap(({ terms }) => terms);
};

const expandedTermsForQuery = (query) => expansionTermsForQuery(query).flatMap((term) => tokens(term));
const expandedLegalTokens = (query) => [...new Set([...tokens(query), ...expandedTermsForQuery(query)])].slice(0, 12);

const includesAny = (value, values) => values.some((item) => String(value || '').includes(item));
const publicReuseArticles = new Map([
  ['artículo 3', 0.45],
  ['articulo 3', 0.45],
  ['artículo 4', 0.75],
  ['articulo 4', 0.75],
  ['artículo 7', 0.2],
  ['articulo 7', 0.2],
  ['artículo 8', 0.7],
  ['articulo 8', 0.7],
  ['artículo 9', 0.45],
  ['articulo 9', 0.45],
  ['artículo 10', 0.25],
  ['articulo 10', 0.25],
]);

export const isPublicReuseQuery = (query) => {
  const text = normalise(query);
  const hasReuse = includesAny(text, ['reutiliz', 'usar', 'utilizar', 'datos abiertos']);
  const hasPublicMaterial = includesAny(text, ['documentos public', 'informacion public', 'dato public', 'datos abiertos']);
  return hasReuse && hasPublicMaterial;
};

const publicReuseScore = (record, query) => {
  if (!isPublicReuseQuery(query)) return 0;
  const metric = normalise(record.metric);
  const excerpt = normalise(record.excerpt);
  const articleBonus = publicReuseArticles.get(metric) || 0;
  const operativeTextBonus = includesAny(metric, ['anexo', 'disposicion adicional', 'disposicion transitoria']) ? -0.35 : 0;
  const directTextBonus = includesAny(excerpt, ['reutilizacion de los documentos', 'condiciones de reutilizacion', 'sin sujecion a condiciones']) ? 0.25 : 0;
  return articleBonus + operativeTextBonus + directTextBonus;
};

export const titleQueries = (query) => {
  if (isPublicReuseQuery(query)) {
    return [
      JSON.stringify({ query: { query_string: { query: 'titulo:(reutiliz* and informacion*)' }, range: {} }, sort: [] }),
      JSON.stringify({ query: { query_string: { query: 'titulo:(reutiliz* and sector*)' }, range: {} }, sort: [] }),
    ];
  }
  const originalTerms = tokens(query).map(stem).filter((item) => item.length >= 4);
  const formalTerms = expandedTermsForQuery(query).map(stem).filter((item) => item.length >= 4);
  const wanted = [...new Set([...originalTerms, ...formalTerms])];
  const pairs = [];
  for (let left = 0; left < wanted.length; left += 1) for (let right = left + 1; right < wanted.length; right += 1) pairs.push([wanted[left], wanted[right]]);
  const formalSet = new Set(formalTerms);
  const originalSet = new Set(originalTerms);
  const pairScore = (pair) => pair.reduce((score, term) => score + (formalSet.has(term) ? 4 : 0) + (originalSet.has(term) ? 3 : 0) + term.length / 100, 0);
  return pairs.sort((left, right) => pairScore(right) - pairScore(left)).slice(0, 3).map((pair) => JSON.stringify({ query: { query_string: { query: `titulo:(${pair.map((item) => `${item}*`).join(' and ')})` }, range: {} }, sort: [] }));
};

export const consolidatedQuery = (query) => {
  return titleQueries(query)[0] || null;
};

export const rankConsolidatedLaws = (items, query, limit = 2) => {
  const wanted = expandedLegalTokens(query);
  return asArray(items).filter((item) => item?.identificador && item?.titulo && item.vigencia_agotada !== 'S' && item.estado_consolidacion?.texto !== 'Desactualizado').map((item) => {
    const title = normalise(item.titulo);
    const titleMatches = wanted.filter((token) => title.includes(stem(token)));
    const finalised = item.estado_consolidacion?.texto === 'Finalizado';
    const amendmentPenalty = /\b(modifica|modificaci[oó]n|transposici[oó]n|desarrolla)\b/i.test(item.titulo) ? 0.08 : 0;
    const baseLawPreference = 1 / Math.max(20, item.titulo.length);
    const rank = normalise(item.rango?.texto);
    const authorityPreference = /constitucion|ley organica|decreto legislativo|^ley$/.test(rank) ? 0.14 : /decreto ley/.test(rank) ? 0.1 : /^real decreto$/.test(rank) ? 0.03 : 0;
    return { item, score: titleMatches.length / Math.max(1, wanted.length) + (finalised ? 0.1 : 0) + authorityPreference + baseLawPreference - amendmentPenalty };
  }).sort((left, right) => right.score - left.score || String(right.item.fecha_actualizacion || '').localeCompare(String(left.item.fecha_actualizacion || ''))).slice(0, limit).map(({ item }) => item);
};

export const rankLegalRules = (records, query, limit = 6) => {
  const wanted = expandedLegalTokens(query);
  const current = new Map();
  for (const record of records.filter((item) => item.kind === 'legal_rule')) {
    const existing = current.get(record.dimensions?.blockId);
    if (!existing || selectCurrentLegalRule([existing, record]) === record) current.set(record.dimensions?.blockId, record);
  }
  return [...current.values()].map((record) => {
    const searchable = normalise(`${record.metric} ${record.excerpt}`);
    const matchedTerms = wanted.filter((token) => searchable.includes(token) || searchable.includes(stem(token)));
    const lexicalScore = matchedTerms.length / Math.max(1, wanted.length);
    const topicScore = publicReuseScore(record, query);
    return { ...record, matchedTerms, score: lexicalScore + topicScore, lexicalScore, topicScore };
  }).filter((item) => item.matchedTerms.length >= 2 && item.lexicalScore >= 0.4).sort((left, right) => right.score - left.score || String(right.period || '').localeCompare(String(left.period || ''))).slice(0, limit);
};

const fetchJson = async (url, timeout) => {
  const response = await fetch(url, { headers: { accept: 'application/json', 'user-agent': 'elpaisestafatal-local-resolver/1.0' }, signal: AbortSignal.timeout(timeout) });
  if (!response.ok) return null;
  return response.json();
};

const fetchLawRules = async (law, query, timeout) => {
  const url = `${endpoint}/id/${encodeURIComponent(law.identificador)}/texto`;
  const response = await fetch(url, { headers: { accept: 'application/xml', 'user-agent': 'elpaisestafatal-local-resolver/1.0' }, signal: AbortSignal.timeout(timeout) });
  if (!response.ok) return [];
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared > 2 * 1024 * 1024) return [];
  const xml = await response.text();
  if (xml.length > 2 * 1024 * 1024) return [];
  const source = { id: `boe-live-${law.identificador}`, title: law.titulo, url, metricId: 'official_publication' };
  return rankLegalRules(normalizeBoeLegalText(xml, source), query).map((record) => ({
    ...record,
    dimensions: { ...record.dimensions, jurisdiction: law.ambito?.texto, lawIdentifier: law.identificador, repealed: law.estatus_derogacion === 'S', consolidationStatus: law.estado_consolidacion?.texto },
    source: { id: source.id, title: `${record.metric} · ${law.titulo}`, url },
    evidenceFit: record.score >= 0.67 ? 'direct' : 'qualified',
    freshness: 'fresh',
  }));
};

export const discoverBoeLegalRules = async (query, limit = 6) => {
  const searches = titleQueries(query);
  if (!searches.length) return [];
  const key = normalise(query);
  const cached = cache.get(key);
  if (cached?.expiresAt > Date.now()) return cached.records.slice(0, limit);
  const deadline = Date.now() + 7000;
  try {
    const candidates = [];
    for (const search of searches) {
      const remaining = deadline - Date.now();
      if (remaining < 1000) break;
      const url = new URL(endpoint);
      url.searchParams.set('query', search);
      url.searchParams.set('limit', '10');
      const payload = await fetchJson(url, Math.min(2500, remaining));
      candidates.push(...asArray(payload?.data));
    }
    const unique = [...new Map(candidates.map((item) => [item.identificador, item])).values()];
    const laws = rankConsolidatedLaws(unique, query, 2);
    const records = (await Promise.all(laws.map((law) => fetchLawRules(law, query, Math.max(750, deadline - Date.now()))))).flat().sort((left, right) => right.score - left.score).slice(0, limit);
    cache.set(key, { records, expiresAt: Date.now() + cacheTtlMs });
    while (cache.size > 100) cache.delete(cache.keys().next().value);
    return records;
  } catch { return []; }
};
