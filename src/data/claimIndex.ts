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
  exactPhraseMatch: boolean;
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
  .trim()
  // Equivalent record-language used in Spanish claims. Keep this limited to
  // an unambiguous temporal construction; it must not turn ordinary “nunca”
  // statements into historical records.
  .replace(/\bque ha existido nunca\b/g, 'de la historia')
  .replace(/\bnunca antes\b/g, 'de la historia')
  .replace(/\bjamás antes\b/g, 'de la historia');

export const claimTokens = (value: string): string[] => [...new Set(
  normaliseClaimText(value).split(' ').filter((word) => word.length > 2 && !stopWords.has(word)),
)];

const variantReplacements: Array<[RegExp, string]> = [
  [/\b(?:que ha existido nunca|nunca antes|jamas antes|maximos? historicos?|record(?: historico)?|de la historia|nunca hemos tenido tanta|nunca habiamos tenido tanta)\b/g, 'historico'],
  [/\b(?:papeles|documentacion|permiso de residencia|permiso para residir|al llegar|desde el primer dia|automaticamente)\b/g, 'residencia_automatica'],
  [/\b(?:trabajo|trabajar|trabaja|contrato)\b/g, 'trabajar'],
  [/\b(?:entra cualquiera|deja pasar a todos|no pone limites|puertas abiertas)\b/g, 'puertas_abiertas'],
  [/\b(?:okupas?|okupacion|ocupar|ocupada|ocupado)\b/g, 'ocupacion'],
  [/\b(?:protege|protegen|respalda|respaldada|respaldado|permite)\b/g, 'respaldo'],
  [/\b(?:alquileres?|rentas?)\b/g, 'alquiler'],
  [/\b(?:se han disparado|dispara|disparan|por las nubes|sube|suben|subido|aumenta|aumentan)\b/g, 'subida'],
  [/\b(?:poca oferta|falta de oferta|falta vivienda|escasez de vivienda)\b/g, 'poca_oferta'],
  [/\b(?:inseguridad juridica|seguridad juridica|leyes anti casero)\b/g, 'inseguridad_juridica'],
  [/\b(?:delito leve|delitos leves)\b/g, 'delito_leve'],
  [/\b(?:presion fiscal|carga fiscal|fiscalidad)\b/g, 'fiscal'],
  [/\b(?:viviendas?|casas?|pisos?)\b/g, 'vivienda'],
  [/\b(?:triplica|triplicado|triple|tres veces|tres veces mas|3 veces|3 veces mas)\b/g, 'triple'],
];

const variantMarkers = new Set(['historico', 'puertas_abiertas', 'residencia_automatica', 'ocupacion', 'respaldo', 'delito_leve', 'subida', 'poca_oferta', 'inseguridad_juridica', 'fiscal', 'triple']);

const compatibleVariantKey = (left: string, right: string): boolean => {
  const leftParts = new Set(left.split('|'));
  const rightParts = new Set(right.split('|'));
  const leftMarkers = [...leftParts].filter((part) => variantMarkers.has(part)).sort().join('|');
  const rightMarkers = [...rightParts].filter((part) => variantMarkers.has(part)).sort().join('|');
  if (!leftMarkers || !rightMarkers) return false;
  const leftMarkerSet = new Set(leftMarkers.split('|'));
  const rightMarkerSet = new Set(rightMarkers.split('|'));
  if (![...leftMarkerSet].some((part) => rightMarkerSet.has(part)) || ![...leftMarkerSet].every((part) => rightMarkerSet.has(part))) return false;
  const sharedMarker = true;
  const leftDomains = [...leftParts].filter((part) => !variantMarkers.has(part));
  const rightDomains = [...rightParts].filter((part) => !variantMarkers.has(part));
  if (leftDomains.length && rightDomains.length && !leftDomains.some((part) => rightParts.has(part))) return false;
  return sharedMarker;
};

/**
 * A bounded, explainable equivalence key for common Spanish surface variants.
 * This is intentionally narrower than general semantic similarity: a match
 * needs a distinctive relation marker and compatible numeric context.
 */
export const claimVariantKeys = (value: string): string[] => {
  let text = normaliseClaimText(value);
  for (const [pattern, replacement] of variantReplacements) text = text.replace(pattern, replacement);
  const tokens = [...new Set(text.split(' ').filter((token) => token.length > 2 && !stopWords.has(token) && !lowSignalWords.has(token)))];
  const markers = tokens.filter((token) => variantMarkers.has(token));
  if (!markers.length) return [];
  const domain = tokens.filter((token) => ['residencia', 'trabajar', 'inmigracion', 'ocupacion', 'alquiler', 'fiscal', 'vivienda', 'delito'].includes(token));
  return [[...new Set([...markers, ...domain])].sort().join('|')];
};

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
  const exactPhraseMatch = searchablePhrases.some((text) => text === query);
  const queryVariantKeys = claimVariantKeys(value);
  const candidateVariantKeys = [...new Set([entry.title, ...entry.aliases].flatMap((phrase) => claimVariantKeys(phrase)))];
  const canonicalVariantMatch = entry.kind === 'claim'
    && queryVariantKeys.length > 0
    && candidateVariantKeys.some((candidateKey) => queryVariantKeys.some((queryKey) => compatibleVariantKey(queryKey, candidateKey)));
  const overlapScore = queryTokens.length ? (weightedMatches / queryTokens.length) * 55 : 0;
  const candidateSemanticSignatures = entry.semanticSignatures?.length
    ? entry.semanticSignatures
    : searchablePhrases.map((phrase) => ({ signature: semanticQuerySignature(phrase), phrase }));
  const rawQueryFamilyKeys = semanticFamilyKeys(querySemanticSignatureValue);
  const maxFamilyKeyLength = Math.max(0, ...rawQueryFamilyKeys.map((key) => key.length));
  const queryFamilyKeys = rawQueryFamilyKeys.filter((key) => key.length === maxFamilyKeyLength);
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
  return { ...entry, score: canonicalVariantMatch ? Math.max(score, 110) : score, confidence: Math.min(1, score / 100), matchedTerms, semanticFamilyMatch, exactPhraseMatch: exactPhraseMatch || canonicalVariantMatch };
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
  entry && entry.kind === 'claim' && entry.score >= 68 && (entry.semanticFamilyMatch || entry.exactPhraseMatch),
);
