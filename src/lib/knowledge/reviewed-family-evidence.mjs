// Reviewed primary documents supplement criteria, never whole claim strings.
// Each addition retains its own scope and does not resolve a different measurement.
const source = (id, title, publisher, url, publishedAt) => ({ id, title, publisher, url, publishedAt, retrievedAt: '2026-09-07', role: 'primary' });
const regularizationLaw = source('regularization-law-2026', 'Real Decreto 316/2026 · arraigo extraordinario', 'BOE', 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-8284', '2026-04-15');
const employmentLaw = source('public-employment-statute', 'Estatuto Básico del Empleado Público · artículos 20, 52, 95 y 96', 'BOE', 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-11719', '2015-10-31');
const youthHousing = source('cje-emancipation-2025', 'Observatorio de Emancipación 2025 · balance publicado en mayo de 2026', 'Consejo de la Juventud de España', 'https://www.cje.org/observatorio_2025/', '2026-05-26');
const convictions = source('ine-convictions-2024', 'Estadística de Condenados: Adultos / Menores · 2024', 'INE', 'https://www.ine.es/dyngs/Prensa/ECAECM2024.htm', '2025-09-18');

const digitalServices = source('digital-services-2025', 'Década Digital 2025 · servicios públicos digitales para ciudadanos', 'Ministerio para la Transformación Digital', 'https://digital.gob.es/en/comunicacion/notas-prensa/secretaria-digitalizacion-e-inteligencia-artificial/2025/06/2025-06-16', '2025-06-16');
const vat = source('aeat-vat-rates', 'Tipos impositivos de IVA · 2026', 'Agencia Tributaria', 'https://sede.agenciatributaria.gob.es/Sede/iva/calculo-iva-repercutido-clientes/tipos-impositivos-iva.html', '2026-01-01');

const updates = {
  'social-security-account': { replyPriority: 10 },
  'pension-finance-projection-series': { replyPriority: 9 },
  'regularization-measure': {
    finding: 'Existe una regularización extraordinaria: el Real Decreto 316/2026 incorpora el arraigo extraordinario. Exige presencia anterior a 2026, permanencia continuada y requisitos penales, además de una vía laboral, familiar o de vulnerabilidad. No concede automáticamente nacionalidad ni prestaciones.',
    fallbackData: ['Real Decreto 316/2026, publicado el 15-04-2026; disposición adicional 21.ª', 'Presencia en España anterior al 01-01-2026 y al menos 5 meses continuados antes de solicitar'],
    missingDimensions: [], sourceIds: [regularizationLaw.id], dataKind: 'context',
    population: 'solicitantes de arraigo extraordinario', denominator: 'no procede: requisitos jurídicos', unit: 'fechas y meses',
  },
  'legal-status': {
    finding: 'La autorización dura un año y permite residir y trabajar. No hay aquí un recuento publicado de autorizaciones concedidas: solicitudes y expedientes tramitados no equivalen a concesiones.',
    fallbackData: ['Autorización inicial: 1 año; habilita residencia y trabajo (RD 316/2026, disposición adicional 21.ª.10)'],
    missingDimensions: ['autorizaciones concedidas', 'denegaciones', 'expedientes pendientes'], sourceIds: [regularizationLaw.id], dataKind: 'context',
  },
  'individual-conduct': {
    finding: 'La plaza no da derecho a incumplir: el estatuto prevé evaluación del desempeño, deberes de diligencia y sanciones. Esto contradice el supuesto derecho a no trabajar, pero no mide cuántos trabajadores incumplen.',
    fallbackData: ['Evaluación del desempeño: artículo 20 del EBEP (RDL 5/2015); deberes: artículo 52', 'Abandono del servicio: falta muy grave (art. 95); posible separación del servicio (art. 96)'],
    sourceIds: [employmentLaw.id], dataKind: 'context',
  },
  'group-causality': {
    finding: 'Hay una diferencia en tasas brutas por nacionalidad: no debe ocultarse ni confundirse con causalidad. “Nuevos españoles” no es la categoría “extranjeros”: los nacionalizados cuentan como españoles. Estas tasas incluyen todos los delitos y no aíslan el efecto del origen ni cada delito citado.',
    fallbackData: ['Nacionalidad extranjera: 15,7 condenados adultos por 1.000 residentes de 18 o más años (2024)', 'Nacionalidad española: 6,2 condenados adultos por 1.000 residentes de 18 o más años (2024)'],
    sourceIds: [convictions.id], population: 'adultos condenados por sentencia firme inscrita en 2024, por hechos de 2024 o anteriores', denominator: '1.000 residentes adultos de la misma nacionalidad', unit: 'condenados por 1.000 residentes adultos', dataKind: 'observed',
    missingDimensions: ['delitos concretos y serie temporal por grupo comparable', 'nacionalización y país de nacimiento', 'ajuste por edad, sexo, exposición y territorio', 'diseño causal'],
  },
  'institutional-response': {
    finding: 'Sí existe actuación judicial: el INE registra sentencias firmes. El recuento no permite evaluar por sí solo rapidez, prevención, impunidad o la respuesta a cada incidente.',
    fallbackData: ['306.807 personas adultas condenadas con sentencia firme inscrita en España (2024)'], sourceIds: [convictions.id], dataKind: 'observed',
    population: 'personas adultas condenadas', denominator: 'recuento nacional', unit: 'personas',
    missingDimensions: ['tiempos de respuesta policial y judicial por delito y territorio', 'denuncias, esclarecimientos y archivo con el mismo periodo'],
  },
};
const additions = {
  'broad-public-administration': [
    { id: 'public-digitalization', label: 'Actualización digital', finding: 'La existencia de servicios digitales medidos contradice una ausencia total de actualización. El indicador evalúa disponibilidad digital, no rapidez de cada trámite, productividad de empleados ni puestos sustituibles.', fallbackData: ['Servicios públicos digitales para ciudadanos: 88,75 puntos sobre 100 (informe Década Digital 2025)'], sourceIds: [digitalServices.id], population: 'servicios públicos digitales para ciudadanos evaluados en España', denominator: 'escala de 0 a 100', unit: 'puntos', dataKind: 'snapshot', missingDimensions: ['tiempos efectivos de resolución y accesibilidad por trámite', 'auditoría de tareas automatizables y resultados del servicio'] },
  ],
  'broad-tax-burden-purchasing-power': [
    { id: 'vat-policy', label: 'IVA y propuesta de rebaja', finding: 'El IVA ya diferencia productos y operaciones. Una rebaja debe especificar qué tipo cambia, su traslación a precios y la recaudación perdida; el déficit agregado no demuestra que cualquier rebaja sea inviable.', fallbackData: ['IVA general: 21 %; tipos reducidos: 10 % y 4 %; determinadas operaciones: 0 % (AEAT, consulta 2026-09-07)'], sourceIds: [vat.id], population: 'operaciones sujetas al IVA en España', denominator: 'base imponible de cada operación', unit: '% de la base imponible', dataKind: 'context', missingDimensions: ['productos y tipos afectados por la propuesta', 'coste recaudatorio y compensación presupuestaria', 'traslación de la rebaja a precios finales'] },
    { id: 'income-tax-indexation', label: 'Deflactación del IRPF', finding: 'Deflactar ajusta umbrales nominales por inflación; para cuantificar su efecto hay que especificar ejercicio, escala estatal y autonómica, mínimos y rentas. Proponerlo es una valoración; su coste y viabilidad requieren una simulación presupuestaria, no solo una cifra de deuda.', sourceIds: [], missingDimensions: ['escala, territorio y ejercicio de IRPF', 'rentas y mínimos sujetos al ajuste', 'simulación del coste y distribución por hogares'] },
    { id: 'intergenerational-prediction', label: 'Coste entre generaciones', finding: 'Afirmar que dos o tres generaciones financiarán necesariamente todo el ajuste es una predicción. Requiere cuentas por cohorte y escenarios de salarios, empleo, impuestos, pensiones y deuda; no se demuestra prolongando una tendencia nacional.', sourceIds: [], missingDimensions: ['cohortes y horizonte temporal', 'saldo de impuestos y prestaciones por cohorte', 'escenarios de empleo, productividad y política fiscal'] },
  ],
  'broad-youth-living-housing': [
    { id: 'youth-purchase-effort', replyPriority: 10, familyId: 'youth-housing-access', familyLabel: 'Vivienda', label: 'Entrada para comprar', finding: 'La entrada estimada representa 4,7 años de salario íntegro: acredita una barrera importante, aunque no una imposibilidad universal. Es un cálculo de acceso individual; no supone que todos los jóvenes compren una vivienda media.', fallbackData: ['Entrada estimada: 66.900 €; 4,7 años de salario juvenil íntegro (Observatorio 2025)', 'Vivienda libre media: 223.000 €; salario anual joven de referencia: 14.292 € (Observatorio 2025)'], sourceIds: [youthHousing.id], population: 'juventud de referencia del Observatorio de Emancipación', denominator: 'salario individual anual; no renta del hogar', unit: 'euros y años de salario', dataKind: 'snapshot' },
    { id: 'youth-rental-effort', replyPriority: 9, familyId: 'youth-housing-access', familyLabel: 'Vivienda', label: 'Alquiler y salario', finding: 'El alquiler de una vivienda completa absorbe casi todo el salario de referencia. Compartir vivienda o disponer de otros ingresos cambia el esfuerzo; el dato no mide emigraciones evitadas.', fallbackData: ['Alquiler medio: 1.176 €/mes; 98,7 % del salario joven de referencia (Observatorio 2025)'], sourceIds: [youthHousing.id], population: 'juventud de referencia del Observatorio', denominator: 'salario individual mensual', unit: 'euros al mes y % del salario', dataKind: 'snapshot' },
  ],
};
const sources = [regularizationLaw, employmentLaw, youthHousing, convictions, digitalServices, vat];
export const supplementReviewedPacket = (packet) => {
  const criteria = [...packet.criteria.map((criterion) => ({ ...criterion, ...(updates[criterion.id] || {}) })), ...(additions[packet.id] || [])];
  const ids = new Set(criteria.flatMap((criterion) => criterion.sourceIds || []));
  return { ...packet, criteria, sources: [...packet.sources.filter((item) => ids.has(item.id)), ...sources.filter((item) => ids.has(item.id) && !packet.sources.some((existing) => existing.id === item.id))] };
};
