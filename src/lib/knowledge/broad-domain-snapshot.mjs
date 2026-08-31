// Small, reviewed context packets for broad claims. These are deliberately
// keyed by concepts and evidence dimensions, never by a particular slogan.
// They provide useful context when a claim is too broad for a single verdict
// or when the optional local classifier is unavailable.
import { snapshotLifecycle } from './snapshot-lifecycle.mjs';

const source = (id, title, publisher, url, publishedAt) => ({ id, title, publisher, url, publishedAt, retrievedAt: '2026-08-20', role: 'primary' });

const packets = [
  {
    id: 'broad-emergency-election-powers',
    matches: /\b(estado de (alarma|emergencia|excepci[oó]n)|emergencia perpetua|no convocar elecciones|no celebrar elecciones|perpetuarse? en el poder|dictadura|dictaduras?)\b/i,
    interpretation: { kind: 'legal', subject: 'poderes excepcionales y elecciones en España', subjectType: 'institution', predicate: 'could_affect', object: 'duración del mandato y controles constitucionales', normalizedClaim: 'límites legales de los estados excepcionales y continuidad electoral', interpretation: 'La frase mezcla un temor predictivo, una cuestión jurídica sobre poderes excepcionales y una analogía histórica. Hay que comprobar cada parte por separado.' },
    headline: 'Un estado excepcional no equivale por sí solo a suspender las elecciones',
    summary: 'La preocupación debe comprobarse en tres planos: qué estado excepcional se ha declarado, qué límites y controles establece la Constitución y la ley, y qué norma concreta afectaría al calendario electoral. Un estado de alarma o emergencia no demuestra por sí solo una intención de perpetuarse en el poder; la comparación con una dictadura tampoco prueba que el mismo desenlace vaya a ocurrir.',
    criteria: [
      { id: 'exceptional-state', label: 'Regla jurídica', finding: 'Hay que identificar la declaración concreta, su duración, sus medidas y las prórrogas autorizadas; no basta con invocar “emergencia” de forma genérica.', sourceIds: ['constitutional-emergency-powers'] },
      { id: 'election-continuity', label: 'Elecciones', finding: 'Para afirmar que no se convocarían elecciones hace falta una norma, resolución o calendario oficial que produzca ese efecto; el temor o una crisis territorial no lo demuestra.', sourceIds: ['constitutional-emergency-powers'] },
      { id: 'dictatorship-analogy', label: 'Analogía histórica', finding: 'Que algunas dictaduras comenzaran con medidas excepcionales es un contexto histórico, no una prueba de que una democracia actual siga necesariamente ese mismo camino.', sourceIds: ['constitutional-emergency-powers'] },
    ],
    limitations: ['No se puede confirmar una predicción sobre una “emergencia perpetua” sin una decisión concreta, fechas y norma aplicable. Para evaluar un riesgo real hay que revisar la declaración oficial, sus prórrogas, el control parlamentario y judicial y el calendario electoral.'],
    sources: [source('constitutional-emergency-powers', 'Constitución Española · artículo 116', 'Boletín Oficial del Estado', 'https://www.boe.es/buscar/act.php?id=BOE-A-1978-31229', '1978-12-29')],
  },
  {
    id: 'broad-demography-pension-finance',
    matches: /\b(arbol demografico|estructura demografica|demograf[ií]a|envejecimiento|poblaci[oó]n)\b[\s\S]{0,180}\b(pension|jubilaci[oó]n|cotizaci[oó]n|arcas p[uú]blicas|sostenib|arruin|d[eé]ficit)\w*\b|\b(pension|jubilaci[oó]n|cotizaci[oó]n|arcas p[uú]blicas|sostenib|arruin|d[eé]ficit)\w*[\s\S]{0,180}\b(arbol demografico|estructura demografica|demograf[ií]a|envejecimiento|poblaci[oó]n)\b/i,
    interpretation: { kind: 'mixed', subject: 'demografía y sistema de pensiones', subjectType: 'country', predicate: 'puts_pressure_on', object: 'financiación pública', normalizedClaim: 'cambio demográfico, sostenibilidad de las pensiones y efecto sobre las cuentas públicas', interpretation: 'La frase combina una descripción demográfica, una predicción sobre sostenibilidad y una acusación sobre las cuentas públicas. Cada parte requiere una medida distinta.' },
    headline: 'El envejecimiento presiona las pensiones, pero no demuestra por sí solo una quiebra pública',
    summary: 'La estructura demográfica puede aumentar la presión sobre las pensiones al cambiar la relación entre cotizantes y pensionistas. Eso no basta para afirmar que el sistema sea “completamente insostenible” ni que ya esté arruinando las arcas públicas: hay que separar dependencia demográfica, ingresos por cotizaciones, gasto en pensiones, transferencias, déficit y deuda, con sus periodos y definiciones, antes de emitir ese veredicto.',
    criteria: [
      { id: 'demographic-structure', label: 'Demografía', finding: 'Hay que medir la relación entre población en edad de trabajar, cotizantes y pensionistas; “árbol demográfico invertido” es una descripción retórica, no un indicador estadístico único.', metricIds: ['old_age_dependency_ratio'], sourceIds: ['demography-pension-finance'] },
      { id: 'pension-balance', label: 'Pensiones', finding: 'La sostenibilidad requiere comparar ingresos contributivos, gasto, transferencias y compromisos futuros; el gasto actual aislado no decide el resultado.', metricIds: ['old_age_survivors_benefits_per_capita'], sourceIds: ['demography-pension-finance'] },
      { id: 'public-finance-effect', label: 'Arcas públicas', finding: 'Para afirmar que las pensiones ya arruinan las cuentas públicas hay que observar saldo presupuestario, deuda, financiación del sistema y evolución temporal, no solo la existencia de déficit.', metricIds: ['government_deficit_ratio', 'government_debt_ratio'], sourceIds: ['public-finance-pension'] },
    ],
    limitations: ['Sin un año, una serie de dependencia, un balance de ingresos y gastos y una definición de “insostenible”, no se puede cuantificar el problema ni confirmar que las arcas públicas estén siendo arruinadas. La presión demográfica y la quiebra inmediata son afirmaciones diferentes.'],
    sources: [
      source('demography-pension-finance', 'Población y estructura demográfica', 'Eurostat', 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Population_structure_and_ageing', '2025-10-01'),
      source('public-finance-pension', 'Social protection statistics · pensions', 'Eurostat', 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Social_protection_statistics', '2025-10-01'),
    ],
  },
  {
    id: 'broad-public-administration',
    matches: /\b(administraci[oó]n p[uú]blica|empleo p[uú]blico|empleados? p[uú]blicos?|funcionari|oposici[oó]n|plazas? fijas?|servicios? p[uú]blicos?)\b/i,
    interpretation: { kind: 'mixed', subject: 'administración y empleo público', subjectType: 'institution', predicate: 'has_multiple_measures', normalizedClaim: 'plantilla, desempeño y calidad de los servicios públicos', interpretation: 'La frase mezcla una valoración de la administración con acusaciones sobre puestos y conducta individual; son cuestiones distintas y medibles de forma diferente.' },
    headline: 'La administración pública requiere medir plantilla, desempeño y calidad del servicio',
    summary: 'No existe una cifra oficial de puestos “prescindibles” ni una estadística que permita clasificar como vagos a los empleados públicos en general. La oposición establece una relación de empleo regulada, pero no elimina las obligaciones de rendimiento ni demuestra por sí sola falta de actividad. Para evaluar la administración hay que separar plantilla, vacantes, absentismo, carga de trabajo, tiempos de atención, productividad, digitalización y resultados por servicio y territorio.',
    criteria: [
      { id: 'public-employment-definition', label: 'Qué se mide', finding: 'El número de empleados públicos y el gasto describen recursos, pero no indican cuántos puestos son sustituibles ni si una persona concreta trabaja o no. No hay una clasificación oficial general de puestos “prescindibles”.', sourceIds: ['public-administration-source'] },
      { id: 'public-service-performance', label: 'Desempeño', finding: 'Para evaluar la administración hacen falta tiempos de tramitación, cargas de trabajo, vacantes, absentismo, productividad y resultados del servicio, con una comparación compatible.', sourceIds: ['public-administration-source'] },
      { id: 'individual-conduct', label: 'Conducta individual', finding: 'Una oposición otorga una relación de empleo regulada; no demuestra por sí sola rendimiento, absentismo o derecho a permanecer sin cumplir sus obligaciones.', sourceIds: ['public-administration-source'] },
    ],
    limitations: ['La frase no aporta un servicio, puesto, territorio, periodo ni indicador. Sin esos datos no se puede estimar cuántos empleos son prescindibles. Una acusación individual exigiría además expedientes de desempeño o absentismo; no puede atribuirse vagancia a un colectivo entero.'],
    sources: [source('public-administration-source', 'Government finance statistics', 'Eurostat', 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Government_finance_statistics', '2025-10-01')],
  },
  {
    id: 'broad-immigration-regularization',
    matches: /\b(legalizaci[oó]n|regularizaci[oó]n|regularizar|regularizad[ao]s?|residencia legal)\b/i,
    interpretation: { kind: 'legal', subject: 'personas migrantes en España', subjectType: 'group', predicate: 'is_covered_by', object: 'un proceso de regularización o legalización', normalizedClaim: 'existencia, alcance y resultado de una medida de regularización migratoria', interpretation: '“Legalización masiva” es una etiqueta imprecisa: hay que identificar la norma o programa y distinguir solicitudes, expedientes tramitados y autorizaciones concedidas.' },
    headline: 'Regularización y legalización no son una sola cifra',
    summary: 'Para comprobar una supuesta legalización masiva hay que identificar la norma o programa, su fecha y sus requisitos. Una regularización puede admitir solicitudes extraordinarias para personas que ya residen en España, pero las solicitudes, los expedientes tramitados y las autorizaciones concedidas son cifras distintas.',
    criteria: [
      { id: 'regularization-measure', label: 'Medida concreta', finding: 'El término “legalización masiva” no identifica por sí solo una ley, decreto o programa; hace falta localizar la norma y comprobar su alcance, requisitos y exclusiones.', sourceIds: ['regularizacion-extraordinaria-solicitudes-julio-2026'] },
      { id: 'regularization-counts', label: 'Cifras del proceso', finding: 'El balance oficial localizado registra 1.174.978 solicitudes y 609.737 expedientes tramitados; ninguna de esas cifras equivale automáticamente a autorizaciones concedidas.', sourceIds: ['regularizacion-extraordinaria-solicitudes-julio-2026'] },
      { id: 'legal-status', label: 'Resultado jurídico', finding: 'Para saber cuántas personas obtuvieron autorización hay que consultar resoluciones concedidas, denegadas y pendientes, además del tipo y duración del permiso.', sourceIds: ['regularizacion-requisitos-antecedentes-2026'] },
    ],
    limitations: ['Sin una norma, fecha o cifra concreta no se puede afirmar que haya una “legalización masiva” ni cuantificar cuántas personas obtuvieron un permiso. La palabra puede mezclar una propuesta, un proceso de regularización y sus resultados.'],
    sources: [
      source('regularizacion-extraordinaria-solicitudes-julio-2026', 'Balance del proceso de regularización extraordinaria · solicitudes recibidas', 'La Moncloa', 'https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/inclusion/paginas/2026/020726-balance-regularizacion-extraordinaria.aspx', '2026-07-02'),
      source('regularizacion-requisitos-antecedentes-2026', 'Preguntas y requisitos de la regularización extraordinaria 2026', 'Administración General del Estado', 'https://www.inclusion.gob.es/web/migraciones/regularizacion-extraordinaria', '2026-07-01'),
    ],
  },
  ...[
    ['health', /\b(sanidad|hospital|m[eé]dic|lista de espera|salud p[uú]blica|cita|psic[oó]log|odontolog|tratamiento)\w*\b/i, 'La sanidad se mide con acceso, resultados, recursos y gasto', 'La salud pública no se puede resumir en una experiencia o una cifra. Hay que separar listas de espera, personal, camas, gasto, resultados y diferencias territoriales.', 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Healthcare_expenditure_statistics', 'Eurostat'],
    ['education', /\b(educaci[oó]n|escuela|colegio|universidad|abandono escolar|formaci[oó]n|m[aá]ster|t[ií]tulo|fp|academia|clases particulares|estudiante)\w*\b/i, 'La educación requiere separar recursos, acceso y resultados', 'El gasto o el número de docentes no demuestra por sí solo la calidad educativa. Hay que comparar resultados, composición del alumnado, recursos y territorio.', 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Education_and_training_statistics', 'Eurostat'],
    ['pensions', /\b(pension|jubilaci[oó]n|jubilados|vejez|cotizaci[oó]n|envejec)\w*\b/i, 'Las pensiones requieren separar gasto, ingresos y demografía', 'La sostenibilidad no se decide mirando solo el gasto actual. Hay que combinar afiliación, cotizaciones, pensiones, saldo presupuestario, empleo, productividad y envejecimiento.', 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Social_protection_statistics', 'Eurostat'],
    ['taxes', /\b(impuesto|impuestos|iva|irpf|fiscal|tribut|recaudaci[oó]n|administraci[oó]n|tr[aá]mite|licencia|asesor|subvenci[oó]n|gasto p[uú]blico|aut[oó]nom)\w*\b/i, 'La carga fiscal requiere separar tipos, bases y efectos', 'La presión fiscal, el tipo legal y lo que paga cada hogar son medidas distintas. Para evaluar una subida hay que fijar impuesto, base, periodo, renta y transferencia recibida.', 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Tax_revenue_statistics', 'Eurostat'],
    ['energy', /\b(energ[ií]a|electricidad|luz|gasolina|combustible|renovable)\w*\b/i, 'La energía requiere separar precio, consumo y dependencia', 'El precio que paga un hogar, el coste mayorista, los impuestos, el consumo y la dependencia exterior no son la misma magnitud.', 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Energy_statistics_-_prices', 'Eurostat'],
    ['transport', /\b(tren|trenes|transporte|carretera|avi[oó]n|cercan[ií]as|infraestructura)\w*\b/i, 'El transporte requiere separar incidencias, inversión y servicio', 'Una avería o retraso concreto no demuestra por sí solo el estado de toda la red. Hay que fijar línea, periodo, frecuencia, puntualidad, inversión y comparación.', 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Passenger_transport_statistics', 'Eurostat'],
    ['tourism', /\b(turismo|turista|turistas|hotel|masificaci[oó]n|temporada|crucero|visitante|hosteler[ií]a)\w*\b/i, 'El turismo requiere separar volumen, empleo, vivienda e impacto territorial', 'Más visitantes no equivalen automáticamente a más bienestar. Hay que separar pernoctaciones, empleo, ingresos, presión residencial, estacionalidad y territorio.', 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Tourism_statistics', 'Eurostat'],
    ['agriculture', /\b(agricultura|agricultor|campo|ganader[ií]a|cultivo|regad[ií]o|cosecha)\w*\b/i, 'El campo requiere separar producción, renta, costes y territorio', 'La producción agraria, la renta de los agricultores, los costes de insumos y el empleo rural pueden moverse de forma distinta.', 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Agriculture,_forestry_and_fishery_statistics', 'Eurostat'],
    ['economy', /\b(econom[ií]a|productividad|crecimiento|pib|recesi[oó]n|empresa|empresas)\w*\b/i, 'La economía requiere separar crecimiento, productividad, empleo y bienestar', 'El PIB no resume por sí solo el bienestar. Hay que distinguir producción, productividad, renta, empleo, precios, deuda y distribución.', 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=National_accounts_and_GDP', 'Eurostat'],
  ].map(([id, matches, headline, summary, url, publisher]) => ({
    id: `broad-${id}`, matches,
    interpretation: { kind: 'mixed', subject: id, subjectType: 'country', predicate: 'has_multiple_measures', normalizedClaim: headline, interpretation: summary },
    headline, summary,
    criteria: [
      { id: `${id}-definition`, label: 'Definición', finding: 'La afirmación debe concretar qué indicador, población, unidad y periodo quiere medir.', sourceIds: [`${id}-source`] },
      { id: `${id}-comparison`, label: 'Comparación', finding: 'Los datos deben compararse con una referencia compatible: otro periodo, territorio o población equivalente.', sourceIds: [`${id}-source`] },
      { id: `${id}-causality`, label: 'Causalidad', finding: 'Una coincidencia temporal o una diferencia descriptiva no demuestra por sí sola qué política o grupo causó el resultado.', sourceIds: [`${id}-source`] },
    ],
    limitations: ['Para un veredicto concreto hacen falta indicador, periodo, territorio y población; el contexto general no demuestra una acusación causal o una valoración total.'],
    sources: [source(`${id}-source`, headline, publisher, url, '2025-10-01')],
  })),
  {
    id: 'broad-housing',
    matches: /\b(viviend|alquil|hipotec|piso|okup|inquilin|propietari|rent|gentrific)\w*\b/i,
    interpretation: { kind: 'mixed', subject: 'acceso y mercado de la vivienda en España', subjectType: 'country', predicate: 'has_multiple_measures', normalizedClaim: 'precios, alquileres, oferta y acceso a la vivienda', interpretation: 'Las frases sobre vivienda suelen mezclar precios, oferta, ingresos, regulación y experiencias de acceso; son dimensiones distintas.' },
    headline: 'La vivienda requiere separar precio, oferta, ingresos y acceso',
    summary: 'Una afirmación sobre alquiler o vivienda no se puede resolver con un único indicador. Hay que comprobar por separado precios, esfuerzo sobre la renta, oferta disponible, vivienda vacía, construcción, regulación y diferencias territoriales.',
    criteria: [
      { id: 'housing-prices', label: 'Precios', finding: 'Los índices de precios de vivienda y alquiler permiten medir la evolución, pero no dicen por sí solos si una persona concreta puede acceder.', sourceIds: ['housing-eurostat'] },
      { id: 'housing-affordability', label: 'Esfuerzo', finding: 'La proporción de renta dedicada a vivienda y el sobreesfuerzo permiten aproximar el acceso; deben compararse con ingresos, tamaño del hogar y territorio.', sourceIds: ['housing-eurostat'] },
      { id: 'housing-supply', label: 'Oferta y regulación', finding: 'La oferta residencial, la construcción y el régimen del contrato pueden influir conjuntamente; una correlación temporal no identifica por sí sola el efecto de una política.', sourceIds: ['housing-eurostat'] },
    ],
    limitations: ['No existe una cifra nacional que demuestre por sí sola que una causa concreta —topes, turismo, okupación o propietarios— explique todo el mercado. Para un veredicto hacen falta ciudad, periodo, población y mecanismo definidos.'],
    sources: [
      source('housing-eurostat', 'Housing in Europe — statistics on housing conditions', 'Eurostat', 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Housing_in_Europe', '2025-10-01'),
    ],
  },
  {
    id: 'broad-immigration-security',
    matches: /\b(inmigr|migrant|extranj|migrator)\w*\b[\s\w]{0,36}\b(delincuenc|criminal|delito|seguridad|insegur)\w*\b|\b(delincuenc|criminal|delito|seguridad|insegur)\w*[\s\w]{0,36}\b(inmigr|migrant|extranj|migrator)\w*\b/i,
    interpretation: { kind: 'causal', subject: 'personas inmigrantes o extranjeras', subjectType: 'group', predicate: 'allegedly_causes', object: 'delincuencia o inseguridad', normalizedClaim: 'relación entre inmigración y delincuencia en España', interpretation: 'La frase atribuye una relación causal o asociativa a un grupo; hay que separar diferencia descriptiva de causalidad.', confidence: 0.75, evidenceNeeds: ['métrica', 'población', 'denominador', 'periodo', 'causalidad'] },
    headline: 'Una diferencia de condenas no demuestra una causa colectiva',
    summary: 'Las estadísticas permiten describir diferencias por nacionalidad, pero no convierten la nacionalidad en causa de la delincuencia. Hay que separar nacionalidad, origen, edad, sexo, renta, barrio, exposición policial y etapa judicial.',
    criteria: [
      { id: 'convicted-nationality', label: 'Condenas', finding: 'En 2024, el 71,4% de los adultos condenados tenía nacionalidad española.', sourceIds: ['immigration-crime'] },
      { id: 'convicted-rate', label: 'Tasas brutas', finding: 'La tasa publicada fue de 15,7 condenados por mil entre extranjeros y 6,2 entre españoles.', sourceIds: ['immigration-crime'] },
      { id: 'causal-limit', label: 'Límite causal', finding: 'Esas tasas no ajustan edad, sexo, ingresos o barrio; además, condenas no equivalen directamente a delitos cometidos.', sourceIds: ['immigration-crime'] },
    ],
    limitations: ['La diferencia descriptiva puede ser real y merece análisis, pero no sostiene una acusación colectiva ni identifica por sí sola el mecanismo causal.'],
    sources: [
      source('immigration-crime', 'Estadística de condenados 2024', 'INE', 'https://www.ine.es/dyngs/Prensa/ECAECM2024.htm', '2025-09-01'),
    ],
  },
  {
    id: 'broad-employment',
    matches: /\b(paro\w*|desemple\w*|empleo\w*|trabaj\w*|ocupad\w*|salari\w*|temporal\w*|precar\w*|sueldo\w*|experiencia\w*|emprend\w*|productividad|datos del paro|mercado laboral)\b/i,
    interpretation: { kind: 'quantitative', subject: 'mercado laboral español', subjectType: 'country', predicate: 'has_multiple_measures', normalizedClaim: 'situación del empleo y el desempleo en España', interpretation: 'La frase puede referirse a empleo, desempleo, registro administrativo o calidad del trabajo.', confidence: 0.76, evidenceNeeds: ['métrica', 'población', 'periodo', 'definición'] },
    headline: 'El paro y el empleo se pueden medir, pero no son una sola cifra',
    summary: 'España combina ocupación récord con una tasa de paro todavía elevada. La EPA y el paro registrado no cuentan exactamente lo mismo, así que una diferencia entre cifras no demuestra por sí sola que alguien esté mintiendo.',
    criteria: [
      { id: 'employment-rate', label: 'Ocupación', finding: 'La ocupación alcanzó 22,293 millones en el primer trimestre de 2026, 527.600 más que un año antes.', sourceIds: ['employment-epa'] },
      { id: 'unemployment-rate', label: 'Paro', finding: 'La tasa de paro fue del 10,83% y afectó a 2,709 millones de personas en el primer trimestre de 2026.', sourceIds: ['employment-epa'] },
      { id: 'definitions', label: 'Definiciones', finding: 'La EPA encuesta hogares; el paro registrado cuenta inscripciones administrativas. Una persona puede aparecer de forma distinta en ambas medidas.', sourceIds: ['employment-epa', 'employment-sepe'] },
    ],
    limitations: ['Para comprobar una acusación de manipulación hace falta señalar una cifra, fuente, periodo y método concretos; el contexto agregado no prueba intención.'],
    sources: [
      source('employment-epa', 'Encuesta de Población Activa · T1 2026', 'INE', 'https://www.ine.es/dyngs/Prensa/EPA1T26.htm', '2026-04-28'),
      source('employment-sepe', 'EPA y paro registrado responden preguntas distintas', 'INE / SEPE', 'https://www.ine.es/dyngs/Prensa/EPA1T26.htm', '2026-04-28'),
    ],
  },
  {
    id: 'broad-immigration',
    matches: /\b(inmigr|migrant|extranj|invasion|invaden|patera|asilo|llegad)\w*\b/i,
    interpretation: { kind: 'quantitative', subject: 'inmigración en España', subjectType: 'group', predicate: 'has_distinct_populations_and_flows', normalizedClaim: 'población, flujos y llegadas de inmigración en España', interpretation: 'La afirmación mezcla población residente, flujos anuales y entradas irregulares, que son magnitudes diferentes.', confidence: 0.78, evidenceNeeds: ['población', 'flujo', 'periodo', 'definición'] },
    headline: 'La inmigración no es una sola magnitud: población, flujos y llegadas son distintas',
    summary: 'España tiene una población nacida fuera del país creciente y también entradas irregulares, pero no se pueden sumar ni tratar como equivalentes. El tamaño de la población residente no demuestra una “invasión” y las llegadas irregulares no representan toda la inmigración.',
    criteria: [
      { id: 'foreign-born', label: 'Población residente', finding: 'La población nacida fuera de España superó los 10 millones en 2026; es un stock de residentes, no el número de llegadas de un año.', sourceIds: ['immigration-population'] },
      { id: 'irregular-arrivals', label: 'Llegadas irregulares', finding: 'Interior registró 36.775 llegadas irregulares en 2025, un 42,6% menos que en 2024.', sourceIds: ['immigration-arrivals'] },
      { id: 'foreign-employment', label: 'Empleo', finding: 'La afiliación extranjera desestacionalizada alcanzó 3.135.581 personas en diciembre de 2025.', sourceIds: ['immigration-employment'] },
    ],
    limitations: ['La palabra “invasión” es una valoración amplia. Para evaluar efectos concretos hay que separar vivienda, empleo, servicios, integración y seguridad, con población y territorio definidos.'],
    sources: [
      source('immigration-population', 'Población por país de nacimiento en España', 'Eurostat', 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/migr_pop3ctb?geo=ES&age=TOTAL&sex=T&sinceTimePeriod=2015', '2026-08-17'),
      source('immigration-arrivals', 'Balance de inmigración irregular · cierre 2025', 'Ministerio del Interior', 'https://www.interior.gob.es/opencms/es/prensa/balances-e-informes/', '2026-01-01'),
      source('immigration-employment', 'Afiliación extranjera · cierre 2025', 'Seguridad Social', 'https://revista.seg-social.es/-/la-seguridad-social-suma-m%C3%A1s-de-800.000-afiliados-extranjeros-desde-la-reforma-laboral-y-cierra-2025-en-m%C3%A1ximos-historicos', '2026-01-01'),
    ],
  },
  {
    id: 'broad-security',
    matches: /\b(delincuenc|criminal|delito|seguridad|insegur|calle|salir|polic[ií]a|droga|judicial|disuasor|denuncia)\w*\b/i,
    interpretation: { kind: 'quantitative', subject: 'seguridad en España', subjectType: 'country', predicate: 'has_distinct_offence_and_perception_measures', normalizedClaim: 'delincuencia, seguridad y experiencia del espacio público en España', interpretation: 'La delincuencia nacional, los delitos concretos y la sensación de inseguridad no son la misma medida.', confidence: 0.72, evidenceNeeds: ['categoría de delito', 'periodo', 'territorio', 'medida'] },
    headline: 'La seguridad no se puede resumir en una sola cifra de delincuencia',
    summary: 'Los datos nacionales no describen automáticamente lo que ocurre en una calle concreta. En 2025 la delincuencia convencional bajó ligeramente mientras la ciberdelincuencia creció; ambos fenómenos pueden coexistir con problemas locales y con una percepción real de inseguridad.',
    criteria: [
      { id: 'total-offences', label: 'Total y composición', finding: 'España registró 2,47 millones de infracciones en 2025; la delincuencia convencional bajó un 0,2% y la cibercriminalidad subió un 5,3%.', sourceIds: ['security-balance'] },
      { id: 'conventional-rate', label: 'Delincuencia convencional', finding: 'La tasa convencional quedó en 40,4 por mil, dentro de la banda baja histórica.', sourceIds: ['security-balance'] },
      { id: 'scope', label: 'Alcance', finding: 'Una tendencia nacional puede convivir con deterioro en un barrio, estación o zona turística; hace falta una categoría y un territorio concretos.', sourceIds: ['security-balance'] },
    ],
    limitations: ['“No se puede salir a la calle” expresa una experiencia o valoración que las estadísticas nacionales no pueden confirmar literalmente. Para comprobarla hacen falta lugar, periodo, delito o datos de victimización.'],
    sources: [
      source('security-balance', 'Balance de Criminalidad 2025', 'Ministerio del Interior', 'https://www.interior.gob.es/opencms/es/prensa/balances-e-informes/', '2026-01-01'),
    ],
  },
];

const normalise = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n');

export const BROAD_SNAPSHOT_POLICY = Object.freeze({ owner: 'knowledge-review', createdAt: '2026-08-20', expiresAt: '2026-11-20', refreshCommand: 'npm run knowledge:domain-refresh', validationStatus: 'reviewed', supportedScope: 'España, contexto nacional y fuentes citadas en cada packet', unsupportedScope: 'atribución causal, barrios concretos y generalizaciones no medidas' });

export const broadDomainPacketFor = (text) => {
  const value = normalise(text);
  // Broad political judgements are handled by the existing scorecard. Do not
  // let a mention of employment or security hijack that route accidentally.
  if (/\b(sanchez|presidente|gobierno|moncloa|psoe|pp|vox|sumar)\b/.test(value) && /\b(destruy|hunde|arruin|pais|espana|fatal|desastre|ruina)\b/.test(value)) return undefined;
  const direct = packets.find((packet) => packet.matches.test(value));
  if (direct) return direct;
  // Long-form claims often omit the domain noun (for example, “specialist
  // waiting lists” or “rail maintenance”). Route those phrases to the same
  // reviewed context packet instead of leaving them uncovered.
  const supplemental = [
    ['economy', /poblaci[oó]n|hogares|nacimientos|provincias|municipios rurales|fondos europeos|inflaci[oó]n general|deuda de los hogares|tipo impositivo|saldo contributivo/i],
    ['economy', /nacionalidad|pa[ií]s de nacimiento|regularizaci[oó]n|papeles|flujo migratorio|fragmentaci[oó]n regulatoria|operar en varias comunidades|servicios digitales|interoperabilidad|contaminaci[oó]n atmosf[eé]rica|zonas de bajas emisiones|adaptaci[oó]n clim[aá]tica|sequ[ií]a|calidad del aire|episodios locales/i],
    ['taxes', /inundaciones extraordinarias|d[eé]ficit|operaciones extraordinarias/i],
    ['education', /conectividad|habilidades digitales|diferencias educativas/i],
    ['energy', /almacenamiento energ[eé]tico|capacidad de red/i],
    ['transport', /puntualidad ferroviaria|accidentes graves|inversi[oó]n ferroviaria|operadores y gestores|retraso concreto/i],
    ['agriculture', /relevo generacional agrario|pol[ií]tica agraria com[uú]n/i],
    ['taxes', /pequeños comercios|carga regulatoria|contratos públicos|proveedores pequeños|burocracia y costes/i],
    ['health', /lista[s]? de espera|especialistas|terapia|enfermedad|profesionales sanitarios|sobrecarga/i],
    ['education', /rendimiento escolar|notas medias|demanda laboral|talento|burocracia universitaria|credenciales|barrio donde se vive|centros educativos/i],
    ['pensions', /prestaciones contributivas|prestaciones no contributivas|obligaciones futuras|ahorrar de forma privada/i],
    ['economy', /cesta de la compra|ipc general|capacidad de ahorro|gastos? antes|apoyo familiar|coste de vida|datos macroeconom|empeoramiento econom/i],
    ['tourism', /tasas turísticas|mano de obra barata|ciudades receptoras/i],
    ['transport', /mantenimiento ferroviario|renfe|adif|pasajeros|retrasos ferroviarios|vivir sin coche|fibra óptica|servicios/i],
    ['energy', /precio mayorista|contratos de consumidores|apagones|red y la gestión/i],
  ];
  const match = supplemental.find(([, pattern]) => pattern.test(value));
  return match ? packets.find((packet) => packet.id === `broad-${match[0]}`) : undefined;
};

const formatObservation = (observation) => {
  const value = typeof observation.value === 'number' ? new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(observation.value) : String(observation.value || '').trim();
  const unit = observation.displayUnit || observation.unit || '';
  const period = observation.period ? ` (${observation.period})` : '';
  return `${value}${unit ? ` ${unit}` : ''}${period}`;
};

export const answerPlanForBroadDomain = (text, { now = Date.now(), observations = [] } = {}) => {
  const packet = broadDomainPacketFor(text);
  if (!packet) return undefined;
  const lifecycle = snapshotLifecycle(BROAD_SNAPSHOT_POLICY, now);
  if (!lifecycle.usable) return undefined;
  const matchedObservations = packet.criteria.map((criterion) => ({
    criterion,
    observations: observations.filter((observation) => criterion.metricIds?.includes(observation.metricId) && typeof observation.value === 'number' && Number.isFinite(observation.value)),
  }));
  const evidenceIds = [...new Set(packet.criteria.flatMap((item) => item.sourceIds).concat(matchedObservations.flatMap(({ observations: items }) => items.map((item) => item.id).filter(Boolean))))];
  const sourceIds = [...new Set(packet.sources.map((item) => item.id))];
  const quantitativeFindings = matchedObservations.flatMap(({ criterion, observations: items }) => items.slice(0, 2).map((item) => `${criterion.label}: ${formatObservation(item)}`));
  const reviewedQuantitativeFindings = packet.criteria
    .map((item) => item.finding)
    .filter((finding) => /\d/.test(finding));
  quantitativeFindings.push(...reviewedQuantitativeFindings.slice(0, Math.max(0, 2 - quantitativeFindings.length)));
  const evidenceGap = quantitativeFindings.length ? undefined : {
    type: 'evidence_gap',
    missing: packet.criteria.map((item) => `dato concreto sobre ${item.label.toLocaleLowerCase('es')}`),
    needed: ['una fuente primaria con valores, periodo y ámbito definidos', 'una comparación compatible con la afirmación'],
    nextAction: 'Localizar y mostrar los valores o documentos concretos antes de presentar una conclusión sobre la afirmación.',
  };
  const conversationReply = [
    packet.summary,
    quantitativeFindings.length ? `Datos localizados: ${quantitativeFindings.join(' ')}` : undefined,
    evidenceGap ? 'En esta comprobación no se ha localizado un dato concreto que permita cuantificar esas dimensiones.' : undefined,
    packet.limitations[0],
  ].filter(Boolean).join(' ');
  return {
    id: packet.id,
    schemaVersion: '1',
    evidenceLevel: 'limited',
    headline: packet.headline,
    summary: packet.summary,
    coverage: 'qualified',
    claimType: 'mixed',
    interpretation: packet.interpretation,
    blocks: [
      { type: 'data_finding', evidenceIds, points: packet.criteria.map((item, index) => {
        const found = matchedObservations[index]?.observations?.slice(0, 2) || [];
        return `${item.label}: ${item.finding}${found.length ? ` Datos localizados: ${found.map(formatObservation).join('; ')}.` : ''}`;
      }) },
      { type: 'cannot_conclude', evidenceIds, points: packet.limitations },
      ...(evidenceGap ? [evidenceGap] : []),
      { type: 'conversation_reply', evidenceIds, text: conversationReply },
    ],
    limitation: packet.limitations[0],
    evidenceIds,
    sourceIds,
    sourceLinks: packet.sources,
    asOf: '2026-08-20',
    evidenceSummary: {
      mode: 'snapshot',
      families: packet.criteria.map((item, index) => ({ label: item.label, direction: 'qualifies', evidenceIds: [...item.sourceIds, ...(matchedObservations[index]?.observations || []).map((observation) => observation.id).filter(Boolean)], finding: item.finding, ...(matchedObservations[index]?.observations?.length ? { data: matchedObservations[index].observations.slice(0, 2).map(formatObservation) } : {}) })),
      fallbackReason: 'No se encontró una serie dinámica suficientemente compatible; se muestra un paquete revisado y fechado como contexto provisional.',
    },
    snapshotPolicy: BROAD_SNAPSHOT_POLICY,
    knowledgeVersion: 'broad-domain-snapshot-1',
  };
};
