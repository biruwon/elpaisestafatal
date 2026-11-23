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
import { PRIMARY_CARE_WAIT_SNAPSHOT } from '../../src/lib/knowledge/primary-care-wait-snapshot.mjs';
import { WORKING_POVERTY_SNAPSHOT } from '../../src/lib/knowledge/working-poverty-snapshot.mjs';
import { validateAnswerPlan } from './answer-plan-validation.mjs';
import { alignPropositionOutcomes, comparableObservationGroups, composePropositionFindings, evidenceForProposition } from '../lib/compound-evidence.mjs';
import { rankWarehouseObservations } from './warehouse-query.mjs';
import { deterministicFallbackCompiler } from './fallback-compiler.mjs';

const cases = [
  ['youth-housing-family-formation-costs', ['La combinación de vivienda cara y cotizaciones altas reduce la capacidad de los jóvenes para tener hijos y ahorrar', 'El alquiler y las contribuciones elevadas limitan que la juventud ahorre y forme una familia', 'La vivienda costosa y los impuestos reducen la capacidad económica de los jóvenes para ahorrar y tener hijos']],
  ['inflation-tax-bracket-creep', ['La inflación eleva la carga fiscal cuando los tramos y deducciones no se actualizan al mismo ritmo', 'Si el IRPF no actualiza sus tramos con los precios, la inflación aumenta la recaudación', 'La progresividad en frío hace subir el IRPF cuando las rentas nominales crecen por la inflación']],
  ['household-inflation-basket', ['El IPC general no refleja bien lo que notan los hogares que gastan mucho en comida y alquiler', '¿Cómo han cambiado desde 2020 los alimentos, el alquiler y la inflación general para las familias?', 'El índice general no describe toda la cesta de familias que destinan más dinero a alimentación y vivienda', 'La cesta de la compra ha subido más de lo que percibe quien mira solo el IPC general', 'Los precios de los alimentos han subido más que la inflación general', 'Los alimentos se encarecieron por encima del IPC general']],
  ['gdp-household-welfare', ['Las cifras de crecimiento del PIB no reflejan cómo vive el hogar medio', 'Que el PIB crezca no se traduce directamente en una mejora de la vida de las familias', 'El PIB por habitante no refleja cómo se reparte la prosperidad entre los hogares']],
  ['education-employment-outcomes', ['Un título universitario ya no garantiza encontrar un empleo cualificado', 'Tener estudios superiores no asegura trabajar en un puesto acorde con la titulación', 'La universidad ya no asegura encontrar trabajo acorde con sus estudios', 'La tasa de paro de titulados universitarios ha subido', 'Los graduados tienen menos empleo que quienes cursan formación profesional']],
  ['job-opportunities', ['No hay trabajo', 'Aquí hay pocas ofertas de empleo', 'Es difícil encontrar trabajo en España', 'Los jóvenes no encuentran empleo', 'Empleo no hay', 'No hay empleo temporal', 'Hay pocos trabajos bien pagados']],
  ['working-poverty', ['En España se puede trabajar a jornada completa y seguir sin llegar a fin de mes', 'Tener trabajo a tiempo completo no impide ser pobre', 'La pobreza también alcanza a personas ocupadas']],
  ['real-wages', ['Los salarios pierden poder adquisitivo frente al coste de la vida', 'Los sueldos no siguen el ritmo de los precios', 'La inflación se come la nómina']],
  ['wage-price-margin-pass-through', ['Subir mucho los salarios de hostelería obligaría a subir precios o reducir márgenes en muchos negocios', 'Un aumento de sueldo en las empresas se acaba trasladando a los precios o reduce sus márgenes', 'Si suben los salarios, los negocios tienen que encarecer sus productos o ganar menos']],
  ['rental-affordability', ['Con un sueldo normal ya no se puede alquilar un piso entero solo', 'El alquiler se lleva la mitad de los ingresos', 'La renta mensual consume casi todo el salario']],
  ['business-tax-burden', ['Las multinacionales digitales pagan proporcionalmente menos impuestos que las tiendas locales', 'La carga fiscal efectiva de grandes empresas tecnológicas es menor que la de los comercios pequeños', 'Las empresas digitales compiten con el comercio de barrio con una tributación más baja']],
  ['small-business-cost-pressure', ['Los comercios de barrio cierran por la suma de alquiler, energía e impuestos', 'El aumento de los costes operativos está haciendo desaparecer pequeños negocios', 'Las tiendas pequeñas no sobreviven cuando suben a la vez salarios, alquileres y electricidad']],
  ['business-size-productivity', ['El pequeño tamaño medio de las empresas frena la inversión y la productividad', 'Las pymes tienen menos capacidad para adoptar tecnología y pagar buenos salarios', 'El tamaño empresarial limita la innovación y los sueldos']],
  ['unpaid-overtime', ['En hostelería se hacen horas extra sin cobrar', 'Las horas extraordinarias no remuneradas son habituales en algunos trabajos', 'Muchos trabajadores trabajan horas extra gratis']],
  ['wage-growth-job-mobility', ['Cambiar de empresa es la única forma de conseguir una subida salarial importante', 'El sueldo aumenta más al cambiar de trabajo que permaneciendo en la misma empresa', 'Quienes cambian de empleo logran mejores subidas de salario']],
  ['wage-progression', ['Los trabajadores jóvenes encadenan años de salarios de entrada sin progresión real', 'Los sueldos iniciales se estancan durante los primeros años de carrera', 'Quienes empiezan con un salario bajo apenas avanzan aunque acumulen antigüedad']],
  ['regional-wage-housing-cost', ['Las ciudades con más empleo son aquellas donde la vivienda se come la mejora salarial', 'En las áreas con más trabajo el coste del alquiler absorbe las subidas de sueldo', 'Los salarios más altos de las grandes ciudades no compensan el gasto de vivienda', 'El coste de vivienda ha eliminado la ventaja salarial de trabajar en Madrid o Barcelona', 'El alquiler borra la prima salarial de vivir en Madrid']],
  ['housing-investment-return-comparison', ['Los inversores compran vivienda porque ofrece más rentabilidad que los negocios productivos', 'El capital prefiere el ladrillo frente a la inversión en empresas productivas', 'La rentabilidad inmobiliaria supera a la de invertir en actividades productivas']],
  ['education-pay-comparison', ['Los sueldos de trabajos cualificados son demasiado parecidos a los de puestos que exigen menos formación', 'Los empleos que requieren estudios superiores no pagan mucho más que los que exigen menos estudios', 'La remuneración es similar entre puestos de distinta cualificación', 'Tener un máster o un doctorado no garantiza cobrar un salario acorde con la cualificación', 'Una titulación de posgrado no asegura un sueldo proporcional a la formación']],
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
  ['unemployment-wage-pressure', ['El paro estructural permite a las empresas ofrecer salarios bajos porque siempre hay candidatos', 'El desempleo elevado debilita la negociación salarial y presiona los sueldos a la baja', 'Cuando abundan los candidatos, las empresas pueden contener los salarios', 'Con mucho paro, los empleadores pueden frenar las subidas de sueldo']],
  ['local-safety-trend', ['En mi barrio ha subido la inseguridad este mes', 'La delincuencia ha empeorado en mi calle estas semanas', 'En la zona hay cada vez más robos', 'En mi municipio han aumentado los hurtos este trimestre']],
  ['primary-care-waits', ['Hay que esperar demasiado para conseguir cita con el médico de familia', '¿Cuántos días tarda una cita en atención primaria?', 'La cita con el médico de cabecera llega con mucha demora']],
  ['private-healthcare-access', ['Se contrata seguro privado para evitar esperas de especialistas', '¿La sanidad privada permite acceder antes a las pruebas?', 'El seguro privado se compra por la rapidez de las citas']],
  ['electricity-price-transmission', ['El gas encarece la electricidad en el sistema marginalista', 'Los hogares no notan la electricidad barata de las renovables', 'El precio mayorista no llega íntegro a la factura de la luz']],
  ['electricity-industry-costs', ['El precio de la electricidad resta competitividad a parte de la industria española', 'La factura eléctrica reduce la competitividad de las fábricas españolas', 'La electricidad encarece la producción de muchas empresas industriales']],
  ['electricity-market-trading', ['España puede exportar electricidad barata en horas solares y necesitar energía más cara en otros momentos', 'España exporta electricidad barata al mediodía e importa energía más cara por la noche', 'Las interconexiones permiten vender electricidad cuando sobra y comprarla cuando sube el precio']],
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
  ['housing-completions', ['¿Cuántas viviendas nuevas se terminaron en España en 2025?', '¿Cuál fue el recuento de viviendas terminadas en España durante 2025?', '¿Se terminaron 92.000 viviendas nuevas en España en 2025?', 'En 2025 se acabaron 92.000 viviendas nuevas en España', '¿Cuántas viviendas nuevas se concluyeron en España en 2025?']],
  ['housing-construction-pressure', ['La falta de vivienda nueva explica buena parte de la subida del alquiler', 'Se construyen pocas viviendas frente al número de hogares que se crean', 'La lentitud de las licencias urbanísticas retrasa la construcción de viviendas nuevas']],
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
  ['sector-wage-comparison', ['El turismo aumenta el PIB pero genera menos salarios altos que sectores de mayor productividad', 'Los sueldos turísticos son más bajos que en las industrias más productivas', 'En hostelería se pagan menos salarios altos que en otros sectores', 'El empleo aumenta más en sectores de baja productividad que en sectores con salarios elevados', 'La hostelería arrastra hacia abajo el promedio de los sueldos en España', 'La actividad turística reduce la media de los salarios']],
  ['nominal-wages', ['Los salarios españoles son más bajos que los europeos', 'El sueldo ha bajado durante años', 'Las remuneraciones aumentan en España']],
  ['rural-urban-service-access', ['La España rural tiene vivienda más barata, pero peor acceso a empleo, sanidad, educación y transporte', 'En los pueblos cuesta menos la vivienda, aunque quienes viven allí tienen menos acceso a servicios y trabajo que en las ciudades', 'La población rural tiene peor acceso a vivienda, salud y transporte que la población urbana']],
];
for (const [family, paraphrases] of cases) for (const claim of paraphrases) {
  assert.equal(claimFocusFor(claim)?.id, family, claim);
  assert.equal(broadDomainPacketsFor(claim).length, 0, `A precise claim inherited a broad packet: ${claim}`);
}
assert.deepEqual([...focusedMetricIdsFor('El IPC general no refleja bien lo que notan los hogares que gastan mucho en comida y alquiler')].sort(), [
  'annual_hicp_actual_rent_index', 'annual_hicp_food_index', 'annual_hicp_index',
], 'A household basket comparison must retrieve the general, food, and actual-rent HICP indices');
assert.deepEqual([...focusedMetricIdsFor('La cesta de la compra ha subido más de lo que percibe quien mira solo el IPC general')].sort(), [
  'annual_hicp_food_index', 'annual_hicp_index',
], 'A food-basket comparison must retrieve the general and food HICP indices without requesting unrelated rent data');
for (const nearby of [
  'El IPC no refleja el precio de comprar una vivienda y comida',
  'Los hogares con hipoteca sufren más por la subida de alimentos y vivienda',
  'La cesta de la compra subió, aunque no se menciona el alquiler ni la vivienda',
  'El IPC general no refleja cuánto subió el aceite de oliva',
  'El precio de la vivienda y los alimentos dificulta pagar la hipoteca',
]) assert.notEqual(claimFocusFor(nearby)?.id, 'household-inflation-basket', `A nearby claim crossed into household inflation basket evidence: ${nearby}`);
const localSafetyParaphrases = [
  'En mi barrio ha subido la inseguridad este mes',
  'La delincuencia ha empeorado en mi calle estas semanas',
  'En la zona hay cada vez más robos',
  'En mi municipio han aumentado los hurtos este trimestre',
];
const localSafetyPlan = focusedEvidencePlan(localSafetyParaphrases[0], { now: Date.parse('2026-11-17') });
assert.equal(localSafetyPlan.answerScope.family, 'local-safety-trend');
assert.equal(localSafetyPlan.claimType, 'trend');
assert.ok(validateAnswerPlan(localSafetyPlan).ok, JSON.stringify(validateAnswerPlan(localSafetyPlan).errors));
assert.deepEqual(localSafetyPlan.answerScope.directMetrics, [], 'Local safety context must not be marked as direct evidence for the claim');
assert.deepEqual(localSafetyPlan.sourceIds, ['interior-criminality-balance-2026-q2', 'ine-neighbourhood-crime-perception-ecv-2023']);
assert.deepEqual(localSafetyPlan.blocks.find((block) => block.type === 'claim_breakdown').items[0].evidenceIds, [], 'National context must not be attributed to an unsupported local trend');
assert.ok(localSafetyPlan.evidenceSummary.families[0].dimensions?.population && localSafetyPlan.evidenceSummary.families[0].dimensions?.denominator);
assert.ok(localSafetyPlan.shareableReply.split(/\s+/).length < 180, 'The local safety answer must explain the gap concisely');
assert.match(localSafetyPlan.shareableReply, /no tasas por habitante/);
assert.match(localSafetyPlan.shareableReply, /porcentaje de población/);
for (const paraphrase of localSafetyParaphrases.slice(1)) {
  const plan = focusedEvidencePlan(paraphrase, { now: Date.parse('2026-11-17') });
  assert.equal(plan.answerScope.family, localSafetyPlan.answerScope.family, `A local safety paraphrase changed evidence family: ${paraphrase}`);
  assert.deepEqual(plan.sourceIds, localSafetyPlan.sourceIds, `A local safety paraphrase changed its evidence sources: ${paraphrase}`);
  assert.deepEqual(plan.blocks.find((block) => block.type === 'claim_breakdown').items[0].evidenceIds, [], `Contextual municipal or survey evidence was used as direct proof: ${paraphrase}`);
}
const localSafetyPublic = localPublicCheckResponse({ status: 'partial', requestId: 'local-safety-focus', result: localSafetyPlan }, localSafetyParaphrases[0]);
assert.equal(localSafetyPublic.state, 'insufficient', 'Sourced context must not settle an unsupported neighborhood trend');
assert.ok(localSafetyPublic.result.reply.includes('dime el municipio') && localSafetyPublic.result.reply.includes('percepción vecinal'));
assert.deepEqual(localSafetyPublic.result.criteria.map((criterion) => criterion.sourceIds), [
  ['interior-criminality-balance-2026-q2'],
  ['ine-neighbourhood-crime-perception-ecv-2023'],
], 'Each contextual source must be attributed only to the fact it supports');
const localSafetyProcessing = localPublicCheckResponse({ status: 'processing', requestId: 'local-safety-processing' }, localSafetyParaphrases[0]);
assert.equal(localSafetyProcessing.state, 'processing');
assert.equal(localSafetyProcessing.preview.state, 'insufficient', 'An in-progress resolver should show the same evidence-honest provisional result');
assert.deepEqual(localSafetyProcessing.preview.result.sources.map((source) => source.id), localSafetyPlan.sourceIds);
const nationalSafetyNeighbor = 'En España ha subido la criminalidad registrada este año';
assert.equal(claimFocusFor(nationalSafetyNeighbor), undefined, 'A national crime trend must not be routed through the local measurement family');
assert.deepEqual(broadDomainPacketsFor(nationalSafetyNeighbor).map((packet) => packet.id), ['broad-security']);
const migrationSafetyNeighbor = 'La llegada de inmigrantes ha provocado más robos en mi barrio';
assert.notEqual(claimFocusFor(migrationSafetyNeighbor)?.id, 'local-safety-trend', 'A migration-causality claim must not inherit the local safety route');
assert.deepEqual(broadDomainPacketsFor(migrationSafetyNeighbor).map((packet) => packet.id), ['broad-immigration-security']);
assert.equal(claimFocusFor('La Seguridad Social ha subido en mi ciudad este mes'), undefined, 'Social Security is an institution, not a local crime trend');
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
assert.notEqual(claimFocusFor('La FP sigue teniendo un estigma social pese a tener buenas salidas laborales')?.id,
  'education-employment-outcomes', 'A social-perception claim must not be reduced to its employment-prospects clause');
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
assert.notEqual(claimFocusFor('El precio del alquiler subió en España durante 2025')?.id, 'housing-construction-pressure', 'A rent-price trend must not inherit the new-home supply context');
assert.notEqual(claimFocusFor('El turismo eleva los alquileres en las ciudades')?.id, 'housing-construction-pressure', 'A general tourism and rent claim must not inherit the new-home supply context');
assert.equal(claimFocusFor('Se construye demasiado poco por la lentitud de las licencias urbanísticas')?.id, undefined, 'An unspecified construction claim must not be assumed to concern residential homes');
assert.equal(claimFocusFor('La falta de vivienda nueva en Madrid explica la subida del alquiler')?.id, 'housing-construction-pressure', 'A local supply claim must retain its family while national evidence is withheld by scope');
const housingCompletionPlan = focusedEvidencePlan('¿Cuántas viviendas nuevas se terminaron en España en 2025?', { now: Date.parse('2026-11-23') });
assert.equal(housingCompletionPlan.answerScope.family, 'housing-completions');
assert.equal(housingCompletionPlan.claimType, 'descriptive');
assert.equal(housingCompletionPlan.evidenceLevel, 'limited');
assert.equal(housingCompletionPlan.blocks.find((block) => block.type === 'claim_breakdown').items[0].verdict, 'supported', 'Directly measured national completion counts must answer the stated measurement rather than imply that the fact is unverified');
assert.match(housingCompletionPlan.shareableReply, /92\.000.*2025/);
assert.ok(housingCompletionPlan.sourceIds.includes('bde-housing-supply-2025'));
const housingCompletionStatement = focusedEvidencePlan('En 2025 se acabaron 92.000 viviendas nuevas en España', { now: Date.parse('2026-11-23') });
assert.equal(housingCompletionStatement.answerScope.family, 'housing-completions', 'A completed-homes statement must reuse the reviewed count family');
assert.equal(housingCompletionStatement.blocks.find((block) => block.type === 'claim_breakdown').items[0].verdict, 'supported');
assert.match(housingCompletionStatement.shareableReply, /92\.000.*2025/);
const housingCompletionOldPeriod = focusedEvidencePlan('¿Cuántas viviendas nuevas se terminaron en España en 2024?', { now: Date.parse('2026-11-23') });
assert.equal(housingCompletionOldPeriod.evidenceLevel, 'insufficient', 'The 2025 snapshot must not answer a different year');
assert.deepEqual(housingCompletionOldPeriod.sourceIds, []);
const housingCompletionLocal = focusedEvidencePlan('¿Cuántas viviendas nuevas se terminaron en Madrid en 2025?', { now: Date.parse('2026-11-23') });
assert.equal(housingCompletionLocal.evidenceLevel, 'insufficient', 'A national completion count must not answer a city-level question');
assert.deepEqual(housingCompletionLocal.sourceIds, []);
const housingPressurePlan = focusedEvidencePlan('La falta de vivienda nueva explica buena parte de la subida del alquiler', { now: Date.parse('2026-11-23') });
assert.equal(housingPressurePlan.answerScope.family, 'housing-construction-pressure');
assert.equal(housingPressurePlan.claimType, 'causal');
assert.equal(housingPressurePlan.evidenceLevel, 'limited');
assert.deepEqual([...focusedMetricIdsFor('La falta de vivienda nueva explica buena parte de la subida del alquiler')], ['rental_price_index']);
assert.deepEqual(housingPressurePlan.answerScope.directMetrics, [], 'The rent index is context and cannot establish construction-caused price changes');
assert.deepEqual(housingPressurePlan.answerScope.contextMetrics, ['rental_price_index']);
assert.ok(housingPressurePlan.shareableReply.includes('240.000 hogares netos nuevos'));
assert.ok(housingPressurePlan.shareableReply.includes('750.000 viviendas'));
assert.ok(housingPressurePlan.shareableReply.includes('no demuestra'));
assert.ok(housingPressurePlan.evidenceSummary.families.every((family) => family.dataKind === 'context'));
assert.ok(housingPressurePlan.sourceIds.includes('bde-housing-supply-2025'));
assert.deepEqual([...focusedMetricIdsFor('La lentitud de las licencias urbanísticas retrasa la construcción de viviendas nuevas')], [], 'A construction delay without an explicit rent claim must not inherit a rent metric');
const housingPressureParaphrasePlan = focusedEvidencePlan('La escasez de nuevas viviendas presiona los alquileres porque la oferta no sigue el crecimiento de los hogares', { now: Date.parse('2026-11-23') });
assert.equal(housingPressureParaphrasePlan.answerScope.family, 'housing-construction-pressure');
assert.equal(housingPressureParaphrasePlan.claimType, 'causal');
assert.deepEqual(housingPressureParaphrasePlan.sourceIds, housingPressurePlan.sourceIds);
const housingPressureLocal = focusedEvidencePlan('La falta de vivienda nueva en Madrid explica la subida del alquiler', { now: Date.parse('2026-11-23') });
assert.equal(housingPressureLocal.evidenceLevel, 'insufficient', 'National context must not be shown as a Madrid measurement');
assert.deepEqual(housingPressureLocal.sourceIds, []);
const housingPressureOldPeriod = focusedEvidencePlan('La falta de vivienda nueva explica la subida del alquiler entre 2022 y 2024', { now: Date.parse('2026-11-23') });
assert.equal(housingPressureOldPeriod.evidenceLevel, 'insufficient', 'The current snapshot must not be attached to an unsupported period');
assert.deepEqual(housingPressureOldPeriod.sourceIds, []);
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
for (const claim of [
  'Tener un máster o un doctorado no garantiza cobrar un salario acorde con la cualificación',
  'Una titulación de posgrado no asegura un sueldo proporcional a la formación',
  'El coste de vivienda ha eliminado la ventaja salarial de trabajar en Madrid o Barcelona',
  'El alquiler borra la prima salarial de vivir en Madrid',
]) {
  const plan = focusedEvidencePlan(claim, { observations: [irrelevantWageObservation], propositions: deterministicFallbackCompiler(claim).explicitPropositions });
  assert.ok(['education-pay-comparison', 'regional-wage-housing-cost'].includes(plan.answerScope.family), `The claim lost its scoped measurement route: ${claim}`);
  assert.deepEqual(plan.answerScope.directMetrics, [], `National wage data became direct evidence for a comparison: ${claim}`);
  assert.deepEqual(plan.answerScope.contextMetrics, [], `National wage data became context for an unsupported comparison: ${claim}`);
  assert.equal(plan.evidenceLevel, 'insufficient', `An unrelated salary observation should not resolve this claim: ${claim}`);
  assert.deepEqual(plan.sourceLinks, [], `An unrelated wage survey was attached to this claim: ${claim}`);
  assert.equal(localPublicCheckResponse({ status: 'complete', requestId: 'scoped-pay-gap', result: plan }, claim).state, 'insufficient');
}
assert.equal(claimFocusFor('La vivienda de Barcelona es cara y los salarios suben'), undefined, 'Housing and rising wages in the same city do not establish a wage-versus-housing comparison');
assert.equal(claimFocusFor('Un título universitario ya no garantiza encontrar un empleo cualificado')?.id, 'education-employment-outcomes', 'A graduate employment claim must not cross-route into pay comparisons');
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
assert.match(cityRentAffordability.limitation, /hogares que ya alquilaban/);
assert.ok(cityRentAffordability.shareableReply.trim().split(/\s+/).length <= 160, 'Rental-affordability context should be concise enough to read and share');
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
assert.deepEqual([...focusedMetricIdsFor('Trabajar a jornada parcial y estar en riesgo de pobreza')].filter((id) => id.includes('poverty')), ['in_work_poverty_part_time_rate']);
assert.deepEqual([...focusedMetricIdsFor('El empleo parcial también puede implicar riesgo de pobreza')].filter((id) => id.includes('poverty')), ['in_work_poverty_part_time_rate']);
assert.deepEqual([...focusedMetricIdsFor('La tasa de riesgo de pobreza es mayor con jornada parcial que con jornada completa')].filter((id) => id.includes('poverty')),
  ['in_work_poverty_full_time_rate', 'in_work_poverty_part_time_rate']);

const workHousingClaim = 'Tener un trabajo a jornada completa ya no garantiza poder independizarse';
const workHousing = focusedEvidencePlan(workHousingClaim, { observations: [
  { id: 'national-rent-index', metricId: 'rental_price_index', value: 114.78, period: '2025', unit: 'Index 2015=100', geography: 'España', population: 'household consumption of actual rentals for housing', source: { id: 'rent-index-source', title: 'Índice de alquileres pagados', url: 'https://example.org/rents' } },
  { id: 'national-house-index', metricId: 'house_price_index', value: 198.4, period: '2025', unit: 'Index 2015=100', geography: 'España', population: 'residential property transactions', source: { id: 'house-index-source', title: 'Índice de precios de vivienda', url: 'https://example.org/housing' } },
] });
assert.equal(workHousing.answerScope.family, 'work-housing-independence');
assert.equal(workHousing.claimType, 'trend', 'The phrase «ya no» asks for a comparison over time');
assert.equal(workHousing.evidenceLevel, 'limited', 'Reviewed youth-housing evidence is useful context but does not isolate full-time workers');
assert.deepEqual(workHousing.answerScope.directMetrics, []);
assert.deepEqual(workHousing.answerScope.contextMetrics, [], 'National price indexes do not measure housing independence among full-time workers');
assert.deepEqual([...focusedMetricIdsFor(workHousingClaim)], []);
assert.deepEqual(workHousing.sourceLinks.map((source) => source.id), ['cje-emancipation-2025', 'cje-emancipation-methodology', 'youth-family-housing-ine']);
assert.match(workHousing.shareableReply, /Como contexto:/);
assert.match(workHousing.shareableReply, /14,5 %.*16[–-]29 a[nñ]os/);
assert.match(workHousing.shareableReply, /44,3 %.*26[–-]34 a[nñ]os.*47,3 %/);
assert.match(workHousing.shareableReply, /no desglosa el dato por jornada laboral/i);
assert.match(workHousing.shareableReply, /no indican si quienes trabajan a jornada completa viven por su cuenta/i);
assert.doesNotMatch(workHousing.shareableReply, /114,78|198,4|114\.78|198\.4/);
assert.ok(workHousing.shareableReply.trim().split(/\s+/).length <= 160, 'The full-time housing answer should be short enough to read and share');
assert.doesNotMatch(workHousing.shareableReply, /temporalidad laboral|tasa de paro/);
const workHousingPublic = localPublicCheckResponse({ status: 'complete', requestId: 'work-housing', result: workHousing }, workHousingClaim);
assert.equal(workHousingPublic.state, 'insufficient', 'Population-level youth context does not establish the missing full-time-worker cross-tab');
assert.equal(workHousingPublic.result.shareableReply, undefined, 'Context-only evidence must not leave a copyable full-claim verdict');
assert.match(workHousingPublic.result.reply, /La evidencia no basta para confirmar toda la afirmaci[oó]n/i);
assert.ok(workHousingPublic.result.sources.some((source) => source.id === 'cje-emancipation-2025'));
assert.ok(workHousingPublic.result.sources.some((source) => source.id === 'youth-family-housing-ine'));
const workHousingParaphrases = [
  'Un empleo a tiempo completo no basta para emanciparse',
  'Trabajar a jornada completa no permite vivir de forma independiente',
];
for (const paraphrase of workHousingParaphrases) {
  const answer = focusedEvidencePlan(paraphrase);
  assert.equal(answer.answerScope.family, 'work-housing-independence', `A full-time housing paraphrase changed family: ${paraphrase}`);
  assert.equal(answer.claimType, 'descriptive', `A current-state paraphrase was misclassified as a trend: ${paraphrase}`);
  assert.deepEqual(answer.sourceLinks.map((source) => source.id), workHousing.sourceLinks.map((source) => source.id), `A full-time housing paraphrase changed its sources: ${paraphrase}`);
  assert.deepEqual(answer.evidenceSummary.families[0].data, workHousing.evidenceSummary.families[0].data, `A full-time housing paraphrase changed its facts: ${paraphrase}`);
}
assert.equal(claimFocusFor('Trabajar a jornada completa y ser pobre')?.id, 'working-poverty', 'A nearby full-time poverty claim must retain its separate measure');
assert.equal(claimFocusFor('El alquiler se come más de la mitad del sueldo de muchos jóvenes')?.id, 'rental-affordability', 'A nearby youth rent-burden claim must not inherit the full-time independence evidence');
assert.ok(!focusedEvidencePlan('El alquiler se come más de la mitad del sueldo de muchos jóvenes')?.sourceLinks.some((source) => ['cje-emancipation-methodology', 'youth-family-housing-ine'].includes(source.id)), 'Youth rent burden inherited the separate full-time independence context');

const foreignHousingClaim = 'Las compras de vivienda por extranjeros no residentes están encareciendo el mercado en zonas costeras';
const foreignHousing = focusedEvidencePlan(foreignHousingClaim, { observations: [
  { id: 'foreign-born-population', metricId: 'immigrant_population', value: 9460000, period: '2025', unit: 'persons', geography: 'España', source: { id: 'migration-stock-source', title: 'Población nacida en el extranjero', url: 'https://example.org/migration' } },
  { id: 'national-house-index', metricId: 'house_price_index', value: 198.4, period: '2025', unit: 'Index 2015=100', geography: 'España', source: { id: 'house-index-source', title: 'Índice de precios de vivienda', url: 'https://example.org/housing' } },
] });
assert.equal(foreignHousing.answerScope.family, 'foreign-housing-price-causality');
assert.equal(foreignHousing.claimType, 'causal');
assert.equal(foreignHousing.evidenceLevel, 'limited', 'The registry report supplies context but does not measure the claim’s causal effect');
assert.equal(foreignHousing.interpretation.kind, 'causal');
assert.equal(foreignHousing.blocks.find((block) => block.type === 'claim_breakdown').items[0].type, 'causal');
assert.deepEqual(foreignHousing.sourceLinks.map((source) => source.id), ['registradores-eri-2026-q3-foreign-purchases']);
assert.match(foreignHousing.shareableReply, /16,05 %/);
assert.match(foreignHousing.shareableReply, /en Alicante fue el 46,46 %/);
assert.match(foreignHousing.shareableReply, /la residencia no consta en la escritura, no puede separar/);
assert.match(foreignHousing.shareableReply, /no estima el efecto de esas compras en los precios locales/);
assert.equal(focusedMetricIdsFor(foreignHousingClaim).size, 0, 'A local causal claim must not retrieve national demographic counts as supporting evidence');
assert.match(foreignHousing.shareableReply, /no a personas no residentes/);
assert.match(foreignHousing.shareableReply, /comparaci[oó]n causal/);
assert.equal(localPublicCheckResponse({ status: 'complete', requestId: 'foreign-housing', result: foreignHousing }, foreignHousingClaim).state, 'insufficient');
for (const paraphrase of [
  'Los compradores extranjeros están haciendo subir los precios de la vivienda en la costa',
  'Las operaciones de compradores de otras nacionalidades encarecen las casas en zonas costeras',
]) {
  const answer = focusedEvidencePlan(paraphrase);
  assert.equal(answer.answerScope.family, 'foreign-housing-price-causality', `A foreign-purchase paraphrase changed family: ${paraphrase}`);
  assert.equal(answer.evidenceLevel, 'limited', `A foreign-purchase paraphrase lost its evidence boundary: ${paraphrase}`);
  assert.deepEqual(answer.sourceLinks.map((source) => source.id), foreignHousing.sourceLinks.map((source) => source.id), `A foreign-purchase paraphrase changed sources: ${paraphrase}`);
  assert.deepEqual(answer.evidenceSummary.families[0].data, foreignHousing.evidenceSummary.families[0].data, `A foreign-purchase paraphrase changed facts: ${paraphrase}`);
  assert.equal(localPublicCheckResponse({ status: 'complete', requestId: 'foreign-housing-paraphrase', result: answer }, paraphrase).state, 'insufficient');
}
assert.notEqual(claimFocusFor('¿Qué porcentaje de compraventas de vivienda corresponde a compradores de nacionalidad extranjera?')?.id, 'foreign-housing-price-causality', 'A descriptive buyer-nationality query must not be routed as a causal price claim');
assert.notEqual(claimFocusFor('Las viviendas vacacionales de la costa encarecen el alquiler residencial')?.id, 'foreign-housing-price-causality', 'Tourist-housing claims must not inherit foreign-buyer evidence');
const migrationHousing = focusedEvidencePlan('La inmigración está haciendo que suban los alquileres en algunas ciudades');
assert.equal(migrationHousing.answerScope.family, 'migration-housing-demand-causality');
assert.equal(migrationHousing.claimType, 'causal');
assert.equal(migrationHousing.sourceLinks.length, 0, 'National migration counts must not stand in for local housing-demand evidence');
assert.match(migrationHousing.shareableReply, /cambios de poblaci[oó]n residente y flujos migratorios/);

const unemploymentWageClaim = 'El paro estructural permite a las empresas ofrecer salarios bajos porque siempre hay candidatos';
const unemploymentWageAnswer = focusedEvidencePlan(unemploymentWageClaim);
assert.equal(unemploymentWageAnswer.answerScope.family, 'unemployment-wage-pressure');
assert.equal(unemploymentWageAnswer.claimType, 'causal');
assert.equal(unemploymentWageAnswer.evidenceLevel, 'limited', 'Historical studies provide context, not direct evidence about current structural unemployment');
assert.deepEqual(unemploymentWageAnswer.sourceLinks.map((source) => source.id), ['bde-wp-2036-unemployment-wage-setting', 'bde-wp-1504-real-wage-cyclicality']);
assert.deepEqual(unemploymentWageAnswer.answerScope.directMetrics, []);
assert.match(unemploymentWageAnswer.shareableReply, /trabajadores del metal en Espa[ñn]a e Italia \(2005–2013\)/);
assert.match(unemploymentWageAnswer.shareableReply, /historiales laborales administrativos de Espa[ñn]a \(1987–2013\)/);
assert.match(unemploymentWageAnswer.shareableReply, /no miden el desempleo estructural actual/);
assert.ok(unemploymentWageAnswer.shareableReply.trim().split(/\s+/).length <= 160, 'The unemployment/wage explanation must stay digestible while preserving scope and limits');
assert.ok(unemploymentWageAnswer.blocks.some((block) => block.type === 'evidence_gap' && block.missing.some((item) => /desempleo local y salarios comparables/.test(item))));
assert.equal(localPublicCheckResponse({ status: 'complete', requestId: 'unemployment-wage', result: unemploymentWageAnswer }, unemploymentWageClaim).state, 'insufficient', 'Contextual studies must not turn the universal causal claim into a confirmed public verdict');
for (const paraphrase of [
  'El desempleo elevado debilita la negociación salarial y presiona los sueldos a la baja',
  'Cuando abundan los candidatos, las empresas pueden contener los salarios',
  'Con mucho paro, los empleadores pueden frenar las subidas de sueldo',
]) {
  const answer = focusedEvidencePlan(paraphrase);
  assert.equal(answer.answerScope.family, 'unemployment-wage-pressure', `An unemployment/wages paraphrase changed family: ${paraphrase}`);
  assert.equal(answer.evidenceLevel, 'limited', `An unemployment/wages paraphrase lost its context evidence: ${paraphrase}`);
  assert.deepEqual(answer.sourceLinks.map((source) => source.id), unemploymentWageAnswer.sourceLinks.map((source) => source.id), `An unemployment/wages paraphrase changed sources: ${paraphrase}`);
  assert.deepEqual(answer.evidenceSummary.families[0].data, unemploymentWageAnswer.evidenceSummary.families[0].data, `An unemployment/wages paraphrase changed facts: ${paraphrase}`);
  assert.ok(answer.shareableReply.trim().split(/\s+/).length <= 160, `An unemployment/wages paraphrase exceeded the digestible answer length: ${paraphrase}`);
  assert.equal(localPublicCheckResponse({ status: 'complete', requestId: 'unemployment-wage-paraphrase', result: answer }, paraphrase).state, 'insufficient');
}
assert.notEqual(claimFocusFor('¿Cuál es la tasa de paro estructural en España?')?.id, 'unemployment-wage-pressure', 'A direct unemployment-rate question must not be interpreted as a wage mechanism');
assert.equal(claimFocusFor('La inmigración de trabajadores de baja cualificación presiona a la baja los salarios de algunos sectores')?.id, 'migration-wage-effects', 'Migration-specific wage claims must retain their distinct evidence contract');
assert.equal(claimFocusFor('Para el mismo perfil profesional las empresas pagan salarios más bajos')?.id, 'matched-pay', 'Matched-profile wage claims without an unemployment mechanism must keep their own route');
assert.equal(claimFocusFor('Los salarios pierden poder adquisitivo frente al coste de la vida')?.id, 'real-wages', 'Real-wage claims must not inherit unemployment/wage-bargaining context');

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
assert.match(futurePension.shareableReply, /modelo de AIReF.*por cohorte/s);
assert.match(futurePension.shareableReply, /no predice la pensi[oó]n ni la tasa de sustituci[oó]n de una persona/);
assert.match(futurePension.shareableReply, /cohorte de nacimiento/);
assert.ok(futurePension.shareableReply.trim().split(/\s+/).length <= 160, 'Future-pension context should be concise enough to read and share');
assert.ok(futurePension.evidenceSummary.missingDimensions.some((item) => /cotizaciones y prestaciones futuras para la misma cohorte/.test(item)), 'A lifetime pay-in/pay-out claim must require contributions and benefits for a matched cohort');
const futurePensionAmount = focusedEvidencePlan('¿Qué pensión recibirán en el futuro quienes cotizan hoy?');
assert.ok(!futurePensionAmount.evidenceSummary.missingDimensions.some((item) => /cotizaciones y prestaciones futuras para la misma cohorte/.test(item)), 'A future-benefit question alone must not inherit a lifetime funding comparison');
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
assert.doesNotMatch(graduateMatch.shareableReply, /no compara dos periodos/, 'A rhetorical claim that a degree no longer guarantees work is not itself a time-series claim');
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
const educationOutcomeObservations = [
  { id: 'tertiary-employment-2025', metricId: 'employment_rate_tertiary_education', value: 83.2, period: '2025', unit: 'Percentage', geography: 'España', population: 'residents aged 20 to 64 with tertiary education', dimensions: { geo: 'ES', age: 'Y20-64', isced11: 'ED5-8' }, status: 'd', freshness: 'fresh', source: employmentSource },
  { id: 'tertiary-overqualification-2025', metricId: 'tertiary_overqualification_rate', value: 34, period: '2025', unit: 'Percentage', geography: 'España', population: 'employed residents aged 20 to 64 with tertiary education', dimensions: { geo: 'ES', age: 'Y20-64' }, status: 'd', freshness: 'fresh', source: overqualificationSource },
];
const tertiaryEmploymentAbove80 = focusedEvidencePlan('La tasa de empleo de las personas con estudios universitarios superó el 80 % en 2025', { observations: educationOutcomeObservations });
assert.equal(tertiaryEmploymentAbove80.blocks.find((block) => block.type === 'claim_breakdown').items[0].verdict, 'supported', 'A measured employment rate above the submitted threshold must be assessed against the same population and year');
assert.match(tertiaryEmploymentAbove80.shareableReply, /83,2 %.*20 a 64 a[nñ]os.*2025/);
const tertiaryEmploymentBelow80 = focusedEvidencePlan('La tasa de empleo de las personas con estudios universitarios no llegó al 80 % en 2025', { observations: educationOutcomeObservations });
assert.equal(tertiaryEmploymentBelow80.blocks.find((block) => block.type === 'claim_breakdown').items[0].verdict, 'contradicted', 'A directly measured rate above 80% must contradict a claim that it did not reach 80%');
assert.match(tertiaryEmploymentBelow80.shareableReply, /83,2 %/);
assert.doesNotMatch(tertiaryEmploymentBelow80.shareableReply, /La evidencia no basta para confirmar toda la afirmaci[oó]n/);
const exactThresholdObservations = educationOutcomeObservations.map((item) => item.metricId === 'employment_rate_tertiary_education' ? { ...item, value: 80 } : item);
const strictThresholdClaim = focusedEvidencePlan('La tasa de empleo de las personas con estudios universitarios superó el 80 % en 2025', { observations: exactThresholdObservations });
assert.equal(strictThresholdClaim.blocks.find((block) => block.type === 'claim_breakdown').items[0].verdict, 'contradicted', 'Strictly exceeding a threshold must not accept an exact match');
const inclusiveThresholdClaim = focusedEvidencePlan('La tasa de empleo de las personas con estudios universitarios fue al menos el 80 % en 2025', { observations: exactThresholdObservations });
assert.equal(inclusiveThresholdClaim.blocks.find((block) => block.type === 'claim_breakdown').items[0].verdict, 'supported', 'An inclusive lower bound accepts an exact match');
const maximumThresholdClaim = focusedEvidencePlan('La tasa de empleo de las personas con estudios universitarios no superó el 80 % en 2025', { observations: exactThresholdObservations });
assert.equal(maximumThresholdClaim.blocks.find((block) => block.type === 'claim_breakdown').items[0].verdict, 'supported', 'An inclusive upper bound accepts an exact match');
const strictMaximumThresholdClaim = focusedEvidencePlan('La tasa de empleo de las personas con estudios universitarios no llegó al 80 % en 2025', { observations: exactThresholdObservations });
assert.equal(strictMaximumThresholdClaim.blocks.find((block) => block.type === 'claim_breakdown').items[0].verdict, 'contradicted', 'Failing to reach a threshold is strict and excludes an exact match');
const partTimePovertyOver15 = focusedEvidencePlan('En 2025 el riesgo de pobreza entre las personas ocupadas a jornada parcial superó el 15 %', { observations: WORKING_POVERTY_SNAPSHOT.observations, now: Date.parse('2026-11-23') });
assert.equal(partTimePovertyOver15.blocks.find((block) => block.type === 'claim_breakdown').items[0].verdict, 'supported', 'A directly measured in-work poverty rate above its threshold should be assessed outside the education family too');
assert.match(partTimePovertyOver15.shareableReply, /El dato \(18,6 %\) supera el umbral de 15 %; respalda esa parte/);
const partTimePovertyBelow15 = focusedEvidencePlan('En 2025 el riesgo de pobreza entre las personas ocupadas a jornada parcial no llegó al 15 %', { observations: WORKING_POVERTY_SNAPSHOT.observations, now: Date.parse('2026-11-23') });
assert.equal(partTimePovertyBelow15.blocks.find((block) => block.type === 'claim_breakdown').items[0].verdict, 'contradicted');
assert.match(partTimePovertyBelow15.shareableReply, /El dato \(18,6 %\) supera el umbral de 15 %; contradice esa parte/);
const causalThresholdNeighbour = focusedEvidencePlan('En 2025 el riesgo de pobreza entre las personas ocupadas a jornada parcial superó el 15 % porque la jornada parcial causa pobreza', { observations: WORKING_POVERTY_SNAPSHOT.observations, now: Date.parse('2026-11-23') });
assert.equal(causalThresholdNeighbour.blocks.find((block) => block.type === 'claim_breakdown').items[0].verdict, 'mixed', 'A measured rate must not verify a causal explanation added to the threshold claim');
assert.doesNotMatch(causalThresholdNeighbour.shareableReply, /El dato \(18,6 %\).*umbral de 15 %/);
const primaryCareDelayAbove7 = focusedEvidencePlan('La demora media para conseguir cita con el médico de familia superó los 7 días en la segunda oleada de 2026', { observations: PRIMARY_CARE_WAIT_SNAPSHOT.observations, now: Date.parse('2026-11-23') });
assert.deepEqual([...focusedMetricIdsFor('Más del 70 % de pacientes de atención primaria esperó más de un día por falta de cita en la segunda oleada de 2026')], ['primary_care_wait_over_one_day_rate'], 'A percent claim should select the respondent rate, not the delay length used to define its threshold');
assert.equal(primaryCareDelayAbove7.blocks.find((block) => block.type === 'claim_breakdown').items[0].verdict, 'supported', 'A direct day-valued observation should be compared only with a day-valued threshold');
assert.match(primaryCareDelayAbove7.shareableReply, /9,71 días.*supera el umbral de 7 días; respalda esa parte/s);
const primaryCareDelayBelow7 = focusedEvidencePlan('La demora media para conseguir cita con el médico de familia no llegó a los 7 días en la segunda oleada de 2026', { observations: PRIMARY_CARE_WAIT_SNAPSHOT.observations, now: Date.parse('2026-11-23') });
assert.equal(primaryCareDelayBelow7.blocks.find((block) => block.type === 'claim_breakdown').items[0].verdict, 'contradicted');
assert.match(primaryCareDelayBelow7.shareableReply, /9,71 días.*supera el umbral de 7 días; contradice esa parte/s);
const primaryCareRateAbove70 = focusedEvidencePlan('Más del 70 % de pacientes de atención primaria esperó más de un día por falta de cita en la segunda oleada de 2026', { observations: PRIMARY_CARE_WAIT_SNAPSHOT.observations, now: Date.parse('2026-11-23') });
assert.equal(primaryCareRateAbove70.blocks.find((block) => block.type === 'claim_breakdown').items[0].verdict, 'supported', 'The percentage threshold must select the percentage observation when the answer also includes a day-valued context measure');
assert.match(primaryCareRateAbove70.shareableReply, /El dato \(72 %\) supera el umbral de 70 %; respalda esa parte/);
const primaryCareRateNumericDayParaphrase = 'Más del 70 % de pacientes de atención primaria esperó más de 1 día por falta de cita en la segunda oleada de 2026';
assert.deepEqual([...focusedMetricIdsFor(primaryCareRateNumericDayParaphrase)], ['primary_care_wait_over_one_day_rate'], 'A numeric spelling of the one-day measure definition should select the same rate as its word-form paraphrase');
const primaryCareRateAbove70NumericDay = focusedEvidencePlan(primaryCareRateNumericDayParaphrase, { observations: PRIMARY_CARE_WAIT_SNAPSHOT.observations, now: Date.parse('2026-11-23') });
assert.equal(primaryCareRateAbove70NumericDay.blocks.find((block) => block.type === 'claim_breakdown').items[0].verdict, 'supported');
assert.match(primaryCareRateAbove70NumericDay.shareableReply, /El dato \(72 %\) supera el umbral de 70 %; respalda esa parte/);
const primaryCareRateAbove70WrongDayDefinition = focusedEvidencePlan('Más del 70 % de pacientes de atención primaria esperó más de 10 días por falta de cita en la segunda oleada de 2026', { observations: PRIMARY_CARE_WAIT_SNAPSHOT.observations, now: Date.parse('2026-11-23') });
assert.equal(primaryCareRateAbove70WrongDayDefinition.blocks.find((block) => block.type === 'claim_breakdown').items[0].verdict, 'insufficient', 'The one-day rate must not verify the share waiting more than ten days');
assert.doesNotMatch(primaryCareRateAbove70WrongDayDefinition.shareableReply, /supera el umbral de 70 %/);
const primaryCareWaitDaysWithoutMean = focusedEvidencePlan('La espera en atención primaria superó los 10 días en la segunda oleada de 2026', { observations: PRIMARY_CARE_WAIT_SNAPSHOT.observations, now: Date.parse('2026-11-23') });
assert.equal(primaryCareWaitDaysWithoutMean.blocks.find((block) => block.type === 'claim_breakdown').items[0].verdict, 'insufficient', 'An average duration must not verify an unspecific claim about how long patients waited');
const educationOutcomeGapFamilies = [
  {
    claims: [
      'Cada vez se exige un máster para trabajos que antes pedían solo una carrera',
      'Cada vez más ofertas piden un máster para puestos que antes solicitaban solo un grado universitario',
    ],
    missing: /anuncios de las mismas ocupaciones en periodos comparables/,
    limitation: /no muestran qu[eé] titulaci[oó]n piden las ofertas/,
  },
  {
    claims: [
      'La Formación Profesional permite entrar antes al mercado laboral que muchas carreras',
      'Los titulados de FP consiguen su primer empleo antes que quienes estudian una carrera',
    ],
    missing: /tiempo desde terminar FP o universidad hasta el primer empleo/,
    limitation: /no indica cu[aá]nto tardan las personas tituladas en encontrar su primer trabajo/,
  },
  {
    claims: [
      'La FP tiene más salidas laborales que la universidad',
      'En comparación con la universidad, la FP ofrece más posibilidades de empleo',
    ],
    missing: /tasas de empleo de los grupos de titulaciones comparados/,
    limitation: /no compara por s[ií] sola los grupos que menciona la afirmaci[oó]n/,
  },
];
for (const family of educationOutcomeGapFamilies) {
  let referenceMissing;
  for (const claim of family.claims) {
    const plan = focusedEvidencePlan(claim, { observations: educationOutcomeObservations });
    assert.equal(plan.answerScope.family, 'education-employment-outcomes', claim);
    assert.equal(plan.evidenceLevel, 'insufficient', claim);
    assert.equal(plan.sourceLinks.length, 0, claim);
    assert.ok(plan.evidenceSummary.missingDimensions.some((item) => family.missing.test(item)), claim);
    assert.match(plan.shareableReply, family.limitation, claim);
    assert.doesNotMatch(plan.shareableReply, /83,2 %|34 %/, claim);
    if (referenceMissing) assert.deepEqual(plan.evidenceSummary.missingDimensions, referenceMissing, `A paraphrase changed the missing evidence: ${claim}`);
    referenceMissing ||= plan.evidenceSummary.missingDimensions;
  }
}
const educationTrendWithoutSeries = focusedEvidencePlan('La tasa de empleo de titulados ha subido entre 2015 y 2025', { observations: [
  { id: 'tertiary-employment-2025', metricId: 'employment_rate_tertiary_education', value: 83.2, period: '2025', unit: 'Percentage', geography: 'España', population: 'residents aged 20 to 64 with tertiary education', dimensions: { geo: 'ES', age: 'Y20-64', isced11: 'ED5-8' }, status: 'd', freshness: 'fresh', source: employmentSource },
] });
assert.equal(educationTrendWithoutSeries.blocks.find((block) => block.type === 'claim_breakdown').items[0].verdict, 'insufficient');
assert.match(educationTrendWithoutSeries.shareableReply, /muestra el dato m[aá]s reciente \(2025\); no compara dos periodos/);
assert.doesNotMatch(educationTrendWithoutSeries.headline, /subi[oó]|aument[oó]|baj[oó]/i);
const educationTrendWithBreak = focusedEvidencePlan('La tasa de empleo de titulados ha subido entre 2019 y 2025', { observations: [
  { id: 'tertiary-employment-2019', metricId: 'employment_rate_tertiary_education', value: 80, period: '2019', unit: 'Percentage', geography: 'España', dimensions: { geo: 'ES', age: 'Y20-64', isced11: 'ED5-8' }, source: employmentSource },
  { id: 'tertiary-employment-2021', metricId: 'employment_rate_tertiary_education', value: 78, period: '2021', unit: 'Percentage', geography: 'España', dimensions: { geo: 'ES', age: 'Y20-64', isced11: 'ED5-8' }, status: 'bd', source: employmentSource },
  { id: 'tertiary-employment-2025', metricId: 'employment_rate_tertiary_education', value: 83.2, period: '2025', unit: 'Percentage', geography: 'España', dimensions: { geo: 'ES', age: 'Y20-64', isced11: 'ED5-8' }, status: 'd', source: employmentSource },
] });
assert.equal(educationTrendWithBreak.blocks.find((block) => block.type === 'claim_breakdown').items[0].verdict, 'insufficient');
assert.match(educationTrendWithBreak.shareableReply, /ruptura de serie en 2021/);
assert.match(educationTrendWithBreak.shareableReply, /no compara dos periodos/);
assert.doesNotMatch(educationTrendWithBreak.headline, /subi[oó]|aument[oó]|baj[oó]/i);
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
  assert.match(answer.limitation, /no establece un umbral de espera excesiva ni sus causas/);
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
const specialistNamedRegionComparisons = [
  { claim: 'La espera media de consultas externas fue mayor en Canarias que en Melilla en 2025', verdict: 'supported', values: ['162 días en Canarias', '16 días en Melilla'] },
  { claim: 'En consultas externas se espera más en Canarias que en Melilla', verdict: 'supported', values: ['162 días en Canarias', '16 días en Melilla'] },
  { claim: 'La espera media de consultas externas fue mayor en Melilla que en Canarias en 2025', verdict: 'contradicted', values: ['16 días en Melilla', '162 días en Canarias'] },
  { claim: 'La espera media de consultas externas en Melilla no fue mayor que en Canarias en 2025', verdict: 'supported', values: ['16 días en Melilla', '162 días en Canarias'] },
  { claim: 'La espera media de consultas externas en Canarias no fue mayor que en Melilla en 2025', verdict: 'contradicted', values: ['162 días en Canarias', '16 días en Melilla'] },
  { claim: 'La espera de especialistas fue más larga en Islas Canarias que en Comunidad de Madrid', verdict: 'supported', values: ['162 días en Canarias', '68 días en la Comunidad de Madrid'] },
];
for (const { claim, verdict, values } of specialistNamedRegionComparisons) {
  const answer = focusedEvidencePlan(claim);
  assert.equal(answer.answerScope.family, 'specialist-outpatient-regional-waits', `A named-region comparison lost its evidence family: ${claim}`);
  assert.equal(answer.evidenceLevel, 'limited');
  assert.equal(answer.blocks.find((block) => block.type === 'claim_breakdown').items[0].verdict, verdict, `A named-region comparison has the wrong verdict: ${claim}`);
  assert.match(answer.headline, /162 d[ií]as en (?:Canarias|Madrid)/);
  for (const value of values) assert.ok(answer.shareableReply.includes(value), `A named-region answer omitted ${value}: ${claim}`);
  assert.match(answer.shareableReply, /31 de diciembre de 2025/);
  assert.match(answer.shareableReply, /diez especialidades/);
  assert.match(answer.shareableReply, /informaci[oó]n remitida por cada comunidad aut[oó]noma/);
  assert.ok(answer.sourceLinks.some((source) => source.id === 'sisle-sns-regional-consultations-dec-2025'));
  assert.equal((answer.shareableReply.match(/A 31 de diciembre de 2025/g) || []).length, 1, 'A contradiction must not repeat the measured comparison');
}
const specialistOutpatientMeansByRegion = [
  ['Andalucía', 136], ['Aragón', 138], ['Asturias', 103], ['Baleares', 71],
  ['Cantabria', 61], ['Castilla y León', 102], ['Castilla-La Mancha', 64], ['Cataluña', 120],
  ['Comunidad Valenciana', 95], ['Extremadura', 112], ['Galicia', 63], ['la Comunidad de Madrid', 68],
  ['la Región de Murcia', 89], ['Navarra', 152], ['País Vasco', 49], ['La Rioja', 32], ['Ceuta', 72], ['Melilla', 16],
];
for (const [region, days] of specialistOutpatientMeansByRegion) {
  const answer = focusedEvidencePlan(`La espera media de consultas externas fue mayor en Canarias que en ${region} en 2025`);
  assert.equal(answer.blocks.find((block) => block.type === 'claim_breakdown').items[0].verdict, 'supported', `The Canary Islands comparison did not use a lower regional mean for ${region}`);
  assert.ok(answer.shareableReply.includes(`162 días en Canarias y ${days} días en ${region}`), `The source value for ${region} was missing or changed`);
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
  'La espera de consultas externas fue mayor en Canarias que en Melilla en 2024',
  'La espera media de consultas externas fue mayor en Canarias que en Melilla en 2026',
  'La espera de cirugía fue mayor en Canarias que en Melilla en 2025',
  'La espera de consultas externas fue mayor en Canarias que en Lisboa en 2025',
  'La espera de consultas externas fue mayor en Canarias que en Valencia en 2025',
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
assert.deepEqual(sectorWageGap.answerScope.contextMetrics, ['mean_hourly_earnings_by_activity']);
assert.equal(sectorWageGap.sourceLinks.length, 2);
assert.match(sectorWageGap.shareableReply, /media salarial da contexto/);
assert.match(sectorWageGap.shareableReply, /no mide productividad/);
assert.match(sectorWageGap.shareableReply, /cuatrienal|cada cuatro a[nñ]os/);
assert.match(sectorWageGap.shareableReply, /excluyen agricultura/);
assert.ok(sectorWageGap.shareableReply.trim().split(/\s+/).length <= 160, 'Sector-wage context should be concise enough to read and share');
assert.doesNotMatch(sectorWageGap.shareableReply, /17 €/);
assert.ok(sectorWageGap.evidenceSummary.missingDimensions.some((item) => /aportaci[oó]n al PIB por el mismo sector/.test(item)), 'A compound sector claim must retain its GDP contribution requirement');
const sectorWageSource = {
  id: 'eurostat-sector-earnings-2022',
  title: 'Mean hourly earnings by sex, economic activity and length of service (2022)',
  publisher: 'Eurostat',
  url: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/earn_ses22_17?geo=ES&freq=A&sex=T&indic_se=ERN&l_serv=TOTAL&sizeclas=GE10&unit=EUR&time=2022',
  retrievedAt: '2026-11-17T10:00:00Z',
};
const sectorWageRows = [
  ['I', 9.86], ['C', 13.52], ['J', 16.75], ['K', 20.35],
].map(([activity, value]) => ({
  id: `ses-2022-${activity}`, metricId: 'mean_hourly_earnings_by_activity', value, period: '2022', unit: 'Euro', geography: 'Spain',
  population: 'employees in Spanish enterprises with 10 or more employees, all sexes',
  dimensions: { freq: 'A', sex: 'T', indic_se: 'ERN', l_serv: 'TOTAL', sizeclas: 'GE10', nace_r2: activity, unit: 'EUR', geo: 'ES', time: '2022' },
  source: sectorWageSource,
}));
const sectorWageParaphrases = [
  'El salario bruto por hora de la hostelería es menor que el del sector financiero',
  'En alojamiento y comidas se cobra menos por hora que en finanzas',
  'La remuneración media por hora en hoteles es menor que en los bancos',
  'Los trabajos de hostelería están peor pagados que los de la banca',
];
let selectedSectorWageEvidence;
for (const claim of sectorWageParaphrases) {
  const answer = focusedEvidencePlan(claim, { observations: sectorWageRows });
  assert.equal(answer.answerScope.family, 'sector-wage-comparison', claim);
  assert.deepEqual(answer.answerScope.contextMetrics, ['mean_hourly_earnings_by_activity'], claim);
  assert.ok(answer.shareableReply.includes('9,86 €/hora'), claim);
  assert.ok(answer.shareableReply.includes('20,35 €/hora'), claim);
  assert.match(answer.shareableReply, /distribuci[oó]n salarial y la productividad requieren otras medidas/, claim);
  assert.match(answer.shareableReply, /no mide productividad/, claim);
  assert.doesNotMatch(answer.shareableReply, /13,52 €\/hora|16,75 €\/hora/, `The claim inherited an unnamed activity comparison: ${claim}`);
  const evidence = answer.evidenceSummary.families.find((family) => family.familyId === 'mean_hourly_earnings_by_activity');
  const ids = [...evidence.evidenceIds].sort();
  assert.doesNotMatch(answer.shareableReply, /Como contexto:\s*Como contexto/);
  if (selectedSectorWageEvidence) assert.deepEqual(ids, selectedSectorWageEvidence, `A paraphrase selected different activity evidence: ${claim}`);
  selectedSectorWageEvidence = ids;
}
const broadTourismWageClaim = focusedEvidencePlan('El turismo aumenta el PIB pero genera menos salarios altos que sectores de mayor productividad', { observations: sectorWageRows });
const broadTourismWageEvidence = broadTourismWageClaim.evidenceSummary.families.find((family) => family.familyId === 'mean_hourly_earnings_by_activity');
assert.deepEqual(broadTourismWageEvidence.evidenceIds, ['ses-2022-I'], 'A broad tourism claim may use only the accommodation and food-services row it names');
assert.ok(broadTourismWageClaim.shareableReply.includes('9,86 €/hora'));
assert.doesNotMatch(broadTourismWageClaim.shareableReply, /13,52 €\/hora|16,75 €\/hora|20,35 €\/hora/, 'An unnamed comparison activity must not be selected to strengthen the claim');
assert.match(broadTourismWageClaim.shareableReply, /NACE I abarca alojamiento y servicios de comida, no todo el turismo/);
assert.ok(broadTourismWageClaim.evidenceSummary.missingDimensions.some((item) => /valor añadido o aportación al PIB/.test(item)));
assert.ok(broadTourismWageClaim.shareableReply.trim().split(/\s+/).length <= 160, 'A sector-wage answer with observed data should remain concise');
const publicSectorWageAnswer = localPublicCheckResponse({ status: 'complete', requestId: 'sector-wage-context', result: broadTourismWageClaim }, 'El turismo aumenta el PIB pero genera menos salarios altos que sectores de mayor productividad');
assert.equal(publicSectorWageAnswer.state, 'insufficient', 'Contextual mean pay must not be presented as a verdict on high-wage jobs or productivity');
assert.ok(publicSectorWageAnswer.result.reply.includes('9,86 €/hora'));
assert.ok(publicSectorWageAnswer.result.sources.some((source) => source.id === sectorWageSource.id));
assert.equal(claimFocusFor('La productividad de los hoteles es menor que la de las finanzas'), undefined, 'A productivity comparison without a wage claim must not fetch sector earnings');
assert.equal(claimFocusFor('Los hoteles cobran más por noche que los restaurantes'), undefined, 'A room-price comparison must not be interpreted as an hourly wage comparison');
const nationalWageTrendNeighbour = focusedEvidencePlan('Los salarios de hostelería subieron este año', { observations: sectorWageRows });
assert.equal(nationalWageTrendNeighbour.answerScope.family, 'nominal-wages', 'A sector wage trend must not cross-route into the static sector comparison');
assert.deepEqual(nationalWageTrendNeighbour.answerScope.contextMetrics, ['median_hourly_earnings']);
assert.ok(!nationalWageTrendNeighbour.sourceLinks.some((source) => source.id === sectorWageSource.id), 'Sector comparison rows must not answer a wage trend claim');
const sectorEmploymentGap = focusedEvidencePlan('El empleo crece más en sectores de baja productividad que en sectores de salarios altos');
assert.equal(sectorEmploymentGap.answerScope.family, 'sector-wage-comparison');
assert.ok(sectorEmploymentGap.evidenceSummary.missingDimensions.some((item) => /variaci[oó]n del empleo por actividad/.test(item)), 'An employment-growth claim must retain the missing sector employment series');
assert.ok(sectorEmploymentGap.shareableReply.trim().split(/\s+/).length <= 160, 'Sector-employment context should be concise enough to read and share');
assert.match(sectorEmploymentGap.shareableReply, /2022/);
assert.match(sectorEmploymentGap.shareableReply, /10 o m[aá]s empleados/);
assert.match(sectorEmploymentGap.shareableReply, /no mide el crecimiento del empleo ni la productividad/);
assert.doesNotMatch(sectorEmploymentGap.shareableReply, /Comparar la aportaci[oó]n al PIB/);
const sectorEmploymentParaphrase = focusedEvidencePlan('En los sectores menos productivos crece más la ocupación que en los que mejor pagan');
assert.equal(sectorEmploymentParaphrase.answerScope.family, sectorEmploymentGap.answerScope.family);
assert.ok(sectorEmploymentParaphrase.evidenceSummary.missingDimensions.some((item) => /variaci[oó]n del empleo por actividad/.test(item)), 'Employment-growth paraphrases must request the same sector series');
const sectorEmploymentLevel = focusedEvidencePlan('El empleo se concentra en sectores de salarios bajos y productividad reducida');
assert.ok(sectorEmploymentLevel.evidenceSummary.missingDimensions.some((item) => /empleo por actividad, poblaci[oó]n y periodo/.test(item)), 'A sector-employment level comparison must request employment by activity');
assert.ok(!sectorEmploymentLevel.evidenceSummary.missingDimensions.some((item) => /variaci[oó]n del empleo/.test(item)), 'A sector-employment level claim must not be mistaken for a growth claim');
assert.match(sectorEmploymentLevel.shareableReply, /no mide el empleo por actividad ni la productividad/);
assert.doesNotMatch(sectorEmploymentLevel.shareableReply, /crecimiento del empleo/);
const sectorSalaryGap = focusedEvidencePlan('El turismo y la hostelería tiran hacia abajo del salario medio español');
assert.equal(sectorSalaryGap.answerScope.family, 'sector-wage-comparison');
assert.ok(!sectorSalaryGap.evidenceSummary.missingDimensions.some((item) => /crecimiento del empleo/.test(item)), 'A salary claim should not inherit a missing-employment requirement');
assert.ok(sectorSalaryGap.evidenceSummary.missingDimensions.some((item) => /proporci[oó]n del empleo/.test(item)), 'An average-wage impact claim must retain the employment weight needed for the national average');
assert.ok(sectorSalaryGap.shareableReply.trim().split(/\s+/).length <= 160, 'Sector-salary context should be concise enough to read and share');
assert.doesNotMatch(sectorSalaryGap.shareableReply, /Comparar la aportaci[oó]n al PIB/);
for (const claim of ['La hostelería arrastra hacia abajo el promedio de los sueldos en España', 'La actividad turística reduce la media de los salarios']) {
  const answer = focusedEvidencePlan(claim);
  assert.equal(answer.answerScope.family, sectorSalaryGap.answerScope.family, 'Average-wage impact paraphrases must use the same family');
  assert.ok(answer.evidenceSummary.missingDimensions.some((item) => /proporci[oó]n del empleo/.test(item)), 'Average-wage impact paraphrases must require the employment weight');
}
assert.equal(claimFocusFor('El empleo crece más en la industria que en la hostelería'), undefined, 'A sector employment-growth claim without a wage or productivity comparison must not be routed to the wage family');
assert.equal(claimFocusFor('El salario medio español aumenta este año')?.id, 'nominal-wages', 'A national wage trend without sector comparison must stay outside the sector wage family');
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
const workbook = (inputRows, sheetName = 'Marginales') => { const book = utils.book_new(); utils.book_append_sheet(book, utils.aoa_to_sheet(inputRows), sheetName); return write(book, { type: 'buffer', bookType: 'xlsx' }); };
const parsed = await parsePrimaryCareBarometerWorkbook(workbook(rows), source);
assert.equal(parsed.length, 2);
assert.equal(parsed.find((item) => item.metricId === 'primary_care_wait_days').value, 10.27);
assert.equal(parsed.find((item) => item.metricId === 'primary_care_wait_days').dimensions.validResponseSampleSize, 1448);
assert.equal(parsed.find((item) => item.metricId === 'primary_care_wait_over_one_day_rate').dimensions.sampleSize, 2061);
assert.ok(parsed.every((item) => item.period === '2026-O1' && item.dimensions.provisional));
await assert.rejects(() => parsePrimaryCareBarometerWorkbook(workbook(rows.filter((row) => row[0] !== 'Pregunta 5c_01')), source), /question 5c_01 missing/);
await assert.rejects(() => parsePrimaryCareBarometerWorkbook(workbook(rows.map((row) => String(row[0]).includes('no había cita') ? [row[0], 101] : row)), source), /values or respondent bases/);

const waveTwoSource = { id: 'sanidad-wave-two', title: 'Barómetro Sanitario 2026, segunda oleada', publisher: 'Ministerio de Sanidad', url: 'https://www.sanidad.gob.es/estadEstudios/estadisticas/BarometroSanitario/Barom_Sanit_2026/2Oleada/2026_CIS_2_OLA_3574multi.xlsx', retrievedAt: '2026-11-23' };
const waveTwoRows = [
  ['', 'BARÓMETRO SANITARIO 2026 (SEGUNDA OLEADA)'],
  ['Pregunta 5c'], ['Desde que pidió cita hasta que le atendió el médico de familia, ¿cuánto tiempo pasó?'],
  ['Pasó más de un día porque no había cita antes', 71.97411214663927],
  ['Pasó más de un día porque la cita no le venía bien', 4.653845676848343], ['(N)', 2020],
  ['Pregunta 5c_01'], ['¿Cuántos días?'], ['(N)', 1454], ['Media  (días)', 9.71], ['N', 1417],
  ['Pregunta 6'], ['Espera quirúrgica', 121],
];
const parsedWaveTwo = await parsePrimaryCareBarometerWorkbook(workbook(waveTwoRows, 'Resultados'), waveTwoSource);
assert.equal(parsedWaveTwo.length, 2);
assert.ok(parsedWaveTwo.every((item) => item.period === '2026-O2' && item.dimensions.provisional));
assert.equal(parsedWaveTwo.find((item) => item.metricId === 'primary_care_wait_over_one_day_rate').value, 71.97411214663927);
assert.equal(parsedWaveTwo.find((item) => item.metricId === 'primary_care_wait_over_one_day_rate').dimensions.sampleSize, 2020);
assert.equal(parsedWaveTwo.find((item) => item.metricId === 'primary_care_wait_days').value, 9.71);
assert.equal(parsedWaveTwo.find((item) => item.metricId === 'primary_care_wait_days').dimensions.eligibleSampleSize, 1454);
assert.equal(parsedWaveTwo.find((item) => item.metricId === 'primary_care_wait_days').dimensions.validResponseSampleSize, 1417);

const observations = [...parsed.map((row) => ({ ...row, source })), ...parsedWaveTwo.map((row) => ({ ...row, source: waveTwoSource }))];
const claim = cases.find(([family]) => family === 'primary-care-waits')[1][0];
const plan = focusedEvidencePlan(claim, { observations });
assert.equal(plan.evidenceLevel, 'limited');
assert.match(plan.shareableReply, /9,71/);
assert.match(plan.shareableReply, /72 %/);
assert.doesNotMatch(plan.shareableReply, /10,27|71,2 %/);
assert.match(plan.shareableReply, /provisionales/);
assert.match(plan.shareableReply, /subgrupo|quienes esperaron|más de un día/);
assert.match(plan.shareableReply, /no define un umbral universal/);
assert.doesNotMatch(plan.shareableReply, /121|IMCV|peor que nunca/);
assert.ok(plan.shareableReply.split(/\s+/).length < 180, 'The primary answer must be easy to digest');
assert.ok(validateAnswerPlan(plan).ok, JSON.stringify(validateAnswerPlan(plan).errors));
const payload = { status: 'complete', requestId: 'focus-fixture', result: plan };
assert.ok(publicResolveResponse(payload));
const displayed = localPublicCheckResponse(payload, claim);
assert.equal(displayed.result.sources.length, 1);
assert.equal(displayed.result.answerScope.family, 'primary-care-waits');
assert.equal(shouldRetainReviewedPreview({ result: { evidenceSummary: { families: [{ label: 'Toda la sanidad' }] } } }, displayed), false);

for (const paraphrase of cases.find(([family]) => family === 'primary-care-waits')[1]) {
  const answer = focusedEvidencePlan(paraphrase, { observations });
  assert.equal(answer.answerScope.family, 'primary-care-waits', `A text paraphrase changed the primary-care evidence family: ${paraphrase}`);
  assert.match(answer.shareableReply, /9,71/);
  assert.deepEqual(answer.sourceIds, ['sanidad-wave-two'], `A current-wave paraphrase inherited a superseded source: ${paraphrase}`);
}

const firstWaveWait = focusedEvidencePlan('¿Cuántos días tardaba una cita en atención primaria en la primera oleada de 2026?', { observations });
assert.match(firstWaveWait.shareableReply, /10,27/);
assert.doesNotMatch(firstWaveWait.shareableReply, /9,71/);
assert.deepEqual(firstWaveWait.sourceIds, ['sanidad-wave-one'], 'An explicit first-wave question must not inherit the latest wave');

const waitTrendClaim = 'Cada vez se tarda más en conseguir cita con el médico de familia';
const waitTrendPlan = focusedEvidencePlan(waitTrendClaim, { observations });
assert.equal(waitTrendPlan.claimType, 'trend');
assert.deepEqual(waitTrendPlan.blocks.find((block) => block.type === 'claim_breakdown').items[0].evidenceIds, [], 'A current-wave snapshot must not prove a trend claim');
assert.match(waitTrendPlan.shareableReply, /Como contexto/);
assert.match(waitTrendPlan.shareableReply, /comparar la misma medida|oleadas comparables/i);
assert.match(waitTrendPlan.shareableReply, /9,71/);

const waitCausalityClaim = 'La demora del médico de familia obliga a la gente a ir a urgencias';
const waitCausalityPlan = focusedEvidencePlan(waitCausalityClaim, { observations });
assert.equal(waitCausalityPlan.claimType, 'causal');
assert.deepEqual(waitCausalityPlan.blocks.find((block) => block.type === 'claim_breakdown').items[0].evidenceIds, [], 'Appointment-delay data must not be attributed as proof of emergency-care effects');
assert.match(waitCausalityPlan.shareableReply, /9,71/);
assert.notEqual(claimFocusFor('Las esperas para el especialista varían entre comunidades autónomas')?.id, 'primary-care-waits', 'Hospital-specialist delays must remain outside primary care');
assert.equal(claimFocusFor('Las listas de espera para cirugías se alargan')?.id, undefined, 'Surgical waiting lists must not inherit primary-care data');

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
const partTime = focusedEvidencePlan('Trabajar a jornada parcial no impide estar en riesgo de pobreza', { observations: [
  ...poverty,
  { id: 'part-time-poverty', metricId: 'in_work_poverty_part_time_rate', value: 18.6, period: '2025', unit: '%', dimensions: { geo: 'ES', worktime: 'PT' }, source: povertySource },
] });
assert.deepEqual(partTime.evidenceIds, ['part-time-poverty']);
assert.match(partTime.shareableReply, /18,6/);
assert.doesNotMatch(partTime.shareableReply, /9,5|11,2|14,7/);
const worktimeComparison = focusedEvidencePlan('La tasa de riesgo de pobreza es más alta en la jornada parcial que en la jornada completa', { observations: [
  ...poverty,
  { id: 'part-time-poverty', metricId: 'in_work_poverty_part_time_rate', value: 18.6, period: '2025', unit: '%', dimensions: { geo: 'ES', worktime: 'PT' }, source: povertySource },
] });
assert.equal(worktimeComparison.claimType, 'comparative');
assert.equal(worktimeComparison.blocks.find((block) => block.type === 'claim_breakdown').items[0].verdict, 'supported');
assert.match(worktimeComparison.shareableReply, /9,1 puntos porcentuales más en jornada parcial/);
const scopedWorktimeComparison = focusedEvidencePlan('En 2020 la tasa de riesgo de pobreza era más alta en jornada parcial que en jornada completa', { observations: [
  ...poverty,
  { id: 'part-time-poverty-2020', metricId: 'in_work_poverty_part_time_rate', value: 19, period: '2020', unit: '%', dimensions: { geo: 'ES', worktime: 'PT' }, source: povertySource },
  { ...poverty[0], id: 'full-time-poverty-2020', value: 9.7, period: '2020' },
] });
assert.match(scopedWorktimeComparison.shareableReply, /En España, en 2020, .*19 % .*9,7 %/);
assert.doesNotMatch(scopedWorktimeComparison.shareableReply, /18,6|9,5/);
const unsupportedAgeSplit = focusedEvidencePlan('La tasa de riesgo de pobreza de trabajadores de 25 a 34 años a jornada parcial es alta', { observations: [
  { id: 'part-time-no-age-breakdown', metricId: 'in_work_poverty_part_time_rate', value: 18.6, period: '2025', unit: '%', population: 'personas ocupadas a jornada parcial; el dataset EU-SILC no ofrece un desglose de edad', dimensions: { geo: 'ES', worktime: 'PT' }, source: povertySource },
] });
assert.equal(unsupportedAgeSplit.evidenceIds.length, 0, 'A worktime dataset without age breakdown must not answer an age-specific claim');
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
const industrialElectricitySource = { id: 'eurostat-industrial-electricity', title: 'Electricity prices for non-household consumers · Eurostat (nrg_pc_205)', publisher: 'Eurostat', url: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nrg_pc_205', retrievedAt: '2026-11-17' };
const industrialElectricityRows = [
  { id: 'industrial-electricity-spain', metricId: 'industrial_electricity_price', metric: 'Non-household electricity price', value: 0.1177, period: '2026-S1', unit: 'Kilowatt-hour', geography: 'Spain', population: 'Final non-household consumers in annual consumption band ID, 2,000 to less than 20,000 MWh', dimensions: { geo: 'ES', currency: 'EUR', unit: 'KWH', nrg_cons: 'MWH2000-19999', tax: 'X_VAT' }, dimensionLabels: { geo: 'Spain', nrg_cons: 'Consumption from 2,000 MWh to 19,999 MWh - band ID', tax: 'Excluding VAT and other recoverable taxes and levies' }, source: industrialElectricitySource },
  { id: 'industrial-electricity-comparison-spain', metricId: 'industrial_electricity_price_europe', metric: 'Non-household electricity price', value: 0.1177, period: '2026-S1', unit: 'Kilowatt-hour', geography: 'Spain', population: 'Final non-household consumers in annual consumption band ID, 2,000 to less than 20,000 MWh', dimensions: { geo: 'ES', currency: 'EUR', unit: 'KWH', nrg_cons: 'MWH2000-19999', tax: 'X_VAT' }, dimensionLabels: { geo: 'Spain', nrg_cons: 'Consumption from 2,000 MWh to 19,999 MWh - band ID', tax: 'Excluding VAT and other recoverable taxes and levies' }, source: industrialElectricitySource },
  { id: 'industrial-electricity-comparison-eu', metricId: 'industrial_electricity_price_europe', metric: 'Non-household electricity price', value: 0.1559, period: '2026-S1', unit: 'Kilowatt-hour', geography: 'European Union', population: 'Final non-household consumers in annual consumption band ID, 2,000 to less than 20,000 MWh', dimensions: { geo: 'EU27_2020', currency: 'EUR', unit: 'KWH', nrg_cons: 'MWH2000-19999', tax: 'X_VAT' }, dimensionLabels: { geo: 'European Union (27 countries)', nrg_cons: 'Consumption from 2,000 MWh to 19,999 MWh - band ID', tax: 'Excluding VAT and other recoverable taxes and levies' }, source: industrialElectricitySource },
];
const allElectricityRows = [...electricity, ...industrialElectricityRows];
const industrialPriceQuestion = '¿Cuál es el precio medio de la electricidad para grandes consumidores no domésticos en España?';
const industrialPriceAnswer = focusedEvidencePlan(industrialPriceQuestion, { observations: allElectricityRows });
assert.equal(industrialPriceAnswer.answerScope.family, 'electricity-industry-price');
assert.deepEqual(industrialPriceAnswer.answerScope.directMetrics, ['industrial_electricity_price']);
assert.equal(industrialPriceAnswer.evidenceLevel, 'limited');
assert.ok(industrialPriceAnswer.shareableReply.includes('0,1177 €/kWh'));
assert.ok(industrialPriceAnswer.shareableReply.includes('banda ID') && industrialPriceAnswer.shareableReply.includes('2.000 y menos de 20.000 MWh'));
assert.match(industrialPriceAnswer.shareableReply, /excluye el IVA y otros impuestos y gravámenes recuperables/);
assert.doesNotMatch(industrialPriceAnswer.shareableReply, /0,2739/);
const industrialPriceComparison = focusedEvidencePlan('¿Cuál es el precio eléctrico industrial de grandes consumidores en España frente a la Unión Europea?', { observations: allElectricityRows });
assert.equal(industrialPriceComparison.answerScope.family, 'electricity-industry-price');
assert.deepEqual(industrialPriceComparison.answerScope.directMetrics, ['industrial_electricity_price_europe']);
assert.ok(industrialPriceComparison.shareableReply.includes('0,1177 €/kWh') && industrialPriceComparison.shareableReply.includes('0,1559 €/kWh'));
assert.ok(industrialPriceComparison.shareableReply.includes('0,1177 €/kWh en España y 0,1559 €/kWh en la Unión Europea: 0,0382 €/kWh menos en España'));
assert.match(industrialPriceComparison.shareableReply, /2026-S1/);
assert.match(industrialPriceComparison.limitation, /ni representa a todas las empresas industriales/);
const industryElectricityClaim = 'El precio de la electricidad resta competitividad a parte de la industria española';
const industryElectricity = focusedEvidencePlan(industryElectricityClaim, { observations: allElectricityRows });
assert.equal(industryElectricity.answerScope.family, 'electricity-industry-costs');
assert.equal(industryElectricity.evidenceLevel, 'insufficient');
assert.deepEqual(industryElectricity.answerScope.directMetrics, []);
assert.deepEqual(industryElectricity.answerScope.contextMetrics, ['industrial_electricity_price']);
assert.ok(industryElectricity.sourceLinks.some((source) => source.id === industrialElectricitySource.id), 'A scoped non-household rate should appear as context for an industrial competitiveness claim');
assert.ok(industryElectricity.shareableReply.includes('0,1177 €/kWh'));
assert.doesNotMatch(industryElectricity.shareableReply, /0,2739|0,1559/);
assert.match(industryElectricity.shareableReply, /no mide por separado cada sector/);
assert.match(industryElectricity.shareableReply, /Falta una medición directa/);
for (const paraphrase of [
  'La factura eléctrica reduce la competitividad de las fábricas españolas',
  'La electricidad encarece la producción de muchas empresas industriales',
]) {
  const plan = focusedEvidencePlan(paraphrase, { observations: allElectricityRows });
  assert.equal(plan.answerScope.family, industryElectricity.answerScope.family, `An industrial electricity paraphrase crossed into a household price route: ${paraphrase}`);
  assert.deepEqual(plan.answerScope.directMetrics, []);
  assert.deepEqual(plan.answerScope.contextMetrics, ['industrial_electricity_price']);
  assert.ok(plan.shareableReply.includes('0,1177 €/kWh'));
  assert.doesNotMatch(plan.shareableReply, /0,2739/);
}
const householdElectricityClaim = '¿Cómo ha cambiado el precio de la electricidad para los hogares en España?';
const householdElectricityAnswer = focusedEvidencePlan(householdElectricityClaim, { observations: allElectricityRows });
assert.deepEqual(householdElectricityAnswer.answerScope.directMetrics, ['household_electricity_price']);
assert.deepEqual(householdElectricityAnswer.answerScope.contextMetrics, []);
assert.ok(householdElectricityAnswer.shareableReply.includes('0,2739 €/kWh'));
assert.doesNotMatch(householdElectricityAnswer.shareableReply, /0,1177|0,1559/);
const marketTradingClaim = 'España puede exportar electricidad barata en horas solares y necesitar energía más cara en otros momentos';
const marketTrading = focusedEvidencePlan(marketTradingClaim, { observations: allElectricityRows });
assert.equal(marketTrading.answerScope.family, 'electricity-market-trading');
assert.equal(marketTrading.evidenceLevel, 'insufficient');
assert.deepEqual(marketTrading.answerScope.directMetrics, []);
assert.deepEqual(marketTrading.answerScope.contextMetrics, []);
assert.equal(marketTrading.sourceLinks.length, 0, 'Retail and band-average rates cannot verify hourly electricity exports, imports or wholesale prices');
assert.doesNotMatch(marketTrading.shareableReply, /0,2739|0,1177|0,1559|precio dom[eé]stico por kWh/);
assert.match(marketTrading.shareableReply, /exporta o importa electricidad/);
for (const paraphrase of [
  'España exporta electricidad barata al mediodía e importa energía más cara por la noche',
  'Las interconexiones permiten vender electricidad cuando sobra y comprarla cuando sube el precio',
]) {
  const plan = focusedEvidencePlan(paraphrase, { observations: electricity });
  assert.equal(plan.answerScope.family, marketTrading.answerScope.family, `An hourly market-trading paraphrase crossed into a household price route: ${paraphrase}`);
  assert.deepEqual(plan.answerScope.directMetrics, []);
  assert.equal(plan.sourceLinks.length, 0);
}
assert.equal(claimFocusFor('El precio doméstico de la electricidad por kWh ha aumentado para los hogares')?.id, 'electricity-retail', 'Household price claims must keep their direct electricity measure');
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
const wagePassThroughClaim = 'Subir mucho los salarios de hostelería obligaría a subir precios o reducir márgenes en muchos negocios';
const wagePassThrough = focusedEvidencePlan(wagePassThroughClaim, { observations: [
  { ...poverty[0], id: 'national-wage-index', metricId: 'annual_hourly_wage_index', value: 116.3, period: '2025', unit: 'index' },
  { ...poverty[0], id: 'national-price-index', metricId: 'annual_hicp_index', value: 121.9, period: '2025', unit: 'index' },
] });
assert.equal(wagePassThrough.answerScope.family, 'wage-price-margin-pass-through');
assert.equal(wagePassThrough.evidenceLevel, 'insufficient');
assert.deepEqual(wagePassThrough.answerScope.directMetrics, []);
assert.deepEqual(wagePassThrough.answerScope.contextMetrics, []);
assert.equal(wagePassThrough.sourceLinks.length, 0, 'National wage and price indexes do not show sectoral price or margin pass-through');
assert.doesNotMatch(wagePassThrough.shareableReply, /116,3|121,9/);
assert.match(wagePassThrough.shareableReply, /no muestran si una empresa trasladar[ií]a una subida salarial/);
for (const paraphrase of [
  'Un aumento de sueldo en las empresas se acaba trasladando a los precios o reduce sus márgenes',
  'Si suben los salarios, los negocios tienen que encarecer sus productos o ganar menos',
]) {
  const plan = focusedEvidencePlan(paraphrase, { observations: [
    { ...poverty[0], id: 'national-wage-index', metricId: 'annual_hourly_wage_index', value: 116.3, period: '2025', unit: 'index' },
    { ...poverty[0], id: 'national-price-index', metricId: 'annual_hicp_index', value: 121.9, period: '2025', unit: 'index' },
  ] });
  assert.equal(plan.answerScope.family, wagePassThrough.answerScope.family, `A wage pass-through paraphrase crossed into real-wage purchasing power: ${paraphrase}`);
  assert.deepEqual(plan.answerScope.contextMetrics, []);
  assert.equal(plan.sourceLinks.length, 0);
}
assert.equal(claimFocusFor('Los salarios españoles pierden poder adquisitivo frente al coste de la vida')?.id, 'real-wages', 'Purchasing-power claims must keep the aligned wage and price series');
assert.equal(claimFocusFor('Los sueldos turísticos son más bajos que en las industrias más productivas')?.id, 'sector-wage-comparison', 'A sector wage comparison must not become a wage price pass-through claim');
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
assert.equal(rankWarehouseObservations('appointment delay', observations, 10, { metricIds: new Set(['primary_care_wait_days']) }).length, 2, 'An explicit metric ID must retrieve the wave observations across languages');
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
assert.ok(nonYouthRent.shareableReply.trim().split(/\s+/).length <= 160, 'Rental-affordability context should be concise enough to read and share');
const security = answerPlanForBroadDomains('No se puede salir a la calle de cómo está la seguridad');
assert.doesNotMatch(security.shareableReply, /extranj|nacionaliz|wokismo/i);
assert.ok(!security.evidenceSummary.families.some((family) => family.criterionId === 'group-causality'));
const health = answerPlanForBroadDomains('Las listas de espera sanitarias son muy largas');
assert.doesNotMatch(health.shareableReply, /peor que nunca/i);
assert.ok(!health.evidenceSummary.families.some((family) => family.criterionId === 'health-historical-claim'));
const paraphraseCount = cases.reduce((count, [, paraphrases]) => count + paraphrases.length, 0) + workHousingParaphrases.length;
console.log(`Claim focus validated: ${paraphraseCount} paraphrases, negative neighbours, survey bases, scope rejection, denominator and source boundaries, missing values and preview replacement.`);
