import { metricVocabulary } from './measurement-definitions.generated.mjs';

const normalize = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const has = (text, expression) => expression.test(text);
const wages = /\b(salari\w*|sueld\w*|nomina\w*|remuner\w*|cobr\w*|pagan?)\b/;
const rents = /\b(alquil\w*|arrendam\w*|inquilin\w*|renta mensual)\b/;
const rentalBurden = /\b(ingres\w*|salari\w*|sueld\w*|nomina\w*|mitad|por ciento|porcentaje|esfuerzo|asequib\w*|poder alquilar|puede alquilar|puede pagar|alquilar[^.]{0,35}sol[oa]|emancip\w*|independiz\w*)\b/;
const absoluteRentAmount = /\b(cuant\w*|importe\w*|cantid\w*|cuant[ií]a\w*|euros?|eur|mensual\w*|al mes|por mes|€)\b/;
const migrationPopulation = /\b(inmigr\w*|migr\w*|extranjer\w*|nacid\w* fuera|nacid\w* en el extranjero|personas de origen extranjero|ciudadania extranjera|nacionalidad extranjera|ciudadan\w* europea|nacionalidad europea|ciudadan\w* de (?:otro pais|otros paises) (?:de )?(?:la )?(?:ue|union europea)|nacionalidad de otro pais (?:de )?(?:la )?(?:ue|union europea))\b/;
const migrationCredentialRecognition = (t) => migrationPopulation.test(t)
  && /\b(titul\w*|estudios? (?:superiores?|universitarios?)|cualific\w*|formacion|sobrecualific\w*)\b/.test(t)
  && /\b(homolog\w*|reconoc\w*|convalid\w*|revalid\w*|equivalen\w*|sobrecualific\w*|por debajo|inferior\w*|desajust\w*|desencaj\w*|baja cualificaci\w*|trabaj\w*[^.]{0,45}(?:formacion|titulaci\w*|cualificaci\w*)|acab\w*[^.]{0,45}(?:emple\w*|puesto\w*))\b/.test(t)
  && !/\b(fiscal\w*|impuest\w*|recaud\w*|tribut\w*|cotiz\w*)\b/.test(t);
const migrationOverqualification = (t) => migrationPopulation.test(t)
  && (/\bsobrecualific\w*\b/.test(t)
    || /\b(titul\w*|estudios? (?:superiores?|universitarios?|terciarios?)|educacion (?:superior|terciaria)|universitari\w*)\b/.test(t)
      && /\b(?:ocupacion\w*|puesto\w*|empleo\w*)[\s\w]{0,40}\b(?:menor\w*|inferior\w*|baj\w*)\b[\s\w]{0,25}\b(?:cualific\w*|nivel|estudios?)\b/.test(t))
  && !/\b(homolog\w*|reconoc\w*|convalid\w*|revalid\w*|equivalen\w*)\b/.test(t);
const migrationFiscalContribution = (t) => migrationPopulation.test(t)
  && /\b(fiscal\w*|impuest\w*|hacienda|recaud\w*|tribut\w*|cotiz\w*|contribucion\w*|arcas? publicas|cuentas? publicas|presupuest\w*|gasto publico)\b/.test(t)
  && /\b(aport\w*|contribu\w*|net\w*|balance\w*|pag\w*|recib\w*|cost\w*|benefici\w*|mas|menos|cualific\w*|salari\w*|sueld\w*|ingres\w*|cotiz\w*)\b/.test(t);
const migrationWageEffects = (t) => migrationPopulation.test(t)
  && /\b(salari\w*|sueld\w*|nomina\w*|remuner\w*|ingres\w*|cobr\w*|gan\w*)\b/.test(t)
  && /\b(press\w*|baj\w*|reduc\w*|afect\w*|compar\w*|menor\w*|mayor\w*|diferenc\w*|mas|menos|a la baja|por debajo)\b/.test(t)
  && !/\b(fiscal\w*|impuest\w*|recaud\w*|tribut\w*|cotiz\w*)\b/.test(t);
const healthcareWorkforceCausality = (t) => /\b(medic\w*|facultativ\w*|enfermer\w*|personal sanitario|profesional\w* sanitari\w*)\b/.test(t)
  && /\b(falt\w*|escasez|deficit|poc\w*|insuficient\w*)\b/.test(t)
  && /\b(condicion\w*|titulad\w*|graduad\w*|plantilla|vacantes?|plazas?|zonas?|puebl\w*|rural\w*|capital\w*|provinci\w*|territorio|distribuci\w*)\b/.test(t);
const specialistOutpatientRegionalWaits = (t) => {
  const wait = /\blistas? de espera\b/.test(t)
    || /\b(espera\w*|demora\w*)\b/.test(t) && /\b(consultas? externas?|atencion especializada|especialistas?|sanidad|salud|medic\w*|hospital\w*)\b/.test(t);
  const regionalComparison = /\b(comunidades? autonomas?|ccaa|region(?:es)?|regional\w*|territorios?)\b/.test(t)
    && /\b(vari\w*|cambi\w*|diferenc\w*|desigual\w*|compar\w*|mayor\w*|menor\w*|mas|menos|brecha\w*)\b/.test(t);
  const incompatibleService = /\b(atencion primaria|medic\w* de (?:familia|cabecera)|cirug\w*|quirurg\w*|operacion\w*|urgencias?|pruebas? diagnosticas?|codigo postal|municipio\w*|barrio\w*|hospital\w* concret\w*|privad\w*|trenes?|ferroviar\w*|autobuses?|transporte|licencias?|administrativ\w*)\b/.test(t);
  const causalOrTrend = /\b(caus\w*|provoc\w*|empuj\w*|oblig\w*|porque|debido|por culpa|se debe|responsab\w*|consecuencia|falta de (?:medic\w*|personal sanitario|profesional\w* sanitari\w*)|desde (?:19|20)\d{2}|desde la pandemia|desde hace|cada vez|cada a[nñ]o|a lo largo|ultim\w* a[nñ]os|serie temporal|tendencia|aument\w*|crec\w*|baj\w*|disminu\w*|evoluci\w*)\b/.test(t);
  const specificSpecialty = /\b(dermatolog\w*|traumatolog\w*|oftalmolog\w*|neurolog\w*|cardiolog\w*|ginecolog\w*|urolog\w*|digestiv\w*|otorrinolaringolog\w*|especialidades?)\b/.test(t);
  const specificTerritory = /\b(andalucia|aragon|asturias|baleares|canarias|cantabria|castilla(?: y leon| la mancha)?|cataluna|extremadura|galicia|madrid|murcia|navarra|pais vasco|rioja|ceuta|melilla|valencia)\b/.test(t);
  const years = [...t.matchAll(/\b20\d{2}\b/g)].map(([year]) => year);
  return wait && regionalComparison && !incompatibleService && !causalOrTrend && !specificSpecialty && !specificTerritory
    && (!years.length || years.every((year) => year === '2025'));
};
const specialistOutpatientWaitEvidence = {
  expiresAt: '2027-03-24', territories: ['ES'],
  evidenceLabel: 'Demoras registradas en consultas externas del SNS',
  dimensions: {
    subject: 'espera media de pacientes en listas estructurales de consultas externas del SNS, agregada en diez especialidades',
    population: 'pacientes registrados en listas estructurales de espera de consultas externas del SNS',
    period: '2025-12-31', geography: 'España: comunidades autónomas y ciudades autónomas',
    denominator: 'pacientes registrados en la lista estructural de consultas externas de cada territorio', unit: 'días de espera media',
  },
  facts: [
    'A 31 de diciembre de 2025, la espera media total de consultas externas registrada por el SNS iba de 16 días en Melilla a 162 días en Canarias. El informe presenta el total de diez especialidades para cada territorio.',
    'El Ministerio indicó el 24 de septiembre de 2026 que esos datos de diciembre de 2025 eran los últimos disponibles y que el informe se había actualizado tras corregir los datos aportados por Castilla-La Mancha. También advierte que las cifras dependen de la información remitida por cada comunidad autónoma y que cada administración responde de su exactitud y del cumplimiento de los criterios comunes.',
  ],
  sources: [
    { id: 'sisle-sns-regional-consultations-dec-2025', title: 'Listas de espera del SNS: datos por comunidades autónomas, diciembre de 2025 (rectificado)', publisher: 'Ministerio de Sanidad', url: 'https://www.sanidad.gob.es/estadEstudios/estadisticas/inforRecopilaciones/docs/Datos_ccaa_dic2025_rectificado.pdf', publishedAt: '2026-09-24', retrievedAt: '2026-11-17' },
    { id: 'sisle-sns-latest-data', title: 'Sistema de Información de Listas de Espera del SNS: últimos datos disponibles', publisher: 'Ministerio de Sanidad', url: 'https://www.sanidad.gob.es/estadEstudios/estadisticas/inforRecopilaciones/listaEspera.htm', retrievedAt: '2026-11-17' },
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
const waits = /\b(esper\w*|demor\w*|cita\w*|tard\w*|retras\w*|acceso|acceder)\b/;
const privateCareMention = /\b(seguro\w*(?: medico\w*)? privad\w*|sanidad privada|medicina privada|asistencia privada|consultas? privad\w*|atencion privada)\b/;
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
const ruralUrbanAccess = (t) => /\b(rural\w*|pueblo\w*|campo|zonas? rurales?)\b/.test(t)
  && /\b(acceso|acceder|llegar|disponibilidad|servicios?)\b/.test(t)
  && [
    /\b(viviend\w*|alquil\w*|piso\w*|casas?)\b/,
    /\b(emple\w*|trabaj\w*|oportunidad\w*)\b/,
    /\b(sanidad|salud|medic\w*|hospital\w*)\b/,
    /\b(educaci[oó]n|escuel\w*|colegio\w*|formaci[oó]n)\b/,
    /\b(transporte|autob[uú]s|tren|coche)\b/,
  ].filter((pattern) => pattern.test(t)).length >= 2
  && /\b(mas|menos|mejor|peor|diferenc\w*|compar\w*|frente a|que en|que quienes)\b/.test(t);
const gdpHouseholdWelfare = (t) => /\b(?:pib|gdp|crecimiento economico|economia crece)\b/.test(t)
  && /\b(?:hogar\w*|famili\w*|nivel de vida|condiciones de vida|bienestar|distribucion de la renta|desigualdad)\b/.test(t)
  && /\bno\b[\s\w]{0,36}\b(?:reflej\w*|muestr\w*|represent\w*|mid\w*|traduc\w*|lleg\w*|repart\w*|indic\w*|explic\w*|signific\w*|demostr\w*|cuent\w*|es|sirv\w*)\b/.test(t)
  && !/\b(?:cuant[oa]s?|porcentaje|tasa|indice|comparar|compara|comparacion)\b/.test(t);
const educationEmploymentOutcome = (t) => /\b(universidad\w*|universitari\w*|carrer\w*|titul\w*|graduad\w*|estudios? superiores?|educacion (?:superior|terciaria)|cualific\w*|sobrecualific\w*|formacion profesional|fp)\b/.test(t)
  && !migrationPopulation.test(t) && !healthcareWorkforceCausality(t)
  && (/\b(emple\w*|trabaj\w*|ocupaci\w*|puesto\w*|mercado laboral|paro|desemple\w*)\b/.test(t) || /\bsobrecualific\w*\b/.test(t));
const educationJobFit = (t) => /\b(cualific\w*|acorde\w*|relacionad\w*|adecuad\w*|sobrecualific\w*|desajust\w*|desencaj\w*|nivel de estudios|campo de estudios)\b/.test(t)
  || /\b(?:puesto\w*|empleo\w*|trabajo\w*|ocupaci\w*)\b[\s\w]{0,55}\b(?:no requier\w*|no exig\w*|requiere? menos|exige menos)\b/.test(t)
  || /\b(?:no requier\w*|no exig\w*|requiere? menos|exige menos)\b[\s\w]{0,55}\b(?:nivel|estudios|titulaci\w*|formaci\w*|cualificaci\w*)\b/.test(t)
  || /\b(?:por debajo|inferior|menor)\b[\s\w]{0,35}\b(?:formaci\w*|cualificaci\w*|nivel de estudios)\b/.test(t);
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
  const youthReference = /\b(joven\w*|juvenil)\b/.test(t);
  const belowThirty = /\bmenores? de \d+\b/.test(t);
  const requestedAges = [...String(claim).matchAll(/\b(\d{2})\s*(?:[-–—]|a|hasta|to|y)\s*(\d{2})\b/gi)];
  const qualificationFit = educationJobFit(t);
  const age20To34Requested = requestedAges.length === 1 && requestedAges[0][1] === '20' && requestedAges[0][2] === '34';
  const age20To64Requested = requestedAges.length === 1 && requestedAges[0][1] === '20' && requestedAges[0][2] === '64';
  if (educationJobRequirement(t) || educationLevelComparison(t) || unsupportedEducationOrTerritory
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
  && /\b(exclu\w*|dej\w* fuera|rechaz\w*|deneg\w*|impid\w*|barrer\w*|filtr\w*|no pueden? alquilar|dif[ií]cil\w* alquilar)\b/.test(t);
const rentalRegulationContractShift = (t) => rentalSubject(t)
  && /\b(regulaci\w*|topes?\b|control de precios|l[ií]mite\w* (?:al|del) alquiler|ley de vivienda)\b/.test(t)
  && /\b(empuj\w*|desplaz\w*|desaparec\w*|retir\w*|reduc\w*|convert\w*|pas\w*|temporad\w*|temporal(?:es)?|mercado regulado|oferta)\b/.test(t);
const rentalLandlordMotives = (t) => rentalSubject(t)
  && (/\b(propietari\w*|arrendador\w*|caser\w*|due[nñ]os?|anfitri[oó]n\w*)\b/.test(t)
    || /\b(viviend\w*|piso\w*|casas?|apartament\w*)\b[\w\s]{0,40}\b(vac[ií]a\w*|desocupad\w*|retirad\w*)\b/.test(t))
  && /\b(mied\w*|temor\w*|riesg\w*|problem\w* legal\w*|flexibil\w*|prefier\w*|prefer\w*|rentabil\w*|seguridad jur[ií]dica)\b/.test(t)
  && /\b(alquil\w*|arrendam\w*|vac[ií]a\w*|desocupad\w*|retir\w*|dej\w*|temporad\w*|temporal(?:es)?|contrat\w*)\b/.test(t);
const foreignHousingPriceCause = (t) => /\b(viviend\w*|alquil\w*|renta\w*|piso\w*|casas?|mercado inmobiliario|precios? inmobiliarios?)\b/.test(t)
  && /\b(inmigr\w*|migrant\w*|extranjer\w*|no residentes?|comprador\w*|inversor\w*)\b/.test(t)
  && /\b(caus\w*|provoc\w*|encarec\w*|aument\w*|sub\w*|elev\w*|dispar\w*|presion\w*|retir\w*)\b/.test(t);
const foreignHousingPurchaseCause = (t) => foreignHousingPriceCause(t)
  && /\b(compra\w*|comprador\w*|adquisici\w*|inversor\w*|transacci\w*|no residentes?)\b/.test(t);
const migrationHousingDemandCause = (t) => foreignHousingPriceCause(t)
  && !/\b(compra\w*|comprador\w*|adquisici\w*|inversor\w*|transacci\w*|no residentes?)\b/.test(t);
const namedSector = /\b(turis\w*|hosteler\w*|hotel\w*|agricultur\w*|sector primario|construcci\w*|industri\w*|manufactur\w*|comerci\w*|transporte|financier\w*|tecnolog\w*)\b/;
const sectorWages = (t) => (namedSector.test(t) || /\bsectores?\b/.test(t))
  && /\b(salari\w*|sueld\w*|nomina\w*|remuner\w*|pag\w*)\b/.test(t);
const selfEmploymentCostViability = (t) =>
  /\b(autonom\w*|trabajador\w* por cuenta propia|cuenta propia|freelance)\b/.test(t)
  && /\b(cuot\w*|cotiz\w*|cost\w* fijo\w*|gasto\w* (?:fijo\w*|obligatori\w*)|gestor\w*|carga administrat\w*|impuesto\w*)\b/.test(t)
  && /\b(ingres\w*|factur\w*|rentab\w*|viable|inviable|compens\w*|irregular\w*|estable)\b/.test(t);
const futurePensionOutlook = (t) => /\b(pension\w*|jubil\w*|cotiz\w*)\b/.test(t)
  && /\b(futur\w*|generaci\w*|cuando (?:me |se )?jubil\w*|en (?:20|21)\d{2}|dentro de \d+ a[nñ]os|(?:pagar|cobrar|recibir|tener|haber)an)\b/.test(t)
  && /\b(pag\w*|cobr\w*|recib\w*|tendr\w*|garantiz\w*|menor\w*|inferior\w*|reemplaz\w*|sustituci[oó]n|cu[aá]nt[oa])\b/.test(t);
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
    id: 'gdp-household-welfare', label: 'PIB y condiciones de vida de los hogares',
    when: gdpHouseholdWelfare,
    direct: [], context: [],
    needs: ['renta disponible mediana equivalente por persona, en términos reales, para el mismo territorio y periodo', 'distribución de la renta si se afirma que el crecimiento no llega a los hogares', 'definición concreta de bienestar si incluye vivienda, empleo, salud u otros servicios'],
    explanation: 'El PIB mide producción agregada. Informa sobre el tamaño y el crecimiento de la economía, pero por sí solo no indica la renta disponible de cada hogar ni cómo se distribuye la prosperidad. Eurostat distingue el PIB de las medidas de ingreso y condiciones de vida de los hogares.',
    explanationEvidence: {
      directClaimEvidence: true,
      expiresAt: '2027-11-16', territories: ['ES'],
      facts: [
        'Eurostat define el PIB real por habitante como el PIB ajustado por inflación dividido por la población media del año. Lo considera una aproximación al nivel material de vida, pero no una medida completa del bienestar económico.',
        'Eurostat recoge ingresos y condiciones de vida mediante EU-SILC. La renta disponible equivalente ajusta el ingreso del hogar por su tamaño y composición y lo atribuye a cada persona; mide ingresos, no todas las dimensiones de bienestar.',
      ],
      sources: [
        { id: 'eurostat-gdp-wellbeing-indicator', title: 'Real GDP per capita · SDG indicator profile', publisher: 'Eurostat', url: 'https://ec.europa.eu/eurostat/cache/metadata/en/sdg_08_10_esmsip2.htm', retrievedAt: '2026-11-16' },
        { id: 'eurostat-income-living-conditions-metadata', title: 'Income and living conditions (EU-SILC) · metadata', publisher: 'Eurostat', url: 'https://ec.europa.eu/eurostat/cache/metadata/en/ilc_simsilc_el.htm', retrievedAt: '2026-11-16' },
      ],
    },
    limitation: 'Esto confirma que el PIB no basta para describir cómo viven los hogares; no demuestra que el crecimiento no les beneficie. Para valorar su evolución hay que comparar ingresos reales y distribución en los mismos años y territorio.',
  },
  {
    id: 'rural-urban-service-access', label: 'acceso rural y urbano a vivienda y servicios',
    when: ruralUrbanAccess,
    direct: [], context: [],
    needs: ['indicadores de acceso rural y urbano para cada servicio mencionado', 'misma población, territorio y periodo en cada comparación', 'vivienda asequible medida con alquiler o compra e ingresos locales'],
    explanation: 'Que la vivienda cueste menos en una zona rural no demuestra que haya mejor acceso a empleo, sanidad, educación o transporte. Cada ámbito necesita su propia medida y una comparación territorial compatible.',
    limitation: 'Los promedios nacionales de precios, empleo o sanidad no permiten concluir cómo difiere el acceso entre población rural y urbana.',
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
    limitation: 'Esta descripción de la financiación no calcula tu futura pensión ni demuestra por sí sola la sostenibilidad del sistema. Eso requiere reglas, periodos cotizados y escenarios demográficos y económicos.',
  },
  {
    id: 'future-pension-outlook', label: 'pensiones futuras de una generación',
    when: futurePensionOutlook,
    direct: [], context: [],
    needs: ['cohorte de nacimiento y año previsto de jubilación', 'proyección de prestaciones bajo reglas, cotizaciones y supuestos económicos explícitos', 'tasa de sustitución o prestación neta y bruta, con carrera laboral y unidad comparables'],
    explanation: 'La pensión de una generación que aún trabaja es una proyección, no una prestación observada. La pensión media actual de quienes ya se jubilaron no permite estimar por sí sola cuánto cobrará esa generación.',
    explanationEvidence: {
      expiresAt: '2027-04-30', territories: ['ES'],
      facts: [
        'La metodología de AIReF para el gasto público en pensiones usa un modelo de cohortes y separa las proyecciones de pensiones medias y número de prestaciones por sexo, edad y tipo de pensión, bajo escenarios demográficos y macroeconómicos.',
        'Es una proyección agregada de gasto y prestaciones medias; no predice la pensión concreta de cada persona ni su tasa de sustitución individual.',
      ],
      sources: [{ id: 'airef-pension-projection-method-2025', title: 'Metodología del modelo para estimar el gasto en pensiones · Documento técnico 3/25', publisher: 'AIReF', url: 'https://www.airef.es/wp-content/uploads/2025/04/Documentos-tecnicos-segunda-opinion-sostenibilidad-a-largo-plazo-AAPP/250225_DT_metodologia_pensiones.pdf', retrievedAt: '2026-11-16' }],
    },
    limitation: 'Una comparación actual entre pensión media y salario medio no demuestra que las generaciones jóvenes cobrarán relativamente menos. Para responder hacen falta cohortes de nacimiento y años de jubilación definidos, además de separar el importe nominal de la tasa de sustitución y publicar las reglas y supuestos de cada escenario.',
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
    limitation: 'La comparación muestra diferencias en el tiempo medio registrado para consultas externas del SNS; no establece si son excesivas ni por qué existen. No mide atención primaria, cirugía, pruebas diagnósticas, hospitales concretos ni tiempos individuales. El Ministerio advierte que los datos proceden de las comunidades autónomas.',
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
    id: 'foreign-housing-price-causality', label: 'efecto de compras y población extranjera sobre los precios de vivienda',
    when: foreignHousingPurchaseCause,
    claimType: 'causal',
    direct: [], context: [],
    needs: ['compras de vivienda desglosadas por residencia habitual y nacionalidad del comprador', 'precios de vivienda o alquiler en los mismos municipios y periodos', 'una comparación causal que tenga en cuenta oferta, demanda local, turismo y financiación'],
    explanation: 'Que coincidan precios altos y población extranjera en una zona no demuestra que las compras de no residentes los causaran. Nacionalidad, lugar de nacimiento y residencia habitual describen grupos distintos.',
    limitation: 'Las series nacionales de precios y el número de residentes nacidos fuera no muestran cuántas compras hicieron personas no residentes ni su efecto en zonas costeras. Sin medidas locales y una comparación causal no se puede atribuirles la subida.',
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
    direct: [], context: ['rental_price_index', 'house_price_index'],
    needs: ['vivienda independiente observada entre personas con jornada completa', 'ingresos netos y coste de alquiler o compra para la misma población, territorio y periodo', 'edad, tipo de hogar y ayudas económicas cuando se afirma un cambio para un grupo'],
    explanation: 'La jornada completa describe las horas trabajadas; por sí sola no mide el salario neto ni si una persona puede vivir por su cuenta.',
    limitation: 'Los índices de alquiler y compraventa no muestran qué proporción de personas a jornada completa vive de forma independiente. Para comprobar un cambio como «ya no» también hace falta comparar la misma población, territorio y periodo.',
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
        'Como contexto, el registro de fianzas del INCASÒL contabilizó 9.330 contratos de temporada en 2023 y 13.517 en 2024 (+44,9 %).',
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
    limitation: 'Contar viviendas vacías no indica si estaban disponibles para alquilar ni por qué; las opiniones generales tampoco demuestran qué decisión tomó cada propietario.',
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
    id: 'working-poverty', label: 'trabajar y no poder cubrir los gastos',
    when: (t) => /\b(trabaj\w*|emple\w*|ocupad\w*|jornada completa)\b/.test(t) && /\b(pobrez\w*|pobres?|fin de mes|alcanza para vivir|llega para vivir|cubrir (?:los )?gastos)\b/.test(t),
    direct: ['in_work_poverty_rate', 'in_work_poverty_full_time_rate'], context: [],
    needs: ['renta disponible del hogar y umbral de pobreza', 'tipo de jornada', 'periodo y población'],
    explanation: 'Tener empleo no garantiza quedar fuera del riesgo de pobreza: Eurostat mide si la renta disponible equivalente del hogar queda por debajo del 60 % de la mediana nacional, después de transferencias.',
    limitation: 'El umbral de pobreza no equivale a declarar dificultades para llegar a fin de mes. Una tasa general de ocupación o de contratos temporales no mide ninguna de esas dos situaciones.',
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
    id: 'education-employment-outcomes', label: 'empleo y adecuación al nivel de estudios',
    when: educationEmploymentOutcome,
    direct: [], context: [],
    needs: ['tasa de empleo o paro del nivel educativo y la población comparados, con el mismo periodo y territorio', 'ocupaciones que requieren educación terciaria y nivel educativo de quienes las ocupan', 'para afirmar qué titulación exigen las ofertas, requisitos de anuncios de empleo comparables en el tiempo'],
    explanation: 'Las tasas de empleo o paro por nivel educativo muestran si las personas tituladas trabajan; no indican por sí solas si el puesto corresponde a sus estudios. Acceso al empleo y ajuste entre formación y ocupación son resultados distintos.',
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
    id: 'real-wages', label: 'salarios y poder adquisitivo',
    when: (t) => has(t, wages) && /\b(poder (?:adquisitivo|de compra)|inflacion|coste de (?:la )?vida|precios|salari\w* real(?:es)?|perdi\w* poder)\b/.test(t),
    direct: [], context: ['annual_hourly_wage_index', 'annual_hicp_index', 'median_hourly_earnings', 'cpi_index'],
    needs: ['una serie salarial y una de precios con las mismas fechas', 'salario bruto o neto y población', 'cambio acumulado descontando inflación'],
    explanation: 'El poder adquisitivo cambia según cuánto sube el salario respecto a los precios. Hay que comparar ambas series entre las mismas fechas.',
    limitation: 'Un salario nominal o un IPC aislado no demuestra una pérdida salarial real. Tampoco la temporalidad o la cuña fiscal responden a esa comparación.',
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
    id: 'rental-affordability', label: 'alquiler e ingresos',
    when: (t) => has(t, rents) && (has(t, rentalBurden) || has(t, wages) && !has(t, absoluteRentAmount)),
    direct: [], context: ['rental_price_index', 'housing_cost_overburden_rate', 'median_equivalised_income'],
    needs: ['alquiler de vivienda completa y renta neta comparables', 'ciudad, tipo de hogar y periodo', 'porcentaje de ingresos destinado al alquiler'],
    explanationHeadline: 'El dato disponible no permite saber si un sueldo normal alcanza para alquilar solo',
    explanation: 'El esfuerzo medio del alquiler depende de los ingresos y del tipo de hogar. Un promedio de hogares arrendatarios aporta contexto, pero no responde por sí solo si una persona con un sueldo concreto puede alquilar una vivienda completa.',
    explanationEvidence: bankSpainRentEffortEvidence,
    limitation: 'El promedio describe hogares que ya vivían de alquiler; no incluye el gasto de cada persona ni a quienes no lograron acceder. Para comprobar si alguien puede alquilar un piso entero hacen falta el alquiler y el ingreso neto individual comparables por ciudad y periodo. El índice de alquiler mide cambios de precios, no importes mensuales.',
  },
  {
    id: 'purchase-affordability', label: 'acceso a la compra de vivienda',
    when: (t) => /\b(hipotec\w*|entrada|comprar (?:una )?(?:casa|vivienda|piso))\b/.test(t) && /\b(salari\w*|sueld\w*|ingres\w*|ahorr\w*|deposit\w*|aval\w*|familiar\w*|barrera|acceso|acceder)\b/.test(t),
    direct: [], context: ['house_price_index', 'median_equivalised_income'],
    needs: ['precio y ahorro inicial', 'ingresos, intereses y plazo de financiación', 'territorio y tipo de hogar'],
    explanation: 'El acceso a una hipoteca depende de la entrada y los gastos iniciales, los ingresos y las condiciones de financiación.',
    limitation: 'El precio de compraventa por sí solo no mide cuántos hogares pueden reunir la entrada ni pagar la cuota.',
  },
  {
    id: 'sector-wage-comparison', label: 'salarios y productividad por sector',
    when: sectorWages,
    direct: [], context: [],
    needs: ['distribución salarial por sector y ocupación, incluidos jornada, tipo de contrato y salarios brutos o netos', 'productividad sectorial medida con una definición comparable, como valor añadido por hora trabajada', 'misma clasificación sectorial, territorio y periodo para salarios y productividad'],
    explanation: 'El salario mediano nacional no permite comparar sectores. Una comparación sectorial necesita alinear salarios y productividad por actividad y periodo; el valor añadido total de un sector tampoco equivale a productividad por trabajador u hora.',
    explanationEvidence: {
      expiresAt: '2027-11-16', territories: ['ES'],
      facts: [
        'El salario mediano nacional no separa las diferencias entre sectores. Eurostat dispone de encuestas armonizadas de estructura salarial que desglosan las remuneraciones brutas por actividad económica y características de las personas empleadas. Se realizan cada cuatro años; la edición de referencia más reciente que recoge la ficha consultada es 2022.',
        'La cobertura obligatoria incluye unidades con al menos 10 empleados y excluye agricultura, pesca, hogares privados y organizaciones extraterritoriales; la administración pública se recoge voluntariamente. Ese alcance debe tenerse en cuenta al hablar de sectores o empresas pequeñas.',
      ],
      sources: [{ id: 'eurostat-structure-earnings-survey', title: 'Earnings · Structure of earnings survey', publisher: 'Eurostat', url: 'https://ec.europa.eu/eurostat/en/web/labour-market/information-data/earnings', retrievedAt: '2026-11-16' }],
    },
    limitation: 'Sin distribuciones salariales por sector y una medida comparable de productividad —por ejemplo, valor añadido por hora trabajada para la misma actividad y periodo— no se puede afirmar qué sectores generan más salarios altos ni que el turismo cause por sí solo una diferencia salarial. Si también se compara su aportación al PIB, hay que medir el valor añadido del mismo sector y periodo; el valor total no equivale a productividad ni a salarios.',
  },
  {
    id: 'self-employment-cost-viability', label: 'costes fijos y viabilidad del trabajo autónomo',
    when: selfEmploymentCostViability,
    direct: [], context: [], claimType: 'causal',
    needs: ['ingresos netos, cuotas y gastos fijos de autónomos con ingresos bajos o irregulares, para el mismo periodo', 'altas, continuidad y bajas de esas actividades, con motivo de cierre si se atribuye a los costes'],
    explanation: 'Para comprobarlo hay que comparar los ingresos netos con las cuotas y demás gastos fijos de los mismos autónomos, y observar si sus actividades continúan o cierran.',
    limitation: 'Los totales de cotizaciones, la renta mediana y los salarios medios no muestran ese balance por autónomo ni prueban por qué cerró una actividad.',
  },
  {
    id: 'matched-pay', label: 'salarios de perfiles profesionales comparables',
    when: (t) => has(t, wages) && /\b(mismo|misma|equivalente|similar)\b/.test(t) && /\b(perfil\w*|profes\w*|puesto\w*|trabajo|titul\w*|formacion|cualific\w*)\b/.test(t),
    direct: [], context: ['median_hourly_earnings', 'median_hourly_earnings_europe', 'gender_pay_gap'],
    needs: ['ocupación, experiencia y formación equivalentes', 'jornada y salario bruto o neto', 'país, periodo y poder de compra'],
    explanation: 'Comparar el mismo perfil profesional requiere controlar ocupación, jornada, experiencia y formación.',
    limitation: 'Una mediana salarial nacional o una brecha salarial sin ajustar no compara personas que desempeñan el mismo puesto.',
  },
  {
    id: 'nominal-wages', label: 'salarios y remuneración',
    when: (t) => /\b(salari\w*|sueld\w*|nomina\w*|remuner\w*)\b/.test(t)
      && /\b(sub\w*|baj\w*|aument\w*|perd\w*|estanc\w*|alt\w*|baj[oa]\w*|menor\w*|mayor\w*|menos|mas|compar\w*|difer\w*)\b/.test(t)
      && !/\b(salari\w* minim\w*|smi|brecha salarial|median\w* por hora)\b/.test(t),
    direct: [], context: ['median_hourly_earnings'],
    needs: ['salario bruto o neto y periodo', 'jornada y población comparables', 'referencia temporal o territorial'],
    explanation: 'El salario puede medirse por hora, mes o año; las comparaciones dependen de la jornada, la población y de si se usan importes brutos o netos.',
    limitation: 'El salario mediano bruto por hora ofrece contexto, pero no mide automáticamente el salario anual, el neto ni la remuneración de un puesto o persona concreta.',
  },
  {
    id: 'primary-care-waits', label: 'citas de atención primaria',
    when: (t) => has(t, waits) && /\b(medic\w* de (?:familia|cabecera)|atencion primaria|centro de salud)\b/.test(t) && !privateCareMention.test(t),
    direct: ['primary_care_wait_days', 'primary_care_wait_over_one_day_rate'], context: [],
    needs: ['tiempo hasta la cita en atención primaria', 'base de pacientes encuestados', 'territorio y periodo'],
    explanation: 'La espera para el médico de familia debe medirse en atención primaria. Las listas hospitalarias de cirugía y especialistas son servicios diferentes.',
    limitation: 'Una media nacional no describe cada centro de salud. La demora entre quienes esperan más de un día tampoco es la media de todos los pacientes.',
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
    needs: ['línea, operador y tipo de servicio', 'definición y duración del retraso', 'periodo y viajes o pasajeros afectados'],
    explanation: 'La puntualidad se mide por servicio y umbral de retraso. Los trenes afectados, los pasajeros y las horas perdidas tienen denominadores distintos.',
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
  const direct = focus.id === 'education-employment-outcomes' ? educationOutcomeMetrics(claim)
    : focus.id === 'working-poverty' && /\b(jornada completa|tiempo completo)\b/.test(text) ? ['in_work_poverty_full_time_rate']
    : focus.id === 'primary-care-waits' && /\b(porcentaje|proporcion|por ciento)\b/.test(text) ? ['primary_care_wait_over_one_day_rate']
      : focus.id === 'primary-care-waits' && /\b(cuantos dias|demora media|tiempo medio)\b/.test(text) ? ['primary_care_wait_days'] : focus.direct;
  const european = /\b(europa|europe[oa]s?|ue|union europea)\b/.test(text);
  // An all-worker unemployment rate does not describe the availability of
  // vacancies with a particular contract, wage, schedule or employer.
  const specificJobConditions = focus.id === 'job-opportunities'
    && /\b(?:temporal\w*|indefinid\w*|precar\w*|dign\w*|salari\w*|sueld\w*|paga\w*|pagad\w*|jornada\w*|public\w*|funcionari\w*)\b/.test(text);
  return new Set([...direct, ...(specificJobConditions ? [] : focus.context)].map((id) => european && known.has(`${id}_europe`) ? `${id}_europe` : id).filter((id) => known.has(id)));
};
