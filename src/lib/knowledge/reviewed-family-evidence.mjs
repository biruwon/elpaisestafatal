// Reviewed primary documents supplement criteria, never whole claim strings.
// Each addition retains its own scope and does not resolve a different measurement.
const source = (id, title, publisher, url, publishedAt) => ({ id, title, publisher, url, publishedAt, retrievedAt: '2026-09-25', role: 'primary' });
const regularizationLaw = source('regularization-law-2026', 'Real Decreto 316/2026 · arraigo extraordinario', 'BOE', 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-8284', '2026-04-15');
const employmentLaw = source('public-employment-statute', 'Estatuto Básico del Empleado Público · artículos 20, 52, 95 y 96', 'BOE', 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-11719', '2015-10-31');
const epsap2026 = source('public-administration-epsap-2026', 'Estadística del Personal al Servicio de las Administraciones Públicas · enero de 2026', 'Ministerio para la Transformación Digital y de la Función Pública', 'https://digital.gob.es/content/dam/portal-mtdfp/funcion-publica/rcp/boletin/2026_01/revision-agosto-2026/EPSAP_Enero_2026%20.pdf');
const epsapHistory = source('public-administration-epsap-history', 'Evolución de efectivos de las AAPP · 2002–2026', 'Ministerio para la Transformación Digital y de la Función Pública', 'https://digital.gob.es/content/dam/portal-mtdfp/funcion-publica/rcp/sabanas/2026/Evolucion_efectivos_AAPP_2002_a_2026.xlsx', '2026-08-01');
const youthHousing = source('cje-emancipation-2025', 'Observatorio de Emancipación 2025 · balance publicado en mayo de 2026', 'Consejo de la Juventud de España', 'https://www.cje.org/observatorio_2025/', '2026-05-26');
const youthHousing2024 = source('cje-emancipation-2024', 'Observatorio de Emancipación · primer semestre de 2024', 'Consejo de la Juventud de España', 'https://www.cje.org/observatorio1s2024/', '2025-01-16');
const imvHistoric = source('benefits-imv-historic-source', 'Nóminas del IMV · agosto de 2023 y agosto de 2024', 'Instituto Nacional de la Seguridad Social', 'https://www.seg-social.es/wps/wcm/connect/wss/7088d5a6-a490-4a01-9e31-ddb64c459123/202408_IMV%2BCOMPLETO%2BDosier%2BCA%2By%2Bprovincia.pdf?CACHEID=ROOTWORKSPACE.Z18_81D21J401P5L40QTIT61G41000-7088d5a6-a490-4a01-9e31-ddb64c459123-p6XDBII&CONVERT_TO=linktext&MOD=AJPERES', '2024-09-04');
const convictions = source('ine-convictions-2024', 'Estadística de Condenados: Adultos / Menores · 2024', 'INE', 'https://www.ine.es/dyngs/Prensa/ECAECM2024.htm', '2025-09-18');
const securityAdjusted = source('security-standardised-crime-reis', 'Tasas de condena por nacionalidad, estandarizadas por edad y sexo · España 2007–2023', 'Revista Española de Investigaciones Sociológicas', 'https://reis.cis.es/index.php/reis/article/download/2529/3257?inline=1', '2026-01-01');
const securityBalance = source('security-balance', 'Balance de Criminalidad · segundo trimestre de 2026', 'Ministerio del Interior', 'https://www.interior.gob.es/opencms/export/sites/default/.galleries/galeria-de-prensa/documentos-y-multimedia/balances-e-informes/2026/Balance-de-Criminalidad-Segundo-Trimestre-2026.pdf', '2026-08-01');
const immigrationPermitReasons = source('immigration-permit-reasons-eurostat', 'First permits by reason, length of validity and citizenship · Spain 2024', 'Eurostat', 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/migr_resfirst?geo=ES&time=2024&citizen=TOTAL&duration=TOTAL', '2025-10-01');

const digitalServices = source('digital-services-2025', 'Década Digital 2025 · servicios públicos digitales para ciudadanos', 'Ministerio para la Transformación Digital', 'https://digital.gob.es/en/comunicacion/notas-prensa/secretaria-digitalizacion-e-inteligencia-artificial/2025/06/2025-06-16', '2025-06-16');
const vat = source('aeat-vat-rates', 'Tipos impositivos de IVA · 2026', 'Agencia Tributaria', 'https://sede.agenciatributaria.gob.es/Sede/iva/calculo-iva-repercutido-clientes/tipos-impositivos-iva.html', '2026-01-01');

const updates = {
  'social-security-account': { replyPriority: 10 },
  'pension-finance-projection-series': { replyPriority: 9 },
  'public-employment-definition': {
    finding: 'El recuento oficial registra efectivos, no puestos prescindibles ni rendimiento individual; la estadística no publica un número de empleos que puedan eliminarse. La serie anual disponible marca una ruptura metodológica en 2023, por lo que no debe compararse ese salto con los años anteriores.',
    fallbackData: ['3.071.725 efectivos (enero de 2026): 1.930.273 en el sector público de las comunidades autónomas (62,84 %), 594.898 en la administración local (19,37 %) y 546.554 en el sector público estatal (17,79 %)'],
    sourceIds: [epsap2026.id, epsapHistory.id], population: 'efectivos al servicio de las administraciones públicas incluidos en EPSAP', denominator: 'recuento de efectivos', unit: 'personas', dataKind: 'observed',
  },
  'public-service-performance': { sourceIds: [] },
  'total-offences': { preferReviewedFallback: true },
  'conventional-rate': { preferReviewedFallback: true },
  'offence-trends': { preferReviewedFallback: true },
  'convicted-rate': {
    preferReviewedFallback: true,
    fallbackData: ['Tasa bruta de condenados adultos por 1.000 residentes adultos (2024): 15,7 con nacionalidad extranjera y 6,2 con nacionalidad española'],
  },
  'causal-limit': {
    preferReviewedFallback: true,
    finding: 'Las tasas brutas difieren y merecen análisis, pero no ajustan edad y sexo. Un estudio estandarizado por edad y sexo redujo la brecha 48,3 %, sin eliminarla; sus resultados tampoco prueban causalidad ni representan “nuevos españoles”.',
    fallbackData: ['Tasas estandarizadas de condena por 100.000 adultos (2007–2023): 675 entre españoles y 1.294 entre extranjeros; brecha bruta 1.197, brecha estandarizada 619 (−48,3 %)'],
    sourceIds: ['immigration-crime', securityAdjusted.id], dataKind: 'observed',
  },
  'public-service-waiting-list': {
    preferReviewedFallback: true,
    finding: 'En diciembre de 2025, la espera media del SNS fue de 102 días para primera consulta externa y 121 días para cirugía no urgente. Son dos medidas de listas de espera sanitarias; no miden todos los servicios públicos ni identifican una causa migratoria.',
    fallbackData: ['102 días de espera media para primera consulta externa hospitalaria (31-12-2025)', '84 personas por cada 1.000 en lista de espera para primera consulta (31-12-2025)', '121 días de espera media para cirugía no urgente (31-12-2025); 21,6 % llevaba más de seis meses'],
  },
  'spending-and-pensions': { preferReviewedFallback: true },
  'family-co-residence': { preferReviewedFallback: true },
  'youth-purchase-effort': { preferReviewedFallback: true },
  'youth-rental-effort': { preferReviewedFallback: true },
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
  'benefit-trend-causality': {
    finding: 'En las nóminas de agosto, los beneficiarios del IMV aumentaron entre 2023 y 2026. El crecimiento de una prestación concreta no prueba dependencia, abuso ni que la regularización lo causara.',
    fallbackData: ['Serie localizada: beneficiarios del IMV en agosto: 1.467.252 personas (2023) → 1.957.700 (2024) → 2.335.553 (2025) → 2.725.899 (2026; +16,7 % interanual)', 'Serie interanual del mismo mes: 2.335.553 personas (2025-08) → 2.725.899 personas (2026-08; +16,7 % interanual)'],
    sourceIds: [imvHistoric.id, 'benefits-imv-previous-year-source', 'benefits-imv-august-source'], population: 'personas beneficiarias del Ingreso Mínimo Vital', denominator: 'personas beneficiarias en la nómina de agosto', unit: 'personas', dataKind: 'observed',
  },
  'group-causality': {
    preferReviewedFallback: true,
    finding: 'Hay una diferencia en tasas brutas por nacionalidad: no debe ocultarse ni confundirse con causalidad. En un estudio de 2007–2023, ajustar por edad y sexo redujo la brecha de tasas de condena un 48,3 %, pero quedó una diferencia. “Nuevos españoles” no es la categoría “extranjeros”: las personas nacionalizadas cuentan como españolas. Ni las tasas ajustadas identifican por sí solas un efecto causal.',
    fallbackData: ['Nacionalidad extranjera: 15,7 condenados adultos por 1.000 residentes de 18 o más años (2024)', 'Nacionalidad española: 6,2 condenados adultos por 1.000 residentes de 18 o más años (2024)', 'Tasas estandarizadas de condena por 100.000 adultos (2007–2023): 675 entre españoles y 1.294 entre extranjeros; brecha bruta 1.197, brecha estandarizada 619 (−48,3 %)'],
    sourceIds: [convictions.id, securityAdjusted.id], population: 'adultos condenados por sentencia firme inscrita en 2024; serie 2007–2023 estandarizada por edad y sexo', denominator: '1.000 residentes adultos o 100.000 adultos, según serie', unit: 'condenados por población adulta', dataKind: 'observed',
    missingDimensions: ['delitos concretos y serie temporal por grupo comparable', 'nacionalización y país de nacimiento', 'ajuste por edad, sexo, exposición y territorio', 'diseño causal'],
  },
  'institutional-response': {
    finding: 'Sí existe actuación judicial: el INE registra sentencias firmes. El recuento no permite evaluar por sí solo rapidez, prevención, impunidad o la respuesta a cada incidente.',
    fallbackData: ['306.807 personas adultas condenadas con sentencia firme inscrita en España (2024)'], sourceIds: [convictions.id], dataKind: 'observed',
    population: 'personas adultas condenadas', denominator: 'recuento nacional', unit: 'personas',
    missingDimensions: ['tiempos de respuesta policial y judicial por delito y territorio', 'denuncias, esclarecimientos y archivo con el mismo periodo'],
  },
  'family-support-counterfactual': { sourceIds: [youthHousing.id] },
};
const additions = {
  'broad-immigration-security': [
    { id: 'security-recent-trend', familyId: 'crime-trends', familyLabel: 'Evolución delictiva', label: 'Delitos registrados', finding: 'En el balance nacional del primer semestre de 2026 el total subió ligeramente; los delitos concretos tuvieron tendencias distintas. No identifica quién causó los cambios ni lo que ocurre en cada barrio.', fallbackData: ['Infracciones penales registradas: +0,5 %; libertad sexual: +4,0 %; hurtos: −3,8 %; robos con violencia: −0,8 % (enero–junio 2026 frente a 2025)'], sourceIds: [securityBalance.id], population: 'infracciones penales registradas en España', denominator: 'mismo periodo del año anterior', unit: '% de variación interanual', dataKind: 'observed' },
  ],
  'broad-population-replacement': [
    { id: 'main-origins', familyId: 'population-composition', familyLabel: 'Composición demográfica', label: 'Principales países de nacimiento', finding: 'La estadística distingue país de nacimiento de nacionalidad actual. Los mayores grupos por país de nacimiento describen a residentes, no el motivo de llegada ni una sustitución deliberada.', fallbackData: ['Residentes nacidos fuera de España (2025): Marruecos 1.165.955; Colombia 978.041; Venezuela 692.316; Rumanía 521.181; Ecuador 468.751; Argentina 450.883; Perú 430.277'], sourceIds: ['replacement-population-source'], population: 'residentes en España por país de nacimiento', denominator: 'personas residentes', unit: 'personas', dataKind: 'observed' },
    { id: 'permit-reasons', familyId: 'population-composition', familyLabel: 'Composición demográfica', label: 'Motivos de primeros permisos', finding: 'Los primeros permisos a ciudadanos no comunitarios describen solo una parte de la migración: no incluyen movilidad dentro de la UE ni todos los tipos de llegada.', fallbackData: ['España, primeros permisos de residencia a no comunitarios (2024; 561.640): familia 258.192 (46,0 %); estudios 117.056 (20,8 %); trabajo 95.735 (17,0 %); otros 90.657 (16,1 %)'], sourceIds: [immigrationPermitReasons.id], population: 'primeros permisos de residencia concedidos a ciudadanos no comunitarios', denominator: 'total de primeros permisos en España', unit: 'permisos y %', dataKind: 'observed' },
  ],
  'broad-public-administration': [
    { id: 'public-digitalization', label: 'Actualización digital', finding: 'La existencia de servicios digitales medidos contradice una ausencia total de actualización. El indicador evalúa disponibilidad digital, no rapidez de cada trámite, productividad de empleados ni puestos sustituibles.', fallbackData: ['Servicios públicos digitales para ciudadanos: 88,75 puntos sobre 100 (informe Década Digital 2025)'], sourceIds: [digitalServices.id], population: 'servicios públicos digitales para ciudadanos evaluados en España', denominator: 'escala de 0 a 100', unit: 'puntos', dataKind: 'snapshot', missingDimensions: ['tiempos efectivos de resolución y accesibilidad por trámite', 'auditoría de tareas automatizables y resultados del servicio'] },
  ],
  'broad-tax-burden-purchasing-power': [
    { id: 'vat-policy', label: 'IVA y propuesta de rebaja', finding: 'El IVA ya diferencia productos y operaciones. Una rebaja debe especificar qué tipo cambia, su traslación a precios y la recaudación perdida; el déficit agregado no demuestra que cualquier rebaja sea inviable.', fallbackData: ['IVA general: 21 %; tipos reducidos: 10 % y 4 %; determinadas operaciones: 0 % (AEAT, consulta 2026-09-07)'], sourceIds: [vat.id], population: 'operaciones sujetas al IVA en España', denominator: 'base imponible de cada operación', unit: '% de la base imponible', dataKind: 'context', missingDimensions: ['productos y tipos afectados por la propuesta', 'coste recaudatorio y compensación presupuestaria', 'traslación de la rebaja a precios finales'] },
    { id: 'income-tax-indexation', label: 'Deflactación del IRPF', finding: 'Deflactar ajusta umbrales nominales por inflación; para cuantificar su efecto hay que especificar ejercicio, escala estatal y autonómica, mínimos y rentas. Proponerlo es una valoración; su coste y viabilidad requieren una simulación presupuestaria, no solo una cifra de deuda.', sourceIds: [], missingDimensions: ['escala, territorio y ejercicio de IRPF', 'rentas y mínimos sujetos al ajuste', 'simulación del coste y distribución por hogares'] },
    { id: 'intergenerational-prediction', label: 'Coste entre generaciones', finding: 'Afirmar que dos o tres generaciones financiarán necesariamente todo el ajuste es una predicción. Requiere cuentas por cohorte y escenarios de salarios, empleo, impuestos, pensiones y deuda; no se demuestra prolongando una tendencia nacional.', sourceIds: [], missingDimensions: ['cohortes y horizonte temporal', 'saldo de impuestos y prestaciones por cohorte', 'escenarios de empleo, productividad y política fiscal'] },
  ],
  'broad-youth-living-housing': [
    { id: 'youth-long-run-wage-rent', familyId: 'youth-income-employment', familyLabel: 'Ingresos y empleo', label: 'Salario joven y alquiler a largo plazo', finding: 'El CJE compara un aumento nominal del 10,8 % en salarios jóvenes con un 54,0 % en alquiler entre 2008 y 2024. Es evidencia de una brecha, no una comparación de renta disponible de cada hogar.', fallbackData: ['Salario joven: +10,8 %; alquiler: +54,0 % (2008–2024, nominal; Observatorio CJE 2024)'], sourceIds: [youthHousing2024.id], population: 'salario joven y precios de alquiler medidos por el Observatorio del CJE', denominator: 'variación acumulada nominal', unit: '%', dataKind: 'observed' },
    { id: 'youth-purchase-effort', replyPriority: 10, familyId: 'youth-housing-access', familyLabel: 'Vivienda', label: 'Entrada para comprar', finding: 'La entrada estimada representa 4,7 años de salario íntegro: acredita una barrera importante, aunque no una imposibilidad universal. Es un cálculo de acceso individual; no supone que todos los jóvenes compren una vivienda media.', fallbackData: ['Entrada estimada: 66.900 €; 4,7 años de salario juvenil íntegro (Observatorio 2025)', 'Vivienda libre media: 223.000 €; salario anual joven de referencia: 14.292 € (Observatorio 2025)'], sourceIds: [youthHousing.id], population: 'juventud de referencia del Observatorio de Emancipación', denominator: 'salario individual anual; no renta del hogar', unit: 'euros y años de salario', dataKind: 'snapshot' },
    { id: 'youth-rental-effort', replyPriority: 9, familyId: 'youth-housing-access', familyLabel: 'Vivienda', label: 'Alquiler y salario', finding: 'El alquiler de una vivienda completa absorbe casi todo el salario de referencia. Compartir vivienda o disponer de otros ingresos cambia el esfuerzo; el dato no mide emigraciones evitadas.', fallbackData: ['Alquiler medio: 1.176 €/mes; 98,7 % del salario joven de referencia (Observatorio 2025)'], sourceIds: [youthHousing.id], population: 'juventud de referencia del Observatorio', denominator: 'salario individual mensual', unit: 'euros al mes y % del salario', dataKind: 'snapshot' },
  ],
};
const sources = [regularizationLaw, employmentLaw, epsap2026, epsapHistory, youthHousing, youthHousing2024, imvHistoric, convictions, securityAdjusted, securityBalance, immigrationPermitReasons, digitalServices, vat];
export const supplementReviewedPacket = (packet) => {
  const criteria = [...packet.criteria.map((criterion) => ({ ...criterion, ...(updates[criterion.id] || {}) })), ...(additions[packet.id] || [])];
  const ids = new Set(criteria.flatMap((criterion) => criterion.sourceIds || []));
  return { ...packet, criteria, sources: [...packet.sources.filter((item) => ids.has(item.id)), ...sources.filter((item) => ids.has(item.id) && !packet.sources.some((existing) => existing.id === item.id))] };
};
