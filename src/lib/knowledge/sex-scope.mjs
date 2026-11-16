const normalize = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

const requestedSexFor = (value) => {
  const text = normalize(value);
  const women = /\b(?:mujer(?:es)?|femenin[oa]s?|women|woman|female|females)\b/.test(text);
  const men = /\b(?:hombre(?:s)?|masculin[oa]s?|men|male|males)\b/.test(text);
  const breakdown = /\b(?:por sexo|por genero|by sex|by gender|both sexes|ambos sexos|hombres y mujeres|mujeres y hombres|men and women|women and men)\b/.test(text);
  if (breakdown || women && men) return 'both';
  if (women) return 'women';
  if (men) return 'men';
  return 'total';
};

const observedSexFor = (item) => {
  const value = item?.dimensions?.sex ?? item?.dimensionLabels?.sex;
  const sex = normalize(value);
  if (['t', 'total', 'all', 'all sexes', 'both sexes', 'ambos sexos'].includes(sex)) return 'total';
  if (['f', 'female', 'females', 'woman', 'women', 'mujer', 'mujeres', 'femenino', 'femenina'].includes(sex)) return 'women';
  if (['m', 'male', 'males', 'man', 'men', 'hombre', 'hombres', 'masculino', 'masculina'].includes(sex)) return 'men';

  const population = normalize(item?.population);
  const populationWomen = /\b(?:women|woman|female|females|mujer(?:es)?|femenin[oa]s?)\b/.test(population);
  const populationMen = /\b(?:men|male|males|hombre(?:s)?|masculin[oa]s?)\b/.test(population);
  if (populationWomen && !populationMen) return 'women';
  if (populationMen && !populationWomen) return 'men';
  if (/\b(?:all persons|all people|total population|ambos sexos|both sexes)\b/.test(population)) return 'total';
  return undefined;
};

export const sexScopeMatcherFor = (text) => {
  const requested = requestedSexFor(text);
  if (requested === 'total') return (item) => {
    const observed = observedSexFor(item);
    return observed !== 'women' && observed !== 'men';
  };
  if (requested === 'women') return (item) => observedSexFor(item) === 'women';
  if (requested === 'men') return (item) => observedSexFor(item) === 'men';
  return (item) => ['women', 'men'].includes(observedSexFor(item));
};

export const observationMatchesSexScope = (text, item) => sexScopeMatcherFor(text)(item);
