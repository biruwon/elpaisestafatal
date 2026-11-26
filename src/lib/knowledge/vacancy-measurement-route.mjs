const normalize = (value) => String(value || '')
  .toLocaleLowerCase('es')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/ñ/g, 'n')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

// Select the indicator the wording asks for. Counts, occupied posts, rates,
// and quarterly rate changes are separate measurements in the source table.
export const vacancyMeasurementMetricIdsForQuery = (query) => {
  const text = normalize(query);
  // Occupation-specific claims use their own estimate and dimensions. A
  // national all-occupation vacancy count must not override them.
  if (/\b(camarer\w*|barman\w*|bartender\w*|waiter\w*)\b/.test(text)
    && /\b(vacan\w*|vacanc\w*|plazas? sin cubrir|puestos? sin cubrir|puestos? de trabajo sin cubrir)\b/.test(text)) return undefined;
  const clarifiedMetric = text.match(/\bquiero comprobar (numero de puestos de trabajo vacantes|numero de puestos de trabajo ocupados|tasa de vacantes de empleo)\s*$/);
  if (clarifiedMetric) {
    const selectedMetric = {
      'numero de puestos de trabajo vacantes': 'job_vacancy_count',
      'numero de puestos de trabajo ocupados': 'occupied_job_post_count',
      'tasa de vacantes de empleo': 'job_vacancy_rate',
    }[clarifiedMetric[1]];
    if (selectedMetric) return new Set([selectedMetric]);
  }
  const vacancyMention = /\b(?:vacan\w*|vacanc\w*|plazas? sin cubrir|puestos? sin cubrir|puestos? de trabajo sin cubrir)\b/.test(text);
  const occupiedPostMention = /\b(?:puestos?|empleos?)\b.{0,32}\bocupad\w*\b|\boccupied\s+(?:posts?|jobs?)\b/.test(text);
  const rateCue = /\b(?:tasa|porcentaje|proporcion|ratio|rate|percentage)\b/.test(text);
  const countCue = /\b(?:cuant\w*|numero|cantidad|recuento|total|number|count)\b/.test(text);
  const changeCue = /\b(?:cambi\w*|variacion|aument\w*|sub\w*|baj\w*|disminu\w*|change|increase|decrease)\b/.test(text);
  const quarterCue = /\b(?:trimestr\w*|trimestre anterior|periodo anterior|quarter|quarterly)\b/.test(text);
  const quarterlyRateChange = rateCue && changeCue && quarterCue;

  // Only suppress indicator selection when the claim is actually about
  // vacancies or occupied posts. Other rate-and-count questions (for example,
  // unemployment) must continue through their own metric families.
  if ((vacancyMention || occupiedPostMention)
    && (rateCue && countCue && !quarterlyRateChange || occupiedPostMention && vacancyMention || occupiedPostMention && rateCue)) return new Set();
  if (occupiedPostMention) return rateCue ? new Set() : new Set(['occupied_job_post_count']);
  if (!vacancyMention) return undefined;
  if (quarterlyRateChange) return new Set(['job_vacancy_rate_quarterly_change']);
  if (rateCue) return new Set(['job_vacancy_rate']);
  return new Set(['job_vacancy_count']);
};

export const vacancyMeasurementClarificationMetricIdsForQuery = (query) => {
  const text = normalize(query);
  const vacancyMention = /\b(?:vacan\w*|vacanc\w*|plazas? sin cubrir|puestos? sin cubrir|puestos? de trabajo sin cubrir)\b/.test(text);
  const occupiedPostMention = /\b(?:puestos?|empleos?)\b.{0,32}\bocupad\w*\b|\boccupied\s+(?:posts?|jobs?)\b/.test(text);
  if (vacancyMention && occupiedPostMention) return ['job_vacancy_count', 'occupied_job_post_count'];
  if (occupiedPostMention) return ['occupied_job_post_count', 'job_vacancy_rate'];
  return ['job_vacancy_count', 'job_vacancy_rate'];
};
