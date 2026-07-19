export type ClaimIndexKind = 'claim' | 'topic';

export type ClaimIndexEntry = {
  kind: ClaimIndexKind;
  slug: string;
  title: string;
  href: string;
  aliases: string[];
  keywords: string[];
  assessment?: string;
  answer?: string;
  topic?: string;
  claimType?: string;
  evidenceStrength?: string;
  evidenceIds?: string[];
  sourceRefs?: string[];
  relatedSlugs?: string[];
  whatIsTrue?: string;
  whatIsMissing?: string;
  cannotProve?: string;
  scale?: string;
};

export type RankedClaimIndexEntry = ClaimIndexEntry & {
  score: number;
  confidence: number;
  matchedTerms: string[];
};

const stopWords = new Set([
  'a', 'al', 'de', 'del', 'el', 'en', 'es', 'esta', 'este', 'la', 'las', 'lo', 'los', 'para',
  'por', 'que', 'se', 'su', 'sus', 'un', 'una', 'y', 'o', 'como', 'hay', 'no', 'con', 'más',
  'mas', 'muy', 'han', 'está', 'estan', 'son', 'ser', 'tiene', 'tienen', 'tanto', 'así', 'asi',
]);

const lowSignalWords = new Set(['espana', 'pais', 'gente', 'cosas', 'problema', 'problemas']);

const editDistance = (left: string, right: string): number => {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    const current = [leftIndex + 1];
    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      current.push(Math.min(
        current[rightIndex] + 1,
        previous[rightIndex + 1] + 1,
        previous[rightIndex] + (left[leftIndex] === right[rightIndex] ? 0 : 1),
      ));
    }
    previous = current;
  }
  return previous[right.length];
};

const matchesToken = (queryToken: string, searchableTokens: Set<string>): boolean => {
  if (searchableTokens.has(queryToken)) return true;
  if (queryToken.length < 5) return false;
  const allowedDistance = queryToken.length >= 8 ? 2 : 1;
  return [...searchableTokens].some((token) => Math.abs(token.length - queryToken.length) <= allowedDistance && editDistance(queryToken, token) <= allowedDistance);
};

export const normaliseClaimText = (value: string): string => value
  .toLocaleLowerCase('es')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/ñ/g, 'n')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

export const claimTokens = (value: string): string[] => [...new Set(
  normaliseClaimText(value).split(' ').filter((word) => word.length > 2 && !stopWords.has(word)),
)];

const phraseMatches = (query: string, text: string): number => {
  if (!query || !text) return 0;
  if (text === query) return 100;
  if (text.includes(query)) return 78;
  if (query.includes(text) && text.length > 8) return 68;
  return 0;
};

export const scoreClaimIndexEntry = (value: string, entry: ClaimIndexEntry): RankedClaimIndexEntry => {
  const query = normaliseClaimText(value);
  const queryTokens = claimTokens(query);
  const searchable = [entry.title, ...entry.aliases, ...entry.keywords].map(normaliseClaimText);
  const searchableText = searchable.join(' ');
  const searchableTokens = new Set(claimTokens(searchableText));
  const matchedTokens = queryTokens.filter((token) => matchesToken(token, searchableTokens));
  const matchedTerms = matchedTokens.filter((token) => !lowSignalWords.has(token));
  const weightedMatches = matchedTokens.reduce((total, token) => total + (lowSignalWords.has(token) ? 0.25 : 1), 0);
  const phraseScore = Math.max(...searchable.map((text) => phraseMatches(query, text)), 0);
  const overlapScore = queryTokens.length ? (weightedMatches / queryTokens.length) * 55 : 0;
  const score = Math.round(phraseScore + overlapScore + (entry.kind === 'topic' && matchedTokens.length >= 2 ? 8 : 0));
  return { ...entry, score, confidence: Math.min(1, score / 100), matchedTerms };
};

export const rankClaimIndex = (value: string, entries: ClaimIndexEntry[], limit = 6): RankedClaimIndexEntry[] => {
  if (!normaliseClaimText(value)) return [];
  return entries
    .map((entry) => scoreClaimIndexEntry(value, entry))
    // A shared word such as “España” or “país” is context, not a claim match.
    // Keep weak candidates out of the UI so an unrelated published claim cannot
    // be presented as guidance for an uncovered statement.
    .filter((entry) => entry.score >= 24)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'es'))
    .slice(0, limit);
};

export const isStrongClaimMatch = (entry: RankedClaimIndexEntry | undefined): boolean => Boolean(
  entry && entry.kind === 'claim' && entry.score >= 68,
);
