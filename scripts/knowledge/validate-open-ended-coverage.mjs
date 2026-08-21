import { createRequire } from 'node:module';
import { deterministicFallbackCompiler } from './fallback-compiler.mjs';
import { metricCandidatesForQuery } from './metric-query-hints.mjs';
import { answerPlanForBroadDomain } from '../../src/lib/knowledge/broad-domain-snapshot.mjs';

const registry = createRequire(import.meta.url)('../../config/metric-registry.json');

const assert = (condition, message) => { if (!condition) throw new Error(message); };

const cases = [
  ['La sanidad pública está abandonada', ['healthcare']],
  ['La educación está cada vez peor', ['education']],
  ['La vivienda es imposible', ['housing']],
  ['El medio ambiente está peor', ['environment']],
  ['Los inmigrantes nos invaden', ['immigration']],
  ['Los inmigrantes crean inseguridad', ['immigration', 'crime']],
  ['Nos mienten con los datos del paro', ['unemployment']],
];

for (const [text, expectedConcepts] of cases) {
  const compiler = deterministicFallbackCompiler(text);
  const concepts = new Set(compiler.concepts || []);
  for (const concept of expectedConcepts) assert(concepts.has(concept), `${text}: missing semantic concept ${concept}`);
  const candidates = metricCandidatesForQuery(text, compiler.concepts || []);
  assert(candidates.size > 0, `${text}: no metric families were proposed`);
  for (const metricId of candidates) assert(registry[metricId], `${text}: proposed unknown metric ${metricId}`);
  if (text === 'Los inmigrantes crean inseguridad') {
    assert(candidates.has('foreign_born_population'), `${text}: immigration family was dropped`);
    assert([...candidates].some((metricId) => ['recorded_offences', 'standardised_homicide_rate'].includes(metricId)), `${text}: crime family was dropped`);
  }
}

const broadPolitical = deterministicFallbackCompiler('El país está fatal');
assert(metricCandidatesForQuery('El país está fatal', broadPolitical.concepts || []).size === 0, 'political scorecard wording was incorrectly assigned arbitrary metric families');

const rhetoricalCases = [
  ['Se maquillan las cifras del desempleo', 'unemployment', 'intent'],
  ['La llegada de extranjeros lo ocupa todo', 'immigration', 'loaded'],
  ['La inseguridad hace imposible salir', 'crime', 'loaded'],
  ['El país va cuesta abajo', 'politics', 'loaded'],
];
for (const [text, concept, profileKey] of rhetoricalCases) {
  const compiler = deterministicFallbackCompiler(text);
  assert(compiler.concepts?.includes(concept), `${text}: missing ${concept} concept`);
  assert(compiler.rhetoricalProfile?.requiresQualification, `${text}: rhetorical qualification missing`);
  assert(compiler.rhetoricalProfile?.[profileKey], `${text}: rhetorical profile missing ${profileKey}`);
}

for (const text of ['Nos mienten con los datos del paro', 'Los inmigrantes nos invaden', 'No se puede salir a la calle de cómo está el país']) {
  const plan = answerPlanForBroadDomain(text);
  assert(plan?.evidenceSummary?.mode === 'snapshot', `${text}: no reviewed broad-domain fallback`);
  assert((plan.evidenceSummary.families || []).length >= 2, `${text}: snapshot did not preserve independent families`);
  assert(plan.limitation, `${text}: snapshot omitted limitation`);
}

console.log(`Open-ended coverage validation passed: ${cases.length} unseen formulations, ${rhetoricalCases.length} rhetorical variants, and broad snapshot routing.`);
