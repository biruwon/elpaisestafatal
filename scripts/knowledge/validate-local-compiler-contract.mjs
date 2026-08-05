import { compilerContractFacts, compilerInstruction, compilerSchema, formatCompilerCandidates, isBroadComplaint, normalizeCompilerOutput, reconcileCompilerSafety, shouldUseLocalCompiler } from './local-compiler-contract.mjs';
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
  evidenceNeeds: ['denominador', 'fuente inventada', 'impacto'],
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
assert(normalized.evidenceNeeds.includes('denominador') && normalized.evidenceNeeds.includes('impacto'), 'Allowed methodological evidence needs were not preserved');
assert(!normalized.evidenceNeeds.includes('fuente inventada'), 'Unbounded model evidence need entered the compiler contract');
assert(!Object.hasOwn(normalized, 'answer') && !Object.hasOwn(normalized, 'evidenceIds') && !Object.hasOwn(normalized, 'assessment'), 'Model answer/evidence fields leaked into the compiler contract');
assert(normalized.propositions.length === 1 && normalized.propositions[0].explicit === true, 'Valid model propositions were not preserved');
assert(normalized.evidenceNeeds.includes('metrica') && normalized.evidenceNeeds.includes('periodo'), 'Deterministic evidence requirements were lost when the model returned an incomplete list');
assert(normalized.metricIds.includes('resident_population'), 'Compiler did not emit the shared metric ID for a population paraphrase');

const conceptRouted = normalizeCompilerOutput({
  claimType: 'trend',
  propositions: [{ text: 'La economía española marca un máximo histórico de personas trabajando', type: 'trend', explicit: true, concepts: ['employment_record', 'invented_concept'] }],
  entities: [],
  retrievalHints: [],
  clarificationRequired: false,
}, 'La economía española marca un máximo histórico de personas trabajando');
const canonicalEmployment = normalizeCompilerOutput({
  claimType: 'trend',
  propositions: [{ text: 'Nunca ha habido tanto empleo en España', type: 'trend', explicit: true }],
  entities: [],
  retrievalHints: [],
  clarificationRequired: false,
}, 'Nunca ha habido tanto empleo en España');
assert(conceptRouted.propositions[0].concepts.includes('employment_record'), 'Reviewed concept IDs were not retained from the local compiler');
assert(!conceptRouted.propositions[0].concepts.includes('invented_concept'), 'Unregistered model concept entered the routing contract');
assert(conceptRouted.semanticSignature.includes('employment_record'), 'A model-provided reviewed concept did not influence the semantic family');
assert(canonicalEmployment.semanticSignature.includes('employment_record'), 'Canonical employment record wording did not resolve to its reusable concept');
const unfamiliarEmployment = normalizeCompilerOutput(null, 'La economía española marca un máximo histórico de personas trabajando');
assert(unfamiliarEmployment.semanticSignature.includes('employment_record'), 'Unfamiliar historical-maximum employment wording did not resolve to the reusable family');

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
assert(compilerSchema.properties.evidenceNeeds.maxItems === 8, 'Compiler schema does not bound evidence needs');
assert(compilerContractFacts.deterministicOnly.includes('numbers') && compilerContractFacts.deterministicOnly.includes('semanticSignature'), 'Deterministic-only compiler fields are not documented');
assert(/varias cl[aá]usulas independientes/i.test(compilerInstruction) && /proposici[oó]n expl[ií]cita separada/i.test(compilerInstruction) && /dimensiones de evidencia/i.test(compilerInstruction) && /IDs de este vocabulario revisado/i.test(compilerInstruction), 'Local compiler prompt does not require compound decomposition, evidence needs, and bounded concept routing');
const candidateContext = formatCompilerCandidates([{ published: true, slug: 'claim-a', title: 'Afirmación de prueba', claimType: 'causal', geography: 'España', period: '2025', aliases: ['otra forma de decirlo'] }]);
assert(candidateContext.includes('type=causal') && candidateContext.includes('geography=España') && candidateContext.includes('period=2025') && candidateContext.includes('otra forma de decirlo'), 'Local compiler candidate context omitted reviewed routing metadata');
const candidateWithReviewContext = formatCompilerCandidates([{ published: true, slug: 'claim-b', title: 'Afirmación contextual', claimType: 'trend', whatIsTrue: 'El indicador se ha mantenido estable durante el periodo revisado.', whatIsMissing: 'No permite inferir una causa concreta.' }]);
assert(candidateWithReviewContext.includes('summary=El indicador se ha mantenido estable durante el periodo revisado.') && candidateWithReviewContext.includes('limits=No permite inferir una causa concreta.'), 'Local compiler candidate context omitted reviewed finding limits');
assert(formatCompilerCandidates(Array.from({ length: 20 }, () => ({ published: true, slug: 'claim', title: 'claim' }))).split('\n').length <= 8, 'Local compiler candidate context was not bounded');
assert(shouldUseLocalCompiler({ text: 'asdasdfasd', deterministic: { clarificationRequired: false, claimType: 'descriptive', propositions: [{ type: 'descriptive' }] } }) === false, 'Low-signal input should not trigger local model extraction');
assert(shouldUseLocalCompiler({ text: 'El gobierno oculta cifras sobre las ayudas', deterministic: { clarificationRequired: false, claimType: 'descriptive', propositions: [{ type: 'descriptive' }] } }) === true, 'Uncovered multi-term claims should reach the local compiler');
assert(shouldUseLocalCompiler({ text: 'España está destruida', deterministic: { clarificationRequired: true, claimType: 'definition', propositions: [{ type: 'definition' }] } }) === false, 'Broad complaints should retain the deterministic clarification path');
const causal = deterministicFallbackCompiler('Desde que llegaron más extranjeros hay más inseguridad');
assert(isBroadComplaint(causal) === false, 'Structured causal wording was classified as a broad complaint');
assert(shouldUseLocalCompiler({ text: 'Desde que llegaron más extranjeros hay más inseguridad', deterministic: causal, hasPlausibleCandidate: true }) === true, 'Known causal paraphrases should reach the local compiler');
const reconciledCausal = reconcileCompilerSafety(causal, normalizeCompilerOutput({ claimType: 'descriptive', propositions: [{ text: 'La inmigración es positiva', type: 'descriptive', explicit: true }], entities: [], retrievalHints: [], clarificationRequired: false, routing: { status: 'published', primarySlug: 'unrelated', reason: 'unsafe', questions: [] } }, 'Desde que llegaron más extranjeros hay más inseguridad'));
assert(reconciledCausal.claimType === 'causal' && reconciledCausal.semanticSignature === causal.semanticSignature, 'Local model was allowed to weaken deterministic causal safety');
assert(reconciledCausal.propositions[0]?.text === causal.propositions[0]?.text, 'Local model replaced deterministic causal propositions');

const immigrationTrend = deterministicFallbackCompiler('Cada vez llegan más inmigrantes a España');
const normalizedImmigrationTrend = normalizeCompilerOutput({
  claimType: 'comparative',
  propositions: [{ text: 'Cada vez llegan más inmigrantes a España', type: 'comparative', explicit: true }],
  entities: ['inmigración'],
  retrievalHints: [],
  clarificationRequired: false,
}, 'Cada vez llegan más inmigrantes a España');
assert(immigrationTrend.claimType === 'trend', 'Immigration growth wording was not classified as a trend');
assert(normalizedImmigrationTrend.claimType === 'trend' && normalizedImmigrationTrend.semanticSignature === immigrationTrend.semanticSignature, 'Model comparative misclassification changed a reusable trend family');

const compoundInput = 'Hay más empleo y el paro sigue alto';
const deterministicCompound = deterministicFallbackCompiler(compoundInput);
const normalizedCompound = normalizeCompilerOutput({
  claimType: 'descriptive',
  propositions: [{ text: compoundInput, type: 'descriptive', explicit: true }],
  entities: [],
  retrievalHints: [],
  clarificationRequired: false,
  routing: { status: 'uncovered', primarySlug: '', reason: '', questions: [] },
}, compoundInput);
assert(deterministicCompound.explicitPropositions.length >= 2, 'Deterministic compiler did not split the compound regression input');
assert(normalizedCompound.explicitPropositions.length >= 2, 'Model output collapsed independently testable compound clauses');
assert(normalizedCompound.propositions.length >= 2 && normalizedCompound.claimType === deterministicCompound.claimType, 'Compound normalization lost structure or deterministic claim type');

const novelBudget = deterministicFallbackCompiler('El Gobierno quita 310 millones de Educación para pagar personal de Presidencia');
assert(novelBudget.evidenceNeeds.includes('importe') && novelBudget.evidenceNeeds.includes('partida') && novelBudget.evidenceNeeds.includes('impacto'), 'Novel budget claims do not expose the evidence dimensions needed for official retrieval');

const novelCausal = deterministicFallbackCompiler('La llegada de turistas está expulsando a los vecinos de mi municipio');
assert(novelCausal.evidenceNeeds.includes('causa') && novelCausal.evidenceNeeds.includes('territorio'), 'Novel local causal claims do not expose causal and geographic evidence requirements');
const metricParaphrase = normalizeCompilerOutput({ propositions: [{ text: 'La vivienda cuesta mucho más', type: 'trend', explicit: true }] }, 'Comprar una casa es cada vez más caro en España');
assert(metricParaphrase.metricIds.includes('house_price_index'), 'Equivalent housing-price wording did not resolve to the reusable metric family');
const comparisonParaphrase = normalizeCompilerOutput({ propositions: [{ text: 'España tiene más paro que Europa', type: 'comparative', explicit: true }] }, 'En España cuesta más encontrar trabajo que en la Unión Europea');
assert(comparisonParaphrase.metricIds.includes('unemployment_rate_europe'), 'Equivalent unemployment-comparison wording did not resolve to the reusable metric family');
const fraction = deterministicFallbackCompiler('Uno de cada tres jóvenes está en paro');
assert(fraction.evidenceNeeds.includes('tasa') && fraction.evidenceNeeds.includes('denominador'), 'Natural fraction claims do not expose rate and denominator requirements');

const invalid = normalizeCompilerOutput({ claimType: 'not-a-type', propositions: [] }, 'España está destruida');
assert(invalid.semanticSignature === deterministicFallbackCompiler('España está destruida').semanticSignature, 'Malformed model output did not fall back deterministically');

console.log('Local compiler contract validation passed: bounded extraction, deterministic numbers/signatures, and no answer/evidence injection.');
