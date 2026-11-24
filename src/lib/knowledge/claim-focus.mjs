import { metricVocabulary } from './measurement-definitions.generated.mjs';
import { HOUSING_COMPLETION_EVIDENCE, HOUSING_SUPPLY_PRESSURE_EVIDENCE } from './housing-supply-snapshot.mjs';
import { MORTGAGE_ENTRY_VS_PAYMENT_EVIDENCE } from './mortgage-entry-snapshot.mjs';
import { UNPAID_OVERTIME_SNAPSHOT } from './unpaid-overtime-snapshot.mjs';
import { PENSION_CONTRIBUTOR_RATIO_SNAPSHOT } from './pension-contributor-ratio-snapshot.mjs';
import { RETIREMENT_AGE_SNAPSHOT } from './retirement-age-snapshot.mjs';
import { PENSION_PRIVATE_SAVINGS_SNAPSHOT } from './pension-private-savings-snapshot.mjs';
import { EDUCATION_SOCIOECONOMIC_SNAPSHOT } from './education-socioeconomic-snapshot.mjs';
import { UNIVERSITY_GRADUATE_OUTCOMES_SNAPSHOT } from './university-graduate-outcomes-snapshot.mjs';
import { RAIL_PUNCTUALITY_EVIDENCE, railPunctualityShareableReply } from './rail-punctuality-snapshot.mjs';
import { GDP_HOUSEHOLD_WELFARE_SNAPSHOT } from './gdp-household-welfare-snapshot.mjs';
import { HOUSEHOLD_BUDGET_SNAPSHOT, HOUSEHOLD_SAVING_SNAPSHOT } from './household-budget-snapshot.mjs';
import { FOOD_CHAIN_PRICE_SPREAD_EVIDENCE } from './food-chain-price-spread-snapshot.mjs';
import { ENERGY_PRICE_PASS_THROUGH_EVIDENCE } from './energy-price-pass-through-snapshot.mjs';
import { FIXED_DISCONTINUOUS_STATUS_EVIDENCE } from './fixed-discontinuous-snapshot.mjs';
import { EUROPEAN_PRICE_WAGE_CONVERGENCE_EVIDENCE } from './european-price-wage-convergence-snapshot.mjs';
import { requestedGeographyScopes } from './geography-scope.mjs';

const normalize = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const has = (text, expression) => expression.test(text);
const wages = /\b(salari\w*|sueld\w*|nomina\w*|remuner\w*|cobr\w*|pagan?)\b/;
const europeanPriceWageConvergence = (t) => /\b(espana|espanol\w*)\b/.test(t)
  && /\b(precios?|coste de (?:la )?vida|nivel de precios)\b/.test(t)
  && wages.test(t)
  && /\b(europ\w*|union europea|ue|paises? (?:mas )?ricos?|economias? (?:mas )?ricas?)\b/.test(t)
  && /\b(acerc\w*|converg\w*|equipar\w*|parec\w*|igual\w*|brecha\w*|lejos)\b/.test(t)
  && !/\b(ciudad\w*|municipio\w*|barri\w*|provincia\w*|alquil\w*|viviend\w*|casas?|pisos?)\b/.test(t);
const rents = /\b(alquil\w*|arrendam\w*|inquilin\w*|renta mensual)\b/;
const householdInflationBasketComparison = (t) => /\b(ipc|hicp|inflacion\w*|precios? de consumo|indice general(?: de precios)?)\b/.test(t)
  && /\b(aliment\w*|comid\w*|supermercad\w*|cesta de la compra)\b/.test(t)
  && (/\b(hogar\w*|familia\w*|gast\w*|cesta\w*|reflej\w*|sient\w*|experienc\w*|pes\w*|coste\w*|precios?\w*)\b/.test(t)
    || /\b(mas que|menos que|mayor que|menor que|mas de lo que|menos de lo que|por encima (?:de|del)|por debajo (?:de|del)|superior a|inferior a|frente a|respecto a|compar\w*|no reflej\w*)\b/.test(t))
  && !/\bhipotec\w*\b|\b(?:compr\w*|adquir\w*)\b.{0,35}\b(?:viviend\w*|casas?)\b|\b(?:viviend\w*|casas?)\b.{0,35}\b(?:compr\w*|adquir\w*|propiedad|propietari\w*)\b/.test(t);
const householdBudgetShareClaim = (t) => (
  /\bpresupuest\w*\b/.test(t)
  || /\b(gast\w*|consum\w*)\b.{0,35}\b(hogar\w*|famil\w*)\b/.test(t)
  || /\b(hogar\w*|famil\w*)\b.{0,35}\b(gast\w*|consum\w*)\b/.test(t))
  && /\b(viviend\w*|alquil\w*|alimentos?|comid\w*|electric\w*|gas|suministros?|servicios? basicos?|necesidades? basicas?|esenciales?)\b/.test(t)
  && !regionalWageHousingCost(t)
  && !/\b(presupuest\w*|gasto\w*) public\w*|\badministracion\w* public\w*|\bimpuest\w*\b/.test(t);
const householdSavingsCapacity = (t) => {
  const twoEarners = /\b(dos sueld\w*|dos ingres\w*|dos salari\w*|dos percept\w*|dos trabaj\w*|doble ingres\w*)\b/.test(t);
  return /\b(ahorr\w*|ahorro\w*|capacidad de ahorro|margen para ahorrar)\b/.test(t)
  && (twoEarners || /\b(hogar\w*|famil\w*|pareja\w*|ingres\w* medios?|renta media|salari\w* medios?)\b/.test(t))
  && !/\b(hipotec\w*|entrada|compr\w*|adquir\w*|compra|deposit\w*|aval\w*|primera vivienda|vivienda habitual)\b/.test(t);
};
const rentalBurden = /\b(ingres\w*|salari\w*|sueld\w*|nomina\w*|mitad|por ciento|porcentaje|esfuerzo|asequib\w*|poder alquilar|puede alquilar|puede pagar|alquilar[^.]{0,35}sol[oa]|emancip\w*|independiz\w*)\b/;
const absoluteRentAmount = /\b(cuant\w*|importe\w*|cantid\w*|cuant[ií]a\w*|euros?|eur|mensual\w*|al mes|por mes|€)\b/;
const intergenerationalHousingDistribution = (t) => !/\b(pension\w*|jubilacion\w*|jubilad\w*)\b/.test(t)
  && /\b(j[oó]ven\w*|juventud|generaci[oó]n\w*|boomers?|mayor(?:es)?|nacid\w* entre)\b/.test(t)
  && /\b(viviend\w*|casas?|pisos?|alquil\w*|arrendam\w*|inquilin\w*|propietari\w*|arrendador\w*|casero\w*)\b/.test(t)
  && (/\b(transfer\w*|transfier\w*|transfi\w*|desigual\w*|concentr\w*|distribu\w*|acumul\w*|patrimoni\w*|riqueza|repart\w*)\b/.test(t)
    || /\b(pag\w*|entreg\w*)\b[\s\S]{0,80}\b(a|hacia)\b[\s\S]{0,40}\b(generaci[oó]n\w*|propietari\w*|arrendador\w*|casero\w*|due[nñ]o\w*|mayor(?:es)?)\b/.test(t)
    || /\b(compr\w*|adquir\w*)\b[\s\S]{0,60}\b(barat\w*|car\w*)\b/.test(t));
const mortgageEntryVsPayment = (t) => /\b(entrada|ahorro previo|ahorro inicial|pago inicial|aportacion inicial|recursos iniciales|riqueza disponible)\b/.test(t)
  && /\b(cuota\w*|mensualidad\w*|pago mensual|capacidad de pago|pagos regulares)\b/.test(t)
  && /\b(viviend\w*|hipotec\w*|compr\w*|adquir\w*)\b/.test(t)
  && /\b(mas|mayor\w*|menor\w*|principal|superior\w*|inferior\w*|igual\w*|compar\w*|frente a|no es|sino)\b/.test(t)
  && !/\b(caus\w*|provoc\w*|gener\w*|impid\w*|evit\w*|responsable|por culpa|reduce\w*|aument\w*)\b/.test(t);
const subjectiveFinancialStrain = (t) => /\b(fin(?:al)? de mes|gastos? habituales?|cubrir (?:los )?gastos?|llegar a fin|no llega para vivir|no alcanza para vivir|pobrez\w* subjetiv\w*)\b/.test(t)
  && !/\b(trabaj\w*|emple\w*|ocupad\w*|jornada|umbral|salari\w*|sueld\w*)\b/.test(t)
  && (!/\bpobrez\w*/.test(t) || /\bpobrez\w* subjetiv\w*/.test(t))
  && !/\b(cada vez|desde (?:19|20)\d{2}|entre (?:19|20)\d{2}|empeor\w*|aument\w*|sub(?:e|i)\w*|encarec\w*|inflaci\w*|precios)\b/.test(t);
const migrationPopulation = /\b(inmigr\w*|migr\w*|extranjer\w*|nacid\w* fuera|nacid\w* en el extranjero|personas de origen extranjero|ciudadania extranjera|nacionalidad extranjera|ciudadan\w* europea|nacionalidad europea|ciudadan\w* de (?:otro pais|otros paises) (?:de )?(?:la )?(?:ue|union europea)|nacionalidad de otro pais (?:de )?(?:la )?(?:ue|union europea))\b/;
const migrationCredentialRecognition = (t) => migrationPopulation.test(t)
  && /\b(titul\w*|estudios? (?:superiores?|universitarios?)|cualific\w*|formacion|sobrecualific\w*)\b/.test(t)
  && /\b(homolog\w*|reconoc\w*|convalid\w*|revalid\w*|equivalen\w*|sobrecualific\w*|por debajo|inferior\w*|desajust\w*|desencaj\w*|baja cualificaci\w*|trabaj\w*[^.]{0,45}(?:formacion|titulaci\w*|cualificaci\w*)|acab\w*[^.]{0,45}(?:emple\w*|puesto\w*))\b/.test(t)
  && !/\b(fiscal\w*|impuest\w*|recaud\w*|tribut\w*|cotiz\w*)\b/.test(t)
  && !healthcareWorkforceCausality(t);
const migrationOverqualification = (t) => migrationPopulation.test(t)
  && (/\bsobrecualific\w*\b/.test(t)
    || /\b(titul\w*|estudios? (?:superiores?|universitarios?|terciarios?)|educacion (?:superior|terciaria)|universitari\w*)\b/.test(t)
      && /\b(?:ocupacion\w*|puesto\w*|empleo\w*)[\s\w]{0,40}\b(?:menor\w*|inferior\w*|baj\w*)\b[\s\w]{0,25}\b(?:cualific\w*|nivel|estudios?)\b/.test(t))
  && !/\b(homolog\w*|reconoc\w*|convalid\w*|revalid\w*|equivalen\w*)\b/.test(t);
const migrationFiscalContribution = (t) => migrationPopulation.test(t)
  && /\b(fiscal\w*|impuest\w*|hacienda|recaud\w*|tribut\w*|cotiz\w*|contribucion\w*|arcas? publicas|cuentas? publicas|presupuest\w*|gasto publico)\b/.test(t)
  && /\b(aport\w*|contribu\w*|net\w*|balance\w*|pag\w*|recib\w*|cost\w*|benefici\w*|mas|menos|cualific\w*|salari\w*|sueld\w*|ingres\w*|cotiz\w*)\b/.test(t)
  && !/\b(?:edad (?:legal )?de jubilacion|edad ordinaria de jubilacion|jubilarse a los 67|trabajar hasta los 67)\b/.test(t);
const migrationWageEffects = (t) => migrationPopulation.test(t)
  && /\b(inmigracion|llegad\w*.{0,35}\b(?:mano de obra|trabajador\w*|personas?)\b|entrad\w*.{0,35}\b(?:mano de obra|trabajador\w*|personas?)\b|oferta de mano de obra extranjera)\b/.test(t)
  && /\b(salari\w*|sueld\w*|nomina\w*|remuner\w*|ingres\w*|cobr\w*|gan\w*)\b/.test(t)
  && /\b(presion\w*|conteng\w*|contener|baj\w*|reduc\w*|afect\w*|compar\w*|menor\w*|mayor\w*|diferenc\w*|mas|menos|a la baja|por debajo)\b/.test(t)
  && /\b(sector\w*|poblacion nativa|trabajador\w* nativ\w*|emplead\w* nativ\w*|trabajador\w* local\w*|resto de trabajador\w*|otro\w* trabajador\w*|otra\w* persona\w*)\b/.test(t)
  && !/\b(fiscal\w*|impuest\w*|recaud\w*|tribut\w*|cotiz\w*)\b/.test(t);
const unemploymentWagePressure = (t) => !migrationPopulation.test(t)
  && /\b(paro|desemple\w*|desocupad\w*|exceso de mano de obra|oferta de trabajadores|candidat\w*|demandantes? de empleo|abundancia de trabajadores|muchos aspirantes)\b/.test(t)
  && /\b(salari\w*|sueld\w*|nomina\w*|remuner\w*|pagan?|cobr\w*|wage\w*)\b/.test(t)
  && /\b(permit\w*|mantener|ofrec\w*|press\w*|presion\w*|negoci\w*|fren\w*|baj\w*|reduc\w*|contener|limitar|debilit\w*|menos|sub\w*|aument\w*)\b/.test(t);
const fixedDiscontinuousEmploymentStatus = (t) => /\b(fij\w* discontinu\w*|contrat\w* fij\w* discontinu\w*|indefinid\w* fij\w* discontinu\w*)\b/.test(t)
  && /\b(paro|desemple\w*|ocupad\w*|inactiv\w*|sin actividad|actividad|trabaj\w*|temporad\w*|campan\w*|prestaci\w*|subsid\w*|estadistic\w*|epa|contabiliz\w*|escond\w*|ocult\w*|encubiert\w*|maquill\w*|cuant\w*|numero\w*|recuento\w*)\b/.test(t)
  && !/\b(salari\w*|sueld\w*|nomina\w*|remuner\w*|jornada\w*|horas? extra\w*)\b/.test(t)
  && !/\b(puedo|tengo derecho|solicitar|tramitar|como cobro)\b/.test(t);
const localSafetyTrend = (t) => {
  const safetyClaim = t.replace(/\bseguridad social\b/g, '');
  return !migrationPopulation.test(t)
    && /\b(barri\w*|calle\w*|zona\w*|municip\w*|localidad\w*|distrit\w*|vecindari\w*|entorno\w*|puebl\w*|ciudad\w*|por aqui|cerca de mi casa)\b/.test(t)
    && /\b(delincuenc\w*|criminal\w*|crimen\w*|delit\w*|insegur\w*|segur\w*|violenc\w*|robo\w*|hurt\w*|agresi\w*|asalto\w*|acuchill\w*|paliza\w*|homicid\w*|asesinat\w*|peligros\w*)\b/.test(safetyClaim)
    && /\b(sub\w*|aument\w*|crec\w*|empeor\w*|mejor\w*|peor\w*|deterior\w*|dispar\w*|increment\w*|vari\w*|descend\w*|baj\w*|reduc\w*|disminu\w*|cambi\w*|evoluci\w*|tendenci\w*|cada vez|mas|menos|desde hace|este mes|estas semanas|ultim\w* dias?)\b/.test(t);
};
const localSafetyMeasurementEvidence = {
  directClaimEvidence: false,
  expiresAt: '2027-01-31', territories: ['ES'],
  evidenceLabel: 'Alcance de las fuentes oficiales sobre delitos registrados y percepción de inseguridad',
  dimensions: {
    subject: 'delitos registrados por la policía y percepción vecinal de problemas de delincuencia o vandalismo; son medidas diferentes',
    population: 'Interior: hechos comunicados por los cuerpos policiales que informan al Sistema Estadístico de Criminalidad; INE: personas representadas por la Encuesta de Condiciones de Vida',
    period: 'Interior: enero–junio de 2026 frente al mismo periodo de 2025; INE: 2023, en un módulo de vivienda trienal',
    geography: 'Interior: España y municipios de más de 20.000 habitantes; INE: España, comunidades autónomas y grados de urbanización',
    denominator: 'Interior: recuento de infracciones registradas; INE: población que declara problemas en la zona donde habita',
    unit: 'número de infracciones y porcentaje de población, respectivamente; no son indicadores intercambiables',
  },
  facts: [
    'El Balance trimestral del Ministerio compara enero–junio de 2026 con el mismo periodo de 2025 y cuenta delitos comunicados por los cuerpos policiales que informan al sistema. Publica recuentos, no tasas por habitante, por tipo y en 433 municipios con más de 20.000 habitantes; son provisionales y no se desglosan por barrio ni mes.',
    'La Encuesta de Condiciones de Vida del INE pregunta si hay delincuencia o vandalismo en la zona de la vivienda. Su último dato es de 2023 y desde 2021 se recoge cada tres años. Mide el porcentaje de población que declara problemas, no delitos registrados; no ofrece datos por barrio ni mes.',
  ],
  factSourceIds: [
    ['interior-criminality-balance-2026-q2'],
    ['ine-neighbourhood-crime-perception-ecv-2023'],
  ],
  factDimensions: [
    {
      subject: 'infracciones penales registradas',
      population: 'hechos comunicados por los cuerpos policiales que informan al Sistema Estadístico de Criminalidad',
      period: 'enero–junio de 2026 frente a enero–junio de 2025',
      geography: 'España: comunidades autónomas, provincias, capitales y 433 municipios de más de 20.000 habitantes',
      denominator: 'recuento de infracciones registradas; no es una tasa por población',
      unit: 'número de infracciones',
    },
    {
      subject: 'personas que declaran problemas de delincuencia o vandalismo en la zona donde habitan',
      population: 'personas representadas por la Encuesta de Condiciones de Vida',
      period: '2023; desde 2021, módulo de vivienda con periodicidad trienal',
      geography: 'España, comunidades autónomas y grados de urbanización',
      denominator: 'población total',
      unit: 'porcentaje de población',
    },
  ],
  sources: [
    { id: 'interior-criminality-balance-2026-q2', title: 'Balance de Criminalidad · segundo trimestre de 2026', publisher: 'Ministerio del Interior', url: 'https://www.interior.gob.es/opencms/export/sites/default/.galleries/galeria-de-prensa/documentos-y-multimedia/balances-e-informes/2026/Balance-de-Criminalidad-Segundo-Trimestre-2026.pdf', retrievedAt: '2026-11-17', role: 'primary' },
    { id: 'ine-neighbourhood-crime-perception-ecv-2023', title: 'Delincuencia o vandalismo en la zona · Indicadores de calidad de vida', publisher: 'INE', url: 'https://www.ine.es/ss/Satellite?L=es_ES&c=INESeccion_C&cid=1259944569502&p=1254735110672%3B&pagename=ProductosYServicios%2FPYSLayout&param1=PYSDetalleFichaIndicador&param3=1259937499084', retrievedAt: '2026-11-17', role: 'primary' },
  ],
};
const residentialDisplacementEvidence = {
  directClaimEvidence: false,
  expiresAt: '2027-10-18',
  territories: ['ES'],
  evidenceLabel: 'Alcance del Atlas de Distribución de Renta de los Hogares del INE',
  dimensions: {
    subject: 'indicadores agregados de renta y características demográficas por zona; no identifican desplazamientos individuales ni su motivo',
    population: 'población residente en viviendas familiares incluida en el Atlas del INE',
    period: 'renta de 2024 y población de referencia a 1 de enero de 2025; edición publicada el 19 de octubre de 2026',
    geography: 'España: municipios, distritos y secciones censales',
    denominator: 'depende del indicador de renta; no hay un denominador de desplazamiento residencial',
    unit: 'indicadores de renta y demografía; no mide salidas forzadas ni sus causas',
  },
  facts: [
    'La edición 2024 del Atlas del INE, publicada el 19 de octubre de 2026, ofrece indicadores de renta y demografía por municipio, distrito y sección censal. Describe áreas; no mide la expulsión de residentes.',
    'Para la renta de 2024, la población de referencia son residentes en viviendas familiares a 1 de enero de 2025. Los resultados no identifican quién se mudó, si fue forzado ni por qué.',
  ],
  factSourceIds: [
    ['ine-household-income-atlas-2024'],
    ['ine-household-income-atlas-methodology-2025'],
  ],
  factDimensions: [
    {
      subject: 'indicadores agregados de renta y demografía',
      population: 'población residente en viviendas familiares',
      period: 'edición 2024; publicada el 19 de octubre de 2026',
      geography: 'municipios, distritos y secciones censales de España',
      denominator: 'varía según el indicador; no es un recuento de residentes desplazados',
      unit: 'indicadores de renta y demografía',
    },
    {
      subject: 'renta anual vinculada a población residente de referencia',
      population: 'población residente en viviendas familiares registrada en el Fichero Precensal de Población',
      period: 'renta de 2024; población a 1 de enero de 2025',
      geography: 'territorio nacional, con resultados por municipios, distritos y secciones censales',
      denominator: 'población residente incluida en el Atlas; no identifica flujos individuales de salida',
      unit: 'indicadores de renta y población',
    },
  ],
  sources: [
    { id: 'ine-household-income-atlas-2024', title: 'Atlas de Distribución de Renta de los Hogares · Año 2024', publisher: 'INE', url: 'https://www.ine.es/experimental/atlas/experimental_atlas.htm/', retrievedAt: '2026-11-23', role: 'primary' },
    { id: 'ine-household-income-atlas-methodology-2025', title: 'Metodología del Atlas de Distribución de Renta de los Hogares · Octubre de 2025', publisher: 'INE', url: 'https://www.ine.es/metodologia/metodologia_adrh.pdf', retrievedAt: '2026-11-23', role: 'primary' },
  ],
};
const healthcareWorkforceCausality = (t) => /\b(medic\w*|facultativ\w*|enfermer\w*|personal sanitario|profesional\w* sanitari\w*)\b/.test(t)
  && /\b(falt\w*|escasez|deficit|poc\w*|insuficient\w*)\b/.test(t)
  && /\b(condicion\w*|t[ií]tul\w*|graduad\w*|homolog\w*|plantilla|vacantes?|plazas?|zonas?|puebl\w*|rural\w*|capital\w*|provinci\w*|territorio|distribuci\w*)\b/.test(t);
const specialistOutpatientComparisonRows = [
  { geography: 'Andalucía', aliases: [], value: 136 },
  { geography: 'Aragón', aliases: [], value: 138 },
  { geography: 'Asturias', aliases: ['Principado de Asturias'], value: 103 },
  { geography: 'Baleares', aliases: ['Islas Baleares', 'Illes Balears'], value: 71 },
  { geography: 'Canarias', aliases: ['Islas Canarias'], value: 162 },
  { geography: 'Cantabria', aliases: [], value: 61 },
  { geography: 'Castilla y León', aliases: ['Castilla León'], value: 102 },
  { geography: 'Castilla-La Mancha', aliases: ['Castilla La Mancha'], value: 64 },
  { geography: 'Cataluña', aliases: ['Catalunya'], value: 120 },
  { geography: 'Comunidad Valenciana', aliases: ['Comunitat Valenciana'], value: 95 },
  { geography: 'Extremadura', aliases: [], value: 112 },
  { geography: 'Galicia', aliases: [], value: 63 },
  { geography: 'la Comunidad de Madrid', aliases: ['Madrid', 'Comunidad de Madrid'], value: 68 },
  { geography: 'la Región de Murcia', aliases: ['Murcia', 'Región de Murcia'], value: 89 },
  { geography: 'Navarra', aliases: ['Comunidad Foral de Navarra'], value: 152 },
  { geography: 'País Vasco', aliases: ['Euskadi'], value: 49 },
  { geography: 'La Rioja', aliases: [], value: 32 },
  { geography: 'Ceuta', aliases: ['Ciudad Autónoma de Ceuta'], value: 72 },
  { geography: 'Melilla', aliases: ['Ciudad Autónoma de Melilla'], value: 16 },
];
const specialistOutpatientRegionalWaits = (t) => {
  const namedRegionalPairComparison = (() => {
    const aliases = specialistOutpatientComparisonRows.flatMap((row) => [row.geography, ...row.aliases]
      .map((alias) => ({ row, alias: normalize(alias) })))
      .sort((left, right) => right.alias.length - left.alias.length);
    const rowByAlias = new Map(aliases.map((item) => [item.alias, item.row]));
    const pattern = aliases.map(({ alias }) => alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const mentions = [...t.matchAll(new RegExp(`\\b(${pattern})\\b`, 'g'))];
    if (mentions.length !== 2) return false;
    const first = mentions[0];
    const second = mentions[1];
    if (rowByAlias.get(first[1]) === rowByAlias.get(second[1])) return false;
    const comparatorContext = t.slice(Math.max(0, first.index - 45), second.index + second[0].length);
    const hasDirection = /\b(mas|mayor|superior|menos|menor|inferior|larg\w*|cort\w*)\b/.test(comparatorContext);
    const linksEntities = /\b(que|frente|contra|versus|vs)\b/.test(t.slice(first.index + first[0].length, second.index));
    return hasDirection && linksEntities;
  })();
  const wait = /\blistas? de espera\b/.test(t)
    || /\b(espera\w*|demora\w*)\b/.test(t) && /\b(consultas? externas?|atencion especializada|especialistas?|sanidad|salud|medic\w*|hospital\w*)\b/.test(t);
  const regionalComparison = namedRegionalPairComparison || (/\b(comunidades? autonomas?|ccaa|region(?:es)?|regional\w*|territorios?)\b/.test(t)
    && /\b(vari\w*|cambi\w*|diferenc\w*|desigual\w*|compar\w*|mayor\w*|menor\w*|mas|menos|brecha\w*)\b/.test(t));
  const incompatibleService = /\b(atencion primaria|medic\w* de (?:familia|cabecera)|cirug\w*|quirurg\w*|operacion\w*|urgencias?|pruebas? diagnosticas?|codigo postal|municipio\w*|barrio\w*|hospital\w* concret\w*|privad\w*|trenes?|ferroviar\w*|autobuses?|transporte|licencias?|administrativ\w*)\b/.test(t);
  const causalOrTrend = /\b(caus\w*|provoc\w*|empuj\w*|oblig\w*|porque|debido|por culpa|se debe|responsab\w*|consecuencia|falta de (?:medic\w*|personal sanitario|profesional\w* sanitari\w*)|desde (?:19|20)\d{2}|desde la pandemia|desde hace|cada vez|cada a[nñ]o|a lo largo|ultim\w* a[nñ]os|serie temporal|tendencia|aument\w*|crec\w*|baj\w*|disminu\w*|evoluci\w*)\b/.test(t);
  const specificSpecialty = /\b(dermatolog\w*|traumatolog\w*|oftalmolog\w*|neurolog\w*|cardiolog\w*|ginecolog\w*|urolog\w*|digestiv\w*|otorrinolaringolog\w*|especialidades?)\b/.test(t);
  const specificTerritory = /\b(andalucia|aragon|asturias|baleares|canarias|cantabria|castilla(?: y leon| la mancha)?|cataluna|extremadura|galicia|madrid|murcia|navarra|pais vasco|rioja|ceuta|melilla|valencia)\b/.test(t);
  const years = [...t.matchAll(/\b20\d{2}\b/g)].map(([year]) => year);
  return wait && regionalComparison && !incompatibleService && !causalOrTrend && !specificSpecialty && (!specificTerritory || namedRegionalPairComparison)
    && (!years.length || years.every((year) => year === '2025'));
};
const specialistOutpatientWaitEvidence = {
  expiresAt: '2027-03-24', territories: ['ES', ...specialistOutpatientComparisonRows.flatMap((row) => [row.geography, ...row.aliases].map(normalize))],
  comparisonRows: specialistOutpatientComparisonRows,
  evidenceLabel: 'Demoras registradas en consultas externas del SNS',
  dimensions: {
    subject: 'espera media de pacientes en listas estructurales de consultas externas del SNS, agregada en diez especialidades',
    population: 'pacientes registrados en listas estructurales de espera de consultas externas del SNS',
    period: '2025-12-31', geography: 'España: comunidades autónomas y ciudades autónomas',
    denominator: 'pacientes registrados en la lista estructural de consultas externas de cada territorio', unit: 'días de espera media',
  },
  facts: [
    'A 31 de diciembre de 2025, la espera media total de consultas externas registrada por el SNS iba de 16 días en Melilla a 162 días en Canarias. El informe presenta el total de diez especialidades para cada territorio.',
    'El Ministerio indicó el 24 de septiembre de 2026 que los datos de diciembre de 2025 eran los últimos disponibles y publicó el informe rectificado tras revisar la información de Castilla-La Mancha.',
  ],
  sources: [
    { id: 'sisle-sns-regional-consultations-dec-2025', title: 'Listas de espera del SNS: datos por comunidades autónomas, diciembre de 2025 (rectificado)', publisher: 'Ministerio de Sanidad', url: 'https://www.sanidad.gob.es/ca/estadEstudios/estadisticas/inforRecopilaciones/docs/LISTAS_PUBLICACION_Dic_2025_rectificado.pdf', publishedAt: '2026-09-24', retrievedAt: '2026-11-23' },
    { id: 'sisle-sns-latest-data', title: 'Sistema de Información de Listas de Espera del SNS: últimos datos disponibles', publisher: 'Ministerio de Sanidad', url: 'https://www.sanidad.gob.es/estadEstudios/estadisticas/inforRecopilaciones/listaEspera.htm', retrievedAt: '2026-11-23' },
  ],
};
const bankSpainRentEffortSource = {
  id: 'bank-spain-housing-annual-2025',
  title: 'Informe Anual 2025 · esfuerzo del alquiler y acceso a la vivienda',
  publisher: 'Banco de España',
  url: 'https://www.bde.es/f/webbe/SES/Secciones/Publicaciones/PublicacionesAnuales/InformesAnuales/25/InfAnual_2025.pdf',
  publishedAt: '2026-06-18',
  retrievedAt: '2026-11-16',
  role: 'primary',
};
const cjeEmancipation2025Source = { id: 'cje-emancipation-2025', title: 'Observatorio de Emancipación 2025 · balance publicado en mayo de 2026', publisher: 'Consejo de la Juventud de España', url: 'https://www.cje.org/ca/observatorio_2025/', publishedAt: '2026-05-26', retrievedAt: '2026-11-17', role: 'primary' };
const cjeEmancipationMethodologySource = { id: 'cje-emancipation-methodology', title: 'Observatorio de Emancipación · población joven y alcance', publisher: 'Consejo de la Juventud de España', url: 'https://www.cje.org/observatorio-de-emancipacion/', retrievedAt: '2026-11-17', role: 'primary' };
const ineHousingBarrierSource = { id: 'youth-family-housing-ine', title: 'Encuesta de Condiciones de Vida 2025 · dificultades de acceso a la vivienda', publisher: 'INE', url: 'https://www.ine.es/dyngs/Prensa/es/m3ECV2025.htm', publishedAt: '2026-04-27', retrievedAt: '2026-11-17', role: 'primary' };
const foreignHousingRegistrySource = { id: 'registradores-eri-2026-q3-foreign-purchases', title: 'Estadística Registral Inmobiliaria · tercer trimestre de 2026', publisher: 'Colegio de Registradores de España', url: 'https://www.registradores.org/documents/d/guest/eri_3t_2026', retrievedAt: '2026-11-17', role: 'primary' };
const foreignNewBuildRegistrySource = { id: 'registradores-eri-anuario-2025', title: 'Estadística Registral Inmobiliaria · Anuario 2025', publisher: 'Colegio de Registradores de la Propiedad, Bienes Muebles y Mercantiles de España', url: 'https://www.registradores.org/documents/d/guest/eri-anuario-2025', publishedAt: '2026', retrievedAt: '2026-11-24', role: 'primary' };
const foreignNewBuildEvidence = {
  expiresAt: '2027-05-31',
  territories: ['ES'],
  evidenceLabel: 'Compras de vivienda nueva por nacionalidad del comprador · España, 2025',
  dimensions: {
    subject: 'compraventas registradas según la nacionalidad del comprador y si la vivienda era nueva o usada',
    population: 'compraventas inscritas en el Registro de la Propiedad; compradores clasificados como de nacionalidad extranjera o nacional',
    period: '2025',
    geography: 'España',
    denominator: '13,82 %: total de compraventas registradas; 21,54 % y 21,76 %: compras dentro de cada grupo de nacionalidad',
    unit: 'porcentaje de compraventas',
  },
  facts: [
    'En 2025, el 13,82 % de las compraventas de vivienda registradas en España correspondió a compradores de nacionalidad extranjera.',
    'Dentro de cada grupo, la vivienda nueva representó el 21,54 % de las compras de extranjeros y el 21,76 % de las compras de nacionales. Son porcentajes sobre las compras de cada grupo; no indican qué parte de todas las viviendas nuevas se vendió a extranjeros.',
  ],
  factSourceIds: [['registradores-eri-anuario-2025'], ['registradores-eri-anuario-2025']],
  factDimensions: [
    {
      subject: 'compraventas de vivienda registradas por nacionalidad del comprador',
      population: 'compras inscritas en España durante 2025',
      period: '2025', geography: 'España',
      denominator: 'total de compraventas registradas', unit: 'porcentaje',
    },
    {
      subject: 'proporción de compras de vivienda nueva dentro de cada grupo de compradores',
      population: 'compradores de nacionalidad extranjera o nacional en las compraventas inscritas',
      period: '2025', geography: 'España',
      denominator: 'compraventas del grupo de nacionalidad correspondiente', unit: 'porcentaje',
    },
  ],
  sources: [foreignNewBuildRegistrySource],
};
const foreignHousingPurchaseEvidence = {
  expiresAt: '2027-03-31',
  territories: ['ES'],
  evidenceLabel: 'Compras de vivienda por nacionalidad y límite sobre residencia',
  dimensions: {
    subject: 'compraventas de vivienda registradas según la nacionalidad del comprador',
    population: 'compraventas de vivienda inscritas; la residencia habitual del comprador no se identifica',
    period: '2026-T3',
    geography: 'España y provincias',
    denominator: 'compraventas de vivienda registradas en cada territorio',
    unit: 'porcentaje de compraventas',
  },
  facts: [
    'En el tercer trimestre de 2026, el 16,05 % de las compraventas de vivienda registradas en España tuvo compradores de nacionalidad extranjera; en Alicante fue el 46,46 % y en Málaga, el 38,83 %.',
    'El Colegio de Registradores clasifica por nacionalidad. Como la residencia no consta en la escritura, no puede separar a residentes de no residentes.',
  ],
  sources: [foreignHousingRegistrySource],
};
const unemploymentWagePressureEvidence = {
  expiresAt: '2027-11-17',
  territories: ['ES'],
  evidenceLabel: 'Estudios históricos sobre desempleo local y respuesta salarial',
  dimensions: {
    subject: 'respuesta estimada de los salarios a cambios en el desempleo y al ciclo económico',
    population: 'trabajadores del metal en España e Italia para el estudio sectorial; historiales laborales administrativos de trabajadores en España para el estudio agregado',
    period: '2005–2013 (estudio del metal); 1987–2013 (estudio agregado de España)',
    geography: 'España; el estudio sectorial también incluye Italia',
    denominator: 'estimaciones de cambios salariales asociados a variaciones de la tasa de desempleo; no es una proporción de trabajadores afectados',
    unit: 'respuesta salarial estimada ante cambios de 1 punto porcentual en desempleo, y diferencias de sensibilidad por fase del ciclo',
  },
  facts: [
    'Entre trabajadores del metal en España e Italia (2005–2013), 1 punto porcentual más de desempleo local se asoció con 0,45 puntos porcentuales menos en el salario medio contemporáneo.',
    'En historiales laborales administrativos de España (1987–2013), la respuesta del salario real al ciclo fue débil: en recesión, más paro no produjo ajustes adicionales; quienes acababan de entrar al empleo fueron más sensibles que quienes llevaban más de seis años.',
  ],
  sources: [
    { id: 'bde-wp-2036-unemployment-wage-setting', title: 'Wage determination and the bite of collective contracts in Italy and Spain · Working Paper 2036', publisher: 'Banco de España', url: 'https://www.bde.es/wbe/en/publicaciones/analisis-economico-investigacion/documentos-trabajo/wage-determination-and-bite-collective-contracts-italy-and-spain-evidence-from-metal-working-industry.html', publishedAt: '2020-12-23', retrievedAt: '2026-11-17', role: 'primary' },
    { id: 'bde-wp-1504-real-wage-cyclicality', title: 'Real wage responsiveness to unemployment in Spain: asymmetries along the business cycle · Working Paper 1504', publisher: 'Banco de España', url: 'https://www.bde.es/wbe/en/publicaciones/analisis-economico-investigacion/documentos-trabajo/real-wage-responsiveness-to-unemployment-spain-asymmetries-along-business-cycle.html', publishedAt: '2015-02-19', retrievedAt: '2026-11-17', role: 'primary' },
  ],
};
const eurostatOverqualificationEvidence = {
  expiresAt: '2027-11-16', territories: ['ES'],
  facts: ['La tasa de sobrecualificación de Eurostat se calcula entre personas ocupadas de 20 a 64 años con educación terciaria que trabajan en ocupaciones ISCO 4–9. El denominador son las personas ocupadas con educación terciaria del grupo correspondiente; la tabla permite desglosar por ciudadanía.'],
  sources: [{ id: 'eurostat-overqualification-by-citizenship', title: 'Over-qualification rates by citizenship · Eurostat (lfsa_eoqgan)', publisher: 'Eurostat', url: 'https://ec.europa.eu/eurostat/databrowser/view/lfsa_eoqgan/default/table?lang=en', retrievedAt: '2026-11-16' }],
};
const bankSpainRentEffortEvidence = {
  expiresAt: '2027-06-18',
  territories: ['ES'],
  when: (claim) => {
    const years = [...claim.matchAll(/\b20\d{2}\b/g)].map(([year]) => year);
    const asksYouthOrSubgroup = /\b(j[oó]ven\w*|juventud|menores? de \d+|mujeres?|hombres?|por sexo|por g[eé]nero)\b/.test(claim);
    const asksTrendOrCause = /\b(evoluci[oó]n|cada vez|desde (?:19|20)\d{2}|entre \d{4} y \d{4}|subid\w*|aument\w*|crec\w*|duplic\w*|triplic\w*|caus\w*|provoc\w*|debido|por culpa|responsable)\b/.test(claim);
    return !asksYouthOrSubgroup && !asksTrendOrCause && (!years.length || years.every((year) => year === '2024'));
  },
  facts: [
    'En 2024, los hogares que ya vivían de alquiler destinaban de media el 26,7 % de su renta neta al alquiler en España. En seis grandes ciudades, el promedio fue: Madrid 31,6 %, Barcelona 32,4 %, València 30,2 %, Sevilla 31,3 %, Zaragoza 24,1 % y Málaga 34,5 %.',
    'El indicador compara el alquiler medio de la sección censal con la renta neta media de los hogares arrendatarios. No es el sueldo individual ni el precio anunciado de un piso concreto.',
  ],
  sources: [bankSpainRentEffortSource],
};
const touristHousingMention = (text) => /\b(?:viviend\w*|piso\w*|apartament\w*|alojamiento\w*|alquiler\w*)\s+(?:de uso\s+)?(?:turistic\w*|vacacional\w*)\b/.test(text)
  || /\b(?:turistic\w*|vacacional\w*)\s+(?:viviend\w*|piso\w*|apartament\w*|alojamiento\w*|alquiler\w*)\b/.test(text)
  || /\b(?:viviend\w*|pisos?|apartament\w*|alojamientos?|alquiler\w*)\b[\s\w]{0,24}\bturistic\w*\b/.test(text)
  || /\b(?:viviend\w*|pisos?|apartament\w*|alojamientos?)\s+de\s+airbnb\b/.test(text);
const touristHousingRegistrationQuestion = (text) => touristHousingMention(text)
  && /\b(licenciad\w*|licencia\w*|registrad\w*|registro\w*|inscripci\w*|inscrit\w*|legalizad\w*)\b/.test(text);
const touristHousingCountQuestion = (text) => touristHousingMention(text)
  && /\b(cuant\w*|numero|cantidad|total de|recuento)\b/.test(text)
  && !/\b(porcent\w*|proporcion|cuota|parte del parque|de cada|airbnb|apartament\w*)\b/.test(text);
const touristHousingShareQuestion = (text) => touristHousingMention(text)
  && /\b(porcent\w*|proporcion|cuota|parte del parque|de cada|represent\w*)\b/.test(text)
  && !/\b(airbnb|apartament\w*)\b/.test(text);
const touristHousingDisplacementClaim = (text) => touristHousingMention(text)
  && /\b(retir\w*|reduc\w*|disminu\w*|quit\w*|sac\w*|desplaz\w*|expuls\w*|rest\w*|oferta|disponib\w*|escasez|alquiler residencial|alquiler de larga duracion|vivienda disponible|viviendas? en alquiler|stock de alquiler)\b/.test(text);
const tourismUrbanHousingCostPressure = (text) => {
  const mentionsTourism = /\b(turism\w*|turistic\w*|vacacional\w*)\b/.test(text) || touristHousingMention(text);
  const mentionsResidentHousing = /\b(viviend\w*|alquil\w*|arrendam\w*|resident\w*|hogar\w*|centro\w*|barri\w*|asequib\w*|lujo|gentrific\w*)\b/.test(text);
  const mentionsCostOrAffordability = /\b(coste\w*|costo\w*|precio\w*|car\w*|alquil\w*|encarec\w*|asequib\w*|inasequib\w*|lujo|gentrific\w*|presion\w*)\b/.test(text);
  const mentionsCausalPressure = /\b(caus\w*|provoc\w*|hech\w*|hace que|hizo que|convierte|transform\w*|encarec\w*|aument\w*|sub\w*|eleva\w*|empuj\w*|expuls\w*|desplaz\w*|presion\w*|impact\w*|masiv\w*)\b/.test(text);
  const hotelRoomClaim = /\b(hotel\w*|habitacion\w*)\b/.test(text)
    && !/\b(viviend\w*|resident\w*|hogar\w*|alquiler residencial|arrendamiento residencial|vivienda habitual)\b/.test(text);
  return mentionsTourism && mentionsResidentHousing && mentionsCostOrAffordability && mentionsCausalPressure
    && !hotelRoomClaim && !touristHousingDisplacementClaim(text);
};
const residentialGentrificationDisplacement = (text) => {
  const mentionsResidents = /\b(resident\w*|vecin\w*|habitantes?|poblacion local|hogares?|quienes (?:ya )?viv\w*|personas que (?:ya )?viv\w*|gente que (?:ya )?viv\w*)\b/.test(text);
  const mentionsDisplacement = /\b(expuls\w*|desplaz\w*|desaloj\w*|abandon\w*|march\w*|mud\w*|se van|se fueron|se tienen que ir|dejan de vivir|oblig\w*|forz\w*|echan)\b/.test(text);
  const explicitUrbanChange = /\b(gentrific\w*|turistific\w*|aburgues\w*|renovaci\w*|rehabilitaci\w*|inversion inmobiliaria|presion inmobiliaria)\b/.test(text);
  const housingMarketPressure = /\b(alquil\w*|arrendam\w*|viviend\w*|inmobiliari\w*|precio\w*|renta\w*)\b/.test(text)
    && /\b(aument\w*|subid\w*|sub\w*|encarec\w*|cost\w*|car[oa]s?|elevad\w*|lujo|inasequib\w*|inaccesib\w*|especul\w*|presion\w*)\b/.test(text);
  const mentionsUrbanPressure = explicitUrbanChange || housingMarketPressure;
  return mentionsResidents && mentionsDisplacement && mentionsUrbanPressure
    && !touristHousingDisplacementClaim(text);
};
const waits = /\b(esper\w*|demor\w*|cita\w*|tard\w*|retras\w*|acceso|acceder)\b/;
const privateCareMention = /\b(seguro\w*(?: medico\w*)? privad\w*|sanidad privada|medicina privada|asistencia privada|consultas? privad\w*|atencion privada)\b/;
const primaryCareWaitClaim = (text) => has(text, waits)
  && /\b(medic\w* de (?:familia|cabecera)|atencion primaria|centro de salud)\b/.test(text)
  && !privateCareMention.test(text);
const primaryCareWaitTrend = (text) => primaryCareWaitClaim(text)
  && /\b(cada vez|evoluci\w*|tendencia|desde (?:19|20)\d{2}|entre (?:19|20)\d{2}|subid\w*|aument\w*|crec\w*|increment\w*|bajad\w*|descend\w*|disminu\w*|reduc\w*|empeor\w*|mejor\w*)\b/.test(text);
const primaryCareWaitCausality = (text) => primaryCareWaitClaim(text)
  && (/\b(caus\w*|provoc\w*|oblig\w*|empuj\w*|conllev\w*|lleva a|hace que|por culpa|debido a|por que|motivo\w*)\b/.test(text)
    || /\b(urgencias?|emergencias?)\b/.test(text) && /\b(ir|acudir|recurrir|llevar|conducir)\w*\b/.test(text));
export const privateHealthcareAccessClaimType = (claim) => {
  const text = normalize(claim);
  const statesMotiveOrEffect = /\b(contrat\w*|compr\w*|eligen|motivo\w*|porque|debido|caus\w*|evit\w*|reduc\w*)\b/.test(text)
    || /\b(paga\w*|adquir\w*)\b/.test(text) && /\b(para|por)\b/.test(text);
  if (statesMotiveOrEffect) return 'causal';
  if (/\b(antes|mas rapid\w*|menos esper\w*|compar\w*|frente a|que (?:la|el|los|las) sanidad public\w*)\b/.test(text)) return 'comparative';
  return 'descriptive';
};
const electricity = /\b(electric\w*|luz|kwh|megavat\w*|mwh)\b/;
const cost = /\b(preci\w*|cost\w*|car[oa]s?|barat\w*|pagan?|pagar|factura\w*|tarifa\w*)\b/;
const electricityNetwork = /\b(?:red(?:es)?(?: electric\w*| de (?:transporte|distribucion))?|infraestructur\w* electric\w*)\b/;
const renewableGridIntegration = (t) => electricityNetwork.test(t)
  && /\b(renovabl\w*|eolic\w*|solar\w*|fotovoltaic\w*)\b/.test(t)
  && /\b(cuell\w* de botell\w*|capacidad|congest\w*|vertid\w*|restricci\w*|limit\w*|aprovech\w*|integr\w*|evacua\w*)\b/.test(t);
const electricityGridInvestmentGap = (t) => electricityNetwork.test(t)
  && has(t, electricity)
  && /\b(invert\w*|inviert\w*|inversi\w*|gasto\w*|presupuest\w*)\b/.test(t)
  && /\b(por detras|atrasad\w*|rezagad\w*|insuficient\w*|no llega|no acompas\w*|menos|requier\w*|crec\w*|aument\w*|demand\w*|renovabl\w*|electrific\w*)\b/.test(t);
const selfConsumptionConnectionDelay = (t) => /\b(autoconsum\w*|instalacion\w* (?:solar|fotovoltaic\w*) de autoconsum\w*|placas? solares? de autoconsum\w*)\b/.test(t)
  && /\b(conexi\w*|acceso a la red|permis\w*|tramit\w*|burocr\w*|gesti\w*)\b/.test(t)
  && /\b(demor\w*|retras\w*|tard\w*|fren\w*|bloque\w*|obstacul\w*|rentabl\w*|inviabl\w*|esper\w*|dificil\w*|complic\w*|ralent\w*|lent\w*)\b/.test(t);
const wagePriceMarginPassThrough = (t) => has(t, wages)
  && /\b(preci\w*|inflaci\w*|margen\w*|coste\w*|rentabil\w*|competitiv\w*|encarec\w*)\b/.test(t)
  && /\b(oblig\w*|forz\w*|traslad\w*|repercut\w*|provoc\w*|caus\w*|encarec\w*|absorber|asumir|reduc\w*|sub\w*|aument\w*)\b/.test(t)
  && !/\b(?:mas lent\w*|mas despaci\w*|mas rapid\w*|mas deprisa|menos que|mas que|por debajo|por detras|por encima|por delante|no compens\w*|no.{0,12}sigui\w*|ritmo|compens\w*|recuper\w*|super\w*|perdi\w* poder)\b/.test(t)
  && !/\b(poder adquisitivo|poder de compra|salari\w* real|coste de (?:la )?vida|viviend\w*|alquil\w*|arrendam\w*|hipotec\w*|renta mensual)\b/.test(t);
const foodChainPriceSpread = (t) => {
  const producer = /\b(agricultor\w*|productor\w*|campesin\w*|precio\s+en\s+origen|en\s+origen|desde\s+el\s+campo)\b/.test(t);
  const retail = /\b(supermercad\w*|minorist\w*|comercio\s+detallist\w*|venta\s+al\s+p[uú]blico|consumidor\w*|precio\s+final|precio\s+en\s+destino|en\s+destino|tiendas?\s+(?:de\s+)?alimentaci[oó]n|cadena\s+alimentaria)\b/.test(t);
  const priceDistribution = /\b(preci\w*|margen\w*|repart\w*|captur\w*|remuner\w*|pag\w*)\b/.test(t);
  const normOrComparison = /\b(m[aá]s\s+(?:alto\w*|baj\w*|car\w*|barat\w*)|menos\s+(?:alto\w*|baj\w*|car\w*|barat\w*)|m[aá]s|menos|mayor\w*|menor\w*|superior\w*|inferior\w*|poc\w*|demasiad\w*|excesiv\w*|desproporcionad\w*|abusiv\w*|compar\w*|diferenc\w*|brecha\w*|margen\w*|repart\w*|captur\w*|recib\w*|cobra\w*|llega\w*)\b/.test(t);
  return producer && retail && priceDistribution && normOrComparison
    && !/\b(alquil\w*|arrendam\w*|renta\s+de\s+tierras?|hipotec\w*)\b/.test(t);
};
const electricityIndustryPrice = (t) => has(t, electricity)
  && /\b(industria\w*|industrial\w*|empresas?|negocios?|f[aá]bricas?|manufactur\w*|sector productivo|no dom[eé]stic\w*|grandes? consumidores?)\b/.test(t)
  && has(t, cost)
  && !/\b(competitiv\w*|margen\w*|rentabil\w*|productiv\w*|encarec\w*|reduc\w*|limit\w*|rest\w*|afect\w*|oblig\w*|forz\w*|provoc\w*|caus\w*)\b/.test(t);
const electricityIndustryCosts = (t) => has(t, electricity)
  && /\b(industria\w*|industrial\w*|empresas?|negocios?|f[aá]bricas?|manufactur\w*|sector productivo)\b/.test(t)
  && (has(t, cost) || /\b(competitiv\w*|margen\w*|rentabil\w*|productiv\w*|encarec\w*)\b/.test(t))
  && /\b(competitiv\w*|margen\w*|rentabil\w*|productiv\w*|encarec\w*|reduc\w*|limit\w*|rest\w*|afect\w*|oblig\w*|forz\w*|provoc\w*|caus\w*|perjudic\w*|fren\w*)\b/.test(t);
const electricityMarketTrading = (t) => has(t, electricity)
  && /\b(export\w*|import\w*|interconexi\w*|intercambios? (?:con|entre)|fronter\w*)\b/.test(t)
  && /\b(hor\w*|mediod[ií]a|noche|sol\w*|e[oó]lic\w*|renovabl\w*|moment\w*|barat\w*|car\w*|preci\w*)\b/.test(t);
const energyPricePassThrough = (t) => {
  const wholesaleReference = /\b(mayorist\w*|spot|cotizacion\w*)\b/.test(t)
    && (/\b(preci\w*|cost\w*|tarif\w*)\b/.test(t) || /\bmercado mayorist\w*\b/.test(t));
  const retailContract = /\b(contrat\w*|ofert\w*|factur\w*|recib\w*|consumidor\w*|cliente\w*|minorist\w*|precio final)\b/.test(t);
  const lagOrPassThrough = /\b(tard\w*|demor\w*|retras\w*|desfas\w*|lent\w*|despaci\w*|traslad\w*|repercut\w*|ajust\w*|reflej\w*|transmit\w*|pas\w*)\b/.test(t);
  const nonEnergyProduct = /\b(aliment\w*|agricultor\w*|productor\w*|campesin\w*|cosech\w*|trigo|harina|pan|leche|aceite|agroaliment\w*|supermercad\w*|ganader\w*|alquil\w*|arrendam\w*|viviend\w*|salari\w*|sueld\w*|nomina\w*|ropa|textil\w*|telecomunic\w*|telefon\w*|gasolin\w*|petrol\w*|diesel|carburant\w*|combustible\w*)\b/.test(t);
  const energyNamed = /\b(electric\w*|luz|kwh|megavat\w*|mwh|gas natural|energi\w*)\b/.test(t);
  const genericConsumerContract = /\b(contrat\w*|ofert\w*)\b[\s\w]{0,45}\b(consumidor\w*|cliente\w*|hogar\w*|famil\w*)\b/.test(t)
    || /\b(consumidor\w*|cliente\w*|hogar\w*|famil\w*)\b[\s\w]{0,45}\b(contrat\w*|ofert\w*)\b/.test(t);
  return wholesaleReference && retailContract && lagOrPassThrough && !nonEnergyProduct
    && (energyNamed || genericConsumerContract);
};
const ruralUrbanAccessCategories = [
    /\b(viviend\w*|alquil\w*|piso\w*|casas?)\b/,
    /\b(emple\w*|trabaj\w*|oportunidad\w*)\b/,
    /\b(sanidad|salud|medic\w*|hospital\w*)\b/,
    /\b(educaci[oó]n|escuel\w*|colegio\w*|formaci[oó]n)\b/,
    /\b(transporte|autob[uú]s|tren|coche)\b/,
  ];
const ruralUrbanAccess = (t) => {
  const rural = /\b(rural\w*|pueblo\w*|campo|zonas? rurales?)\b/.test(t);
  const access = /\b(acceso|acceder|llegar|disponibilidad|servicios?|demor\w*|esper\w*)\b/.test(t);
  const explicitUrbanComparator = /\b(ciudad\w*|urban\w*|capital\w*|metropolitan\w*)\b/.test(t);
  const categoryCount = ruralUrbanAccessCategories.filter((pattern) => pattern.test(t)).length;
  return rural && access && (categoryCount >= 2 || explicitUrbanComparator && categoryCount >= 1)
    && /\b(mas|menos|mejor|peor|diferenc\w*|compar\w*|frente a|que en|que quienes)\b/.test(t);
};
const ruralUrbanAccessNeedsForClaim = (claim) => {
  const text = normalize(claim);
  const needs = [];
  if (/\b(viviend\w*|alquil\w*|piso\w*|casas?)\b/.test(text)) needs.push('alquiler o compra e ingresos locales comparables en zonas rurales y urbanas');
  if (/\b(emple\w*|trabaj\w*|oportunidad\w*)\b/.test(text)) needs.push('empleo disponible y tiempo o distancia para llegar al trabajo, para la misma población y periodo');
  if (/\b(sanidad|salud|medic\w*|hospital\w*)\b/.test(text)) needs.push('disponibilidad de médicos y especialistas o tiempo de acceso, comparados por población rural y urbana');
  if (/\b(educaci[oó]n|escuel\w*|colegio\w*|formaci[oó]n)\b/.test(text)) needs.push('plazas, centros y tiempo de desplazamiento para la misma etapa educativa y población');
  if (/\b(transporte|autob[uú]s|tren|coche)\b/.test(text)) needs.push('frecuencia, duración y cobertura de los trayectos que usa la población comparada');
  needs.push('una definición rural y urbana común, con el mismo territorio, población y periodo');
  return needs;
};
const gdpHouseholdSignalNegated = (t) => /\b(?:no se (?:mencion\w*|habl\w*|disc\w*|inclu\w*)|sin (?:mencion\w*|habl\w*))\b[\s\w]{0,45}\b(?:pib|gdp|datos? macro|indicadores? macro)\b/.test(t);
const gdpHouseholdWelfare = (t) => !gdpHouseholdSignalNegated(t)
  && /\b(?:pib|gdp|crecimiento economico|economia crece|datos? macro(?:economicos)?|indicadores? macro(?:economicos)?)\b/.test(t)
  && /\b(?:hogar\w*|famili\w*|nivel de vida|condiciones de vida|bienestar|distribucion de la renta|desigualdad)\b/.test(t)
  && (/\bno\b[\s\w]{0,36}\b(?:reflej\w*|muestr\w*|represent\w*|mid\w*|traduc\w*|lleg\w*|repart\w*|indic\w*|explic\w*|signific\w*|demostr\w*|cuent\w*|es|sirv\w*)\b/.test(t)
    || /\b(?:conviv\w*|coexist\w*|contrasta\w*|discrep\w*|desconexi\w*|empeor\w*|peor(?:a|an|ando)?|no se nota|no lo nota)\b/.test(t))
  && !/\b(?:cuant[oa]s?|porcentaje|tasa|indice|comparar|compara|comparacion)\b/.test(t);
const gdpTotalPerCapitaComparison = (t) => {
  const aggregateGrowth = /\b(?:pib(?: real)? total|pib agregado|producto interior bruto(?: real)? total|crecimiento del pib(?: real)?|crecimiento economico|economia en su conjunto|total gdp|aggregate gdp|gdp growth)\b/.test(t);
  const personMeasure = /\b(?:pib(?: real)? (?:por habitante|por persona|per capita)|producto interior bruto(?: real)? (?:por habitante|por persona|per capita)|produccion real por habitante|nivel de vida|condiciones de vida|bienestar por persona|prosperidad por persona)\b/.test(t);
  const relativeChange = /\b(?:mas|menos|mayor\w*|menor\w*|superior\w*|inferior\w*|mejor\w*|peor\w*|mientras|frente a|compar\w*|diferenc\w*|brecha|ritmo|estanc\w*|traduj\w*|avanz\w*|crec\w*|aument\w*|sub\w*)\b/.test(t);
  const unrelatedGrowthMechanism = /\b(?:productividad|por trabajador|poblacion|inmigracion|migracion|empleo|horas trabajadas)\b/.test(t);
  return aggregateGrowth && personMeasure && relativeChange && !unrelatedGrowthMechanism;
};
const labourProductivityTrend = (t) => /\bproductividad\b/.test(t)
  && /\b(?:laboral|pib|gdp|crecimiento|crece|crecio|poblacion|empleo|por trabajador|por persona ocupada|por empleado|por hora|horas trabajadas|estanc\w*|lent\w*|avanz\w*|tendencia|lleva anos|desde hace anos)\b/.test(t)
  && !/\b(?:empres\w*|negocio\w*|sector\w*|industr\w*|productividad total de los factores|salari\w*|sueld\w*|antiguedad|premia\w*)\b/.test(t);
const educationEmploymentOutcome = (t) => /\b(universidad\w*|universitari\w*|carrer\w*|titul\w*|graduad\w*|estudios?|formaci\w*|preparaci\w*|educacion (?:superior|terciaria)|cualific\w*|sobrecualific\w*|fp)\b/.test(t)
  && !migrationPopulation.test(t) && !healthcareWorkforceCausality(t)
  && !/\b(estigma|estereotip\w*|prestigio|percepcion\w*|reputacion\w*)\b/.test(t)
  && (/\b(emple\w*|trabaj\w*|ocupaci\w*|puesto\w*|mercado laboral|paro|desemple\w*|salida laboral|salidas laborales|empleabilidad|perspectivas laborales|demanda laboral)\b/.test(t) || /\bsobrecualific\w*\b/.test(t));
const educationSocioeconomicPerformance = (t) => /\b(recursos? (?:economicos?|materiales?) (?:de la familia|familiares?|del hogar|del entorno familiar)|ingresos? (?:familiares?|del hogar|bajos?)|nivel socioeconomico|estatus socioeconomico|origen socioeconomico|origen social|situacion socioeconomica|situacion economica familiar|posicion socioeconomica|contexto socioeconomico|riqueza (?:familiar|del hogar)|renta (?:familiar|del hogar|baja)|familias? (?:pobres?|de bajos? ingresos|con bajos? ingresos|con rentas? bajas|con pocos recursos|con escasos recursos|con dinero|con mas recursos|con menos recursos)|hogares? (?:pobres?|de bajos? ingresos|con bajos? ingresos|con pocos recursos)|(?:estudiantes?|alumn\w*) en situacion de pobreza)\b/.test(t)
  && /\b(rendimient\w*|resultados? academ\w*|notas?|calificacion\w*|puntuacion\w*|aprendizaje|desempeno academ\w*|desempeno escolar|resultados? escolares?|pruebas? pisa|rendimiento en ciencias)\b/.test(t)
  && !/\b(emple\w*|trabaj\w*|ocupaci\w*|salari\w*|sueld\w*|mercado laboral|universidad\w*|universitari\w*|formacion profesional|\bfp\b)\b/.test(t);
const educationSocioeconomicSnapshotFitsRequest = (t) => {
  const years = [...t.matchAll(/\b20\d{2}\b/g)].map(([year]) => year);
  if (years.some((year) => year !== '2025')) return false;
  const explicitAges = [...t.matchAll(/\b(?:de|con|a los?)\s+(\d{1,2})\s+a[nñ]os\b/g)].map(([, age]) => Number(age));
  if (explicitAges.some((age) => age !== 15)) return false;
  return requestedGeographyScopes(t).every(({ id }) => id === 'ES');
};
const educationSkillsVsCurriculum = (t) => /\b(idiom\w*|competenci\w*|habilidad\w*|destrez\w*|aptitud\w*|digital\w*|soft skills|habilidades blandas)\b/.test(t)
  && /\b(asignatur\w*|materia\w*|curr[ií]cul\w*|contenid\w*|plan de estudios|grado\w*|t[ií]tul\w*|carrer\w*|universidad\w*|formaci[oó]n)\b/.test(t)
  && /\b(emple\w*|trabaj\w*|mercado laboral|puesto\w*|empresas?|empleador\w*|contrataci[oó]n|vacantes?|ofertas?)\b/.test(t)
  && /\b(pes\w*|val\w*|prioriz\w*|import\w*|exig\w*|demand\w*|busc\w*|necesit\w*|prefer\w*|prepar\w*|ensen\w*|sirv\w*|cuent\w*|m[aá]s|menos|mejor|peor)\b/.test(t);
const educationJobFit = (t) => /\b(cualific\w*|acorde\w*|relacionad\w*|adecuad\w*|sobrecualific\w*|desajust\w*|desencaj\w*|nivel de estudios|campo de estudios|preparaci\w*)\b/.test(t)
  || /\b(?:puesto\w*|empleo\w*|trabajo\w*|ocupaci\w*)\b[\s\w]{0,55}\b(?:no requier\w*|no exig\w*|requiere? menos|exige menos)\b/.test(t)
  || /\b(?:no requier\w*|no exig\w*|requiere? menos|exige menos)\b[\s\w]{0,55}\b(?:nivel|estudios|titulaci\w*|formaci\w*|cualificaci\w*)\b/.test(t)
  || /\b(?:por debajo|inferior|menor)\b[\s\w]{0,35}\b(?:formaci\w*|preparaci\w*|cualificaci\w*|nivel de estudios|estudios?)\b/.test(t);
const educationSiiuGraduateOutcomes = (t) => {
  const asksExactOverqualificationRate = /\b(tasa|porcentaje|proporcion|cuota)\b.{0,45}\bsobrecualific\w*\b/.test(t)
    || /\bsobrecualific\w*\b.{0,45}\b(tasa|porcentaje|proporcion|cuota)\b/.test(t);
  const asksForGraduateCount = /\b(cuantos|cuantas|numero de|recuento de)\b/.test(t);
  const asksUniversityOutcomes = /\b(universidad\w*|universitari\w*|carrer\w*|titul\w*|graduad\w*|estudios? universitarios|grado universitario)\b/.test(t);
  const asksQualificationFit = educationJobFit(t);
  const youthOrCausalClaim = /\b(joven\w*|juvenil|caus\w*|provoc\w*|porque|ya que|debido a|por culpa|empuj\w*|oblig\w* a|conduc\w* a|llev\w* a|por falta de|ante la falta de|por no (?:encontr\w*|hall\w*|consegu\w*))\b/.test(t);
  const comparesEducationPaths = /\b(fp|formacion profesional|grado medio|grado superior|ciclo formativo)\b/.test(t)
    && /\b(compar\w*|frente a|versus|vs\.?|que la universidad|que una carrera|universidad y fp|fp y universidad)\b/.test(t);
  return asksUniversityOutcomes && asksQualificationFit && !asksExactOverqualificationRate && !asksForGraduateCount
    && !educationJobRequirement(t) && !comparesEducationPaths && !youthOrCausalClaim;
};
const educationJobRequirement = (t) => /\b(master\w*|maestr\w*|posgrado\w*|postgrado\w*)\b/.test(t)
  && /\b(exig\w*|requier\w*|necesit\w*|ped\w*|solicit\w*|ofert\w*)\b/.test(t)
  && /\b(emple\w*|trabaj\w*|puesto\w*)\b/.test(t);
const educationLevelComparison = (t) => /\b(formacion profesional|fp|grado medio|grado superior)\b/.test(t)
  && /\b(menos|mas|mayor|menor|compar\w*|diferent\w*|frente a|entre)\b/.test(t);
const educationCrossGroupComparison = (t) => /\b(?:mas|menos|mayor|menor|mejor|peor|superior|inferior)\b[\s\S]{0,35}\bque\s+(?:el|la|los|las|quien(?:es)?|otro|otra|otros|otras)\b/.test(t)
  || /\b(?:en comparacion con|comparad\w* con|que quienes)\b/.test(t);
const educationOutcomeMetrics = (claim) => {
  const t = normalize(claim);
  const unsupportedEducationOrTerritory = /\b(formacion profesional|fp|grado medio|grado superior|ciclo formativo|recien titulad\w*|recien graduad\w*|primer empleo|europa|europe[oa]s?|ue|union europea)\b/.test(t);
  const degreeDemandClaim = /\b(demanda laboral|salidas? laborales|empleabilidad)\b/.test(t);
  const youthReference = /\b(joven\w*|juvenil)\b/.test(t);
  const belowThirty = /\bmenores? de \d+\b/.test(t);
  const requestedAges = [...String(claim).matchAll(/\b(\d{2})\s*(?:[-–—]|a|hasta|to|y)\s*(\d{2})\b/gi)];
  const qualificationFit = educationJobFit(t);
  const age20To34Requested = requestedAges.length === 1 && requestedAges[0][1] === '20' && requestedAges[0][2] === '34';
  const age20To64Requested = requestedAges.length === 1 && requestedAges[0][1] === '20' && requestedAges[0][2] === '64';
  if (educationJobRequirement(t) || educationLevelComparison(t) || unsupportedEducationOrTerritory || degreeDemandClaim
    || educationCrossGroupComparison(t) || belowThirty || requestedAges.length > 1
    || requestedAges.length > 0 && !age20To34Requested && !age20To64Requested
    || age20To34Requested && !qualificationFit
    || youthReference && (!qualificationFit || requestedAges.length > 0 && !age20To34Requested)) return [];
  // Eurostat publishes over-qualification separately for ages 20–34 and
  // 35–64. Use the former only for a youth over-qualification claim, and
  // never let its rate stand in for recent graduates, unemployment, or all
  // people with tertiary education.
  if (qualificationFit && (youthReference || age20To34Requested)) return ['tertiary_overqualification_rate_age_20_34'];
  const unemployment = /\b(paro|desemple\w*)\b/.test(t);
  const employmentAccess = /\b(tasa de empleo|encontr\w*|consegu\w*|garantiz\w*|asegur\w*|acced\w*|menos empleo|mas empleo|mayor empleo|menor empleo)\b/.test(t);
  const metrics = [];
  if (unemployment) metrics.push('unemployment_rate_tertiary_education');
  else if (!qualificationFit || employmentAccess) metrics.push('employment_rate_tertiary_education');
  if (qualificationFit) metrics.push('tertiary_overqualification_rate');
  return metrics;
};
export const tertiaryOverqualificationCitizenshipGroupsForClaim = (claim) => {
  const text = normalize(claim);
  if (/\b(nacid\w*|pais de nacimiento|lugar de nacimiento|nacimiento fuera|nacimiento en el extranjero|nativ\w*)\b/.test(text)) return [];
  const foreignRequest = /\b(inmigr\w*|migr\w*|extranjer\w*|foreign|ciudadania extranjera|nacionalidad extranjera)\b/.test(text);
  const nonEuRequest = /\b(no ue|fuera de la ue|terceros paises|extracomunitari\w*|no comunitari\w*)\b/.test(text);
  const euForeignRequest = /\b(ciudadania|ciudadanos?|nacionalidad|nacionales?)\b[\s\S]{0,35}\b(ue|union europea|comunitari\w*)\b/.test(text);
  const nationalCitizenRequest = /\b(espanol\w*|nacionales\b|ciudadania espanola|nacionalidad espanola|nacionalidades? espanolas?|ciudadanos? (?:de )?espana)\b/.test(text);
  const nationalityBreakdownRequest = /\b(por nacionalidades?|por ciudadanias?|desglos\w* (?:por )?(?:nacionalidades?|ciudadanias?)|breakdown by citizenship)\b/.test(text);
  if (nonEuRequest) return nationalCitizenRequest ? ['NEU27_2020_FOR', 'NAT'] : ['NEU27_2020_FOR'];
  if (euForeignRequest) return nationalCitizenRequest ? ['EU27_2020_FOR', 'NAT'] : ['EU27_2020_FOR'];
  if (foreignRequest) return nationalCitizenRequest ? ['FOR', 'NAT'] : ['FOR'];
  if (nationalityBreakdownRequest) return ['NAT', 'EU27_2020_FOR', 'NEU27_2020_FOR'];
  return ['TOTAL'];
};
export const tertiaryOverqualificationCitizenshipFitsClaim = (claim, item) => {
  if (!['tertiary_overqualification_rate', 'tertiary_overqualification_rate_age_20_34'].includes(item?.metricId)) return true;
  const citizen = String(item.dimensions?.citizen || '').toUpperCase();
  return tertiaryOverqualificationCitizenshipGroupsForClaim(claim).includes(citizen);
};
const workHousingIndependence = (t) => /\b(jornada completa|tiempo completo|jornada entera)\b/.test(t)
  && /\b(emple\w*|trabaj\w*|salari\w*|sueld\w*|ingres\w*)\b/.test(t)
  && /\b(independiz\w*|emancip\w*|vivir por su cuenta|vivir por cuenta propia|vivir de forma independiente|vivir solo|mudarse solo)\b/.test(t);
const rentalSubject = (t) => /\b(viviend\w*|alquil\w*|arrendam\w*|inquilin\w*|piso\w*|casas?|apartament\w*)\b/.test(t);
const rentalTenantScreeningExclusion = (t) => rentalSubject(t)
  && /\b(fianz\w*|garanti\w*|aval\w*|seguro\w* de impago|solvenci\w*|ingresos? irregulares?|n[oó]min\w*)\b/.test(t)
  && /\b(exclu\w*|dej\w* fuera|rechaz\w*|deneg\w*|impid\w*|barrer\w*|filtr\w*|penaliz\w*|discrimin\w*|no pueden? alquilar|dif[ií]cil\w* alquilar)\b/.test(t);
const rentalRegulationContractShift = (t) => rentalSubject(t)
  && /\b(regulaci\w*|topes?\b|control de precios|l[ií]mite\w* (?:al|del) alquiler|ley de vivienda)\b/.test(t)
  && /\b(empuj\w*|desplaz\w*|desaparec\w*|retir\w*|reduc\w*|convert\w*|pas\w*|temporad\w*|temporal(?:es)?|mercado regulado|oferta)\b/.test(t);
const rentalLandlordMotives = (t) => rentalSubject(t)
  && (/\b(propietari\w*|arrendador\w*|caser\w*|due[nñ]os?|anfitri[oó]n\w*)\b/.test(t)
    || /\b(viviend\w*|piso\w*|casas?|apartament\w*)\b[\w\s]{0,40}\b(vac[ií]a\w*|desocupad\w*|retirad\w*)\b/.test(t))
  && /\b(mied\w*|temor\w*|riesg\w*|preocup\w*|problem\w* legal\w*|flexibil\w*|prefier\w*|prefer\w*|rentabil\w*|seguridad jur[ií]dica)\b/.test(t)
  && /\b(alquil\w*|arrendam\w*|vac[ií]a\w*|desocupad\w*|retir\w*|dej\w*|temporad\w*|temporal(?:es)?|contrat\w*)\b/.test(t);
const rentalLandlordConcernEvidence = {
  directClaimEvidence: false,
  expiresAt: '2029-03-01', territories: ['ES'],
  when: (claim) => /\b(mied\w*|temor\w*|riesg\w*|preocup\w*|problem\w* legal\w*|okup\w*|impag\w*|morosidad)\b/.test(claim),
  evidenceLabel: 'Preocupaciones declaradas por arrendadores encuestados por Alquiler Seguro',
  dimensions: {
    subject: 'principal preocupación declarada al alquilar una vivienda',
    population: '4.780 propietarios encuestados por Alquiler Seguro, vinculados a viviendas gestionadas por la empresa; no se acredita representatividad nacional',
    period: 'estudio elaborado entre enero y marzo de 2023; no se detalla por separado la fecha de campo de la encuesta',
    geography: 'España, según el alcance del informe; distribución territorial de la muestra no detallada',
    denominator: '4.780 propietarios encuestados; diseño de muestreo no descrito como probabilístico',
    unit: 'porcentaje de personas encuestadas que indicaron cada preocupación principal',
  },
  facts: [
    'En la encuesta de Alquiler Seguro, el 33 % de los 4.780 propietarios encuestados señaló el impago como principal preocupación al alquilar; el 32 % mencionó posibles daños a la vivienda.',
    'El informe también recoge problemas legales en general para el 9 %. La ficha técnica describe una encuesta a propietarios vinculados a viviendas gestionadas por la empresa.',
  ],
  sources: [{ id: 'observatorio-alquiler-landlord-profile-2025', title: 'Perfil del propietario de viviendas en alquiler en España · marzo de 2025', publisher: 'Observatorio del Alquiler · Fundación Alquiler Seguro', url: 'https://observatoriodelalquiler.org/wp-content/uploads/2025/03/Perfil-del-prop-de-viviendas-alq.pdf', publishedAt: '2025-03', retrievedAt: '2026-11-24', role: 'secondary' }],
};
const rentalLandlordConcernReply = ({ claim, facts }) => {
  const text = normalize(claim);
  const mentionsIllegalOccupation = /\b(okup\w*|ocupacion ilegal)\b/.test(text);
  const allegesWithdrawal = /\b(retir\w*|dej\w*|sac\w* del mercado|vaci\w*|desocup\w*|fuera del alquiler)\b/.test(text);
  return [
    facts.join(' '),
    'La ficha no acredita que la muestra represente a todos los arrendadores de España.',
    mentionsIllegalOccupation ? 'Los problemas legales no se desglosan como ocupación ilegal.' : '',
    allegesWithdrawal ? 'No sigue viviendas retiradas ni vincula preocupaciones con decisiones de dejar de alquilar, así que no demuestra que esos temores reduzcan la oferta.' : '',
  ].filter(Boolean).join('\n\n');
};
const foreignHousingPriceCause = (t) => /\b(viviend\w*|alquil\w*|renta\w*|piso\w*|casas?|mercado inmobiliario|precios? inmobiliarios?)\b/.test(t)
  && /\b(inmigr\w*|migrant\w*|extranjer\w*|no residentes?|comprador\w*|inversor\w*)\b/.test(t)
  && /\b(caus\w*|provoc\w*|encarec\w*|aument\w*|sub\w*|elev\w*|dispar\w*|presion\w*|retir\w*)\b/.test(t);
const foreignHousingPurchaseCause = (t) => foreignHousingPriceCause(t)
  && /\b(compra\w*|comprador\w*|adquisici\w*|inversor\w*|transacci\w*|no residentes?)\b/.test(t);
const foreignNewBuildLocalAffordability = (t) => {
  const housingDevelopment = /\b(viviend\w*|pisos?|casas?|promoci\w*|obra nueva|constru\w*|edific\w*)\b/.test(t)
    && /\b(promoci\w*|obra nueva|viviendas? nuevas?|nuevas? viviendas?|constru\w*|edific\w*)\b/.test(t);
  const foreignBuyer = /\b(extranjer\w*|forane\w*|internacional\w*|de fuera)\b/.test(t)
    && /\b(comprador\w*|compr\w*|adquisici\w*|inversor\w*|demanda)\b/.test(t);
  const localAffordability = /\b(salari\w*|sueldo\w*|ingres\w*|asequib\w*|accesible\w*|pag\w*|poder adquisitiv\w*)\b/.test(t)
    && /\b(local\w*|resident\w*|trabajador\w*|hogar\w*|poblaci\w*)\b/.test(t);
  return housingDevelopment && foreignBuyer && localAffordability && !foreignHousingPriceCause(t);
};
const migrationHousingDemandCause = (t) => foreignHousingPriceCause(t)
  && !/\b(compra\w*|comprador\w*|adquisici\w*|inversor\w*|transacci\w*|no residentes?)\b/.test(t);
const youthHousingFamilyFormation = (t) => /\b(j[oó]ven\w*|juventud|emancip\w*)\b/.test(t)
  && /\b(viviend\w*|alquil\w*|hipotec\w*|coste de (?:la )?viviend\w*|precio\w* de (?:la )?viviend\w*)\b/.test(t)
  && /\b(cotiz\w*|cuot\w*|impuest\w*|carga fiscal|aportaci[oó]n\w*|contribu\w*)\b/.test(t)
  && /\b(hij\w*|tener familia|formar familia|ahorr\w*|ahorro\w*|capacidad econ[oó]mica)\b/.test(t)
  && /\b(reduc\w*|limit\w*|dificult\w*|impid\w*|menoscab\w*|condicion\w*)\b/.test(t);
const inflationTaxBracketCreep = (t) => /\b(inflaci[oó]n|subida de precios)\b/.test(t)
  && /\b(irpf|impuest\w*|carga fiscal|recaudaci[oó]n tributaria)\b/.test(t)
  && /\b(tramos?|deduccion\w*|m[ií]nimo exento|par[aá]metros? (?:nominales?|del irpf)|progresividad en fr[ií]o)\b/.test(t)
  && /\b(no se actualiz\w*|no actualiz\w*|al mismo ritmo|progresividad en fr[ií]o|eleva\w*|aument\w*|increment\w*|sub\w*)\b/.test(t);
const housingInvestmentReturnComparison = (t) => /\b(viviend\w*|inmobiliari\w*|inmuebl\w*|ladrillo|alquiler\w*)\b/.test(t)
  && /\b(rentabil\w*|rendimient\w*|retorno\w*|benefici\w*|invert\w*|inversion\w*)\b/.test(t)
  && /\b(negocio\w*|empres\w*|productiv\w*|economia real|capital productiv\w*)\b/.test(t)
  && /\b(mas|menos|mayor\w*|menor\w*|super\w*|inferior\w*|mejor\w*|peor\w*|compar\w*|frente a|prefier\w*|desvi\w*|compite\w*)\b/.test(t);
const housingPlusNamedCity = (t) => /\b(viviend\w*|alquil\w*|arrendam\w*|coste de (?:la )?viviend\w*|gasto(?:s)? (?:de )?viviend\w*)\b/.test(t)
  && /\b(madrid|barcelona|valencia|sevilla|malaga|bilbao|zaragoza)\b/.test(t);
const regionalWageHousingCost = (t) => {
  const housing = /\b(viviend\w*|alquil\w*|arrendam\w*|coste de (?:la )?viviend\w*|gasto(?:s)? (?:de )?viviend\w*)\b/.test(t);
  const wages = /\b(salari\w*|sueld\w*|nomina\w*|remuner\w*|ingres\w*)\b/.test(t);
  const location = /\b(ciudad\w*|municip\w*|metropolitan\w*|region\w*|territori\w*|capital\w*|area\w*|zona\w*|madrid|barcelona|valencia|sevilla|malaga|bilbao|zaragoza)\b/.test(t);
  const offset = /\b(come|comen|comer\w*|comi\w*|absorb\w*|compens\w*|neutraliz\w*|contrarrest\w*|elimin\w*|anul\w*|desaparec\w*|borr\w*)\b/.test(t);
  const advantage = /\b(ventaj\w*|prima salarial|brecha salarial)\b/.test(t);
  return housing && wages && offset && (location || advantage);
};
const wageProgression = (t) => /\b(salari\w*|sueld\w*|remuner\w*|nomina\w*)\b/.test(t)
  && /\b(entrada|inicial\w*|comienzo|primeros? a[nñ]os|banda salarial|salario base|empez\w*|empiez\w*|inici\w*|antiguedad)\b/.test(t)
  && /\b(progres\w*|avanz\w*|estanc\w*|permanec\w*|encaden\w*|a[nñ]os|sub\w*|aument\w*|crec\w*|antiguedad)\b/.test(t)
  && !/\b(viviend\w*|casas?|piso\w*|hipotec\w*|comprar|compra de)\b/.test(t);
const educationPayComparison = (t) => /\b(salari\w*|sueld\w*|remuner\w*|nomina\w*|pag\w*|cobr\w*)\b/.test(t)
  && /\b(cualificad\w*|cualificaci\w*|formaci\w*|estudios? (?:superiores?|universitarios?)|titulaci\w*|educaci\w*|puestos? que (?:exigen|requieren)|trabajos? que (?:exigen|requieren))\b/.test(t)
  && /\b(parecid\w*|similar\w*|igual\w*|mism\w*|diferenc\w*|distint\w*|brecha\w*|compar\w*|acorde\w*|proporcional\w*|garant\w*|menos|mas|mayor\w*|menor\w*|superior\w*|inferior\w*)\b/.test(t);
const firmWageCapacity = (t) => /\b(empres\w*|compa[nñ]i\w*|firmas?|multinacional\w*|negocio\w*)\b/.test(t)
  && /\b(productiv\w*|valor a[nñ]adido|benefici\w*|rentabil\w*)\b/.test(t)
  && /\b(salari\w*|sueld\w*|remuner\w*|nomina\w*|pag\w*)\b/.test(t)
  && /\b(capacidad|podr[ií]an?|pueden?|suficient\w*|contien\w*|fren\w*|reprim\w*|pag\w* mas|pagar mejor|salarios? altos)\b/.test(t);
const publicPrivateJobConditions = (t) => /\b(emple\w*|trabaj\w*|puesto\w*|sector\w*|empleo|profesional\w*)\b/.test(t)
  && /\b(public\w*|privad\w*|funcionari\w*|administraci[oó]n)\b/.test(t)
  && /\b(conciliaci[oó]n|equilibrio entre vida|horario\w*|compatib\w*|vida familiar|flexibilidad|estabilidad|condiciones? laborales|calidad de vida)\b/.test(t)
  && /\b(empuj\w*|busc\w*|prefer\w*|atra\w*|eleg\w*|decant\w*|pas\w*|cambi\w*|dej\w*|opt\w*|interes\w*)\b/.test(t)
  && !/\b(salari\w*|sueld\w*|remuner\w*|nomina\w*|cobra\w*|pag\w*)\b/.test(t);
const publicPrivatePayComparison = (t) => /\b(sector publico|sector privado|empleos? public\w*|empleos? privad\w*|administraci[oó]n publica|funcionari\w*|sector\w* public\w*|sector\w* privad\w*)\b/.test(t)
  && /\b(salari\w*|sueld\w*|remuner\w*|nomina\w*|pag\w*|cobr\w*)\b/.test(t)
  && /\b(compar\w*|frente a(?:l| la| los| las)?|que en|que el|que la|mayor\w*|menor\w*|mas|menos|superior\w*|inferior\w*|brecha\w*|diferenc\w*)\b/.test(t);
const retireeHousingCostComparison = (t) => /\b(jubilad\w*|pensionist\w*|pension\w*|jubilaci[oó]n)\b/.test(t)
  && /\b(viviend\w*|alquil\w*|arrendam\w*|hipotec\w*|propietari\w*|pagad\w*|pagada\w*)\b/.test(t)
  && /\b(renta\w*|ingres\w*|salari\w*|sueld\w*|remuner\w*|trabajador\w*|emplead\w*|ocupad\w*)\b/.test(t)
  && /\b(mas|menos|mayor\w*|menor\w*|superior\w*|inferior\w*|compar\w*|diferenc\w*|cambi\w*|frente a|que quien\w*|pued\w* tener)\b/.test(t);
const pensionIndexationComparison = (t) => /\b(pension\w*|jubilad\w*|jubilaci[oó]n)\b/.test(t)
  && /\b(inflaci[oó]n|precios|coste de vida|revaloriz\w*|actualiz\w*|index\w*)\b/.test(t)
  && /\b(salari\w*|sueld\w*|remuner\w*|nomina\w*|trabajador\w*)\b/.test(t)
  && /\b(mejor\w*|peor\w*|mas|menos|mayor\w*|menor\w*|super\w*|compar\w*|frente a|que)\b/.test(t);
const pensionPriceIndexation = (t) => {
  const namesPension = /\b(pension\w*|jubilad\w*|jubilaci[oó]n)\b/.test(t);
  const mentionsPrices = /\b(ipc|inflaci[oó]n|precios|coste de vida|poder adquisitivo)\b/.test(t);
  const mentionsIncrease = /\b(revaloriz\w*|actualiz\w*|index\w*|mantien\w*|conserv\w*|perd\w*|pierde|pierden|sub\w*|aument\w*|ajust\w*|sigue\w*|segu\w*|ligad\w*|vinculad\w*)\b/.test(t);
  const asksPublishedRate = /\b(cuant\w*|porcent\w*|tasa|increment\w*|subida)\b/.test(t) && /\b20\d{2}\b/.test(t);
  const asksIndexationRule = /\b(revaloriz\w*|actualiz\w*|index\w*)\b/.test(t);
  return namesPension && !/\b(salari\w*|sueld\w*|remuner\w*|nomina\w*|trabajador\w*)\b/.test(t)
    && (mentionsPrices && mentionsIncrease || asksIndexationRule || asksPublishedRate);
};
const pensionPriceIndexationEvidence = {
  expiresAt: '2027-02-01',
  territories: ['ES'],
  when: (claim) => {
    const years = [...claim.matchAll(/\b20\d{2}\b/g)].map(([year]) => Number(year));
    return years.every((year) => year >= 2022 && year <= 2026);
  },
  evidenceLabel: 'Regla legal de revalorización de pensiones contributivas',
  dimensions: {
    subject: 'revalorización anual general de pensiones contributivas de la Seguridad Social',
    population: 'pensiones contributivas del sistema de la Seguridad Social; existen excepciones y reglas específicas',
    period: '2022–2026',
    geography: 'España',
    denominator: 'importe de cada pensión antes de la revalorización anual',
    unit: 'porcentaje de aumento anual',
  },
  facts: [
    'La regla general del artículo 58 de la Ley General de la Seguridad Social revaloriza al comienzo del año las pensiones contributivas según el promedio de las tasas interanuales del IPC del periodo de referencia del año anterior.',
    'El aumento general aprobado fue del 2,5 % en 2022, 8,5 % en 2023, 3,8 % en 2024, 2,8 % en 2025 y 2,7 % en 2026. Las normas de cada ejercicio vinculan el porcentaje general al IPC medio de referencia, con excepciones y reglas distintas para algunas cuantías y prestaciones.',
    'Esto acredita cómo se fijó la revalorización general; no mide el coste de vida de cada hogar pensionista ni demuestra que cada persona mantuviera el mismo poder de compra. Tampoco compara esos aumentos con los salarios.',
  ],
  sources: [
    { id: 'pension-revaluation-2022', title: 'Real Decreto 65/2022 · actualización de pensiones para 2022', publisher: 'BOE', url: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2022-1189', publishedAt: '2022-01-26', retrievedAt: '2026-11-17', role: 'primary' },
    { id: 'pension-revaluation-2023', title: 'Real Decreto 1058/2022 · revalorización de pensiones para 2023', publisher: 'BOE', url: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2022-22694', publishedAt: '2022-12-28', retrievedAt: '2026-11-17', role: 'primary' },
    { id: 'pension-revaluation-2024', title: 'Real Decreto-ley 8/2023 · revalorización de pensiones para 2024', publisher: 'BOE', url: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2023-26452', publishedAt: '2023-12-28', retrievedAt: '2026-11-17', role: 'primary' },
    { id: 'pension-revaluation-2025', title: 'Real Decreto-ley 1/2025 · revalorización de pensiones para 2025', publisher: 'BOE', url: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-1560', publishedAt: '2025-01-29', retrievedAt: '2026-11-17', role: 'primary' },
    { id: 'pension-revaluation-2026', title: 'Real Decreto-ley 3/2026 · revalorización de pensiones para 2026', publisher: 'BOE', url: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-2548', publishedAt: '2026-02-04', retrievedAt: '2026-11-17', role: 'primary' },
  ],
  directClaimEvidence: true,
};
const pensionWageContributionBase = (t) => /\b(pension\w*|jubilaci[oó]n|sistema de pensiones)\b/.test(t)
  && (/\b(salari\w*|sueld\w*|nomina\w*|remuner\w*|ingres\w* laboral\w*)\b/.test(t)
    || /\bbase\w* de cotizaci[oó]n\w*\b/.test(t))
  && /\b(baj\w*|reduc\w*|debilit\w*|presion\w*|merm\w*|insuficient\w*|poc\w*)\b/.test(t)
  && /\b(emple\w*|ocupaci[oó]n|trabajador\w*|cotiz\w*|financi\w*|sostenibilidad|recaud\w*)\b/.test(t);
const pensionDoublePaymentClaim = (t) => /\b(pension\w*|jubilaci[oó]n)\b/.test(t)
  && /\b(cotiz\w*|seguridad social|contribuci\w*|pension\w* public\w*)\b/.test(t)
  && /\b(ahorro privad\w*|plan(?:es)? privad\w*|plan(?:es)? de pensiones? privad\w*|pension\w* privad\w*|pension\w* complementar\w*|fondo de pensiones? privad\w*|otra privad\w*)\b/.test(t)
  && /\b(dos veces|doble|por duplicado|adem[aá]s|tener que|tendr\w* que|obligad\w*|pagar)\b/.test(t);
const pensionPrivateSavingsNeed = (t) => pensionDoublePaymentClaim(t) || (
  /\b(ahorr\w* (?:de forma )?(?:privad\w*|por su cuenta|por cuenta propia|aparte|complementari\w*)|plan(?:es)? (?:de )?pensiones? privad\w*|plan(?:es)? privad\w*|pension\w* privad\w*|prevision social complementaria)\b/.test(t)
  && /\b(pension\w*|jubilaci[oó]n|cotiz\w*|seguridad social|sistema p[uú]blic\w*|pension\w* p[uú]blic\w*)\b/.test(t)
  && /\b(imprescindible|necesari\w*|oblig\w*|exig\w*|tendr\w* que|habr\w* que|deber\w*|har\w* falta|necesit\w*|no bast\w*|no alcanz\w*)\b/.test(t)
);
const pensionPrivatePlanLegalClaim = (t) => /\b(legal\w*|ley|oblig\w*|exig\w*)\b/.test(t)
  && /\b(ahorr\w* privad\w*|plan(?:es)? (?:de )?pensiones? privad\w*|plan(?:es)? privad\w*|pension\w* privad\w*|prevision social complementaria)\b/.test(t)
  && /\b(pension\w*|jubilaci\w*|cotiz\w*|seguridad social|sistema p[uú]blic\w*)\b/.test(t);
const pensionPrivateReplacementRateSummary = (() => {
  const [firstProjection, longRunProjection] = PENSION_PRIVATE_SAVINGS_SNAPSHOT.replacementRateProjection;
  const percentage = (value) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(value);
  const approximate = longRunProjection.qualifier === 'around' ? 'alrededor del ' : '';
  const longRunPeriod = String(longRunProjection.period).replace(/^from\s+/i, 'desde ');
  return {
    fact: `En su modelo, AIReF proyecta una tasa de reemplazo del ${percentage(firstProjection.value)} % en ${firstProjection.period} y ${approximate}${percentage(longRunProjection.value)} % ${longRunPeriod}. La define como la pensión inicial dividida por el salario al jubilarse; es un resultado modelado agregado, no una estimación neta ni una medida de ahorro suficiente para cada persona.`,
    reply: `En su modelo agregado basado en registros de 2023, AIReF proyecta una tasa de reemplazo —pensión inicial dividida por el salario al jubilarse— del ${percentage(firstProjection.value)} % en ${firstProjection.period} y de ${approximate}${percentage(longRunProjection.value)} % ${longRunPeriod}. No es una pensión neta ni una medida de los gastos de cada hogar.`,
  };
})();
const pensionWorkerSupportRatio = (t) => {
  const pensioner = /\b(pension\w*|jubilad\w*)\b/.test(t);
  const contributorCount = /\b(cotiz\w*|afiliad\w*)\b/.test(t);
  const workersPerPensioner = /\b(?:trabajador\w*|emple\w*)[\s\w]{0,25}\bpor (?:cada )?pensionist\w*\b|\bpensionist\w*[\s\w]{0,25}\bpor (?:cada )?\b(?:trabajador|emple)\w*\b/.test(t);
  return pensioner
  && (contributorCount || workersPerPensioner)
  && /\b(trabajador\w*|cotiz\w*|emple\w*|afiliad\w*)\b/.test(t)
  && /\b(por cada|ratio|relaci[oó]n|proporci[oó]n|suficient\w*|depend\w*|cotiz\w* por (?:cada )?(?:pensionist\w*|jubilad\w*))\b/.test(t)
  && !/\b(emplead\w* p[uú]blic\w*|sector p[uú]blic\w*|sector privad\w*|desemplead\w*)\b/.test(t)
  && !/\b(insostenible|sostenibilidad|quebr\w*|colaps\w*)\b/.test(t)
  && !pensionDoublePaymentClaim(t) && !pensionWageContributionBase(t);
};
const pensionWorkerRatioEvidence = (() => {
  const snapshot = PENSION_CONTRIBUTOR_RATIO_SNAPSHOT;
  const observations = snapshot.observations;
  const latest = observations.at(-1);
  const number = (value) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  const requestedYearsFor = (claim) => [...new Set([...normalize(claim).matchAll(/\b20\d{2}\b/g)].map(([year]) => Number(year)))].sort((left, right) => left - right);
  const rowsFor = (claim) => {
    const years = requestedYearsFor(claim);
    if (!years.length) return [latest];
    const selected = years.map((year) => observations.find((row) => row.year === year)).filter(Boolean);
    return selected.length ? [selected[0], ...(selected.length > 1 && selected.at(-1) !== selected[0] ? [selected.at(-1)] : [])] : [latest];
  };
  const isTrendClaim = (claim) => /\b(?:cada vez|ultim\w* anos|aument\w*|crec\w*|sub\w*|reduc\w*|disminu\w*|descend\w*|baj\w*|cae|caen|envejec\w*|tendencia|evoluci\w*)\b/.test(normalize(claim));
  const payAsYouGoSource = snapshot.payAsYouGoSource;
  const seriesFact = `La serie publicada por la Seguridad Social registra ${observations.map((row) => `${row.year}: ${number(row.ratio)} cotizantes por pensionista`).join('; ')}. El último punto corresponde a octubre de 2026.`;
  const fundingFact = 'En el sistema de reparto, las cotizaciones y los ingresos generales se distribuyen de inmediato o a corto plazo para pagar prestaciones actuales; la Seguridad Social describe además solidaridad entre generaciones y territorios.';
  const dimensionsForYears = (years) => {
    const supportedYears = years.filter((year) => observations.some((row) => row.year === year));
    return {
      subject: 'ratio oficial de cotizantes por pensionista',
      population: 'cotizantes y pensionistas incluidos en el indicador publicado por la Seguridad Social',
      period: supportedYears.length === 1 ? `${supportedYears[0]}${supportedYears[0] === 2026 ? ' (dato de octubre)' : ''}`
        : supportedYears.length > 1 ? `${supportedYears[0]}–${supportedYears.at(-1)}${supportedYears.includes(2026) ? ' (último dato de octubre)' : ''}`
          : '2014–2026; último dato de octubre de 2026',
      geography: 'España',
      denominator: 'pensionistas recogidos en el indicador oficial; la publicación ofrece la ratio, no los recuentos brutos usados para calcularla',
      unit: 'cotizantes por pensionista',
    };
  };
  return {
    directClaimEvidence: true,
    claimVerdict: 'mixed',
    expiresAt: snapshot.expiresAt,
    territories: ['ES'],
    when: (claim) => {
      const years = requestedYearsFor(claim);
      const months = [...normalize(claim).matchAll(/\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/g)].map(([, month]) => month);
      const monthFitsLatest = months.length === 1 && months[0] === 'octubre' && years.length === 1 && years[0] === 2026;
      return years.every((year) => observations.some((row) => row.year === year))
        && (!months.length || monthFitsLatest);
    },
    evidenceLabel: 'Ratio de cotizantes por pensionista publicada por la Seguridad Social',
    dimensions: dimensionsForYears([]),
    dimensionsForClaim: (claim) => dimensionsForYears(requestedYearsFor(claim)),
    facts: [seriesFact, fundingFact],
    factSourceIds: [[snapshot.source.id], [payAsYouGoSource.id]],
    factDimensions: [
      {
        subject: 'ratio oficial de cotizantes por pensionista',
        population: 'cotizantes y pensionistas incluidos en el indicador publicado por la Seguridad Social',
        period: '2014–2026; último dato de octubre de 2026',
        geography: 'España',
        denominator: 'pensionistas recogidos en el indicador oficial; la publicación ofrece la ratio, no los recuentos brutos usados para calcularla',
        unit: 'cotizantes por pensionista',
      },
      {
        subject: 'financiación de reparto de la Seguridad Social',
        population: 'prestaciones actuales del sistema español de Seguridad Social',
        period: 'reglas de financiación descritas por la Seguridad Social',
        geography: 'España',
        denominator: 'cotizaciones e ingresos generales',
        unit: 'descripción del sistema de financiación',
      },
    ],
    sources: [snapshot.source, payAsYouGoSource],
    shareableReplyForContext: ({ claim }) => {
      const rows = rowsFor(claim);
      const first = observations[0];
      const last = latest;
      if (isTrendClaim(claim)) {
        return [
          `La serie publicada no muestra una bajada en conjunto entre ${first.year} y octubre de ${last.year}: pasó de ${number(first.ratio)} a ${number(last.ratio)} cotizantes por pensionista. Hubo descensos en algunos años, así que no fue una subida continua.`,
          'El indicador describe la relación observada, pero no separa el efecto del envejecimiento de otros cambios en empleo y cotización. Tampoco basta por sí solo para decidir si el sistema es sostenible.',
        ].join('\n\n');
      }
      const latestFact = `En octubre de 2026, la Seguridad Social publicó ${number(last.ratio)} cotizantes por pensionista.`;
      const selectedFact = rows.length === 1 && rows[0].year === last.year
        ? latestFact
        : `La serie publicada da ${rows.map((row) => `${number(row.ratio)} en ${row.year}`).join(' y ')} cotizantes por pensionista.`;
      return [
        `${selectedFact} En un sistema de reparto, las cotizaciones y otros ingresos corrientes financian prestaciones actuales, por lo que la relación cotizantes/pensionistas es relevante.`,
        'La fuente no fija una cifra que signifique «suficientes». La ratio no incluye por sí sola las bases salariales, el importe de las prestaciones ni otras transferencias, así que no decide la sostenibilidad futura.',
      ].join('\n\n');
    },
  };
})();
const intergenerationalHousingPensionComparison = (t) => /\b(generaci[oó]n|generaciones|boomers?|nacid\w* entre|mayores? de)\b/.test(t)
  && /\b(viviend\w*|alquil\w*|compra de vivienda|acceso a la vivienda|propietari\w*)\b/.test(t)
  && /\b(pension\w*|jubilaci[oó]n|jubilad\w*)\b/.test(t)
  && /\b(mejor\w*|peor\w*|condiciones?|acceso|tendr\w*|podr\w*|futur\w*|compar\w*|diferenc\w*)\b/.test(t);
const businessTaxBurdenComparison = (t) => /\b(multinacional\w*|empresa\w*|negocio\w*|comerci\w*|tienda\w*|pyme\w*|compa[nñ]ia\w*)\b/.test(t)
  && /\b(impuest\w*|fiscal\w*|tribut\w*|sociedades|iva)\b/.test(t)
  && /\b(menos|mas|mayor|menor|reduc\w*|proporci\w*|efectiv\w*|carg\w*|compar\w*)\b/.test(t)
  && /\b(pag\w*|tribut\w*|carg\w*|contribu\w*|compit\w*|compar\w*)\b/.test(t);
const smallBusinessCostPressure = (t) => !housingInvestmentReturnComparison(t)
  && /\b(negocio\w*|comerci\w*|tienda\w*|empresa\w*|pyme\w*|restaurante\w*|bar\w*)\b/.test(t)
  && /\b(desaparec\w*|cerr\w*|cierr\w*|quebr\w*|inviab\w*|sobreviv\w*|margen\w*|rentabil\w*)\b/.test(t)
  && /\b(combinaci\w*|suma|acumulaci\w*|cost\w*|gasto\w*|alquil\w*|rent\w*|energ[ií]a|electricidad|impuest\w*|salari\w*|sueld\w*|cotiz\w*)\b/.test(t);
const businessSizeProductivityConstraint = (t) => /\b(empresas? peque[nñ]as?|peque[nñ]o tama[nñ]o|tama[nñ]o (?:medio de (?:las )?empresas?|empresari\w*)|pymes?|microempresas?)\b/.test(t)
  && /\b(inversi\w*|tecnolog\w*|productiv\w*|salari\w*|sueld\w*|innovaci\w*|exportaci\w*)\b/.test(t)
  && (/\b(limit\w*|fren\w*|impid\w*|reduc\w*|afect\w*|condicion\w*|explic\w*)\b/.test(t)
    || /\b(menos|menor\w*)[\s\w]{0,25}\b(capacidad|posibilidad|acceso)\b/.test(t));
const unpaidOvertime = (t) => /\b(horas? extra\w*|horas? extraordinari\w*)\b/.test(t)
  && /\b(no pag\w*|sin pag\w*|impag\w*|sin cobr\w*|no cobr\w*|gratis|no remuner\w*|sin remuner\w*|trabaj\w* gratis)\b/.test(t);
const reportedVsWorkedHours = (t) => /\b(?:horas?|jornad\w*|horari\w*|turn\w*)\b/.test(t)
  && /\b(trabaj\w*|hac\w*|cumpl\w*|real\w*|realiz\w*|efectiv\w*)\b/.test(t)
  && /\b(declar\w*|registr\w*|const\w*|fich\w*|contrat\w*|figur\w*|oficial\w*|anotad\w*|computad\w*)\b/.test(t);
const unpaidOvertimeEvidence = (() => {
  const number = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });
  const people = (thousands) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0, useGrouping: 'always' }).format(thousands * 1000);
  const periods = UNPAID_OVERTIME_SNAPSHOT.observations;
  const latest = periods.at(-1);
  const requestedQuarterFor = (claim) => {
    const text = normalize(claim);
    const namedQuarter = text.match(/\b(primer(?:o|a)?|segund(?:o|a)?|tercer(?:o|a)?|cuart(?:o|a)?)\s+trimestre\b|\btrimestre\s+(primero|segundo|tercero|cuarto)\b/);
    const named = namedQuarter?.[1] || namedQuarter?.[2];
    if (named) return /^(?:primer|primero|primera)$/.test(named) ? 1
      : /^segund/.test(named) ? 2 : /^tercer/.test(named) ? 3 : 4;
    const numbered = text.match(/\b([1-4])\s*t\b|\b[qt]([1-4])\b|\btrimestre\s*([1-4])\b/);
    return numbered ? Number(numbered[1] || numbered[2] || numbered[3]) : undefined;
  };
  const metricsFor = (row) => {
    const unpaid = row.unpaidOnly + row.both;
    return {
      unpaid,
      shareOfOvertime: number.format(unpaid / row.overtime * 100),
      shareOfSector: number.format(unpaid / row.employees * 100),
    };
  };
  const quarters = periods.map((row) => {
    const values = metricsFor(row);
    return `${row.period}: ${people(row.unpaidOnly)} solo no pagadas y ${people(row.both)} pagadas y no pagadas (${people(values.unpaid)} en total), ${values.shareOfOvertime} % de quienes hicieron horas extra (${people(row.overtime)}) y ${values.shareOfSector} % del total de asalariados del sector (${people(row.employees)})`;
  }).join('; ');
  const dimensionsForQuarter = (row) => ({
    subject: 'asalariados de hostelería que realizaron horas extra no pagadas, solos o junto con horas pagadas',
    population: 'asalariados de hostelería de ambos sexos; España',
    period: row.period,
    geography: 'España',
    denominator: `${people(row.overtime)} asalariados de hostelería con horas extra; ${people(row.employees)} asalariados totales del sector`,
    unit: 'personas estimadas y porcentajes',
  });
  const otherIndustryPatterns = [
    /\b(?:agricultur\w*|agrari\w*|ganader\w*|pesquer\w*|forestal\w*|miner\w*|extractiv\w*)\b/,
    /\b(?:comerci\w*|retail|construcci\w*|fabric\w*|industri\w*|manufactur\w*|energ[ií]a|electric\w*|suministro|agua|residu\w*|saneamiento)\b/,
    /\b(?:transport\w*|log[ií]stic\w*|almacen\w*|educaci\w*|docent\w*|universit\w*|escuel\w*|sanitari\w*|hospital\w*|m[eé]dic\w*|enferm\w*|salud)\b/,
    /\b(?:financier\w*|banc\w*|asegurador\w*|seguros?|inmobiliari\w*|inform[aá]tic\w*|tecnolog\w*|telecom\w*|profesional\w*|cient[ií]fic\w*|administrativ\w*)\b/,
    /\b(?:servicios? social\w*|cultur\w*|art[ií]stic\w*|deport\w*|dom[eé]stic\w*|hogar\w*|militar\w*|funcionari\w*|empleo p[uú]blico|sector p[uú]blico|sector privado|administraci[oó]n p[uú]blica|turis\w*)\b/,
  ];
  const mentionsAnotherIndustry = (claim) => otherIndustryPatterns.some((pattern) => pattern.test(claim));
  const mentionsAnExactSubsector = (claim) => /\b(?:restaurantes?|bares?|cafeter[ií]as?|hoteles?|hoteler\w*|hostales?|camarer\w*|cociner\w*)\b/.test(claim);
  return {
    directClaimEvidence: true,
    claimVerdict: 'mixed',
    expiresAt: UNPAID_OVERTIME_SNAPSHOT.expiresAt,
    territories: ['ES'],
    when: (claim) => {
      const years = [...claim.matchAll(/\b20\d{2}\b/g)].map(([year]) => Number(year));
      const mentionsMonth = /\b(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/.test(claim);
      const mentionsAnnualWindow = /\b(?:semestre|anual\w*|todo (?:el )?ano|durante todo (?:el )?(?:ano|20\d{2})|ano completo|a lo largo de (?:todo )?(?:el )?ano|cada trimestre|trimestre a trimestre|mes a mes|(?:esta|este|pasada?|anterior|actual|ultimo|ultimos?)\s+(?:semana|mes|trimestre|semestre|ano)|(?:semana|mes|trimestre|semestre|ano)\s+(?:pasado|pasada|anterior|actual)|ultim\w*\s+(?:\d+\s+)?(?:semanas?|meses?|trimestres?|semestres?|anos?)|primer\w*\s+(?:\d+\s+)?meses?)\b/.test(claim);
      const mentionsQuarter = /\b(?:trimestre|q[1-4]|t[1-4]|[1-4]\s*t)\b/.test(claim);
      const quarterMentions = claim.match(/\b(?:primer(?:o|a)?|segund(?:o|a)?|tercer(?:o|a)?|cuart(?:o|a)?|[1-4](?:er|o|to)?|q[1-4]|t[1-4]|[1-4]\s*t)\b/g) || [];
      const requestedQuarter = requestedQuarterFor(claim);
      const requestsOtherPeriod = mentionsMonth || mentionsAnnualWindow || mentionsQuarter
        && (!requestedQuarter || requestedQuarter > periods.length || quarterMentions.length !== 1 || !years.includes(2026));
      const requestsTrend = /\b(?:cada vez|aument\w*|increment\w*|crec\w*|sub\w*|dispar\w*|baj\w*|disminu\w*|empeor\w*|mejor\w*|tendencia|evoluci\w*)\b/.test(claim);
      const requestsOtherIndustry = mentionsAnotherIndustry(claim) || mentionsAnExactSubsector(claim);
      return years.every((year) => year === 2026) && !requestsOtherPeriod && !requestsTrend && !requestsOtherIndustry;
    },
    evidenceLabel: 'Asalariados que declaran horas extra pagadas o no pagadas en la EPA',
    dimensions: dimensionsForQuarter(latest),
    dimensionsForClaim: (claim) => dimensionsForQuarter(periods[(requestedQuarterFor(claim) || periods.length) - 1] || latest),
    facts: [
      `En la EPA, la estimación trimestral de asalariados de hostelería con horas extra solo no pagadas o con ambos tipos fue: ${quarters}. Cada cifra corresponde a su trimestre y no se suma como personas únicas, porque una persona puede aparecer en más de uno.`,
      'El cuestionario de la EPA pregunta por las horas extraordinarias pagadas y no pagadas en el empleo principal durante la semana de referencia. La tabla estima personas, no el total de horas no pagadas ni la frecuencia individual a lo largo del año.',
    ],
    factSourceIds: [
      [UNPAID_OVERTIME_SNAPSHOT.source.id],
      [UNPAID_OVERTIME_SNAPSHOT.questionnaireSource.id],
    ],
    factDimensions: [
      {
        subject: 'asalariados de hostelería con alguna hora extra no pagada, por trimestre',
        population: 'asalariados de hostelería de ambos sexos',
        period: '2026-T1, 2026-T2 y 2026-T3',
        geography: 'España',
        denominator: 'asalariados de hostelería con horas extra de cada trimestre; no son personas únicas en el año',
        unit: 'personas estimadas por trimestre, no acumulables',
      },
      {
        subject: 'horas extra pagadas y no pagadas en el empleo principal',
        population: 'personas asalariadas entrevistadas por la EPA',
        period: 'semana de referencia de cada entrevista',
        geography: 'España',
        denominator: 'horas trabajadas por la persona en su empleo principal',
        unit: 'horas extraordinarias pagadas y no pagadas declaradas',
      },
    ],
    sources: [UNPAID_OVERTIME_SNAPSHOT.source, UNPAID_OVERTIME_SNAPSHOT.questionnaireSource],
    shareableReplyForContext: ({ claim }) => {
      const normalizedClaim = normalize(claim);
      const isHospitalityClaim = /\bhosteler\w*\b/.test(normalizedClaim);
      const requestedQuarter = requestedQuarterFor(normalizedClaim);
      const selected = requestedQuarter ? periods[requestedQuarter - 1] : latest;
      const selectedMetrics = metricsFor(selected);
      const ordinal = ['primer', 'segundo', 'tercer', 'cuarto'][requestedQuarter ? requestedQuarter - 1 : 2];
      const hospitalityFinding = `En el ${ordinal} trimestre de 2026, ${people(selected.unpaidOnly)} asalariados de hostelería declararon solo horas extra no pagadas y otros ${people(selected.both)} declararon ambos tipos: ${people(selectedMetrics.unpaid)} personas. Es el ${selectedMetrics.shareOfOvertime} % de quienes hicieron horas extra en ese sector (${people(selected.overtime)}) y el ${selectedMetrics.shareOfSector} % de sus ${people(selected.employees)} asalariados.`;
      return [
        isHospitalityClaim
          ? hospitalityFinding
          : `En el ${ordinal} trimestre de 2026, ${people(selectedMetrics.unpaid)} asalariados de hostelería declararon alguna hora extra no pagada durante su semana de referencia. Para otros sectores, esta serie por sí sola no permite calcular el porcentaje: las categorías y el sector deben coincidir con la afirmación.`,
        `Las estimaciones trimestrales fueron ${people(metricsFor(periods[0]).unpaid)} en el primero, ${people(metricsFor(periods[1]).unpaid)} en el segundo y ${people(metricsFor(periods[2]).unpaid)} en el tercero. La EPA pregunta por las horas de la semana de referencia; estos recuentos muestran que ocurrió, pero no siguen a las mismas personas ni definen qué significa «habitual». Este dato no basta para confirmar toda la afirmación.`,
      ].join('\n\n');
    },
  };
})();
const wageGrowthJobMobility = (t) => /\b(salari\w*|sueld\w*|remuner\w*|nomina\w*)\b/.test(t)
  && /\b(subid\w*|aument\w*|mejor\w*|crec\w*|increment\w*)\b/.test(t)
  && /\b(cambi\w* de (?:empresa|trabajo|empleo)|cambio de (?:empresa|trabajo|empleo)|moverse de empresa|pasar a otra empresa)\b/.test(t);
const namedSector = /\b(turis\w*|hosteler\w*|hotel\w*|alojam\w*|agricultur\w*|sector primario|construcci\w*|industri\w*|manufactur\w*|comerci\w*|transporte|financier\w*|finanzas?|sector tecnolog\w*|tecnolog\w*\s+(?:sector|industria))\b/;
const sectorSalaryReference = (t) => /\b(salari\w*|sueld\w*|nomina\w*|remuner\w*|gan\w*)\b/.test(t)
  || /\b(cobr\w*|pag\w*)\b/.test(t) && /\bpor hora\b/.test(t)
  || /\b(mejor|peor)\s+pag\w*\b/.test(t);
const sectorWages = (t) => !businessTaxBurdenComparison(t) && !smallBusinessCostPressure(t)
  && !businessSizeProductivityConstraint(t) && !unpaidOvertime(t) && !wageGrowthJobMobility(t)
  && !firmWageCapacity(t) && !publicPrivatePayComparison(t) && !educationPayComparison(t)
  && (namedSector.test(t) || /\bsectores?\b/.test(t))
  && sectorSalaryReference(t)
  && /\b(productiv\w*|compar\w*|mas|menos|mejor\w*|peor\w*|bien pagad\w*|mal pagad\w*|bien remunerad\w*|mal remunerad\w*|mayor\w*|menor\w*|inferior\w*|superior\w*|alt\w*|baj\w*|media|promedio|tir\w* hacia abajo|por debajo|por encima|arrastr\w*|deprim\w*|lastr\w*|reduc\w*|diferenc\w*)\b/.test(t);
const namedEmploymentSectorPatterns = [
    /\b(turism\w*|turistic\w*)\b/, /\b(hosteler\w*|hotel\w*)\b/, /\b(agricultur\w*|sector primario)\b/,
    /\b(construcci\w*)\b/, /\b(industr\w*|manufactur\w*)\b/, /\b(comerci\w*)\b/, /\b(transporte)\b/,
    /\b(financier\w*|finanzas?)\b/, /\b(tecnolog\w*)\b/,
  ];
const sectorEmploymentChange = /\b(crec\w*|aument\w*|increment\w*|evoluc\w*|variac\w*|sub\w*|dismin\w*|baj\w*|cae|caen|cay\w*|caid\w*|descend\w*|retroced\w*|reduc\w*)\b/;
const sectorEmploymentComparison = (t) => namedEmploymentSectorPatterns.filter((pattern) => pattern.test(t)).length >= 2
    && /\b(emple\w*|trabaj\w*|ocupaci\w*|puestos? de trabajo|contrataci\w*)\b/.test(t)
    && /\b(mas|menos|mayor\w*|menor\w*|super\w*|inferior\w*|compar\w*|frente a|que)\b/.test(t)
    && !/\b(salari\w*|sueld\w*|nomina\w*|remuner\w*|productiv\w*)\b/.test(t);
const sectorEmploymentGrowthComparison = (t) => sectorEmploymentComparison(t) && sectorEmploymentChange.test(t);
const sectorEmploymentLevelComparison = (t) => sectorEmploymentComparison(t)
  && !sectorEmploymentChange.test(t);
const tourismEmploymentContribution = (t) => {
  const tourism = /\b(turism\w*|turistic\w*|hosteler\w*|ramas caracteristicas del turismo)\b/.test(t);
  const employment = /\b(emple\w*|trabaj\w*|ocupaci\w*|puestos? de trabajo|contrataci\w*)\b/.test(t);
  const contributionOrDependence = /\b(depende\w*|dependencia|dependient\w*|demasiad\w*|excesiv\w*|motor|principal|proporcion|porcentaj\w*|peso|parte|cuant\w*|crea\w*|genera\w*|aporta\w*|emplea\w*|concentr\w*)\b/.test(t);
  const regionalSectorComparison = requestedGeographyScopes(t).some((scope) => scope.type === 'region')
    && /\b(mas|menos|mayor|menor|super\w*|inferior\w*)\b/.test(t)
    && /\b(que|a|al|frente a|respecto a)\b/.test(t)
    && !/\b(crec\w*|aument\w*|increment\w*|evoluc\w*|variac\w*)\b/.test(t);
  const differentFamily = /\b(viviend\w*|alquil\w*|arrendam\w*|salari\w*|sueld\w*|productiv\w*|pernoctacion\w*|noches? de hotel)\b/.test(t);
  return !unpaidOvertime(t) && !reportedVsWorkedHours(t) && tourism && employment && (contributionOrDependence || regionalSectorComparison)
    && (!sectorEmploymentComparison(t) || regionalSectorComparison) && !differentFamily;
};
const selfEmploymentCostViability = (t) => {
  const selfEmployed = /\b(autonom\w*|trabajador\w* por cuenta propia|cuenta propia|freelance)\b/.test(t);
  const businessStart = /\b(emprend\w*|empez\w*|inici\w*|comenz\w*|mont\w*|abr\w*|cre\w*)\b/.test(t)
    && /\b(activid\w*|negocio\w*|empres\w*|proyecto\w*)\b/.test(t);
  const companyTaxScope = /\b(sociedad\w*|impuesto\w* de sociedad\w*|persona\w* juridic\w*|s\.?l\.?u?\.?|s\.?a\.?)\b/.test(t);
  return !companyTaxScope && (selfEmployed || businessStart)
    && /\b(cuot\w*|cotiz\w*|cost\w* fijo\w*|gasto\w* (?:fijo\w*|obligatori\w*)|gestor\w*|carga administrat\w*|impuesto\w*|fisc\w*|tribut\w*)\b/.test(t)
    && /\b(ingres\w*|factur\w*|rentab\w*|viable|inviable|compens\w*|irregular\w*|estable)\b/.test(t);
};
const employerContributionVisibility = (t) => {
  const contribution = /\b(cotiz\w*|cuot\w*|aportaci\w*)\b/.test(t);
  const employerNamed = /\b(empresari\w*|empresa|empleador\w*|patron\w*)\b.{0,45}\b(cotiz\w*|cuot\w*|aportaci\w*)\b/.test(t)
    || /\b(cotiz\w*|cuot\w*|aportaci\w*)\b.{0,45}\b(empresari\w*|empresa|empleador\w*|patron\w*)\b/.test(t);
  const labourCost = /\b(cost\w* laboral|cost\w* (?:real )?(?:del? )?(?:empleo|puesto|trabajo)|cu[aá]nto cuesta (?:realmente )?(?:(?:el|su|cada) )?(?:empleo|puesto|trabajo))\b/.test(t);
  const grossPay = /\b(salari\w* bruto|sueldo\w* bruto|n[oó]mina)\b/.test(t);
  const visibilityClaim = /\b(ocult\w*|no percib\w*|no v\w*|no aparec\w*|no figur\w*|no se reflej\w*|invisib\w*)\b/.test(t);
  const employeeContributionOnly = /\b(cotiz\w*|cuot\w*|aportaci\w*)\b.{0,24}\b(?:del|de la|que paga el)\s+(?:propio )?(?:trabajador|empleado)\b/.test(t)
    && !employerNamed;
  return contribution && visibilityClaim && (employerNamed && labourCost || !employerNamed && labourCost && grossPay)
    && !employeeContributionOnly;
};
const futurePensionOutlook = (t) => {
  const currentYear = new Date().getFullYear();
  const namesFutureYear = [...t.matchAll(/\b(?:20|21)\d{2}\b/g)].some(([year]) => Number(year) > currentYear);
  return /\b(pension\w*|jubil\w*|cotiz\w*)\b/.test(t)
    && (/\b(futur\w*|generaci\w*|cuando (?:me |se )?jubil\w*|dentro de \d+ a[nñ]os|(?:pagar|cobrar|recibir|tener|haber)an)\b/.test(t) || namesFutureYear)
    && /\b(pag\w*|cobr\w*|recib\w*|tendr\w*|garantiz\w*|menor\w*|inferior\w*|reemplaz\w*|sustituci[oó]n|cu[aá]nt[oa])\b/.test(t);
};
const futureRetirementAge = (t) => {
  const namesFutureYear = [...t.matchAll(/\b(?:20|21)\d{2}\b/g)].some(([year]) => Number(year) > new Date().getFullYear());
  const ageReference = /\b(edad (?:legal|ordinaria|efectiva)(?: de jubil\w*)?|edad de (?:jubil\w*|retiro))\b/.test(t)
    || /\b(jubil\w*|retir\w*)[\s\w]{0,32}\b(?:65|66|67|68|69|70|sesenta(?: y (?:cinco|seis|siete|ocho|nueve))?|setenta)\s*a[nñ]os\b/.test(t)
    || /\btrabaj\w*[\s\w]{0,28}\b(hasta|cerca de|a los)\b[\s\w]{0,18}\b(?:65|66|67|68|69|70|sesenta(?: y (?:cinco|seis|siete|ocho|nueve))?|setenta)\s*a[nñ]os\b/.test(t);
  const futureOrCohort = /\b(futur\w*|generaci\w*|j[oó]ven\w*|hoy|actual\w*|seguira|proyect\w*|normal\w*|sera|seran|tendra|tendran)\b/.test(t)
    || namesFutureYear;
  const pensionAmountClaim = /\b(cuant[ií]a|importe|pensi[oó]n\w*\s+(?:m[aá]s )?(?:baj\w*|menor\w*|inferior\w*))\b/.test(t);
  return ageReference && futureOrCohort && !pensionAmountClaim;
};
const statutoryRetirementAge = (t) => {
  const asksAboutOrdinaryAge = /\b(edad (?:legal|ordinaria) (?:de )?jubil\w*|edad de jubil\w*)\b/.test(t)
    || /\b(a que edad|que edad)\b[\s\w]{0,24}\b(jubil\w*|retir\w*)\b/.test(t);
  const asksAboutSupportedYear = [...t.matchAll(/\b20\d{2}\b/g)].every(([year]) => Number(year) >= 2026);
  const asksAboutFutureCohort = /\b(futur\w*|generaci\w*|j[oó]ven\w*|hoy|actual\w*)\b/.test(t);
  const asksAboutObservedAverage = /\b(media|promedio|efectiva|observad\w*|real)\b/.test(t);
  const asksAboutMigration = /\b(inmigr\w*|migrant\w*|extranj\w*)\b/.test(t);
  return asksAboutOrdinaryAge && asksAboutSupportedYear && !asksAboutFutureCohort && !asksAboutObservedAverage && !asksAboutMigration;
};
const housingCompletionReference = (t) => !touristHousingMention(t)
  && /\b(viviend\w*|casas?|pisos?)\b/.test(t)
  && /\b(termin\w*|complet\w*|finaliz\w*|acab\w*|conclu\w*)\b/.test(t);
const housingCompletionCountQuestion = (t) => housingCompletionReference(t)
  && (/\b(cuant\w*|numero|recuento|cantidad)\b/.test(t)
    || /\b92\s*000\b/.test(t) && /\b2025\b/.test(t));
const housingConstructionPressure = (t) => {
  const residentialSubject = /\b(viviend\w*|casas?|pisos?|alquil\w*|arrendam\w*|residencial)\b/.test(t);
  const constructionOrPlanning = /\b(constru\w*|edific\w*|obra nueva|viviendas? nuevas?|nuevas? viviendas?|viviendas? terminad\w*|licenci\w*|permis\w* urban\w*|planeamiento|urban[ií]stic\w*|suelo urbaniz\w*)\b/.test(t);
  const mismatchOrDelay = /\b(falta|escasez|escas\w*|insuficien\w*|poc\w*|demasiad\w*|deficit|brecha|desfase|desajuste|lento\w*|lentitud|tard\w*|retras\w*|atasc\w*)\b/.test(t);
  const causeOrPressure = /\b(explic\w*|caus\w*|provoc\w*|encarec\w*|presion\w*|subid\w*|aument\w*|sub\w*)\b/.test(t);
  const householdComparison = /\b(hogares?|demanda)\b/.test(t)
    && /\b(mas|menos|mayor\w*|menor\w*|crec\w*|aument\w*|por debajo|no alcanza|ritmo)\b/.test(t);
  return residentialSubject && constructionOrPlanning
    && (mismatchOrDelay || causeOrPressure || householdComparison)
    && !touristHousingDisplacementClaim(t)
    && !foreignHousingPriceCause(t);
};
const urbanPlanningLicenseDelay = (t) => /\b(licenci\w* urbanistic\w*|licenci\w* (?:municipal\w*|de obra\w*)|permis\w* urbanistic\w*|tramit\w* urbanistic\w*)\b/.test(t)
  && /\b(constru\w*|edific\w*|obra\w*)\b/.test(t)
  && /\b(lentitud|lent\w*|tard\w*|retras\w*|demor\w*|atasc\w*|fren\w*|poc\w*|escas\w*|insuficient\w*)\b/.test(t);
const housingConstructionClaimType = (t) => {
  if (/\b(caus\w*|explic\w*|provoc\w*|debido|porque|por culpa|hace que|oblig\w*|retras\w*|presion\w*)\b/.test(t)) return 'causal';
  if (/\b(mas que|menos que|mayor\w* que|menor\w* que|compar\w*|frente a(?:l)?|por debajo|no alcanza)\b/.test(t)) return 'comparative';
  if (/\b(cada vez|desde \d{4}|sub\w*|aument\w*|crec\w*|baj\w*|disminu\w*|reduc\w*)\b/.test(t)) return 'trend';
  return 'descriptive';
};
const pensionWageComparison = (t) => /\b(pension\w*|jubilad\w*|jubilacion\w*)\b/.test(t)
  && (/\b(salari\w*|sueld\w*|nomina\w*|remuner\w*|ingres\w*)\b/.test(t)
    || /\b(cobr\w*|pagan?)\b/.test(t) && /\b(trabajador\w*|emplead\w*|ocupad\w*)\b/.test(t))
  && /\b(mas que|mas (?:alt\w*|elevad\w*|grand\w*) que|menos que|por encima|por debajo|superior\w*|inferior\w*|super\w*|mayor\w*|menor\w*|compar\w*|frente a|mejor pagad\w*)\b/.test(t);

// Measurement contracts are reusable semantic families, not answer templates.
// Direct measures and contextual proxies stay distinct all the way to the
// answer. A missing direct measure must not be filled with a neighbouring
// topic merely because it has a convenient chart.
const focuses = [
  {
    id: 'youth-housing-family-formation-costs', label: 'vivienda, cotizaciones y decisiones familiares de la juventud',
    when: youthHousingFamilyFormation,
    direct: [], context: [], claimType: 'causal',
    needs: ['ingresos netos y gastos de vivienda de hogares jóvenes', 'cotizaciones e impuestos realmente pagados por esos hogares', 'ahorro y decisiones de formar una familia medidos en la misma población y periodo', 'comparación que permita separar estos factores de empleo, edad, cuidados y preferencias'],
    explanation: 'La dificultad para acceder a vivienda, las cotizaciones y las decisiones de tener hijos o ahorrar son resultados relacionados pero distintos. Un promedio de alquiler no mide cuánto reduce una cotización el ahorro ni si esos costes cambian las decisiones familiares.',
    limitation: 'Los datos de vivienda juvenil no permiten atribuir cambios en ahorro o natalidad a cotizaciones o alquileres. Harían falta medidas de hogar y periodo compatibles y un análisis que distinga otros factores.',
  },
  {
    id: 'inflation-tax-bracket-creep', label: 'inflación y actualización de los parámetros del IRPF',
    when: inflationTaxBracketCreep,
    direct: [], context: [], claimType: 'causal',
    needs: ['parámetros del IRPF y rentas nominales en el mismo periodo', 'estimación del efecto separado de cambios reales de renta y de la falta de actualización', 'grupo de hogares y supuestos de la simulación'],
    explanationHeadline: 'El Banco de España estima un efecto de progresividad en frío del IRPF',
    explanation: 'Si los tramos y otros parámetros nominales del IRPF no se actualizan con los precios, una subida nominal de ingresos puede elevar el impuesto efectivo aunque la renta real apenas cambie.',
    explanationEvidence: {
      directClaimEvidence: true,
      expiresAt: '2027-06-14', territories: ['ES'],
      dimensions: {
        subject: 'efecto de la inflación sobre la recaudación del IRPF',
        population: 'hogares y rentas modelados por el Banco de España; simulación con incremento homogéneo de rentas',
        geography: 'España', period: 'estimación hipotética y evolución observada 2019–2023',
        denominator: 'recaudación por IRPF; ratio IRPF/PIB', unit: 'elasticidad de recaudación y parte atribuida del cambio de la ratio',
      },
      facts: [
        'El Banco de España estima que, si no se actualizan los parámetros del IRPF, un aumento homogéneo del 1 % en las rentas elevaría la recaudación un 1,85 %. Es una estimación del efecto bajo ese supuesto, no un aumento observado que se aplique por igual a cada hogar.',
        'El estudio atribuye aproximadamente la mitad del aumento de la ratio IRPF/PIB entre 2019 y 2023 a la progresividad en frío. La conclusión se refiere al IRPF y a ese periodo; no mide la carga total de todos los impuestos.',
      ],
      sources: [{ id: 'fiscal-drag-bde', title: 'Progresividad en frío: impacto de la inflación sobre la recaudación por IRPF', publisher: 'Banco de España', url: 'https://www.bde.es/wbe/es/publicaciones/analisis-economico-investigacion/documentos-ocasionales/progresividad-en-frio--el-impacto-heterogeneo-de-la-inflacion-sobre-la-recaudacion-por-irpf.html', publishedAt: '2024-06-14', retrievedAt: '2026-11-17', role: 'primary' }],
    },
    limitation: 'La estimación describe la progresividad en frío del IRPF bajo supuestos concretos. No mide cuánto paga cada familia ni demuestra que toda inflación, cualquier impuesto o toda deducción produzca el mismo efecto.',
  },
  {
    id: 'labour-productivity-and-growth', label: 'Productividad laboral real y crecimiento económico',
    when: labourProductivityTrend,
    direct: ['real_labour_productivity_per_person', 'real_labour_productivity_per_hour'], context: ['gdp_real_annual', 'gdp_real_per_capita_annual', 'employment_persons_per_capita_national_accounts'], claimType: 'comparative',
    needs: ['productividad laboral real por persona ocupada y por hora para los mismos años', 'si se relaciona con el crecimiento agregado, PIB real total del mismo periodo; si menciona población o bienestar por persona, añadir PIB real por habitante', 'definición del empleo u horas usados como denominador y límites para atribuir causalidad'],
    limitation: 'El PIB real por persona ocupada y por hora mide productividad laboral media con denominadores diferentes. No identifica productividad total de los factores, diferencias entre empresas, composición del trabajo ni las causas del crecimiento.',
  },
  {
    id: 'gdp-total-per-capita-comparison', label: 'PIB real total y PIB real por habitante',
    when: gdpTotalPerCapitaComparison,
    direct: ['gdp_real_annual', 'gdp_real_per_capita_annual'], context: [], claimType: 'comparative',
    needs: ['variación del PIB real total y por habitante para los mismos años y territorio', 'definición del PIB por habitante y límite como aproximación a condiciones materiales, no a bienestar o renta de cada hogar'],
    limitation: 'El PIB por habitante es un promedio macroeconómico y no una medición del ingreso, la distribución o el bienestar de cada hogar. La comparación solo describe los años y el territorio indicados.',
  },
  {
    id: 'gdp-household-welfare', label: 'PIB y condiciones de vida de los hogares',
    when: gdpHouseholdWelfare,
    direct: [], context: [],
    claimType: 'comparative',
    needs: ['renta disponible mediana equivalente por persona, en términos reales, para el mismo territorio y periodo', 'distribución de la renta si se afirma que el crecimiento no llega a los hogares', 'definición concreta de bienestar si incluye vivienda, empleo, salud u otros servicios'],
    explanationHeadline: 'El PIB creció en 2025, mientras que dos indicadores de dificultades de los hogares evolucionaron en direcciones distintas',
    explanation: 'El PIB mide producción agregada, no la renta disponible ni la experiencia económica de cada hogar. La ECV recoge dificultades declaradas mediante preguntas concretas; no ofrece una única medida de “sensación económica general”.',
    explanationEvidence: GDP_HOUSEHOLD_WELFARE_SNAPSHOT,
    shareableReplyForContext: ({ facts }) => {
      const estimate = facts[2]?.match(/PIB real de España creció un ([\d,]+ %) en (\d{4}) respecto a (\d{4})/);
      const conciseGrowth = estimate
        ? `El INE estimó que el PIB real de España creció ${estimate[1]} en ${estimate[2]} frente a ${estimate[3]}.`
        : facts[2];
      const conditions = facts[3]?.match(/En la ECV de España, el ([\d,]+) % de la población llegó a fin de mes con mucha dificultad en (\d{4}), frente al ([\d,]+) % en (\d{4})\. A la vez, el ([\d,]+) % no podía afrontar gastos imprevistos, frente al ([\d,]+) % en (\d{4})\./);
      const conciseConditions = conditions
        ? `En la ECV de España, la proporción de población con mucha dificultad para llegar a fin de mes bajó de ${conditions[3]} % (${conditions[4]}) a ${conditions[1]} % (${conditions[2]}); la que no podía afrontar gastos imprevistos subió de ${conditions[6]} % a ${conditions[5]} %. Son preguntas distintas.`
        : facts[3];
      return [
        conciseGrowth,
        conciseConditions,
        'El PIB total mide producción, no renta de los hogares; el PIB por habitante solo aproxima el nivel material de vida. Estas cifras no permiten confirmar una mejora general ni cómo se repartió el crecimiento.',
      ].filter(Boolean).join('\n\n');
    },
    limitation: 'Esta comparación de datos de España cubre 2024–2025. El PIB no mide el ingreso de cada hogar y los porcentajes de la ECV son respuestas de la población, no tasas por hogar ni una medición de la experiencia de cada persona.',
  },
  {
    id: 'rural-urban-service-access', label: 'comparación de acceso rural y urbano a servicios',
    when: ruralUrbanAccess, claimType: 'comparative',
    direct: [], context: [],
    needsForClaim: ruralUrbanAccessNeedsForClaim,
    explanation: 'Una diferencia de acceso debe medirse para el mismo servicio y con una definición comparable de población rural y urbana. Un promedio nacional o un dato de otro servicio no demuestra esa diferencia.',
    limitation: 'Sin medidas comparables por servicio, población, territorio y periodo no se puede establecer cuánto difiere el acceso rural y urbano.',
  },
  {
    id: 'pension-private-savings-requirement', label: 'cotizaciones públicas y ahorro privado para la jubilación',
    when: pensionPrivateSavingsNeed,
    direct: [], context: [], claimType: 'comparative',
    claimTypeFor: (claim) => pensionPrivatePlanLegalClaim(claim) ? 'legal' : 'comparative',
    needsForClaim: (claim) => {
      const text = normalize(claim);
      const needs = ['distinguir una obligación legal general de una valoración económica de suficiencia personal'];
      if (!/\b(legal\w*|ley|obligatori\w*|obligad\w*)\b/.test(text)) {
        needs.push('estimación neta de pensión pública para una carrera laboral y una edad de jubilación concretas');
        needs.push('ingresos, gastos previstos y otros recursos de la persona u hogar al jubilarse');
      }
      if (/\b(j[oó]ven\w*|generaci\w*|cohorte|futur\w*|hoy|actual\w*)\b/.test(text)) needs.push('proyección explícita para la cohorte y el horizonte temporal mencionados');
      return needs;
    },
    explanation: 'Las cotizaciones a la Seguridad Social y el ahorro privado son mecanismos distintos. Que las cotizaciones financien prestaciones actuales no demuestra por sí solo que una persona vaya a tener que aportar también a un plan privado.',
    explanationHeadline: 'La ley y una tasa media de reemplazo no determinan si cada persona necesita ahorro privado',
    explanationEvidence: {
      ...PENSION_PRIVATE_SAVINGS_SNAPSHOT,
      selectForClaim: ({ normalizedClaim }) => pensionPrivatePlanLegalClaim(normalizedClaim) ? {
        directClaimEvidence: true,
        evidenceLabel: 'Obligaciones legales sobre cotización pública y planes privados de pensiones en España',
        claimVerdict: 'mixed',
        dimensions: { subject: 'obligación de cotizar a la Seguridad Social y carácter voluntario de los planes privados', population: 'personas incluidas en cada régimen legal y personas cubiertas por un plan de empleo', period: 'normativa vigente', geography: 'España', denominator: 'supuestos y plazo de exclusión definidos por la norma y el convenio colectivo', unit: 'reglas legales' },
        facts: [
          'En España, cotizar a la Seguridad Social es obligatorio en los regímenes y supuestos que define la ley; esa cotización pública no equivale a contratar un plan de pensiones privado.',
          'La ley configura los planes privados de pensiones como voluntarios. Si un convenio colectivo establece la incorporación directa a un plan de empleo, la persona se considera adherida salvo que comunique por escrito que no desea entrar dentro del plazo acordado.',
        ],
        factSourceIds: [
          [PENSION_PRIVATE_SAVINGS_SNAPSHOT.publicContributionsSource.id],
          [PENSION_PRIVATE_SAVINGS_SNAPSHOT.privatePlansLawSource.id],
        ],
        factDimensions: [
          { subject: 'obligación de cotización a la Seguridad Social', population: 'personas incluidas en cada régimen y supuesto legal', period: 'normativa vigente', geography: 'España', unit: 'obligación legal pública' },
          { subject: 'carácter voluntario de los planes privados y adhesión de empleo', population: 'personas cubiertas por un plan; adhesión automática solo si la prevé el convenio colectivo', period: 'normativa vigente', geography: 'España', denominator: 'plazo de exclusión establecido para el plan', unit: 'regla legal' },
        ],
        sources: [PENSION_PRIVATE_SAVINGS_SNAPSHOT.publicContributionsSource, PENSION_PRIVATE_SAVINGS_SNAPSHOT.privatePlansLawSource],
      } : undefined,
      directClaimEvidence: false,
      evidenceLabel: 'Contexto legal y proyección agregada de pensiones en España',
      claimVerdict: 'insufficient',
      dimensions: { subject: 'obligación pública de cotizar, planes privados y tasa de reemplazo modelada', population: 'personas sujetas a cotización pública; afiliados y pensionistas contributivos modelados por AIReF', period: 'normativa vigente y proyección 2027–2050', geography: 'España', denominator: 'cotizaciones obligatorias según régimen; pensión inicial respecto al salario al jubilarse', unit: 'reglas legales y porcentaje modelado' },
      facts: [
        'En España, cotizar a la Seguridad Social es obligatorio en los regímenes y supuestos que define la ley; esa cotización pública no equivale a contratar un plan de pensiones privado.',
        'La ley configura los planes privados de pensiones como voluntarios. Si un convenio colectivo establece la incorporación directa a un plan de empleo, la persona se considera adherida salvo que comunique por escrito que no desea entrar dentro del plazo acordado.',
        pensionPrivateReplacementRateSummary.fact,
      ],
      factSourceIds: [
        [PENSION_PRIVATE_SAVINGS_SNAPSHOT.publicContributionsSource.id],
        [PENSION_PRIVATE_SAVINGS_SNAPSHOT.privatePlansLawSource.id],
        [PENSION_PRIVATE_SAVINGS_SNAPSHOT.airefProjectionSource.id],
      ],
      factDimensions: [
        { subject: 'obligación de cotización a la Seguridad Social', population: 'personas incluidas en cada régimen y supuesto legal', period: 'normativa vigente', geography: 'España', unit: 'obligación legal pública' },
        { subject: 'carácter voluntario de los planes privados y adhesión de empleo', population: 'personas cubiertas por un plan; adhesión automática solo si la prevé el convenio colectivo', period: 'normativa vigente', geography: 'España', denominator: 'plazo de exclusión establecido para el plan', unit: 'regla legal' },
        { subject: 'tasa de reemplazo modelada', population: 'altas de jubilación contributiva representadas por la MCVL 2023 en el escenario de AIReF', period: '2027–2050 y posteriores', geography: 'España', denominator: 'pensión inicial / salario percibido al jubilarse', unit: 'porcentaje modelado' },
      ],
    },
    shareableReplyForContext: ({ claim }) => pensionPrivatePlanLegalClaim(normalize(claim))
      ? [
        'En España, cotizar a la Seguridad Social no obliga por sí solo a contratar un plan privado: la ley configura esos planes como voluntarios.',
        'Un convenio colectivo puede prever la adhesión automática a un plan de empleo, pero la persona puede excluirse por escrito dentro del plazo acordado. La respuesta se refiere a la obligación legal, no a si ahorrar conviene en cada hogar.',
      ].join('\n\n')
      : [
        'En España, cotizar a la Seguridad Social es obligatorio en los regímenes y supuestos que marca la ley. Los planes privados son voluntarios; un convenio colectivo puede establecer la adhesión automática a un plan de empleo, con opción de excluirse por escrito dentro del plazo acordado.',
        pensionPrivateReplacementRateSummary.reply,
        'Estos datos no demuestran que toda persona necesite ahorrar en privado ni cuánto. Para valorarlo hacen falta la pensión neta prevista, la carrera laboral y los ingresos, gastos y otros recursos del hogar.',
      ].join('\n\n'),
    limitation: 'La ley distingue cotizaciones públicas y planes privados, y permite una regla de adhesión automática por convenio colectivo con exclusión expresa. La proyección agregada de reemplazo no determina si una persona u hogar necesita ahorrar, ni cuánto.',
  },
  {
    id: 'pension-worker-beneficiary-ratio', label: 'personas cotizantes por pensionista y financiación del sistema',
    when: pensionWorkerSupportRatio,
    direct: [], context: [], claimType: 'comparative',
    needs: ['personas afiliadas que cotizan y personas pensionistas para el mismo periodo y perímetro', 'bases de cotización, ingresos del sistema y gasto en prestaciones', 'otras fuentes de financiación, transferencias y reglas de prestaciones'],
    explanation: 'La relación entre cotizantes y pensionistas puede describir la estructura del sistema, pero no determina por sí sola si la financiación es suficiente. También importan las bases salariales, las prestaciones y los ingresos no contributivos.',
    explanationHeadline: 'La ratio cotizante/pensionista aporta contexto, pero no mide por sí sola la sostenibilidad',
    shareableReplyForContext: pensionWorkerRatioEvidence.shareableReplyForContext,
    explanationEvidence: pensionWorkerRatioEvidence,
    limitation: 'La dependencia por edad no equivale a cotizantes por pensionista. Un único cociente sin importes, perímetro y fuentes de financiación no demuestra por sí solo la sostenibilidad del sistema.',
  },
  {
    id: 'pension-financing', label: 'cómo se financian las pensiones de reparto',
    when: (t) => /\b(pension\w*|jubilad\w*|jubilacion\w*)\b/.test(t) && /\b(reparto|capitaliz\w*|ahorr\w*|cuenta individual|cotizacion\w*|financ\w*)\b/.test(t)
      && /\b(actual\w*|propia\w*|reparto|capitaliz\w*|ahorr\w*|cuenta individual)\b/.test(t)
      && !/\b(plan\w* de pensiones|pension\w* privad\w*|plan\w* privad\w*)\b/.test(t),
    direct: [], context: [], needs: ['sistema de financiación aplicable', 'derechos contributivos y reglas de cálculo'],
    explanation: 'En un sistema de reparto, cotizar genera derechos conforme a las reglas vigentes; no crea por sí mismo una cuenta de ahorro personal.',
    explanationEvidence: {
      directClaimEvidence: true,
      expiresAt: '2027-01-28', territories: ['ES'],
      facts: ['En España, la Seguridad Social explica que las cotizaciones y otros ingresos corrientes financian las prestaciones actuales. Es financiación de reparto, distinta de acumular capital en una cuenta individual.'],
      sources: [{ id: 'social-security-pay-as-you-go', title: 'Financiación de la Seguridad Social: reparto y solidaridad', publisher: 'Seguridad Social', url: 'https://www.seg-social.es/wps/portal/wss/internet/PortalEducativo/Profesores/Unidad5/PESS501/PESS503', retrievedAt: '2026-10-30' }],
    },
    limitation: 'Esta descripción de la financiación no calcula tu futura pensión. No permite confirmar por sí sola la sostenibilidad del sistema; eso requiere reglas, periodos cotizados y escenarios demográficos y económicos.',
  },
  {
    id: 'intergenerational-housing-pension-comparison', label: 'vivienda y jubilación entre generaciones',
    when: intergenerationalHousingPensionComparison,
    direct: [], context: [], claimType: 'comparative',
    needs: ['medidas de acceso y coste de vivienda para las cohortes y edades comparadas', 'proyecciones de pensión para esas mismas cohortes bajo reglas y escenarios publicados', 'ingresos netos, composición del hogar, patrimonio y años de observación comparables', 'conclusiones separadas para vivienda y jubilación, con sus poblaciones y periodos'],
    explanation: 'Una comparación entre generaciones reúne al menos dos resultados distintos. El acceso a vivienda depende de precios, ingresos, crédito y patrimonio; la pensión futura depende de la carrera de cotización y de reglas y supuestos proyectados.',
    limitation: 'La metodología de una proyección de pensiones no aporta evidencia sobre la vivienda, y los precios de vivienda no predicen una pensión. Sin cohortes comparables y datos de ambos ámbitos no se puede concluir que unas generaciones tuvieron o tendrán mejores condiciones en conjunto.',
  },
  {
    id: 'pension-wage-contribution-base', label: 'salarios, empleo y financiación de pensiones',
    when: pensionWageContributionBase,
    direct: [], context: [], claimType: 'causal',
    needs: ['bases e ingresos por cotizaciones, con salarios, jornada y empleo comparables', 'recaudación contributiva y prestaciones financiadas en los mismos periodos', 'aportaciones públicas y cambios normativos separados de las cotizaciones sociales'],
    explanation: 'Más personas ocupadas no equivalen automáticamente a más ingresos suficientes para financiar las pensiones: importan los salarios, las jornadas, las bases de cotización y las reglas aplicables.',
    limitation: 'Una tasa de empleo o un salario mediano no mide por sí solo los ingresos totales por cotizaciones ni demuestra cuánto debilitan el sistema los salarios bajos.',
  },
  {
    id: 'statutory-retirement-age', label: 'edad ordinaria legal para acceder a la jubilación',
    when: statutoryRetirementAge,
    direct: [], context: [],
    needs: ['año de acceso solicitado', 'años cotizados por la persona, porque la edad depende de ese umbral', 'modalidad de jubilación, si no se pregunta por la ordinaria'],
    explanation: 'La edad ordinaria legal depende del tiempo cotizado. Es la edad de acceso a la pensión contributiva, no la edad media a la que se jubila la población ni una predicción para una generación futura.',
    explanationHeadline: 'La edad ordinaria de jubilación depende de los años cotizados',
    explanationEvidence: {
      expiresAt: RETIREMENT_AGE_SNAPSHOT.expiresAt,
      territories: ['ES'],
      directClaimEvidence: true,
      claimVerdict: 'mixed',
      dimensions: { subject: 'edad ordinaria de acceso a pensión contributiva', population: 'personas que cumplen los requisitos de cotización de cada tramo', period: '2026 y desde 2027', geography: 'España', denominator: 'años y meses cotizados', unit: 'años de edad' },
      facts: [
        'En España, en 2026 la edad ordinaria es 66 años y 10 meses con menos de 38 años y 3 meses cotizados, o 65 años con 38 años y 3 meses o más. Desde 2027, es 67 años con menos de 38 años y 6 meses, o 65 años con 38 años y 6 meses o más.',
        'La edad indicada permite acceder a la pensión contributiva ordinaria si se cumplen también los demás requisitos. No significa que todas las personas trabajen hasta esa edad ni que esa sea la edad efectiva media de retiro.',
      ],
      factSourceIds: [
        [RETIREMENT_AGE_SNAPSHOT.statutorySource.id, RETIREMENT_AGE_SNAPSHOT.currentRulesSource.id],
        [RETIREMENT_AGE_SNAPSHOT.statutorySource.id, RETIREMENT_AGE_SNAPSHOT.currentRulesSource.id],
      ],
      factDimensions: [
        { subject: 'edad ordinaria de acceso a pensión contributiva', population: 'personas según su periodo de cotización acreditado', period: '2026 y desde 2027', geography: 'España', denominator: 'umbral de cotización: 38 años y 3 meses en 2026; 38 años y 6 meses desde 2027', unit: 'años y meses de edad' },
        { subject: 'significado de la edad ordinaria legal', population: 'personas que reúnen los requisitos de acceso a pensión contributiva', period: 'normativa vigente', geography: 'España', unit: 'regla legal, no edad efectiva observada' },
      ],
      sources: [RETIREMENT_AGE_SNAPSHOT.statutorySource, RETIREMENT_AGE_SNAPSHOT.currentRulesSource],
    },
    shareableReplyForContext: ({ claim, facts }) => {
      const text = normalize(claim);
      const years = [...text.matchAll(/\b20\d{2}\b/g)].map(([year]) => Number(year));
      const asksForBothPeriods = years.length === 0 || (years.some((year) => year === 2026) && years.some((year) => year >= 2027));
      const asksFor2027OrLater = years.some((year) => year >= 2027);
      const schedule = facts[0];
      const selected = asksForBothPeriods ? schedule
        : asksFor2027OrLater ? schedule.slice(schedule.indexOf('Desde 2027,'))
          : schedule.slice(0, schedule.indexOf('. Desde 2027,'));
      return [`${(selected || schedule).replace(/[.]?$/, '.')}`, facts[1]].join('\n\n');
    },
    limitation: 'La edad legal depende del historial de cotización y de la modalidad de retiro. Este calendario no predice la edad efectiva de una persona ni la de una generación futura.',
  },
  {
    id: 'future-pension-outlook', label: 'pensiones futuras de una generación',
    when: futurePensionOutlook,
    direct: [], context: [],
    needs: ['cohorte de nacimiento y año previsto de jubilación', 'proyección de prestaciones bajo reglas, cotizaciones y supuestos económicos explícitos', 'tasa de sustitución o prestación neta y bruta, con carrera laboral y unidad comparables'],
    explanation: 'La pensión de una generación que aún trabaja es una proyección; la pensión media actual de jubilados no basta para calcular la suya.',
    explanationEvidence: {
      expiresAt: '2027-04-30', territories: ['ES'],
      facts: [
        'El modelo de AIReF proyecta gasto y prestaciones medias por cohorte, sexo, edad y tipo de pensión, con supuestos demográficos y macroeconómicos.',
        'Es un resultado agregado: no predice la pensión ni la tasa de sustitución de una persona.',
      ],
      sources: [{ id: 'airef-pension-projection-method-2025', title: 'Metodología del modelo para estimar el gasto en pensiones · Documento técnico 3/25', publisher: 'AIReF', url: 'https://www.airef.es/wp-content/uploads/2025/04/Documentos-tecnicos-segunda-opinion-sostenibilidad-a-largo-plazo-AAPP/250225_DT_metodologia_pensiones.pdf', retrievedAt: '2026-11-16' }],
    },
    limitation: 'La comparación actual de pensiones y salarios medios no prueba qué cobrarán los jóvenes: hay que fijar la cohorte, el año de jubilación y las reglas del escenario.',
  },
  {
    id: 'future-retirement-age', label: 'edad legal y efectiva de jubilación',
    when: futureRetirementAge,
    direct: [], context: [],
    needsForClaim: (claim) => {
      const text = normalize(claim);
      const needs = ['separar la edad ordinaria legal para acceder a una pensión de la edad efectiva a la que se retira la población'];
      if (/\b(j[oó]ven\w*|generaci\w*|hoy|actual\w*)\b/.test(text)) needs.push('proyección de la edad efectiva para la cohorte de nacimiento y el año previsto de jubilación');
      if (/\b(normal\w*|habitual\w*|mayor[ií]a|la mayor parte|muchos)\b/.test(text) || /\b(?:70|setenta)\s*a[nñ]os\b/.test(text)) needs.push('distribución de edades de jubilación por cohorte para medir qué proporción se retiraría cerca de la edad indicada');
      if (/\b(sub\w*|aument\w*|crec\w*|seguira|cada vez|tendenc\w*)\b/.test(text)) needs.push('serie observada o proyección de la misma medida, población y escenario para los años comparados');
      return needs;
    },
    explanation: 'La edad ordinaria de acceso a la pensión, la edad media observada al jubilarse y una proyección por cohorte son medidas distintas. Un promedio agregado no permite afirmar a qué edad se retirarán las personas jóvenes ni qué edad será «normal».',
    explanationHeadline: 'Los datos agregados de jubilación no predicen cuándo se retirará la juventud actual',
    explanationEvidence: {
      ...RETIREMENT_AGE_SNAPSHOT,
      directClaimEvidence: false,
      evidenceLabel: 'Contexto: edad legal, edad observada y proyección agregada de jubilación en España',
      facts: [
        'En España, la edad ordinaria para acceder a la pensión contributiva en 2026 es 66 años y 10 meses con menos de 38 años y 3 meses cotizados, o 65 años con ese periodo cotizado. Desde 2027, será 67 años con menos de 38 años y 6 meses, o 65 años con esa cotización.',
        'La Seguridad Social informó de una edad media de acceso de 65,4 años entre las nuevas altas de jubilación registradas hasta septiembre de 2026, frente a 64,4 años en 2019. Es un promedio observado, no una proyección para la juventud actual.',
        'El modelo de AIReF de 2025 proyecta una edad efectiva media de 65,2 años en 2024, 66,0 en 2030 y 66,2 en 2035. La cifra es agregada y no ofrece la edad de retiro de cada cohorte joven.',
      ],
      factSourceIds: [
        [RETIREMENT_AGE_SNAPSHOT.statutorySource.id, RETIREMENT_AGE_SNAPSHOT.currentRulesSource.id],
        [RETIREMENT_AGE_SNAPSHOT.observedAgeSource.id],
        [RETIREMENT_AGE_SNAPSHOT.projectionSource.id],
      ],
      factDimensions: [
        { subject: 'edad ordinaria de acceso a pensión contributiva', population: 'personas que cumplen los requisitos de cotización de cada tramo', period: '2026 y desde 2027', geography: 'España', denominator: 'años y meses cotizados', unit: 'años de edad' },
        { subject: 'edad media de acceso a nuevas pensiones de jubilación', population: 'nuevas altas de jubilación de la Seguridad Social', period: '2019 y hasta septiembre de 2026', geography: 'España', denominator: 'personas con nueva alta de jubilación', unit: 'años de edad' },
        { subject: 'edad efectiva media proyectada al jubilarse', population: 'población cubierta por el modelo agregado de AIReF', period: '2024, 2030 y 2035', geography: 'España', denominator: 'edad media en el escenario del modelo', unit: 'años de edad proyectados' },
      ],
    },
    shareableReplyForContext: ({ claim }) => {
      const nearSeventy = /\b(?:70|setenta)\s*a[nñ]os\b/.test(normalize(claim));
      return [
        'En 2026, la edad legal es 66 años y 10 meses con menos de 38 años y 3 meses cotizados; con ese periodo o más, 65 años. Desde 2027, el corte pasa a 38 años y 6 meses: 67 con menos y 65 con ese periodo o más.',
        'La Seguridad Social registra una edad media de acceso de 65,4 años hasta septiembre de 2026, frente a 64,4 en 2019. AIReF proyecta una edad media efectiva de 66,2 años en 2035.',
        nearSeventy
          ? 'La ley fija acceso a una pensión; las medias no predicen la edad de la juventud actual ni cuántas personas llegarían a 70. La afirmación no queda demostrada.'
          : 'El aumento agregado no identifica la edad a la que se jubilarán las generaciones jóvenes. La afirmación de futuro no queda demostrada.',
      ].join('\n\n');
    },
    limitation: 'La ley define edades ordinarias de acceso según cotizaciones. Las series observadas describen nuevas altas y AIReF proyecta promedios agregados; no establecen la edad efectiva de una cohorte joven ni la proporción que se jubilará cerca de 70.',
  },
  {
    id: 'retiree-housing-cost-comparison', label: 'ingresos de jubilación y gastos de vivienda',
    when: retireeHousingCostComparison,
    direct: [], context: [], claimType: 'comparative',
    needs: ['ingresos netos y gastos de vivienda de jubilados y trabajadores para hogares comparables', 'tenencia, hipoteca, alquiler y tamaño del hogar en el mismo territorio y periodo', 'distribución de renta disponible después de costes de vivienda, no solo promedios de grupos'],
    explanation: 'Tener una vivienda pagada puede reducir el gasto mensual de un hogar, pero eso no basta para comparar sus ingresos disponibles con los de trabajadores que alquilan. Hay que medir ingresos y costes de vivienda en hogares comparables.',
    limitation: 'La pensión media, el salario medio o la proporción de propietarios no muestran por sí solos cuántos jubilados tienen más renta después de vivienda que los trabajadores inquilinos.',
  },
  {
    id: 'pension-price-indexation', label: 'revalorización anual de pensiones contributivas e inflación',
    when: pensionPriceIndexation,
    direct: [], context: [], claimType: 'comparative',
    needs: ['revalorización aprobada para el ejercicio consultado', 'medida de inflación que corresponda al mismo periodo', 'gasto y consumo de los hogares si se afirma que cada pensionista conservó poder adquisitivo'],
    explanation: 'La revalorización general de las pensiones contributivas sigue una regla legal ligada al IPC medio del periodo de referencia. La cifra anual describe el aumento aprobado, no el coste de vida de cada hogar.',
    limitation: 'El porcentaje general de revalorización no mide la inflación personal de cada pensionista ni el poder de compra de su hogar; las cuantías mínimas y algunas prestaciones pueden seguir reglas distintas.',
    explanationEvidence: pensionPriceIndexationEvidence,
  },
  {
    id: 'pension-indexation-comparison', label: 'actualización de pensiones, salarios e inflación',
    when: pensionIndexationComparison,
    direct: [], context: [], claimType: 'comparative',
    needs: ['reglas y cambios efectivos de las pensiones en cada año', 'serie salarial definida como bruta o neta y para la misma población y periodo', 'índice de precios y comparación acumulada desde una fecha común'],
    explanation: 'La revalorización de las pensiones, el crecimiento de los salarios y la inflación son series distintas. Para decir cuál evolucionó mejor hay que fijar el periodo y comparar cambios acumulados en unidades compatibles.',
    limitation: 'Una regla de actualización con la inflación no demuestra por sí sola que las pensiones crecieran más que los salarios; importan las fechas iniciales, los cambios salariales y qué grupos se comparan.',
  },
  {
    id: 'pension-wage-comparison', label: 'pensiones y salarios de la población trabajadora',
    when: pensionWageComparison,
    direct: [], context: [],
    needs: ['importe de pensiones y salarios en la misma unidad y periodo', 'población trabajadora y pensionista definida por edad y tipo de prestación', 'distribución de importes si se afirma que muchas personas superan a otras'],
    explanation: 'Comparar pensiones con salarios exige fijar si los importes son brutos o netos y mensuales o anuales, además de usar el mismo periodo. Una pensión media y un salario medio no indican cuántas personas de un grupo cobran más que las del otro.',
    limitation: 'Sin distribuciones comparables por población, tipo de pensión, jornada y periodo no se puede cuantificar cuántas personas jubiladas reciben más que trabajadores jóvenes.',
  },
  {
    id: 'healthcare-double-payment', label: 'impuestos, seguro privado y gasto sanitario de los hogares',
    when: (t) => /\b(seguro(?: m[eé]dico)? privad\w*|sanidad privada|medicina privada|asistencia privada)\b/.test(t)
      && /\b(impuest\w*|cotiz\w*|financi\w* p[uú]blic\w*)\b/.test(t)
      && /\b(sanidad|salud|sanitari\w*|atenci[oó]n m[eé]dica)\b/.test(t),
    direct: [], context: [],
    needs: ['impuestos y cotizaciones atribuibles al mismo hogar', 'primas y pagos directos del seguro privado', 'cobertura, servicios y periodo comparables'],
    explanation: 'Pagar impuestos y una prima privada son dos vías de financiación; eso por sí solo no mide si un hogar paga dos veces por el mismo servicio ni cuánto soporta en total.',
    limitation: 'Las listas de espera públicas no miden primas privadas, pagos directos, solapamiento de coberturas ni la carga total por hogar.',
  },
  {
    id: 'specialist-outpatient-regional-waits', label: 'demoras de consultas externas del SNS por territorio',
    when: specialistOutpatientRegionalWaits,
    direct: [], context: [], claimType: 'comparative',
    needs: [],
    explanationHeadline: 'Las demoras registradas en consultas externas variaron entre territorios en 2025',
    explanation: 'El informe del Ministerio de Sanidad compara las listas de espera de consultas externas del Sistema Nacional de Salud por comunidad autónoma y ciudad autónoma.',
    explanationEvidence: { ...specialistOutpatientWaitEvidence, directClaimEvidence: true },
    limitation: 'Cada cifra es la espera media agregada de diez especialidades; no representa cada especialidad ni los tiempos de pacientes individuales. El informe no mide atención primaria, cirugía, pruebas diagnósticas ni hospitales concretos, y no establece un umbral de espera excesiva ni sus causas. El Ministerio advierte que los datos dependen de la información remitida por cada comunidad autónoma.',
  },
  {
    id: 'entrepreneurial-risk-perception', label: 'riesgo percibido al emprender y empleo público',
    when: (t) => /\b(emprend\w*|emprendedor\w*|crear (?:una )?empresa|montar (?:un )?negocio)\b/.test(t)
      && /\b(riesg\w*|arriesg\w*|segur\w*|estabil\w*)\b/.test(t)
      && /\b(plaza\w* p[uú]blic\w*|empleo p[uú]blico|funcionari\w*|oposici[oó]n)\b/.test(t),
    direct: [], context: [],
    needs: ['encuesta de preferencias y riesgo percibido entre personas comparables', 'probabilidad de ingresos y continuidad laboral por alternativa', 'población, territorio y periodo definidos'],
    explanation: 'La percepción de riesgo al emprender no se deduce de la temporalidad del empleo ni de la tasa de paro. Hacen falta respuestas de las mismas personas sobre alternativas comparables.',
    limitation: 'Una comparación entre emprendimiento y empleo público necesita definir qué riesgo se mide —ingresos, continuidad, inversión o fracaso— y a qué población se refiere.',
  },
  {
    id: 'foreign-new-build-local-affordability', label: 'compradores extranjeros y acceso local a vivienda nueva',
    when: foreignNewBuildLocalAffordability,
    direct: [], context: [], claimType: 'descriptive',
    needs: [
      'datos de promociones y ventas de vivienda nueva por localidad, periodo y perfil previsto o efectivo del comprador',
      'nacionalidad y residencia habitual del comprador, que son dimensiones distintas',
      'precios de vivienda nueva e ingresos o salarios de hogares residentes en la misma zona y periodo',
      'una medida de asequibilidad para hogares locales, no solo el volumen de compras de personas extranjeras',
    ],
    explanationHeadline: 'El registro muestra compras por nacionalidad, no a quién se destinan las promociones ni su asequibilidad local',
    explanation: 'Las compraventas inscritas pueden aportar contexto sobre quién compró, pero no indican para quién se construyó o comercializó una promoción ni si los hogares locales pueden pagarla.',
    explanationEvidence: {
      ...foreignNewBuildEvidence,
      directClaimEvidence: false,
      when: (text) => [...text.matchAll(/\b(?:19|20)\d{2}\b/g)].every(([year]) => year === '2025'),
    },
    shareableReplyForContext: ({ facts }) => [
      facts.join(' '),
      'Son compras registradas por nacionalidad en toda España, no datos sobre el público al que se dirigían las promociones. La fuente no cruza vivienda nueva con costa concreta, residencia habitual ni salarios locales; por eso no confirma la afirmación.',
    ].filter(Boolean).join('\n\n'),
    limitation: 'El Anuario Registral cubre España en 2025 y clasifica por nacionalidad. No mide la intención comercial de las promociones, la residencia habitual, el cruce entre vivienda nueva y localidades costeras ni la asequibilidad frente a salarios locales.',
  },
  {
    id: 'foreign-housing-price-causality', label: 'efecto de compras y población extranjera sobre los precios de vivienda',
    when: foreignHousingPurchaseCause,
    claimType: 'causal',
    direct: [], context: [],
    needs: ['compras de vivienda desglosadas por residencia habitual y nacionalidad del comprador', 'precios de vivienda o alquiler en los mismos municipios y periodos', 'una comparación causal que tenga en cuenta oferta, demanda local, turismo y financiación'],
    explanationHeadline: 'El registro cuenta compras por nacionalidad, no por residencia ni su efecto en los precios',
    explanation: 'El dato describe a compradores de nacionalidad extranjera, no a personas no residentes. Las cuotas muestran quién compra, pero no si esas compras elevaron los precios.',
    explanationEvidence: foreignHousingPurchaseEvidence,
    limitation: 'La estadística publica cuotas provinciales y no estima el efecto de esas compras en los precios locales.',
  },
  {
    id: 'migration-housing-demand-causality', label: 'efecto del crecimiento de población en los precios de vivienda',
    when: migrationHousingDemandCause,
    claimType: 'causal',
    direct: [], context: [],
    needs: ['cambios de población residente y flujos migratorios en los mismos municipios y periodos', 'alquileres o precios de vivienda, viviendas disponibles y oferta nueva en esas zonas', 'una comparación causal que separe el efecto de población de empleo, turismo, oferta y financiación'],
    explanation: 'El crecimiento de población puede coincidir con más demanda de vivienda, pero el recuento de residentes no mide cuánto cambia los precios ni permite atribuir una subida a la inmigración.',
    limitation: 'Las cifras nacionales de población inmigrante y los índices nacionales de vivienda no muestran la presión local sobre alquileres ni su efecto causal. Hacen falta medidas locales y una comparación para el mismo periodo.',
  },
  {
    id: 'work-housing-independence', label: 'acceso a vivienda independiente con empleo a jornada completa',
    when: workHousingIndependence,
    direct: [], context: [],
    needs: ['tasa de emancipación o vivienda independiente entre personas empleadas a jornada completa', 'ingresos netos y coste de alquiler o compra para la misma población, territorio y periodo', 'serie comparable de esa misma población para comprobar «ya no»'],
    explanationHeadline: 'Los datos juveniles disponibles no aíslan a quienes trabajan a jornada completa',
    explanation: 'Trabajar a jornada completa indica las horas trabajadas, no si el sueldo alcanza para vivir de forma independiente.',
    explanationEvidence: {
      expiresAt: '2027-04-27', territories: ['ES'],
      facts: [
        'El CJE sitúa en 14,5 % la población joven emancipada en España en 2025 (16–29 años, según el Observatorio); no desglosa el dato por jornada laboral.',
        'La ECV 2025 del INE indica que en España vivía con sus padres el 44,3 % de las personas de 26–34 años. Entre quienes convivían con sus padres, el 47,3 % señaló no poder permitirse alquilar o comprar como motivo principal.',
      ],
      sources: [cjeEmancipation2025Source, cjeEmancipationMethodologySource, ineHousingBarrierSource],
    },
    limitation: 'Estas cifras describen grupos de distintas edades; no indican si quienes trabajan a jornada completa viven por su cuenta.',
  },
  {
    id: 'rental-tenant-screening-exclusion', label: 'requisitos de acceso y rechazo de inquilinos',
    when: rentalTenantScreeningExclusion,
    direct: [], context: [], claimType: 'causal',
    needs: ['solicitudes y rechazos de alquiler desglosados por estabilidad de ingresos', 'requisitos de fianza, aval, seguro o solvencia aplicados en cada caso', 'misma población de solicitantes, territorio y periodo'],
    explanation: 'Que se pidan garantías no indica cuántas personas con ingresos irregulares son rechazadas ni por qué.',
    limitation: 'El esfuerzo medio del alquiler describe a hogares que ya alquilan; no mide solicitudes rechazadas ni selección por estabilidad de ingresos.',
  },
  {
    id: 'rental-regulation-contract-shift', label: 'cambios de oferta y contrato atribuidos a la regulación del alquiler',
    when: rentalRegulationContractShift,
    direct: [], context: [], claimType: 'causal',
    needs: ['viviendas y contratos residenciales por duración y régimen, antes y después de la medida', 'misma zona y periodo, con una zona comparable no afectada', 'análisis que separe la medida de demanda, turismo, estacionalidad y nueva construcción'],
    explanation: 'Un cambio en contratos o anuncios después de una norma no demuestra por sí solo que la norma lo causara.',
    explanationEvidence: {
      expiresAt: '2027-11-02', territories: ['ES', 'cataluna'],
      when: (claim) => /\b(temporad\w*|temporal(?:es)?|habitual\w*)\b/.test(claim),
      evidenceLabel: 'Contratos de temporada con fianza registrada en Cataluña',
      dimensions: {
        subject: 'contratos de alquiler de temporada con fianza registrada en el INCASÒL',
        population: 'contratos de temporada registrados; no viviendas identificadas como retiradas del alquiler habitual',
        period: '2023–2024', geography: 'Cataluña',
        denominator: 'contratos de temporada con fianza depositada en cada año', unit: 'contratos registrados',
      },
      facts: [
        'El registro de fianzas del INCASÒL contabilizó 9.330 contratos de temporada en 2023 y 13.517 en 2024 (+44,9 %).',
        'La serie cuenta contratos con fianza registrada en Cataluña. No identifica viviendas que pasaron del alquiler habitual al temporal ni el motivo del cambio; por sí sola no mide un efecto de la regulación.',
      ],
      sources: [{ id: 'catalonia-seasonal-rental-deposits', title: 'Lloguer de temporada per trimestres fins al segon trimestre de 2026', publisher: 'Agència de l’Habitatge de Catalunya · INCASÒL', url: 'https://habitatge.gencat.cat/ca/dades/indicadors_estadistiques/estadistiques_de_construccio_i_mercat_immobiliari/mercat_de_lloguer/lloguer-de-temporada/', publishedAt: '2026-11-02', retrievedAt: '2026-11-17', role: 'primary' }],
    },
    limitation: 'Los índices generales de alquiler y el número de anuncios no distinguen viviendas convertidas, retiradas, vacías o nuevas ni aportan el contrafactual necesario para medir el efecto de una regulación.',
  },
  {
    id: 'rental-landlord-motives', label: 'motivos de propietarios para retirar o cambiar el uso de una vivienda',
    when: rentalLandlordMotives,
    direct: [], context: [], claimType: 'causal',
    needs: ['cambios observados en viviendas retiradas, vacías o pasadas a contratos temporales', 'motivos declarados por una muestra representativa de propietarios que tomó esa decisión', 'si se alega flexibilidad, una medida concreta como duración, preaviso o disponibilidad de uso', 'territorio, periodo y comparación que permita separar el motivo alegado de otros cambios del mercado'],
    explanation: 'El miedo o la preferencia que se atribuye a los propietarios debe contrastarse con sus decisiones y motivos declarados.',
    explanationEvidence: rentalLandlordConcernEvidence,
    shareableReplyForContext: rentalLandlordConcernReply,
    limitation: 'Contar viviendas vacías no indica si estaban disponibles para alquilar ni por qué; las opiniones generales tampoco demuestran qué decisión tomó cada propietario.',
  },
  {
    id: 'tourist-housing-registration', label: 'registro y licencia de viviendas turísticas',
    when: touristHousingRegistrationQuestion,
    direct: [], context: ['tourist_housing_count'],
    needs: ['registro oficial de licencias o números de inscripción', 'mismo territorio y periodo del recuento solicitado'],
    explanation: 'El recuento del INE se estima a partir de anuncios y criterios autonómicos; no es un registro de licencias ni confirma la situación legal de cada vivienda.',
    limitation: 'El dato del INE puede dar contexto sobre el volumen estimado de anuncios turísticos, pero no permite contar viviendas licenciadas, sin licencia o con número de registro válido. Tampoco equivale necesariamente al total de apartamentos turísticos, cuya clasificación depende de cada comunidad autónoma.',
  },
  {
    id: 'tourist-housing-count', label: 'recuento de viviendas turísticas estimadas',
    when: (t) => touristHousingCountQuestion(t) && !touristHousingDisplacementClaim(t),
    direct: ['tourist_housing_count'], context: [],
    needs: ['número de viviendas turísticas estimadas', 'mismo periodo y nivel geográfico solicitado'],
    explanation: 'El INE ofrece una estimación experimental del número de viviendas turísticas a partir de anuncios en plataformas de alojamiento.',
    limitation: 'La estimación cubre anuncios de tres grandes plataformas, elimina duplicados y aplica criterios autonómicos. Los datos nacionales, autonómicos y provinciales no miden barrios ni viviendas retiradas del alquiler residencial.',
  },
  {
    id: 'tourist-housing-share', label: 'proporción estimada de viviendas turísticas sobre el parque de viviendas',
    when: (t) => touristHousingShareQuestion(t) && !touristHousingDisplacementClaim(t),
    direct: ['tourist_housing_share'], context: [],
    needs: ['porcentaje de viviendas turísticas sobre el parque de viviendas', 'denominador del Censo de Población y Viviendas de 2021', 'mismo periodo y nivel geográfico solicitado'],
    explanation: 'El porcentaje compara la estimación de viviendas turísticas del INE con el parque total de viviendas del Censo de 2021.',
    limitation: 'El denominador es el parque total del Censo de 2021, no una estimación actualizada de viviendas disponibles para alquiler. El porcentaje no mide qué viviendas se retiraron del alquiler residencial.',
  },
  {
    id: 'tourism-urban-housing-cost', label: 'presión turística sobre el coste de la vivienda para residentes',
    when: tourismUrbanHousingCostPressure,
    direct: [], context: ['tourist_housing_count', 'tourist_housing_share'], claimType: 'causal',
    needs: [
      'definir «lujo» o falta de asequibilidad mediante el coste de vivienda respecto a los ingresos netos de residentes',
      'alquileres residenciales e ingresos de residentes para los mismos barrios y periodos',
      'viviendas turísticas o estancias en esos mismos lugares y periodos',
      'una comparación que separe el efecto del turismo de la oferta, la demanda, los ingresos y otros factores',
    ],
    explanation: 'El número de viviendas turísticas puede describir actividad de alojamiento, pero no mide el coste de vivir para residentes ni demuestra que el turismo lo haya causado.',
    limitation: 'La estimación experimental del INE cuenta anuncios de tres plataformas y su porcentaje usa como denominador el parque total del Censo de 2021. Ninguno de esos datos mide alquileres e ingresos disponibles de hogares residentes, a escala nacional o de barrio, ni permite atribuir al turismo los cambios de coste.',
  },
  {
    id: 'tourism-employment-contribution', label: 'peso del empleo en las ramas características del turismo',
    when: tourismEmploymentContribution,
    direct: ['tourism_characteristic_employment_share'], context: ['tourism_characteristic_employment_jobs'],
    claimTypeFor: (t) => /\b(depende\w*|dependencia|dependient\w*|demasiad\w*|excesiv\w*|caus\w*|crea\w*|genera\w*)\b/.test(t) ? 'causal'
      : /\b(mas|menos|mayor\w*|menor\w*|super\w*|inferior\w*|compar\w*)\b/.test(t) ? 'comparative' : 'descriptive',
    needs: [
      'un criterio explícito para decidir qué peso sectorial sería «demasiado»',
      'empleo y demanda que permitan estimar cuántos puestos se deben causalmente al turismo',
      'calidad, salarios, jornada y estacionalidad de esos puestos',
    ],
    explanation: 'La Cuenta Satélite del Turismo mide el peso del empleo en las ramas económicas características del turismo.',
    evidenceGap: 'La cuota de empleo mide el tamaño de esas ramas, pero no establece un umbral estadístico para decidir si su peso es excesivo.',
    limitation: 'Las cifras cuentan empleo en ramas económicas características del turismo; no identifican qué puestos fueron causados por visitantes ni miden su calidad o estacionalidad.',
  },
  {
    id: 'tourist-housing-supply', label: 'efecto de las viviendas turísticas sobre la oferta residencial',
    when: touristHousingDisplacementClaim,
    direct: [], context: ['tourist_housing_count', 'tourist_housing_share'], claimType: 'causal',
    needs: ['viviendas que pasan del alquiler residencial a uso turístico en el mismo territorio y periodo', 'oferta de alquiler residencial antes y después del cambio', 'diseño que permita atribuir el cambio al uso turístico y no a otros factores'],
    explanation: 'El recuento de viviendas turísticas y su peso en el parque describen el uso turístico estimado; no indican cuántas viviendas dejaron el alquiler residencial ni prueban que el turismo causara una reducción de oferta.',
    limitation: 'El porcentaje usa como denominador las viviendas del Censo de 2021, no las viviendas disponibles para alquilar. La estadística experimental del INE usa anuncios deduplicados de tres plataformas y criterios autonómicos; el dato agregado no mide alquileres residenciales perdidos, y una cifra provincial o autonómica no describe barrios o municipios.',
  },
  {
    id: 'residential-gentrification-displacement', label: 'desplazamiento de residentes por cambios en el mercado residencial',
    when: residentialGentrificationDisplacement,
    direct: [], context: [], claimType: 'causal',
    needs: [
      'barrio o sección censal y periodos comparables',
      'entradas y salidas de residentes de larga duración o inquilinos en esa zona',
      'alquileres residenciales e ingresos de los hogares para la misma población, zona y periodo',
      'datos sobre los motivos de mudanza y una comparación que permita separar el efecto de la presión inmobiliaria de otros cambios',
    ],
    explanationHeadline: 'Un cambio en el perfil del barrio no demuestra por sí solo que sus residentes fueran expulsados',
    explanation: 'Para demostrar expulsión hacen falta datos de quién se mudó, cuándo y por qué; un cambio en la renta o demografía de una zona no basta.',
    evidenceGap: 'Faltan el barrio y el periodo concretos, los cambios de residencia, alquileres e ingresos comparables y datos sobre los motivos de mudanza.',
    explanationEvidence: residentialDisplacementEvidence,
    limitation: 'Un cambio en promedios de renta o población no prueba que los mismos residentes se fueran forzados ni qué causó su mudanza.',
  },
  {
    id: 'housing-completions', label: 'viviendas residenciales nuevas terminadas',
    when: housingCompletionCountQuestion,
    direct: [], context: [], claimType: 'descriptive',
    needs: ['recuento de viviendas residenciales terminadas en el periodo y territorio solicitados'],
    explanation: 'La cifra del Banco de España es un recuento anual nacional de viviendas nuevas terminadas.',
    explanationEvidence: HOUSING_COMPLETION_EVIDENCE,
    limitation: 'El recuento nacional no mide cuántas viviendas son asequibles, están disponibles para alquilar o se terminaron en una ciudad concreta.',
  },
  {
    id: 'housing-construction-pressure', label: 'producción de vivienda y crecimiento neto de hogares',
    when: housingConstructionPressure,
    direct: [], context: [], claimTypeFor: housingConstructionClaimType,
    needs: ['viviendas terminadas o disponibles y creación neta de hogares del mismo territorio y periodo', 'rentas o precios residenciales medidos en ese mismo ámbito', 'si se afirma causalidad, una comparación que separe planificación, capacidad constructora, financiación, costes y demanda'],
    explanation: 'Las cifras nacionales orientan sobre la oferta, pero no prueban qué causó un cambio en los alquileres.',
    evidenceGap: 'Faltan datos comparables de oferta y alquiler por municipio; la brecha nacional no demuestra por sí sola una causa.',
    explanationEvidence: HOUSING_SUPPLY_PRESSURE_EVIDENCE,
    limitation: 'Este cálculo nacional no cuenta hogares sin vivienda ni identifica unidades disponibles, asequibles o situadas donde creció la demanda.',
  },
  {
    id: 'urban-planning-license-delays', label: 'plazos de licencia urbanística y actividad de construcción',
    when: urbanPlanningLicenseDelay,
    direct: [], context: [], claimType: 'causal',
    needs: [
      'fecha de solicitud y de resolución de cada expediente, desglosada por municipio y tipo de obra',
      'número de solicitudes pendientes, concedidas, denegadas y retiradas en el mismo periodo',
      'construcción residencial efectivamente iniciada o terminada y un diseño que mida el efecto del plazo de licencia',
    ],
    explanation: 'La estadística del INE cuenta licencias de obra mayor concedidas y describe las obras. No mide el tiempo de tramitación ni demuestra que las licencias causen un menor ritmo de construcción.',
    shareableReplyForContext: ({ facts }) => [
      facts.join(' '),
      'El INE cuenta licencias concedidas, pero no mide cuántos días tardó cada expediente ni cuánto pesa esa demora sobre la construcción. Por sí solo, este dato no permite confirmar que el trámite cause un ritmo bajo de obras.',
    ].join('\n\n'),
    explanationEvidence: {
      directClaimEvidence: false,
      expiresAt: '2027-11-24', territories: ['ES'],
      dimensions: {
        subject: 'licencias municipales de obra mayor concedidas y características de las obras',
        population: 'obras mayores de construcción, rehabilitación y demolición de edificios incluidas en la estadística',
        geography: 'España; desagregación municipal o inferior', period: 'estadística mensual y anual; ficha vigente consultada el 24/11/2026',
        denominator: 'licencias de obra mayor concedidas; no todos los expedientes solicitados o pendientes',
        unit: 'recuento y características de licencias y obras; no días entre solicitud y resolución',
      },
      facts: [
        'La ficha vigente del INE describe una estadística mensual de licencias de obra mayor concedidas por los ayuntamientos en todo el territorio nacional. Registra, entre otras variables, las características de las obras y su duración prevista; esa duración es la de la obra, no el plazo de tramitación de la licencia.',
      ],
      sources: [{ id: 'ine-building-permits-methodology', title: 'Estadística de Construcción de Edificios · ficha del Inventario de Operaciones Estadísticas', publisher: 'Instituto Nacional de Estadística', url: 'https://www.ine.es/dyngs/IOE/operacion.htm?numinv=20001', retrievedAt: '2026-11-24', role: 'primary' }],
    },
    limitation: 'La ficha estadística recoge licencias concedidas y variables sobre las obras, no solicitudes pendientes ni fechas de solicitud y resolución para calcular tiempos de espera. Tampoco identifica cuánta construcción habría ocurrido sin esa demora; por eso no permite atribuir a las licencias un bajo ritmo de edificación.',
  },
  {
    id: 'housing-supply', label: 'viviendas disponibles para uso residencial',
    when: (t) => /\b(viviend\w*|piso\w*|alquil\w*|apartament\w*|casas?)\b/.test(t) && /\b(oferta|stock|disponib\w*|retir\w*|vaci[oa]\w*|turistic\w*)\b/.test(t)
      && !/\b(indice|porcentaje|tasa)\b/.test(t),
    direct: [], context: [], needs: ['número de viviendas por uso', 'entradas y salidas de la oferta residencial', 'mismo municipio y periodo', 'diseño causal si se atribuye el cambio al turismo'],
    explanation: 'La oferta residencial se comprueba con viviendas disponibles y cambios de uso en el mismo territorio y periodo.',
    limitation: 'Un índice de precios de compraventa o alquiler no cuenta las viviendas retiradas del mercado residencial. Las pernoctaciones turísticas tampoco equivalen a viviendas desplazadas.',
  },
  {
    id: 'subjective-financial-strain', label: 'dificultad declarada para cubrir los gastos habituales',
    when: subjectiveFinancialStrain,
    direct: ['subjective_poverty_rate'], context: ['subjective_poverty_difficulty_rate', 'subjective_poverty_great_difficulty_rate'], claimType: 'descriptive',
    needs: ['respuesta del hogar sobre su capacidad para cubrir gastos habituales', 'población y año de la encuesta'],
    explanation: 'EU-SILC pregunta a una persona del hogar si sus ingresos totales le permiten cubrir los gastos habituales. Eurostat define la pobreza subjetiva con las respuestas «con dificultad» o «con gran dificultad».',
    limitation: 'Es una percepción del hogar y el porcentaje se expresa sobre la población residente en hogares privados. No es un recuento de hogares, no identifica el empleo o la jornada de sus integrantes y no equivale al umbral monetario de pobreza.',
  },
  {
    id: 'working-poverty', label: 'trabajar y no poder cubrir los gastos',
    when: (t) => /\b(trabaj\w*|emple\w*|ocupad\w*|jornada completa)\b/.test(t) && /\b(pobrez\w*|pobres?|fin de mes|alcanza para vivir|llega para vivir|cubrir (?:los )?gastos)\b/.test(t),
    direct: ['in_work_poverty_rate', 'in_work_poverty_full_time_rate', 'in_work_poverty_part_time_rate'], context: [],
    needs: ['renta disponible del hogar y umbral de pobreza', 'tipo de jornada', 'periodo y población'],
    explanation: 'Tener empleo no garantiza quedar fuera del riesgo de pobreza: Eurostat mide si la renta disponible equivalente del hogar queda por debajo del 60 % de la mediana nacional, después de transferencias.',
    limitation: 'El umbral relativo de pobreza no mide la dificultad declarada para llegar a fin de mes. La respuesta subjetiva de EU-SILC es del hogar y no identifica el empleo ni la jornada de sus integrantes. El periodo es el año de la encuesta EU-SILC y los ingresos del umbral de pobreza pueden referirse a un año anterior.',
  },
  {
    id: 'local-safety-trend', label: 'evolución local de los delitos registrados o de la percepción de inseguridad',
    when: localSafetyTrend,
    direct: [], context: [], claimType: 'trend',
    needs: ['municipio y periodos comparables', 'delitos registrados por categoría o percepción vecinal', 'una fuente con ese desglose'],
    evidenceGap: 'Falta elegir si se comprueban delitos registrados o percepción vecinal, y concretar el municipio y los periodos.',
    explanationHeadline: 'Las fuentes oficiales distinguen delitos registrados de percepción vecinal',
    explanation: 'El Ministerio cuenta delitos registrados; la Encuesta de Condiciones de Vida del INE pregunta por percepción vecinal. Para comparar una tendencia local, dime el municipio y cuál de las dos medidas quieres revisar.',
    explanationEvidence: localSafetyMeasurementEvidence,
    limitation: 'Los datos publicados no miden la tendencia local con el mismo indicador, territorio y periodo que la afirmación.',
  },
  {
    id: 'fixed-discontinuous-employment-status', label: 'contratos fijos-discontinuos y clasificación EPA del paro',
    when: fixedDiscontinuousEmploymentStatus,
    direct: [], context: [],
    claimTypeFor: (t) => /\b(caus\w*|provoc\w*|oblig\w*|porque|debido a|por culpa de)\b/.test(t) ? 'causal'
      : /\b(desde (?:19|20)\d{2}|entre (?:19|20)\d{2}|cada vez|aument\w*|sub\w*|baj\w*|reduc\w*|crec\w*|evoluci\w*)\b/.test(t) ? 'trend'
        : /\b(cuant\w*|numero\w*|recuento\w*|porcentaje|tasa)\b/.test(t) ? 'quantitative' : 'descriptive',
    needsForClaim: (claim) => {
      const text = normalize(claim);
      return [
        'microdatos EPA que distingan contrato, actividad y situación durante cada semana de referencia',
        'búsqueda activa, disponibilidad y vínculo con el empleo para clasificar ocupación, paro e inactividad',
        'días trabajados e ingresos anuales durante los periodos sin actividad; los datos de prestaciones del SEPE son un registro distinto',
        ...(/\b(cuant\w*|numero\w*|recuento\w*|porcentaje|tasa|cuant[oa]s?)\b/.test(text)
          ? ['recuento de personas, no de contratos, con periodo y definición explícitos'] : []),
        ...(/\b(escond\w*|ocult\w*|encubiert\w*|maquill\w*|desplaz\w*|sustitu\w*|caus\w*|provoc\w*|oblig\w*|porque|debido a|por culpa de|desde (?:19|20)\d{2})\b/.test(text)
          ? ['comparación temporal y diseño que permita evaluar si cambió la clasificación o solo la modalidad contractual'] : []),
      ];
    },
    explanationHeadline: 'La modalidad fija-discontinua y el paro EPA son categorías distintas',
    explanation: 'El contrato fijo-discontinuo es indefinido y puede incluir periodos sin actividad. La EPA clasifica a las personas por su situación laboral en una semana de referencia; una prestación del SEPE durante la inactividad no equivale por sí sola a un recuento de paro EPA.',
    explanationEvidence: FIXED_DISCONTINUOUS_STATUS_EVIDENCE,
    shareableReplyForContext: () => [
      'El Estatuto define el fijo-discontinuo como contrato indefinido para trabajos estacionales o intermitentes, con periodos de actividad e inactividad.',
      'La EPA clasifica por semana: ocupada si trabajó al menos una hora o mantiene un empleo del que está temporalmente ausente; parada si no tiene empleo, buscó activamente en las cuatro semanas anteriores y está disponible.',
      'Eurostat clasifica como ocupados a los trabajadores estacionales fuera de temporada solo si siguen realizando tareas regulares; la EPA aplica esta metodología.',
      'El SEPE indica que pueden percibir prestación por desempleo durante la inactividad productiva entre campañas, si cumplen los requisitos. Cobrarla no prueba una clasificación errónea en la EPA.',
      'Estas fuentes no permiten confirmar que la EPA oculte parte del paro ni contar cuántas personas deberían añadirse. Harían falta microdatos EPA por semana sobre actividad, búsqueda y disponibilidad, y registros comparables de días trabajados, ingresos y prestaciones.',
    ].join('\n\n'),
    limitation: 'Las definiciones legales y estadísticas describen cómo se contrata, clasifica y protege a estas personas; no cuantifican cuántas deberían sumarse al paro EPA ni prueban una ocultación. Para medirlo hacen falta microdatos por persona y periodo, no contar contratos o prestaciones como si fueran personas desempleadas.',
  },
  {
    id: 'unemployment-wage-pressure', label: 'desempleo local, oferta de candidatos y negociación salarial',
    when: unemploymentWagePressure,
    claimType: 'causal',
    direct: [], context: [],
    needs: ['desempleo local y salarios comparables por ocupación, sector y periodo', 'candidatos por vacante en el mismo mercado laboral', 'comparación por jornada, antigüedad, negociación colectiva y fase del ciclo económico'],
    explanationHeadline: 'El desempleo puede influir en la negociación salarial, pero los estudios no prueban una regla universal',
    explanation: 'La relación entre paro y salarios depende del mercado y del ciclo; estos estudios no justifican una regla para todas las empresas.',
    explanationEvidence: unemploymentWagePressureEvidence,
    limitation: 'Son estudios históricos y de poblaciones específicas; no miden el desempleo estructural actual, los candidatos por vacante ni la política salarial de todas las empresas.',
  },
  {
    id: 'migration-fiscal-contribution', label: 'aportación fiscal de la población migrante por nivel laboral',
    when: migrationFiscalContribution,
    direct: [], context: [], claimType: 'causal',
    needs: ['ingresos fiscales y prestaciones atribuibles a personas comparables por país de nacimiento o ciudadanía', 'nivel de estudios, empleo, salarios y periodo de cada grupo', 'método que calcule contribución neta y no confunda programas o transferencias con el balance fiscal total'],
    explanation: 'Contar prestaciones o comparar salarios no mide la aportación fiscal neta de un grupo. La afirmación necesita ingresos y gastos públicos atribuibles a poblaciones comparables, con una definición explícita de contribución.',
    limitation: 'Los datos de beneficiarios de un programa y las tasas laborales por ciudadanía no permiten concluir qué grupo aporta más al conjunto de las cuentas públicas, ni separar el resultado por cualificación sin una medición específica.',
  },
  {
    id: 'migration-wage-effects', label: 'salarios y efecto de la inmigración en el mercado laboral',
    when: migrationWageEffects,
    direct: [], context: [], claimType: 'causal',
    needs: ['salarios por ocupación, sector, jornada y ciudadanía o país de nacimiento', 'población trabajadora comparable y mismo territorio y periodo', 'un diseño que permita separar el efecto migratorio de productividad, composición ocupacional, negociación y ciclo económico'],
    explanation: 'Una diferencia salarial entre personas migrantes y el resto no demuestra por sí sola que la inmigración haya reducido el sueldo de otras personas. Para comparar salarios hay que igualar ocupación, sector, jornada y periodo.',
    limitation: 'Las medias salariales nacionales, el desempleo por ciudadanía y la tasa de sobrecualificación miden resultados distintos; no establecen una brecha salarial por ciudadanía ni un efecto causal sobre los salarios de un sector.',
  },
  {
    id: 'migration-overqualification', label: 'sobrecualificación entre personas extranjeras con estudios terciarios',
    when: migrationOverqualification,
    direct: ['tertiary_overqualification_rate'], context: [],
    needs: ['tasa del mismo grupo de ciudadanía, edad, territorio y periodo', 'denominador de personas ocupadas con estudios terciarios, no toda la población migrante'],
    explanation: 'Eurostat publica la tasa de sobrecualificación entre personas ocupadas de 20 a 64 años con estudios terciarios y permite desglosarla por ciudadanía. Cuenta como sobrecualificadas a quienes trabajan en ocupaciones ISCO 4–9.',
    explanationEvidence: eurostatOverqualificationEvidence,
    limitation: 'El dato describe ciudadanía extranjera, no país de nacimiento; el denominador son personas ocupadas con estudios terciarios, no toda la población migrante. La tasa no registra dónde se obtuvo el título ni si fue homologado.',
  },
  {
    id: 'migrant-credential-recognition', label: 'reconocimiento de títulos y adecuación laboral por ciudadanía',
    when: migrationCredentialRecognition,
    direct: [], context: ['tertiary_overqualification_rate'],
    needs: ['nivel y país de obtención del título, reconocimiento u homologación y ocupación posterior', 'tiempo de tramitación y población solicitante comparable', 'una comparación que permita atribuir el desajuste al proceso de reconocimiento'],
    explanation: 'Eurostat mide la sobrecualificación por ciudadanía: personas ocupadas con educación terciaria que trabajan en ocupaciones de cualificación baja o media. El indicador puede describir un desajuste laboral, pero no registra el país donde se obtuvo el título ni si fue homologado.',
    explanationEvidence: eurostatOverqualificationEvidence,
    limitation: 'Una tasa por ciudadanía no equivale a una tasa por país de nacimiento y no mide solicitudes, retrasos ni decisiones de homologación. Aunque haya diferencias entre grupos, no demuestra que el reconocimiento de títulos las cause.',
  },
  {
    id: 'healthcare-staffing-causality', label: 'disponibilidad territorial de profesionales sanitarios y condiciones de trabajo',
    when: healthcareWorkforceCausality,
    direct: [], context: [], claimType: 'causal',
    needs: ['médicos en ejercicio, vacantes y población por especialidad y territorio', 'graduados que se incorporan al sistema y puestos que aceptan', 'condiciones laborales comparables y una medida que permita atribuir las vacantes a esas condiciones'],
    explanation: 'El número de titulados no equivale al número de médicos disponibles en cada zona. También importan la especialidad, la incorporación al sistema, las vacantes y las condiciones de los puestos.',
    limitation: 'Un total nacional de médicos o de graduados no permite establecer por qué faltan profesionales en una zona concreta. Para atribuirlo a las condiciones laborales hacen falta datos territoriales y una comparación del mismo periodo.',
  },
  {
    id: 'public-private-job-conditions', label: 'condiciones laborales y elección entre empleo público y privado',
    when: publicPrivateJobConditions,
    direct: [], context: [], claimType: 'causal',
    needs: ['condiciones y horarios efectivos en puestos públicos y privados comparables', 'preferencias y decisiones de personas con ocupación y formación similares', 'mismo territorio y periodo, separando conciliación, estabilidad y salario'],
    explanation: 'Que un puesto público tenga fama de ofrecer más conciliación no demuestra que esa condición cause que profesionales cualificados lo elijan. Hacen falta datos de condiciones reales y motivos de elección entre personas comparables.',
    limitation: 'Las tasas de empleo por titulación y la temporalidad no miden la conciliación ni explican por qué alguien busca trabajo en un sector.',
  },
  {
    id: 'public-private-pay-comparison', label: 'salarios públicos y privados para trabajos comparables',
    when: publicPrivatePayComparison,
    direct: [], context: [], claimType: 'comparative',
    needs: ['salarios brutos y netos por ocupación, cualificación, antigüedad y jornada', 'complementos, estabilidad y horas trabajadas en ambos sectores', 'misma población, territorio y periodo'],
    explanation: 'Comparar salarios públicos y privados exige igualar ocupación, cualificación, jornada y antigüedad. Las medias generales de cada sector pueden reflejar que sus plantillas realizan trabajos distintos.',
    limitation: 'Sin perfiles laborales comparables no se puede afirmar qué sector paga más en puestos de baja cualificación ni trasladar una media sectorial a cada trabajador.',
  },
  {
    id: 'education-socioeconomic-performance', label: 'origen socioeconómico y rendimiento académico',
    when: educationSocioeconomicPerformance,
    direct: [], context: [], claimType: 'causal',
    needs: ['resultados académicos y condiciones socioeconómicas medidos para el mismo alumnado, materia, edad, curso, territorio y periodo', 'una comparación que separe ingresos, educación y ocupación familiar, recursos escolares y otros factores', 'un criterio cuantificable para valorar qué significa «demasiado»'],
    explanationHeadline: 'PISA encuentra una diferencia por contexto socioeconómico, pero no demuestra una causa única',
    explanation: 'PISA mide el rendimiento en una prueba estandarizada y relaciona las puntuaciones con un índice socioeconómico amplio. La asociación no demuestra cuánto causan los ingresos familiares ni si una diferencia es «demasiado» grande.',
    explanationEvidence: { ...EDUCATION_SOCIOECONOMIC_SNAPSHOT, when: educationSocioeconomicSnapshotFitsRequest },
    shareableReplyForContext: ({ facts }) => `${facts.slice(0, 3).join(' ')} La asociación no permite atribuir la brecha a los ingresos familiares ni decidir si es excesiva. PISA evalúa ciencias a los 15 años; no mide las notas de todas las etapas.`,
    limitation: 'El dato se refiere a ciencias y estudiantes de 15 años en PISA 2025; no mide las calificaciones de todas las etapas. El ESCS combina educación y ocupación parentales y posesiones del hogar, no solo renta. Una asociación estadística no identifica por sí sola un efecto causal ni determina si la diferencia es excesiva.',
  },
  {
    id: 'education-pay-comparison', label: 'salarios según formación exigida por el puesto',
    when: educationPayComparison,
    direct: [], context: ['mean_hourly_earnings_by_education'], claimType: 'comparative',
    needs: ['salarios comparables por ocupación y por formación o cualificación exigida para el puesto', 'jornada, experiencia, sector, territorio y periodo comparables', 'distribuciones salariales y una definición medible de «acorde»'],
    explanation: 'Eurostat ofrece una referencia de 2022 por los estudios que han alcanzado las personas empleadas. Sirve para contextualizar diferencias salariales, pero no indica qué formación exigía cada puesto.',
    limitation: 'La media bruta por hora no muestra la distribución salarial ni iguala ocupación, jornada, experiencia o sector. Por eso no determina si un empleo paga «acorde» con sus requisitos ni cuánto cobrará una persona concreta.',
  },
  {
    id: 'education-skill-demand-vs-curriculum', label: 'competencias laborales y contenidos de los estudios',
    when: educationSkillsVsCurriculum,
    direct: [], context: [], claimType: 'comparative',
    needs: ['competencias solicitadas en ofertas de empleo comparables por ocupación, territorio y periodo', 'contenidos y objetivos de aprendizaje de las titulaciones que se comparan', 'un resultado laboral comparable que permita relacionar las competencias con contratación, empleo o salario', 'un criterio medible para interpretar «pesan más»'],
    explanation: 'La tasa de empleo por nivel educativo cuenta cuántas personas trabajan; no mide qué competencias piden las empresas ni las compara con los contenidos de una titulación.',
    limitation: 'Sin vacantes, programas formativos y resultados laborales comparables, no se puede determinar qué competencias pesan más ni atribuir un resultado laboral a las asignaturas cursadas.',
  },
  {
    id: 'education-employment-outcomes', label: 'empleo y adecuación al nivel de estudios',
    when: educationEmploymentOutcome,
    direct: [], context: [],
    needs: ['tasa de empleo o paro del nivel educativo y la población comparados, con el mismo periodo y territorio', 'ocupaciones que requieren educación terciaria y nivel educativo de quienes las ocupan', 'para afirmar qué titulación exigen las ofertas, requisitos de anuncios de empleo comparables en el tiempo'],
    explanation: 'Las tasas de empleo o paro por nivel educativo muestran si las personas tituladas trabajan; no indican por sí solas si el puesto corresponde a sus estudios. Acceso al empleo y ajuste entre formación y ocupación son resultados distintos.',
    explanationHeadline: 'Los datos de inserción laboral describen grupos, no garantizan el ajuste de cada empleo',
    explanationEvidence: {
      ...UNIVERSITY_GRADUATE_OUTCOMES_SNAPSHOT,
      when: educationSiiuGraduateOutcomes,
    },
    shareableReplyForContext: ({ claim, facts, metricFacts, scopeNotes = [] }) => {
      const metricFinding = (fact) => {
        if (!Number.isFinite(fact.value) || !fact.period) return fact.text;
        const value = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(fact.value);
        const scope = `${fact.geography || 'España'}, ${fact.period}`;
        if (fact.id === 'employment_rate_tertiary_education') return `${fact.publisher || 'Eurostat'} (${scope}): el ${value} % de residentes de 20 a 64 años con educación terciaria tenía empleo.`;
        if (fact.id === 'unemployment_rate_tertiary_education') return `${fact.publisher || 'Eurostat'} (${scope}): el ${value} % de la población activa de 20 a 64 años con educación terciaria estaba en paro.`;
        if (fact.id === 'tertiary_overqualification_rate') return `Sobrecualificación (${scope}): el ${value} % de personas ocupadas de 20 a 64 años con educación terciaria trabajaba en ocupaciones ISCO 4–9, de cualificación baja o media.`;
        if (fact.id === 'tertiary_overqualification_rate_age_20_34') return `Sobrecualificación (${scope}): el ${value} % de personas ocupadas de 20 a 34 años con educación terciaria trabajaba en ocupaciones ISCO 4–9, de cualificación baja o media.`;
        return fact.text;
      };
      const selectedMetricFindings = metricFacts?.map(metricFinding).filter(Boolean) || [];
      const conciseScopeNotes = scopeNotes.map((note) => note.startsWith('La fuente señala que la definición de este dato difiere')
        ? 'La fuente señala una diferencia de definición; compara años con cautela.'
        : note);
      const normalizedClaim = normalize(claim);
      const individualGuaranteeLimit = /\bgarant\w*\b/.test(normalizedClaim) ? 'Son resultados de grupo, no una garantía individual.' : '';
      const temporalLimit = /\b(ya no|antes|ahora|cada vez|ha aumentado|ha subido|ha bajado|evoluci\w*)\b/.test(normalizedClaim)
        ? 'No compara cohortes previas ni acredita un cambio temporal.'
        : '';
      const measurementSummary = [...selectedMetricFindings, ...conciseScopeNotes].filter(Boolean).join(' ');
      const outcomeLimit = [individualGuaranteeLimit, temporalLimit].filter(Boolean).join(' ');
      return [measurementSummary, facts.join(' '),
        'El grupo de cotización aproxima el nivel del puesto, pero no confirma los requisitos ni el ajuste por campo. El SIIU cubre afiliados por cuenta ajena en España, no empleo exterior. Medir el ajuste requiere vincular estudios y tareas del puesto.',
        outcomeLimit,
      ].filter(Boolean).join('\n\n');
    },
    limitation: 'Las tasas de empleo, paro y sobrecualificación tienen denominadores distintos: residentes con estudios terciarios, personas activas con esos estudios y personas ocupadas con esos estudios. Las series no prueban una garantía individual, no se limitan a recién titulados y no miden anuncios que exigen un máster ni el campo de estudios.',
  },
  {
    id: 'job-opportunities', label: 'oportunidades para encontrar empleo',
    when: (t) => !/\b(?:por culpa|debido a|porque|caus\w*|inmigr\w*|extranj\w*|tasa|porcentaje|por ciento|proporcion|ratio|indice|cuant[oa]s?|numero de)\b/.test(t)
      && (/(?:\b(?:no (?:hay|quedan?|existen?)|apenas (?:hay|quedan?)|casi no hay|faltan?|escasean?|escas[oa]s?|poc[oa]s?|ningun[oa]s?)\b[\s\w]{0,45}\b(?:trabaj\w*|emple\w*|ofertas? (?:de )?(?:trabajo|empleo)|puestos? de trabajo)\b)/.test(t)
        || /\b(?:nadie|no|nunca|apenas|dificil|cuesta|imposible)\b[\s\w]{0,45}\b(?:encontr\w*|encuentr\w*|consegu\w*|consigu\w*|hall\w*)\b[\s\w]{0,25}\b(?:trabajo|empleo)\b/.test(t)
        || /\b(?:trabajo|empleo)\b\s+no\s+(?:hay|queda|existe)\b/.test(t)),
    direct: [], context: ['unemployment_rate'],
    needs: ['vacantes y personas que buscan empleo en el mismo lugar y periodo', 'ocupación, condiciones del puesto y perfil de las personas', 'una definición de oportunidad de empleo'],
    explanation: 'La tasa de paro cuenta a las personas desempleadas entre las personas activas; no cuenta los puestos disponibles ni indica si una persona concreta encontrará trabajo.',
    limitation: 'Las oportunidades dependen del territorio, la ocupación y las condiciones del puesto. La temporalidad de los contratos tampoco mide cuántos empleos hay disponibles.',
  },
  {
    id: 'food-chain-price-spread', label: 'precios agrícolas y diferencias entre etapas de la cadena alimentaria',
    when: foodChainPriceSpread, direct: [], context: [], claimType: 'comparative',
    claimTypeFor: (t) => /\b(demasiad\w*|excesiv\w*|desproporcionad\w*|abusiv\w*|poc\w*)\b/.test(t) ? 'normative' : 'comparative',
    needs: ['producto alimentario y periodo definidos', 'precios comparables del mismo producto, calidad y unidad en las etapas que se comparan', 'costes atribuibles a cada etapa para distinguir margen bruto de beneficio neto', 'un criterio medible para decidir qué precio o margen sería «demasiado» alto o bajo'],
    explanationHeadline: 'La diferencia de precios no equivale al beneficio de cada intermediario',
    explanation: 'El precio en origen y el precio final describen etapas distintas. Su diferencia no permite atribuir por sí sola cuánto cobra cada intermediario ni si el margen es excesivo.',
    shareableReplyForContext: ({ facts }) => [
      facts[0],
      facts[1],
      'Con esta afirmación general no se puede decidir si el precio de origen es «demasiado bajo» ni si el margen es «excesivo»: faltan el producto y el periodo definidos, la calidad comparable y un criterio medible.',
    ].filter(Boolean).join('\n\n'),
    explanationEvidence: FOOD_CHAIN_PRICE_SPREAD_EVIDENCE,
    limitation: 'Las series del MAPA cubren productos y etapas concretos; los precios de origen y destino no siempre son homogéneos. La diferencia de precios no demuestra por sí sola el beneficio neto de intermediarios ni qué reparto sería justo.',
  },
  {
    id: 'wage-price-margin-pass-through', label: 'salarios, costes empresariales, precios y márgenes',
    when: wagePriceMarginPassThrough,
    direct: [], context: [], claimType: 'causal',
    needs: ['cambio salarial y coste laboral total del sector u ocupación afectados', 'precios de venta y márgenes empresariales para la misma actividad y periodo', 'peso del trabajo en los costes, productividad y otras variaciones de costes o demanda', 'una comparación que permita separar asociación y traslado causal a precios o márgenes'],
    explanation: 'Las series nacionales de salarios y precios comparan poder adquisitivo; no muestran si una empresa trasladaría una subida salarial a los precios o la absorbería en sus márgenes.',
    limitation: 'Sin costes laborales, precios de venta y márgenes comparables para las empresas o sectores afectados, no se puede estimar ese traslado ni afirmar que sea inevitable.',
  },
  {
    id: 'collective-agreement-wages', label: 'subidas salariales pactadas y precios',
    when: (t) => /\b(?:conveni\w*\s+(?:colectiv\w*|laboral\w*)|negociacion colectiv\w*|pactos? salarial\w*|salari\w* pactad\w*)\b/.test(t)
      && /\b(?:salari\w*|sueldo\w*|retribu\w*|remuner\w*)\b/.test(t)
      && /\b(?:inflacion|precios|coste de (?:la )?vida|ipc)\b/.test(t)
      && /\b(?:mas|menos|debajo|encima|ritmo|compens\w*|recuper\w*|perdi\w*|lento|rapido|retras\w*|super\w*)\b/.test(t)
      && !/\b(?:caus\w*|provoc\w*|gener\w*|traslad\w*|oblig\w*)\b/.test(t),
    direct: [], context: [], claimType: 'comparative',
    needs: ['variación salarial pactada en convenios con efectos económicos cuantificados', 'variación del índice de precios en los mismos años', 'personas trabajadoras cubiertas y provisionalidad de las cifras'],
    explanation: 'La subida pactada en los convenios y el cambio del nivel de precios son medidas distintas. Para compararlas hay que alinear los años y aclarar a qué trabajadores cubren los convenios registrados.',
    limitation: 'La media pactada no mide lo que cobró cada trabajador ni todos los salarios. Una comparación con el índice general de precios tampoco describe el coste de vida de cada hogar ni demuestra que los convenios causen la inflación.',
  },
  {
    id: 'household-inflation-basket', label: 'alimentos y alquiler frente al índice general de precios',
    when: householdInflationBasketComparison,
    direct: ['annual_hicp_food_index', 'annual_hicp_actual_rent_index'], context: ['annual_hicp_index'], claimType: 'comparative',
    needs: ['índice anual general y subíndice de cada categoría mencionada, para los mismos años', 'pesos de gasto de cada hogar para calcular una inflación personalizada'],
    explanation: 'El índice general incorpora los grupos de consumo con pesos de gasto agregados. Un subíndice permite comparar una categoría concreta, pero no reproduce la cesta ni la percepción de cada hogar.',
    limitation: 'Los subíndices no miden la inflación personal de un hogar. El alquiler efectivamente pagado no equivale al coste total de vivienda y el HICP no incluye el alquiler imputado de la vivienda en propiedad.',
  },
  {
    id: 'household-budget-shares', label: 'distribución del gasto de los hogares por categorías',
    when: householdBudgetShareClaim,
    direct: [], context: [],
    claimTypeFor: (t) => /\b(precio\w*|inflaci\w*|encarec\w*)\b/.test(t)
      && /\b(caus\w*|provoc\w*|debido a|por culpa|ha convertid\w*|convirt\w*|hace que)\b/.test(t) ? 'causal'
      : /\b(entre 20\d{2} y 20\d{2}|cada vez|antes|ahora|aument\w*|sub\w*|crec\w*|gan\w* peso|perdi\w* peso|baj\w*|disminu\w*)\b/.test(t) ? 'trend'
        : 'descriptive',
    needs: ['un índice de precios de la categoría para separar el cambio de precios del cambio de cantidades o composición', 'un dato de gasto y presupuesto por hogar si se afirma que afecta a todas las familias o a un grupo concreto'],
    explanation: 'La Encuesta de Presupuestos Familiares mide cuánto gastan los hogares y qué parte del gasto asignan a cada categoría. Sus variaciones nominales no aíslan el efecto de los precios ni describen cada hogar.',
    explanationHeadline: 'La EPF sitúa vivienda y alimentos cerca de la mitad del gasto medio en 2025',
    explanationEvidence: HOUSEHOLD_BUDGET_SNAPSHOT,
    shareableReplyForContext: ({ claim, facts }) => {
      const text = normalize(claim);
      const directBudgetShare = HOUSEHOLD_BUDGET_SNAPSHOT.directClaimEvidence(claim);
      if (directBudgetShare) {
        const comparison = /\b(?:entre 2024 y 2025|2024.*2025|2025.*2024|ganaron peso|perdieron peso|aument\w*|sub\w*|crec\w*)\b/.test(text);
        return comparison
          ? 'Entre 2024 y 2025, la vivienda y suministros pasaron del 32,4 % al 33,2 % del gasto medio; alimentos, del 15,8 % al 16,0 %. Juntos subieron del 48,2 % al 49,2 %. Son promedios nacionales de la EPF, expresados en euros corrientes; vivienda incluye alquiler imputado en algunas casas propias o cedidas.'
          : 'En 2025, vivienda y suministros representaron el 33,2 % del gasto medio de los hogares y alimentos el 16,0 %; juntos, el 49,2 %. Son promedios nacionales de la EPF, expresados en euros corrientes; vivienda incluye alquiler imputado en algunas casas propias o cedidas.';
      }
      const groupSpecific = /\b(?:renta|ingresos?|salarios?|sueldos?|perceptores?|dos trabaj\w*|familias? con (?:hijos?|menores|dependientes)|hogares? (?:monoparentales?|unipersonales?))\b/.test(text);
      const incomeGroup = /\b(?:renta|ingresos?)\b/.test(text);
      const unsupportedYears = [...text.matchAll(/\b(20\d{2})\b/g)].map(([, year]) => year).filter((year) => !['2024', '2025'].includes(year));
      if (groupSpecific && incomeGroup) return 'El 20 % de los hogares con menor gasto equivalente destinó el 61,5 % de su presupuesto a vivienda y alimentos en 2025. Ese quintil se ordena por gasto, no por renta; el dato no permite confirmar la proporción para hogares de ingresos bajos. En el promedio nacional, vivienda y suministros fueron el 33,2 % del gasto y alimentos el 16,0 %.';
      if (groupSpecific) return 'En 2025, vivienda y suministros representaron el 33,2 % del gasto medio de los hogares y alimentos el 16,0 %; juntos, el 49,2 %. La EPF ofrece este promedio nacional, no un desglose para el grupo solicitado.';
      if (unsupportedYears.length) return `La EPF disponible compara 2024 y 2025; no permite confirmar la cuota para ${unsupportedYears[0]}. En 2025, vivienda y suministros fueron el 33,2 % del gasto medio y alimentos el 16,0 %; juntos, el 49,2 %. Son promedios nacionales en euros corrientes; vivienda incluye alquiler imputado en algunas casas propias o cedidas.`;
      if (/\b(cada hogar|todos los hogares|todas las familias|mi hogar|mi familia)\b/.test(text)) return [
        facts[0],
        facts[1],
        'La EPF describe promedios nacionales; no muestra cuánto gastó cada familia.',
      ].filter(Boolean).join('\n\n');
      return 'En 2025, vivienda y suministros representaron el 33,2 % del gasto medio de los hogares y alimentos el 16,0 %; juntos, el 49,2 %. En 2024 ya sumaban el 48,2 %. La Encuesta de Presupuestos Familiares registra gasto en euros corrientes e incluye alquiler imputado en algunas viviendas propias o cedidas; no permite confirmar que una subida de precios convirtiera partidas secundarias en importantes.';
    },
    limitation: 'La EPF describe España en conjunto y registra gasto en euros corrientes; no permite atribuir el cambio a los precios por sí solos. La partida de vivienda incluye alquiler imputado para algunas viviendas ocupadas por sus propietarios o cedidas, y los quintiles se ordenan por gasto equivalente, no por renta.',
  },
  {
    id: 'household-savings-capacity', label: 'ahorro de los hogares según renta y número de perceptores',
    when: householdSavingsCapacity,
    direct: [], context: [], claimType: 'comparative',
    needsForClaim: (claim) => /\b(dos sueld\w*|dos ingres\w*|dos salari\w*|dos percept\w*|dos trabaj\w*|doble ingres\w*)\b/.test(normalize(claim))
      ? ['tasa de ahorro o diferencia entre renta disponible y gasto para hogares separados por número de perceptores', 'mismo periodo, tipo de hogar y territorio']
      : ['tasa de ahorro o diferencia entre renta disponible y gasto para hogares de ingresos medios, medida en dos periodos comparables', 'definición de renta media y composición de los hogares de cada grupo'],
    explanation: 'El ahorro agregado del sector hogares no describe lo que puede ahorrar cada familia. Para comprobar esta afirmación hay que medir ingresos menos gastos en los hogares del grupo mencionado y en periodos comparables.',
    explanationHeadline: 'La tasa agregada de ahorro no responde por sí sola qué familias pueden ahorrar',
    explanationEvidence: HOUSEHOLD_SAVING_SNAPSHOT,
    shareableReplyForContext: ({ claim, facts }) => {
      const text = normalize(claim);
      const twoEarners = /\b(dos sueld\w*|dos ingres\w*|dos salari\w*|dos percept\w*|dos trabaj\w*|doble ingres\w*)\b/.test(text);
      if (twoEarners) return [
        'En 2025, la tasa de ahorro del sector hogares fue el 12,0 % de su renta disponible bruta, 0,7 puntos porcentuales menos que en 2024; es un agregado, no una tasa por familia.',
        'En la EPF 2025, vivienda y suministros fueron el 33,2 % del gasto medio y alimentos el 16,0 %. Ninguna de estas medidas separa el ahorro según cuántas personas cobran en cada hogar.',
        'Estos promedios no permiten confirmar si una familia con dos sueldos consigue ahorrar. Harían falta ingresos, gastos y ahorro de hogares agrupados por número de perceptores y periodo.',
      ].join('\n\n');
      return [
        'En 2025, la tasa de ahorro del sector hogares fue el 12,0 % de su renta disponible bruta, 0,7 puntos porcentuales menos que en 2024.',
        'El Banco de España describe aumentos entre 2017 y 2024 en los grupos que analiza por edad, educación, país de nacimiento y vivienda; no publica un corte por renta.',
        'Esos datos no permiten confirmar ni descartar que los hogares de ingresos medios ahorren menos que antes. Hace falta una serie de ahorro por nivel de ingresos y años comparables.',
      ].join('\n\n');
    },
    limitation: 'La tasa de ahorro agregada puede cambiar aunque algunos grupos ahorren más y otros menos. El quintil de gasto de la EPF no equivale a un quintil de ingresos, y estos datos no aíslan hogares de renta media o con dos personas perceptoras.',
  },
  {
    id: 'price-wage-european-convergence', label: 'niveles de precios y salarios frente a la Unión Europea',
    when: europeanPriceWageConvergence,
    direct: [], context: [], claimType: 'comparative',
    needsForClaim: () => [
      'países de referencia concretos y el mismo periodo para comparar precios y salarios',
      'nivel de precios de una cesta definida y salarios brutos o netos para una población comparable',
      'datos de vivienda y salarios locales si la afirmación se refiere a ciudades o al alquiler',
    ],
    explanationHeadline: 'Los indicadores disponibles comparan España con la media de la UE-27',
    explanation: 'El nivel general de precios y la mediana salarial son medidas distintas. La UE-27 sirve como referente concreto, pero no representa a todos los países de mayor renta ni mide el coste de vida de cada hogar o ciudad.',
    explanationEvidence: EUROPEAN_PRICE_WAGE_CONVERGENCE_EVIDENCE,
    shareableReplyForContext: ({ facts }) => [
      facts[0],
      facts[1],
      facts[2],
      'La mediana salarial española perdió terreno frente a la UE-27; el índice de precios no establece una tendencia fiable. La UE-27 no representa a todos los países más ricos. La comparación requiere países, cesta, fechas y salarios comparables.',
    ].filter(Boolean).join('\n\n'),
    limitation: 'El índice de precios cubre el consumo final de los hogares a escala nacional; no mide los precios de cada ciudad, el alquiler ni el gasto de una familia concreta. La mediana salarial es bruta, cubre empresas con diez o más personas y llega hasta 2022; no es salario neto ni representa a todos los trabajadores. «Países más ricos» no define un grupo comparable.',
  },
  {
    id: 'real-wages', label: 'salarios y poder adquisitivo',
    when: (t) => has(t, wages) && /\b(poder (?:adquisitivo|de compra)|nivel de vida|inflacion|coste de (?:la )?vida|precios|salari\w* real(?:es)?|perdi\w* poder)\b/.test(t)
      && !/\b(?:caus\w*|provoc\w*|gener\w*|traslad\w*|oblig\w*)\b/.test(t),
    direct: [], context: ['annual_hourly_wage_index', 'annual_hicp_index', 'median_hourly_earnings', 'cpi_index'],
    needsForClaim: (claim) => {
      const text = normalize(claim);
      return [
        ...(/\b(buen\w*|considerad\w* buen\w*)\b/.test(text) ? ['qué importe o criterio define un sueldo «bueno»'] : []),
        ...(/\b(antes|hace pocos anos|hace unos anos|anos atras|hace anos)\b/.test(text) ? ['un periodo expresado con fechas concretas de inicio y fin'] : []),
        'una serie salarial y otra de precios con las mismas fechas',
        'el tipo de salario (bruto o neto), la jornada y una población comparable',
        'el cambio acumulado descontando la inflación',
      ];
    },
    explanation: 'El poder adquisitivo cambia según cuánto sube el salario respecto a los precios. Hay que comparar ambas series entre las mismas fechas.',
    limitation: 'Un salario nominal o un IPC aislado no demuestra una pérdida salarial real. Tampoco la temporalidad o la cuña fiscal responden a esa comparación.',
  },
  {
    id: 'regional-wage-housing-cost', label: 'empleo, salarios y coste de vivienda por ciudad',
    when: regionalWageHousingCost,
    direct: [], context: [], claimType: 'comparative',
    needs: ['empleo, salarios netos y costes de vivienda de las mismas ciudades', 'misma población, ocupación, vivienda y periodo en cada lugar', 'medida de cuánto cambia el poder de compra después del coste de vivienda'],
    explanation: 'Una ciudad puede concentrar empleo y pagar salarios más altos, pero el coste de vivienda puede reducir o anular esa ventaja para quienes viven allí. Los promedios nacionales no permiten medir ese balance entre ciudades.',
    limitation: 'El salario mediano nacional y un índice de precios de vivienda no muestran el ingreso disponible tras pagar vivienda en cada ciudad ni demuestran que el empleo adicional quede compensado.',
  },
  {
    id: 'rental-price-amount', label: 'importe mensual del alquiler',
    when: (t) => has(t, rents) && has(t, absoluteRentAmount) && !has(t, rentalBurden),
    direct: [], context: ['rental_price_index'],
    needs: ['importe del alquiler expresado en euros por vivienda y periodo', 'territorio, tipo de vivienda y contrato comparables'],
    explanation: 'Para saber cuánto se paga por un alquiler hace falta un importe en euros por vivienda y periodo; un índice solo registra cambios relativos de precios.',
    limitation: 'El índice armonizado de alquiler sigue los precios que pagan los hogares, pero no publica el importe mensual medio en euros ni el precio anunciado de un piso. Tampoco identifica por sí solo la ciudad, el tipo de vivienda o el contrato.',
  },
  {
    id: 'business-tax-burden', label: 'carga fiscal efectiva de empresas comparables',
    when: businessTaxBurdenComparison,
    direct: [], context: [], claimType: 'comparative',
    needs: ['impuestos efectivamente pagados por empresas comparables', 'base común como beneficios o valor añadido, separada por tamaño, actividad y tipo de impuesto', 'mismo territorio y periodo'],
    explanation: 'Comparar los impuestos totales de empresas de distinto tamaño no muestra quién soporta una carga mayor. Hay que relacionar los impuestos pagados con una base común y distinguir los tributos incluidos.',
    limitation: 'Sin tipos efectivos y grupos empresariales comparables no se puede concluir que las multinacionales digitales paguen proporcionalmente menos que el comercio local.',
  },
  {
    id: 'housing-investment-return-comparison', label: 'rentabilidad de la vivienda frente a la inversión productiva',
    when: housingInvestmentReturnComparison,
    direct: [], context: [], claimType: 'comparative',
    needs: ['rentabilidad total de vivienda y negocios, incluidos costes, riesgo e impuestos', 'capital y horizonte temporal comparables', 'flujos de inversión observados y una población de inversores definida'],
    explanation: 'Una comparación entre vivienda y negocios productivos requiere medir rendimientos netos con riesgo, costes, impuestos y plazos comparables. Los precios de vivienda no indican por sí solos el rendimiento obtenido ni por qué invierten las empresas.',
    limitation: 'Sin retornos comparables y datos sobre decisiones de inversión no se puede concluir que el capital se desvíe a la vivienda porque ofrezca más rentabilidad.',
  },
  {
    id: 'small-business-cost-pressure', label: 'costes operativos y continuidad de pequeños negocios',
    when: smallBusinessCostPressure,
    direct: [], context: [], claimType: 'causal',
    needs: ['altas, cierres y supervivencia de negocios del mismo tipo y territorio', 'alquiler, energía, impuestos, salarios y demás costes en los mismos periodos', 'comparación que distinga el efecto de cada coste y de la demanda'],
    explanation: 'Que cierren negocios mientras suben varios costes no permite saber cuál de ellos causó los cierres ni cuántos negocios resultaron afectados.',
    limitation: 'Los índices generales de alquiler o energía no miden el gasto total de cada negocio, su margen ni los motivos de cierre.',
  },
  {
    id: 'business-size-productivity', label: 'tamaño empresarial, inversión y productividad',
    when: businessSizeProductivityConstraint,
    direct: [], context: [], claimType: 'causal',
    needs: ['empresas clasificadas por tamaño y actividad', 'inversión, adopción tecnológica, productividad y salarios con definiciones comparables', 'evolución temporal o diseño que permita atribuir diferencias al tamaño empresarial'],
    explanation: 'Una diferencia entre empresas pequeñas y grandes no demuestra que su tamaño limite la inversión o los salarios; también pueden variar su actividad, edad, capital y acceso a financiación.',
    limitation: 'Los salarios nacionales o sectoriales y el tamaño medio de las empresas no identifican por sí solos los mecanismos que relacionan tamaño, tecnología e inversión.',
  },
  {
    id: 'firm-wage-capacity', label: 'productividad de las empresas y salarios que pagan',
    when: firmWageCapacity,
    direct: [], context: [], claimType: 'causal',
    needs: ['productividad, beneficios y salarios por tamaño, sector y ocupación', 'evolución de salarios y productividad para las mismas empresas', 'evidencia sobre negociación y decisiones salariales que permita comprobar una contención deliberada'],
    explanation: 'Una empresa puede tener productividad o beneficios altos sin que eso determine cuánto paga a cada trabajador. Para afirmar que contiene salarios hacen falta datos de productividad, remuneración y decisiones de pago en las mismas empresas.',
    limitation: 'Una mediana salarial nacional o sectorial no demuestra que grandes empresas puedan pagar más ni que estén frenando los salarios.',
  },
  {
    id: 'reported-vs-worked-hours', label: 'horas trabajadas frente a horas registradas o contratadas',
    when: reportedVsWorkedHours, claimType: 'descriptive',
    direct: [], context: [],
    needsForClaim: () => [
      'horas efectivamente trabajadas y registradas para las mismas personas',
      'jornada contratada, sector, territorio y periodo comparables',
      'horas extra no pagadas separadas de horas que no se registraron',
    ],
    explanationHeadline: 'Las horas extra no pagadas no miden el trabajo que queda sin registrar',
    explanation: 'Las horas efectivas, las horas que figuran en el contrato y las horas extra declaradas son medidas distintas. Un recuento de horas extra no pagadas no indica cuántas horas trabajadas faltan en los registros.',
    explanationEvidence: {
      ...unpaidOvertimeEvidence,
      directClaimEvidence: false,
      when: (claim) => /\bhosteler\w*\b/.test(claim),
      evidenceLabel: 'Contexto EPA: horas extra declaradas y remuneración en hostelería',
    },
    shareableReplyForContext: ({ claim }) => [
      unpaidOvertimeEvidence.shareableReplyForContext({ claim }),
      'Este cuestionario no coteja lo declarado con el registro horario o el contrato ni cuenta las horas omitidas; por eso no confirma que se trabajen más horas de las registradas.',
    ].filter(Boolean).join('\n\n'),
    limitation: 'La EPA registra respuestas sobre horas extra pagadas o no pagadas; no coteja fichajes, contratos y horas realmente trabajadas. La cifra disponible cubre hostelería en España, no cada sector ni cada empresa.',
  },
  {
    id: 'unpaid-overtime', label: 'horas extraordinarias trabajadas y remuneradas',
    when: unpaidOvertime, claimType: 'descriptive',
    direct: [], context: [],
    needs: ['horas extraordinarias efectivamente trabajadas y pagadas', 'sector, tipo de contrato, periodo y población laboral comparables', 'fuente que permita distinguir horas no registradas de horas no remuneradas'],
    explanation: 'Las encuestas salariales generales no cuentan por sí solas las horas extra trabajadas y no pagadas.',
    explanationHeadline: 'La EPA registra horas extra no pagadas en hostelería, pero no define si son habituales',
    shareableReplyForContext: unpaidOvertimeEvidence.shareableReplyForContext,
    explanationEvidence: unpaidOvertimeEvidence,
    limitation: 'Sin registros comparables de horas trabajadas y remuneradas no se puede estimar con qué frecuencia se incumple el pago de horas extraordinarias.',
  },
  {
    id: 'wage-growth-job-mobility', label: 'cambio salarial asociado a cambiar de empleo',
    when: wageGrowthJobMobility,
    direct: [], context: [], claimType: 'causal',
    needs: ['salario de las mismas personas antes y después de cambiar de empresa', 'ocupación, jornada, antigüedad y periodo comparables', 'grupo de comparación que permaneció en su empleo'],
    explanation: 'Comparar salarios de personas que cambiaron de empresa con quienes no lo hicieron no demuestra cuánto causó el cambio; sus ocupaciones y trayectorias también pueden diferir.',
    limitation: 'Una mediana salarial nacional o una encuesta sectorial transversal no mide la subida que obtiene una persona al cambiar de empresa.',
  },
  {
    id: 'wage-progression', label: 'progresión salarial al inicio de la carrera laboral',
    when: wageProgression,
    direct: [], context: [], claimType: 'trend',
    needs: ['salarios de entrada y su evolución para las mismas ocupaciones y cohortes', 'antigüedad, jornada, sector y tipo de contrato', 'salarios reales o nominales identificados y periodo de seguimiento'],
    explanation: 'Un salario de entrada describe el comienzo de una carrera laboral, no cómo evoluciona el sueldo de las mismas personas con los años. Para medir progresión hace falta seguir cohortes u ocupaciones comparables.',
    limitation: 'La mediana salarial actual no permite saber si trabajadores jóvenes permanecen años en salarios iniciales ni si su sueldo progresa en términos reales.',
  },
  {
    id: 'intergenerational-housing-distribution', label: 'acceso a vivienda y riqueza residencial entre generaciones',
    when: intergenerationalHousingDistribution,
    direct: [], context: [], claimType: 'comparative',
    needs: [
      'edad o cohorte de los hogares inquilinos y de quienes reciben sus alquileres, vinculadas en el mismo periodo',
      'rentas pagadas y recibidas, costes de mantenimiento, impuestos y otros flujos por cohorte',
      'precios de adquisición, fechas, vivienda y territorio comparables para las generaciones mencionadas',
      'propiedad de vivienda por edad, incluyendo personas físicas y sociedades, si se afirma concentración generacional',
      'riqueza e ingresos por edad y régimen de tenencia, con una comparación equivalente si se afirma que la brecha patrimonial supera la salarial',
    ],
    explanation: 'Los datos de alquiler juvenil, acceso a la compra y patrimonio por edad pueden describir una brecha residencial, pero no identifican por sí solos quién recibe el alquiler, cuánto dinero pasa entre generaciones ni si la brecha patrimonial supera la salarial.',
    limitation: 'Sin vincular el gasto de los hogares jóvenes con la edad y los ingresos de sus arrendadores, y comparar patrimonio, salarios y precios de compra por cohortes y periodos compatibles, no se puede cuantificar una transferencia de renta entre generaciones, ordenar las brechas ni afirmar que las generaciones mayores concentren la propiedad.',
  },
  {
    id: 'rental-affordability', label: 'alquiler e ingresos',
    when: (t) => !householdSavingsCapacity(t) && has(t, rents) && (has(t, rentalBurden) || has(t, wages) && !has(t, absoluteRentAmount)),
    direct: [], context: ['rental_price_index', 'housing_cost_overburden_rate', 'median_equivalised_income'],
    needs: ['alquiler de vivienda completa y renta neta comparables', 'ciudad, tipo de hogar y periodo', 'porcentaje de ingresos destinado al alquiler'],
    explanationHeadline: 'El dato disponible no permite saber si un sueldo normal alcanza para alquilar solo',
    explanation: 'El alquiler medio de los hogares no indica si un sueldo individual alcanza para alquilar una vivienda completa.',
    explanationEvidence: bankSpainRentEffortEvidence,
    limitation: 'El promedio solo representa hogares que ya alquilaban; no incluye a quienes quedaron fuera. El índice de precios muestra cambios, no el alquiler mensual.',
  },
  {
    id: 'mortgage-entry-vs-payment', label: 'ahorro inicial y capacidad de pagar la hipoteca',
    when: mortgageEntryVsPayment,
    direct: [], context: [], claimType: 'comparative',
    needs: ['ahorro previo e ingresos del hogar medidos con criterios hipotecarios comparables', 'hogares que alquilan o compran primera vivienda con hipoteca', 'periodo y alcance territorial de la estimación'],
    explanationHeadline: 'La limitación de patrimonio fue más frecuente que la de renta en el estudio',
    explanation: 'El estudio compara el patrimonio necesario para financiar la primera vivienda deseada —incluida una reserva de un año de consumo— con la capacidad de pagar la cuota hipotecaria.',
    explanationEvidence: MORTGAGE_ENTRY_VS_PAYMENT_EVIDENCE,
    limitation: 'Es una clasificación modelada, no una tasa de hipotecas denegadas. No describe 2026, cada ciudad o la juventud por separado.',
  },
  {
    id: 'purchase-affordability', label: 'acceso a la compra de vivienda',
    when: (t) => !householdSavingsCapacity(t) && /\b(viviend\w*|casas?|piso\w*|inmobiliari\w*)\b/.test(t)
      && /\b(hipotec\w*|entrada|compr\w*|adquir\w*|compra|ahorr\w*|deposit\w*|aval\w*|acceso|acceder)\b/.test(t)
      && /\b(salari\w*|sueld\w*|ingres\w*|ahorr\w*|deposit\w*|aval\w*|familiar\w*|barrera|acceso|acceder|cuota)\b/.test(t),
    direct: [], context: ['house_price_index', 'median_equivalised_income'],
    needs: ['precio y ahorro inicial', 'ingresos, intereses y plazo de financiación', 'territorio y tipo de hogar'],
    explanation: 'El acceso a una hipoteca depende de la entrada y los gastos iniciales, los ingresos y las condiciones de financiación.',
    limitation: 'El precio de compraventa por sí solo no mide cuántos hogares pueden reunir la entrada ni pagar la cuota.',
  },
  {
    id: 'sector-employment-growth-comparison', label: 'crecimiento del empleo por actividad económica',
    when: sectorEmploymentGrowthComparison,
    direct: [], context: [], claimType: 'comparative',
    needs: [
      'series de empleo de las actividades comparadas para el mismo territorio y periodos',
      'la misma medida de empleo y cobertura sectorial en ambas actividades',
      'valores iniciales y finales para calcular y comparar el crecimiento',
    ],
    explanation: 'La tasa de empleo de todo el país no muestra cómo creció el empleo en sectores concretos.',
    limitation: 'Una tasa nacional o de vacantes no mide el crecimiento del empleo por actividad. Para comparar sectores hacen falta series de la misma medida, territorio y periodos.',
  },
  {
    id: 'sector-employment-level-comparison', label: 'empleo por actividad económica',
    when: sectorEmploymentLevelComparison,
    direct: [], context: [], claimType: 'comparative',
    needs: [
      'recuentos de empleo de las actividades comparadas para el mismo territorio y periodo',
      'la misma población, unidad y definición de las actividades en ambas cifras',
    ],
    explanation: 'La tasa de empleo nacional no compara cuántos puestos hay en actividades concretas.',
    limitation: 'Una cifra nacional no permite ordenar sectores. La comparación requiere recuentos con el mismo territorio, periodo y definición; algunas actividades pueden solaparse según la clasificación usada.',
  },
  {
    id: 'sector-wage-comparison', label: 'salarios y productividad por sector',
    when: sectorWages,
    direct: [], context: ['mean_hourly_earnings_by_activity'],
    needs: ['empleos por actividad que superan un umbral salarial definido', 'productividad por hora en los mismos sectores y periodo'],
    explanation: 'La media salarial da contexto; la distribución salarial y la productividad requieren otras medidas.',
    explanationEvidence: {
      expiresAt: '2027-11-16', territories: ['ES'],
      facts: [
        'La encuesta es cuatrienal; este feed usa 2022, todos los sexos y la media del salario bruto del mes por hora pagada, para empresas con 10 o más empleados.',
        'En España se excluyen agricultura, pesca, hogares empleadores y organismos extraterritoriales; la sección O de administración pública solo queda parcialmente cubierta.',
      ],
      sources: [
        { id: 'eurostat-structure-earnings-survey', title: 'Earnings · Structure of earnings survey', publisher: 'Eurostat', url: 'https://ec.europa.eu/eurostat/en/web/labour-market/information-data/earnings', retrievedAt: '2026-11-17' },
        { id: 'eurostat-spain-structure-earnings-2022', title: 'Structure of earnings survey 2022 · Spain quality report', publisher: 'Eurostat / INE', url: 'https://ec.europa.eu/eurostat/cache/metadata/EN/earn_ses2022_esqrs_es.htm', retrievedAt: '2026-11-17' },
      ],
    },
    limitation: 'La media es bruta por hora; no mide salario neto ni distribución salarial. NACE I abarca alojamiento y servicios de comida, no todo el turismo; la encuesta no mide productividad.',
  },
  {
    id: 'self-employment-cost-viability', label: 'costes fijos y viabilidad del trabajo autónomo',
    when: selfEmploymentCostViability,
    direct: [], context: [], claimType: 'causal',
    needs: ['forma jurídica y obligaciones concretas: cotización de una persona autónoma, impuestos personales o impuestos de una sociedad', 'ingresos netos, cuotas, impuestos, gastos fijos y reducciones aplicables a la misma actividad y periodo', 'altas, continuidad y bajas de esas actividades, con motivo de cierre si se atribuye a los costes'],
    explanationHeadline: 'La cotización del RETA depende del tramo de rendimientos, pero no mide toda la carga fiscal de iniciar un negocio',
    explanation: 'La cotización a la Seguridad Social de una persona autónoma es solo una parte de los costes de iniciar una actividad. No equivale al conjunto de impuestos de una sociedad ni demuestra por sí sola que los costes impidan emprender.',
    shareableReplyForContext: ({ facts }) => [
      facts.join(' '),
      'La cifra describe solo la cotización a la Seguridad Social del RETA; no suma todos los impuestos ni representa a todas las formas de negocio. Por sí sola no permite confirmar que iniciar una actividad esté penalizado. Para afinar la respuesta hacen falta la forma jurídica, las obligaciones concretas, los ingresos netos y las reducciones aplicables. ¿Se trata de una persona autónoma o de una sociedad?',
    ].join('\n\n'),
    explanationEvidence: {
      directClaimEvidence: false,
      expiresAt: '2027-01-01', territories: ['ES'],
      dimensions: {
        subject: 'base y cotización mensual de personas trabajadoras por cuenta propia acogidas al RETA',
        population: 'personas en el tramo reducido de rendimientos netos mensuales de hasta 670 euros que eligen la base mínima general',
        geography: 'España', period: 'ejercicio 2026',
        denominator: 'rendimiento neto mensual declarado para el tramo; no representa a todas las personas autónomas',
        unit: 'euros de base y cotización al mes',
      },
      facts: [
        'En 2026, para rendimientos netos mensuales de hasta 670 €, la base del tramo reducido va de 653,59 € a 718,94 €. Si se elige la base mínima, los tipos generales suman 31,5 % —28,3 % por contingencias comunes, 1,3 % por profesionales, 0,9 % de MEI, 0,9 % por cese y 0,1 % por formación—: 205,88 € al mes antes de reducciones o bonificaciones.',
      ],
      sources: [{ id: 'boe-reta-contributions-2026', title: 'Orden PJC/297/2026, de cotización a la Seguridad Social para 2026', publisher: 'Boletín Oficial del Estado', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2026-7296', publishedAt: '2026-03-31', retrievedAt: '2026-11-24', role: 'primary' }],
    },
    limitation: 'El cálculo usa la base mínima del primer tramo reducido del RETA y los tipos generales de 2026 antes de reducciones; no es la cuota de cada autónomo. La cotización no incluye todos los impuestos ni representa a una sociedad, y no mide la rentabilidad, la volatilidad de ingresos ni si estos costes disuaden de iniciar una actividad.',
  },
  {
    id: 'employer-contributions-labour-cost', label: 'cotizaciones empresariales y coste laboral total',
    when: employerContributionVisibility,
    direct: [], context: [], claimType: 'causal',
    needs: [
      'salario bruto y cotizaciones a cargo del empleador en la misma nómina, población, territorio y periodo',
      'una encuesta representativa que mida si los trabajadores conocen ese coste y qué entienden por salario bruto',
      'si se afirma ocultación deliberada, pruebas sobre la información disponible y la conducta del empleador',
    ],
    explanation: 'La OCDE separa el salario bruto de las cotizaciones empresariales al calcular el coste laboral total. Esa definición permite explicar la diferencia, pero no mide si las personas trabajadoras la perciben ni si alguien la oculta.',
    explanationHeadline: 'Las cotizaciones empresariales forman parte del coste laboral, pero falta medir si los trabajadores las conocen',
    explanationEvidence: {
      directClaimEvidence: false,
      expiresAt: '2027-04-30', territories: ['ES'],
      when: (t) => {
        const years = [...t.matchAll(/\b(?:19|20)\d{2}\b/g)].map(([year]) => year);
        return years.length === 0 || years.length === 1 && years[0] === '2025';
      },
      evidenceLabel: 'Coste laboral y cotizaciones empresariales en el caso tipo de la OCDE',
      dimensions: {
        subject: 'cotizaciones de seguridad social a cargo del empleador como parte del coste laboral total',
        population: 'caso modelo de una persona soltera, sin hijos, con salario medio',
        geography: 'España',
        period: '2025',
        denominator: 'coste laboral total: salario bruto más cotizaciones empresariales',
        unit: 'porcentaje del coste laboral total',
      },
      facts: [
        'La OCDE define el coste laboral total como salario bruto más cotizaciones empresariales.',
        'En el caso modelo de España para 2025 —una persona soltera, sin hijos y con salario medio— las cotizaciones empresariales equivalían al 23,4 % del coste laboral total. Es un caso tipo, no una cifra observada para cada nómina.',
      ],
      factSourceIds: [['oecd-taxing-wages-spain-2026'], ['oecd-taxing-wages-spain-2026']],
      factDimensions: [
        {
          subject: 'coste laboral total del empleador',
          population: 'definición de la OCDE para el coste laboral de trabajadores por cuenta ajena',
          period: 'marco metodológico de Taxing Wages 2026',
          geography: 'OCDE',
          denominator: 'salario bruto más cotizaciones empresariales',
          unit: 'definición; sin valor numérico',
        },
        {
          subject: 'cotizaciones empresariales de seguridad social',
          population: 'caso modelo de una persona soltera, sin hijos, con salario medio',
          period: '2025',
          geography: 'España',
          denominator: 'coste laboral total',
          unit: 'porcentaje del coste laboral total',
        },
      ],
      sources: [{ id: 'oecd-taxing-wages-spain-2026', title: 'Taxing Wages 2026 · España y definición del coste laboral', publisher: 'OCDE', url: 'https://www.oecd.org/en/publications/taxing-wages-2026_3a5169ef-en/full-report/overview_d93131c3.html', publishedAt: '2026-04', retrievedAt: '2026-11-24', role: 'primary' }],
    },
    shareableReplyForContext: ({ facts }) => [
      facts.join(' '),
      'Esto muestra por qué el coste total para la empresa puede superar el salario bruto. Pero la OCDE no mide si los trabajadores conocen esa diferencia ni si alguien la oculta; para comprobarlo haría falta una encuesta sobre lo que entienden por salario bruto y coste laboral.',
    ].join('\n\n'),
    evidenceGap: 'La OCDE mide los componentes del coste laboral para un caso tipo; no mide la percepción de los trabajadores ni una posible ocultación deliberada.',
    limitation: 'El 23,4 % usa como denominador el coste laboral total y describe en 2025 a una persona soltera sin hijos con salario medio en España. No es un porcentaje del salario bruto, no representa a todos los empleos ni mide qué información conoce un trabajador. La cuña fiscal total incluye IRPF y cotizaciones del empleado y del empleador, netas de prestaciones familiares; no equivale solo a la aportación empresarial.',
  },
  {
    id: 'matched-pay', label: 'salarios de perfiles profesionales comparables',
    when: (t) => has(t, wages) && /\b(mismo|misma|equivalente|similar)\b/.test(t) && /\b(perfil\w*|profes\w*|puesto\w*|trabajo|titul\w*|formacion|cualific\w*)\b/.test(t),
    direct: [], context: [],
    needs: ['países concretos y ocupación ISCO-08, sexo, edad y estudios comparables', 'años de experiencia en el puesto, contrato y jornada comparables', 'actividad, tamaño de empresa, región y año iguales', 'salario bruto por hora o mes; ajustar por precios si se compara poder adquisitivo'],
    explanation: 'Eurostat ofrece una calculadora que estima salarios medios para el mismo perfil en distintos países. La afirmación no especifica el puesto ni los atributos necesarios para elegir una comparación concreta.',
    explanationHeadline: 'Eurostat permite comparar perfiles definidos, pero falta concretar cuál',
    explanationEvidence: {
      directClaimEvidence: false,
      expiresAt: '2027-04-30', territories: ['ES', 'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'EL', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'SE', 'EU'],
      evidenceLabel: 'Alcance de la calculadora salarial de Eurostat',
      dimensions: {
        subject: 'salario bruto medio estimado para un perfil laboral y empresarial seleccionado, comparable entre países de la UE',
        population: 'perfiles de empleados representados en la Encuesta de Estructura Salarial de 2022; no empresas o trabajadores concretos',
        geography: 'Estados miembros de la Unión Europea; algunos países, sectores o tamaños de empresa pueden no tener datos',
        period: 'microdatos de 2022 extrapolados al año de referencia 2025',
        denominator: 'horas pagadas para la estimación por hora; perfil modelizado, no distribución de salarios individuales',
        unit: 'euros brutos por hora o por mes',
      },
      facts: [
        'La calculadora de Eurostat compara estimaciones de salario bruto medio para los mismos atributos: sexo, edad, estudios, ocupación (ISCO-08), experiencia en el puesto, contrato, jornada, actividad económica, tamaño de empresa y región. Usa la Encuesta de Estructura Salarial de 2022 y extrapola las estimaciones a 2025.',
      ],
      sources: [{ id: 'eurostat-salary-calculator', title: 'Salary calculator · Eurostat', publisher: 'Eurostat', url: 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Salary_calculator', retrievedAt: '2026-11-24', role: 'primary' }],
    },
    shareableReplyForContext: ({ facts }) => [
      facts.join(' '),
      'Esto permite comprobar una comparación concreta entre países, pero no resuelve la frase general: no indica qué profesión o perfil compara ni qué significa «mucho menos». La herramienta no produce una media única de la UE. Sus cifras son medias modelizadas en euros, no salarios de cada empresa o persona, y no ajustan las diferencias de precios entre países. Para verificarla hay que fijar los mismos atributos del perfil y comparar los países y el año elegidos.',
    ].join('\n\n'),
    evidenceGap: 'Falta concretar los países, la profesión y el perfil, además de un umbral para «mucho menos»; una media nacional o una brecha salarial sin ajustar no compara perfiles equivalentes.',
    limitation: 'La calculadora ofrece estimaciones medias modelizadas, no el salario observado de cada empresa o persona. Expresa los resultados en euros sin corregir diferencias de precios entre países, y puede no cubrir algunos países, actividades o empresas pequeñas.',
  },
  {
    id: 'nominal-wages', label: 'salarios y remuneración',
    when: (t) => /\b(salari\w*|sueld\w*|nomina\w*|remuner\w*)\b/.test(t)
      && /\b(sub\w*|baj\w*|aument\w*|perd\w*|estanc\w*|alt\w*|baj[oa]\w*|menor\w*|mayor\w*|menos|mas|compar\w*|difer\w*)\b/.test(t)
      && !/\b(salari\w* minim\w*|smi|brecha salarial|median\w* por hora)\b/.test(t)
      && !housingPlusNamedCity(t),
    direct: [], context: ['median_hourly_earnings'],
    needs: ['salario bruto o neto y periodo', 'jornada y población comparables', 'referencia temporal o territorial'],
    explanation: 'El salario puede medirse por hora, mes o año; las comparaciones dependen de la jornada, la población y de si se usan importes brutos o netos.',
    limitation: 'El salario mediano bruto por hora ofrece contexto, pero no mide automáticamente el salario anual, el neto ni la remuneración de un puesto o persona concreta.',
  },
  {
    id: 'primary-care-wait-causes', label: 'causas y efectos de las demoras en atención primaria',
    when: primaryCareWaitCausality,
    direct: [], context: ['primary_care_wait_days', 'primary_care_wait_over_one_day_rate'], claimType: 'causal',
    needs: ['demoras y uso de urgencias medidos en las mismas personas y el mismo periodo', 'motivos declarados para acudir a urgencias', 'una comparación que permita distinguir asociación de efecto causal'],
    explanation: 'El Barómetro Sanitario mide cuánto esperaron algunos pacientes para ver a su médico de familia. Esa cifra, por sí sola, no indica si la demora causó una visita a urgencias ni por qué acudieron.',
    limitation: 'Los datos de espera en atención primaria no miden el uso posterior de urgencias ni demuestran que una demora lo cause. Para comprobar esa relación hacen falta datos enlazados de pacientes y un diseño que permita separar otros motivos de atención.',
  },
  {
    id: 'primary-care-wait-trend', label: 'evolución de las demoras en atención primaria',
    when: primaryCareWaitTrend,
    direct: [], context: ['primary_care_wait_days', 'primary_care_wait_over_one_day_rate'], claimType: 'trend',
    needs: ['oleadas comparables de la misma pregunta, base y población en los periodos mencionados'],
    explanation: 'Una medición de una oleada describe ese periodo; para afirmar que las esperas aumentan o disminuyen hay que comparar la misma medida y la misma población entre periodos.',
    limitation: 'El dato más reciente no establece una tendencia. Las diferencias entre oleadas solo son comparables si se mantiene la pregunta, la población y la base estadística.',
  },
  {
    id: 'primary-care-waits', label: 'citas de atención primaria',
    when: (t) => primaryCareWaitClaim(t) && !primaryCareWaitTrend(t) && !primaryCareWaitCausality(t),
    direct: ['primary_care_wait_days', 'primary_care_wait_over_one_day_rate'], context: [],
    needs: ['tiempo hasta la cita en atención primaria', 'base de pacientes encuestados', 'territorio y periodo'],
    explanation: 'La espera para el médico de familia debe medirse en atención primaria. Las listas hospitalarias de cirugía y especialistas son servicios diferentes.',
    limitation: 'La encuesta no define un umbral universal de espera excesiva. La media nacional no representa cada centro, y la demora media solo incluye a quienes esperaron más de un día.',
  },
  {
    id: 'private-healthcare-access', label: 'seguro privado y acceso a la atención',
    when: (t) => privateCareMention.test(t)
      && (has(t, waits) || /\b(lista\w* de espera|evitar|rapidez|especialista\w*|prueba\w*|motivo\w*|cirug\w*|operaci\w*|quirurg\w*)\b/.test(t)),
    direct: [], context: [],
    needs: ['motivos declarados para contratar seguro', 'demoras comparables por servicio y sector', 'periodo y población con seguro'],
    explanation: 'Para comprobar por qué se contrata un seguro y si reduce las esperas hacen falta datos sobre los asegurados y los mismos servicios en ambos sectores.',
    explanationEvidence: {
      ...specialistOutpatientWaitEvidence,
      directClaimEvidence: false,
      facts: ['El informe del 31 de diciembre de 2025 registró una espera media de 16 días en Melilla y 162 en Canarias para el total de diez especialidades de consultas externas del SNS. Son datos remitidos por cada comunidad autónoma.'],
      when: (t) => {
        const wait = /\b(esper\w*|demor\w*|cita\w*|tard\w*|retras\w*|antes|rapidez|rapido)\b/.test(t);
        const outpatientSpecialist = /\b(especialist\w*|consultas? externas?|atencion especializada)\b/.test(t);
        const incompatibleService = /\b(atencion primaria|medic\w* de (?:familia|cabecera)|cirug\w*|operaci\w*|quirurg\w*|urgencias?|pruebas? diagnosticas?|analisis|resonancias?)\b/.test(t);
        const specificTerritory = /\b(andalucia|aragon|asturias|baleares|canarias|cantabria|castilla(?: y leon| la mancha)?|cataluna|extremadura|galicia|madrid|murcia|navarra|pais vasco|rioja|ceuta|melilla|valencia|barcelona|sevilla|malaga|zaragoza)\b/.test(t);
        const years = [...t.matchAll(/\b20\d{2}\b/g)].map(([year]) => year);
        return wait && outpatientSpecialist && !incompatibleService && !specificTerritory && (!years.length || years.every((year) => year === '2025'));
      },
    },
    limitation: 'Una lista de espera pública no mide las motivaciones de quienes contratan seguro ni el tiempo que esperan en la privada.',
  },
  {
    id: 'self-consumption-connection-delays', label: 'trámites de acceso y conexión para autoconsumo',
    when: selfConsumptionConnectionDelay,
    direct: [], context: [], claimType: 'causal',
    needs: [
      'tiempo transcurrido entre la solicitud y la activación, desglosado por modalidad, potencia, distribuidora y territorio',
      'número de instalaciones de autoconsumo solicitadas, aprobadas, activadas y abandonadas en el mismo periodo',
      'rentabilidad estimada de cada instalación y evidencia de que el trámite causó su abandono o demora',
    ],
    explanation: 'La norma distingue qué instalaciones de autoconsumo necesitan permisos de acceso y conexión, pero ese requisito no demuestra cuánto tardan los trámites ni cuántas instalaciones rentables se quedan sin hacer.',
    shareableReplyForContext: ({ facts }) => [
      facts.join(' '),
      'La norma aclara quién necesita permisos, pero no mide cuánto tardan los trámites ni cuántos proyectos rentables se frenan. Por sí sola no permite confirmar la afirmación completa.',
    ].join('\n\n'),
    explanationEvidence: {
      directClaimEvidence: false,
      expiresAt: '2027-11-24', territories: ['ES'],
      dimensions: {
        subject: 'exenciones y procedimiento de acceso y conexión para instalaciones de autoconsumo eléctrico',
        population: 'instalaciones de autoconsumo sujetas al Real Decreto 244/2019',
        geography: 'España', period: 'normativa vigente descrita en la página consultada el 24/11/2026',
        denominator: 'no contiene una medición de solicitudes, instalaciones activadas o abandonadas',
        unit: 'condiciones regulatorias, no días de espera ni número de proyectos afectados',
      },
      facts: [
        'MITECO indica que están exentas de permisos de acceso y conexión las instalaciones de autoconsumo sin excedentes —que no inyectan energía a la red— y las de hasta 15 kW con excedentes situadas en suelo urbanizado con los servicios exigidos por la normativa urbanística. Las demás siguen el procedimiento de acceso y conexión aplicable.',
      ],
      sources: [{ id: 'miteco-autoconsumo-access-connection', title: 'Preguntas frecuentes sobre autoconsumo · procedimiento de acceso y conexión', publisher: 'Ministerio para la Transición Ecológica y el Reto Demográfico', url: 'https://www.miteco.gob.es/es/energia/energia-electrica/electricidad/autoconsumo-electrico/preguntas-frecuentes-autoconsumo.html', retrievedAt: '2026-11-24', role: 'primary' }],
    },
    limitation: 'La FAQ describe requisitos legales, no los tiempos reales de tramitación. No ofrece una serie de instalaciones solicitadas, activadas o abandonadas ni calcula cuántas habrían sido rentables; por eso no permite atribuir retrasos o pérdida de proyectos al trámite. La regla tampoco implica que todas las instalaciones necesiten permisos.',
  },
  {
    id: 'renewable-grid-integration', label: 'integración de generación renovable y capacidad de red',
    when: renewableGridIntegration,
    direct: [], context: [], claimType: 'causal',
    needs: [
      'energía renovable disponible y energía vertida, en MWh, para el mismo periodo y territorio',
      'motivo operativo del vertido, distinguiendo las limitaciones de red de otras restricciones',
      'nivel geográfico y tecnología de generación',
    ],
    explanation: 'La planificación eléctrica indica qué capacidad de red se proyecta y qué objetivos de integración se persiguen; no mide por sí sola cuánta generación renovable disponible se pierde actualmente por límites de red.',
    shareableReplyForContext: ({ facts }) => [
      facts.join(' '),
      'Es una meta para 2030, no una medición de los MWh que hoy no se integran por límites de red; por sí sola no permite confirmar la afirmación causal.',
    ].join('\n\n'),
    explanationEvidence: {
      expiresAt: '2027-02-20', territories: ['ES'],
      dimensions: {
        subject: 'objetivo de integración de generación renovable y reducción de vertidos',
        population: 'sistema eléctrico español según la Planificación de electricidad aprobada para el horizonte 2030',
        geography: 'España', period: 'Planificación aprobada el 20/11/2026, horizonte 2030', unit: 'GW de potencia renovable prevista',
      },
      facts: [
        'El plan eléctrico aprobado el 20 de noviembre de 2026 prevé integrar en 2030 los 154 GW de potencia renovable del PNIEC y plantea una reducción significativa de los vertidos.',
      ],
      sources: [{ id: 'miteco-electricity-plan-2030', title: 'Planificación de la red de transporte de electricidad con horizonte 2030', publisher: 'Ministerio para la Transición Ecológica y el Reto Demográfico', url: 'https://www.miteco.gob.es/es/prensa/ultimas-noticias/2026/noviembre/el-gobierno-aprueba-la-planificacion-electrica-en-el-horizonte-2.html', publishedAt: '2026-11-20', retrievedAt: '2026-11-24', role: 'primary' }],
    },
    limitation: 'La planificación no cuantifica los MWh renovables que se dejan de producir por límites de red ni distingue esa restricción física de otros motivos operativos. Para sostener la afirmación hacen falta datos operativos de vertidos, su motivo, tecnología, territorio y periodo.',
  },
  {
    id: 'electricity-grid-investment-gap', label: 'inversión en redes eléctricas frente a nuevas necesidades',
    when: electricityGridInvestmentGap,
    direct: [], context: [], claimType: 'comparative',
    needs: [
      'inversión ejecutada, no solo autorizada o planificada, en transporte y distribución',
      'crecimiento observado de la demanda y de la generación renovable en los mismos años',
      'definición de la brecha de inversión y territorio comparables',
    ],
    explanation: 'MITECO ha reconocido límites de inversión insuficientes para las nuevas necesidades y ha aprobado una ampliación de la red. Eso documenta una respuesta de planificación, pero no calcula cuánto quedó atrás la inversión ya ejecutada.',
    shareableReplyForContext: ({ facts }) => [
      facts.join(' '),
      'El plan es futuro y no compara el gasto ejecutado con el crecimiento observado de demanda y renovables; así no permite confirmar que la inversión ya vaya por detrás.',
    ].join('\n\n'),
    explanationEvidence: {
      expiresAt: '2027-02-20', territories: ['ES'],
      dimensions: {
        subject: 'necesidades e inversión prevista en las redes eléctricas',
        population: 'redes de transporte y distribución de electricidad en España',
        geography: 'España', period: 'valoración de 2026; planificación hasta 2030', unit: 'millones de euros y GW de nueva demanda',
      },
      facts: [
        'En julio de 2026, MITECO afirmó que los límites anuales vigentes de inversión en redes se habían mostrado insuficientes ante las necesidades de la transición energética y las solicitudes de acceso de nueva demanda.',
        'El plan eléctrico aprobado el 20 de noviembre de 2026 cifra la inversión total de la planificación en 17.142 millones de euros y está diseñado para incorporar 47 GW de nueva demanda. Son importes planificados, no gasto ya ejecutado.',
      ],
      factSourceIds: [['miteco-electricity-investment-limits-2026'], ['miteco-electricity-plan-2030']],
      sources: [
        { id: 'miteco-electricity-investment-limits-2026', title: 'El Gobierno acelera la electrificación incrementando la inversión en redes eléctricas', publisher: 'Ministerio para la Transición Ecológica y el Reto Demográfico', url: 'https://www.miteco.gob.es/es/prensa/ultimas-noticias/2026/julio/el-gobierno-acelera-la-electrificacion-de-la-economia-incrementa.html', publishedAt: '2026-07-28', retrievedAt: '2026-11-24', role: 'primary' },
        { id: 'miteco-electricity-plan-2030', title: 'Planificación de la red de transporte de electricidad con horizonte 2030', publisher: 'Ministerio para la Transición Ecológica y el Reto Demográfico', url: 'https://www.miteco.gob.es/es/prensa/ultimas-noticias/2026/noviembre/el-gobierno-aprueba-la-planificacion-electrica-en-el-horizonte-2.html', publishedAt: '2026-11-20', retrievedAt: '2026-11-24', role: 'primary' },
      ],
    },
    limitation: 'La valoración oficial describe límites de inversión y la respuesta aprobada, pero no compara el gasto ejecutado con el crecimiento efectivo de renovables y demanda. «Ir por detrás» requiere fijar periodo, red y una brecha medible.',
  },
  {
    id: 'electricity-industry-price', label: 'precio eléctrico para grandes consumidores no domésticos',
    when: electricityIndustryPrice,
    direct: ['industrial_electricity_price'], context: [], claimType: 'descriptive',
    needs: ['precio medio por kWh para consumidores no domésticos de la banda ID (2.000 a menos de 20.000 MWh anuales)', 'geografía, semestre y tratamiento fiscal comparables'],
    explanation: 'Eurostat publica el precio medio por kWh para consumidores no domésticos en la banda ID. La serie permite responder sobre ese grupo de grandes consumidores.',
    limitation: 'La banda agrupa a clientes por consumo anual, no por sector. Su promedio no es el precio de cada contrato ni representa a todas las empresas industriales.',
  },
  {
    id: 'electricity-industry-costs', label: 'coste eléctrico de la industria y competitividad',
    when: electricityIndustryCosts,
    direct: [], context: ['industrial_electricity_price'], claimType: 'causal',
    needs: ['precios eléctricos pagados por empresas e industrias comparables, con contrato, consumo, impuestos y cargos', 'países, sectores, periodos y tamaño de empresa equivalentes', 'peso de la electricidad en los costes y una medida de productividad, precios de venta o competitividad'],
    explanation: 'Eurostat publica un precio medio para grandes consumidores eléctricos no domésticos. Sirve de contexto para la industria, pero no mide por separado cada sector ni demuestra un efecto sobre su competitividad.',
    limitation: 'La serie solo agrupa clientes por consumo anual; sin precios comparables por sector y datos de costes y resultados, no permite cuantificar el efecto sobre la competitividad.',
  },
  {
    id: 'electricity-market-trading', label: 'exportaciones, importaciones y precios horarios de electricidad',
    when: electricityMarketTrading,
    direct: [], context: [], claimType: 'comparative',
    needs: ['flujos de exportación e importación por hora y sentido de la interconexión', 'precios mayoristas horarios del mismo mercado y periodo', 'generación disponible, demanda y zona de intercambio para identificar las horas con renovables'],
    explanation: 'El precio medio que pagan los hogares no indica a qué horas España exporta o importa electricidad ni qué precio tuvo cada intercambio.',
    limitation: 'Sin flujos transfronterizos y precios mayoristas alineados por hora no se puede verificar si se exportó energía barata y se importó energía más cara en otros momentos.',
  },
  {
    id: 'energy-price-pass-through-lag', label: 'traslado de precios mayoristas a ofertas y contratos de energía',
    when: energyPricePassThrough,
    direct: [], context: [], claimType: 'causal',
    needs: ['producto y tipo de suministro: electricidad o gas, y contrato fijo, indexado o tarifa regulada', 'precios mayoristas y precios realmente facturados al mismo grupo de consumidores durante el mismo periodo', 'número o proporción de contratos afectados para sostener que ocurre en «muchos» contratos', 'comparación separada de subidas y bajadas del precio mayorista'],
    explanationHeadline: 'La CNMC observa desfases en algunas ofertas eléctricas y contratos de gas',
    explanation: 'El traslado de precios mayoristas depende del producto y del contrato. Los precios medios de hogares muestran el coste final, pero no miden cuánto tarda un cambio mayorista en llegar a cada contrato.',
    explanationEvidence: ENERGY_PRICE_PASS_THROUGH_EVIDENCE,
    shareableReplyForContext: () => [
      'En España, la CNMC observó que en 2025 las ofertas eléctricas de mercado libre del comparador seguían el precio mayorista spot con cierto desfase. Había 356 ofertas domésticas y 81 para pymes: ofertas públicas, no todos los contratos firmados.',
      'En gas doméstico, la mayoría de las ofertas para consumidores con derecho a TUR mantenía fijo el precio contratado, normalmente por un año. La CNMC documenta un retraso en 2021–2022 ante subidas del gas.',
      'Hay desfase en algunos productos, pero esos datos no prueban que muchos contratos retrasen las bajadas. ¿Electricidad o gas, y qué contrato y periodo?',
    ].join('\n\n'),
    limitation: 'La fuente estudia ofertas publicadas y tipos concretos de suministro en España. No cuenta qué proporción de todos los contratos retrasa las bajadas ni permite generalizar el desfase a cualquier producto, tarifa, consumidor o periodo.',
  },
  {
    id: 'electricity-price-transmission', label: 'precio mayorista y factura eléctrica',
    when: (t) => has(t, electricity) && ( /\b(marginalis\w*|mayorista|gas)\b/.test(t) || /\b(renovabl\w*|sol|viento)\b/.test(t) && has(t, cost)),
    direct: [], context: ['household_electricity_price'],
    needs: ['precio mayorista y contrato de suministro', 'hora o periodo comparable', 'peajes, cargos e impuestos de la factura'],
    explanation: 'El precio del mercado mayorista y el importe de una factura son medidas diferentes. El contrato, los periodos de consumo y los componentes regulados condicionan cómo se traslada un cambio de precio.',
    explanationEvidence: {
      directClaimEvidence: true,
      expiresAt: '2027-01-28', territories: ['ES'],
      facts: ['En el mercado diario marginalista, el precio depende de la última oferta necesaria para cubrir la demanda. Si esa oferta procede de gas, puede fijar el precio de ese mercado aunque otras plantas hayan ofertado más barato.',
        'La CNMC explica que un precio mayorista muy bajo no se traslada íntegramente a cualquier factura: influyen el contrato y otros componentes, como redes y costes de operación.'],
      sources: [{ id: 'ree-marginal-price', title: 'Glosario: precio marginal', publisher: 'Red Eléctrica', url: 'https://www.ree.es/es/glosario', retrievedAt: '2026-10-30' },
        { id: 'cnmc-wholesale-retail-price', title: 'Por qué un precio mayorista bajo no implica una factura a cero', publisher: 'CNMC', url: 'https://blog.cnmc.es/2024/06/11/precio-cero-factura-luz/', publishedAt: '2024-06-11', retrievedAt: '2026-10-30' }],
    },
    limitation: 'El precio medio doméstico por kWh no identifica por sí solo qué tecnología fijó el precio de cada hora ni cuánto ahorró cada consumidor.',
  },
  {
    id: 'electricity-retail', label: 'precio doméstico de la electricidad',
    when: (t) => has(t, electricity) && has(t, cost),
    direct: ['household_electricity_price'], context: [],
    needs: ['precio por kWh y banda de consumo', 'impuestos incluidos o excluidos', 'país y semestre'],
    explanation: 'El precio doméstico por kWh permite comparar una tarifa media con el mismo consumo y tratamiento fiscal.',
    limitation: 'Es una media semestral para hogares; no es el precio mayorista horario ni la factura total de cada hogar, que también depende del consumo y la potencia.',
  },
  {
    id: 'rail-punctuality', label: 'puntualidad y retrasos ferroviarios',
    when: (t) => /\b(tren\w*|ferroviar\w*|renfe|adif|cercanias|ave)\b/.test(t) && /\b(retras\w*|puntual\w*|demor\w*|cancel\w*|compens\w*)\b/.test(t),
    direct: [], context: [],
    claimTypeFor: (text) => RAIL_PUNCTUALITY_EVIDENCE.when(normalize(text)) && RAIL_PUNCTUALITY_EVIDENCE.directClaimEvidence(text) ? 'trend' : 'descriptive',
    needs: ['línea, operador y tipo de servicio', 'definición y duración del retraso', 'periodo y viajes o pasajeros afectados'],
    explanationHeadline: 'Los datos publicados muestran diferencias entre líneas de Cercanías Madrid',
    explanation: 'La puntualidad se mide por servicio y umbral de retraso. Los trenes afectados, los pasajeros y las horas perdidas tienen denominadores distintos.',
    explanationEvidence: RAIL_PUNCTUALITY_EVIDENCE,
    shareableReplyForContext: railPunctualityShareableReply,
    limitation: 'El volumen total de viajeros o la inversión ferroviaria no mide las demoras ni las compensaciones pagadas.',
  },
  {
    id: 'class-size', label: 'tamaño de las clases',
    when: (t) => /\b(alumn\w*|estudiant\w*|escolar\w*|profesor\w*|docent\w*|clases?)\b/.test(t) && /\b(aula\w*|por clase|por grupo|por profesor|por alumn\w*|ratio|masific\w*)\b/.test(t),
    direct: [], context: ['education_personnel'],
    needs: ['alumnado por grupo o por docente', 'etapa educativa y titularidad', 'territorio y curso'],
    explanation: 'El alumnado por aula y por docente son ratios distintos: varios docentes pueden atender al mismo grupo.',
    limitation: 'El alumnado por docente no equivale al alumnado por aula; el número total de docentes tampoco mide el tamaño de las clases ni la distribución del alumnado.',
  },
];

export const claimFocusFor = (claim) => {
  const text = normalize(claim);
  return focuses.find((focus) => focus.when(text));
};

export const canSkipLocalCompilerForFocusedMeasurement = (claim, {
  propositions,
  clarificationRequired = false,
  claimType,
} = {}) => {
  const focus = claimFocusFor(claim);
  const explicit = Array.isArray(propositions)
    ? propositions.filter((item) => item?.explicit !== false && String(item?.text || '').trim())
    : [];
  const rawClaim = String(claim || '');
  const normalizedClaim = normalize(rawClaim);
  // The lightweight clause parser can miss unfamiliar joins, so keep this
  // optimization to claims with no visible second-clause cue.
  const hasCompoundCue = /[,;.\n]/.test(rawClaim)
    || /\b(?:y|ni|pero|aunque|mientras|sin embargo|por eso|por tanto|por ello|asi que|porque|ya que|debido a que)\b/.test(normalizedClaim);
  return Boolean(focus && focus.claimType !== 'causal' && ['descriptive', 'trend'].includes(claimType)
    && !clarificationRequired && explicit.length === 1 && !hasCompoundCue);
};

const broadAliases = new Set(['coste de vida', 'sanidad publica', 'servicios publicos', 'gasto publico', 'ayudas sociales', 'mercado laboral', 'sector publico', 'proteccion social', 'pensiones publicas', 'calidad de vida']);
const preciseAliases = metricVocabulary.flatMap((metric) => metric.aliases.map(normalize)
  .filter((alias) => !broadAliases.has(alias) && /\b(tasa|porcentaje|ratio|indice|media|mediano|mediana|precio|precios|numero|recuento|por hora|por habitante|per capita|por persona|ipc|smi|pib)\b/.test(alias)))
  .sort((a, b) => b.length - a.length);

export const hasSpecificMetricReference = (claim) => {
  const text = ` ${normalize(claim)} `;
  return preciseAliases.some((alias) => text.includes(` ${alias} `));
};

export const focusedMetricIdsFor = (claim) => {
  const focus = claimFocusFor(claim);
  if (!focus) return undefined;
  const known = new Set(metricVocabulary.map((metric) => metric.id));
  const text = normalize(claim);
  if (focus.id === 'tourism-employment-contribution'
    && requestedGeographyScopes(claim).some((scope) => scope.type === 'region')
    && /\b(mas|menos|mayor|menor|super\w*|inferior\w*)\b/.test(text)
    && /\b(que|a|al|frente a|respecto a)\b/.test(text)) return new Set();
  const primaryCareRateRequested = /\b(porcentaje|proporcion|por ciento)\b/.test(text) || /\d+(?:[.,]\d+)?\s*%/i.test(String(claim));
  const primaryCareDurationRequested = /\b(cuantos dias|demora media|tiempo medio|duracion media|media de (?:la )?(?:espera|demora)|promedio(?: de (?:la )?(?:espera|demora|tiempo))?|en promedio|average wait|mean wait|average delay)\b/.test(text);
  const subjectiveDifficultyAndGreatDifficulty = /\b(?:dificultad\s+(?:o|y)\s+gran dificultad|con dificultad\s+(?:o|y)\s+con gran dificultad|pobreza subjetiva)\b/.test(text);
  const subjectiveResponseMetric = focus.id === 'subjective-financial-strain' && !subjectiveDifficultyAndGreatDifficulty
    ? /\bcon dificultad\b/.test(text) && !/\bgran dificultad\b/.test(text) ? 'subjective_poverty_difficulty_rate'
      : /\bgran dificultad\b/.test(text) && !/\bcon dificultad\b/.test(text) ? 'subjective_poverty_great_difficulty_rate' : undefined
    : undefined;
  const direct = focus.id === 'subjective-financial-strain' && subjectiveResponseMetric ? [subjectiveResponseMetric]
    : focus.id === 'labour-productivity-and-growth' ? ['real_labour_productivity_per_person', 'real_labour_productivity_per_hour']
    : focus.id === 'household-inflation-basket' && !/\b(alquil\w*|arrendam\w*|viviend\w*)\b/.test(text) ? ['annual_hicp_food_index']
    : focus.id === 'education-employment-outcomes' ? educationOutcomeMetrics(claim)
    : focus.id === 'working-poverty' && /\b(jornada completa|tiempo completo)\b/.test(text) && /\b(jornada parcial|tiempo parcial|media jornada|empleo parcial|trabajo parcial)\b/.test(text) ? ['in_work_poverty_full_time_rate', 'in_work_poverty_part_time_rate']
    : focus.id === 'working-poverty' && /\b(jornada completa|tiempo completo)\b/.test(text) ? ['in_work_poverty_full_time_rate']
    : focus.id === 'working-poverty' && /\b(jornada parcial|tiempo parcial|media jornada|empleo parcial|trabajo parcial)\b/.test(text) ? ['in_work_poverty_part_time_rate']
    : focus.id === 'working-poverty' ? ['in_work_poverty_rate']
    : focus.id === 'primary-care-waits' && primaryCareRateRequested && primaryCareDurationRequested ? ['primary_care_wait_days', 'primary_care_wait_over_one_day_rate']
      : focus.id === 'primary-care-waits' && primaryCareRateRequested ? ['primary_care_wait_over_one_day_rate']
        : focus.id === 'primary-care-waits' && primaryCareDurationRequested ? ['primary_care_wait_days']
      : focus.id === 'housing-construction-pressure' && /\b(alquil\w*|arrendam\w*|rentas?)\b/.test(text) ? ['rental_price_index'] : focus.direct;
  const subjectivePovertyContext = focus.id === 'working-poverty'
    && /\b(fin de mes|alcanza para vivir|llega para vivir|cubrir (?:los )?gastos)\b/.test(text)
    ? ['subjective_poverty_rate', 'subjective_poverty_difficulty_rate', 'subjective_poverty_great_difficulty_rate'] : [];
  const productivityMacroContext = focus.id === 'labour-productivity-and-growth'
    && /\b(?:crecimiento|crecio|crece|pib|producto interior bruto|total gdp|economia en su conjunto)\b/.test(text);
  const productivityPopulationContext = focus.id === 'labour-productivity-and-growth'
    && /\b(?:poblacion|por habitante|por persona(?! (?:ocupad[oa]|emplead[oa]|trabajador[ao]))|nivel de vida|condiciones de vida|bienestar)\b/.test(text);
  const productivityEmploymentContext = focus.id === 'labour-productivity-and-growth'
    && /\b(?:aumento (?:de|del) empleo|crecimiento (?:de|del) empleo|creacion de empleo|mas empleo|mas puestos de trabajo|empleo total|personas ocupadas|personas empleadas|hay mas personas trabajando)\b/.test(text);
  const selectedContext = focus.id === 'subjective-financial-strain' && subjectiveResponseMetric ? []
    : focus.id === 'labour-productivity-and-growth' ? [
      ...(productivityMacroContext || productivityPopulationContext ? ['gdp_real_annual'] : []),
      ...(productivityPopulationContext ? ['gdp_real_per_capita_annual'] : []),
      ...(productivityEmploymentContext ? ['employment_persons_per_capita_national_accounts'] : []),
    ]
      : focus.context;
  const european = /\b(europa|europe[oa]s?|ue|union europea)\b/.test(text);
  // An all-worker unemployment rate does not describe the availability of
  // vacancies with a particular contract, wage, schedule or employer.
  const specificJobConditions = focus.id === 'job-opportunities'
    && /\b(?:temporal\w*|indefinid\w*|precar\w*|dign\w*|salari\w*|sueld\w*|paga\w*|pagad\w*|jornada\w*|public\w*|funcionari\w*)\b/.test(text);
  return new Set([...direct, ...(specificJobConditions ? [] : selectedContext), ...subjectivePovertyContext].map((id) => european && known.has(`${id}_europe`) ? `${id}_europe` : id).filter((id) => known.has(id)));
};
