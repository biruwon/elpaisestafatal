const normalise = (value) => String(value || '')
  .toLocaleLowerCase('es')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/ñ/g, 'n')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const needs = (compiler) => new Set(Array.isArray(compiler?.evidenceNeeds) ? compiler.evidenceNeeds : []);

// Official discovery needs human search language, not internal evidence
// labels such as "impacto" or "denominador". Keep the expansion bounded and
// deterministic so novel claims can search official sources without a second
// unconstrained model call.
export const discoveryQueriesFor = ({ text = '', compiler = {}, handlerId = '' } = {}) => {
  const original = String(text || '').trim().slice(0, 420);
  if (!original) return [];
  const evidenceNeeds = needs(compiler);
  const normalized = normalise(original);
  const expansions = [];
  const add = (value) => {
    const query = String(value || '').replace(/\s+/g, ' ').trim();
    if (query && query.length >= 4 && !expansions.includes(query)) expansions.push(query);
  };

  add(original);
  if (handlerId === 'budget_transfer' || evidenceNeeds.has('partida') || evidenceNeeds.has('importe')) {
    add(`${original} transferencia de credito presupuesto`);
    add(`${original} capítulo 1 gastos de personal`);
  }
  if (handlerId === 'government_event') add(`${original} acuerdo Consejo de Ministros resolución`);
  if (handlerId === 'legal_rule' || evidenceNeeds.has('norma')) {
    add(`${original} ley norma vigente`);
    add(`${original} BOE artículo`);
  }
  if (handlerId === 'trend' || evidenceNeeds.has('periodo')) add(`${original} serie estadística periodo`);
  if (handlerId === 'ranking' || evidenceNeeds.has('comparacion')) add(`${original} comparación España Unión Europea`);
  if (handlerId === 'proportion' || evidenceNeeds.has('denominador') || evidenceNeeds.has('tasa')) add(`${original} tasa porcentaje población`);
  if (evidenceNeeds.has('territorio') && /\b(?:municipio|provincia|comunidad|barrio|local)\b/.test(normalized)) add(`${original} datos territoriales`);
  if (evidenceNeeds.has('ejecucion')) add(`${original} ejecución presupuestaria resultados`);
  return expansions.slice(0, 6);
};

export const discoveryQueryTextFor = (options = {}) => discoveryQueriesFor(options).join(' | ').slice(0, 1800);
