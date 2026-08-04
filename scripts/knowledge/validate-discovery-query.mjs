import { discoveryQueriesFor, discoveryQueryTextFor } from './discovery-query.mjs';

const assert = (condition, message) => { if (!condition) throw new Error(message); };

const budget = discoveryQueriesFor({
  text: 'El Gobierno quita 310 millones de Educación para pagar personal de Presidencia',
  compiler: { evidenceNeeds: ['importe', 'partida', 'impacto'] },
  handlerId: 'budget_transfer',
});
assert(budget.some((query) => /transferencia de credito presupuesto/i.test(query)), 'Budget discovery did not add credit-transfer language');
assert(budget.some((query) => /capítulo 1 gastos de personal/i.test(query)), 'Budget discovery did not add personnel-budget language');

const legal = discoveryQueriesFor({ text: '¿Puede reutilizarse esta información pública?', compiler: { evidenceNeeds: ['norma'] }, handlerId: 'legal_rule' });
assert(legal.some((query) => /BOE artículo/i.test(query)), 'Legal discovery did not add BOE article language');

const local = discoveryQueriesFor({ text: 'La llegada de turistas expulsa a los vecinos de mi municipio', compiler: { evidenceNeeds: ['causa', 'territorio'] }, handlerId: 'causal' });
assert(local.some((query) => /datos territoriales/i.test(query)), 'Local discovery did not preserve a territorial retrieval path');

const bounded = discoveryQueryTextFor({ text: 'España cobra más impuestos que Europa', compiler: { evidenceNeeds: ['comparacion', 'denominador'] }, handlerId: 'ranking' });
assert(bounded.length <= 1800 && bounded.includes('comparación España Unión Europea'), 'Discovery query text is not bounded or did not add comparison language');

console.log('Discovery query validation passed: unseen claims receive bounded handler-aware official search expansions.');
