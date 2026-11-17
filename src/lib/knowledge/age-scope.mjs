const rangeFor = (start, end) => {
  const minimum = Number(start);
  const maximum = Number(end);
  return Number.isInteger(minimum) && Number.isInteger(maximum)
    && minimum >= 0 && maximum <= 120 && minimum <= maximum
    ? { kind: 'range', minimum, maximum }
    : undefined;
};

const rangePattern = /\b(\d{1,3})\s*(?:[-–—]|\b(?:a|and|hasta|to|y)\b)\s*(\d{1,3})\b/gi;
const explicitAgeBefore = /\b(?:ages?|aged|edad(?:es)?)(?:\s+(?:of|de|between|entre|group))?\s*$/i;
const explicitAgeAfter = /^\s*(?:-?\s*(?:years?|a[nñ]os?)(?:\s*-?\s*olds?)?|(?:age|edad)(?:\s+groups?)?)\b/i;

const extractRanges = (value, { requireContext = true } = {}) => {
  const text = String(value || '');
  const ranges = [];
  for (const match of text.matchAll(rangePattern)) {
    const range = rangeFor(match[1], match[2]);
    if (!range) continue;
    if (requireContext) {
      const before = text.slice(Math.max(0, match.index - 32), match.index);
      const after = text.slice(match.index + match[0].length, match.index + match[0].length + 24);
      if (!explicitAgeBefore.test(before) && !explicitAgeAfter.test(after)) continue;
    }
    ranges.push(range);
  }
  return ranges;
};

const requestedScopesFor = (value) => {
  const text = String(value || '');
  const scopes = extractRanges(text);
  if (/\b(?:all ages|todas las edades|cualquier edad|any age)\b/i.test(text)) scopes.push({ kind: 'all' });
  for (const match of text.matchAll(/\bmenores?\s+de\s+(\d{1,3})\s*(?:a[nñ]os?)?\b|\bunder\s+(\d{1,3})\s+years?\b/gi)) {
    const limit = Number(match[1] || match[2]);
    if (Number.isInteger(limit) && limit > 0 && limit <= 120) scopes.push({ kind: 'under', limit });
  }
  for (const match of text.matchAll(/\b(\d{1,3})\s*(?:a[nñ]os?|years?)\s*(?:y|and|o|or)\s*(?:m[aá]s|over|older)\b|\b(\d{1,3})\s*\+(?=$|[\s,.?!;:])/gi)) {
    const minimum = Number(match[1] || match[2]);
    if (Number.isInteger(minimum) && minimum <= 120) scopes.push({ kind: 'atLeast', minimum });
  }
  const key = (scope) => `${scope.kind}:${scope.minimum ?? ''}:${scope.maximum ?? scope.limit ?? ''}`;
  return [...new Map(scopes.map((scope) => [key(scope), scope])).values()];
};

const ageDimensionScope = (value) => {
  const text = String(value || '').trim();
  if (!text) return undefined;
  const code = text.match(/^Y(?:_)?(\d{1,3})\s*[-–—]\s*(\d{1,3})$/i);
  if (code) return rangeFor(code[1], code[2]);
  const under = text.match(/^Y_LT(\d{1,3})$/i);
  if (under) return { kind: 'under', limit: Number(under[1]) };
  const atMost = text.match(/^Y_LE(\d{1,3})$/i);
  if (atMost) return { kind: 'atMost', limit: Number(atMost[1]) };
  const atLeast = text.match(/^Y_GE(\d{1,3})$/i);
  if (atLeast) return { kind: 'atLeast', minimum: Number(atLeast[1]) };
  const over = text.match(/^Y_GT(\d{1,3})$/i);
  if (over) return { kind: 'over', minimum: Number(over[1]) };
  if (/^(?:TOTAL|T|ALL|ALL AGES)$/i.test(text)) return { kind: 'all' };
  return extractRanges(text, { requireContext: false })[0];
};

const observationAgeScope = (item) => ageDimensionScope(item?.dimensions?.age)
  || ageDimensionScope(item?.dimensionLabels?.age)
  || extractRanges(item?.population, { requireContext: false })[0]
  || requestedScopesFor(item?.population)[0];

const sameScope = (requested, observed) => requested.kind === observed.kind
  && requested.minimum === observed.minimum
  && (requested.maximum ?? requested.limit) === (observed.maximum ?? observed.limit);

export const requestedAgeScopes = requestedScopesFor;

// Explicit age bands are part of the evidence contract. Missing or broader
// age metadata cannot satisfy a narrower request.
export const ageScopeMatcherFor = (text) => {
  const requested = requestedScopesFor(text);
  if (!requested.length) return () => true;
  return (item) => {
    const observed = observationAgeScope(item);
    return Boolean(observed && requested.some((scope) => sameScope(scope, observed)));
  };
};

export const observationMatchesAgeScope = (text, item) => ageScopeMatcherFor(text)(item);
