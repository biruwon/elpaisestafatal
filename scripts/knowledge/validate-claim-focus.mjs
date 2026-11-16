import assert from 'node:assert/strict';
import { utils, write } from 'xlsx';
import { canSkipLocalCompilerForFocusedMeasurement, claimFocusFor, focusedMetricIdsFor } from '../../src/lib/knowledge/claim-focus.mjs';
import { focusedEvidencePlan } from '../../src/lib/knowledge/focused-evidence-plan.mjs';
import { broadDomainPacketsFor } from '../../src/lib/knowledge/broad-domain-snapshot.mjs';
import { answerPlanForBroadDomains } from '../../src/lib/knowledge/broad-domain-snapshot.mjs';
import { publicResolveResponse } from '../../src/lib/knowledge/public-response.mjs';
import { needsScopedMeasurement } from '../../src/lib/knowledge/measurement-intent.mjs';
import { measurementMeaningPlan } from '../../src/lib/knowledge/measurement-meaning.mjs';
import { shouldRetainReviewedPreview } from '../../src/lib/knowledge/reviewed-answer-stability.mjs';
import { localPublicCheckResponse } from '../lib/local-public-check-response.mjs';
import { parsePrimaryCareBarometerWorkbook } from './domain-connectors.mjs';
import { validateAnswerPlan } from './answer-plan-validation.mjs';
import { alignPropositionOutcomes, comparableObservationGroups, composePropositionFindings, evidenceForProposition } from '../lib/compound-evidence.mjs';
import { rankWarehouseObservations } from './warehouse-query.mjs';
import { deterministicFallbackCompiler } from './fallback-compiler.mjs';

const cases = [
  ['gdp-household-welfare', ['Las cifras de crecimiento del PIB no reflejan cómo vive el hogar medio', 'Que el PIB crezca no se traduce directamente en una mejora de la vida de las familias', 'El PIB por habitante no refleja cómo se reparte la prosperidad entre los hogares']],
  ['education-employment-outcomes', ['Un título universitario ya no garantiza encontrar un empleo cualificado', 'Tener estudios superiores no asegura trabajar en un puesto acorde con la titulación', 'La universidad ya no asegura encontrar trabajo acorde con sus estudios', 'La tasa de paro de titulados universitarios ha subido', 'Los graduados tienen menos empleo que quienes cursan formación profesional']],
  ['job-opportunities', ['No hay trabajo', 'Aquí hay pocas ofertas de empleo', 'Es difícil encontrar trabajo en España', 'Los jóvenes no encuentran empleo', 'Empleo no hay', 'No hay empleo temporal', 'Hay pocos trabajos bien pagados']],
  ['working-poverty', ['En España se puede trabajar a jornada completa y seguir sin llegar a fin de mes', 'Tener trabajo a tiempo completo no impide ser pobre', 'La pobreza también alcanza a personas ocupadas']],
  ['real-wages', ['Los salarios pierden poder adquisitivo frente al coste de la vida', 'Los sueldos no siguen el ritmo de los precios', 'La inflación se come la nómina']],
  ['rental-affordability', ['Con un sueldo normal ya no se puede alquilar un piso entero solo', 'El alquiler se lleva la mitad de los ingresos', 'La renta mensual consume casi todo el salario']],
  ['matched-pay', ['Las empresas españolas pagan menos por el mismo perfil profesional', 'Los salarios difieren entre países aun desempeñando el mismo puesto', 'Mismo trabajo y sueldo distinto según el país']],
  ['primary-care-waits', ['Hay que esperar demasiado para conseguir cita con el médico de familia', '¿Cuántos días tarda una cita en atención primaria?', 'La cita con el médico de cabecera llega con mucha demora']],
  ['private-healthcare-access', ['Se contrata seguro privado para evitar esperas de especialistas', '¿La sanidad privada permite acceder antes a las pruebas?', 'El seguro privado se compra por la rapidez de las citas']],
  ['electricity-price-transmission', ['El gas encarece la electricidad en el sistema marginalista', 'Los hogares no notan la electricidad barata de las renovables', 'El precio mayorista no llega íntegro a la factura de la luz']],
  ['rail-punctuality', ['Los retrasos de Cercanías hacen perder horas a los pasajeros', 'Los trenes de Renfe son poco puntuales', 'Las compensaciones por demoras ferroviarias no cubren el tiempo perdido']],
  ['pension-financing', ['El trabajador no ahorra sus cotizaciones para su propia pensión sino que financia a los jubilados actuales', '¿Las pensiones públicas usan reparto o cuentas individuales?', 'Las cotizaciones sostienen las jubilaciones actuales']],
  ['future-pension-outlook', ['Los jóvenes actuales pagarán pensiones durante décadas pero cobrarán una pensión relativamente menor', 'Las generaciones jóvenes esperan cobrar una pensión más baja al jubilarse', '¿Qué pensión recibirán en el futuro quienes cotizan hoy?']],
  ['pension-wage-comparison', ['Hay jubilados con pensiones superiores al sueldo de muchos trabajadores jóvenes', 'Los jubilados cobran pensiones más altas que el salario de muchos jóvenes empleados', 'La pensión media supera los ingresos mensuales de muchos trabajadores jóvenes', 'Los jubilados cobran más que los trabajadores jóvenes']],
  ['self-employment-cost-viability', ['La cuota y los costes fijos hacen inviable ser autónomo con ingresos bajos o irregulares', 'Los gastos obligatorios de los autónomos impiden sostener una actividad con ingresos irregulares', 'Ser autónomo deja de compensar cuando la cuota fija supera los ingresos bajos']],
  ['healthcare-double-payment', ['Muchas familias sienten que pagan dos veces por sanidad al pagar impuestos y además un seguro privado', 'Tener un seguro médico privado y pagar impuestos supone dos pagos relacionados con la atención sanitaria pública y privada', 'La prima del seguro privado se suma a los impuestos que financian la sanidad']],
  ['entrepreneurial-risk-perception', ['Emprender en España se percibe como más arriesgado que buscar una plaza pública', 'Crear una empresa parece más arriesgado que preparar una oposición', 'El riesgo percibido de emprender es mayor que el de trabajar como funcionario']],
  ['housing-supply', ['Los pisos turísticos retiran vivienda del alquiler residencial', 'Los apartamentos turísticos reducen la oferta de viviendas para residentes', '¿Cuántas casas vacías hay disponibles en la ciudad?']],
  ['foreign-housing-price-causality', ['Las compras de vivienda por extranjeros no residentes están encareciendo el mercado en zonas costeras', 'Las adquisiciones de compradores extranjeros elevan los precios de las casas en la costa']],
  ['migration-housing-demand-causality', ['La inmigración está haciendo que suban los alquileres en algunas ciudades', 'El aumento de población migrante eleva los precios de la vivienda local', 'Los extranjeros encarecen los alquileres en las ciudades']],
  ['work-housing-independence', ['Tener un trabajo a jornada completa ya no garantiza poder independizarse', 'Un empleo a tiempo completo no basta para vivir por cuenta propia', 'Trabajar a jornada completa no asegura poder emanciparse']],
  ['sector-wage-comparison', ['El turismo aumenta el PIB pero genera menos salarios altos que sectores de mayor productividad', 'Los sueldos turísticos son más bajos que en las industrias más productivas', 'En hostelería se pagan menos salarios altos que en otros sectores']],
  ['nominal-wages', ['Los salarios españoles son más bajos que los europeos', 'El sueldo ha bajado durante años', 'Las remuneraciones aumentan en España']],
  ['rural-urban-service-access', ['La España rural tiene vivienda más barata, pero peor acceso a empleo, sanidad, educación y transporte', 'En los pueblos cuesta menos la vivienda, aunque quienes viven allí tienen menos acceso a servicios y trabajo que en las ciudades', 'La población rural tiene peor acceso a vivienda, salud y transporte que la población urbana']],
];
for (const [family, paraphrases] of cases) for (const claim of paraphrases) {
  assert.equal(claimFocusFor(claim)?.id, family, claim);
  assert.equal(broadDomainPacketsFor(claim).length, 0, `A precise claim inherited a broad packet: ${claim}`);
}
const focusedTextClaim = 'La tasa de paro de titulados universitarios ha subido';
const focusedTextCompilation = deterministicFallbackCompiler(focusedTextClaim);
assert.equal(canSkipLocalCompilerForFocusedMeasurement(focusedTextClaim, { propositions: focusedTextCompilation.explicitPropositions, clarificationRequired: focusedTextCompilation.clarificationRequired, claimType: focusedTextCompilation.claimType }), true, 'A reviewed descriptive measurement claim can use deterministic interpretation');
assert.equal(canSkipLocalCompilerForFocusedMeasurement(focusedTextClaim, { propositions: focusedTextCompilation.explicitPropositions, clarificationRequired: focusedTextCompilation.clarificationRequired, claimType: 'comparative' }), false, 'A comparison must retain structured interpretation');
assert.equal(canSkipLocalCompilerForFocusedMeasurement(focusedTextClaim, { propositions: focusedTextCompilation.explicitPropositions, clarificationRequired: focusedTextCompilation.clarificationRequired }), false, 'An unknown claim type must retain structured interpretation');
const focusedTextCompound = 'La cuota y los costes fijos hacen inviable ser autónomo con ingresos bajos o irregulares, y los precios de vivienda suben';
const focusedTextCompoundCompilation = deterministicFallbackCompiler(focusedTextCompound);
assert.equal(focusedTextCompoundCompilation.explicitPropositions.length, 2, 'A reviewed claim with an unrelated second proposition must be detected as compound');
assert.equal(canSkipLocalCompilerForFocusedMeasurement(focusedTextCompound, { propositions: focusedTextCompoundCompilation.explicitPropositions, clarificationRequired: focusedTextCompoundCompilation.clarificationRequired, claimType: focusedTextCompoundCompilation.claimType }), false, 'A compound claim must retain structured interpretation');
const partlyParsedCompound = 'La tasa de paro de titulados universitarios ha subido, y los precios de vivienda suben';
const partlyParsedCompilation = deterministicFallbackCompiler(partlyParsedCompound);
assert.equal(partlyParsedCompilation.explicitPropositions.length, 1, 'This nearby conjunction currently remains one fallback proposition');
assert.equal(canSkipLocalCompilerForFocusedMeasurement(partlyParsedCompound, { propositions: partlyParsedCompilation.explicitPropositions, clarificationRequired: partlyParsedCompilation.clarificationRequired, claimType: partlyParsedCompilation.claimType }), false, 'A conjunction must not enter the fast path if the parser leaves it unsplit');
assert.equal(canSkipLocalCompilerForFocusedMeasurement(focusedTextClaim, { propositions: focusedTextCompilation.explicitPropositions, clarificationRequired: true, claimType: focusedTextCompilation.claimType }), false, 'A clarification-required claim must retain structured interpretation');
const causalFocusedClaim = 'Las compras de vivienda por extranjeros no residentes encarecen las zonas costeras';
const causalFocusedCompilation = deterministicFallbackCompiler(causalFocusedClaim);
assert.equal(claimFocusFor(causalFocusedClaim)?.claimType, 'causal', 'The foreign-housing family must retain its causal evidence contract');
assert.equal(canSkipLocalCompilerForFocusedMeasurement(causalFocusedClaim, { propositions: causalFocusedCompilation.explicitPropositions, clarificationRequired: causalFocusedCompilation.clarificationRequired, claimType: causalFocusedCompilation.claimType }), false, 'A causal family must retain structured model interpretation even when fallback wording looks descriptive');
const employerContributionClaim = 'Las cotizaciones empresariales ocultan parte del coste laboral real que soporta cada empleo';
const employerContributionCompilation = deterministicFallbackCompiler(employerContributionClaim);
assert.equal(canSkipLocalCompilerForFocusedMeasurement(employerContributionClaim, { propositions: employerContributionCompilation.explicitPropositions, clarificationRequired: employerContributionCompilation.clarificationRequired, claimType: employerContributionCompilation.claimType }), false, 'A nearby, non-focused claim must retain normal compiler selection');
for (const [claim, expected] of [
  ['Un título universitario no garantiza encontrar un empleo acorde con los estudios', ['employment_rate_tertiary_education', 'tertiary_overqualification_rate']],
  ['La tasa de paro de titulados superiores ha subido', ['unemployment_rate_tertiary_education']],
  ['¿Cuál es la tasa de empleo de titulados superiores?', ['employment_rate_tertiary_education']],
  ['Los titulados universitarios están sobrecualificados en sus empleos', ['tertiary_overqualification_rate']],
  ['¿Qué proporción de personas ocupadas con estudios superiores trabaja en puestos que no requieren ese nivel?', ['tertiary_overqualification_rate']],
]) assert.deepEqual([...focusedMetricIdsFor(claim)], expected, `Education-employment paraphrase selected the wrong measures: ${claim}`);
for (const claim of [
  'Cada vez se exige un máster para los puestos de titulados universitarios',
  'Los graduados tienen más empleo que quienes cursan formación profesional',
  'El empleo de universitarios es menor que el de otros titulados',
  'Los recién graduados no encuentran su primer empleo',
  'La tasa de paro de titulados universitarios de 25 a 34 años',
  'Compara el empleo de titulados superiores de 20 a 64 años con el de 25 a 34 años',
  'La tasa de empleo de titulados universitarios en Europa',
]) assert.deepEqual([...focusedMetricIdsFor(claim)], [], `A nearby education claim used an incompatible tertiary series: ${claim}`);
assert.equal(claimFocusFor('Se contrata un seguro privado para evitar esperas de especialistas')?.id, 'private-healthcare-access', 'A waiting-time claim must stay in the access family, not the double-payment family');
assert.equal(claimFocusFor('¿Las pensiones públicas se financian con las cotizaciones actuales?')?.id, 'pension-financing', 'A funding question must stay in the pension-financing family, not a salary comparison');
assert.deepEqual([...focusedMetricIdsFor('Los costes fijos impiden a los autónomos sostenerse con ingresos irregulares')], [], 'General income and wage series must not stand in for self-employment viability');
assert.notEqual(claimFocusFor('Las cotizaciones empresariales ocultan parte del coste laboral real que soporta cada empleo')?.id, 'self-employment-cost-viability', 'Employer contributions crossed into the self-employment cost family');
for (const claim of ['La temporalidad laboral ha bajado', 'La tasa de paro juvenil es elevada', 'Qué porcentaje de jóvenes activos no encuentra trabajo', 'Cuántas vacantes de empleo hay', 'El porcentaje de jóvenes de 25 a 34 años con estudios superiores aumentó', 'Los inmigrantes causan que no haya trabajo', 'Los hospitales tienen pocas camas', 'El seguro del coche ha subido', 'Los trenes transportan más pasajeros', 'Mi plan de pensiones privado acumula ahorro en una cuenta individual', '¿Cuánto cuesta comprar una vivienda en España?', '¿Cómo han evolucionado los precios del alquiler desde 2015?', '¿Cuál es el índice de precios del alquiler actual?', 'Emprender es más arriesgado que trabajar en una empresa privada', '¿Cómo ha crecido el PIB real en España?', 'El turismo aporta más al PIB', '¿Cuál es la renta mediana equivalente de los hogares españoles?', 'La renta mediana equivalente creció más que el PIB en 2025']) {
  assert.equal(claimFocusFor(claim), undefined, `Neighbour crossed into a different measurement: ${claim}`);
}
assert.equal(claimFocusFor('Trabajar a jornada completa y ser pobre')?.id, 'working-poverty', 'A full-time poverty claim must not cross into housing independence');
assert.equal(claimFocusFor('Los pisos turísticos han retirado viviendas del alquiler residencial')?.id, 'housing-supply', 'Tourist-housing supply claims must retain their own evidence contract');
for (const claim of [
  '¿Cuántas personas extranjeras no residentes compraron vivienda en España?',
  '¿Cuánto subieron los precios de la vivienda en las zonas costeras?',
]) assert.equal(claimFocusFor(claim), undefined, `A nearby claim crossed into a different housing evidence contract: ${claim}`);
assert.equal(claimFocusFor('Las cotizaciones actuales financian las pensiones vigentes')?.id, 'pension-financing', 'Current pension financing must stay separate from future benefit projections');
const specificButUncovered = [
  'La cita previa obligatoria ha convertido trámites básicos en una barrera',
  'Muchos autónomos necesitan pagar una gestoría solo para cumplir con Hacienda y Seguridad Social',
  'Los delitos menores se denuncian menos porque muchas víctimas creen que no servirá para recuperar lo robado',
  'Los pacientes rurales tienen menos acceso a médicos y especialistas que quienes viven en ciudades',
  'Los jóvenes con salarios españoles compiten por vivienda con trabajadores remotos que cobran salarios extranjeros',
  'El empleo público ofrece mejores condiciones que empleos privados equivalentes',
  'Los impuestos, peajes y cargos hacen que la factura final se mueva de forma distinta al precio mayorista',
  'Los impuestos sobre comprar, vender y mantener vivienda dificultan cambiar de casa por trabajo',
  'El trabajo irregular beneficia a empresarios que quieren reducir costes laborales',
  'Reducir drásticamente el turismo destruiría empleo en regiones muy dependientes de él',
  'Los beneficios del turismo no se reparten de forma proporcional entre trabajadores y propietarios',
];
for (const claim of specificButUncovered) {
  assert.equal(needsScopedMeasurement(claim), true, claim);
  assert.equal(broadDomainPacketsFor(claim).length, 0, `An unsupported narrow claim inherited a broad packet: ${claim}`);
}
assert.equal(measurementMeaningPlan('El empleo público ofrece mejores condiciones que empleos privados equivalentes'), undefined, 'A comparison of equivalent jobs must not be routed to the employment-rate definition');
assert.equal(measurementMeaningPlan('¿Qué mide la tasa de empleo?')?.headline, 'Qué mide tasa de empleo', 'An explicit request for a definition must retain the metric explainer');
const ruralAccess = focusedEvidencePlan('La España rural tiene vivienda más barata, pero peor acceso a empleo, sanidad, educación y transporte');
assert.equal(ruralAccess.answerScope.family, 'rural-urban-service-access');
assert.match(ruralAccess.shareableReply, /promedios nacionales.*no permiten concluir/i);
assert.equal(ruralAccess.sourceLinks.length, 0, 'National indicators must not be presented as rural-versus-urban evidence');
const gdpHousehold = focusedEvidencePlan('Las cifras de crecimiento del PIB no reflejan cómo vive el hogar medio');
assert.equal(gdpHousehold.answerScope.family, 'gdp-household-welfare');
assert.equal(gdpHousehold.evidenceLevel, 'limited', 'Definitions explain the scope but do not establish household outcomes');
assert.equal(gdpHousehold.sourceLinks.length, 2, 'The GDP and household-income definitions need direct official sources');
assert.match(gdpHousehold.shareableReply, /aproximaci[oó]n al nivel material de vida/);
assert.match(gdpHousehold.shareableReply, /renta disponible equivalente/);
assert.match(gdpHousehold.shareableReply, /no demuestra que el crecimiento no les beneficie/);
assert.doesNotMatch(gdpHousehold.shareableReply, /\d/);
const gdpHouseholdPublic = localPublicCheckResponse({ status: 'complete', requestId: 'gdp-households', result: gdpHousehold }, 'Las cifras de crecimiento del PIB no reflejan cómo vive el hogar medio');
assert.equal(gdpHouseholdPublic.state, 'limited');
assert.equal(gdpHouseholdPublic.result.sources.length, 2, 'The public response must retain both definition sources');
const selfEmploymentCosts = focusedEvidencePlan('La cuota y los costes fijos hacen inviable ser autónomo con ingresos bajos o irregulares', { observations: [
  { id: 'general-income', metricId: 'median_equivalised_income', value: 20367, period: '2025', unit: 'EUR', source: { id: 'income-source', title: 'Median income', url: 'https://example.org/income' } },
  { id: 'general-wage', metricId: 'median_hourly_earnings', value: 11.02, period: '2022', unit: 'EUR/hour', source: { id: 'wage-source', title: 'Median wage', url: 'https://example.org/wages' } },
  { id: 'general-contributions', metricId: 'social_security_contributions', value: 180000, period: '2025', unit: 'million EUR', source: { id: 'contributions-source', title: 'Social security contributions', url: 'https://example.org/contributions' } },
] });
assert.equal(selfEmploymentCosts.answerScope.family, 'self-employment-cost-viability');
assert.equal(selfEmploymentCosts.evidenceLevel, 'insufficient');
assert.deepEqual(selfEmploymentCosts.evidenceIds, [], 'General income, wage and aggregate contribution totals cannot measure self-employment viability');
assert.deepEqual(selfEmploymentCosts.sourceLinks, [], 'Irrelevant adjacent financial series must not appear as supporting sources');
assert.match(selfEmploymentCosts.shareableReply, /facturación neta|ingresos netos/i);
assert.match(selfEmploymentCosts.shareableReply, /prueban por qu[eé] cerr[oó] una actividad/);
assert.doesNotMatch(selfEmploymentCosts.shareableReply, /20[,.]?367|11[,.]?02|180[,.]?000/);
assert.equal(focusedEvidencePlan('El PIB de Francia no refleja cómo viven los hogares')?.sourceLinks.length, 0, 'Spain-scoped evidence must not be attached to an explicitly French claim');
assert.equal(focusedEvidencePlan('Las cifras de crecimiento del PIB no reflejan cómo vive el hogar medio', { now: Date.parse('2027-11-17') })?.sourceLinks.length, 0, 'Expired definition evidence must not appear as current');
for (const claim of ['Las listas de espera sanitarias son muy largas', 'La temporalidad laboral ha bajado, pero no resume toda la precariedad']) {
  assert.ok(broadDomainPacketsFor(claim).length, `A broad claim lost its reviewed context: ${claim}`);
}
assert.equal(claimFocusFor('¿El alquiler se lleva más de la mitad del sueldo?')?.id, 'rental-affordability', 'A question about rent relative to income must remain an affordability claim');
for (const claim of [
  'En España, ¿cuánto se paga de alquiler al mes en euros según el dato oficial más reciente?',
  '¿Cuál es el importe en euros del alquiler medio más reciente en España?',
  '¿Qué último dato oficial indica cuánto cuesta alquilar una vivienda al mes, en euros, en España?',
]) {
  assert.equal(claimFocusFor(claim)?.id, 'rental-price-amount', claim);
  assert.deepEqual([...focusedMetricIdsFor(claim)], ['rental_price_index'], claim);
}
assert.deepEqual([...focusedMetricIdsFor('Trabajar a jornada completa y ser pobre')].filter((id) => id.includes('poverty')), ['in_work_poverty_full_time_rate']);

const workHousingClaim = 'Tener un trabajo a jornada completa ya no garantiza poder independizarse';
const workHousing = focusedEvidencePlan(workHousingClaim, { observations: [
  { id: 'national-rent-index', metricId: 'rental_price_index', value: 114.78, period: '2025', unit: 'Index 2015=100', geography: 'España', population: 'household consumption of actual rentals for housing', source: { id: 'rent-index-source', title: 'Índice de alquileres pagados', url: 'https://example.org/rents' } },
  { id: 'national-house-index', metricId: 'house_price_index', value: 198.4, period: '2025', unit: 'Index 2015=100', geography: 'España', population: 'residential property transactions', source: { id: 'house-index-source', title: 'Índice de precios de vivienda', url: 'https://example.org/housing' } },
] });
assert.equal(workHousing.answerScope.family, 'work-housing-independence');
assert.equal(workHousing.evidenceLevel, 'insufficient', 'National price indexes are context, not direct evidence about independence among full-time workers');
assert.deepEqual(workHousing.answerScope.directMetrics, []);
assert.deepEqual([...focusedMetricIdsFor(workHousingClaim)], ['rental_price_index', 'house_price_index']);
assert.equal(workHousing.sourceLinks.length, 2, 'Only housing price indexes should be shown as context');
assert.match(workHousing.shareableReply, /Como contexto:/);
assert.match(workHousing.shareableReply, /no muestran qu[eé] proporci[oó]n/);
assert.doesNotMatch(workHousing.shareableReply, /temporalidad laboral|tasa de paro/);
assert.equal(localPublicCheckResponse({ status: 'complete', requestId: 'work-housing', result: workHousing }, workHousingClaim).state, 'insufficient', 'Contextual housing prices must not upgrade a missing employment/housing cross-tab');

const foreignHousingClaim = 'Las compras de vivienda por extranjeros no residentes están encareciendo el mercado en zonas costeras';
const foreignHousing = focusedEvidencePlan(foreignHousingClaim, { observations: [
  { id: 'foreign-born-population', metricId: 'immigrant_population', value: 9460000, period: '2025', unit: 'persons', geography: 'España', source: { id: 'migration-stock-source', title: 'Población nacida en el extranjero', url: 'https://example.org/migration' } },
  { id: 'national-house-index', metricId: 'house_price_index', value: 198.4, period: '2025', unit: 'Index 2015=100', geography: 'España', source: { id: 'house-index-source', title: 'Índice de precios de vivienda', url: 'https://example.org/housing' } },
] });
assert.equal(foreignHousing.answerScope.family, 'foreign-housing-price-causality');
assert.equal(foreignHousing.claimType, 'causal');
assert.equal(foreignHousing.evidenceLevel, 'insufficient');
assert.equal(foreignHousing.interpretation.kind, 'causal');
assert.equal(foreignHousing.blocks.find((block) => block.type === 'claim_breakdown').items[0].type, 'causal');
assert.equal(foreignHousing.sourceLinks.length, 0, 'National immigration counts must not be attached as evidence for local nonresident purchases');
assert.equal(focusedMetricIdsFor(foreignHousingClaim).size, 0, 'A local causal claim must not retrieve national demographic counts as supporting evidence');
assert.match(foreignHousing.shareableReply, /residencia habitual describen grupos distintos/);
assert.match(foreignHousing.shareableReply, /comparaci[oó]n causal/);
assert.equal(localPublicCheckResponse({ status: 'complete', requestId: 'foreign-housing', result: foreignHousing }, foreignHousingClaim).state, 'insufficient');
const migrationHousing = focusedEvidencePlan('La inmigración está haciendo que suban los alquileres en algunas ciudades');
assert.equal(migrationHousing.answerScope.family, 'migration-housing-demand-causality');
assert.equal(migrationHousing.claimType, 'causal');
assert.equal(migrationHousing.sourceLinks.length, 0, 'National migration counts must not stand in for local housing-demand evidence');
assert.match(migrationHousing.shareableReply, /cambios de poblaci[oó]n residente y flujos migratorios/);

const pensionPayGap = focusedEvidencePlan('Hay jubilados con pensiones superiores al sueldo de muchos trabajadores jóvenes');
assert.equal(pensionPayGap.answerScope.family, 'pension-wage-comparison');
assert.match(pensionPayGap.shareableReply, /misma unidad y periodo/);
assert.match(pensionPayGap.shareableReply, /distribuciones comparables/);
assert.equal(pensionPayGap.sourceLinks.length, 0, 'A pension/salary comparison must not cite unrelated youth housing figures');
const futurePension = focusedEvidencePlan('Los jóvenes actuales pagarán pensiones durante décadas pero cobrarán una pensión relativamente menor', { observations: [
  { id: 'current-pension', metricId: 'old_age_survivors_benefits_per_capita', value: 1200, period: '2025', unit: 'EUR per month', geography: 'España' },
  { id: 'current-wage', metricId: 'median_hourly_earnings', value: 17, period: '2025', unit: 'EUR per hour', geography: 'España' },
], propositions: [
  { text: 'Los jóvenes actuales pagarán pensiones durante décadas' },
  { text: 'cobrarán una pensión relativamente menor' },
] });
assert.equal(futurePension.answerScope.family, 'future-pension-outlook');
assert.equal(futurePension.evidenceLevel, 'limited', 'Official projection methodology adds context but cannot predict an individual future pension');
assert.equal(futurePension.sourceLinks.length, 1);
assert.doesNotMatch(futurePension.shareableReply, /1\.200|17 €/);
assert.match(futurePension.shareableReply, /modelo de cohortes/);
assert.match(futurePension.shareableReply, /no predice la pensi[oó]n concreta de cada persona/);
assert.match(futurePension.shareableReply, /cohortes de nacimiento/);
const graduateRate = focusedEvidencePlan('La tasa de paro de titulados universitarios ha subido', { observations: [
  { id: 'overall-graduate-context', metricId: 'unemployment_rate', value: 10, period: '2025', unit: '%', geography: 'España' },
  { id: 'graduate-overqualification-neighbour', metricId: 'tertiary_overqualification_rate', value: 34, period: '2025', unit: '%', geography: 'España' },
] });
assert.equal(graduateRate.answerScope.family, 'education-employment-outcomes');
assert.deepEqual(graduateRate.answerScope.contextMetrics, []);
assert.deepEqual(graduateRate.answerScope.directMetrics, ['unemployment_rate_tertiary_education']);
assert.equal(graduateRate.sourceLinks.length, 0, 'General unemployment and overqualification among employed graduates must not answer an education-specific unemployment claim');
assert.doesNotMatch(graduateRate.shareableReply, /10 %|34 %/);
const graduateUnemployment = focusedEvidencePlan('La tasa de paro de titulados universitarios ha subido', { observations: [
  { id: 'overall-unemployment-neighbour', metricId: 'unemployment_rate', value: 10, period: '2025', unit: '%', geography: 'España' },
  { id: 'graduate-unemployment', metricId: 'unemployment_rate_tertiary_education', value: 6.4, period: '2025', unit: 'Percentage of population in the labour force', geography: 'España', population: 'labour force aged 20 to 64 with tertiary education', dimensions: { geo: 'ES', age: 'Y20-64', isced11: 'ED5-8' }, status: 'd', freshness: 'fresh', source: { id: 'eurostat-tertiary-unemployment', title: 'Unemployment by educational attainment level · Eurostat', publisher: 'Eurostat', url: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/une_educ_a', retrievedAt: '2026-11-16' } },
  { id: 'graduate-overqualification-neighbour', metricId: 'tertiary_overqualification_rate', value: 34, period: '2025', unit: '%', geography: 'España' },
] });
assert.deepEqual(graduateUnemployment.answerScope.directMetrics, ['unemployment_rate_tertiary_education']);
assert.equal(graduateUnemployment.sourceLinks.length, 1);
assert.match(graduateUnemployment.shareableReply, /6,4 % de la poblaci[oó]n activa/);
assert.match(graduateUnemployment.shareableReply, /no compara dos periodos/);
assert.match(graduateUnemployment.shareableReply, /definici[oó]n de este dato difiere/);
assert.doesNotMatch(graduateUnemployment.shareableReply, /10 %|34 %/);
const employmentSource = { id: 'eurostat-tertiary-employment', title: 'Employment rates by educational attainment level · Eurostat', publisher: 'Eurostat', url: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/lfsa_ergaedn', retrievedAt: '2026-11-16' };
const overqualificationSource = { id: 'eurostat-tertiary-overqualification', title: 'Over-qualification rates by citizenship · Eurostat', publisher: 'Eurostat', url: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/lfsa_eoqgan', retrievedAt: '2026-11-16' };
const graduateMatch = focusedEvidencePlan('Un título universitario ya no garantiza encontrar un empleo cualificado', { observations: [
  { id: 'tertiary-attainment', metricId: 'tertiary_education_attainment_rate', value: 50, period: '2025', unit: '% of population aged 25 to 34', geography: 'España' },
  { id: 'overall-unemployment', metricId: 'unemployment_rate', value: 10, period: '2025', unit: '%', geography: 'España' },
  { id: 'national-wages', metricId: 'median_hourly_earnings', value: 17, period: '2025', unit: 'EUR per hour', geography: 'España' },
  { id: 'tertiary-employment', metricId: 'employment_rate_tertiary_education', value: 83.2, period: '2025', unit: 'Percentage', geography: 'España', population: 'residents aged 20 to 64 with tertiary education', dimensions: { geo: 'ES', age: 'Y20-64', isced11: 'ED5-8' }, status: 'd', freshness: 'fresh', source: employmentSource },
  { id: 'tertiary-overqualification', metricId: 'tertiary_overqualification_rate', value: 34, period: '2025', unit: 'Percentage', geography: 'España', population: 'employed residents aged 20 to 64 with tertiary education', dimensions: { geo: 'ES', age: 'Y20-64', isced11: 'ED5-8', citizen: 'TOTAL' }, status: 'd', freshness: 'fresh', source: overqualificationSource },
] });
assert.equal(graduateMatch.answerScope.family, 'education-employment-outcomes');
assert.equal(graduateMatch.evidenceLevel, 'limited', 'The official overqualification measure supplies context but does not settle guarantees or unemployment');
assert.deepEqual(graduateMatch.answerScope.directMetrics, ['employment_rate_tertiary_education', 'tertiary_overqualification_rate']);
assert.deepEqual(graduateMatch.answerScope.contextMetrics, []);
assert.equal(graduateMatch.sourceLinks.length, 2);
assert.match(graduateMatch.shareableReply, /sobrecualificaci[oó]n/);
assert.match(graduateMatch.shareableReply, /83,2 % de las personas residentes de 20 a 64 a[nñ]os/);
assert.match(graduateMatch.shareableReply, /34 % de las personas ocupadas de 20 a 64 a[nñ]os/);
assert.match(graduateMatch.shareableReply, /ocupaciones ISCO 4–9/);
assert.match(graduateMatch.shareableReply, /no garantizan el resultado de cada persona/);
assert.match(graduateMatch.shareableReply, /no compara dos periodos/);
assert.match(graduateMatch.shareableReply, /definici[oó]n de este dato difiere/);
assert.doesNotMatch(graduateMatch.shareableReply, /50 %|10 %|17 €/);
const graduatePublic = localPublicCheckResponse({ status: 'complete', requestId: 'graduate-employment', result: graduateMatch }, 'Un título universitario ya no garantiza encontrar un empleo cualificado');
assert.equal(graduatePublic.state, 'limited');
assert.deepEqual(graduatePublic.result.sources.map((source) => source.url), graduateMatch.sourceLinks.map((source) => source.url));
assert.match(graduatePublic.result.reply, /34 %/);
assert.equal(focusedEvidencePlan('Un título universitario ya no garantiza encontrar un empleo cualificado en Francia')?.sourceLinks.length, 0, 'Spain-specific overqualification data must not appear for France');
const graduateGap = focusedEvidencePlan('Un título universitario ya no garantiza encontrar un empleo cualificado');
assert.equal(graduateGap.evidenceLevel, 'insufficient');
assert.equal(graduateGap.sourceLinks.length, 0);
assert.doesNotMatch(graduateGap.shareableReply, /34 %|83,2 %/, 'A missing warehouse observation must not be replaced with a hard-coded percentage');
const sectorWageGap = focusedEvidencePlan('El turismo aumenta el PIB pero genera menos salarios altos que sectores de mayor productividad', { observations: [
  { id: 'national-wage', metricId: 'median_hourly_earnings', value: 17, period: '2025', unit: 'EUR per hour', geography: 'España' },
  { id: 'tourism-value-added', metricId: 'gross_value_added_by_activity', value: 10, period: '2025', unit: 'million EUR', geography: 'España', dimensions: { activity: 'Accommodation and food service activities' } },
], propositions: [
  { text: 'El turismo aumenta el PIB' },
  { text: 'El turismo genera menos salarios altos que sectores de mayor productividad' },
] });
assert.equal(sectorWageGap.answerScope.family, 'sector-wage-comparison');
assert.equal(sectorWageGap.evidenceLevel, 'limited', 'Official survey metadata gives coverage context but no aligned wage and productivity comparison');
assert.deepEqual(sectorWageGap.answerScope.contextMetrics, []);
assert.equal(sectorWageGap.sourceLinks.length, 1);
assert.match(sectorWageGap.shareableReply, /mediano nacional no separa las diferencias entre sectores/);
assert.match(sectorWageGap.shareableReply, /valor a[nñ]adido por hora trabajada/);
assert.match(sectorWageGap.shareableReply, /cada cuatro a[nñ]os/);
assert.match(sectorWageGap.shareableReply, /excluye agricultura/);
assert.doesNotMatch(sectorWageGap.shareableReply, /17 €/);
assert.ok(sectorWageGap.evidenceSummary.missingDimensions.some((item) => /aportaci[oó]n del mismo sector al PIB/.test(item)), 'A compound sector claim must retain its GDP contribution requirement');
assert.equal(focusedEvidencePlan('El turismo aumenta el PIB pero genera menos salarios altos que sectores de mayor productividad', { propositions: [
  { text: 'La vivienda se encarece en Madrid' },
  { text: 'El turismo genera menos salarios altos que sectores de mayor productividad' },
] }), undefined, 'A related wage family must not swallow an unrelated housing proposition');
const doubleHealthcarePayment = focusedEvidencePlan('Muchas familias sienten que pagan dos veces por sanidad al pagar impuestos y además un seguro privado');
assert.equal(doubleHealthcarePayment.answerScope.family, 'healthcare-double-payment');
assert.match(doubleHealthcarePayment.shareableReply, /no mide si un hogar paga dos veces/);
assert.doesNotMatch(doubleHealthcarePayment.shareableReply, /lista de espera|102 d[ií]as|121 d[ií]as/i);
const entrepreneurshipRisk = focusedEvidencePlan('Emprender en España se percibe como más arriesgado que buscar una plaza pública');
assert.equal(entrepreneurshipRisk.answerScope.family, 'entrepreneurial-risk-perception');
assert.match(entrepreneurshipRisk.shareableReply, /no se deduce de la temporalidad/);
assert.doesNotMatch(entrepreneurshipRisk.shareableReply, /25,0 %|14,7 %/);

const source = { id: 'sanidad-wave-one', title: 'Barómetro Sanitario 2026, primera oleada', publisher: 'Ministerio de Sanidad', url: 'https://www.sanidad.gob.es/estadEstudios/estadisticas/BarometroSanitario/home_BS.htm', retrievedAt: '2026-10-30' };
const jobsSource = { id: 'unemployment', title: 'Tasa de paro', publisher: 'Eurostat', url: 'https://ec.europa.eu/eurostat/', retrievedAt: '2026-11-15' };
const rentSource = { id: 'rental-index', title: 'Índice de alquileres pagados', publisher: 'Eurostat', url: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_minr?geo=ES&coicop18=CP041&unit=I15', retrievedAt: '2026-11-15' };
const rentArchiveSource = { id: 'rental-index-archive', title: 'Índice histórico de precios del alquiler', publisher: 'Eurostat', url: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_midx?geo=ES&coicop=CP041', retrievedAt: '2025-10-01' };
const rentAmountPlan = focusedEvidencePlan('¿Qué último dato oficial indica cuánto cuesta alquilar una vivienda al mes, en euros, en España?', { observations: [
  { id: 'rental-index-observation', metricId: 'rental_price_index', value: 117.05, period: '2026-09', unit: 'Index, 2015=100', geography: 'España', population: 'Household consumption of actual rentals for housing under the harmonised price index', source: rentSource },
  { id: 'rental-rate-observation', metricId: 'rental_price_index', value: 5, period: '2026-10', unit: 'Annual rate of change', geography: 'España', dimensions: { unit: 'RCH_A' }, source: rentSource },
  { id: 'rental-archive-observation', metricId: 'rental_price_index', value: 125, period: '2025', unit: 'Index, 1996=100', geography: 'España', source: rentArchiveSource },
  { id: 'home-sale-observation', metricId: 'house_price_index', value: 194.06, period: '2026-Q1', unit: 'Index, 2015=100', geography: 'España', source: { ...rentSource, id: 'home-sale-source', url: 'https://ec.europa.eu/eurostat/fixture-home-sale' } },
  { id: 'overburden-observation', metricId: 'housing_cost_overburden_rate', value: 7.2, period: '2025', unit: '%', geography: 'España', source: { ...rentSource, id: 'overburden-source', url: 'https://ec.europa.eu/eurostat/fixture-overburden' } },
] });
assert.equal(rentAmountPlan.answerScope.family, 'rental-price-amount');
assert.deepEqual(rentAmountPlan.answerScope.contextMetrics, ['rental_price_index']);
assert.equal(rentAmountPlan.evidenceLevel, 'insufficient', 'A price index cannot supply a rent amount in euros');
assert.match(rentAmountPlan.shareableReply, /índice \(2015=100\).*2026-09/);
assert.match(rentAmountPlan.shareableReply, /no publica el importe mensual medio en euros/);
assert.doesNotMatch(rentAmountPlan.shareableReply, /compraventa|sobrecarga de gastos|7,2 %|194,06/);
assert.deepEqual(rentAmountPlan.sourceLinks.map((item) => item.id), [rentSource.id], 'An absolute rent question must cite the rent index only');
const opportunities = focusedEvidencePlan('No hay trabajo', { observations: [
  { id: 'unemployment-observation', metricId: 'unemployment_rate', value: 10, period: '2025', unit: '%', geography: 'España', dimensions: { geo: 'ES', age: 'Y15-74', sex: 'T' }, source: jobsSource },
  { id: 'temporality-observation', metricId: 'temporary_employment_rate', value: 14, period: '2025', unit: '%', geography: 'España', source: jobsSource },
] });
assert.match(opportunities.shareableReply, /personas activas/);
assert.match(opportunities.shareableReply, /no cuenta los puestos disponibles/);
assert.match(opportunities.shareableReply, /Como contexto.*10 %/);
assert.doesNotMatch(opportunities.shareableReply, /14 %/);
assert.equal(opportunities.evidenceLevel, 'insufficient', 'Unemployment alone cannot establish the number of available jobs');
assert.deepEqual(opportunities.answerScope.directMetrics, []);
assert.ok(opportunities.blocks.some((block) => block.type === 'evidence_gap'));
const revisedOpportunities = focusedEvidencePlan('No hay trabajo', { observations: [
  { id: 'new-rate', metricId: 'unemployment_rate', value: 10.5, period: '2025', unit: '%', geography: 'España', status: 'dp', source: { ...jobsSource, id: 'new-source', retrievedAt: '2026-11-15' } },
  { id: 'old-rate', metricId: 'unemployment_rate', value: 12, period: '2025', unit: '%', geography: 'España', source: { ...jobsSource, id: 'old-source', retrievedAt: '2026-10-29' } },
] });
assert.match(revisedOpportunities.shareableReply, /10,5 %/);
assert.doesNotMatch(revisedOpportunities.shareableReply, /12 %/);
assert.match(revisedOpportunities.shareableReply, /definición de este dato difiere/);
assert.match(revisedOpportunities.shareableReply, /provisional/);
assert.deepEqual(revisedOpportunities.sourceIds, ['new-source']);
const conflicting = focusedEvidencePlan('No hay trabajo', { observations: [
  { id: 'a', metricId: 'unemployment_rate', value: 10, period: '2025', unit: '%', geography: 'España', source: jobsSource },
  { id: 'b', metricId: 'unemployment_rate', value: 11, period: '2025', unit: '%', geography: 'España', source: jobsSource },
] });
assert.doesNotMatch(conflicting.shareableReply, /10 %|11 %/, 'Conflicting observations from the same source revision must not be chosen by input order');
for (const claim of ['No hay empleo temporal', 'Hay pocos trabajos bien pagados']) {
  const specific = focusedEvidencePlan(claim, { observations: [
    { id: 'all-workers', metricId: 'unemployment_rate', value: 10, period: '2025', unit: '%', geography: 'España', source: jobsSource },
  ] });
  assert.doesNotMatch(specific.shareableReply, /10 %/, 'An all-worker rate must not stand in for vacancies with specific conditions');
  assert.ok(specific.blocks.some((block) => block.type === 'evidence_gap'));
}
const youthOpportunities = focusedEvidencePlan('Los jóvenes no encuentran empleo', { observations: [
  { id: 'adult-unemployment', metricId: 'unemployment_rate', value: 10, period: '2025', unit: '%', geography: 'España', dimensions: { age: 'Y15-74', sex: 'T' }, source: jobsSource },
] });
assert.doesNotMatch(youthOpportunities.shareableReply, /10 %/, 'An all-age rate cannot be presented as a youth rate');
const rows = [
  ['3551/0 BARÓMETRO SANITARIO 2026 (PRIMERA OLEADA)'],
  ['Pregunta 5c'], ['Desde que pidió cita hasta que le atendió el médico de familia, ¿cuánto tiempo pasó?'],
  ['Pasó más de un día porque no había cita antes', 71.16324068042688],
  ['Pasó más de un día porque la cita no le venía bien', 4.8737578604006035], ['(N)', 2061],
  ['Pregunta 5c_01'], ['¿Cuántos días?'], ['(N)', 1467], ['Media  (días)', 10.27], ['N', 1448],
  ['Pregunta 6'], ['Espera quirúrgica', 121],
];
const workbook = (inputRows) => { const book = utils.book_new(); utils.book_append_sheet(book, utils.aoa_to_sheet(inputRows), 'Marginales'); return write(book, { type: 'buffer', bookType: 'xlsx' }); };
const parsed = await parsePrimaryCareBarometerWorkbook(workbook(rows), source);
assert.equal(parsed.length, 2);
assert.equal(parsed.find((item) => item.metricId === 'primary_care_wait_days').value, 10.27);
assert.equal(parsed.find((item) => item.metricId === 'primary_care_wait_days').dimensions.validResponseSampleSize, 1448);
assert.equal(parsed.find((item) => item.metricId === 'primary_care_wait_over_one_day_rate').dimensions.sampleSize, 2061);
assert.ok(parsed.every((item) => item.period === '2026-O1' && item.dimensions.provisional));
await assert.rejects(() => parsePrimaryCareBarometerWorkbook(workbook(rows.filter((row) => row[0] !== 'Pregunta 5c_01')), source), /question 5c_01 missing/);
await assert.rejects(() => parsePrimaryCareBarometerWorkbook(workbook(rows.map((row) => String(row[0]).includes('no había cita') ? [row[0], 101] : row)), source), /values or respondent bases/);

const observations = parsed.map((row) => ({ ...row, source }));
const claim = cases.find(([family]) => family === 'primary-care-waits')[1][0];
const plan = focusedEvidencePlan(claim, { observations });
assert.equal(plan.evidenceLevel, 'limited');
assert.match(plan.shareableReply, /10,27/);
assert.match(plan.shareableReply, /71,2 %/);
assert.match(plan.shareableReply, /provisionales/);
assert.match(plan.shareableReply, /subgrupo|quienes esperaron|más de un día/);
assert.doesNotMatch(plan.shareableReply, /121|IMCV|peor que nunca/);
assert.ok(plan.shareableReply.split(/\s+/).length < 180, 'The primary answer must be easy to digest');
assert.ok(validateAnswerPlan(plan).ok, JSON.stringify(validateAnswerPlan(plan).errors));
const payload = { status: 'complete', requestId: 'focus-fixture', result: plan };
assert.ok(publicResolveResponse(payload));
const displayed = localPublicCheckResponse(payload, claim);
assert.equal(displayed.result.sources.length, 1);
assert.equal(displayed.result.answerScope.family, 'primary-care-waits');
assert.equal(shouldRetainReviewedPreview({ result: { evidenceSummary: { families: [{ label: 'Toda la sanidad' }] } } }, displayed), false);

for (const mismatch of ['En Madrid la cita con el médico de familia tarda mucho', 'En Francia la cita con el médico de familia tarda mucho', 'En 2010 la cita con el médico de familia tardaba mucho', 'Las mujeres esperan demasiado para la cita con el médico de familia']) {
  const answer = focusedEvidencePlan(mismatch, { observations });
  assert.equal(answer.evidenceIds.length, 0, `An unmatched scope inherited national survey data: ${mismatch}`);
  assert.doesNotMatch(answer.shareableReply, /10,27|71,2/);
}
const povertySource = { id: 'eurostat-poverty', title: 'In-work at-risk-of-poverty rate', publisher: 'Eurostat', url: 'https://ec.europa.eu/eurostat/databrowser/view/ilc_iw07/default/table', retrievedAt: '2026-10-30' };
const poverty = [{ id: 'full-time-poverty', metricId: 'in_work_poverty_full_time_rate', value: 9.5, period: '2025', unit: '%', dimensions: { geo: 'ES', worktime: 'FT' }, source: povertySource },
  { id: 'total-poverty', metricId: 'in_work_poverty_rate', value: 11.2, period: '2025', unit: '%', dimensions: { geo: 'ES' }, source: povertySource },
  { id: 'temporary', metricId: 'temporary_employment_rate', value: 14.7, period: '2026-Q2', unit: '%', source: povertySource }];
const fullTime = focusedEvidencePlan('Trabajar a jornada completa no impide ser pobre', { observations: poverty });
assert.deepEqual(fullTime.evidenceIds, ['full-time-poverty']);
assert.match(fullTime.shareableReply, /9,5/);
assert.doesNotMatch(fullTime.shareableReply, /11,2|14,7/);
const stalePoverty = focusedEvidencePlan('Trabajar a jornada completa no impide ser pobre', { observations: [{ ...poverty[0], freshness: 'stale', status: 'p' }] });
assert.match(stalePoverty.shareableReply, /fuente no se ha actualizado/);
assert.match(stalePoverty.shareableReply, /dato como provisional/);
const endsMeet = focusedEvidencePlan('A jornada completa no se llega a fin de mes', { observations: poverty });
assert.ok(endsMeet.blocks.some((block) => block.type === 'evidence_gap' && block.missing.some((part) => /dificultad declarada/.test(part))));
assert.equal(endsMeet.evidenceSummary.families[0].dataKind, 'context', 'A poverty threshold does not directly measure difficulty making ends meet');
assert.match(endsMeet.shareableReply, /Como contexto/);
const educationStaff = [{ ...poverty[0], id: 'teaching-staff', metricId: 'education_personnel', value: 120, unit: 'docentes' }];
for (const claim of ['Hay demasiados alumnos por aula', 'Las clases tienen muchos alumnos por grupo']) {
  const answer = focusedEvidencePlan(claim, { observations: educationStaff });
  assert.ok(answer.blocks.some((block) => block.type === 'evidence_gap' && block.missing.some((item) => /por grupo o aula/.test(item))), claim);
  assert.equal(answer.evidenceSummary.families[0].dataKind, 'context', 'The number of teachers cannot directly answer a class-size question');
  assert.match(answer.shareableReply, /no equivale al alumnado por aula/);
}
const perTeacher = focusedEvidencePlan('Hay muchos alumnos por profesor en las aulas', { observations: educationStaff });
assert.ok(perTeacher.blocks.some((block) => block.type === 'evidence_gap' && block.missing.includes('alumnado por docente')));
assert.equal(claimFocusFor('El alquiler cuesta más de la mitad del sueldo')?.id, 'rental-affordability');
assert.equal(claimFocusFor('Para el mismo perfil profesional los salarios son más bajos')?.id, 'matched-pay');
const pensionExplanation = focusedEvidencePlan('¿Las pensiones públicas usan reparto o cuentas individuales?', { now: Date.parse('2026-10-30') });
assert.ok(pensionExplanation.sourceLinks.some((item) => /seg-social\.es/.test(item.url)));
assert.equal(focusedEvidencePlan('¿Las pensiones públicas francesas usan reparto o cuentas individuales?', { now: Date.parse('2026-10-30') }).sourceLinks.length, 0, 'A Spanish institutional source cannot answer a French system question');
assert.equal(focusedEvidencePlan('¿Las pensiones públicas usan reparto o cuentas individuales?', { now: Date.parse('2027-02-01') }).sourceLinks.length, 0, 'Expired reviewed explanations must not appear as current');
const marginalClaim = 'El sistema marginalista hace que el gas pueda encarecer toda la electricidad aunque una parte se produzca más barata';
const marginal = focusedEvidencePlan(marginalClaim, { now: Date.parse('2026-10-30'), propositions: [
  { text: 'El sistema marginalista hace que el gas pueda encarecer toda la electricidad' }, { text: 'una parte se produzca más barata' },
] });
assert.ok(marginal?.sourceLinks.some((item) => item.publisher === 'Red Eléctrica'));
assert.match(marginal.shareableReply, /última oferta|última.*necesaria/);
const electricity = [{ ...poverty[0], id: 'electricity-price', metricId: 'household_electricity_price', value: 0.2739, period: '2026-S1', unit: 'Kilowatt-hour',
  dimensions: { geo: 'ES', currency: 'EUR', unit: 'KWH', nrg_cons: 'TOT_KWH', tax: 'I_TAX' } }];
const electricityAnswer = focusedEvidencePlan(marginalClaim, { observations: electricity, now: Date.parse('2026-10-30') });
assert.match(electricityAnswer.shareableReply, /0,2739 €\/kWh/);
assert.match(electricityAnswer.shareableReply, /todos los tramos de consumo, con impuestos y tasas incluidos/);
assert.doesNotMatch(electricityAnswer.shareableReply, /0,2739 Kilowatt-hour/);
const unknownCurrency = focusedEvidencePlan(marginalClaim, { observations: [{ ...electricity[0], dimensions: { ...electricity[0].dimensions, currency: undefined } }] });
assert.doesNotMatch(unknownCurrency.shareableReply, /0,2739/, 'An energy unit alone does not identify the currency of a price');
assert.equal(focusedEvidencePlan('La luz está cara y una parte de la educación empeora', { propositions: [
  { text: 'La luz está cara' }, { text: 'una parte de la educación empeora' },
] }), undefined, 'A new named subject must not inherit the electricity explanation');
const zero = focusedEvidencePlan('Trabajar a jornada completa no impide ser pobre', { observations: [{ ...poverty[0], value: 0 }] });
assert.match(zero.shareableReply, /0 %/);
for (const value of [null, '', Number.NaN]) assert.equal(focusedEvidencePlan('Trabajar a jornada completa no impide ser pobre', { observations: [{ ...poverty[0], value }] }).evidenceIds.length, 0);
const unaligned = focusedEvidencePlan('Los salarios pierden poder adquisitivo frente a los precios', { observations: [
  { ...poverty[0], id: 'wage', metricId: 'median_hourly_earnings', value: 11.02, period: '2022', unit: 'EUR' },
  { ...poverty[0], id: 'cpi', metricId: 'cpi_index', value: 119.94, period: '2025-12', unit: 'index' },
] });
assert.ok(unaligned.evidenceSummary.families.filter((item) => item.data.length).every((item) => item.dataKind === 'context'));
assert.match(unaligned.shareableReply, /mismas fechas|mismos periodos/);
assert.ok(unaligned.blocks.some((block) => block.type === 'evidence_gap'));
assert.equal(focusedEvidencePlan('Los salarios pierden poder adquisitivo y los trenes se retrasan', { propositions: [{ text: 'Los salarios pierden poder adquisitivo' }, { text: 'Los trenes se retrasan' }] }), undefined, 'A compound claim must not silently lose its second proposition');
const revenue = { id: 'revenue', metricId: 'government_revenue_ratio', metric: 'Ingresos públicos', value: 42.9, period: '2025', unit: '% del PIB', geography: 'España' };
assert.deepEqual(evidenceForProposition({ text: 'La recaudación aumenta' }, [revenue]), [revenue]);
assert.deepEqual(evidenceForProposition({ text: 'Los ciudadanos no notan mejoras en los servicios públicos' }, [revenue]), [], 'A shared word cannot attach revenue to perceived service quality');
const itemList = [{ text: 'Afirmación completa', explicit: true }, { text: 'Parte A', explicit: true }, { text: 'Parte B', explicit: true }];
const launched = itemList.slice(1);
const outcomes = [{ status: 'fulfilled', value: { result: { evidenceIds: ['source-A'], summary: 'A' } } }, { status: 'fulfilled', value: { result: { evidenceIds: ['source-B'], summary: 'B' } } }];
const alignedParts = alignPropositionOutcomes(itemList, outcomes, launched);
assert.equal(alignedParts[0].evidenceIds, undefined, 'A filtered whole-claim item inherited the first clause result');
assert.deepEqual(alignedParts[1].evidenceIds, ['source-A']);
assert.deepEqual(alignedParts[2].evidenceIds, ['source-B']);
assert.match(composePropositionFindings(alignedParts), /«Parte A»: A/);
assert.equal(alignPropositionOutcomes([{ text: 'La recaudación aumenta' }], [{ status: 'fulfilled', value: { result: { id: 'broad-health', evidenceIds: ['hospital'], evidenceLevel: 'limited' } } }], undefined, { requireCompatibility: true })[0].evidenceIds, undefined, 'An unrelated broad packet cannot become evidence for a clause');
assert.equal(comparableObservationGroups([revenue, { ...revenue, id: 'eu-revenue', geography: 'UE' }, { ...revenue, id: 'people', population: 'hogares' }]).length, 3, 'Different scopes became one trend');
assert.equal(rankWarehouseObservations('appointment delay', observations, 10, { metricIds: new Set(['primary_care_wait_days']) }).length, 1, 'An explicit metric ID must retrieve its source across languages');
const youthRent = answerPlanForBroadDomains('El alquiler se come más de la mitad del sueldo de muchos jóvenes');
assert.match(youthRent.shareableReply, /98,7/);
assert.match(youthRent.shareableReply, /no indica cuántos jóvenes superan un porcentaje/);
assert.deepEqual(youthRent.shareableSourceIds, ['cje-emancipation-2025'], 'A rental-only youth answer must not link family survey evidence it did not use');
assert.doesNotMatch(youthRent.shareableReply, /emigra|66\.900|peor que nunca/i);
assert.ok(!youthRent.evidenceSummary.families.some((family) => family.criterionId === 'family-support-counterfactual'));
assert.ok(!youthRent.visuals?.some((visual) => /Alquiler de vivienda completa/.test(visual.title)), 'An approximated graphic must not present exact regional values');
const security = answerPlanForBroadDomains('No se puede salir a la calle de cómo está la seguridad');
assert.doesNotMatch(security.shareableReply, /extranj|nacionaliz|wokismo/i);
assert.ok(!security.evidenceSummary.families.some((family) => family.criterionId === 'group-causality'));
const health = answerPlanForBroadDomains('Las listas de espera sanitarias son muy largas');
assert.doesNotMatch(health.shareableReply, /peor que nunca/i);
assert.ok(!health.evidenceSummary.families.some((family) => family.criterionId === 'health-historical-claim'));
const paraphraseCount = cases.reduce((count, [, paraphrases]) => count + paraphrases.length, 0);
console.log(`Claim focus validated: ${paraphraseCount} paraphrases, negative neighbours, survey bases, scope rejection, denominator and source boundaries, missing values and preview replacement.`);
