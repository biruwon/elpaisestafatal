import { catalogueEntries, type CatalogueEntry } from '../../src/data/catalogue';
import { normaliseClaimText } from '../../src/data/claimIndex';

const tokens = (value: string): Set<string> => new Set(normaliseClaimText(value).split(' ').filter((token) => token.length > 2));

const score = (query: string, entry: CatalogueEntry): number => {
  const normalized = normaliseClaimText(query);
  const phrases = [entry.claim, ...entry.aliases].map(normaliseClaimText);
  if (phrases.includes(normalized)) return 1;
  const queryTokens = tokens(query);
  if (!queryTokens.size) return 0;
  return Math.max(...phrases.map((phrase) => {
    const phraseTokens = tokens(phrase);
    const overlap = [...queryTokens].filter((token) => phraseTokens.has(token)).length;
    return overlap / Math.max(queryTokens.size, phraseTokens.size);
  }), 0);
};

export const publishedEntryFor = (query: string): CatalogueEntry | undefined => {
  const ranked = catalogueEntries
    .filter((entry) => entry.visibility === 'searchable' || entry.visibility === 'browsable')
    .map((entry) => ({ entry, score: score(query, entry) }))
    .filter((item) => item.score >= 0.78)
    .sort((left, right) => right.score - left.score);
  return ranked[0]?.entry;
};
