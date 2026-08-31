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
assert(publicAdministration?.blocks.find((block) => block.type === 'conversation_reply')?.text.includes('No se localizaron valores compatibles'), 'public-administration response did not disclose its missing measurements');
assert(publicAdministration?.blocks.some((block) => block.type === 'evidence_gap'), 'public-administration fallback did not declare its missing data');

const emergencyElection = answerPlanForBroadDomain('Me preocupa que un estado de emergencia permita no convocar elecciones y perpetuarse en el poder');
assert(emergencyElection?.headline.includes('estado excepcional'), 'emergency-election wording was routed to a generic compound response');
assert(emergencyElection?.summary.includes('calendario electoral'), 'emergency-election packet omitted the relevant legal checks');
assert(emergencyElection?.evidenceSummary?.families.some((family) => family.finding?.includes('declaración concreta')), 'emergency-election packet did not expose its legal evidence criterion');

const demographicPension = answerPlanForBroadDomain('Árbol demográfico completamente invertido: el sistema de pensiones es insostenible y arruina las arcas públicas');
assert(demographicPension?.headline.includes('pensiones'), 'demography-pension wording was routed to a generic pensions response');
assert(demographicPension?.summary.includes('arcas públicas'), 'demography-pension packet omitted the public-finance part of the claim');
assert(demographicPension?.evidenceSummary?.families.some((family) => family.finding?.includes('cotizantes')), 'demography-pension packet did not expose demographic evidence');
assert(demographicPension?.blocks.some((block) => block.type === 'evidence_gap'), 'demography-pension fallback did not declare its missing data');
const demographicPensionWithData = answerPlanForBroadDomain('Árbol demográfico completamente invertido: el sistema de pensiones es insostenible y arruina las arcas públicas', {
  observations: [
    { id: 'dependency-2024', metricId: 'old_age_dependency_ratio', value: 31.2, unit: 'personas por cada 100 en edad de trabajar', period: '2024' },
    { id: 'pension-2024', metricId: 'old_age_survivors_benefits_per_capita', value: 4194.66, unit: '€ por habitante', period: '2024' },
    { id: 'deficit-2024', metricId: 'government_deficit_ratio', value: -3.2, unit: '% del PIB', period: '2024' },
  ],
});
assert(demographicPensionWithData?.blocks.find((block) => block.type === 'conversation_reply')?.text.includes('31,2'), 'demography-pension packet did not render available measurements');
assert(!demographicPensionWithData?.blocks.some((block) => block.type === 'evidence_gap'), 'demography-pension packet declared a gap despite available measurements');

const youthLiving = answerPlanForBroadDomain('Precariedad de la población joven: suben los costes de vida, los salarios se estancan y no pueden comprar vivienda; ¿cuántos emigrarían sin la ayuda de sus padres?');
assert(youthLiving?.id === 'broad-youth-living-housing', 'youth housing claim collapsed into a single generic domain packet');
assert(youthLiving?.summary.includes('coste de vida') && youthLiving?.summary.includes('ingresos'), 'youth living packet omitted cost-of-living or income dimensions');
assert(youthLiving?.evidenceSummary?.families.some((family) => family.label === 'Ingresos y empleo'), 'youth living packet omitted employment and wage evidence family');
assert(youthLiving?.blocks.some((block) => block.type === 'evidence_gap' && block.missing.some((item) => item.includes('apoyo familiar'))), 'youth living packet did not disclose the counterfactual evidence gap');
const youthLivingWithData = answerPlanForBroadDomain('Precariedad de la población joven: suben los costes de vida, los salarios se estancan y no pueden comprar vivienda; ¿cuántos emigrarían sin la ayuda de sus padres?', {
  observations: [
    { id: 'cpi-2025', metricId: 'cpi_index', value: 118.4, unit: 'índice', period: '2025' },
    { id: 'wage-2022', metricId: 'median_hourly_earnings', value: 12.1, unit: '€ por hora', period: '2022' },
    { id: 'youth-unemployment-2025', metricId: 'youth_unemployment_rate', value: 24.9, unit: '%', period: '2025' },
    { id: 'house-price-2025', metricId: 'house_price_index', value: 154.2, unit: 'índice', period: '2025' },
    { id: 'housing-burden-2024', metricId: 'housing_cost_overburden_rate', value: 9.1, unit: '%', period: '2024' },
    { id: 'construction-2025', metricId: 'construction_output_index', value: 109.3, unit: 'índice', period: '2025' },
  ],
});
const youthReply = youthLivingWithData?.blocks.find((block) => block.type === 'conversation_reply')?.text || '';
assert(youthReply.includes('118,4') && youthReply.includes('24,9') && youthReply.includes('154,2'), 'youth living packet did not render available cross-domain measurements');
assert(youthReply.includes('apoyo familiar y emigración'), 'youth living packet hid the unavailable counterfactual dimension');

for (const text of ['Legalización masiva de inmigrantes', '¿Se ha aprobado una regularización masiva de inmigrantes?']) {
  const plan = answerPlanForBroadDomain(text);
  assert(plan?.headline.includes('Regularización'), `${text}: wording was routed to an unrelated immigration packet`);
  assert(plan?.summary.includes('solicitudes'), `${text}: regularization packet omitted the key distinction between process counts`);
  assert(plan?.evidenceSummary?.families.some((family) => family.finding?.includes('1.174.978')), `${text}: regularization packet did not expose the official process figures`);
  assert(plan?.blocks.find((block) => block.type === 'conversation_reply')?.text.includes('1.174.978'), `${text}: response text omitted the figures already present in the evidence packet`);
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
