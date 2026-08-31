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
  ['El sistema de pensiones es insostenible', ['pension_system']],
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
  if (text === 'El sistema de pensiones es insostenible') {
    assert(candidates.has('old_age_dependency_ratio'), `${text}: pension dependency family was dropped`);
    assert(!candidates.has('imv_title_holders_by_nationality'), `${text}: benefits-by-nationality metric leaked into pensions claim`);
  }
}

const broadPolitical = deterministicFallbackCompiler('El país está fatal');
assert(metricCandidatesForQuery('El país está fatal', broadPolitical.concepts || []).size === 0, 'political scorecard wording was incorrectly assigned arbitrary metric families');

const publicAdministration = answerPlanForBroadDomain('Administración pública completamente degradada: hay puestos prescindibles ocupados por funcionarios que no trabajan');
assert(publicAdministration?.headline.includes('administración pública'), 'public-administration wording was routed to an unrelated broad packet');
assert(publicAdministration?.summary.includes('No existe una cifra oficial'), 'public-administration packet did not answer the request for a count');
assert(publicAdministration?.summary.includes('obligaciones de rendimiento'), 'public-administration packet omitted the distinction between tenure and accountability');
assert(publicAdministration?.evidenceSummary?.families.some((family) => family.finding?.includes('empleados públicos')), 'public-administration packet did not expose concrete criterion findings');

const emergencyElection = answerPlanForBroadDomain('Me preocupa que un estado de emergencia permita no convocar elecciones y perpetuarse en el poder');
assert(emergencyElection?.headline.includes('estado excepcional'), 'emergency-election wording was routed to a generic compound response');
assert(emergencyElection?.summary.includes('calendario electoral'), 'emergency-election packet omitted the relevant legal checks');
assert(emergencyElection?.evidenceSummary?.families.some((family) => family.finding?.includes('declaración concreta')), 'emergency-election packet did not expose its legal evidence criterion');

const demographicPension = answerPlanForBroadDomain('Árbol demográfico completamente invertido: el sistema de pensiones es insostenible y arruina las arcas públicas');
assert(demographicPension?.headline.includes('pensiones'), 'demography-pension wording was routed to a generic pensions response');
assert(demographicPension?.summary.includes('arcas públicas'), 'demography-pension packet omitted the public-finance part of the claim');
assert(demographicPension?.evidenceSummary?.families.some((family) => family.finding?.includes('cotizantes')), 'demography-pension packet did not expose demographic evidence');

for (const text of ['Legalización masiva de inmigrantes', '¿Se ha aprobado una regularización masiva de inmigrantes?']) {
  const plan = answerPlanForBroadDomain(text);
  assert(plan?.headline.includes('Regularización'), `${text}: wording was routed to an unrelated immigration packet`);
  assert(plan?.summary.includes('solicitudes'), `${text}: regularization packet omitted the key distinction between process counts`);
  assert(plan?.evidenceSummary?.families.some((family) => family.finding?.includes('1.174.978')), `${text}: regularization packet did not expose the official process figures`);
}

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

for (const text of ['Nos mienten con los datos del paro', 'Los inmigrantes nos invaden', 'No se puede salir a la calle de cómo está el país', 'El alquiler es imposible para los jóvenes']) {
  const plan = answerPlanForBroadDomain(text);
  assert(plan?.evidenceSummary?.mode === 'snapshot', `${text}: no reviewed broad-domain fallback`);
  assert((plan.evidenceSummary.families || []).length >= 2, `${text}: snapshot did not preserve independent families`);
  assert(plan.limitation, `${text}: snapshot omitted limitation`);
}

console.log(`Open-ended coverage validation passed: ${cases.length} unseen formulations, ${rhetoricalCases.length} rhetorical variants, and broad snapshot routing.`);
