import { deterministicFallbackCompiler } from './fallback-compiler.mjs';

const assert = (condition, message) => { if (!condition) throw new Error(message); };

const causal = deterministicFallbackCompiler('Los inmigrantes crean inseguridad en España');
assert(causal.claimType === 'causal', 'Causal claim type was not detected');
assert(causal.entities.includes('inmigración') && causal.geography === 'España', 'Causal entities/geography were not detected');
assert(causal.propositions.some((item) => item.explicit === false && item.type === 'causal'), 'Causal implication was not created');

const comparison = deterministicFallbackCompiler('España cobra más impuestos que Europa en 2025');
assert(comparison.claimType === 'comparative' && comparison.period === '2025', 'Comparative claim or period was not detected');
assert(comparison.numbers.length === 0, 'Year was incorrectly treated as a numeric amount');

const normative = deterministicFallbackCompiler('Los españoles deberían tener prioridad en las ayudas');
assert(normative.claimType === 'normative' && normative.propositions.some((item) => !item.explicit), 'Normative implication was not created');

const budget = deterministicFallbackCompiler('El Gobierno transfiere 310 millones de Educación a Presidencia');
assert(budget.numbers[0] === '310' && budget.entities.includes('educación') && budget.entities.includes('gobierno de España'), 'Budget entities or amount were not extracted');
assert(budget.propositions.some((item) => item.explicit === false && item.type === 'mixed'), 'Budget implication was not created');

console.log('Fallback compiler validation passed: structured fields and implications are deterministic.');
