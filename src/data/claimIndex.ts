import { semanticFamilyKeys, semanticQuerySignature } from '../lib/knowledge/querySignature';

export type ClaimIndexKind = 'claim' | 'topic';

export type ClaimIndexEntry = {
  kind: ClaimIndexKind;
  slug: string;
  title: string;
  href: string;
  aliases: string[];
  keywords: string[];
  semanticSignatures?: Array<{ signature: string; phrase: string }>;
  semanticFamilyKeys?: string[];
  assessment?: string;
  answer?: string;
  topic?: string;
  claimType?: string;
  evidenceStrength?: string;
  evidenceIds?: string[];
  propositionIds?: string[];
  sourceRefs?: string[];
  sourceLinks?: Array<{ id: string; title: string; url: string }>;
  relatedSlugs?: string[];
  whatIsTrue?: string;
  whatIsMissing?: string;
  cannotProve?: string;
  scale?: string;
  visual?: {
    key?: { value: string; label: string; period: string };
    comparison?: { labels: string[]; values: number[]; label: string; unit: string };
  };
};

export type RankedClaimIndexEntry = ClaimIndexEntry & {
  score: number;
  confidence: number;
  matchedTerms: string[];
  semanticFamilyMatch: boolean;
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
  return [...searchableTokens].some((token) => {
    if (Math.abs(token.length - queryToken.length) > allowedDistance) return false;
    if (queryToken.length === token.length && [...queryToken].some((_, index) => index < queryToken.length - 1 && queryToken[index] === token[index + 1] && queryToken[index + 1] === token[index] && queryToken.slice(0, index) === token.slice(0, index) && queryToken.slice(index + 2) === token.slice(index + 2))) return true;
    return editDistance(queryToken, token) <= allowedDistance;
  });
};

const numberWords: Record<string, string> = {
  cero: '0', uno: '1', una: '1', dos: '2', tres: '3', cuatro: '4', cinco: '5',
  seis: '6', siete: '7', ocho: '8', nueve: '9', diez: '10', once: '11', doce: '12',
  trece: '13', catorce: '14', quince: '15', veinte: '20', cien: '100', ciento: '100',
};

const normalizeNumberWords = (value: string): string => value.replace(/\b(cero|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|veinte|cien|ciento)\b/g, (word) => numberWords[word] || word);

export const normaliseClaimText = (value: string): string => normalizeNumberWords(value
  .toLocaleLowerCase('es')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/ñ/g, 'n'))
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

const numericTokens = (value: string): string[] => value.match(/\b\d+(?:[.,]\d+)?\b/g) || [];

const yearTokens = (value: string): string[] => value.match(/\b(?:19|20)\d{2}\b/g) || [];

const compatibleNumericContext = (query: string, candidate: string): boolean => {
  const queryNumbers = numericTokens(query);
  const candidateNumbers = numericTokens(candidate);
  if (queryNumbers.length && candidateNumbers.length && !queryNumbers.some((number) => candidateNumbers.includes(number))) return false;
  const queryYears = yearTokens(query);
  const candidateYears = yearTokens(candidate);
  return !(queryYears.length && candidateYears.length && !queryYears.some((year) => candidateYears.includes(year)));
};

const isSpecificSemanticSignature = (signature: string): boolean => {
  const parts = signature.split('|');
  return parts.some((part) => part.startsWith('relation:'))
    || parts.filter((part) => part.startsWith('concept:')).length >= 2
    || parts.filter((part) => part.startsWith('term:')).length >= 2;
};

export const scoreClaimIndexEntry = (value: string, entry: ClaimIndexEntry, querySemanticSignatureValue = semanticQuerySignature(value), familyKeyCounts?: Map<string, number>, semanticSignatureCounts?: Map<string, number>): RankedClaimIndexEntry => {
  const query = normaliseClaimText(value);
  const queryTokens = claimTokens(query);
  const searchablePhrases = [entry.title, ...entry.aliases].map(normaliseClaimText);
  const searchable = [...searchablePhrases, ...entry.keywords.map(normaliseClaimText)];
  const searchableText = searchable.join(' ');
  const searchableTokens = new Set(claimTokens(searchableText));
  const matchedTokens = queryTokens.filter((token) => matchesToken(token, searchableTokens));
  const matchedTerms = matchedTokens.filter((token) => !lowSignalWords.has(token));
  const weightedMatches = matchedTokens.reduce((total, token) => total + (lowSignalWords.has(token) ? 0.25 : 1), 0);
  const phraseScore = Math.max(...searchablePhrases.map((text) => phraseMatches(query, text)), 0);
  const overlapScore = queryTokens.length ? (weightedMatches / queryTokens.length) * 55 : 0;
  const candidateSemanticSignatures = entry.semanticSignatures?.length
    ? entry.semanticSignatures
    : searchablePhrases.map((phrase) => ({ signature: semanticQuerySignature(phrase), phrase }));
  const queryFamilyKeys = semanticFamilyKeys(querySemanticSignatureValue);
  const candidateFamilyKeys = entry.semanticFamilyKeys?.length
    ? entry.semanticFamilyKeys
    : [...new Set(candidateSemanticSignatures.flatMap(({ signature }) => semanticFamilyKeys(signature)))];
  const semanticFamilyMatch = Boolean(
    querySemanticSignatureValue
    && isSpecificSemanticSignature(querySemanticSignatureValue)
    && entry.kind === 'claim'
    && candidateSemanticSignatures.some(({ signature, phrase }) => (
      compatibleNumericContext(query, phrase)
      && (
        (querySemanticSignatureValue === signature && (semanticSignatureCounts?.get(signature) ?? 1) === 1)
        || (
          queryFamilyKeys.length > 0
          && queryFamilyKeys.some((key) => candidateFamilyKeys.includes(key) && (familyKeyCounts?.get(key) ?? 1) === 1)
        )
      )
    ))
  );
  const score = Math.round(Math.max(
    phraseScore + overlapScore + (entry.kind === 'topic' && matchedTokens.length >= 2 ? 8 : 0),
    semanticFamilyMatch ? 82 : 0,
  ));
  return { ...entry, score, confidence: Math.min(1, score / 100), matchedTerms, semanticFamilyMatch };
};

export const rankClaimIndex = (value: string, entries: ClaimIndexEntry[], limit = 6): RankedClaimIndexEntry[] => {
  if (!normaliseClaimText(value)) return [];
  const querySemanticSignatureValue = semanticQuerySignature(value);
  const familyKeyCounts = new Map<string, number>();
  const semanticSignatureCounts = new Map<string, number>();
  for (const entry of entries.filter((item) => item.kind === 'claim')) {
    const signatures = entry.semanticSignatures?.length
      ? entry.semanticSignatures.map(({ signature }) => signature)
      : [entry.title, ...entry.aliases].map((phrase) => semanticQuerySignature(phrase));
    const keys = entry.semanticFamilyKeys?.length
      ? entry.semanticFamilyKeys
      : [...new Set(signatures.flatMap((signature) => semanticFamilyKeys(signature)))];
    for (const key of keys) familyKeyCounts.set(key, (familyKeyCounts.get(key) || 0) + 1);
    for (const signature of new Set(signatures)) semanticSignatureCounts.set(signature, (semanticSignatureCounts.get(signature) || 0) + 1);
  }
  return entries
    .map((entry) => scoreClaimIndexEntry(value, entry, querySemanticSignatureValue, familyKeyCounts, semanticSignatureCounts))
    // A shared word such as “España” or “país” is context, not a claim match.
    // Keep weak candidates out of the UI so an unrelated published claim cannot
    // be presented as guidance for an uncovered statement.
    .filter((entry) => entry.score >= 24)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'es'))
    .slice(0, limit);
};

export const isStrongClaimMatch = (entry: RankedClaimIndexEntry | undefined): boolean => Boolean(
  entry && entry.kind === 'claim' && entry.score >= 68 && entry.semanticFamilyMatch,
);
