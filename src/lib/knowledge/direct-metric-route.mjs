import { metricVocabulary } from './measurement-definitions.generated.mjs';

const normalize = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, ' ').trim();

const registryAliases = metricVocabulary.flatMap((metric) =>
  [...new Set([metric.name, ...(metric.aliases || [])])]
    .map((alias) => ({ id: metric.id, normalized: normalize(alias), tokens: normalize(alias).split(' ').filter(Boolean) }))
    .filter(({ normalized, tokens }) => normalized && (tokens.length >= 2 || normalized.length >= 14)),
);

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
    .filter(({ normalized: alias }) => normalized.includes(alias))
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
