import { runtimeCatalogue, type RuntimeCatalogueEntry } from './generated-catalogue';

export type CatalogueEntry = RuntimeCatalogueEntry;
export type RouteKind = 'exact' | 'semantic' | 'family' | 'clarify' | 'none';
export type CatalogueRoute = { entry?: CatalogueEntry; route: RouteKind; family?: string; confidence: number; missingDimensions: string[] };

const normaliseClaimText = (value: string): string => String(value).toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, ' ').trim();

const tokens = (value: string): Set<string> => new Set(normaliseClaimText(value).split(' ').filter((token) => token.length > 2));

const vectorFor = (value: string, size = 64): number[] => {
  const vector = Array.from({ length: size }, () => 0);
  for (const token of normaliseClaimText(value).split(' ').filter((item) => item.length > 2)) {
    let hash = 2166136261;
    for (const char of token) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    vector[Math.abs(hash) % size] += 1;
  }
  const magnitude = Math.hypot(...vector) || 1;
  return vector.map((item) => item / magnitude);
};
const cosine = (left: number[], right: readonly number[]): number => left.reduce((sum, value, index) => sum + value * (right[index] || 0), 0);
const score = (query: string, entry: CatalogueEntry): number => {
  const normalized = normaliseClaimText(query);
  const phrases = [entry.claim, ...entry.aliases].map(normaliseClaimText);
  if (phrases.includes(normalized)) return 1;
  const queryTokens = tokens(query);
  if (!queryTokens.size) return 0;
  const lexical = Math.max(...phrases.map((phrase) => {
    const phraseTokens = tokens(phrase);
    const overlap = [...queryTokens].filter((token) => phraseTokens.has(token)).length;
    return overlap / Math.max(queryTokens.size, phraseTokens.size);
  }), 0);
  return Math.max(lexical, cosine(vectorFor(query), entry.vector));
};

// Model-generated gap records are private research candidates, never public
// answers. They must not win routing merely because their generated wording
// resembles the submitted phrase.
const publicEntries = runtimeCatalogue.entries.filter((entry) => entry.status === 'published' && entry.basis !== 'model' && !entry.slug.startsWith('modelo-'));
const exactIndex = new Map<string, CatalogueEntry>();
const tokenIndex = new Map<string, Set<CatalogueEntry>>();
for (const entry of publicEntries) {
  for (const phrase of [entry.claim, ...entry.aliases]) {
    exactIndex.set(normaliseClaimText(phrase), entry);
    for (const token of tokens(phrase)) {
      const bucket = tokenIndex.get(token) || new Set<CatalogueEntry>();
      bucket.add(entry);
      tokenIndex.set(token, bucket);
    }
  }
}
const candidatesFor = (query: string): CatalogueEntry[] => {
  const candidates = new Set<CatalogueEntry>();
  for (const token of tokens(query)) for (const entry of tokenIndex.get(token) || []) candidates.add(entry);
  return candidates.size ? [...candidates] : publicEntries;
};
const missingDimensions = (query: string): string[] => {
  const missing = [];
  if (!/\b(19|20)\d{2}\b|año|anos|mes|trimestre|periodo|últim/i.test(query)) missing.push('periodo');
  if (!/madrid|barcelona|andaluc|galicia|españa|espana|nacional|barrio|ciudad/i.test(query)) missing.push('territorio');
  return missing;
};

export const routeCatalogueQuery = (query: string, options: { skipClarification?: boolean } = {}): CatalogueRoute => {
  if (!options.skipClarification && /\b(no hay trabajo|no encuentro trabajo|es imposible encontrar trabajo)\b/i.test(query)) return { route: 'clarify', confidence: 1, missingDimensions: ['qué quieres medir: acceso, paro o calidad', 'periodo', 'territorio'] };
  const exact = exactIndex.get(normaliseClaimText(query));
  if (exact) return { entry: exact, route: 'exact', family: exact.family, confidence: 1, missingDimensions: missingDimensions(query) };
  const ranked = candidatesFor(query)
    .map((entry) => ({ entry, score: score(query, entry) }))
    .filter((item) => item.score >= 0.58)
    .sort((left, right) => right.score - left.score);
  const best = ranked[0];
  const second = ranked[1];
  if (!best) return { route: 'none', confidence: 0, missingDimensions: missingDimensions(query) };
  const margin = best.score - (second?.score || 0);
  if (best.score >= 0.88 && margin >= 0.04) return { entry: best.entry, route: 'exact', family: best.entry.family, confidence: best.score, missingDimensions: missingDimensions(query) };
  if (best.score >= 0.7 && margin >= 0.06) return { entry: best.entry, route: 'semantic', family: best.entry.family, confidence: best.score, missingDimensions: missingDimensions(query) };
  if (best.score >= 0.58 && margin >= 0.1) return { entry: best.entry, route: 'family', family: best.entry.family, confidence: best.score, missingDimensions: missingDimensions(query) };
  return { route: 'clarify', confidence: best.score, family: best.entry.family, missingDimensions: missingDimensions(query) };
};

export const publishedEntryFor = (query: string): CatalogueEntry | undefined => routeCatalogueQuery(query).entry;
