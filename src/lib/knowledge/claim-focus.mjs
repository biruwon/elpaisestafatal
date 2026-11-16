import { metricVocabulary } from './measurement-definitions.generated.mjs';

const normalize = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const has = (text, expression) => expression.test(text);
const wages = /\b(salari\w*|sueld\w*|nomina\w*|remuner\w*|cobr\w*|pagan?)\b/;
const rents = /\b(alquil\w*|arrendam\w*|inquilin\w*|renta mensual)\b/;
const rentalBurden = /\b(ingres\w*|salari\w*|sueld\w*|nomina\w*|mitad|por ciento|porcentaje|esfuerzo|asequib\w*|poder alquilar|puede alquilar|puede pagar|alquilar[^.]{0,35}sol[oa]|emancip\w*|independiz\w*)\b/;
const absoluteRentAmount = /\b(cuant\w*|importe\w*|cantid\w*|cuant[ií]a\w*|euros?|eur|mensual\w*|al mes|por mes|€)\b/;
const waits = /\b(esper\w*|demor\w*|cita\w*|tard\w*|retras\w*|acceso|acceder)\b/;
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
const educationEmploymentOutcome = (t) => /\b(universidad\w*|universitari\w*|carrer\w*|titul\w*|graduad\w*|estudios? superiores?|cualific\w*|sobrecualific\w*|formacion profesional|fp)\b/.test(t)
  && /\b(emple\w*|trabaj\w*|ocupaci\w*|puesto\w*|mercado laboral|paro|desemple\w*)\b/.test(t);
const workHousingIndependence = (t) => /\b(jornada completa|tiempo completo|jornada entera)\b/.test(t)
  && /\b(emple\w*|trabaj\w*|salari\w*|sueld\w*|ingres\w*)\b/.test(t)
  && /\b(independiz\w*|emancip\w*|vivir por su cuenta|vivir por cuenta propia|vivir de forma independiente|vivir solo|mudarse solo)\b/.test(t);
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
    id: 'education-employment-outcomes', label: 'empleo y adecuación al nivel de estudios',
    when: educationEmploymentOutcome,
    direct: [], context: [],
    needs: ['tasa de empleo o paro desglosada por nivel educativo, con la misma edad, cohorte, territorio y periodo', 'nivel de estudios requerido por el puesto y formación de quienes lo ocupan cuando se afirma que no hay ajuste', 'campo de estudios y jornada si se comparan titulaciones o empleos'],
    explanation: 'Las tasas de empleo o paro por nivel educativo muestran si las personas tituladas trabajan; no indican por sí solas si el puesto corresponde a sus estudios. Acceso al empleo y ajuste entre formación y ocupación son resultados distintos.',
    explanationEvidence: {
      when: (t) => /\b(cualific\w*|acorde\w*|relacionad\w*|adecuad\w*|sobrecualific\w*|desajust\w*|desencaj\w*|nivel de estudios|campo de estudios)\b/.test(t),
      expiresAt: '2027-04-30', territories: ['ES'],
      facts: [
        'Eurostat calcula la tasa de sobrecualificación entre las personas de 20 a 64 años con estudios terciarios que ya están empleadas: indica qué proporción trabaja en ocupaciones que no requieren ese nivel. No mide a quienes siguen desempleados ni si el empleo coincide con su campo de estudios.',
        'En España, esa tasa fue del 34,0 % en 2025. Es evidencia de desajuste entre nivel educativo y ocupación entre quienes sí tienen empleo; por sí sola no mide si una titulación garantiza encontrar trabajo ni prueba que el desajuste esté aumentando.',
      ],
      sources: [{ id: 'eurostat-employment-annual-2025', title: 'Employment - annual statistics', publisher: 'Eurostat', url: 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Employment_-_annual_statistics', retrievedAt: '2026-11-16' }],
    },
    limitation: 'Una tasa de empleo o paro agregada para toda la población activa no describe el resultado de quienes tienen cada nivel de estudios. La tasa de sobrecualificación solo cuenta a quienes ya trabajan; para comprobar el acceso al empleo hacen falta tasas por nivel educativo, y para medir el ajuste también se necesita comparar educación y ocupación.',
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
    explanation: 'Para saber si un alquiler es asumible hay que compararlo con los ingresos del mismo tipo de hogar, ciudad y periodo.',
    limitation: 'El índice de alquiler mide cambios de precios, no el alquiler anunciado de un piso concreto. La sobrecarga de vivienda de todos los hogares tampoco mide automáticamente a una persona que vive sola.',
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
    when: (t) => has(t, waits) && /\b(medic\w* de (?:familia|cabecera)|atencion primaria|centro de salud)\b/.test(t),
    direct: ['primary_care_wait_days', 'primary_care_wait_over_one_day_rate'], context: [],
    needs: ['tiempo hasta la cita en atención primaria', 'base de pacientes encuestados', 'territorio y periodo'],
    explanation: 'La espera para el médico de familia debe medirse en atención primaria. Las listas hospitalarias de cirugía y especialistas son servicios diferentes.',
    limitation: 'Una media nacional no describe cada centro de salud. La demora entre quienes esperan más de un día tampoco es la media de todos los pacientes.',
  },
  {
    id: 'private-healthcare-access', label: 'seguro privado y acceso a la atención',
    when: (t) => /\b(seguro\w* privad\w*|sanidad privada|medicina privada|asistencia privada)\b/.test(t) && (has(t, waits) || /\b(evitar|rapidez|especialista\w*|prueba\w*|motivo\w*)\b/.test(t)),
    direct: [], context: [],
    needs: ['motivos declarados para contratar seguro', 'demoras comparables por servicio y sector', 'periodo y población con seguro'],
    explanation: 'Para comprobar por qué se contrata un seguro y si reduce las esperas hacen falta datos sobre los asegurados y los mismos servicios en ambos sectores.',
    limitation: 'Una lista de espera pública no mide las motivaciones de quienes contratan seguro ni el tiempo que esperan en la privada.',
  },
  {
    id: 'electricity-price-transmission', label: 'precio mayorista y factura eléctrica',
    when: (t) => has(t, electricity) && ( /\b(marginalis\w*|mayorista|gas)\b/.test(t) || /\b(renovabl\w*|sol|viento)\b/.test(t) && has(t, cost)),
    direct: [], context: ['household_electricity_price'],
    needs: ['precio mayorista y contrato de suministro', 'hora o periodo comparable', 'peajes, cargos e impuestos de la factura'],
    explanation: 'El precio del mercado mayorista y el importe de una factura son medidas diferentes. El contrato, los periodos de consumo y los componentes regulados condicionan cómo se traslada un cambio de precio.',
    explanationEvidence: {
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
  const direct = focus.id === 'working-poverty' && /\b(jornada completa|tiempo completo)\b/.test(text) ? ['in_work_poverty_full_time_rate']
    : focus.id === 'primary-care-waits' && /\b(porcentaje|proporcion|por ciento)\b/.test(text) ? ['primary_care_wait_over_one_day_rate']
      : focus.id === 'primary-care-waits' && /\b(cuantos dias|demora media|tiempo medio)\b/.test(text) ? ['primary_care_wait_days'] : focus.direct;
  const european = /\b(europa|europe[oa]s?|ue|union europea)\b/.test(text);
  // An all-worker unemployment rate does not describe the availability of
  // vacancies with a particular contract, wage, schedule or employer.
  const specificJobConditions = focus.id === 'job-opportunities'
    && /\b(?:temporal\w*|indefinid\w*|precar\w*|dign\w*|salari\w*|sueld\w*|paga\w*|pagad\w*|jornada\w*|public\w*|funcionari\w*)\b/.test(text);
  return new Set([...direct, ...(specificJobConditions ? [] : focus.context)].map((id) => european && known.has(`${id}_europe`) ? `${id}_europe` : id).filter((id) => known.has(id)));
};
