import { compilerContractFacts, compilerSchema, isBroadComplaint, normalizeCompilerOutput, shouldUseLocalCompiler } from './local-compiler-contract.mjs';
import { deterministicFallbackCompiler } from './fallback-compiler.mjs';

const assert = (condition, message) => { if (!condition) throw new Error(message); };

const input = 'España tiene tres millones de habitantes en 2025';
const deterministic = deterministicFallbackCompiler(input);
const maliciousModelOutput = {
  normalized: 'España tiene tres millones de habitantes en 2025',
  claimType: 'descriptive',
  propositions: [{ text: input, type: 'descriptive', explicit: true }],
  entities: ['España', 'un organismo inventado'],
  numbers: ['999 millones', '2026'],
  geography: 'Australia',
  period: '2026',
  population: 'personas que no aparecen en la frase',
  retrievalHints: ['población España', 'fuente irrelevante inventada'],
  semanticSignature: 'published:unrelated-claim',
  clarificationRequired: false,
  routing: { status: 'published', primarySlug: 'unrelated-claim', reason: 'invented route', questions: [] },
  answer: 'This field must never reach the normalized compiler.',
  evidenceIds: ['invented-evidence'],
  assessment: 'true',
};

const normalized = normalizeCompilerOutput(maliciousModelOutput, input);
assert(normalized.numbers.join('|') === deterministic.numbers.join('|'), 'Model numbers replaced numbers extracted from user text');
assert(normalized.semanticSignature === deterministic.semanticSignature, 'Model semantic signature bypassed deterministic polarity/family rules');
assert(normalized.geography === deterministic.geography, 'Model geography replaced deterministic geography');
assert(normalized.period === deterministic.period, 'Model period replaced deterministic period');
assert(normalized.population === deterministic.population, 'Model population replaced deterministic population context');
assert(!normalized.entities.includes('un organismo inventado'), 'Unrelated model entity entered the retrieval context');
assert(!normalized.retrievalHints.includes('fuente irrelevante inventada'), 'Unrelated model retrieval hint entered the retrieval context');
assert(!Object.hasOwn(normalized, 'answer') && !Object.hasOwn(normalized, 'evidenceIds') && !Object.hasOwn(normalized, 'assessment'), 'Model answer/evidence fields leaked into the compiler contract');
assert(normalized.propositions.length === 1 && normalized.propositions[0].explicit === true, 'Valid model propositions were not preserved');

const bounded = normalizeCompilerOutput({
  ...maliciousModelOutput,
  propositions: Array.from({ length: 20 }, (_, index) => ({ text: `claim ${index}`, type: 'mixed', explicit: true })),
  retrievalHints: Array.from({ length: 20 }, (_, index) => `hint ${index}`),
}, 'España está destruida');
assert(bounded.propositions.length <= compilerContractFacts.maxPropositions, 'Compiler accepted too many propositions');
assert(bounded.retrievalHints.length <= compilerContractFacts.maxRetrievalHints, 'Compiler accepted too many retrieval hints');

assert(compilerSchema.additionalProperties === false, 'Compiler schema allows undeclared top-level model fields');
assert(compilerSchema.properties.propositions.maxItems === 6, 'Compiler schema does not bound proposition output');
assert(compilerSchema.properties.retrievalHints.maxItems === 8, 'Compiler schema does not bound retrieval hints');
assert(compilerContractFacts.deterministicOnly.includes('numbers') && compilerContractFacts.deterministicOnly.includes('semanticSignature'), 'Deterministic-only compiler fields are not documented');
assert(shouldUseLocalCompiler({ text: 'asdasdfasd', deterministic: { clarificationRequired: false, claimType: 'descriptive', propositions: [{ type: 'descriptive' }] } }) === false, 'Low-signal input should not trigger local model extraction');
assert(shouldUseLocalCompiler({ text: 'El gobierno oculta cifras sobre las ayudas', deterministic: { clarificationRequired: false, claimType: 'descriptive', propositions: [{ type: 'descriptive' }] } }) === true, 'Uncovered multi-term claims should reach the local compiler');
assert(shouldUseLocalCompiler({ text: 'España está destruida', deterministic: { clarificationRequired: true, claimType: 'definition', propositions: [{ type: 'definition' }] } }) === false, 'Broad complaints should retain the deterministic clarification path');
const causal = deterministicFallbackCompiler('Desde que llegaron más extranjeros hay más inseguridad');
assert(isBroadComplaint(causal) === false, 'Structured causal wording was classified as a broad complaint');
assert(shouldUseLocalCompiler({ text: 'Desde que llegaron más extranjeros hay más inseguridad', deterministic: causal, hasPlausibleCandidate: true }) === true, 'Known causal paraphrases should reach the local compiler');

const invalid = normalizeCompilerOutput({ claimType: 'not-a-type', propositions: [] }, 'España está destruida');
assert(invalid.semanticSignature === deterministicFallbackCompiler('España está destruida').semanticSignature, 'Malformed model output did not fall back deterministically');

console.log('Local compiler contract validation passed: bounded extraction, deterministic numbers/signatures, and no answer/evidence injection.');
