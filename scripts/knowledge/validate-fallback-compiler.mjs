import { deterministicFallbackCompiler, propositionShapeFor } from './fallback-compiler.mjs';

const assert = (condition, message) => { if (!condition) throw new Error(message); };

const causal = deterministicFallbackCompiler('Los inmigrantes crean inseguridad en España');
const equivalentCausal = deterministicFallbackCompiler('La inmigración aumenta la delincuencia en España');
assert(causal.claimType === 'causal', 'Causal claim type was not detected');
assert(causal.semanticSignature === equivalentCausal.semanticSignature, 'Equivalent causal wording did not receive the same semantic signature');
assert(causal.entities.includes('inmigración') && causal.geography === 'España', 'Causal entities/geography were not detected');
assert(causal.population === 'personas inmigrantes o extranjeras', 'Causal population was not detected');
assert(causal.propositions.some((item) => item.explicit === false && item.type === 'causal'), 'Causal implication was not created');
assert(causal.explicitPropositions.length === 1 && causal.impliedPropositions.length === 1, 'Explicit/implied proposition groups were not created');

const comparison = deterministicFallbackCompiler('España cobra más impuestos que Europa en 2025');
assert(comparison.claimType === 'comparative' && comparison.period === '2025', 'Comparative claim or period was not detected');
assert(comparison.numbers.length === 0, 'Year was incorrectly treated as a numeric amount');
assert(comparison.explicitPropositions[0].predicate === 'more_than', 'Comparative relation direction was not extracted');
assert(comparison.explicitPropositions[0].subject.includes('espana') && comparison.explicitPropositions[0].object.includes('europa'), 'Comparative subject/object were not extracted');
const reversedComparison = deterministicFallbackCompiler('Europa cobra más impuestos que España');
assert(reversedComparison.claimType === 'comparative', 'A comparison mentioning España was misclassified as a definition');
assert(comparison.semanticSignature !== reversedComparison.semanticSignature, 'Reversed comparison collapsed into the same semantic family');

const causalShape = propositionShapeFor('La inmigración aumenta la delincuencia en España');
assert(causalShape.predicate === 'causes' && causalShape.subject === 'immigration' && causalShape.object === 'crime', 'Causal subject, relation, or object was not normalized');

const growthAndCost = deterministicFallbackCompiler('La economía crece, pero eso no significa que el coste de vida haya bajado');
assert(growthAndCost.claimType !== 'definition', 'A negated “significa” phrase must not be classified as a definition question');
assert(growthAndCost.explicitPropositions.length === 2, 'Contrast clauses were not decomposed into two explicit propositions');
assert(growthAndCost.explicitPropositions.every((item) => item.type === 'trend'), 'Contrast clauses did not retain their individual claim types');

const semicolon = deterministicFallbackCompiler('Hay más empleo; el paro sigue alto');
assert(semicolon.explicitPropositions.length === 2, 'Semicolon clauses were not decomposed');

const nounList = deterministicFallbackCompiler('Empleo, vivienda y sanidad');
assert(nounList.explicitPropositions.length === 1, 'A noun list was incorrectly split into multiple claims');

const normative = deterministicFallbackCompiler('Los españoles deberían tener prioridad en las ayudas');
assert(normative.claimType === 'normative' && normative.propositions.some((item) => !item.explicit), 'Normative implication was not created');

const budget = deterministicFallbackCompiler('El Gobierno transfiere 310 millones de Educación a Presidencia');
assert(budget.numbers[0] === '310' && budget.entities.includes('educación') && budget.entities.includes('gobierno de España'), 'Budget entities or amount were not extracted');
assert(budget.propositions.some((item) => item.explicit === false && item.type === 'mixed'), 'Budget implication was not created');

const benefits = deterministicFallbackCompiler('¿Cuántas personas beneficiarias reciben ayudas en España?');
assert(benefits.population === 'personas beneficiarias', 'Benefit population was not detected');

const definition = deterministicFallbackCompiler('Los fijos discontinuos son parados ocultos');
assert(definition.claimType === 'definition', 'Definition claim type was not detected');

const trend = deterministicFallbackCompiler('La vivienda sube cada vez más');
assert(trend.claimType === 'trend', 'Trend claim type was not detected');

const broad = deterministicFallbackCompiler('España está destruida');
const negatedBroad = deterministicFallbackCompiler('España no está destruida');
assert(broad.claimType === 'descriptive' && broad.impliedPropositions.some((item) => item.type === 'definition'), 'Broad evaluative claim was not marked for definition/context clarification');
assert(broad.clarificationRequired === true, 'Broad evaluative claim did not require clarification');
assert(broad.semanticSignature !== causal.semanticSignature, 'Broad evaluative wording collapsed into an unrelated causal family');
assert(broad.semanticSignature !== negatedBroad.semanticSignature, 'Opposing claim polarity collapsed into the same semantic family');

console.log('Fallback compiler validation passed: structured fields and implications are deterministic.');
