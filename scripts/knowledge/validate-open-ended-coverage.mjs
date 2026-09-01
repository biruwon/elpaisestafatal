import { createRequire } from 'node:module';
import { deterministicFallbackCompiler } from './fallback-compiler.mjs';
import { metricCandidatesForQuery } from './metric-query-hints.mjs';
import { answerPlanForBroadDomain, answerPlanForBroadDomains, broadDomainPacketsFor } from '../../src/lib/knowledge/broad-domain-snapshot.mjs';

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
assert(publicAdministration?.evidenceSummary?.families.some((family) => family.data?.some((item) => item.includes('empleados públicos'))), 'public-administration packet did not expose concrete staffing data');
assert(publicAdministration?.blocks.find((block) => block.type === 'conversation_reply')?.text.includes('3.037.432'), 'public-administration response omitted the available staffing count');
assert(publicAdministration?.blocks.find((block) => block.type === 'conversation_reply')?.text.includes('Quedan sin resolver varias dimensiones'), 'public-administration response did not point to its missing performance measurements');
assert(publicAdministration?.blocks.some((block) => block.type === 'evidence_gap'), 'public-administration fallback did not declare its missing data');

const emergencyElection = answerPlanForBroadDomain('Me preocupa que un estado de emergencia permita no convocar elecciones y perpetuarse en el poder');
assert(emergencyElection?.headline.includes('estado excepcional'), 'emergency-election wording was routed to a generic compound response');
assert(emergencyElection?.summary.includes('calendario electoral'), 'emergency-election packet omitted the relevant legal checks');
assert(emergencyElection?.evidenceSummary?.families.some((family) => family.finding?.includes('declaración concreta')), 'emergency-election packet did not expose its legal evidence criterion');
assert(emergencyElection?.evidenceSummary?.families.every((family) => family.status && family.dimensions?.subject && family.dimensions?.geography), 'emergency-election packet did not expose family status and dimensions');
assert(emergencyElection?.blocks.find((block) => block.type === 'conversation_reply')?.text.includes('15 días'), 'emergency-election response omitted the concrete constitutional time limit');

const demographicPension = answerPlanForBroadDomain('Árbol demográfico completamente invertido: el sistema de pensiones es insostenible y arruina las arcas públicas');
assert(demographicPension?.headline.includes('pensiones'), 'demography-pension wording was routed to a generic pensions response');
assert(demographicPension?.headline.includes('puede aumentar'), 'demography-pension response stated pressure too definitively');
assert(demographicPension?.summary.includes('arcas públicas'), 'demography-pension packet omitted the public-finance part of the claim');
assert(demographicPension?.evidenceSummary?.families.some((family) => family.finding?.includes('cotizantes')), 'demography-pension packet did not expose demographic evidence');
const demographicPensionReply = demographicPension?.blocks.find((block) => block.type === 'conversation_reply')?.text || '';
assert(demographicPensionReply.includes('29,5') && demographicPensionReply.includes('personas de 65 años o más por cada 100') && demographicPensionReply.includes('prestaciones de vejez y supervivencia') && demographicPensionReply.includes('deuda pública'), 'demography-pension fallback did not render precisely labelled context values');
assert(demographicPension?.evidenceSummary?.families.some((family) => family.familyLabel === 'Demografía' && family.data?.length), 'demography-pension fallback did not attach its demographic snapshot value');
assert(demographicPension?.evidenceSummary?.families.some((family) => family.familyLabel === 'Pensiones' && family.data?.length), 'demography-pension fallback did not attach its pension snapshot value');
assert(demographicPension?.evidenceSummary?.families.some((family) => family.familyLabel === 'Arcas públicas' && family.data?.length), 'demography-pension fallback did not attach its public-finance snapshot value');
assert(demographicPension?.evidenceSummary?.mode === 'snapshot', 'demography-pension fallback did not identify itself as snapshot evidence');
assert(demographicPension?.evidenceSummary?.families.some((family) => family.status === 'missing'), 'demography-pension snapshot did not identify unmeasured evidence families');
assert(demographicPension?.evidenceSummary?.missingDimensions?.some((item) => item.includes('ingresos exclusivamente imputables a pensiones')) && demographicPension?.evidenceSummary?.missingDimensions?.some((item) => item.includes('saldo del sistema')), 'demography-pension response did not preserve scoped pension-balance gaps');
assert(demographicPension?.evidenceSummary?.families.every((family) => family.dimensions?.population && family.dimensions?.denominator), 'demography-pension response omitted population or denominator metadata');
assert(demographicPension?.evidenceSummary?.families.some((family) => family.familyLabel === 'Pensiones' && family.sourceIds?.includes('pension-spending-source')), 'demography-pension response did not attach the pension-spending source');
assert(demographicPension?.evidenceSummary?.families.some((family) => family.familyLabel === 'Arcas públicas' && family.sourceIds?.includes('public-finance-source')), 'demography-pension response did not attach the public-finance source');
const demographicPensionWithData = answerPlanForBroadDomain('Árbol demográfico completamente invertido: el sistema de pensiones es insostenible y arruina las arcas públicas', {
  observations: [
    { id: 'dependency-2024', metricId: 'old_age_dependency_ratio', value: 31.2, unit: 'personas por cada 100 en edad de trabajar', period: '2024' },
    { id: 'pension-2024', metricId: 'old_age_survivors_benefits_per_capita', value: 4194.66, unit: '€ por habitante', period: '2024' },
    { id: 'deficit-2024', metricId: 'government_deficit_ratio', value: -3.2, unit: '% del PIB', period: '2024' },
  ],
});
assert(demographicPensionWithData?.blocks.find((block) => block.type === 'conversation_reply')?.text.includes('31,2'), 'demography-pension packet did not render available measurements');
assert(demographicPensionWithData?.blocks.some((block) => block.type === 'evidence_gap'), 'demography-pension packet hid unresolved pension dimensions');
assert(demographicPensionWithData?.evidenceSummary?.families.some((family) => family.status === 'missing'), 'demography-pension dynamic context did not identify unmeasured evidence families');
const demographicPensionWithSeries = answerPlanForBroadDomain('Árbol demográfico completamente invertido: el sistema de pensiones es insostenible y arruina las arcas públicas', {
  observations: [
    { id: 'dependency-2015', metricId: 'old_age_dependency_ratio', value: 27.8, unit: 'personas por cada 100 en edad de trabajar', period: '2015' },
    { id: 'dependency-2025', metricId: 'old_age_dependency_ratio', value: 31.2, unit: 'personas por cada 100 en edad de trabajar', period: '2025' },
    { id: 'pension-2015', metricId: 'old_age_survivors_benefits_per_capita', value: 2803.07, unit: '€ por habitante', period: '2015' },
    { id: 'pension-2024', metricId: 'old_age_survivors_benefits_per_capita', value: 4194.66, unit: '€ por habitante', period: '2024' },
    { id: 'deficit-2015', metricId: 'government_deficit_ratio', value: -5.3, unit: '% del PIB', period: '2015' },
    { id: 'deficit-2025', metricId: 'government_deficit_ratio', value: -2.4, unit: '% del PIB', period: '2025' },
    { id: 'debt-2015', metricId: 'government_debt_ratio', value: 102.5, unit: '% del PIB', period: '2015' },
    { id: 'debt-2025', metricId: 'government_debt_ratio', value: 100.7, unit: '% del PIB', period: '2025' },
  ],
});
const seriesMissing = demographicPensionWithSeries?.evidenceSummary?.missingDimensions || [];
assert(demographicPensionWithSeries?.blocks.find((block) => block.type === 'conversation_reply')?.text.includes('31,2') && demographicPensionWithSeries?.blocks.find((block) => block.type === 'conversation_reply')?.text.includes('100,7'), 'demography-pension series response omitted latest compatible values');
assert(demographicPensionWithSeries?.limitation.includes('2015–2025'), 'demography-pension series response did not describe its observed period');
assert(!seriesMissing.includes('serie temporal de dependencia') && !seriesMissing.includes('saldo presupuestario del periodo') && !seriesMissing.includes('serie temporal de deuda'), 'demography-pension series left resolved dimensions in the pending list');
assert(seriesMissing.includes('relación entre cotizantes y pensionistas') && seriesMissing.includes('saldo del sistema') && seriesMissing.includes('proyección de ingresos y gastos'), 'demography-pension series discarded genuine pension-specific gaps');
assert(demographicPensionWithSeries?.evidenceSummary?.families.find((family) => family.familyLabel === 'Demografía')?.data?.some((item) => item.includes('Serie localizada')), 'demography-pension evidence did not visibly summarize the available series');
assert(demographicPensionWithSeries?.evidenceSummary?.families.find((family) => family.familyLabel === 'Demografía')?.dimensions?.period === '2015–2025', 'demography-pension evidence exposed only the first observation period');
const demographicPensionWithExpandedEvidence = answerPlanForBroadDomain('Árbol demográfico completamente invertido: el sistema de pensiones es insostenible y arruina las arcas públicas', {
  observations: [
    { id: 'projected-older-2022', metricId: 'projected_population_65_plus', value: 9526631, unit: 'Person', period: '2022' },
    { id: 'projected-older-2100', metricId: 'projected_population_65_plus', value: 15564375, unit: 'Person', period: '2100' },
    { id: 'projected-working-2022', metricId: 'projected_population_20_64', value: 28789376, unit: 'Person', period: '2022' },
    { id: 'projected-working-2100', metricId: 'projected_population_20_64', value: 22247813, unit: 'Person', period: '2100' },
    { id: 'pensioners-2024', metricId: 'old_age_survivors_pension_beneficiaries', value: 9259549, unit: 'Person', period: '2024' },
    { id: 'pension-spend-2024', metricId: 'old_age_survivors_benefits_total', value: 205009.77, unit: 'Million euro', period: '2024' },
    { id: 'social-contributions-2024', metricId: 'social_protection_contributions_total', value: 224466.22, unit: 'Million euro', period: '2024' },
    { id: 'government-contributions-2024', metricId: 'social_protection_government_contributions_total', value: 179973.5, unit: 'Million euro', period: '2024' },
  ],
});
const expandedReply = demographicPensionWithExpandedEvidence?.blocks.find((block) => block.type === 'conversation_reply')?.text || '';
assert(expandedReply.includes('Población de 65 años o más proyectada') && expandedReply.includes('Población de 20 a 64 años proyectada'), 'expanded pension response did not distinguish projected age groups');
assert(expandedReply.includes('205.009,77 millones de euros') && expandedReply.includes('224.466,22 millones de euros'), 'expanded pension response omitted total expenditure or contributions');
assert(demographicPensionWithExpandedEvidence?.evidenceSummary?.families.some((family) => family.label === 'Proyección demográfica' && family.status === 'available'), 'expanded pension evidence did not mark the complete demographic projection available');
assert(demographicPensionWithExpandedEvidence?.evidenceSummary?.families.some((family) => family.label === 'Cotizaciones sociales' && family.missingDimensions?.includes('ingresos exclusivamente imputables a pensiones')), 'expanded pension evidence lost the scope gap on social contributions');
assert(!expandedReply.includes('dato concreto sobre'), 'expanded pension response still used generic missing-data wording');

const youthLiving = answerPlanForBroadDomain('Precariedad de la población joven: suben los costes de vida, los salarios se estancan y no pueden comprar vivienda; ¿cuántos emigrarían sin la ayuda de sus padres?');
assert(youthLiving?.id === 'broad-youth-living-housing', 'youth housing claim collapsed into a single generic domain packet');
assert(youthLiving?.summary.includes('coste de vida') && youthLiving?.summary.includes('ingresos'), 'youth living packet omitted cost-of-living or income dimensions');
assert(youthLiving?.evidenceSummary?.families.some((family) => family.label === 'Ingresos y empleo'), 'youth living packet omitted employment and wage evidence family');
assert(youthLiving?.blocks.some((block) => block.type === 'evidence_gap' && block.missing.some((item) => item.includes('encuesta o modelo contrafactual'))), 'youth living packet did not disclose the counterfactual evidence gap');
assert(youthLiving?.evidenceSummary?.families.every((family) => family.status && family.dimensions?.subject && family.dimensions?.geography), 'youth living packet did not expose family status and dimensions');
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
assert(youthLivingWithData?.evidenceSummary?.families.some((family) => family.label === 'Apoyo familiar y emigración' && family.missingDimensions?.length), 'youth living packet hid the unavailable counterfactual dimension');

const securityClaim = 'La seguridad en España se ha ido a la mierda. Los nuevos españoles son los que acuchillan, roban, violan y pegan palizas, pero nadie hace nada porque no hay policía ni justicia, con tanto wokismo.';
const securityPlan = answerPlanForBroadDomain(securityClaim);
assert(broadDomainPacketsFor(securityClaim).map((packet) => packet.id).join(',') === 'broad-security', 'security claim inherited unrelated broad packets');
assert(securityPlan?.blocks.find((block) => block.type === 'conversation_reply')?.text.includes('2,47'), 'security response omitted the available offence count');
assert(securityPlan?.evidenceSummary?.families.some((family) => family.label === 'Grupo y causalidad' && family.missingDimensions?.includes('diseño causal')), 'security response did not preserve the group-causality gap');
assert(securityPlan?.evidenceSummary?.families.some((family) => family.label === '“Wokismo”'), 'security response treated the loaded political label as an evidence-free conclusion');

const replacementClaim = 'Hay un reemplazo poblacional. La gente que viene tiene menos IQ, es más manipulable y los políticos se aprovechan del sistema podrido.';
const replacementPlan = answerPlanForBroadDomain(replacementClaim);
assert(broadDomainPacketsFor(replacementClaim).map((packet) => packet.id).join(',') === 'broad-population-replacement', 'replacement claim inherited the generic economy packet');
assert(replacementPlan?.evidenceSummary?.families.some((family) => family.label === 'Composición demográfica'), 'replacement response omitted the population proposition');
assert(replacementPlan?.evidenceSummary?.families.some((family) => family.label === 'IQ y capacidades' && family.status === 'missing'), 'replacement response did not mark the IQ generalisation as missing');
assert(replacementPlan?.summary.includes('menor IQ') && replacementPlan?.summary.includes('políticos'), 'replacement response omitted substantive loaded propositions');

const taxClaim = 'Cada vez pagamos más impuestos, la inflación sube y los salarios pierden poder de compra. IRPF e IVA suben, el gasto público se dispara, los baby boomers se jubilan y el sistema solo aguanta subiendo impuestos.';
const taxPlan = answerPlanForBroadDomain(taxClaim);
assert(broadDomainPacketsFor(taxClaim).map((packet) => packet.id).join(',') === 'broad-tax-burden-purchasing-power', 'tax claim inherited generic employment or pension packets');
assert(taxPlan?.evidenceSummary?.families.some((family) => family.label === 'Ingresos e impuestos'), 'tax response omitted the tax proposition');
assert(taxPlan?.evidenceSummary?.families.some((family) => family.label === 'Precios y salarios'), 'tax response omitted the purchasing-power proposition');
assert(taxPlan?.evidenceSummary?.families.some((family) => family.label === 'Gasto y pensiones'), 'tax response omitted the pensions and spending proposition');
assert(taxPlan?.evidenceSummary?.families.some((family) => family.label === 'Conclusión causal' && family.missingDimensions?.includes('mecanismo y comparación causal')), 'tax response did not scope its causal gap');

for (const text of ['Legalización masiva de inmigrantes', '¿Se ha aprobado una regularización masiva de inmigrantes?']) {
  const plan = answerPlanForBroadDomain(text);
  assert(plan?.headline.includes('Regularización'), `${text}: wording was routed to an unrelated immigration packet`);
  assert(plan?.summary.includes('solicitudes'), `${text}: regularization packet omitted the key distinction between process counts`);
  assert(plan?.evidenceSummary?.families.some((family) => family.finding?.includes('1.174.978')), `${text}: regularization packet did not expose the official process figures`);
  assert(plan?.blocks.find((block) => block.type === 'conversation_reply')?.text.includes('1.174.978'), `${text}: response text omitted the figures already present in the evidence packet`);
}

const compoundClaim = 'Legalización masiva de inmigrantes, provocando un colapso total de los servicios públicos y un incremento exponencial en esa parte de la población que necesita las paguitas para vivir.';
const compoundPlan = answerPlanForBroadDomains(compoundClaim);
const compoundFamilies = compoundPlan?.evidenceSummary?.families || [];
assert(compoundPlan?.id === 'broad-compound-claim', 'compound claim did not use the composed evidence plan');
assert(compoundFamilies.some((family) => family.familyId === 'broad-immigration-regularization' && family.familyLabel === 'Inmigración y regularización'), 'compound claim lost regularisation evidence family');
assert(compoundFamilies.some((family) => family.familyId === 'broad-public-services' && family.familyLabel === 'Servicios públicos'), 'compound claim lost public-services evidence family');
assert(compoundFamilies.some((family) => family.familyId === 'broad-benefits-recipients' && family.familyLabel === 'Prestaciones'), 'compound claim lost benefits evidence family');
assert(compoundFamilies.every((family) => family.criteria?.length === 3 && family.sourceIds?.length), 'compound claim did not preserve grouped criteria and source attribution');
assert(compoundFamilies.every((family) => ['available', 'partial', 'missing'].includes(family.status)), 'compound claim did not assign an evidence status to every family');
assert(compoundFamilies.every((family) => family.criteria?.every((criterion) => criterion.status && criterion.dimensions?.subject && criterion.dimensions?.geography)), 'compound claim did not preserve criterion status and dimensions');
assert(compoundFamilies.map((family) => family.familyId).join(',') === 'broad-immigration-regularization,broad-public-services,broad-benefits-recipients', 'compound claim families are not ordered as submitted');
const regularizationFamily = compoundFamilies.find((family) => family.familyId === 'broad-immigration-regularization');
assert(regularizationFamily?.data?.includes('Solicitudes: 1.174.978 (2026-07-02)') && regularizationFamily?.data?.includes('Expedientes tramitados: 609.737 (2026-07-02)'), 'regularisation values are not atomic or period-labelled');
assert(regularizationFamily?.missingDimensions?.includes('autorizaciones concedidas'), 'regularisation result does not expose the missing legal outcome');
assert(compoundFamilies.find((family) => family.familyId === 'broad-public-services')?.missingDimensions?.includes('servicio concreto'), 'service gap is not scoped to a concrete missing field');
assert(compoundPlan.evidenceSummary.missingDimensions?.some((item) => item.includes('norma o programa')), 'compound evidence did not preserve scoped missing fields');
assert(!compoundPlan.blocks.find((block) => block.type === 'conversation_reply')?.text.includes('Quedan abiertos estos datos:'), 'compound reply still contains the raw aggregate gap checklist');
assert(compoundPlan.headline !== 'La administración pública requiere medir plantilla, desempeño y calidad del servicio', 'compound claim was hijacked by administration routing');
assert(compoundPlan.blocks.find((block) => block.type === 'conversation_reply')?.text.includes('1.174.978'), 'compound claim lost regularisation figures');
assert(compoundPlan.evidenceSummary.missingDimensions?.some((item) => item.includes('servicio concreto')), 'compound claim did not expose missing service measurements');
assert(compoundPlan.evidenceSummary.missingDimensions?.some((item) => item.includes('perceptores')), 'compound claim did not expose missing benefits measurements');
assert(!compoundPlan.sourceLinks.some((source) => /asilo|asylum/i.test(source.title)), 'compound claim presented unrelated asylum evidence');
assert(compoundPlan.blocks.find((block) => block.type === 'conversation_reply')?.text.includes('no prueba causalidad'), 'compound claim omitted the causal limitation');

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
