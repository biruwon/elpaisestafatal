import { metricVocabulary } from './measurement-definitions.generated.mjs';

const normalize = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, ' ').trim();

const registryAliases = metricVocabulary.flatMap((metric) =>
  [...new Set([metric.name, ...(metric.aliases || [])])]
    .map((alias) => ({ id: metric.id, normalized: normalize(alias), tokens: normalize(alias).split(' ').filter(Boolean) }))
    .filter(({ normalized, tokens }) => normalized && (tokens.length >= 2 || normalized.length >= 14)),
);
const explicitlyNegatedAlias = (normalized, alias) => {
  let index = normalized.indexOf(alias);
  while (index >= 0) {
    const before = normalized.slice(Math.max(0, index - 50), index).trim();
    const negated = /(?:\bno\s+(?:es|son|sea|sean|ser|era|eran|fue|fueron|constituye|equivale)(?:\s+(?:un|una|unos|unas)\s+)?|\bsin\s+ser(?:\s+(?:un|una|unos|unas)\s+)?|\bno\s+se\s+trata\s+de\s+|\b(?:diferente|distinto|distinta|distintos|distintas)\s+de\s*)$/.test(before);
    if (!negated) return false;
    index = normalized.indexOf(alias, index + alias.length);
  }
  return true;
};

export const metricAliasIsExplicitlyNegated = (query, metricId) => {
  const normalized = normalize(query);
  const matchingAliases = registryAliases.filter(({ id, normalized: alias }) => id === metricId && normalized.includes(alias));
  return matchingAliases.length > 0 && matchingAliases.every(({ normalized: alias }) => explicitlyNegatedAlias(normalized, alias));
};

const advertisedRentRequested = (normalized) => /\b(?:alquiler\w*|arrend\w*|renta\w*|rent\w*)\b/.test(normalized)
  && /\b(?:anunci\w*|ofert\w*|list\w*|asking|advertis\w*|posted|portal(?:es)?|precios? de oferta|oferta de (?:alquiler|renta))\b/.test(normalized);

export const actualRentPaymentsRequested = (query) => {
  const normalized = normalize(query);
  return /\b(?:alquiler\w*|renta\w*|rent\w*)\b/.test(normalized)
    && /\b(?:efectiv\w* pagad\w*|pagad\w* por los? hogares|pag(?:a|an|ado|ados|adas) (?:los )?hogares|actual rent\w*|rent\w* (?:actually )?paid)\b/.test(normalized);
};

export const actualRentTrendRequested = (query) => {
  const normalized = normalize(query);
  return actualRentPaymentsRequested(normalized)
    && /\b(?:desde|entre|evoluci\w*|cambi\w*|variaci\w*|subid\w*|aument\w*|crec\w*|trend|change|evolution|since)\b/.test(normalized);
};

// Resolve distinctive, reviewed metric aliases at the edge so the API can
// hydrate a metric's series even when a paraphrase shares few words with the
// warehouse's lexical search text. The local resolver still decides whether
// the observations answer the full claim.
export const directMetricIdsForQuery = (query) => {
  const normalized = normalize(query);
  const candidates = registryAliases
    .filter(({ id, normalized: alias }) => normalized.includes(alias) && !metricAliasIsExplicitlyNegated(normalized, id))
    .sort((left, right) => right.tokens.length - left.tokens.length || right.normalized.length - left.normalized.length);
  if (!candidates.length) return new Set();
  const strongest = candidates[0].tokens.length;
  const ids = new Set(candidates.filter((candidate) => candidate.tokens.length === strongest).map((candidate) => candidate.id));
  if (advertisedRentRequested(normalized)) {
    ids.delete('rental_price_index');
    ids.delete('annual_hicp_actual_rent_index');
  }
  return ids;
};
