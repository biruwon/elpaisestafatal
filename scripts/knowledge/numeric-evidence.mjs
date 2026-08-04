const normalise = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n');
const includesAny = (value, words) => words.some((word) => value.includes(word));

export const claimUnitClass = (text) => {
  const value = normalise(text);
  if (includesAny(value, ['euros', 'euro', 'millones de', 'por habitante', 'por persona'])) return includesAny(value, ['por habitante', 'por persona']) ? 'per_capita' : 'currency';
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
