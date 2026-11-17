import assert from 'node:assert/strict';
import { utils, write } from 'xlsx';
import { canSkipLocalCompilerForFocusedMeasurement, claimFocusFor, focusedMetricIdsFor, tertiaryOverqualificationCitizenshipGroupsForClaim } from '../../src/lib/knowledge/claim-focus.mjs';
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
  ['youth-housing-family-formation-costs', ['La combinación de vivienda cara y cotizaciones altas reduce la capacidad de los jóvenes para tener hijos y ahorrar', 'El alquiler y las contribuciones elevadas limitan que la juventud ahorre y forme una familia', 'La vivienda costosa y los impuestos reducen la capacidad económica de los jóvenes para ahorrar y tener hijos']],
  ['inflation-tax-bracket-creep', ['La inflación eleva la carga fiscal cuando los tramos y deducciones no se actualizan al mismo ritmo', 'Si el IRPF no actualiza sus tramos con los precios, la inflación aumenta la recaudación', 'La progresividad en frío hace subir el IRPF cuando las rentas nominales crecen por la inflación']],
  ['gdp-household-welfare', ['Las cifras de crecimiento del PIB no reflejan cómo vive el hogar medio', 'Que el PIB crezca no se traduce directamente en una mejora de la vida de las familias', 'El PIB por habitante no refleja cómo se reparte la prosperidad entre los hogares']],
  ['education-employment-outcomes', ['Un título universitario ya no garantiza encontrar un empleo cualificado', 'Tener estudios superiores no asegura trabajar en un puesto acorde con la titulación', 'La universidad ya no asegura encontrar trabajo acorde con sus estudios', 'La tasa de paro de titulados universitarios ha subido', 'Los graduados tienen menos empleo que quienes cursan formación profesional']],
  ['job-opportunities', ['No hay trabajo', 'Aquí hay pocas ofertas de empleo', 'Es difícil encontrar trabajo en España', 'Los jóvenes no encuentran empleo', 'Empleo no hay', 'No hay empleo temporal', 'Hay pocos trabajos bien pagados']],
  ['working-poverty', ['En España se puede trabajar a jornada completa y seguir sin llegar a fin de mes', 'Tener trabajo a tiempo completo no impide ser pobre', 'La pobreza también alcanza a personas ocupadas']],
  ['real-wages', ['Los salarios pierden poder adquisitivo frente al coste de la vida', 'Los sueldos no siguen el ritmo de los precios', 'La inflación se come la nómina']],
  ['rental-affordability', ['Con un sueldo normal ya no se puede alquilar un piso entero solo', 'El alquiler se lleva la mitad de los ingresos', 'La renta mensual consume casi todo el salario']],
  ['business-tax-burden', ['Las multinacionales digitales pagan proporcionalmente menos impuestos que las tiendas locales', 'La carga fiscal efectiva de grandes empresas tecnológicas es menor que la de los comercios pequeños', 'Las empresas digitales compiten con el comercio de barrio con una tributación más baja']],
  ['small-business-cost-pressure', ['Los comercios de barrio cierran por la suma de alquiler, energía e impuestos', 'El aumento de los costes operativos está haciendo desaparecer pequeños negocios', 'Las tiendas pequeñas no sobreviven cuando suben a la vez salarios, alquileres y electricidad']],
  ['business-size-productivity', ['El pequeño tamaño medio de las empresas frena la inversión y la productividad', 'Las pymes tienen menos capacidad para adoptar tecnología y pagar buenos salarios', 'El tamaño empresarial limita la innovación y los sueldos']],
  ['unpaid-overtime', ['En hostelería se hacen horas extra sin cobrar', 'Las horas extraordinarias no remuneradas son habituales en algunos trabajos', 'Muchos trabajadores trabajan horas extra gratis']],
  ['wage-growth-job-mobility', ['Cambiar de empresa es la única forma de conseguir una subida salarial importante', 'El sueldo aumenta más al cambiar de trabajo que permaneciendo en la misma empresa', 'Quienes cambian de empleo logran mejores subidas de salario']],
  ['wage-progression', ['Los trabajadores jóvenes encadenan años de salarios de entrada sin progresión real', 'Los sueldos iniciales se estancan durante los primeros años de carrera', 'Quienes empiezan con un salario bajo apenas avanzan aunque acumulen antigüedad']],
  ['regional-wage-housing-cost', ['Las ciudades con más empleo son aquellas donde la vivienda se come la mejora salarial', 'En las áreas con más trabajo el coste del alquiler absorbe las subidas de sueldo', 'Los salarios más altos de las grandes ciudades no compensan el gasto de vivienda']],
  ['housing-investment-return-comparison', ['Los inversores compran vivienda porque ofrece más rentabilidad que los negocios productivos', 'El capital prefiere el ladrillo frente a la inversión en empresas productivas', 'La rentabilidad inmobiliaria supera a la de invertir en actividades productivas']],
  ['education-pay-comparison', ['Los sueldos de trabajos cualificados son demasiado parecidos a los de puestos que exigen menos formación', 'Los empleos que requieren estudios superiores no pagan mucho más que los que exigen menos estudios', 'La remuneración es similar entre puestos de distinta cualificación']],
  ['education-skill-demand-vs-curriculum', ['Los idiomas y competencias digitales pesan más en el empleo que muchas asignaturas del título', 'Las empresas priorizan competencias digitales e idiomas frente a muchas materias de la carrera', 'El mercado de trabajo exige habilidades que la universidad no enseña en sus asignaturas']],
  ['firm-wage-capacity', ['Las grandes empresas tienen productividad suficiente para pagar más pero contienen salarios', 'Las empresas más productivas podrían pagar mejores sueldos y no lo hacen', 'Las compañías con más beneficios frenan la remuneración de sus plantillas']],
  ['public-private-job-conditions', ['La falta de conciliación empuja a trabajadores cualificados a buscar empleo público', 'Los horarios más compatibles con la vida familiar atraen a profesionales hacia la administración', 'La estabilidad del empleo público lleva a algunas personas a dejar el sector privado']],
  ['public-private-pay-comparison', ['El sector público paga salarios relativamente altos en puestos de baja cualificación frente al sector privado', 'Los empleos públicos cobran más que los privados en ocupaciones comparables', 'La brecha salarial entre funcionarios y trabajadores privados depende del puesto']],
  ['retiree-housing-cost-comparison', ['Los jubilados con vivienda pagada pueden tener más renta disponible que trabajadores que pagan alquiler', 'Tras pagar la vivienda, algunos pensionistas disponen de más ingresos que quienes trabajan y alquilan', 'La diferencia de coste de vivienda cambia la renta disponible de jubilados y trabajadores inquilinos']],
  ['pension-price-indexation', ['Las pensiones contributivas se revalorizan con el IPC', '¿Las pensiones conservan poder adquisitivo al actualizarse con los precios?', '¿Cuánto subieron las pensiones públicas en 2026 según la inflación?']],
  ['pension-indexation-comparison', ['Las pensiones se actualizan mejor con la inflación que muchos salarios', 'Las revalorizaciones de las pensiones superan el crecimiento salarial en algunos periodos', 'Los salarios han seguido peor la inflación que las pensiones']],
  ['pension-wage-contribution-base', ['Los salarios bajos debilitan el sistema de pensiones aunque aumente el empleo', 'La creación de empleo no compensa unas bases de cotización demasiado bajas para financiar las pensiones', 'Las remuneraciones reducidas limitan la financiación contributiva de las pensiones']],
  ['pension-private-savings-requirement', ['Los jóvenes tendrán que pagar dos veces para la jubilación: cotizaciones y ahorro privado', 'Quienes trabajan deberán aportar a un plan privado además de cotizar para tener pensión', 'La jubilación exige pagar una pensión pública y otra privada']],
  ['pension-worker-beneficiary-ratio', ['El sistema de reparto depende de que haya suficientes trabajadores por cada pensionista', 'Cada vez hay menos cotizantes por jubilado y eso condiciona la financiación de las pensiones', 'La relación entre afiliados y pensionistas determina los recursos disponibles para prestaciones']],
  ['intergenerational-housing-pension-comparison', ['Los boomers tuvieron acceso a vivienda y jubilación en condiciones que las generaciones posteriores no tendrán', 'Las generaciones futuras se enfrentan a peores condiciones de vivienda y pensión', 'El acceso a la vivienda y a una jubilación suficiente ha cambiado entre generaciones']],
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
  ['tourist-housing-count', ['¿Cuántas viviendas turísticas hay en España?', '¿Cuál es el recuento oficial de pisos turísticos?']],
  ['tourist-housing-share', ['¿Qué porcentaje del parque de viviendas corresponde a viviendas turísticas?', '¿Qué parte del parque de viviendas son viviendas de uso turístico?']],
  ['tourist-housing-registration', ['¿Cuántos pisos turísticos con licencia están registrados?', '¿Cuántas viviendas de uso turístico tienen número de inscripción válido?']],
  ['tourist-housing-supply', ['Los pisos turísticos están quitando viviendas del alquiler residencial', 'Los apartamentos turísticos reducen la oferta para quienes viven en las ciudades', 'La vivienda turística desplaza alquileres de larga duración']],
  ['housing-supply', ['¿Cuántas casas vacías hay disponibles en la ciudad?']],
  ['foreign-housing-price-causality', ['Las compras de vivienda por extranjeros no residentes están encareciendo el mercado en zonas costeras', 'Las adquisiciones de compradores extranjeros elevan los precios de las casas en la costa']],
  ['migration-housing-demand-causality', ['La inmigración está haciendo que suban los alquileres en algunas ciudades', 'El aumento de población migrante eleva los precios de la vivienda local', 'Los extranjeros encarecen los alquileres en las ciudades']],
  ['migration-wage-effects', ['La inmigración de trabajadores de baja cualificación presiona a la baja los salarios de algunos sectores', 'La llegada de mano de obra extranjera ha reducido los sueldos en sectores con baja cualificación', 'Los trabajadores inmigrantes cobran menos desde que aumentó la oferta laboral', 'La inmigración presiona los salarios en los sectores con sueldos bajos']],
  ['migration-fiscal-contribution', ['La inmigración cualificada aporta más fiscalmente que la inmigración atrapada en empleos de bajos salarios', 'Los inmigrantes aportan más a la Hacienda pública de lo que reciben en prestaciones', 'El balance fiscal de la población migrante depende del empleo y de cuánto cotiza']],
  ['migration-overqualification', ['La tasa de sobrecualificación de extranjeros es mayor que la de españoles', '¿Qué parte de las personas con ciudadanía extranjera y estudios terciarios trabaja en ocupaciones de menor cualificación?', 'La tasa de sobrecualificación de ciudadanos de otros países de la Unión Europea']],
  ['migrant-credential-recognition', ['La homologación lenta de títulos obliga a inmigrantes cualificados a trabajar por debajo de su formación', 'El retraso en convalidar estudios superiores deja a personas migrantes en puestos por debajo de su preparación', 'Los títulos obtenidos fuera de España no se reconocen y los profesionales extranjeros acaban en empleos de baja cualificación']],
  ['healthcare-staffing-causality', ['La falta de médicos en algunas zonas se debe más a las condiciones de trabajo que al número total de titulados', 'Hay vacantes médicas en pueblos porque las plazas ofrecen condiciones poco atractivas', 'Faltan facultativos en la periferia pese a que hay suficientes graduados']],
  ['work-housing-independence', ['Tener un trabajo a jornada completa ya no garantiza poder independizarse', 'Un empleo a tiempo completo no basta para vivir por cuenta propia', 'Trabajar a jornada completa no asegura poder emanciparse']],
  ['rental-tenant-screening-exclusion', ['Las garantías, fianzas y seguros de impago excluyen del alquiler a trabajadores con ingresos irregulares', 'Los avales y requisitos de solvencia dejan fuera a inquilinos con ingresos variables', 'Personas con nóminas inestables son rechazadas para alquilar por no cumplir las garantías', 'El mercado del alquiler penaliza a autónomos y personas sin nómina indefinida']],
  ['rental-regulation-contract-shift', ['La regulación del alquiler ha empujado a algunos propietarios hacia contratos temporales', 'Los topes de alquiler hacen que parte de la oferta desaparezca del mercado regulado', 'El control de precios provoca que viviendas pasen del alquiler habitual al de temporada']],
  ['rental-landlord-motives', ['El miedo a la okupación y al impago hace que propietarios retiren pisos del alquiler', 'Hay viviendas vacías que no se alquilan por miedo a problemas legales con inquilinos', 'Los propietarios prefieren el alquiler de temporada porque les da más flexibilidad que el alquiler habitual']],
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
  ['Los jóvenes con estudios superiores están sobrecualificados en su empleo', ['tertiary_overqualification_rate_age_20_34']],
  ['¿Qué proporción de personas ocupadas de 20 a 34 años con educación superior trabaja en puestos que no requieren ese nivel?', ['tertiary_overqualification_rate_age_20_34']],
  ['¿Cuántos trabajadores jóvenes titulados están sobrecualificados?', ['tertiary_overqualification_rate_age_20_34']],
]) assert.deepEqual([...focusedMetricIdsFor(claim)], expected, `Education-employment paraphrase selected the wrong measures: ${claim}`);
for (const claim of [
  'Cada vez se exige un máster para los puestos de titulados universitarios',
  'Los graduados tienen más empleo que quienes cursan formación profesional',
  'El empleo de universitarios es menor que el de otros titulados',
  'Los recién graduados no encuentran su primer empleo',
  'Los recién graduados trabajan en puestos por debajo de su titulación',
  'La tasa de sobrecualificación de personas con estudios superiores de 25 a 34 años',
  'Los titulados jóvenes de 20 a 64 años trabajan en puestos por debajo de su titulación',
  'Los jóvenes con estudios superiores tienen más paro que antes',
  'La tasa de empleo de titulados superiores de 20 a 34 años',
  'La tasa de paro de titulados universitarios de 25 a 34 años',
  'Compara el empleo de titulados superiores de 20 a 64 años con el de 25 a 34 años',
  'La tasa de empleo de titulados universitarios en Europa',
]) assert.deepEqual([...focusedMetricIdsFor(claim)], [], `A nearby education claim used an incompatible tertiary series: ${claim}`);
assert.equal(claimFocusFor('Se contrata un seguro privado para evitar esperas de especialistas')?.id, 'private-healthcare-access', 'A waiting-time claim must stay in the access family, not the double-payment family');
for (const claim of [
  'La gente paga consultas privadas para que la vea el especialista antes',
  'El seguro médico privado evita demoras en las consultas externas',
]) assert.equal(claimFocusFor(claim)?.id, 'private-healthcare-access', `A private-specialist-access paraphrase lost its semantic family: ${claim}`);
assert.equal(claimFocusFor('¿Las pensiones públicas se financian con las cotizaciones actuales?')?.id, 'pension-financing', 'A funding question must stay in the pension-financing family, not a salary comparison');
assert.deepEqual([...focusedMetricIdsFor('Los costes fijos impiden a los autónomos sostenerse con ingresos irregulares')], [], 'General income and wage series must not stand in for self-employment viability');
assert.notEqual(claimFocusFor('Las cotizaciones empresariales ocultan parte del coste laboral real que soporta cada empleo')?.id, 'self-employment-cost-viability', 'Employer contributions crossed into the self-employment cost family');
for (const claim of ['La temporalidad laboral ha bajado', 'La tasa de paro juvenil es elevada', 'Qué porcentaje de jóvenes activos no encuentra trabajo', 'Cuántas vacantes de empleo hay', 'El porcentaje de jóvenes de 25 a 34 años con estudios superiores aumentó', 'Los inmigrantes causan que no haya trabajo', 'Los hospitales tienen pocas camas', 'El seguro del coche ha subido', 'Los trenes transportan más pasajeros', 'Mi plan de pensiones privado acumula ahorro en una cuenta individual', '¿Cuánto cuesta comprar una vivienda en España?', '¿Cómo han evolucionado los precios del alquiler desde 2015?', '¿Cuál es el índice de precios del alquiler actual?', 'Emprender es más arriesgado que trabajar en una empresa privada', '¿Cómo ha crecido el PIB real en España?', 'El turismo aporta más al PIB', '¿Cuál es la renta mediana equivalente de los hogares españoles?', 'La renta mediana equivalente creció más que el PIB en 2025']) {
  assert.equal(claimFocusFor(claim), undefined, `Neighbour crossed into a different measurement: ${claim}`);
}
assert.equal(claimFocusFor('Trabajar a jornada completa y ser pobre')?.id, 'working-poverty', 'A full-time poverty claim must not cross into housing independence');
assert.equal(claimFocusFor('Los pisos turísticos han retirado viviendas del alquiler residencial')?.id, 'tourist-housing-supply', 'Tourist-housing supply claims must retain their causal evidence contract');
assert.equal(claimFocusFor('El alquiler se lleva más de la mitad del salario joven')?.id, 'rental-affordability', 'A rent-to-income claim must remain separate from tenant-screening claims');
assert.equal(claimFocusFor('Un seguro de impago cubre al propietario si el inquilino deja de pagar')?.id, undefined, 'Insurance coverage alone must not be interpreted as tenant exclusion');
assert.equal(claimFocusFor('Los precios del alquiler subieron después de aprobarse la ley')?.id, undefined, 'A rent-price trend must not be mistaken for a contract-supply shift caused by regulation');
assert.equal(claimFocusFor('Los pisos turísticos reducen la oferta de alquiler residencial')?.id, 'tourist-housing-supply', 'Tourist conversion claims must remain separate from landlord-reason claims');
assert.equal(claimFocusFor('¿Cuántas viviendas turísticas hay en España?')?.id, 'tourist-housing-count', 'A direct count question must use the count family');
assert.equal(claimFocusFor('¿Qué proporción del parque de viviendas es de uso turístico?')?.id, 'tourist-housing-share', 'A direct share question must use the housing-stock denominator family');
assert.equal(claimFocusFor('¿Cuántos apartamentos turísticos con licencia hay en España?')?.id, 'tourist-housing-registration', 'Platform estimates must not answer a licensing-register count');
assert.equal(claimFocusFor('¿Cuántos pisos turísticos han retirado viviendas del alquiler residencial?')?.id, 'tourist-housing-supply', 'A count inside a displacement claim must not be treated as evidence of homes withdrawn from long-term rental');
assert.equal(claimFocusFor('¿Cuántas viviendas vacías hay disponibles en la ciudad?')?.id, 'housing-supply', 'Vacant-home counts must not inherit tourist-housing evidence');
assert.equal(claimFocusFor('¿Cuántos anuncios de Airbnb hay en España?'), undefined, 'Counts across three accommodation platforms must not answer an Airbnb-only listing question');
assert.equal(Boolean(focusedMetricIdsFor('¿Cuántos apartamentos turísticos hay en España?')?.has('tourist_housing_count')), false, 'The tourist-dwelling estimate must not be presented as a count of tourist-apartment establishments');
assert.equal(Boolean(focusedMetricIdsFor('¿Qué porcentaje del parque representan los apartamentos turísticos?')?.has('tourist_housing_share')), false, 'The tourist-dwelling share must not be presented as the share of tourist-apartment establishments');
assert.notEqual(claimFocusFor('El turismo eleva los alquileres en las ciudades')?.id, 'tourist-housing-supply', 'General tourism and rent claims must not inherit tourist-dwelling counts');
const crossTopicClaims = [
  ['business-tax-burden', 'Las multinacionales digitales compiten con comercios locales pagando proporcionalmente menos impuestos'],
  ['small-business-cost-pressure', 'Los negocios de barrio desaparecen por la combinación de alquiler, energía, impuestos y salarios'],
  ['business-size-productivity', 'El pequeño tamaño medio de las empresas limita inversión, tecnología y salarios'],
  ['unpaid-overtime', 'Las horas extra sin pagar siguen siendo habituales en la hostelería'],
  ['wage-growth-job-mobility', 'En muchos sectores la única forma de conseguir una subida salarial importante es cambiar de empresa'],
  ['wage-progression', 'Los trabajadores jóvenes encadenan años de salarios de entrada sin progresión real'],
  ['regional-wage-housing-cost', 'Las ciudades con más empleo son aquellas donde la vivienda se come la mejora salarial'],
  ['housing-investment-return-comparison', 'Los inversores compran vivienda porque ofrece más rentabilidad que los negocios productivos'],
  ['education-pay-comparison', 'Los sueldos de trabajos cualificados son demasiado parecidos a los de puestos que exigen mucha menos formación'],
  ['firm-wage-capacity', 'Las grandes empresas tienen productividad suficiente para pagar más pero contienen salarios'],
  ['public-private-job-conditions', 'La falta de conciliación empuja a trabajadores cualificados a buscar empleo público'],
  ['public-private-pay-comparison', 'El sector público paga salarios relativamente altos en puestos de baja cualificación comparado con el sector privado'],
  ['retiree-housing-cost-comparison', 'Los jubilados con vivienda pagada pueden tener más renta disponible que trabajadores que pagan alquiler'],
  ['pension-indexation-comparison', 'Las pensiones se actualizan mejor con la inflación que muchos salarios'],
  ['pension-wage-contribution-base', 'Los salarios bajos debilitan el sistema de pensiones aunque aumente el empleo'],
  ['pension-private-savings-requirement', 'Los jóvenes tendrán que pagar dos veces para la jubilación: cotizaciones y ahorro privado'],
  ['pension-worker-beneficiary-ratio', 'El sistema de reparto depende de que haya suficientes trabajadores por cada pensionista'],
  ['intergenerational-housing-pension-comparison', 'Los boomers tuvieron acceso a vivienda y jubilación en condiciones que las generaciones posteriores no tendrán'],
  ['youth-housing-family-formation-costs', 'La combinación de vivienda cara y cotizaciones altas reduce la capacidad de los jóvenes para tener hijos y ahorrar'],
  ['healthcare-staffing-causality', 'La homologación lenta de títulos extranjeros agrava la falta de profesionales sanitarios'],
  ['rental-tenant-screening-exclusion', 'El mercado de alquiler penaliza especialmente a autónomos, temporales y personas sin nómina indefinida'],
];
const irrelevantWageObservation = { id: 'unrelated-national-wage', metricId: 'median_hourly_earnings', value: 17, period: '2025', unit: 'EUR per hour', geography: 'España', source: { id: 'unrelated-wage-source', title: 'Earnings · Structure of earnings survey', publisher: 'Eurostat', url: 'https://ec.europa.eu/eurostat/en/web/labour-market/information-data/earnings', retrievedAt: '2026-11-16' } };
for (const [family, claim] of crossTopicClaims) {
  const focus = claimFocusFor(claim);
  assert.equal(focus?.id, family, `Claim crossed into an unrelated topic instead of ${family}: ${claim}`);
  const plan = focusedEvidencePlan(claim, { observations: [irrelevantWageObservation], propositions: deterministicFallbackCompiler(claim).explicitPropositions });
  assert.deepEqual(plan.answerScope.directMetrics, [], `A nearby salary statistic became direct evidence: ${claim}`);
  assert.deepEqual(plan.answerScope.contextMetrics, [], `A nearby salary statistic became context for a different claim: ${claim}`);
  assert.equal(plan.evidenceLevel, 'insufficient', `An unrelated salary observation should leave this claim unsupported: ${claim}`);
  assert.equal(plan.sourceLinks.length, 0, `An unrelated wage survey was attached to this claim: ${claim}`);
  assert.equal(localPublicCheckResponse({ status: 'complete', requestId: `gap-${family}`, result: plan }, claim).state, 'insufficient');
}
assert.equal(claimFocusFor('¿Qué entrada necesito para comprar una vivienda con mi salario?')?.id, 'purchase-affordability', 'A genuine home-purchase deposit question must keep its housing route');
assert.equal(claimFocusFor('Los trabajadores jóvenes cobran salarios de entrada sin progresar')?.id, 'wage-progression', 'Salary-entry wording must not be mistaken for a home-purchase deposit');
assert.equal(claimFocusFor('Los pequeños comercios cierran por la subida del alquiler y la caída de su rentabilidad')?.id, 'small-business-cost-pressure', 'Business cost pressure must stay separate from property investment returns');
assert.equal(claimFocusFor('La tasa de sobrecualificación de titulados universitarios es alta')?.id, 'education-employment-outcomes', 'A qualification-fit rate must not be rerouted to pay comparisons');
assert.equal(claimFocusFor('La pensión media supera el salario medio de los trabajadores jóvenes')?.id, 'pension-wage-comparison', 'A pension-to-wage comparison without housing costs must stay in its own family');
assert.equal(claimFocusFor('Las cotizaciones actuales de quienes trabajan financian las pensiones públicas')?.id, 'pension-financing', 'A system-financing explanation must remain separate from the wage-base causal claim');
assert.equal(claimFocusFor('Las cotizaciones actuales financian las pensiones de reparto')?.id, 'pension-financing', 'A pay-as-you-go financing explanation must not imply that private saving is compulsory');
assert.equal(claimFocusFor('Las próximas generaciones cobrarán pensiones más bajas')?.id, 'future-pension-outlook', 'A future-pension projection without a housing claim must keep its pension route');
assert.equal(claimFocusFor('La inflación sube los precios y reduce el poder adquisitivo de los salarios')?.id, 'real-wages', 'A general real-wage claim must not be treated as tax bracket creep');
assert.equal(claimFocusFor('El Gobierno sube el IVA de la electricidad este verano')?.id, undefined, 'A rate change must not inherit income-tax inflation evidence');
const fiscalDragClaim = 'La inflación eleva la carga fiscal cuando los tramos y deducciones no se actualizan al mismo ritmo';
const fiscalDragPlan = focusedEvidencePlan(fiscalDragClaim);
assert.equal(fiscalDragPlan.answerScope.family, 'inflation-tax-bracket-creep');
assert.equal(fiscalDragPlan.evidenceLevel, 'limited');
assert.deepEqual(fiscalDragPlan.sourceLinks.map((source) => source.id), ['fiscal-drag-bde'], 'The specific IRPF question must use the reviewed Banco de España source without unrelated tax or pension sources');
assert.match(fiscalDragPlan.shareableReply, /1,85 %/);
assert.match(fiscalDragPlan.shareableReply, /2019 y 2023/);
assert.doesNotMatch(fiscalDragPlan.shareableReply, /41,4 %|123 % del PIB|IVA/);
assert.equal(claimFocusFor('La tasa de sobrecualificación de inmigrantes obliga a trabajar por debajo de la formación')?.id, 'migration-overqualification', 'A general credential fit claim must stay with the labour outcome measure');
const rentalRegulationPlan = focusedEvidencePlan('La regulación del alquiler ha empujado a algunos propietarios hacia contratos temporales');
assert.equal(rentalRegulationPlan.answerScope.family, 'rental-regulation-contract-shift');
assert.doesNotMatch(rentalRegulationPlan.shareableReply, /Como contexto:\s*Como contexto/);
assert.deepEqual([...focusedMetricIdsFor('¿Cuántos pisos turísticos hay en España?')], ['tourist_housing_count']);
assert.deepEqual([...focusedMetricIdsFor('¿Qué proporción del parque de viviendas es turístico?')], ['tourist_housing_share']);
assert.deepEqual([...focusedMetricIdsFor('¿Cuántos pisos turísticos han retirado viviendas del alquiler residencial?')], ['tourist_housing_count', 'tourist_housing_share']);
assert.deepEqual([...focusedMetricIdsFor('¿Cuántos apartamentos turísticos con licencia hay en España?')], ['tourist_housing_count']);
assert.deepEqual([...focusedMetricIdsFor('¿Cuántas viviendas vacías hay disponibles en la ciudad?')], [], 'Vacant-home claims must not retrieve tourist-housing series');
const touristCountSource = { id: 'ine-tourist-count', title: 'Viviendas turísticas, tabla 39364', publisher: 'INE', url: 'https://www.ine.es/jaxiT3/Tabla.htm?t=39364', retrievedAt: '2026-11-17T10:00:00Z' };
const touristShareSource = { id: 'ine-tourist-share', title: 'Porcentaje de viviendas turísticas, tabla 39365', publisher: 'INE', url: 'https://www.ine.es/jaxiT3/Tabla.htm?t=39365', retrievedAt: '2026-11-17T10:00:00Z' };
const touristHousingObservations = [
  { id: 'tourist-count-es', metricId: 'tourist_housing_count', value: 341001, period: '2026M05', unit: 'viviendas', geography: 'España', population: 'viviendas turísticas estimadas', dimensions: { geo: 'España', geographyLevel: 'country' }, source: touristCountSource },
  { id: 'tourist-count-madrid', metricId: 'tourist_housing_count', value: 20000, period: '2026M05', unit: 'viviendas', geography: 'Comunidad de Madrid', population: 'viviendas turísticas estimadas', dimensions: { geo: 'Comunidad de Madrid', geographyLevel: 'region' }, source: touristCountSource },
  { id: 'tourist-count-barcelona-province', metricId: 'tourist_housing_count', value: 14000, period: '2026M05', unit: 'viviendas', geography: 'Provincia de Barcelona', population: 'viviendas turísticas estimadas', dimensions: { geo: 'Provincia de Barcelona', geographyLevel: 'province' }, source: touristCountSource },
  { id: 'tourist-share-es', metricId: 'tourist_housing_share', value: 1.28, period: '2026M05', unit: '%', geography: 'España', population: 'viviendas turísticas como proporción del parque total de viviendas', denominator: 'total housing stock in the 2021 Population and Housing Census', dimensions: { geo: 'España', geographyLevel: 'country', denominator: 'total housing stock in the 2021 Population and Housing Census' }, source: touristShareSource },
  { id: 'tourist-share-barcelona-province', metricId: 'tourist_housing_share', value: 1.4, period: '2026M05', unit: '%', geography: 'Provincia de Barcelona', population: 'viviendas turísticas como proporción del parque total de viviendas', denominator: 'total housing stock in the 2021 Population and Housing Census', dimensions: { geo: 'Provincia de Barcelona', geographyLevel: 'province', denominator: 'total housing stock in the 2021 Population and Housing Census' }, source: touristShareSource },
];
const touristCountClaim = '¿Cuántos pisos turísticos hay en España?';
const touristCountPlan = focusedEvidencePlan(touristCountClaim, { observations: touristHousingObservations });
assert.equal(touristCountPlan.answerScope.family, 'tourist-housing-count');
assert.equal(touristCountPlan.evidenceLevel, 'limited');
assert.deepEqual(touristCountPlan.evidenceSummary.families.map((family) => family.familyId), ['tourist_housing_count']);
assert.match(touristCountPlan.shareableReply, /341\.001 viviendas.*mayo de 2026/s);
assert.match(touristCountPlan.limitation, /tres grandes plataformas/);
assert.equal(localPublicCheckResponse({ status: 'complete', requestId: 'tourist-count', result: touristCountPlan }, touristCountClaim).state, 'limited');
const touristRegistrationClaim = '¿Cuántos apartamentos turísticos con licencia hay en España?';
const touristRegistrationPlan = focusedEvidencePlan(touristRegistrationClaim, { observations: touristHousingObservations });
assert.equal(touristRegistrationPlan.answerScope.family, 'tourist-housing-registration');
assert.deepEqual(touristRegistrationPlan.answerScope.directMetrics, []);
assert.match(touristRegistrationPlan.shareableReply, /no es un registro de licencias/);
assert.equal(localPublicCheckResponse({ status: 'complete', requestId: 'tourist-registration', result: touristRegistrationPlan }, touristRegistrationClaim).state, 'insufficient');
const touristShareClaim = '¿Qué porcentaje del parque de viviendas corresponde a viviendas turísticas?';
const touristSharePlan = focusedEvidencePlan(touristShareClaim, { observations: touristHousingObservations });
assert.equal(touristSharePlan.answerScope.family, 'tourist-housing-share');
assert.match(touristSharePlan.shareableReply, /1,28 %.*mayo de 2026/s);
assert.match(touristSharePlan.limitation, /Censo.*2021/);
assert.equal(touristSharePlan.evidenceSummary.families[0].dimensions.denominator, 'total housing stock in the 2021 Population and Housing Census');
const touristDisplacementClaim = 'Los pisos turísticos están retirando viviendas del alquiler residencial';
const touristDisplacementPlan = focusedEvidencePlan(touristDisplacementClaim, { observations: touristHousingObservations });
assert.equal(touristDisplacementPlan.answerScope.family, 'tourist-housing-supply');
assert.deepEqual(touristDisplacementPlan.answerScope.directMetrics, [], 'The INE tourist-housing counts do not directly measure homes lost from residential rent');
assert.match(touristDisplacementPlan.shareableReply, /Como contexto:/);
assert.match(touristDisplacementPlan.shareableReply, /no indican cu[aá]ntas viviendas dejaron el alquiler residencial/);
assert.equal(localPublicCheckResponse({ status: 'complete', requestId: 'tourist-displacement', result: touristDisplacementPlan }, touristDisplacementClaim).state, 'insufficient');
const touristNeighbourhoodClaim = 'Los pisos turísticos reducen la oferta para residentes en los barrios céntricos de Barcelona';
const touristNeighbourhoodPlan = focusedEvidencePlan(touristNeighbourhoodClaim, { observations: touristHousingObservations });
assert.equal(touristNeighbourhoodPlan.sourceLinks.length, 0, 'A provincial or national aggregate cannot answer a neighbourhood-level claim');
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
const cityRentAffordability = focusedEvidencePlan('Con un sueldo normal ya no se puede alquilar un piso entero solo en las grandes ciudades españolas');
assert.equal(cityRentAffordability.evidenceLevel, 'limited');
assert.match(cityRentAffordability.headline, /no permite saber si un sueldo normal alcanza/);
assert.match(cityRentAffordability.shareableReply, /26,7 %.*Madrid.*31,6 %.*M[aá]laga.*34,5 %/s);
assert.match(cityRentAffordability.shareableReply, /no es el sueldo individual/i);
assert.match(cityRentAffordability.limitation, /hogares que ya viv[ií]an de alquiler/);
assert.equal(cityRentAffordability.sourceLinks[0].id, 'bank-spain-housing-annual-2025');
assert.equal(focusedEvidencePlan('Con un sueldo normal no se puede alquilar un piso entero en 2025').sourceLinks.length, 0, 'The 2024 household snapshot must not answer a 2025 request');
assert.equal(focusedEvidencePlan('El alquiler se lleva cada vez más sueldo en las ciudades').sourceLinks.length, 0, 'A single 2024 snapshot must not answer a rent-trend claim');
assert.equal(focusedEvidencePlan('El alquiler se lleva la mitad de los ingresos de los jóvenes').sourceLinks.length, 0, 'General-household rent data must not replace the youth-specific population');
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
const pensionIndexationClaim = 'Las pensiones contributivas se revalorizan según el IPC';
const pensionIndexation = focusedEvidencePlan(pensionIndexationClaim, { now: Date.parse('2026-11-17') });
assert.equal(pensionIndexation.answerScope.family, 'pension-price-indexation');
assert.equal(pensionIndexation.evidenceLevel, 'limited');
assert.equal(pensionIndexation.evidenceSummary.mode, 'snapshot');
assert.match(pensionIndexation.shareableReply, /2,5 % en 2022, 8,5 % en 2023, 3,8 % en 2024, 2,8 % en 2025 y 2,7 % en 2026/);
assert.match(pensionIndexation.shareableReply, /no mide el coste de vida de cada hogar pensionista/);
assert.deepEqual(pensionIndexation.sourceLinks.map((source) => source.id), [
  'pension-revaluation-2022', 'pension-revaluation-2023', 'pension-revaluation-2024', 'pension-revaluation-2025', 'pension-revaluation-2026',
]);
assert.equal(pensionIndexation.blocks.find((block) => block.type === 'claim_breakdown').items[0].verdict, 'mixed', 'A source-backed but qualified focused answer must not label the claim as unsupported');
assert.equal(localPublicCheckResponse({ status: 'complete', requestId: 'pension-indexation', result: pensionIndexation }, pensionIndexationClaim).state, 'limited');
assert.equal(focusedEvidencePlan('¿Cuánto subieron las pensiones en 2026?', { now: Date.parse('2026-11-17') }).sourceLinks.length, 5, 'A year-specific rate question must use the official revaluation decisions');
assert.equal(focusedEvidencePlan('Las pensiones siguen el IPC desde 2018', { now: Date.parse('2026-11-17') }).sourceLinks.length, 0, 'A 2022–2026 snapshot must not answer a claim that starts in 2018');
assert.equal(focusedEvidencePlan('Las pensiones contributivas francesas se revalorizan con el IPC', { now: Date.parse('2026-11-17') }).sourceLinks.length, 0, 'Spanish revaluation rules must not answer a French pension claim');
assert.equal(focusedEvidencePlan('Las pensiones se actualizan mejor con la inflación que muchos salarios', { now: Date.parse('2026-11-17') }).answerScope.family, 'pension-indexation-comparison', 'A wage comparison must retain its separate evidence contract');
assert.equal(focusedEvidencePlan('Las pensiones se actualizan mejor con la inflación que muchos salarios', { now: Date.parse('2026-11-17') }).sourceLinks.length, 0, 'The pension-price rule must not answer a pension-versus-wage comparison');
assert.equal(claimFocusFor(`¿Cuánto cobraré de pensión en ${new Date().getFullYear() + 2}?`)?.id, 'future-pension-outlook', 'A genuinely future pension amount must remain a projection question');
assert.equal(focusedEvidencePlan(pensionIndexationClaim, { now: Date.parse('2027-02-01') }).sourceLinks.length, 0, 'The 2022–2026 snapshot must expire before the next annual revaluation');
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
const skillDemandClaim = 'Los idiomas y competencias digitales pesan más en el empleo que muchas asignaturas del título';
const skillDemand = focusedEvidencePlan(skillDemandClaim, { observations: [
  { id: 'tertiary-employment-neighbour', metricId: 'employment_rate_tertiary_education', value: 83.2, period: '2025', unit: '%', geography: 'España' },
] });
assert.equal(claimFocusFor(skillDemandClaim)?.id, 'education-skill-demand-vs-curriculum');
assert.equal(skillDemand.answerScope.family, 'education-skill-demand-vs-curriculum');
assert.equal(skillDemand.evidenceLevel, 'insufficient');
assert.deepEqual(skillDemand.answerScope.directMetrics, []);
assert.deepEqual(skillDemand.answerScope.contextMetrics, []);
assert.equal(skillDemand.sourceLinks.length, 0, 'A tertiary-employment rate cannot answer which skills employers value relative to course content');
assert.match(skillDemand.shareableReply, /no mide qu[eé] competencias piden las empresas ni las compara con los contenidos/);
assert.doesNotMatch(skillDemand.shareableReply, /83,2 %/);
assert.equal(localPublicCheckResponse({ status: 'complete', requestId: 'skill-curriculum-gap', result: skillDemand }, skillDemandClaim).state, 'insufficient');
for (const paraphrase of [
  'Las empresas priorizan competencias digitales e idiomas frente a muchas materias de la carrera',
  'El mercado de trabajo exige habilidades que la universidad no enseña en sus asignaturas',
]) {
  const plan = focusedEvidencePlan(paraphrase, { observations: [{ id: 'tertiary-employment-neighbour', metricId: 'employment_rate_tertiary_education', value: 83.2, period: '2025', unit: '%', geography: 'España' }] });
  assert.equal(plan.answerScope.family, skillDemand.answerScope.family, `A skill-versus-curriculum paraphrase crossed into another family: ${paraphrase}`);
  assert.deepEqual(plan.evidenceSummary.missingDimensions, skillDemand.evidenceSummary.missingDimensions, `A paraphrase changed the required evidence: ${paraphrase}`);
  assert.equal(plan.sourceLinks.length, 0, `A paraphrase inherited an unrelated tertiary-employment source: ${paraphrase}`);
}
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
const migrationWageClaim = 'La inmigración de trabajadores de baja cualificación presiona a la baja los salarios de algunos sectores';
const migrationFiscalClaim = 'La inmigración cualificada aporta más fiscalmente que la inmigración atrapada en empleos de bajos salarios';
const migrantCredentialClaim = 'La homologación lenta de títulos obliga a inmigrantes cualificados a trabajar por debajo de su formación';
const healthcareStaffingClaim = 'La falta de médicos en algunas zonas se debe más a las condiciones de trabajo que al número total de titulados';
assert.deepEqual([...focusedMetricIdsFor(migrationWageClaim)], [], 'A total wage or graduate series must not stand in for migration wage effects');
assert.deepEqual([...focusedMetricIdsFor(migrationFiscalClaim)], [], 'A programme or graduate series must not stand in for group-level net fiscal contribution');
assert.deepEqual([...focusedMetricIdsFor(migrantCredentialClaim)], ['tertiary_overqualification_rate'], 'Credential claims may use only the citizenship-specific overqualification measure as context');
assert.deepEqual([...focusedMetricIdsFor(healthcareStaffingClaim)], [], 'Graduate employment must not stand in for regional physician staffing or its causes');
const citizenshipOverqualificationSource = (citizen) => ({
  id: `eurostat-overqualification-${citizen.toLocaleLowerCase('en')}`,
  title: 'Over-qualification rates by citizenship · Eurostat', publisher: 'Eurostat',
  url: `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/lfsa_eoqgan?freq=A&citizen=${citizen}&age=Y20-64&sex=T&unit=PC&geo=ES&sinceTimePeriod=2015`,
  retrievedAt: '2026-11-16',
});
const citizenshipOverqualificationObservations = [
  ['foreign', 'FOR', 46.4, 'ciudadanía extranjera'],
  ['national', 'NAT', 32.7, 'ciudadanía española'],
  ['non-eu', 'NEU27_2020_FOR', 52.3, 'ciudadanía de fuera de la UE'],
  ['total', 'TOTAL', 34, 'total'],
].map(([id, citizen, value, group]) => ({
  id: `overqualification-${id}-2025`, metricId: 'tertiary_overqualification_rate', value, period: '2025',
  unit: 'Percentage', geography: 'España', population: 'employed residents aged 20 to 64 with tertiary education',
  dimensions: { geo: 'ES', age: 'Y20-64', isced11: 'ED5-8', citizen, sex: 'T', unit: 'PC', time: '2025' },
  dimensionLabels: { geo: 'Spain', citizen: group }, status: 'd', freshness: 'fresh',
  source: citizenshipOverqualificationSource(citizen),
}));
const migrantCredentialContext = focusedEvidencePlan(migrantCredentialClaim, { observations: citizenshipOverqualificationObservations });
assert.equal(migrantCredentialContext.answerScope.family, 'migrant-credential-recognition');
assert.deepEqual(migrantCredentialContext.answerScope.directMetrics, [], 'Citizenship-group overqualification is context, not evidence that slow credential recognition caused the outcome');
assert.deepEqual(migrantCredentialContext.answerScope.contextMetrics, ['tertiary_overqualification_rate']);
assert.equal(migrantCredentialContext.evidenceLevel, 'limited');
assert.match(migrantCredentialContext.shareableReply, /ciudadan[ií]a extranjera/);
assert.match(migrantCredentialContext.shareableReply, /46,4 %/);
assert.match(migrantCredentialContext.shareableReply, /homologaci[oó]n/);
assert.match(migrantCredentialContext.shareableReply, /no demuestra que el reconocimiento de t[ií]tulos las cause/);
assert.doesNotMatch(migrantCredentialContext.shareableReply, /32,7 %|52,3 %|34 %/, 'A single-group migration claim must not silently add nationals, non-EU citizens, or the all-citizen total');
assert(migrantCredentialContext.sourceLinks.some((source) => source.id === 'eurostat-overqualification-for'));
const migrantCredentialComparison = focusedEvidencePlan('La tasa de sobrecualificación de extranjeros es mayor que la de españoles', { observations: citizenshipOverqualificationObservations });
assert.equal(migrantCredentialComparison.answerScope.family, 'migration-overqualification', 'A measured citizenship gap must not be framed as a credential-recognition cause');
assert.deepEqual(migrantCredentialComparison.answerScope.directMetrics, ['tertiary_overqualification_rate']);
assert.deepEqual(migrantCredentialComparison.answerScope.contextMetrics, []);
assert.equal(migrantCredentialComparison.evidenceLevel, 'limited', 'The direct series must retain Eurostat quality flags');
assert.match(migrantCredentialComparison.shareableReply, /46,4 %/);
assert.match(migrantCredentialComparison.shareableReply, /32,7 %/);
assert.match(migrantCredentialComparison.shareableReply, /definici[oó]n de este dato difiere/, 'A flagged cross-group comparison must retain the source quality note');
assert.match(migrantCredentialComparison.shareableReply, /ciudadan[ií]a extranjera/);
assert.match(migrantCredentialComparison.shareableReply, /ciudadan[ií]a espa[nñ]ola/);
assert.doesNotMatch(migrantCredentialComparison.shareableReply, /52,3 %|34 %/);
const foreignGraduateOverqualification = focusedEvidencePlan('La tasa de sobrecualificación de personas con ciudadanía extranjera', { observations: citizenshipOverqualificationObservations });
assert.equal(foreignGraduateOverqualification.answerScope.family, 'migration-overqualification');
assert.deepEqual(foreignGraduateOverqualification.answerScope.directMetrics, ['tertiary_overqualification_rate']);
assert.equal(foreignGraduateOverqualification.evidenceLevel, 'limited', 'The direct foreign-citizenship rate must remain limited by the source flag');
assert.match(foreignGraduateOverqualification.shareableReply, /46,4 %/);
assert.match(foreignGraduateOverqualification.shareableReply, /ciudadan[ií]a extranjera/);
assert.match(foreignGraduateOverqualification.shareableReply, /personas ocupadas de 20 a 64 a[nñ]os/);
const genericGraduateOverqualification = focusedEvidencePlan('Los titulados universitarios están sobrecualificados en sus empleos', { observations: citizenshipOverqualificationObservations });
assert.match(genericGraduateOverqualification.shareableReply, /34 %/);
assert.doesNotMatch(genericGraduateOverqualification.shareableReply, /46,4 %|32,7 %|52,3 %/, 'A general graduate claim must use the all-citizen measure only');
const birthplaceCredentialClaim = 'Los titulados nacidos fuera de España trabajan por debajo de su formación';
const birthplaceCredential = focusedEvidencePlan(birthplaceCredentialClaim, { observations: citizenshipOverqualificationObservations });
assert.equal(birthplaceCredential.answerScope.family, 'migrant-credential-recognition');
assert.doesNotMatch(birthplaceCredential.shareableReply, /46,4 %|32,7 %|52,3 %/, 'Citizenship observations must not answer a country-of-birth claim');
assert.deepEqual(tertiaryOverqualificationCitizenshipGroupsForClaim('Compara la tasa de sobrecualificación de titulados universitarios en 2023 y 2025'), ['TOTAL'], 'A period comparison must keep the all-citizen denominator');
assert.deepEqual(tertiaryOverqualificationCitizenshipGroupsForClaim('La tasa de sobrecualificación de extranjeros es mayor que la de españoles'), ['FOR', 'NAT'], 'A citizenship comparison must include only the named groups');
assert.deepEqual(tertiaryOverqualificationCitizenshipGroupsForClaim('Compara la tasa de sobrecualificación de personas de fuera de la UE con la de españoles'), ['NEU27_2020_FOR', 'NAT'], 'A non-EU comparison must use the matching citizen groups');
assert.deepEqual(tertiaryOverqualificationCitizenshipGroupsForClaim('La tasa de sobrecualificación de ciudadanos de otros países de la Unión Europea'), ['EU27_2020_FOR'], 'An EU-citizenship claim must use the EU foreign-citizenship subgroup');
assert.deepEqual(tertiaryOverqualificationCitizenshipGroupsForClaim('Sobrecualificación por ciudadanía'), ['NAT', 'EU27_2020_FOR', 'NEU27_2020_FOR'], 'An explicit citizenship breakdown must return disjoint subgroup series');
assert.deepEqual(tertiaryOverqualificationCitizenshipGroupsForClaim(birthplaceCredentialClaim), [], 'Country-of-birth questions must not use citizenship categories');
for (const claim of [migrationWageClaim, migrationFiscalClaim, healthcareStaffingClaim]) {
  const answer = focusedEvidencePlan(claim, { observations: citizenshipOverqualificationObservations });
  assert.equal(answer.sourceLinks.length, 0, `A nearby group metric crossed into an unsupported family: ${claim}`);
}
assert.equal(claimFocusFor('Los jóvenes con estudios superiores están sobrecualificados en su empleo')?.id, 'education-employment-outcomes', 'A youth overqualification claim must retain its reviewed education family');
assert.equal(claimFocusFor('¿Cuántos días se espera para una cita con el médico de familia?')?.id, 'primary-care-waits', 'Appointment delays must remain separate from staffing shortage causes');
const specialistWaitParaphrases = [
  'Las listas de espera varían demasiado entre comunidades autónomas',
  '¿Qué diferencias hay en la espera media de las consultas externas del SNS entre comunidades autónomas?',
  'Los tiempos de espera de los especialistas cambian según la región',
];
for (const claim of specialistWaitParaphrases) {
  assert.equal(claimFocusFor(claim)?.id, 'specialist-outpatient-regional-waits', `A regional specialist-wait paraphrase lost its evidence family: ${claim}`);
  const answer = focusedEvidencePlan(claim);
  assert.equal(answer.answerScope.family, 'specialist-outpatient-regional-waits');
  assert.equal(answer.evidenceLevel, 'limited');
  assert.equal(answer.interpretation.kind, 'comparative', 'A regional wait comparison must retain comparative interpretation');
  assert.match(answer.headline, /variaron entre territorios en 2025/);
  assert.match(answer.shareableReply, /16 d[ií]as en Melilla a 162 d[ií]as en Canarias/);
  assert.match(answer.limitation, /no establece si son excesivas ni por qu[eé]/);
  assert.ok(answer.sourceLinks.some((source) => source.id === 'sisle-sns-regional-consultations-dec-2025'));
  const family = answer.evidenceSummary.families.find((item) => item.familyId === 'specialist-outpatient-regional-waits');
  assert.equal(family.dataKind, 'snapshot');
  assert.equal(family.dimensions.period, '2025-12-31');
  assert.equal(family.dimensions.denominator, 'pacientes registrados en la lista estructural de consultas externas de cada territorio');
  assert.match(family.dimensions.population, /listas estructurales de espera de consultas externas del SNS/);
  assert.equal(family.dimensions.unit, 'días de espera media');
  assert.ok(!answer.blocks.some((block) => block.type === 'evidence_gap'), 'A directly measured regional comparison must not claim that the comparison data are missing');
  const publicAnswer = localPublicCheckResponse({ status: 'complete', requestId: 'specialist-waits', result: answer }, claim);
  assert.equal(publicAnswer.state, 'limited', 'A scoped regional comparison should appear as a limited public answer');
  assert.match(publicAnswer.result.reply, /16 d[ií]as en Melilla a 162 d[ií]as en Canarias/);
  assert.ok(publicAnswer.result.sources.some((source) => source.id === 'sisle-sns-regional-consultations-dec-2025'));
}
const privateSpecialistWaitParaphrases = [
  { claim: 'Se contrata un seguro privado para evitar esperas de especialistas', type: 'causal' },
  { claim: 'La gente paga consultas privadas para que la vea el especialista antes', type: 'causal' },
  { claim: 'El seguro médico privado evita demoras en las consultas externas', type: 'causal' },
  { claim: 'La sanidad privada permite acceder antes a especialistas que la pública', type: 'comparative' },
];
for (const { claim, type } of privateSpecialistWaitParaphrases) {
  const answer = focusedEvidencePlan(claim);
  assert.equal(answer.answerScope.family, 'private-healthcare-access', `A private-care claim was routed to the wrong family: ${claim}`);
  assert.equal(answer.claimType, type, `A private-care claim was assigned the wrong claim type: ${claim}`);
  assert.equal(answer.blocks.find((block) => block.type === 'claim_breakdown').items[0].type, type);
  assert.equal(answer.interpretation.kind, type);
  assert.equal(answer.evidenceLevel, 'limited', 'Related official wait data may inform the reply but cannot settle the private-care claim');
  assert.match(answer.shareableReply, /Como contexto: El informe/);
  assert.match(answer.shareableReply, /16 d[ií]as en Melilla y 162 en Canarias/);
  assert.match(answer.shareableReply, /Falta una medición directa/);
  assert.match(answer.shareableReply, /motivos declarados para contratar seguro/);
  assert.match(answer.shareableReply, /Una lista de espera pública no mide las motivaciones/);
  assert.ok(answer.sourceLinks.some((source) => source.id === 'sisle-sns-regional-consultations-dec-2025'));
  const breakdown = answer.blocks.find((block) => block.type === 'claim_breakdown').items[0];
  assert.equal(breakdown.verdict, 'insufficient');
  assert.equal(breakdown.evidenceLevel, 'none');
  assert.deepEqual(breakdown.evidenceIds, [], 'Public wait data must not be attached as evidence of why people choose private care');
  assert.deepEqual(breakdown.sourceIds, [], 'A public waiting-list source must not be attributed to private-care motives');
  const contextFinding = answer.blocks.find((block) => block.type === 'data_finding');
  assert.equal(contextFinding.dataKind, 'context', 'Related wait figures must remain visibly contextual');
  const family = answer.evidenceSummary.families.find((item) => item.familyId === 'private-healthcare-access');
  assert.equal(family.dataKind, 'context');
  assert.equal(family.dimensions.period, '2025-12-31');
  assert.deepEqual(family.missingDimensions, ['motivos declarados para contratar seguro', 'demoras comparables por servicio y sector', 'periodo y población con seguro']);
  const publicAnswer = localPublicCheckResponse({ status: 'partial', requestId: 'private-specialist-waits', result: answer }, claim);
  assert.equal(publicAnswer.state, 'insufficient', 'Relevant wait data must not make an unsupported private-care claim look partly proven');
  assert.ok(publicAnswer.result.criteria.every((criterion) => criterion.label === 'Contexto'), 'Contextual sources must not be labelled as direct findings');
  assert.ok(publicAnswer.result.sources.some((source) => source.id === 'sisle-sns-regional-consultations-dec-2025'));
}
for (const claim of [
  '¿La sanidad privada permite acceder antes a las pruebas diagnósticas?',
  'El seguro privado evita esperas para operarse',
  'Los seguros privados reducen esperas para acudir al médico de familia',
  'La sanidad privada permite ver al especialista antes en Madrid',
  'En Portugal se contrata seguro privado para evitar esperas de especialistas',
  'En 2024 se contrata seguro privado para evitar esperas de especialistas',
]) {
  const answer = focusedEvidencePlan(claim);
  assert.equal(answer?.answerScope.family, 'private-healthcare-access', `A nearby healthcare-access claim left its semantic family: ${claim}`);
  assert.equal(answer.sourceLinks.length, 0, `Incompatible wait-list context crossed into a private-care claim: ${claim}`);
}
assert.notEqual(claimFocusFor('En muchas zonas hay que esperar demasiado para conseguir cita con el médico de familia')?.id,
  'specialist-outpatient-regional-waits', 'Primary-care appointment delays must not inherit outpatient-specialist data');
for (const claim of [
  'Las listas quirúrgicas varían mucho entre comunidades autónomas',
  'La espera de especialistas ha aumentado desde 2020',
  'Las listas de espera varían demasiado entre comunidades como Cataluña y Madrid',
  'Las listas de espera de los trenes varían entre comunidades autónomas',
  'Las esperas de consultas externas cambian cada año entre comunidades autónomas',
  'Las demoras varían entre comunidades porque faltan médicos',
  'Las demoras de una especialidad concreta varían entre CCAA',
  'Las listas de espera varían entre comunidades autónomas en 2024',
  'Las listas de espera de especialistas varían entre comunidades autónomas en 2026',
]) assert.notEqual(claimFocusFor(claim)?.id, 'specialist-outpatient-regional-waits', `An incompatible wait-list claim crossed into the 2025 regional consultation snapshot: ${claim}`);
const portugalWaits = focusedEvidencePlan('Las listas de espera varían entre regiones de Portugal');
assert.equal(portugalWaits.answerScope.family, 'specialist-outpatient-regional-waits');
assert.equal(portugalWaits.sourceLinks.length, 0, 'Spain-only waiting-list evidence must not appear for Portugal');
assert.equal(claimFocusFor('Los titulados universitarios trabajan en empleos inferiores a su preparación')?.id, 'education-employment-outcomes', 'A general graduate claim must not be inferred to concern migrants');
assert.equal(claimFocusFor('Hay muchos médicos en España, aunque no se repartan bien por comunidades')?.id, undefined, 'A general physician distribution claim must not be mistaken for a shortage caused by working conditions');
assert.notEqual(claimFocusFor('¿Qué parte de todas las personas que reciben prestaciones por desempleo es extranjera?')?.id, 'migration-fiscal-contribution', 'Unemployment-benefit recipients must not be mistaken for a net fiscal contribution');
const youngOverqualificationSource = {
  id: 'eurostat-tertiary-overqualification-age-20-34',
  title: 'Over-qualification rates by citizenship · Eurostat', publisher: 'Eurostat',
  url: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/lfsa_eoqgan?freq=A&citizen=TOTAL&age=Y20-34&sex=T&unit=PC&geo=ES&sinceTimePeriod=2015',
  retrievedAt: '2026-11-16',
};
const youngOverqualificationObservation = {
  id: 'tertiary-overqualification-age-20-34-2025', metricId: 'tertiary_overqualification_rate_age_20_34',
  value: 34.4, period: '2025', unit: 'Percentage', geography: 'España',
  population: 'employed residents aged 20 to 34 with tertiary education',
  denominator: 'all employed residents aged 20 to 34 with tertiary education',
  dimensions: { freq: 'A', citizen: 'TOTAL', age: 'Y20-34', sex: 'T', unit: 'PC', geo: 'ES', time: '2025' },
  dimensionLabels: { age: 'From 20 to 34 years', geo: 'Spain' },
  status: 'd', freshness: 'fresh', source: youngOverqualificationSource,
};
const youngOverqualificationParaphrases = [
  'Los jóvenes con estudios superiores están sobrecualificados en su empleo',
  '¿Qué proporción de personas ocupadas de 20 a 34 años con educación superior trabaja en puestos que no requieren ese nivel?',
  '¿Cuántos trabajadores jóvenes titulados están sobrecualificados?',
];
for (const claim of youngOverqualificationParaphrases) {
  const answer = focusedEvidencePlan(claim, { observations: [youngOverqualificationObservation] });
  assert.deepEqual(answer.answerScope.directMetrics, ['tertiary_overqualification_rate_age_20_34'], claim);
  assert.deepEqual(answer.sourceLinks.map((source) => source.id), [youngOverqualificationSource.id], claim);
  assert.match(answer.shareableReply, /34,4 % de las personas ocupadas de 20 a 34 a[nñ]os/);
  assert.match(answer.shareableReply, /denominador son solo las personas ocupadas de ese grupo/);
  assert.match(answer.shareableReply, /no equivale a reci[eé]n graduados/);
  assert.match(answer.shareableReply, /definici[oó]n de este dato difiere/);
}
const wrongAgeYouthObservation = { ...youngOverqualificationObservation, dimensions: { ...youngOverqualificationObservation.dimensions, age: 'Y20-64' } };
const wrongCountryYouthObservation = { ...youngOverqualificationObservation, dimensions: { ...youngOverqualificationObservation.dimensions, geo: 'FR' }, geography: 'Francia' };
for (const invalidObservation of [wrongAgeYouthObservation, wrongCountryYouthObservation]) {
  const answer = focusedEvidencePlan('Los jóvenes con estudios superiores están sobrecualificados en su empleo', { observations: [invalidObservation] });
  assert.equal(answer.sourceLinks.length, 0, 'The age-specific metric must reject an observation outside its configured age or geography');
  assert.equal(answer.evidenceLevel, 'insufficient');
}
const youthUnemploymentNeighbour = focusedEvidencePlan('Los jóvenes con estudios superiores tienen más paro que antes', { observations: [youngOverqualificationObservation] });
assert.equal(youthUnemploymentNeighbour.sourceLinks.length, 0, 'Youth over-qualification must not stand in for youth unemployment');
assert.match(youthUnemploymentNeighbour.shareableReply, /medici[oó]n directa de desempleo para la franja de edad/);
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
const ageScopedYouthOpportunities = focusedEvidencePlan('Los jóvenes de 25 a 34 años no encuentran empleo', { observations: [
  { id: 'wrong-youth-age', metricId: 'unemployment_rate', value: 10, period: '2025', unit: '%', geography: 'España', dimensions: { age: 'Y15-74', sex: 'T' }, dimensionLabels: { age: 'All active people aged 15 to 74' }, source: jobsSource },
  { id: 'matching-youth-age', metricId: 'unemployment_rate', value: 13.2, period: '2025', unit: '%', geography: 'España', population: 'Youth active population aged 25 to 34', dimensions: { age: 'Y25-34', sex: 'T' }, dimensionLabels: { age: 'Youth aged 25 to 34' }, source: jobsSource },
] });
assert.match(ageScopedYouthOpportunities.shareableReply, /13,2 %/, 'A matching age band should remain available as contextual evidence');
assert.doesNotMatch(ageScopedYouthOpportunities.shareableReply, /10 %/, 'An adjacent all-age band must not be presented for an explicit age request');
assert.deepEqual(ageScopedYouthOpportunities.evidenceIds, ['matching-youth-age'], 'The focused answer should retain only evidence from the requested age group');
const educationPeriodRange = focusedEvidencePlan('La tasa de paro de titulados universitarios subió entre 2018 y 2020', { observations: [2017, 2018, 2019, 2020, 2021].map((year) => ({
  id: `graduate-unemployment-${year}`, metricId: 'unemployment_rate_tertiary_education', value: 8, period: String(year), unit: '%', geography: 'España', source: jobsSource,
})) });
assert.deepEqual(educationPeriodRange.evidenceIds, ['graduate-unemployment-2018', 'graduate-unemployment-2019', 'graduate-unemployment-2020'], 'A requested year interval must include its full period and exclude observations outside it');
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
assert.match(youthRent.headline, /no sabemos cu[aá]ntos gastan m[aá]s de la mitad/);
assert.match(youthRent.shareableReply, /98,7/);
assert.match(youthRent.shareableReply, /27,4 %/);
assert.match(youthRent.shareableReply, /34,2 %/);
assert.doesNotMatch(youthRent.shareableReply, /escenario potencial|municipios: Madrid|36,3 %/, 'A general rent reply should not add a hypothetical city scenario');
assert.match(youthRent.evidenceSummary.families.find((family) => family.criterionId === 'youth-rental-potential-effort')?.data?.[0] || '', /36,3 %.*Madrid 50,2 %.*Val[eè]ncia 50,3 %.*M[aá]laga 51,1 %/, 'Detailed evidence should retain the distinct hypothetical measure');
assert.match(youthRent.shareableReply, /no indican cu[aá]ntos j[oó]venes destinan m[aá]s de la mitad de su salario individual/);
assert.deepEqual(youthRent.shareableSourceIds, ['cje-emancipation-2025', 'bank-spain-housing-annual-2025'], 'A youth-rent answer must link the observed household and potential-effort source, not unrelated family-survey evidence');
assert.doesNotMatch(youthRent.shareableReply, /emigra|66\.900|peor que nunca/i);
assert.ok(!youthRent.evidenceSummary.families.some((family) => family.criterionId === 'family-support-counterfactual'));
assert.ok(!youthRent.visuals?.some((visual) => /Alquiler de vivienda completa/.test(visual.title)), 'An approximated graphic must not present exact regional values');
const youthRentPublic = localPublicCheckResponse({ status: 'complete', requestId: 'youth-rent', result: youthRent }, 'El alquiler se come más de la mitad del sueldo de muchos jóvenes');
assert.equal(youthRentPublic.state, 'limited');
assert.match(youthRentPublic.result.reply, /27,4 %/);
assert.ok(youthRentPublic.result.sources.some((source) => source.id === 'bank-spain-housing-annual-2025'));
for (const paraphrase of [
  'Los hogares jóvenes que alquilan destinan la mitad de sus ingresos a la vivienda',
  'El alquiler consume más de la mitad del sueldo de la juventud en las grandes ciudades',
]) {
  const answer = answerPlanForBroadDomains(paraphrase);
  assert.ok(answer, `Youth-rent paraphrase lost the reviewed answer family: ${paraphrase}`);
  assert.match(answer.shareableReply, /27,4 %/);
  assert.doesNotMatch(answer.shareableReply, /escenario potencial|municipios: Madrid/, `A general rent paraphrase acquired a hypothetical municipality scenario: ${paraphrase}`);
  assert.match(answer.evidenceSummary.families.find((family) => family.criterionId === 'youth-rental-potential-effort')?.data?.[0] || '', /hogar hipotético/);
  assert.ok(answer.shareableSourceIds.includes('bank-spain-housing-annual-2025'));
}
const youthPurchase = answerPlanForBroadDomains('Los jóvenes no pueden comprar vivienda sin la ayuda de sus padres');
assert.ok(!youthPurchase.shareableSourceIds.includes('bank-spain-housing-annual-2025'), 'Youth rental figures crossed into a nearby purchase-only claim');
assert.ok(!youthPurchase.evidenceSummary.families.some((family) => ['youth-rental-household-effort', 'youth-rental-overburden', 'youth-rental-potential-effort'].includes(family.criterionId)));
const nonYouthRent = focusedEvidencePlan('El alquiler se come más de la mitad del sueldo de muchas familias');
assert.equal(nonYouthRent.answerScope.family, 'rental-affordability');
assert.ok(nonYouthRent.sourceLinks.some((source) => source.id === 'bank-spain-housing-annual-2025'), 'All-household rent claims should use the all-renter measure');
assert.match(nonYouthRent.shareableReply, /26,7 %/);
assert.doesNotMatch(nonYouthRent.shareableReply, /27,4 %|34,2 %|36,3 %/, 'Youth-only measures crossed into a nearby all-household claim');
const security = answerPlanForBroadDomains('No se puede salir a la calle de cómo está la seguridad');
assert.doesNotMatch(security.shareableReply, /extranj|nacionaliz|wokismo/i);
assert.ok(!security.evidenceSummary.families.some((family) => family.criterionId === 'group-causality'));
const health = answerPlanForBroadDomains('Las listas de espera sanitarias son muy largas');
assert.doesNotMatch(health.shareableReply, /peor que nunca/i);
assert.ok(!health.evidenceSummary.families.some((family) => family.criterionId === 'health-historical-claim'));
const paraphraseCount = cases.reduce((count, [, paraphrases]) => count + paraphrases.length, 0);
console.log(`Claim focus validated: ${paraphraseCount} paraphrases, negative neighbours, survey bases, scope rejection, denominator and source boundaries, missing values and preview replacement.`);
