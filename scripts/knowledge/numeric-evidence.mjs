const normalise = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n');
const includesAny = (value, words) => words.some((word) => value.includes(word));

export const numericThresholdOperator = (value) => {
  const text = normalise(value);
  if (/\b(?:no\s+(?:supera|excede|rebasa|mas de|por encima de)|como maximo|a lo sumo)\b/.test(text)) return 'at_most';
  if (/\b(?:no menos de|no baja de|no cae por debajo de|no es inferior a|al menos|como minimo|por lo menos)\b/.test(text)) return 'at_least';
  if (/\b(?:supera|superan|excede|exceden|rebasa|rebasan|pasa de|pasan de|mas de|por encima de)\b/.test(text)) return 'greater_than';
  if (/\b(?:menos de|por debajo de|no llega a|no alcanza)\b/.test(text)) return 'less_than';
  return undefined;
};

export const satisfiesNumericThreshold = (value, threshold, operator) => operator === 'greater_than' ? value > threshold
  : operator === 'at_least' ? value >= threshold
    : operator === 'at_most' ? value <= threshold
      : operator === 'less_than' ? value < threshold : undefined;

export const numericThresholdRelation = (matches, operator) => operator === 'greater_than' ? (matches ? 'supera' : 'no supera')
  : operator === 'at_least' ? (matches ? 'alcanza o supera' : 'no alcanza')
    : operator === 'at_most' ? (matches ? 'no supera' : 'supera')
      : operator === 'less_than' ? (matches ? 'está por debajo de' : 'no está por debajo de')
        : '';

export const claimUnitClass = (text) => {
  const value = normalise(text);
  const currency = /\b(?:euros?|eur|dolares?|usd|gbp|libras?)\b|€/.test(value);
  if (currency) return includesAny(value, ['por habitante', 'por persona', 'per capita']) ? 'per_capita' : 'currency';
  if (includesAny(value, ['personas', 'habitantes', 'residentes', 'hogares', 'trabajadores'])) return 'people';
  if (includesAny(value, ['indice', 'base 100'])) return 'index';
  return null;
};

export const observationUnitClass = (item) => {
  const value = normalise(`${item?.unit || ''} ${item?.metric || ''} ${item?.datasetId || ''}`);
  if (includesAny(value, ['euro', 'eur', 'currency'])) return includesAny(value, ['habitante', 'capita', 'persona']) ? 'per_capita' : 'currency';
  if (includesAny(value, ['personas', 'inhabitants', 'population', 'habitantes', 'households', 'hogares'])) return 'people';
  if (includesAny(value, ['index', 'indice'])) return 'index';
  return null;
};

export const unitCompatible = (claimText, observation) => {
  const requested = claimUnitClass(claimText);
  const observed = observationUnitClass(observation);
  return !requested || !observed || requested === observed;
};
