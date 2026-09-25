// Small, reviewed context packets for broad claims. These are deliberately
// keyed by concepts and evidence dimensions, never by a particular slogan.
// They provide useful context when a claim is too broad for a single verdict
// or when the optional local classifier is unavailable.
import { broadObservationFits } from './broad-observation-fit.mjs';
import { supplementReviewedPacket } from './reviewed-family-evidence.mjs';
import { snapshotLifecycle } from './snapshot-lifecycle.mjs';

const source = (id, title, publisher, url, publishedAt) => ({ id, title, publisher, url, publishedAt, retrievedAt: '2026-09-25', role: 'primary' });
const reviewedVisuals = {
  publicEmploymentTrend: { type: 'line', title: 'Personal de las administraciones públicas · corte anual', unit: 'efectivos', labels: Array.from({ length: 25 }, (_, index) => String(2002 + index)), values: [2296193,2322495,2345765,2380005,2428663,2503991,2574524,2628406,2686983,2674305,2676293,2567083,2541237,2534904,2509976,2509980,2552115,2569118,2587672,2701163,2708325,2970563,2978716,3033304,3071725], sourceId: 'public-administration-epsap-history', evidenceIds: ['public-administration-epsap-history'], breakAfter: [20], note: 'Recuento a 1 de enero. La edición de 2023 introduce una ruptura metodológica: no compares el salto entre 2022 y 2023 con la serie anterior.', interpretation: 'La plantilla registrada aumenta dentro de ambos tramos; el cambio metodológico de 2023 impide interpretar el salto 2022–2023 como crecimiento real.' },
  publicEmploymentByAdministration: { type: 'bar', title: 'Empleo público por nivel de administración · enero de 2026', unit: 'efectivos', labels: ['Comunidades autónomas', 'Administración local', 'Sector público estatal'], values: [1930273,594898,546554], sourceId: 'public-administration-epsap-2026', evidenceIds: ['public-administration-epsap-2026'], note: 'Total: 3.071.725 efectivos; la distribución no mide productividad ni puestos sustituibles.' },
  imvTrend: { type: 'line', title: 'Personas beneficiarias del IMV · nómina de agosto', unit: 'personas', labels: ['Agosto 2023','Agosto 2024','Agosto 2025','Agosto 2026'], values: [1467252,1957700,2335553,2725899], sourceId: 'benefits-imv-august-source', evidenceIds: ['benefits-imv-historic-source','benefits-imv-previous-year-source','benefits-imv-august-source'], note: 'Serie de una prestación concreta; no cuenta todas las ayudas ni identifica el efecto de la regularización.', interpretation: 'El IMV creció en los cuatro cortes de agosto, un 16,7 % entre 2025 y 2026; la coincidencia temporal no demuestra qué causó el aumento.' },
  surgeryWaitTrend: { type: 'line', title: 'Espera media para cirugía no urgente · lista del SNS', unit: 'días', labels: ['Dic. 2022','Jun. 2023','Dic. 2023','Jun. 2024','Dic. 2024','Jun. 2025','Dic. 2025'], values: [120,112,128,121,126,119,121], sourceId: 'public-services-waiting-list-source', evidenceIds: ['public-services-waiting-list-source'], note: 'Indicador sanitario nacional de un servicio concreto; no mide todos los servicios públicos ni demuestra una causa migratoria.' },
  surgeryWaitRegions: { type: 'bar', title: 'Espera para cirugía no urgente por territorio · diciembre de 2025', unit: 'días', labels: ['Andalucía','Cataluña','Cantabria','Extremadura','Aragón','Canarias','Baleares','Murcia','Navarra','Ceuta','Castilla-La Mancha','Asturias','Comunidad Valenciana','Castilla y León','Melilla','La Rioja','Galicia','País Vasco','Madrid'], values: [173,142,137,135,132,106,105,103,96,94,92,91,88,87,82,78,73,64,50], sourceId: 'public-services-waiting-list-source', evidenceIds: ['public-services-waiting-list-source'], note: 'Rango de la espera media publicada: Andalucía 173 días y Madrid 50. CCAA y ciudades autónomas; mide lista quirúrgica, no calidad global.' },
  pensionSpending: { type: 'line', title: 'Prestaciones de vejez y supervivencia · gasto nominal', unit: 'millones de euros', labels: ['2015','2016','2017','2018','2019','2020','2021','2022','2023','2024'], values: [130125.04,133951.32,135670.9,144206.74,151536.33,155962.11,162874.93,171818.78,190308.8,205009.77], sourceId: 'pension-expenditure-total-source', evidenceIds: ['pension-expenditure-total-source'], note: 'Eurostat: prestaciones de vejez y supervivencia de todos los esquemas. Euros corrientes, sin descontar inflación; no equivale solo a la pensión contributiva de la Seguridad Social.' },
  pensionRule: { type: 'comparison', title: 'Proyección media del gasto neto en pensiones · regla legal', unit: '% del PIB · media 2022–2050', labels: ['Escenario AIReF','Umbral legal'], values: [13,13.3], sourceId: 'airef-pension-sustainability-study-2026', evidenceIds: ['airef-pension-sustainability-study-2026'], note: 'Escenario modelizado, no un resultado observado ni una garantía de sostenibilidad.' },
  youthUnemployment: { type: 'line', title: 'Tasa de paro juvenil · España, 15–24 años', unit: '% de la población activa', labels: ['2015','2016','2017','2018','2019','2020','2021','2022','2023','2024','2025'], values: [48.3,44.4,38.6,34.3,32.5,38.3,35,29.7,28.7,26.5,24.9], sourceId: 'youth-labour-eurostat', evidenceIds: ['youth-labour-eurostat'], note: 'El paro juvenil bajó desde 2015, aunque sigue siendo elevado. No es una medida de salarios ni de acceso a vivienda.' },
  youthHousingPrices: { type: 'line', title: 'Índice de precios de vivienda · cuarto trimestre', unit: 'índice (2015 = 100)', labels: ['2015','2016','2017','2018','2019','2020','2021','2022','2023','2024','2025'], values: [101.31,105.78,113.39,120.97,125.44,127.55,135.58,142.99,149.13,166.07,187.45], sourceId: 'youth-housing-eurostat', evidenceIds: ['youth-housing-eurostat'], note: 'Índice general de precios de vivienda, no un precio juvenil ni un índice de alquiler.' },
  youthRegionalRent: { type: 'bar', title: 'Alquiler de vivienda completa como parte del salario neto · CCAA', unit: '% del salario · 16–29 años', labels: ['Canarias','Illes Balears','Cataluña','Comunidad de Madrid','Andalucía','Comunitat Valenciana','País Vasco','Ceuta y Melilla','Galicia','Cantabria','Aragón','La Rioja','Navarra','Asturias','Castilla y León','Castilla-La Mancha','Extremadura'], values: [126,125,117,113,99,96,88,80,76,76,72,71,68,67,62,62,60], sourceId: 'cje-emancipation-2025', evidenceIds: ['cje-emancipation-2025'], note: 'Lectura aproximada del gráfico autonómico del CJE 2025, redondeada al punto porcentual; no se publicó una tabla con estos valores. Incluso las regiones con menor esfuerzo superan holgadamente el 30 % recomendado.' },
  youthWageRent: { type: 'bar', title: 'Variación acumulada desde 2008 · salario joven y alquiler', unit: '%', labels: ['Salario joven','Alquiler'], values: [10.8,54], sourceId: 'cje-emancipation-2024', evidenceIds: ['cje-emancipation-2024'], note: 'Comparación nominal citada por el CJE en 2024; periodo y población distintos de la tasa de paro juvenil.' },
  securityRecent: { type: 'bar', title: 'Variación de delitos registrados · enero–junio de 2026 vs. 2025', unit: '%', labels: ['Total registrado','Delitos contra libertad sexual','Hurtos','Robos con violencia'], values: [0.5,4,-3.8,-0.8], sourceId: 'security-balance', evidenceIds: ['security-balance'], note: 'Variación nacional interanual; no identifica autores ni equivale a percepción de inseguridad.' },
  securityAdjustedTrend: { type: 'bar', title: 'Cambio de tasas estandarizadas por edad y sexo · 2007–2023', unit: 'variación acumulada', labels: ['Nacionalidad española','Nacionalidad extranjera'], values: [120,70], sourceId: 'security-standardised-crime-reis', evidenceIds: ['security-standardised-crime-reis'], note: 'Estudio de condenas adultas estandarizadas; la reforma penal de 2015 explica parte del aumento observado.' },
  securityAdjustedGap: { type: 'comparison', title: 'Brecha en tasas de delitos con condena · antes y después del ajuste', unit: 'delitos por 100.000 adultos · 2007–2023', labels: ['Tasa bruta: diferencia entre grupos','Tras ajuste por edad y sexo'], values: [1197,619], sourceId: 'security-standardised-crime-reis', evidenceIds: ['security-standardised-crime-reis'], note: 'El ajuste reduce la brecha un 48,3 %, pero no la elimina; quedan factores como renta, barrio, origen y exposición institucional.' },
  immigrationStock: { type: 'line', title: 'Residentes nacidos fuera de España', unit: 'personas', labels: ['2015','2016','2017','2018','2019','2020','2021','2022','2023','2024','2025'], values: [5883891,5913165,6014708,6207509,6549309,7014753,7254797,7468144,8204206,8838234,9464210], sourceId: 'replacement-population-source', evidenceIds: ['replacement-population-source'], note: 'Eurostat mide población residente por lugar de nacimiento: es un stock, no llegadas del año, ciudadanía ni sustitución deliberada.' },
  immigrationOrigins: { type: 'bar', title: 'Principales países de nacimiento de residentes en España · 2025', unit: 'personas', labels: ['Marruecos','Colombia','Venezuela','Rumanía','Ecuador','Argentina','Perú'], values: [1165955,978041,692316,521181,468751,450883,430277], sourceId: 'replacement-population-source', evidenceIds: ['replacement-population-source'], note: 'País de nacimiento, no nacionalidad actual ni motivo migratorio.' },
  immigrationPermitReasons: { type: 'bar', title: 'Primeros permisos a ciudadanos no UE · España, 2024', unit: '% de permisos', labels: ['Familia','Estudios','Trabajo','Otros motivos'], values: [46,20.8,17,16.1], sourceId: 'immigration-permit-reasons-eurostat', evidenceIds: ['immigration-permit-reasons-eurostat'], note: 'Porcentajes redondeados, calculados sobre 561.640 primeros permisos. Solo cubre primeros permisos de residencia a no comunitarios; no representa todos los movimientos migratorios.' },
  pisaShare: { type: 'line', title: 'Alumnado con origen inmigrante · España', unit: '% del alumnado de 15 años', labels: ['2012','2022'], values: [10,15], sourceId: 'replacement-pisa-oecd', evidenceIds: ['replacement-pisa-oecd'], note: 'PISA mide alumnado de 15 años y competencias escolares, no IQ ni inteligencia innata.' },
  pisaMathGap: { type: 'comparison', title: 'Brecha matemática PISA 2022 por origen migrante', unit: 'puntos PISA', labels: ['Sin ajustar','Tras ajustar por nivel socioeconómico'], values: [33,7], sourceId: 'replacement-pisa-oecd', evidenceIds: ['replacement-pisa-oecd'], note: 'La OCDE indica que la brecha neta se redujo entre 2012 y 2022. PISA no permite inferir capacidad adulta ni manipulabilidad.' },
  taxWedgeTrend: { type: 'line', title: 'Cuña fiscal del trabajo · persona soltera con salario medio, sin hijos', unit: '% del coste laboral', labels: Array.from({ length: 26 }, (_, index) => String(2000 + index)), values: [38.6,38.9,39.1,38.6,38.8,39,39.1,39,38,38.3,39.7,40,40.6,40.7,40.7,39.4,39.4,39.6,39.7,39.8,39.3,39.9,40,40.8,41.1,41.4], sourceId: 'tax-wedge-oecd-2026', evidenceIds: ['tax-wedge-oecd-2026'], note: 'Incluye IRPF y cotizaciones sociales de trabajador y empresa; no incluye IVA ni representa la carga fiscal de cada hogar.' },
  farmIncomePerWorkUnit: { type: 'line', title: 'Renta agraria real por unidad de trabajo · España', unit: 'índice · 2019 = 100', labels: ['2019','2020','2021','2022','2023','2024','2025'], values: [100,97.7,97.4,95.5,110.3,114.4,119.1], sourceId: 'farm-income-mapa-2025', evidenceIds: ['farm-income-mapa-2025'], note: 'Serie nacional de renta real por UTA rebased a 2019=100 a partir de la segunda estimación MAPA; 2025 es provisional. No separa explotaciones, cultivos ni causas regulatorias.' },
};

const packets = [
  {
    id: 'broad-emergency-election-powers',
    matches: /\b(estado de (alarma|emergencia|excepci[oó]n)|emergencia perpetua|no convocar elecciones|no celebrar elecciones|perpetuarse? en el poder|dictadura|dictaduras?)\b/i,
    interpretation: { kind: 'legal', subject: 'poderes excepcionales y elecciones en España', subjectType: 'institution', predicate: 'could_affect', object: 'duración del mandato y controles constitucionales', normalizedClaim: 'límites legales de los estados excepcionales y continuidad electoral', interpretation: 'La frase mezcla un temor predictivo, una cuestión jurídica sobre poderes excepcionales y una analogía histórica. Hay que comprobar cada parte por separado.' },
    headline: 'Un estado excepcional no equivale por sí solo a suspender las elecciones',
    summary: 'La preocupación debe comprobarse en tres planos: qué estado excepcional se ha declarado, qué límites y controles establece la Constitución y la ley, y qué norma concreta afectaría al calendario electoral. Un estado de alarma o emergencia no demuestra por sí solo una intención de perpetuarse en el poder; la comparación con una dictadura tampoco prueba que el mismo desenlace vaya a ocurrir.',
    criteria: [
      { id: 'exceptional-state', label: 'Regla jurídica', finding: 'Hay que identificar la declaración concreta, su duración, sus medidas y las prórrogas autorizadas; no basta con invocar “emergencia” de forma genérica.', fallbackData: ['Estado de alarma: máximo inicial de 15 días; una prórroga requiere autorización del Congreso (art. 116.2 de la Constitución).', 'Estado de excepción: máximo de 30 días, prorrogable por otro periodo igual con autorización del Congreso (art. 116.3).'], sourceIds: ['constitutional-emergency-powers'] },
      { id: 'election-continuity', label: 'Elecciones', finding: 'Para afirmar que no se convocarían elecciones hace falta una norma, resolución o calendario oficial que produzca ese efecto; el temor o una crisis territorial no lo demuestra.', fallbackData: ['Durante los estados excepcionales no se interrumpe el funcionamiento de los poderes constitucionales y el Congreso no puede disolverse (art. 116.5 de la Constitución).'], sourceIds: ['constitutional-emergency-powers'] },
      { id: 'dictatorship-analogy', label: 'Analogía histórica', finding: 'Que algunas dictaduras comenzaran con medidas excepcionales es un contexto histórico, no una prueba de que una democracia actual siga necesariamente ese mismo camino.', sourceIds: ['constitutional-emergency-powers'] },
    ],
    limitations: ['No se puede confirmar una predicción sobre una “emergencia perpetua” sin una decisión concreta, fechas y norma aplicable. Para evaluar un riesgo real hay que revisar la declaración oficial, sus prórrogas, el control parlamentario y judicial y el calendario electoral.'],
    sources: [source('constitutional-emergency-powers', 'Constitución Española · artículo 116', 'Boletín Oficial del Estado', 'https://www.boe.es/buscar/act.php?id=BOE-A-1978-31229', '1978-12-29')],
  },
  {
    id: 'broad-demography-pension-finance',
    visuals: [reviewedVisuals.pensionSpending, reviewedVisuals.pensionRule],
    matches: /\b(arbol demografico|estructura demografica|demograf[ií]a|envejecimiento|poblaci[oó]n)\b[\s\S]{0,180}\b(pension|jubilaci[oó]n|cotizaci[oó]n|arcas p[uú]blicas|sostenib|arruin|d[eé]ficit)\w*\b|\b(pension|jubilaci[oó]n|cotizaci[oó]n|arcas p[uú]blicas|sostenib|arruin|d[eé]ficit)\w*[\s\S]{0,180}\b(arbol demografico|estructura demografica|demograf[ií]a|envejecimiento|poblaci[oó]n)\b/i,
    interpretation: { kind: 'mixed', subject: 'demografía y sistema de pensiones', subjectType: 'country', predicate: 'puts_pressure_on', object: 'financiación pública', normalizedClaim: 'cambio demográfico, sostenibilidad de las pensiones y efecto sobre las cuentas públicas', interpretation: 'La frase combina una descripción demográfica, una predicción sobre sostenibilidad y una acusación sobre las cuentas públicas. Cada parte requiere una medida distinta.' },
    replyProfile: 'pension-sustainability',
    headline: 'Hay presión demográfica y financiera, pero no está demostrada una insostenibilidad total ni que las pensiones ya hayan arruinado las cuentas públicas',
    summary: 'La estructura demográfica, los déficits observados en cuentas agregadas y los saldos negativos proyectados muestran presión, pero no bastan para afirmar que el sistema sea “completamente insostenible” ni que ya esté arruinando las arcas públicas. La comprobación separa datos observados, presupuestos y proyecciones, y distingue lo que puede atribuirse a pensiones de lo que solo está publicado para la Seguridad Social o las administraciones públicas en conjunto.',
    criteria: [
      { id: 'demographic-structure', familyId: 'demography', familyLabel: 'Demografía', label: 'Dependencia demográfica', finding: 'La dependencia de mayores mide una relación demográfica, no la relación efectiva entre cotizantes y pensionistas. “Árbol demográfico invertido” es una descripción retórica, no un indicador estadístico único.', metricIds: ['old_age_dependency_ratio'], population: 'residentes de 65 años o más en relación con residentes de 15 a 64 años', denominator: 'personas de 15 a 64 años', unit: 'personas de 65 años o más por cada 100 de 15 a 64 años', fallbackData: ['31,2 personas de 65 años o más por cada 100 personas de 15 a 64 años (2025)', '29,5 personas de 65 años o más por cada 100 personas de 15 a 64 años (2020)'], sourceIds: ['demography-pension-finance', 'pension-beneficiaries-source'], preferReviewedFallback: true },
      { id: 'projected-demography', familyId: 'demography', familyLabel: 'Demografía', label: 'Proyección demográfica', dataKind: 'projected', finding: 'La proyección de Eurostat es un escenario de referencia: muestra qué ocurriría bajo sus supuestos, no una predicción segura ni una proyección financiera del sistema.', metricIds: ['projected_population_65_plus', 'projected_population_20_64'], population: 'población proyectada de 65 años o más y de 20 a 64 años', denominator: 'personas proyectadas en cada grupo de edad', unit: 'personas proyectadas', fallbackData: ['15.564.375 personas de 65 años o más proyectadas (2100)', '22.247.813 personas de 20 a 64 años proyectadas (2100)'], sourceIds: ['demography-projections-source'] },
      { id: 'contributor-pensioner-ratio', familyId: 'pensions', familyLabel: 'Pensiones', label: 'Cotizantes por pensionista', dataKind: 'snapshot', finding: 'La Seguridad Social publicó una ratio de 2,5 afiliados por pensionista en julio de 2026, máximo desde 2011. Es una medida del momento y no sustituye a una proyección actuarial.', population: 'personas afiliadas y pensionistas incluidos en la ratio publicada', denominator: 'pensionistas', unit: 'cotizantes por pensionista', fallbackData: ['2,5 cotizantes por pensionista (julio de 2026; máximo desde 2011)'], sourceIds: ['social-security-affiliation-source'] },
      { id: 'pension-balance', familyId: 'pensions', familyLabel: 'Pensiones', label: 'Gasto por habitante', finding: 'La sostenibilidad requiere comparar ingresos contributivos, gasto, transferencias y compromisos futuros; el gasto actual aislado no decide el resultado.', metricIds: ['old_age_survivors_benefits_per_capita'], population: 'gasto en prestaciones de protección social para vejez y supervivencia', denominator: 'población residente', unit: '€ por habitante en prestaciones de vejez y supervivencia', fallbackData: ['4.194,66 € por habitante en prestaciones de vejez y supervivencia (2024)', '3.293,16 € por habitante en prestaciones de vejez y supervivencia (2020)'], sourceIds: ['pension-spending-source'] },
      { id: 'pension-beneficiaries', familyId: 'pensions', familyLabel: 'Pensiones', label: 'Personas beneficiarias', finding: 'El recuento de Eurostat cubre personas que reciben pensiones de vejez y supervivencia en todos los esquemas; no equivale por sí solo a cotizantes ni a pensionistas del sistema contributivo español.', metricIds: ['old_age_survivors_pension_beneficiaries'], population: 'personas beneficiarias de pensiones de vejez y supervivencia', denominator: 'personas', unit: 'personas', fallbackData: ['9.259.549 personas beneficiarias (2024)'], sourceIds: ['pension-beneficiaries-source'] },
      { id: 'pension-expenditure-total', familyId: 'pensions', familyLabel: 'Pensiones', label: 'Gasto total de vejez y supervivencia', finding: 'El gasto total localizado cubre prestaciones de vejez y supervivencia de todos los esquemas. El gasto contributivo observado de la Seguridad Social se muestra en la Cuenta General, con su propio perímetro y programa.', metricIds: ['old_age_survivors_benefits_total'], population: 'gasto en prestaciones de protección social para vejez y supervivencia', denominator: 'ninguno; importe agregado', unit: 'millones de euros', fallbackData: ['205.009,77 millones de euros en prestaciones de vejez y supervivencia (2024)'], sourceIds: ['pension-expenditure-total-source'] },
      { id: 'social-contributions', familyId: 'pensions', familyLabel: 'Pensiones', label: 'Cotizaciones sociales agregadas', finding: 'Eurostat registra las cotizaciones recibidas por los esquemas de protección social en conjunto. La serie no atribuye esos ingresos observados exclusivamente a las pensiones; esa limitación no afecta a la serie proyectada de AIReF que se muestra por separado.', metricIds: ['social_protection_contributions_total'], population: 'ingresos de los esquemas de protección social procedentes de cotizaciones', denominator: 'ninguno; importe agregado', unit: 'millones de euros', fallbackData: ['224.466,22 millones de euros de cotizaciones sociales (2024)'], sourceIds: ['social-protection-receipts-source'] },
      { id: 'government-financing', familyId: 'pensions', familyLabel: 'Pensiones', label: 'Aportaciones públicas agregadas', finding: 'Eurostat registra aportaciones generales de las administraciones a la protección social. La serie observada no permite tratarlas como transferencias específicas al sistema de pensiones; la serie proyectada de AIReF sí identifica transferencias a pensiones bajo sus supuestos.', metricIds: ['social_protection_government_contributions_total'], population: 'ingresos de los esquemas de protección social procedentes de las administraciones públicas', denominator: 'ninguno; importe agregado', unit: 'millones de euros', fallbackData: ['179.973,50 millones de euros de aportaciones públicas (2024)'], sourceIds: ['social-protection-receipts-source'] },
      { id: 'pension-system-balance', familyId: 'pensions', familyLabel: 'Pensiones', label: 'Saldos publicados del sistema', dataKind: 'context', finding: 'La Cuenta General 2024 publica saldos completos para el perímetro consolidado de la Seguridad Social y AIReF publica una serie anual completa para su sistema de pensiones modelizado. Son cuentas con perímetros distintos y se mantienen separadas.', population: 'cuenta consolidada de la Seguridad Social y sistema de pensiones modelizado por AIReF', denominator: 'importe agregado en la cuenta observada; PIB en la proyección', unit: 'millones de euros y % del PIB', fallbackData: ['Resultado corriente de la Seguridad Social: -9.310,15 millones de euros (2024)', 'Resultado presupuestario total de la Seguridad Social: -2.900,90 millones de euros (2024)', 'Saldo anual del sistema de pensiones modelizado: -2,48 % del PIB (2020) → -3,02 % (2070)'], sourceIds: ['social-security-general-account-2024', 'airef-pension-projection-tables-2026'], preferReviewedFallback: true },
      { id: 'social-security-account', familyId: 'pensions', familyLabel: 'Pensiones', label: 'Cuenta presupuestaria de la Seguridad Social', dataKind: 'observed', finding: 'La Cuenta General 2024 muestra, dentro de su perímetro oficial, el gasto reconocido del programa de pensiones contributivas, los ingresos y gastos corrientes, las cotizaciones, las transferencias y los saldos de la Seguridad Social. La cuenta es completa para ese perímetro y no se mezcla con la proyección de AIReF.', metricIds: ['social_security_contributory_pension_expenditure', 'social_security_current_revenue', 'social_security_current_expenditure', 'social_security_current_balance', 'social_security_contributions', 'social_security_current_transfers', 'social_security_budget_total_balance'], population: 'programa de pensiones contributivas y entidades gestoras y servicios comunes de la Seguridad Social', denominator: 'importe agregado', unit: 'millones de euros', fallbackData: ['Gasto reconocido en pensiones contributivas: 172.653,50 millones de euros (2024)', 'Ingresos corrientes de entidades gestoras y servicios comunes: 195.891,23 millones de euros (2024)', 'Gastos corrientes de entidades gestoras y servicios comunes: 205.201,38 millones de euros (2024)', 'Resultado corriente de la Seguridad Social: -9.310,15 millones de euros (2024)', 'Cotizaciones sociales: 146.148,70 millones de euros (2024)', 'Transferencias corrientes de la Seguridad Social: 48.151,75 millones de euros (2024)', 'Resultado presupuestario total de la Seguridad Social: -2.900,90 millones de euros (2024)'], sourceIds: ['social-security-general-account-2024'] },
      { id: 'pension-state-transfers-budget', familyId: 'pensions', familyLabel: 'Pensiones', label: 'Transferencias presupuestadas a pensiones', dataKind: 'context', finding: 'El cuadro C3 de la Seguridad Social identifica las partidas presupuestadas por destino para 2025P. Las cifras ejecutadas de 2024 se muestran en el criterio separado de transferencias reconocidas.', metricIds: ['social_security_minimum_complements_transfer_budget', 'social_security_noncontributory_transfer_budget', 'social_security_pact_toledo_transfer_budget'], population: 'transferencias del Estado presupuestadas por destino dentro de la Seguridad Social', denominator: 'ninguno; importe presupuestado', unit: 'millones de euros', fallbackData: ['Complementos a mínimos: 7.261,17 millones de euros presupuestados (2025P)', 'Pensiones no contributivas: 3.002,96 millones de euros presupuestados (2025P)', 'Pacto de Toledo: 19.888,00 millones de euros presupuestados (2025P)'], sourceIds: ['social-security-pension-transfers-2025p'] },
      { id: 'pension-state-transfers-executed', familyId: 'pensions', familyLabel: 'Pensiones', label: 'Transferencias reconocidas por destino', dataKind: 'observed', finding: 'La Cuenta General 2024 registra derechos reconocidos netos de transferencias del Estado por destino dentro de la Seguridad Social. Son importes ejecutados/reconocidos del ejercicio, no previsiones.', population: 'transferencias del Estado reconocidas netas por destino dentro de la Seguridad Social', denominator: 'ninguno; importe reconocido neto', unit: 'millones de euros', fallbackData: ['Complementos a mínimos: 7.928,50 millones de euros reconocidos (2024)', 'Pensiones no contributivas: 3.447,78 millones de euros reconocidos (2024)', 'Pacto de Toledo: 21.380,00 millones de euros reconocidos (2024)'], sourceIds: ['social-security-general-account-2024'] },
      { id: 'pension-finance-projection-series', familyId: 'pensions', familyLabel: 'Pensiones', label: 'Serie anual de financiación y saldo', dataKind: 'projected', finding: 'AIReF publica una serie anual completa de 2020–2070 con ingresos por cotizaciones, transferencias, gastos, saldo y transferencias implícitas del sistema modelizado. Es una proyección con supuestos explícitos, no una observación ni una predicción segura.', metricIds: ['pension_contributory_income_projected', 'pension_public_transfers_projected', 'pension_contributory_expenditure_projected', 'pension_noncontributory_expenditure_projected', 'pension_system_income_projected', 'pension_system_expenditure_projected', 'pension_system_balance_projected', 'pension_implicit_transfers_projected'], population: 'sistema público de pensiones modelizado por AIReF', denominator: 'PIB', unit: '% del PIB', fallbackData: ['Cotizaciones dedicadas a pensiones: 9,20 % del PIB (2020) → 10,37 % (2070)', 'Transferencias de la Administración Central: 0,87 % del PIB (2020) → 1,70 % (2070)', 'Gasto de pensiones SS y complementos a mínimos: 12,33 % del PIB (2020) → 14,86 % (2070)', 'Pensiones no contributivas: 0,23 % del PIB (2020) → 0,24 % (2070)', 'Ingresos totales: 11,54 % del PIB (2020) → 12,40 % (2070)', 'Gastos totales: 14,02 % del PIB (2020) → 15,42 % (2070)', 'Saldo anual: -2,48 % del PIB (2020) → -3,02 % (2070)', 'Transferencias implícitas: 2,48 % del PIB (2020) → 3,02 % (2070)'], sourceIds: ['airef-pension-projection-tables-2026'] },
      { id: 'pension-budget-breakdown-2025p', familyId: 'pensions', familyLabel: 'Pensiones', label: 'Desglose presupuestario 2025P', dataKind: 'context', finding: 'El cuadro C9.4 de la Seguridad Social separa en el presupuesto 2025P las pensiones contributivas, los complementos a mínimos, las no contributivas y el total. Son importes presupuestados, no ejecución ni saldo.', metricIds: ['social_security_contributory_pension_budget', 'social_security_pension_complements_minimum_budget', 'social_security_noncontributory_pension_budget', 'social_security_pension_budget_total'], population: 'pensiones del presupuesto consolidado de la Seguridad Social', denominator: 'ninguno; importe presupuestado', unit: 'millones de euros', fallbackData: ['Pensiones contributivas presupuestadas: 159.526,47 millones de euros (2025P)', 'Complementos a mínimos presupuestados: 7.250,13 millones de euros (2025P)', 'Pensiones no contributivas presupuestadas: 2.806,06 millones de euros (2025P)', 'Total presupuestado en pensiones: 169.582,91 millones de euros (2025P)'], sourceIds: ['social-security-pension-budget-2025p'] },
      { id: 'pension-financial-outlook', familyId: 'pensions', familyLabel: 'Pensiones', label: 'Proyección financiera', dataKind: 'projected', finding: 'La AIReF proyecta presión financiera bajo sus supuestos, pero sus cifras son escenarios y no una quiebra observada. El gasto neto queda por debajo del umbral formal de la regla, mientras que el saldo y la deuda pública se deterioran en el escenario de políticas constantes.', population: 'gasto público en pensiones, medidas de ingresos, transferencias implícitas y saldo público proyectados', denominator: 'PIB', unit: '% del PIB', fallbackData: ['Gasto bruto público en pensiones: 14,6 % del PIB de media (2022–2050)', 'Medidas de ingresos: 1,6 % del PIB de media (2022–2050)', 'Gasto neto público en pensiones: 13,0 % del PIB de media (2022–2050), frente al umbral formal de 13,3 %', 'Transferencias implícitas del resto de fondos o de la Administración Central: hasta el 3,0 % del PIB en la proyección (2022–2050)', 'Saldo público proyectado: -6,6 % del PIB en 2050 (escenario base de políticas constantes)', 'Saldo primario proyectado: -2,1 % del PIB en 2050 (escenario base de políticas constantes)', 'Deuda pública proyectada: 123 % del PIB en 2050 (escenario base de políticas constantes)'], sourceIds: ['airef-pension-sustainability-source', 'airef-pension-sustainability-study-2026'], preferReviewedFallback: true },
      { id: 'public-finance-effect', familyId: 'public-finance', familyLabel: 'Arcas públicas', label: 'Saldo y deuda pública', finding: 'La serie de AIReF aporta el vínculo cuantificado entre pensiones, transferencias y saldo proyectado; Eurostat aporta la cuenta observada de las administraciones públicas. operativamente, para hacer “arruinando” medible, se exige saldo público negativo durante al menos tres años, deuda creciente en el mismo periodo y evidencia de contribución del coste pensionista; es una regla analítica, no un umbral legal.', metricIds: ['government_deficit_ratio', 'government_debt_ratio'], population: 'administraciones públicas consolidadas y efecto pensionista proyectado por AIReF', denominator: 'PIB', unit: '% del PIB', fallbackData: ['-2,4 % del PIB de déficit o superávit público (2025)', '100,7 % del PIB de deuda pública (2025)', '119,3 % del PIB de deuda pública (2020)', 'Criterio operativo para “arruinando”: saldo negativo durante ≥3 años, deuda creciente en el mismo periodo y contribución pensionista identificable (regla analítica)'], resolvesMissing: [{ dimension: 'saldo presupuestario del periodo', metricId: 'government_deficit_ratio', minimumObservations: 1 }, { dimension: 'serie temporal de deuda', metricId: 'government_debt_ratio', minimumObservations: 2 }], sourceIds: ['public-finance-source', 'airef-pension-sustainability-study-2026'] },
    ],
    limitations: ['La comprobación cubre la Cuenta General 2024 observada, las transferencias reconocidas por destino, el presupuesto 2025P y la serie anual AIReF 2020–2070. Cada fuente conserva su perímetro, periodo, denominador y unidad: no se suman como si fueran una única cuenta. “Arruinando” se evalúa con la regla analítica visible en la sección de arcas públicas; no es una definición legal ni una prueba de quiebra inmediata.'],
    sources: [
      source('demography-pension-finance', 'Población y estructura demográfica', 'Eurostat', 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Population_structure_and_ageing', '2025-10-01'),
      source('demography-projections-source', 'Proyecciones de población EUROPOP2023', 'Eurostat', 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/proj_23np?geo=ES&projection=BSL&sex=T&unit=PER&sinceTimePeriod=2022', '2024-03-01'),
      source('pension-spending-source', 'Social protection statistics · old-age and survivors benefits', 'Eurostat', 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Social_protection_statistics', '2025-10-01'),
      source('pension-beneficiaries-source', 'Pension beneficiaries by type · Eurostat', 'Eurostat', 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/spr_pns_ben?geo=ES&spdepm=TOTAL&spscheme=TOTAL&spdepb=OLD_SRV&sex=T&unit=PER&sinceTimePeriod=2015', '2025-10-01'),
      source('pension-expenditure-total-source', 'Total old-age and survivors benefits expenditure · Eurostat', 'Eurostat', 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/spr_exp_func?geo=ES&spdeps=SPR&spfunc=OLD_SRV&unit=MIO_EUR&sinceTimePeriod=2015', '2025-10-01'),
      source('social-protection-receipts-source', 'Social protection receipts by type · Eurostat', 'Eurostat', 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/spr_rec_sumt?geo=ES&unit=MIO_EUR&sinceTimePeriod=2015', '2025-10-01'),
      source('social-security-affiliation-source', 'España supera por primera vez los 22,5 millones de afiliados', 'Ministerio de Inclusión, Seguridad Social y Migraciones', 'https://www.inclusion.gob.es/es/w/espana-supera-por-primera-vez-los-22-5-millones-de-afiliados-medios-tras-crear-mas-de-642.500-empleos-en-el-ultimo-ano', '2026-07-31'),
      source('airef-pension-sustainability-source', 'La regla de gasto de pensiones se cumple formalmente, pero no garantiza la sostenibilidad', 'AIReF', 'https://www.airef.es/es/noticias/la-airef-ratifica-el-resultado-de-2025-la-regla-de-gasto-de-pensiones-se-cumple-formalmente-pero-no-garantiza-la-sostenibilidad/', '2026-05-13'),
      source('social-security-general-account-2024', 'Cuenta General de la Seguridad Social · ejercicio 2024', 'Seguridad Social', 'https://www.seg-social.es/descarga/es/01_TOMO%20I_Cuenta_General_Parlamento.pdf', undefined),
      source('social-security-pension-transfers-2025p', 'Ingresos por transferencias de la Seguridad Social · Cuadro C3 · 2025P', 'Seguridad Social', 'https://www.seg-social.es/wps/wcm/connect/wss/f66c2eaa-6a36-49ba-b9a2-37f0a5b72cab/C%2B3.%2BIngresos%2Btransferencias%2B%282025P%29.pdf?CACHEID=ROOTWORKSPACE.Z18_81D21J401P5L40QTIT61G41000-f66c2eaa-6a36-49ba-b9a2-37f0a5b72cab-pJZXUxF&CONVERT_TO=linktext&MOD=AJPERES', '2025-01-01'),
      source('public-finance-source', 'Government finance statistics · debt and deficit', 'Eurostat', 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Government_finance_statistics', '2025-10-01'),
      source('airef-pension-sustainability-study-2026', 'Estudio de evaluación de la regla de gasto de pensiones · mayo de 2026', 'AIReF', 'https://www.airef.es/wp-content/uploads/2026/05/Pensiones/AIReF.-Estudio-de-evaluacion-de-la-regla-de-gasto-de-pensiones.pdf', '2026-05-29'),
      source('airef-pension-projection-tables-2026', 'Tablas y gráficos del estudio de evaluación de la regla de gasto en pensiones', 'AIReF', 'https://www.airef.es/wp-content/uploads/2026/05/Pensiones/AIReF.-Tablas-y-graficos.-Estudio-de-evaluacion-de-la-regla-de-gasto-en-pensiones.xlsx', '2026-05-29'),
      source('social-security-pension-budget-2025p', 'Presupuesto de la Seguridad Social 2025P · Cuadro C9.4', 'Seguridad Social', 'https://www.seg-social.es/wps/wcm/connect/wss/60b9beda-6fbc-4d97-bf46-d238e33abbbc/C%2B9.4%2BGastos%2Bprestaciones%2Becon.reg%C3%ADmenes%2B%282025P%29.xlsx?CACHEID=ROOTWORKSPACE.Z18_81D21J401P5L40QTIT61G41000-60b9beda-6fbc-4d97-bf46-d238e33abbbc-pJZXURy&CONVERT_TO=linktext&MOD=AJPERES', '2026-01-02'),
    ],
  },
  {
    id: 'broad-public-administration',
    matches: /\b(administraci[oó]n p[uú]blica|empleo p[uú]blico|empleados? p[uú]blicos?|funcionari|oposici[oó]n|plazas? fijas?|servicios? p[uú]blicos?)\b/i,
    interpretation: { kind: 'mixed', subject: 'administración y empleo público', subjectType: 'institution', predicate: 'has_multiple_measures', normalizedClaim: 'plantilla, desempeño y calidad de los servicios públicos', interpretation: 'La frase mezcla una valoración de la administración con acusaciones sobre puestos y conducta individual; son cuestiones distintas y medibles de forma diferente.' },
    headline: 'El número de empleados públicos no mide puestos prescindibles ni vagancia; las plazas sí están sujetas a obligaciones',
    visuals: [reviewedVisuals.publicEmploymentByAdministration, reviewedVisuals.publicEmploymentTrend],
    summary: 'No existe una cifra oficial de puestos “prescindibles” ni una estadística que permita clasificar como vagos a los empleados públicos en general. La oposición establece una relación de empleo regulada, pero no elimina las obligaciones de rendimiento ni demuestra por sí sola falta de actividad. Para evaluar la administración hay que separar plantilla, vacantes, absentismo, carga de trabajo, tiempos de atención, productividad, digitalización y resultados por servicio y territorio.',
    criteria: [
      { id: 'public-employment-definition', label: 'Qué se mide', finding: 'El recuento de efectivos no indica cuántos puestos son prescindibles ni mide rendimiento; no existe una clasificación oficial general de puestos “prescindibles”.', fallbackData: ['3.071.725 efectivos (enero de 2026): 1.930.273 en el sector público de las comunidades autónomas (62,84 %), 594.898 en la administración local (19,37 %) y 546.554 en el sector público estatal (17,79 %)'], sourceIds: ['public-administration-epsap-2026'] },
      { id: 'public-service-performance', label: 'Desempeño', finding: 'Para evaluar la administración hacen falta tiempos de tramitación, cargas de trabajo, vacantes, absentismo, productividad y resultados del servicio, con una comparación compatible.', missingDimensions: ['tiempos de tramitación', 'carga de trabajo', 'vacantes', 'absentismo', 'productividad', 'resultados comparables por servicio y territorio'], sourceIds: ['public-administration-source'] },
      { id: 'individual-conduct', label: 'Conducta individual', finding: 'Una oposición otorga una relación de empleo regulada; no demuestra por sí sola rendimiento, absentismo o derecho a permanecer sin cumplir sus obligaciones.', missingDimensions: ['persona o puesto concreto', 'registro de desempeño', 'absentismo individual', 'expediente o resultado disciplinario'], sourceIds: ['public-administration-source'] },
    ],
    limitations: ['La frase no aporta un servicio, puesto, territorio, periodo ni indicador. Sin esos datos no se puede estimar cuántos empleos son prescindibles. Una acusación individual exigiría además expedientes de desempeño o absentismo; no puede atribuirse vagancia a un colectivo entero.'],
    sources: [source('public-administration-source', 'Boletín Estadístico del Personal al Servicio de las Administraciones Públicas · julio 2025', 'Ministerio para la Transformación Digital y de la Función Pública', 'https://digital.gob.es/content/dam/sgad/sefp/es/portalsefp/funcion-publica/rcp/boletin/BEPSAP%20julio%202025.pdf', '2026-04-20')],
  },
  {
    id: 'broad-public-services',
    visuals: [reviewedVisuals.surgeryWaitTrend, reviewedVisuals.surgeryWaitRegions],
    matches: /\b(servicios? p[uú]blicos?|colapso(?:\s+total)?[^.]{0,80}servicios?|sanidad|educaci[oó]n|atenci[oó]n p[uú]blica)\b/i,
    interpretation: { kind: 'quantitative', subject: 'capacidad y resultados de los servicios públicos', subjectType: 'institution', predicate: 'has_multiple_measures', normalizedClaim: 'capacidad, uso y resultados de los servicios públicos', interpretation: '“Colapso total” es una conclusión extrema: hay que identificar el servicio, el territorio, el periodo y el umbral observable que la definiría.' },
    headline: 'El estado de los servicios públicos exige indicadores del servicio concreto',
    summary: 'La expresión “colapso total” no es un indicador estadístico. Para comprobarla hay que medir capacidad, demanda, tiempos de atención, cobertura y resultados del servicio afectado, con periodo y territorio definidos.',
    criteria: [
      { id: 'public-service-capacity', label: 'Capacidad y demanda', metricIds: ['hospital_beds_per_100k', 'emergency_wait_declared'], finding: 'No se puede confirmar un colapso sin identificar el servicio y comparar recursos, demanda y capacidad efectiva en el mismo periodo y territorio.', population: 'camas hospitalarias para atención con ingreso y tiempo declarado de espera en urgencias', denominator: 'población residente para camas; minutos de espera para urgencias', unit: 'camas por 100.000 habitantes; minutos', fallbackData: ['camas hospitalarias: 297,92 camas por 100.000 habitantes (2015) → 294,6 camas por 100.000 habitantes (2019)', '216,69 minutos de espera declarada en urgencias (2025)'], missingDimensions: ['servicio concreto', 'territorio', 'periodo', 'umbral de colapso'], sourceIds: ['public-services-source', 'public-services-hospital-source', 'public-services-emergency-source'] },
      { id: 'public-service-outcomes', label: 'Resultados y atención', metricIds: ['unmet_healthcare_waiting_list_rate'], finding: 'La Encuesta Europea de Salud registra necesidades médicas no atendidas por listas de espera; es un indicador de acceso sanitario y no equivale automáticamente a un colapso total de todos los servicios públicos.', population: 'personas de 16 años o más en España', denominator: 'población de 16 años o más', unit: '% de población', fallbackData: ['1,5 % de la población de 16 años o más declaró una necesidad médica no atendida por lista de espera (2025)'], missingDimensions: ['serie comparable de resultados de otros servicios'], sourceIds: ['public-services-health-access-source'] },
      { id: 'public-service-waiting-list', label: 'Lista de espera hospitalaria', finding: 'El informe del Sistema de Información de Listas de Espera del SNS registró una espera media de 102 días para primera consulta externa hospitalaria a 31 de diciembre de 2025 y 84 personas por cada 1.000 en esa lista; estos datos describen una espera concreta, no todos los servicios públicos.', population: 'personas en lista de espera para primera consulta externa hospitalaria del SNS', denominator: 'personas de la población protegida por el SNS', unit: 'días y personas por 1.000', fallbackData: ['102 días de espera media para primera consulta externa hospitalaria (31-12-2025)', '84 personas por cada 1.000 en lista de espera para primera consulta (31-12-2025)'], missingDimensions: ['comparación causal con inmigración'], sourceIds: ['public-services-waiting-list-source'] },
      { id: 'public-service-education-resources', label: 'Recursos educativos', metricIds: ['government_education_expenditure_ratio'], finding: 'El gasto público en educación fue del 4,1 % del PIB en 2024. Es un indicador de recursos presupuestarios y no una medida suficiente de capacidad, calidad o colapso.', population: 'gasto de las administraciones públicas en educación', denominator: 'PIB', unit: '% del PIB', fallbackData: ['4,1 % del PIB de gasto público en educación (2024)'], missingDimensions: ['resultados y capacidad por nivel educativo y territorio'], sourceIds: ['public-services-education-source'] },
      { id: 'public-service-scope', label: 'Alcance', finding: 'Una experiencia local o una subida de demanda no permite generalizar a toda España sin una serie comparable y un umbral explícito.', missingDimensions: ['ámbito nacional comparable'], sourceIds: ['public-services-source'] },
    ],
    limitations: ['No se ha localizado aquí una medición compatible que permita cuantificar un “colapso total” de los servicios públicos en conjunto. La inmigración y la presión sobre un servicio tampoco prueban por sí solas una relación causal.'],
    sources: [source('public-services-source', 'Government finance and public service statistics', 'Eurostat', 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Government_finance_statistics', '2025-10-01'), source('public-services-hospital-source', 'Hospital beds per 100000 inhabitants in Spain · Eurostat', 'Eurostat', 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/hlth_rs_bds?geo=ES&unit=P_HTHAB&facility=HBEDT&sinceTimePeriod=2015', '2026-08-20'), source('public-services-health-access-source', 'Unmet health care needs by reason · Eurostat', 'Eurostat', 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/hlth_silc_08?geo=ES&sinceTimePeriod=2015', '2026-08-20'), source('public-services-waiting-list-source', 'Informe de situación de las listas de espera del SNS · diciembre de 2025', 'Ministerio de Sanidad', 'https://www.sanidad.gob.es/estadEstudios/estadisticas/inforRecopilaciones/docs/Informe_situacion_listas_de_espera_dic_2025_V1.pdf', '2026-04-27'), source('public-services-emergency-source', 'Informe de situación de las listas de espera del SNS · diciembre de 2025', 'Ministerio de Sanidad', 'https://www.sanidad.gob.es/estadEstudios/estadisticas/inforRecopilaciones/docs/Informe_situacion_listas_de_espera_dic_2025_V1.pdf', '2026-04-27'), source('public-services-education-source', 'Government expenditure on education · Eurostat', 'Eurostat', 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/gov_10a_exp?geo=ES&cofog99=GF09&na_item=TE&unit=PC_GDP&sector=S13&sinceTimePeriod=2015', '2026-08-20')],
  },
  {
    id: 'broad-tax-burden-purchasing-power',
    visuals: [reviewedVisuals.taxWedgeTrend, { type: 'comparison', title: 'Cuña fiscal · salario medio, persona soltera sin hijos · 2025', unit: '% del coste laboral', labels: ['España', 'Media OCDE'], values: [41.4, 35.1], sourceId: 'tax-wedge-oecd-2026', evidenceIds: ['tax-wedge-oecd-2026'], note: 'Incluye IRPF y cotizaciones sociales de trabajador y empresa; no incluye IVA.' }],
    matches: /\b(impuesto|impuestos|irpf|iva|carga fiscal|presi[oó]n fiscal|recaudaci[oó]n|inflaci[oó]n|poder de compra|salarios?|baby boom|gasto p[uú]blico|subir impuestos|subida de impuestos)\w*\b/i,
    interpretation: { kind: 'mixed', subject: 'carga fiscal, precios, salarios y cuentas públicas en España', subjectType: 'country', predicate: 'has_multiple_measures', normalizedClaim: 'evolución de impuestos, poder adquisitivo, gasto público y pensiones', interpretation: 'La afirmación encadena cambios de impuestos, precios, salarios, gasto y jubilación. Son proposiciones separadas y una no prueba la siguiente.' },
    headline: 'La carga fiscal y el poder adquisitivo no prueban por sí solos que los impuestos causen toda la pérdida; una rebaja de IRPF o IVA tiene costes que deben cuantificarse',
    summary: 'La carga fiscal, la inflación y el poder adquisitivo no son la misma medida. Para comprobar la frase hay que comparar ingresos públicos, impuestos concretos, precios de consumo, salarios, gasto público y presión demográfica en los mismos periodos y con sus unidades; que varias series suban a la vez no demuestra que una subida de impuestos sea la causa de todo el resultado.',
    criteria: [
      { id: 'tax-revenue', label: 'Ingresos e impuestos', finding: 'La cuña fiscal combina IRPF y cotizaciones para un hogar tipo; no equivale al tipo legal de IRPF o IVA ni al importe que paga cada hogar.', metricIds: ['government_revenue_ratio', 'government_current_taxes_income_wealth_europe'], fallbackData: ['Cuña fiscal para una persona soltera sin hijos con salario medio: España 41,4 %; media OCDE 35,1 % (2025)', 'Ingresos públicos: España 42,9 % del PIB; UE 46,4 % (2025)'], sourceIds: ['tax-wedge-oecd-2026', 'tax-burden-eurostat'], preferReviewedFallback: true },
      { id: 'fiscal-drag', label: 'IRPF e inflación', finding: 'El Banco de España confirma la progresividad en frío: cuando los parámetros nominales no se actualizan plenamente, la inflación eleva la recaudación y el tipo efectivo aunque la renta real no mejore.', fallbackData: ['Un aumento nominal del 1 % de la renta de los hogares eleva aproximadamente un 1,85 % la recaudación por IRPF sin actualización; cerca de la mitad del aumento de IRPF/PIB de 2019–2023 se atribuye a progresividad en frío'], sourceIds: ['fiscal-drag-bde'], preferReviewedFallback: true },
      { id: 'prices-and-wages', label: 'Precios y salarios', finding: 'La inflación mide precios; el poder adquisitivo exige compararla con una serie salarial compatible, periodo, población y unidad definidos.', metricIds: ['cpi_index', 'median_hourly_earnings'], sourceIds: ['tax-burden-eurostat'] },
      { id: 'spending-and-pensions', label: 'Gasto y pensiones', finding: 'El envejecimiento eleva la presión presupuestaria, pero la financiación puede repartirse entre impuestos, cotizaciones, deuda, edad de retiro, empleo y prestaciones; no existe un único ajuste inevitable.', metricIds: ['government_expenditure_ratio', 'old_age_survivors_benefits_per_capita', 'old_age_dependency_ratio'], fallbackData: ['Deuda pública proyectada: 123 % del PIB en 2050 en el escenario base de políticas constantes de AIReF'], sourceIds: ['airef-tax-pension-outlook'] },
      { id: 'tax-causality', label: 'Conclusión causal', finding: 'Para afirmar que las pensiones obligan a subir impuestos hace falta identificar decisiones tributarias, periodos, mecanismo y una comparación que descarte otros factores.', missingDimensions: ['impuesto y base afectados', 'serie temporal alineada', 'mecanismo y comparación causal'], sourceIds: ['tax-burden-eurostat'] },
    ],
    limitations: ['Los indicadores agregados pueden mostrar evolución de precios, salarios, recaudación, gasto o dependencia, pero no prueban por sí solos pérdida de poder adquisitivo de todos los hogares ni que el sistema solo aguante subiendo impuestos.'],
    sources: [
      source('tax-burden-eurostat', 'Tax revenue, prices, wages and government finance statistics', 'Eurostat', 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Tax_revenue_statistics', '2025-10-01'),
      source('tax-wedge-oecd-2026', 'Taxing Wages 2026 · cuña fiscal sobre el trabajo', 'OCDE', 'https://www.oecd.org/content/dam/oecd/en/publications/reports/2026/04/taxing-wages-2026_d1f39986/3a5169ef-en.pdf', '2026-04-01'),
      source('fiscal-drag-bde', 'Progresividad en frío: impacto de la inflación sobre la recaudación por IRPF', 'Banco de España', 'https://www.bde.es/wbe/es/publicaciones/analisis-economico-investigacion/documentos-ocasionales/progresividad-en-frio--el-impacto-heterogeneo-de-la-inflacion-sobre-la-recaudacion-por-irpf.html', '2024-06-14'),
      source('airef-tax-pension-outlook', 'Estudio de evaluación de la regla de gasto de pensiones 2026', 'AIReF', 'https://www.airef.es/es/estudios/estudio-sobre-la-regla-de-gasto-de-pensiones/', '2026-05-29'),
    ],
  },
  {
    id: 'broad-population-replacement',
    visuals: [reviewedVisuals.immigrationStock, reviewedVisuals.immigrationOrigins, reviewedVisuals.immigrationPermitReasons, reviewedVisuals.pisaShare, reviewedVisuals.pisaMathGap],
    matches: /\b(reemplazo poblacional|reemplaz\w* poblacional|menos iq|menor iq|manipulables?|manipulable|gente que viene)\b/i,
    interpretation: { kind: 'causal', subject: 'población residente, capacidades individuales y decisiones políticas', subjectType: 'group', predicate: 'allegedly_changes', object: 'composición y funcionamiento institucional', normalizedClaim: 'reemplazo poblacional, capacidad cognitiva y aprovechamiento político', interpretation: 'La frase combina una afirmación demográfica con una generalización sobre capacidad individual y una acusación causal sobre políticos. La población puede medirse; las otras partes exigen definiciones y evidencia específica.' },
    headline: 'Un cambio demográfico no demuestra menor capacidad ni manipulación política',
    summary: 'La composición de la población y los flujos migratorios son medibles, pero “reemplazo poblacional” necesita una definición de población y periodo. No hay una categoría estadística válida que permita afirmar que las personas que llegan tienen menor IQ, y esa generalización no demuestra que sean más manipulables ni que los políticos se aprovechen del sistema.',
    criteria: [
      { id: 'population-composition', label: 'Composición demográfica', finding: 'La población nacida fuera de España puede medirse como residentes por país de nacimiento; es un stock y no demuestra por sí solo un reemplazo deliberado ni una intención política.', metricIds: ['foreign_born_population'], fallbackData: ['Población nacida fuera de España: 5,88 millones (2015) → 9,46 millones (2025)'], sourceIds: ['replacement-population-source'], preferReviewedFallback: true },
      { id: 'educational-gap', label: 'Brecha educativa', finding: 'PISA mide competencias escolares a los 15 años, no inteligencia innata ni toda la población adulta. En España, gran parte de la brecha observada por origen migrante se reduce al ajustar por nivel socioeconómico.', fallbackData: ['Brecha en matemáticas entre alumnado no inmigrante e inmigrante: 33 puntos antes del ajuste → 7 puntos tras ajustar por nivel socioeconómico (PISA 2022)'], sourceIds: ['replacement-pisa-oecd'], preferReviewedFallback: true },
      { id: 'cognitive-generalisation', label: 'IQ y capacidades', finding: '“Menor IQ” no identifica una población comparable ni un estudio representativo; no es una propiedad que pueda atribuirse a todas las personas por su origen. PISA no cubre esa afirmación.', missingDimensions: ['definición de IQ', 'medición representativa de inteligencia adulta', 'comparación de edad, educación e idioma'], sourceIds: ['replacement-pisa-oecd', 'replacement-comparability-source'] },
      { id: 'political-manipulation', label: 'Manipulación y aprovechamiento', finding: 'La acusación sobre políticos y un “sistema podrido” requiere decisiones, actores, mecanismo y resultados observables; no se deduce de la nacionalidad o del país de nacimiento.', missingDimensions: ['actor y decisión concreta', 'mecanismo', 'comparación o control', 'resultado medible'], sourceIds: ['replacement-comparability-source'] },
    ],
    limitations: ['Una variación en la población nacida fuera del país no prueba sustitución deliberada, menor capacidad cognitiva ni manipulación política. Esas conclusiones requieren proposiciones y fuentes independientes.'],
    sources: [
      source('replacement-population-source', 'Población por país de nacimiento en España', 'Eurostat', 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/migr_pop3ctb?geo=ES&age=TOTAL&sex=T&sinceTimePeriod=2015', '2026-08-17'),
      source('replacement-comparability-source', 'Population and social indicators: methodological comparability', 'Eurostat', 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Population_and_population_change_statistics', '2025-10-01'),
      source('replacement-pisa-oecd', 'PISA 2022 · alumnado inmigrante y rendimiento en España', 'OCDE', 'https://www.oecd.org/en/publications/pisa-2022-results-volume-i-and-ii-country-notes_ed6fbcc5-en/spain_f1a3afc1-en.html', '2023-12-05'),
    ],
  },
  {
    id: 'broad-benefits-recipients',
    visuals: [reviewedVisuals.imvTrend],
    matches: /\b(paguitas?|ayudas? para vivir|dependientes? de las ayudas|prestaciones?|beneficiarios?|subsidios?|rentas? m[ií]nimas?|ingreso m[ií]nimo vital)\b/i,
    interpretation: { kind: 'quantitative', subject: 'personas perceptoras de prestaciones', subjectType: 'group', predicate: 'has_multiple_measures', normalizedClaim: 'alcance y evolución de las prestaciones sociales', interpretation: '“Paguitas” no identifica un programa oficial ni demuestra dependencia, abuso o inactividad. Hay que especificar la prestación, la población, el periodo y el denominador.' },
    headline: 'Las prestaciones deben identificarse por programa, población y periodo',
    summary: '“Paguitas” es una etiqueta coloquial y no una categoría estadística. El número de perceptores, el gasto y la duración dependen del programa; no permiten por sí solos afirmar que una población necesite ayudas para vivir ni que su aumento sea exponencial.',
    criteria: [
      { id: 'benefit-programme', label: 'Programa y alcance', finding: '“Paguitas” no es una categoría oficial. El Ingreso Mínimo Vital (IMV) ofrece un programa concreto que puede medirse, pero no representa automáticamente todas las prestaciones.', population: 'hogares y personas beneficiarias del IMV', denominator: 'hogares perceptores y personas beneficiarias', unit: 'hogares y personas', fallbackData: ['Programa identificado para la comprobación: Ingreso Mínimo Vital (IMV), agosto de 2026'], missingDimensions: ['cobertura de todos los programas de prestaciones'], sourceIds: ['benefits-imv-august-source', 'benefits-statistics-source'] },
      { id: 'benefit-recipients', label: 'Perceptores', metricIds: ['benefit_recipients_by_group'], preferFallbackWhenNewer: true, finding: 'El balance oficial del IMV de agosto de 2026 registra 893.820 hogares y 2.725.899 personas beneficiarias. Son cifras del IMV, no del conjunto de ayudas ni una medida de dependencia económica.', population: 'personas y hogares beneficiarios del IMV en España', denominator: 'hogares perceptores y personas beneficiarias', unit: 'personas y hogares', fallbackData: ['2.725.899 personas beneficiarias en 893.820 hogares (IMV, 2026-08; agosto de 2026)'], missingDimensions: ['cobertura de todos los programas de prestaciones'], sourceIds: ['benefits-imv-august-source'] },
      { id: 'benefit-composition', label: 'Composición del IMV', metricIds: ['imv_title_holders_by_nationality', 'imv_title_holder_share_by_nationality'], finding: 'En el dossier oficial del IMV de julio de 2026, el 82,53 % de los titulares tenía nacionalidad española y el 17,47 % extranjera. La composición de titulares no demuestra por sí sola necesidad, abuso o causalidad.', population: 'titulares del IMV por nacionalidad', denominator: 'total de titulares del IMV', unit: '% de titulares del IMV y personas titulares', missingDimensions: ['comparación con la población elegible de cada grupo'], sourceIds: ['benefits-imv-source'] },
      { id: 'benefit-trend-causality', label: 'Personas beneficiarias del IMV', metricIds: ['benefit_recipients_by_group'], preferReviewedFallback: true, finding: 'En agosto de 2026 el INSS registró 390.346 beneficiarios más que en agosto de 2025 (+16,7 %). Es un aumento interanual real en una prestación concreta; por sí solo no demuestra crecimiento exponencial ni una relación causal con la regularización.', fallbackData: ['Serie localizada: Personas beneficiarias del IMV: 2.335.553 personas (2025-08) → 2.725.899 personas (2026-08; +16,7 % interanual)'], missingDimensions: ['diseño causal entre la regularización y el uso del IMV'], resolvesMissing: [{ dimension: 'serie temporal', metricId: 'benefit_recipients_by_group', minimumObservations: 2 }], sourceIds: ['benefits-imv-august-source', 'benefits-imv-previous-year-source'] },
    ],
    limitations: ['El IMV aporta una medición concreta de personas y hogares, pero no cubre automáticamente todas las prestaciones. Sin una serie comparable y un diseño causal no se puede afirmar un incremento exponencial, dependencia económica ni que una regularización lo haya provocado.'],
    sources: [
      source('benefits-imv-source', 'El Ingreso Mínimo Vital llega en julio a cerca de 2,7 millones de personas', 'Instituto Nacional de la Seguridad Social', 'https://revista.seg-social.es/-/el-ingreso-m%C3%ADnimo-vital-llega-en-julio-a-cerca-de-2-7-millones-de-personas-que-residen-en-879.225-hogares?redirect=%2F', '2026-08-07'),
      source('benefits-imv-august-source', 'El Ingreso Mínimo Vital protege en agosto a más de 2,7 millones de personas residentes en 894.000 hogares', 'Instituto Nacional de la Seguridad Social', 'https://revista.seg-social.es/-/el-ingreso-m%C3%ADnimo-vital-protege-en-agosto-a-m%C3%A1s-de-2-7-millones-de-personas-residentes-en-894.000-hogares', '2026-09-07'),
      source('benefits-imv-previous-year-source', 'El Ingreso Mínimo Vital llega a más de 2,3 millones de personas en agosto', 'Instituto Nacional de la Seguridad Social', 'https://revista.seg-social.es/-/el-ingreso-m%C3%ADnimo-vital-llega-a-m%C3%A1s-de-2-3-millones-de-personas-en-agosto', '2025-09-05'),
      source('benefits-statistics-source', 'Social protection statistics', 'Eurostat', 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Social_protection_statistics', '2025-10-01'),
    ],
  },
  {
    id: 'broad-youth-living-housing',
    visuals: [reviewedVisuals.youthUnemployment, reviewedVisuals.youthHousingPrices, reviewedVisuals.youthRegionalRent, reviewedVisuals.youthWageRent],
    matches: /\b(j[oó]ven(?:es)?|juventud|poblaci[oó]n joven)\b[\s\S]{0,220}\b(viviend|alquil|coste de vida|salari|sueldo|padres|emigr|oportunidad)\w*\b|\b(viviend|alquil|coste de vida|salari|sueldo|padres|emigr|oportunidad)\w*[\s\S]{0,220}\b(j[oó]ven(?:es)?|juventud|poblaci[oó]n joven)\b/i,
    interpretation: { kind: 'mixed', subject: 'condiciones de vida de la población joven', subjectType: 'group', predicate: 'faces_multiple_constraints', object: 'empleo, precios y acceso a vivienda', normalizedClaim: 'coste de vida, salarios, oportunidades y acceso joven a la vivienda', interpretation: 'La afirmación combina evolución de precios, ingresos, empleo, vivienda y una pregunta contrafactual sobre el apoyo familiar. Son dimensiones distintas y no deben resumirse en un único índice.' },
    headline: 'La vivienda supone una barrera económica para los jóvenes; no hay una cifra observada de cuántos emigrarían sin ayuda familiar',
    summary: 'La precariedad o la falta de oportunidades de la población joven no se pueden medir con el precio de la vivienda por sí solo. Hay que comprobar por separado el coste de vida, la evolución de los ingresos, el empleo juvenil, los precios y el esfuerzo de vivienda, la construcción y la emancipación; la pregunta sobre cuántas personas emigrarían sin ayuda familiar es contrafactual y no tiene una cifra observada equivalente.',
    criteria: [
      { id: 'youth-cost-of-living', label: 'Coste de vida', finding: 'El IPC mide la evolución de los precios de consumo, no cuánto puede pagar cada joven ni el coste específico de una vivienda.', metricIds: ['cpi_index'], sourceIds: ['youth-living-eurostat'] },
      { id: 'youth-income-employment', label: 'Ingresos y empleo', finding: 'La evolución salarial y el desempleo juvenil deben medirse con series separadas y con su población, unidad y periodo definidos.', metricIds: ['median_hourly_earnings', 'youth_unemployment_rate'], sourceIds: ['youth-labour-eurostat'] },
      { id: 'youth-housing-access', label: 'Vivienda', finding: 'El precio de la vivienda y la sobrecarga de costes describen presión residencial, pero no prueban por sí solos que nadie pueda comprar ni explican el papel de cada territorio.', metricIds: ['house_price_index', 'housing_cost_overburden_rate'], sourceIds: ['youth-housing-eurostat'] },
      { id: 'youth-supply', label: 'Oferta', finding: 'La construcción puede medirse con su índice de producción, pero no equivale automáticamente a viviendas disponibles para jóvenes ni a precios asequibles.', metricIds: ['construction_output_index'], sourceIds: ['youth-housing-eurostat'] },
      { id: 'family-co-residence', label: 'Convivencia y renta', finding: 'La convivencia con progenitores es mucho más frecuente con rentas bajas, lo que respalda una barrera económica. No mide por sí sola transferencias familiares ni necesidad de emigrar.', fallbackData: ['Personas de 26 a 34 años que vivían con sus progenitores: 44,3 % en total; 55,5 % con renta inferior a 6.000 €; 29,4 % con renta superior a 24.000 € (2025)'], sourceIds: ['youth-family-housing-ine'] },
      { id: 'family-support-counterfactual', label: 'Apoyo familiar y emigración', finding: 'No hay una estadística observada que indique cuántos jóvenes emigrarían si no recibieran ayuda o patrimonio familiar; es un contrafactual que requiere una encuesta o modelo explícito.', missingDimensions: ['encuesta o modelo contrafactual', 'definición de emigración evitada'], sourceIds: ['youth-family-housing-ine', 'youth-emancipation-source'] },
    ],
    limitations: ['Sin edad, ciudad o territorio, periodo y definición de “precariedad” no se puede estimar la imposibilidad de comprar una vivienda. Tampoco se puede convertir la convivencia con los padres en un número de emigraciones evitadas sin una hipótesis identificable.'],
    sources: [
      source('youth-living-eurostat', 'Consumer prices and cost of living indicators', 'Eurostat', 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Consumer_prices_-_inflation', '2025-10-01'),
      source('youth-labour-eurostat', 'Youth labour market statistics', 'Eurostat', 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Youth_statistics_-_employment', '2025-10-01'),
      source('youth-housing-eurostat', 'Housing in Europe — statistics on housing conditions', 'Eurostat', 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Housing_in_Europe', '2025-10-01'),
      source('youth-emancipation-source', 'Observatorio de Emancipación', 'Consejo de la Juventud de España', 'https://www.cje.org/', '2025-10-01'),
      source('youth-family-housing-ine', 'Encuesta de Condiciones de Vida 2025 · dificultades de acceso a la vivienda', 'INE', 'https://www.ine.es/dyngs/Prensa/m3ECV2025.htm?print=1', '2026-05-01'),
    ],
  },
  {
    id: 'broad-immigration-regularization',
    matches: /\b(legalizaci[oó]n|regularizaci[oó]n|regularizar|regularizad[ao]s?|residencia legal)\b/i,
    interpretation: { kind: 'legal', subject: 'personas migrantes en España', subjectType: 'group', predicate: 'is_covered_by', object: 'un proceso de regularización o legalización', normalizedClaim: 'existencia, alcance y resultado de una medida de regularización migratoria', interpretation: '“Legalización masiva” es una etiqueta imprecisa: hay que identificar la norma o programa y distinguir solicitudes, expedientes tramitados y autorizaciones concedidas.' },
    headline: 'Regularización documentada, pero no se demuestra que sea masiva ni que cause un colapso o más dependencia de prestaciones',
    summary: 'Para comprobar una supuesta legalización masiva hay que identificar la norma o programa, su fecha y sus requisitos. Una regularización puede admitir solicitudes extraordinarias para personas que ya residen en España, pero las solicitudes, los expedientes tramitados y las autorizaciones concedidas son cifras distintas.',
    criteria: [
      { id: 'regularization-measure', label: 'Medida concreta', finding: 'El término “legalización masiva” no identifica por sí solo una ley, decreto o programa; hace falta localizar la norma y comprobar su alcance, requisitos y exclusiones.', missingDimensions: ['norma o programa', 'fecha', 'requisitos y exclusiones'], sourceIds: ['regularizacion-extraordinaria-solicitudes-julio-2026'] },
      { id: 'regularization-counts', label: 'Cifras del proceso', finding: 'El balance oficial localizado registra 1.174.978 solicitudes y 609.737 expedientes tramitados; ninguna de esas cifras equivale automáticamente a autorizaciones concedidas.', fallbackData: ['Solicitudes: 1.174.978 (2026-07-02)', 'Expedientes tramitados: 609.737 (2026-07-02)'], sourceIds: ['regularizacion-extraordinaria-solicitudes-julio-2026'] },
      { id: 'regularization-employment', label: 'Afiliación', finding: 'El mismo balance registra nuevas afiliaciones a la Seguridad Social vinculadas al proceso. Es un resultado laboral, no una estimación del uso de prestaciones o servicios públicos.', fallbackData: ['159.097 nuevas afiliaciones a la Seguridad Social (balance a 2026-06-30)'], sourceIds: ['regularizacion-extraordinaria-solicitudes-julio-2026'] },
      { id: 'legal-status', label: 'Resultado jurídico', finding: 'Para saber cuántas personas obtuvieron autorización hay que consultar resoluciones concedidas, denegadas y pendientes, además del tipo y duración del permiso.', missingDimensions: ['autorizaciones concedidas', 'denegaciones', 'expedientes pendientes', 'tipo y duración del permiso'], sourceIds: ['regularizacion-requisitos-antecedentes-2026'] },
    ],
    limitations: ['El programa y sus requisitos están documentados. Su efecto sobre servicios y prestaciones exige comparar resultados de las personas regularizadas con un grupo y periodo compatibles; las solicitudes no son permisos concedidos.'],
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
    ['agriculture', /\b(agricultura|agricultor|campo|ganader[ií]a|cultivo|regad[ií]o|cosecha|explotaci[oó]n(?:es)? agrari|sector agrario)\w*\b/i, 'El campo requiere separar producción, renta, costes y territorio', 'La producción agraria, la renta de los agricultores, los costes de insumos y el empleo rural pueden moverse de forma distinta.', 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Agriculture,_forestry_and_fishery_statistics', 'Eurostat'],
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
    id: 'broad-agriculture-green-transition',
    matches: /\b(agricultura|agricola|agricultores?|campo|ganaderia|explotacion(?:es)? agraria(?:s)?|sector agrario)\b[\s\S]{0,180}\b(pacto verde|green deal|agenda 2030|normas? ambientales?|requisitos ambientales?|regulacion ambiental|regulacion ecologica|pac|condicionalidad|eco.?regimen(?:es)?)\b|\b(pacto verde|green deal|agenda 2030|normas? ambientales?|requisitos ambientales?|regulacion ambiental|regulacion ecologica|pac|condicionalidad|eco.?regimen(?:es)?)\b[\s\S]{0,180}\b(agricultura|agricola|agricultores?|campo|ganaderia|explotacion(?:es)? agraria(?:s)?|sector agrario)\b/i,
    interpretation: { kind: 'causal', subject: 'renta agraria y política ambiental', subjectType: 'country', predicate: 'allegedly_causes', object: 'deterioro de la agricultura española', normalizedClaim: 'efecto de las normas ambientales y la PAC sobre la renta agraria', interpretation: 'La frase enlaza requisitos ambientales con daños a todo el sector agrario. Para contrastarla hay que separar ingresos, costes, ayudas y el efecto causal de cada norma.' },
    headline: 'La PAC incorpora requisitos ambientales, pero los datos agregados no demuestran que esas normas estén destruyendo el campo',
    visuals: [reviewedVisuals.farmIncomePerWorkUnit],
    summary: 'La PAC combina requisitos ambientales y eco-regímenes voluntarios. La renta agraria real por unidad de trabajo aumentó en la segunda estimación nacional de 2025, pero también subieron los consumos intermedios y bajaron las subvenciones totales. Esos agregados describen movimientos simultáneos: no aíslan el coste de cumplir cada norma ni demuestran que el Pacto Verde causara pérdidas o mejoras en cada explotación.',
    criteria: [
      { id: 'farm-income-trend', label: 'Renta agraria', finding: 'En la segunda estimación MAPA de 2025, la renta agraria nominal aumentó y el indicador real por unidad de trabajo también subió; el dato es un promedio nacional provisional, no el resultado de cada explotación.', fallbackData: ['Renta agraria total: 39.798,6 millones de euros en 2025, +8,9 % nominal frente a 2024; renta real por UTA: +4,1 % (segunda estimación)'], sourceIds: ['farm-income-mapa-2025'], preferReviewedFallback: true },
      { id: 'farm-costs-and-subsidies', label: 'Costes y ayudas', finding: 'Los consumos intermedios crecieron mientras las subvenciones totales bajaron; sin separar insumos, producción y ayudas por explotación no puede atribuirse el saldo a una norma ambiental concreta.', fallbackData: ['Consumos intermedios: +4,8 % en 2025; subvenciones totales: −2,7 % (segunda estimación MAPA)'], sourceIds: ['farm-income-mapa-2025'], preferReviewedFallback: true },
      { id: 'cap-environmental-requirements', label: 'Requisitos de la PAC', finding: 'El Plan Estratégico de la PAC incluye condicionalidad reforzada y eco-regímenes voluntarios; su presupuesto describe el diseño de la política, no su efecto neto sobre la rentabilidad de cada explotación.', fallbackData: ['Eco-regímenes voluntarios: aproximadamente 1.107 millones de euros al año; el 47,8 % de los fondos de desarrollo rural se reserva para objetivos ambientales'], sourceIds: ['cap-strategic-plan-summary'] },
      { id: 'farm-regulatory-causality', label: 'Efecto de las normas', finding: 'Las cuentas agregadas no aíslan el coste de cumplimiento ni comparan explotaciones equivalentes sujetas a requisitos distintos; no demuestran que el Pacto Verde esté destruyendo el sector.', missingDimensions: ['coste de cumplimiento por explotación y norma', 'comparación por cultivo y territorio', 'contrafactual o diseño causal', 'serie de rentabilidad desglosada por tamaño de explotación'], sourceIds: ['farm-income-mapa-2025', 'cap-strategic-plan-summary'] },
    ],
    limitations: ['La serie es un agregado nacional y 2025 es una segunda estimación. No mide cada cultivo, comunidad autónoma o explotación y no permite atribuir cambios de renta a una regulación ambiental sin costes de cumplimiento y comparación causal.'],
    sources: [
      source('farm-income-mapa-2025', 'Cuentas Económicas de la Agricultura · 2025, segunda estimación', 'Ministerio de Agricultura, Pesca y Alimentación', 'https://www.mapa.gob.es/dam/mapa/contenido/estadisticas/temas/estadisticas-agrarias/1.economicas/renta-agraria/cea-2025-2-estimacion-marzo-2026--0.pdf', '2026-04-01'),
      source('cap-strategic-plan-summary', 'Resumen del Plan Estratégico de la PAC 2023–2027', 'Ministerio de Agricultura, Pesca y Alimentación', 'https://www.mapa.gob.es/dam/mapa/contenido/reforma-de-la-pac/plan-estrategico-pac-post-2020/documentos/resumen-pac-es.pdf', '2023-01-01'),
    ],
  },
  {
    id: 'broad-immigration-security',
    visuals: [reviewedVisuals.securityRecent, reviewedVisuals.securityAdjustedTrend, reviewedVisuals.securityAdjustedGap],
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
    visuals: [reviewedVisuals.immigrationStock, reviewedVisuals.immigrationOrigins, reviewedVisuals.immigrationPermitReasons],
    matches: /\b(inmigr|migrant|extranj|invasion|invaden|patera|asilo|llegad)\w*\b/i,
    interpretation: { kind: 'quantitative', subject: 'inmigración en España', subjectType: 'group', predicate: 'has_distinct_populations_and_flows', normalizedClaim: 'población, flujos y llegadas de inmigración en España', interpretation: 'La afirmación mezcla población residente, flujos anuales y entradas irregulares, que son magnitudes diferentes.', confidence: 0.78, evidenceNeeds: ['población', 'flujo', 'periodo', 'definición'] },
    headline: 'La inmigración no es una sola magnitud: población, flujos y llegadas son distintas',
    summary: 'España tiene una población nacida fuera del país creciente y también entradas irregulares, pero no se pueden sumar ni tratar como equivalentes. El tamaño de la población residente no demuestra una “invasión” y las llegadas irregulares no representan toda la inmigración.',
    criteria: [
      { id: 'foreign-born', label: 'Población residente', finding: 'La población nacida fuera de España es un stock de residentes, no el número de llegadas de un año.', fallbackData: ['Más de 10 millones de residentes nacidos fuera de España (2026)'], sourceIds: ['immigration-population'] },
      { id: 'irregular-arrivals', label: 'Llegadas irregulares', finding: 'Las llegadas irregulares son un flujo anual y no equivalen a toda la inmigración.', fallbackData: ['36.775 llegadas irregulares (2025); −42,6% frente a 2024'], sourceIds: ['immigration-arrivals'] },
      { id: 'foreign-employment', label: 'Empleo', finding: 'La afiliación extranjera mide personas afiliadas, no el total de población inmigrante.', fallbackData: ['3.135.581 afiliaciones extranjeras desestacionalizadas (diciembre de 2025)'], sourceIds: ['immigration-employment'] },
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
    visuals: [reviewedVisuals.securityRecent, reviewedVisuals.securityAdjustedTrend, reviewedVisuals.securityAdjustedGap],
    matches: /\b(delincuenc|criminal|delito|seguridad|insegur|calle|salir|polic[ií]a|droga|judicial|disuasor|denuncia)\w*\b/i,
    interpretation: { kind: 'quantitative', subject: 'seguridad en España', subjectType: 'country', predicate: 'has_distinct_offence_and_perception_measures', normalizedClaim: 'delincuencia, seguridad y experiencia del espacio público en España', interpretation: 'La delincuencia nacional, los delitos concretos y la sensación de inseguridad no son la misma medida.', confidence: 0.72, evidenceNeeds: ['categoría de delito', 'periodo', 'territorio', 'medida'] },
    headline: 'Las tendencias delictivas difieren y no prueban que los nacionalizados causen un aumento general de la inseguridad',
    summary: 'El último balance disponible compara enero-junio de 2026 con el mismo periodo de 2025: el total registrado subió ligeramente, mientras varios delitos patrimoniales bajaron y los delitos contra la libertad sexual subieron. Las cifras nacionales no describen automáticamente lo que ocurre en una calle concreta ni identifican por sí solas quién causa una tendencia.',
    criteria: [
      { id: 'total-offences', label: 'Total y composición', finding: 'El balance nacional separa infracciones totales, delincuencia convencional y cibercriminalidad; no son una única medida de inseguridad.', fallbackData: ['1.217.476 infracciones penales registradas en enero-junio de 2026: +0,5 % frente a enero-junio de 2025; delincuencia convencional +0,5 % y ciberdelincuencia +0,6 %'], sourceIds: ['security-balance'] },
      { id: 'conventional-rate', label: 'Delincuencia convencional', finding: 'La tasa convencional permite comparar el volumen registrado con la población; por sí sola no describe cada calle ni cada delito.', fallbackData: ['40,5 infracciones convencionales por mil habitantes en enero-junio de 2026; en la banda más baja de la serie histórica'], sourceIds: ['security-balance'] },
      { id: 'offence-trends', label: 'Delitos concretos', finding: 'Las tendencias varían según la categoría: en enero-junio de 2026 subieron los delitos contra la libertad sexual, mientras descendieron los hurtos y los robos con violencia.', fallbackData: ['Delitos contra la libertad sexual: +4,0 %; hurtos: −3,8 %; robos con violencia o intimidación: −0,8 % (enero-junio de 2026 frente al mismo periodo de 2025)'], sourceIds: ['security-balance'] },
      { id: 'scope', label: 'Alcance', finding: 'Una tendencia nacional puede convivir con deterioro en un barrio, estación o zona turística; hace falta una categoría y un territorio concretos.', sourceIds: ['security-balance'] },
      { id: 'group-causality', label: 'Grupo y causalidad', finding: 'En 2024 la tasa bruta de adultos condenados fue mayor entre extranjeros, pero la mayoría absoluta de condenados tenía nacionalidad española. Las tasas no ajustan edad, sexo, renta, exposición policial o territorio y no identifican a “nuevos españoles”.', fallbackData: ['Tasa bruta: 15,7 condenados por mil entre extranjeros y 6,2 por mil entre españoles; 71,4 % de las personas adultas condenadas tenía nacionalidad española (2024)'], missingDimensions: ['ajuste por edad, sexo, renta y territorio', 'diseño causal'], sourceIds: ['security-convictions-ine'] },
      { id: 'institutional-response', label: 'Policía y justicia', finding: 'La afirmación de que “nadie hace nada” requiere medir recursos, denuncias, tiempos de respuesta, resoluciones y resultados por servicio; el total de delitos no mide por sí solo la actuación institucional.', missingDimensions: ['medida u organismo', 'periodo', 'indicador de respuesta', 'resultado del servicio'], sourceIds: ['security-balance'] },
      { id: 'loaded-label', label: '“Wokismo”', finding: '“Wokismo” es una etiqueta política, no una categoría estadística. No se puede usar para explicar una tendencia delictiva sin identificar una política o actuación concreta y medir su efecto.', missingDimensions: ['política o actuación concreta', 'definición operativa', 'periodo', 'resultado comparable'], sourceIds: ['security-balance'] },
    ],
    limitations: ['“No se puede salir a la calle” expresa una experiencia o valoración que las estadísticas nacionales no pueden confirmar literalmente. Para comprobarla hacen falta lugar, periodo, delito o datos de victimización.'],
    sources: [
      source('security-balance', 'Balance de Criminalidad · segundo trimestre de 2026', 'Ministerio del Interior', 'https://www.interior.gob.es/opencms/export/sites/default/.galleries/galeria-de-prensa/documentos-y-multimedia/balances-e-informes/2026/Balance-de-Criminalidad-Segundo-Trimestre-2026.pdf'),
      source('security-convictions-ine', 'Estadística de condenados 2024', 'INE', 'https://www.ine.es/dyngs/Prensa/ECAECM2024.htm', '2025-09-01'),
    ],
  },
];

const normalise = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n');

export const BROAD_SNAPSHOT_POLICY = Object.freeze({ owner: 'knowledge-review', createdAt: '2026-09-25', expiresAt: '2026-12-25', refreshCommand: 'npm run knowledge:domain-refresh', validationStatus: 'reviewed', supportedScope: 'España, contexto nacional y fuentes citadas en cada packet', unsupportedScope: 'atribución causal, barrios concretos y generalizaciones no medidas' });

const shareableSourcesByPacket = {
  'broad-public-administration': ['public-administration-epsap-2026', 'public-employment-statute'],
  'broad-demography-pension-finance': ['demography-pension-finance', 'social-security-general-account-2024', 'airef-pension-sustainability-study-2026'],
  'broad-youth-living-housing': ['cje-emancipation-2025', 'youth-family-housing-ine'],
  'broad-security': ['security-balance', 'security-standardised-crime-reis', 'ine-convictions-2024'],
  'broad-immigration-security': ['security-balance', 'security-standardised-crime-reis', 'immigration-crime'],
  'broad-population-replacement': ['replacement-population-source', 'immigration-permit-reasons-eurostat', 'replacement-pisa-oecd'],
  'broad-tax-burden-purchasing-power': ['tax-wedge-oecd-2026', 'fiscal-drag-bde', 'airef-tax-pension-outlook'],
  'broad-agriculture-green-transition': ['farm-income-mapa-2025', 'cap-strategic-plan-summary'],
};

const shareableReplyForPacket = (packetId, families) => {
  const data = (criterionId) => families.find((family) => family.criterionId === criterionId)?.data || [];
  const value = (criterionId, pattern) => data(criterionId).find((item) => pattern.test(item));
  if (packetId === 'broad-public-administration') {
    const count = value('public-employment-definition', /3\.071\.725/);
    if (!count || !value('individual-conduct', /artículo 20/)) return undefined;
    return `La EPSAP cuenta ${count}. Es un recuento de efectivos: no publica cuántos puestos son prescindibles ni mide “vagancia”. El Estatuto del Empleado Público prevé evaluación del desempeño, deberes de diligencia y sanciones; aprobar una oposición no exime de esas obligaciones.`;
  }
  if (packetId === 'broad-demography-pension-finance') {
    const account = value('pension-system-balance', /Resultado presupuestario total/);
    const projection = value('pension-financial-outlook', /Gasto neto público en pensiones/);
    const debt = value('pension-financial-outlook', /Deuda pública proyectada/);
    if (!account || !projection || !debt) return undefined;
    return `La dependencia demográfica subió de 29,5 mayores por cada 100 personas de 15–64 años en 2020 a 31,2 en 2025. En 2024, el resultado presupuestario total de la Seguridad Social fue −2.900,90 millones de euros (su resultado corriente: −9.310,15 millones). AIReF proyecta gasto neto medio en pensiones del 13,0 % del PIB en 2022–2050, frente al umbral legal del 13,3 %, y deuda pública del 123 % del PIB en 2050 con políticas constantes. Es presión financiera, no una quiebra actual ni una deuda atribuible solo a pensiones.`;
  }
  if (packetId === 'broad-youth-living-housing') {
    const rent = value('youth-rental-effort', /1\.176/);
    const downPayment = value('youth-purchase-effort', /66\.900/);
    const coResidence = value('family-co-residence', /55,5 %/);
    if (!rent || !downPayment || !coResidence) return undefined;
    return `El Observatorio de Emancipación cifra el alquiler medio en 1.176 € al mes (el 98,7 % del salario joven de referencia); la entrada media estimada para comprar es 66.900 €, equivalente a 4,7 años de salario íntegro. En la ECV 2025, vivía con sus progenitores el 55,5 % de las personas de 26–34 años con renta inferior a 6.000 €, frente al 29,4 % con más de 24.000 € (44,3 % en total). Hay una barrera económica clara, pero no es una imposibilidad universal; no hay una cifra observada de cuántas personas emigrarían sin apoyo familiar.`;
  }
  if (packetId === 'broad-security') {
    const total = value('total-offences', /1\.217\.476/);
    const trends = value('offence-trends', /libertad sexual/);
    const foreignRate = value('group-causality', /Nacionalidad extranjera/);
    const spanishRate = value('group-causality', /Nacionalidad española/);
    if (!total || !trends || !foreignRate || !spanishRate) return undefined;
    return `Entre enero y junio de 2026, las infracciones registradas subieron un 0,5 % frente al mismo periodo de 2025; los delitos contra la libertad sexual aumentaron un 4,0 %, mientras los hurtos bajaron un 3,8 % y los robos violentos un 0,8 %. La tasa bruta de condenados adultos en 2024 fue de 15,7 por cada 1.000 residentes extranjeros frente a 6,2 entre españoles. Un estudio ajustado por edad y sexo reduce la brecha de condenas un 48,3 %, pero no la elimina; ni las tasas brutas ni las ajustadas prueban que la nacionalidad cause delitos. Las personas nacionalizadas cuentan como españolas. El balance nacional no mide cada barrio ni el “wokismo”.`;
  }
  if (packetId === 'broad-immigration-security') {
    const trends = value('security-recent-trend', /\+0,5 %/);
    const rawRates = value('convicted-rate', /15,7/);
    const adjustedRates = value('causal-limit', /estandarizadas/);
    if (!trends || !rawRates || !adjustedRates) return undefined;
    return `En enero–junio de 2026, el total de infracciones registradas subió un 0,5 %; libertad sexual +4,0 %, hurtos −3,8 % y robos con violencia −0,8 %. La tasa bruta de condenados adultos en 2024 fue 15,7 por 1.000 residentes extranjeros y 6,2 entre españoles. En 2007–2023, ajustar por edad y sexo redujo la brecha de tasas de condena un 48,3 %, pero no la eliminó. Ninguna de estas comparaciones prueba causalidad ni que la nacionalidad cause delitos; tampoco identifica a “nuevos españoles” como categoría separada.`;
  }
  if (packetId === 'broad-population-replacement') {
    const population = value('population-composition', /5,88 millones/);
    const gap = value('educational-gap', /33 puntos/);
    const origins = value('main-origins', /Marruecos/);
    const motives = value('permit-reasons', /familia/i);
    if (!population || !gap || !origins || !motives) return undefined;
    return `La población residente nacida fuera de España pasó de 5,88 millones en 2015 a 9,46 millones en 2025: mide un cambio demográfico, no una sustitución deliberada. Entre los primeros permisos de 2024 a ciudadanos no comunitarios, el 46 % fue por motivos familiares, el 20,8 % por estudios y el 17 % por trabajo; no son todos los movimientos migratorios. En PISA 2022, la brecha bruta en matemáticas entre alumnado inmigrante y no inmigrante fue de 33 puntos y de 7 tras ajustar por nivel socioeconómico. PISA mide competencias escolares a los 15 años, no IQ, inteligencia innata ni manipulabilidad adulta. No hay datos que demuestren la intención política atribuida.`;
  }
  if (packetId === 'broad-tax-burden-purchasing-power') {
    const wedge = value('tax-revenue', /41,4 %/);
    const drag = value('fiscal-drag', /1,85 %/);
    const debt = value('spending-and-pensions', /123 % del PIB/);
    if (!wedge || !drag || !debt) return undefined;
    return `Para una persona soltera sin hijos con salario medio, la cuña fiscal de 2025 fue 41,4 % en España y 35,1 % en la OCDE; incluye IRPF y cotizaciones sociales de trabajador y empresa, no equivale al IRPF o IVA pagado por una familia. El Banco de España estima que, sin actualizar los tramos, un 1 % más de renta nominal se asocia con un 1,85 % más de recaudación por IRPF; cerca de la mitad del alza de IRPF/PIB de 2019–2023 se atribuye a esa progresividad en frío. Deflactar el IRPF o reducir el IVA son opciones: su viabilidad exige cuantificar coste y distribución. La deuda del 123 % del PIB en 2050 es un escenario, no prueba que cualquier rebaja sea imposible ni que el ajuste vaya a recaer inevitablemente sobre generaciones concretas.`;
  }
  if (packetId === 'broad-agriculture-green-transition') {
    const income = value('farm-income-trend', /39\.798,6 millones/);
    const costs = value('farm-costs-and-subsidies', /Consumos intermedios: \+4,8 %/);
    const cap = value('cap-environmental-requirements', /1\.107 millones/);
    if (!income || !costs || !cap) return undefined;
    return `En 2025, la segunda estimación del MAPA sitúa la renta agraria en 39.798,6 millones de euros (+8,9 % nominal frente a 2024) y la renta real por unidad de trabajo anual subió un 4,1 %. También aumentaron los consumos intermedios un 4,8 % y descendieron las subvenciones totales un 2,7 %. La PAC combina condicionalidad ambiental con eco-regímenes voluntarios dotados con aproximadamente 1.107 millones de euros al año; el 47,8 % de los fondos de desarrollo rural se reserva para objetivos ambientales. Estos promedios nacionales no describen cada explotación ni demuestran que las normas ambientales causaran pérdidas o mejoras.`;
  }
  return undefined;
};

const supplementalRoutes = [
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

export const broadDomainPacketsFor = (text) => {
  const value = normalise(text);
  // Broad political judgements are handled by the existing scorecard. Do not
  // let a mention of employment or security hijack that route accidentally.
  if (/\b(sanchez|presidente|gobierno|moncloa|psoe|pp|vox|sumar)\b/.test(value) && /\b(destruy|hunde|arruin|pais|espana|fatal|desastre|ruina)\b/.test(value)) return [];
  const direct = packets.filter((packet) => packet.matches.test(value));
  const agricultureTransitionSignal = /\b(agricultura|agricola|agricultores?|campo|ganaderia|explotacion(?:es)? agraria(?:s)?|sector agrario)\b/i.test(value) && /\b(pacto verde|green deal|agenda 2030|normas? ambientales?|requisitos ambientales?|regulacion ambiental|regulacion ecologica|pac|condicionalidad|eco.?regimen(?:es)?)\b/i.test(value);
  const administrationSignal = /administraci[oó]n|funcionari|oposici[oó]n|plantilla|absentismo|puestos? prescindibles?|puestos? innecesarios?|empleo p[uú]blico|sector p[uú]blico|plaza fija|calentar (?:la )?silla|no trabaja|automatiz|digitalizaci[oó]n/i.test(value);
  const demographyPensionSignal = /arbol demografico|estructura demografica|demograf[ií]a|envejecimiento|piramide poblacional|ratio (?:de )?cotizantes/i.test(value) && /pension|jubilaci[oó]n|cotizaci[oó]n|arcas p[uú]blicas|sostenib|arruin|deficit|quiebr|bancarrota/i.test(value);
  const pensionFinanceSignal = /pension|jubilaci[oó]n|cotizaci[oó]n|cotizantes/i.test(value) && /insostenib|sostenib|arruin|hunde|arcas p[uú]blicas|deficit|gasto|financ|quiebr|bancarrota|ratio|deuda|presupuesto/i.test(value);
  const youthSignal = /j[oó]ven|juventud|poblaci[oó]n joven|menores? de (?:30|treinta)|emancip/i.test(value) && /viviend|alquil|coste de vida|salari|sueldo|padres|emigr|oportunidad|precar|emancip|herencia|comprar casa|imposible/i.test(value);
  const taxSignal = /\b(impuestos?|irpf|iva|carga fiscal|presi[oó]n fiscal|recaudaci[oó]n|subir impuestos|subida de impuestos|progresividad en frio|deflactar)\b/i.test(value);
  const replacementSignal = /reemplazo poblacional|reemplaz\w* poblacion|sustitucion (?:poblacional|demografica)|menos iq|menor iq|cociente intelectual|menos inteligent|menor inteligenc|inferior capacidad|manipulables?|manipulable|gente que viene|motivos? (?:de )?inmigraci[oó]n|origenes? inmigrantes/i.test(value);
  const securitySignal = /\b(delincuenc\w*|criminal\w*|acuchill\w*|roba\w*|robo\w*|hurt\w*|viola\w*|violac\w*|paliza\w*|agresion\w*|insegur\w*|polic[ií]a|justicia|wokismo)\b/i.test(value);
  const compoundSignal = /legaliz\w*|regulariz\w*|amnistia migratoria|arraigo extraordinario|papeles[\s\S]{0,60}(?:inmigr|migr|extranj)|(?:inmigr|migr|extranj)[\s\S]{0,60}papeles/i.test(value) && /servicios? p[uú]blicos?|colapso|sanidad|hospital|centro de salud|educaci[oó]n/i.test(value) && /paguitas?|prestaci[oó]n|ayuda|subsidio|renta m[ií]nima|ingreso m[ií]nimo|benefici|asistencia social/i.test(value);
  const packetById = (id) => packets.find((packet) => packet.id === id);
  // Strong multi-proposition routes are resolved before broad keyword matches.
  // This keeps a claim about one subject from inheriting nearby but incompatible
  // packets such as generic taxes, pensions, employment or economy context.
  if (compoundSignal) return ['broad-immigration-regularization', 'broad-public-services', 'broad-benefits-recipients'].map(packetById).filter(Boolean);
  if (agricultureTransitionSignal) return [packetById('broad-agriculture-green-transition')].filter(Boolean);
  if (replacementSignal) return [packetById('broad-population-replacement')].filter(Boolean);
  if (administrationSignal) return [packetById('broad-public-administration')].filter(Boolean);
  if ((demographyPensionSignal || pensionFinanceSignal) && !taxSignal) return [packetById('broad-demography-pension-finance')].filter(Boolean);
  if (taxSignal && (/inflaci[oó]n|poder de compra|salari|baby boom|gasto p[uú]blico|pensiones?/.test(value) || /impuesto|irpf|iva|carga fiscal|presi[oó]n fiscal/.test(value))) return [packetById('broad-tax-burden-purchasing-power')].filter(Boolean);
  if (youthSignal) return [packetById('broad-youth-living-housing')].filter(Boolean);
  if (/\b(inmigr\w*|migrant\w*|extranj\w*|migrator\w*)\b/i.test(value) && securitySignal) return [packetById('broad-immigration-security')].filter(Boolean);
  if (/nuevos? ["“”«»]?espanoles/.test(value) && securitySignal) return [packetById('broad-security')].filter(Boolean);
  if (securitySignal) return [packetById('broad-security')].filter(Boolean);
  const filteredDirect = direct.filter((packet) => packet.id !== 'broad-public-administration' || administrationSignal);
  const familyOrder = { 'broad-immigration-regularization': 1, 'broad-public-services': 2, 'broad-benefits-recipients': 3 };
  const sortFamilies = (items) => items.slice().sort((left, right) => (familyOrder[left.id] || 50) - (familyOrder[right.id] || 50));
  const families = sortFamilies(filteredDirect);
  // A regularisation claim should not be replaced by the broader migration
  // stock/flow packet merely because it also contains “inmigrantes”.
  if (families.some((packet) => packet.id === 'broad-immigration-regularization')) {
    return sortFamilies(families.filter((packet) => packet.id !== 'broad-immigration'));
  }
  if (families.length) return families;
  // Long-form claims often omit the domain noun (for example, “specialist
  // waiting lists” or “rail maintenance”). Route those phrases to the same
  // reviewed context packet instead of leaving them uncovered.
  const match = supplementalRoutes.find(([, pattern]) => pattern.test(value));
  return match ? sortFamilies([packets.find((packet) => packet.id === `broad-${match[0]}`)].filter(Boolean)) : [];
};

export const broadDomainPacketFor = (text) => broadDomainPacketsFor(text)[0];

export const broadMetricIdsFor = (text) => new Set(
  broadDomainPacketsFor(text).flatMap((packet) => packet.criteria.flatMap((criterion) => criterion.metricIds || [])),
);

const formatObservation = (observation, fallbackUnit) => {
  const rawUnit = observation.displayUnit || observation.unit || fallbackUnit || '';
  const value = typeof observation.value === 'number' ? new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2, minimumFractionDigits: /euro|millones|€/i.test(rawUnit) ? 2 : 0 }).format(observation.value) : String(observation.value || '').trim();
  const unit = ({
    old_age_dependency_ratio: 'personas de 65 años o más por cada 100 de 15 a 64 años',
    hospital_beds_per_100k: 'camas por 100.000 habitantes',
    old_age_survivors_benefits_per_capita: '€ por habitante en prestaciones de vejez y supervivencia',
    old_age_survivors_benefits_total: 'millones de euros',
    old_age_survivors_pension_beneficiaries: 'personas beneficiarias',
    social_protection_contributions_total: 'millones de euros',
    social_protection_government_contributions_total: 'millones de euros',
    social_security_contributory_pension_expenditure: 'millones de euros',
    social_security_current_revenue: 'millones de euros',
    social_security_current_expenditure: 'millones de euros',
    social_security_current_balance: 'millones de euros',
    social_security_contributions: 'millones de euros',
    social_security_current_transfers: 'millones de euros',
    social_security_budget_total_balance: 'millones de euros',
    projected_population_65_plus: 'personas proyectadas',
    projected_population_20_64: 'personas proyectadas',
    government_deficit_ratio: '% del PIB de déficit o superávit público',
    government_debt_ratio: '% del PIB de deuda pública',
  }[observation.metricId]) || ({
    'Euro per inhabitant': observation.metricId === 'old_age_survivors_benefits_per_capita' ? '€ por habitante en prestaciones de vejez y supervivencia' : '€ por habitante',
    'Percentage of gross domestic product (GDP)': '% del PIB',
    'Percentage of population in the labour force': '% de población activa',
    'Percentage': '%',
    'Person': 'personas',
    'People': 'personas',
    'Number': 'personas',
    'Euro': '€',
    'INE unit 133': 'índice',
  })[rawUnit] || rawUnit;
  const contextualUnit = observation.metricId === 'government_debt_ratio' && unit === '% del PIB' ? '% del PIB de deuda pública'
    : observation.metricId === 'government_deficit_ratio' && unit === '% del PIB' ? '% del PIB de déficit o superávit público'
      : unit;
  const period = observation.period ? ` (${observation.period})` : '';
  return `${value}${contextualUnit ? ` ${contextualUnit}` : ''}${period}`;
};
const comparableObservationDimensions = (item) => Object.entries(item?.dimensions || {})
  .filter(([key]) => !['time', 'period', 'year', 'anyo', 'fecha', 'averageage', 'average_age'].includes(normalise(key)))
  .sort(([left], [right]) => left.localeCompare(right));
const observationSeriesKey = (item) => JSON.stringify({ metricId: item?.metricId || '', geography: item?.geography || '', unit: item?.unit || '', population: item?.population || '', denominator: item?.denominator || '', dimensions: comparableObservationDimensions(item) });
const uniqueObservations = (items) => [...new Map(items.map((item) => [`${observationSeriesKey(item)}|${item.period || ''}`, item])).values()];
const preferredSeriesForMetric = (items) => {
  const groups = new Map();
  for (const item of uniqueObservations(items)) {
    const key = observationSeriesKey(item);
    const group = groups.get(key) || [];
    group.push(item);
    groups.set(key, group);
  }
  const selected = [...groups.values()].sort((left, right) => {
    const leftGeneral = left.some((item) => /general government|administraciones p[uú]blicas/i.test(JSON.stringify(item.dimensionLabels || {}))) ? 1 : 0;
    const rightGeneral = right.some((item) => /general government|administraciones p[uú]blicas/i.test(JSON.stringify(item.dimensionLabels || {}))) ? 1 : 0;
    return rightGeneral - leftGeneral || right.length - left.length || String(right.at(-1)?.period || '').localeCompare(String(left.at(-1)?.period || ''));
  })[0] || [];
  return selected.slice().sort((left, right) => String(left.period || '').localeCompare(String(right.period || '')));
};
const observationsByMetric = (items) => [...new Set(items.map((item) => item.metricId).filter(Boolean))].flatMap((metricId) => (/imv_title_holder/.test(metricId) ? uniqueObservations(items.filter((item) => item.metricId === metricId)) : preferredSeriesForMetric(items.filter((item) => item.metricId === metricId))));
const latestObservationsByMetric = (items) => observationsByMetric(items).reduce((latest, item) => {
  const current = latest.get(item.metricId);
  if (!current || String(item.period || '') > String(current.period || '')) latest.set(item.metricId, item);
  return latest;
}, new Map()).values();
const observationMetricLabel = (metricId) => ({
  government_deficit_ratio: 'Saldo presupuestario',
  government_debt_ratio: 'Deuda pública',
  social_security_contributory_pension_expenditure: 'Gasto reconocido en pensiones contributivas',
  social_security_current_revenue: 'Ingresos corrientes de la Seguridad Social',
  social_security_current_expenditure: 'Gastos corrientes de la Seguridad Social',
  social_security_current_balance: 'Resultado corriente de la Seguridad Social',
  social_security_contributions: 'Cotizaciones del presupuesto de la Seguridad Social',
  social_security_current_transfers: 'Transferencias corrientes de la Seguridad Social',
  social_security_budget_total_balance: 'Resultado presupuestario total de la Seguridad Social',
  social_security_minimum_complements_transfer_budget: 'Transferencia presupuestada para complementos a mínimos',
  social_security_noncontributory_transfer_budget: 'Transferencia presupuestada para pensiones no contributivas',
  social_security_pact_toledo_transfer_budget: 'Transferencia presupuestada del Pacto de Toledo',
  pension_contributory_income_projected: 'Cotizaciones dedicadas a pensiones proyectadas',
  pension_public_transfers_projected: 'Transferencias de la Administración Central proyectadas',
  pension_contributory_expenditure_projected: 'Gasto contributivo de pensiones proyectado',
  pension_noncontributory_expenditure_projected: 'Gasto no contributivo de pensiones proyectado',
  pension_system_income_projected: 'Ingresos totales del sistema de pensiones proyectados',
  pension_system_expenditure_projected: 'Gastos totales del sistema de pensiones proyectados',
  pension_system_balance_projected: 'Saldo anual del sistema de pensiones proyectado',
  pension_implicit_transfers_projected: 'Transferencias implícitas proyectadas',
  social_security_contributory_pension_budget: 'Pensiones contributivas presupuestadas',
  social_security_pension_complements_minimum_budget: 'Complementos a mínimos presupuestados',
  social_security_noncontributory_pension_budget: 'Pensiones no contributivas presupuestadas',
  social_security_pension_budget_total: 'Gasto total presupuestado en pensiones',
  emergency_wait_declared: 'Espera declarada en urgencias',
  unmet_healthcare_waiting_list_rate: 'Necesidad médica no atendida por lista de espera',
  government_education_expenditure_ratio: 'Gasto público en educación',
  benefit_recipients_by_group: 'Personas beneficiarias del IMV',
  imv_title_holders_by_nationality: 'Titulares del IMV por nacionalidad',
  imv_title_holder_share_by_nationality: 'Proporción de titulares del IMV por nacionalidad',
  cpi_index: 'IPC general (índice, base 2021 = 100)',
  median_hourly_earnings: 'Salario mediano por hora',
  youth_unemployment_rate: 'Desempleo juvenil',
  house_price_index: 'Precio de la vivienda (índice)',
  housing_cost_overburden_rate: 'Sobrecarga del coste de vivienda',
  construction_output_index: 'Producción en construcción (índice)',
  foreign_born_population: 'Residentes nacidos en el extranjero',
  government_revenue_ratio: 'Ingresos públicos',
  government_expenditure_ratio: 'Gasto público',
  government_current_taxes_income_wealth_europe: 'Impuestos corrientes sobre renta y patrimonio',
  hospital_beds_per_100k: 'Camas hospitalarias',
  projected_population_65_plus: 'Población de 65 años o más proyectada',
  projected_population_20_64: 'Población de 20 a 64 años proyectada',
}[metricId] || '');
const formatSeriesData = (items, fallbackUnit) => {
  const selected = observationsByMetric(items);
  const seenMetrics = new Set();
  return selected.flatMap((item) => {
    const seriesKey = observationSeriesKey(item);
    if (seenMetrics.has(seriesKey)) return [];
    seenMetrics.add(seriesKey);
    const metricItems = selected.filter((candidate) => observationSeriesKey(candidate) === seriesKey).sort((a, b) => String(a.period).localeCompare(String(b.period)));
    const first = metricItems[0];
    const latest = metricItems.at(-1);
    const groupLabels = Object.entries(latest.dimensionLabels || latest.dimensions || {})
      .filter(([key]) => /nationality|citizen|birth/i.test(key))
      .map(([, value]) => String(value))
      .filter((value) => !/years?\s*(old|or over)|\btotal\b|all ages|male|female|men|women|ambos sexos/i.test(value));
    const label = [observationMetricLabel(latest.metricId) || latest.metric || latest.metricId, ...groupLabels].filter(Boolean).join(' · ');
    const prefix = label ? `${label}: ` : '';
    return [metricItems.length > 1 ? `Serie localizada: ${prefix}${formatObservation(first, fallbackUnit)} → ${formatObservation(latest, fallbackUnit)}` : `${prefix}${formatObservation(latest, fallbackUnit)}`];
  });
};
const unresolvedMissingDimensionsFor = (criterion, items) => {
  const observations = observationsByMetric(items);
  return (criterion.missingDimensions || []).filter((dimension) => {
    const resolution = (criterion.resolvesMissing || []).find((candidate) => candidate.dimension === dimension);
    if (!resolution) return true;
    const metricIds = Array.isArray(resolution.metricIds) ? resolution.metricIds : [resolution.metricId];
    const minimum = resolution.minimumObservations || 1;
    if (resolution.requireAllMetricIds) return metricIds.some((metricId) => observations.filter((item) => item.metricId === metricId).length < minimum);
    return observations.filter((item) => metricIds.includes(item.metricId)).length < minimum;
  });
};
const evidenceStatusFor = (data, missingDimensions) => data?.length ? (missingDimensions?.length ? 'partial' : 'available') : 'missing';
const periodRangeFromData = (data) => {
  const periods = [...new Set((data || []).flatMap((value) => String(value).match(/\b(?:19|20|21)\d{2}(?:-\d{2}(?:-\d{2})?)?(?=\b|P\b)/g) || []))].sort();
  if (!periods.length) return undefined;
  return periods[0] === periods.at(-1) ? periods[0] : `${periods[0]}–${periods.at(-1)}`;
};
const dimensionsFor = (packet, criterion, data) => ({
  subject: packet.interpretation?.subject,
  population: criterion.population,
  geography: 'España',
  period: periodRangeFromData(data),
  denominator: criterion.denominator,
  unit: criterion.unit,
  causalRequirement: /caus|provoc|efecto/i.test(`${criterion.finding} ${packet.summary}`) ? 'comparación o diseño causal compatible' : undefined,
});

export const composeFamilyReply = (plan, { compact = false } = {}) => {
  const groups = new Map();
  for (const family of plan.evidenceSummary?.families || []) {
    const key = family.familyId || family.label;
    const group = groups.get(key) || { label: family.familyLabel || family.label, limitation: family.limitation, criteria: [], sourceIds: [] };
    group.criteria.push(...(family.criteria?.length ? family.criteria : [family]));
    group.sourceIds.push(...(family.sourceIds || []));
    groups.set(key, group);
  }
  const paragraphs = [...groups.values()].map((group) => {
    const measured = group.criteria.filter((criterion) => criterion.data?.length).sort((a, b) => (b.replyPriority || 0) - (a.replyPriority || 0));
    const primaryMeasured = compact ? measured.filter((criterion) => !/nacionalidad|composici[oó]n/i.test(criterion.label || '')) : measured;
    const orderedMeasured = [...(primaryMeasured.length ? primaryMeasured : measured)].sort((left, right) => Number(right.data?.some((value) => /→/.test(value))) - Number(left.data?.some((value) => /→/.test(value))) || (right.replyPriority || 0) - (left.replyPriority || 0));
    const seenMetricIds = new Set();
    const seenLatestValues = new Set();
    const chosen = orderedMeasured.filter((criterion) => {
      if (!compact || !criterion.metricIds?.length) return true;
      if (criterion.metricIds.some((metricId) => seenMetricIds.has(metricId))) return false;
      criterion.metricIds.forEach((metricId) => seenMetricIds.add(metricId));
      return true;
    }).filter((criterion) => {
      if (!compact || !criterion.data?.length) return true;
      const latest = String(criterion.data.at(-1)).match(/([\d.,]+)[^\d]*(?:19|20|21)\d{2}(?:-\d{2})?/g)?.at(-1)?.replace(/[^\d-]/g, '');
      if (!latest || seenLatestValues.has(latest)) return false;
      seenLatestValues.add(latest);
      return true;
    }).slice(0, compact ? 3 : 2);
    const valueEntries = [...new Set(chosen.flatMap((criterion) => (criterion.data || []).slice(0, compact ? 1 : 2).map((value) => `${criterion.label}: ${String(value).replace(/\s*·\s*(?:16 years or over|Total|All ages)[^:]*:?/gi, '').replace(new RegExp(`^${String(criterion.label).replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}:\\s*`, 'i'), '')}`)))];
    const latestSignature = (value) => value.match(/([\d.,]+)[^\d]*(?:19|20|21)\d{2}(?:-\d{2})?/g)?.at(-1)?.replace(/[^\d-]/g, '');
    const seriesSignatures = new Set(valueEntries.filter((value) => /→/.test(value)).map(latestSignature).filter(Boolean));
    const seriesFinalNumbers = new Set(valueEntries.filter((value) => /→/.test(value)).map((value) => value.match(/→\s*([\d.,]+)/)?.[1]).filter(Boolean));
    const values = valueEntries.filter((value) => !seriesSignatures.has(latestSignature(value)) || /→/.test(value)).filter((value) => /→/.test(value) || ![...seriesFinalNumbers].some((number) => value.includes(number))).join('. ');
    const rawFinding = (compact && group.criteria.find((criterion) => /No hay aquí|no hay .*recuento/i.test(criterion.finding || ''))?.finding) || group.limitation || group.criteria.find((criterion) => !criterion.data?.length)?.finding || chosen[0]?.finding || group.criteria[0]?.finding;
    const finding = compact && rawFinding ? (rawFinding.match(/No hay aquí[^.]*\./)?.[0] || rawFinding.split(/(?<=[.!?])\s+/)[0]) : rawFinding;
    const sourceIds = [...new Set(chosen.flatMap((criterion) => criterion.sourceIds || []))];
    const publishers = [...new Set(sourceIds.map((id) => plan.sourceLinks?.find((source) => source.id === id)?.publisher).filter(Boolean))];
    return `${group.label}. ${values ? values.replace(/Serie localizada: /g, '') + '.' : ''} ${finding || ''}${publishers.length ? ` Fuente: ${publishers.slice(0, 2).join('; ')}.` : ''}`.replace(/ +/g, ' ').trim();
  });
  const lead = plan.headline.replace(/[.]$/, '') + '.';
  if (compact) {
    const conclusion = `Conclusión: ${plan.limitation || plan.summary}`;
    return paragraphs.length ? [...paragraphs.slice(0, -1), `${paragraphs.at(-1)} ${conclusion}`].join('\n\n') : conclusion;
  }
  return [lead, ...paragraphs, `Conclusión: ${plan.limitation || plan.summary}`].join('\n\n');
};

export const answerPlanForBroadDomain = (text, { now = Date.now(), observations = [] } = {}) => {
  const packet = broadDomainPacketFor(text);
  return answerPlanForPacket(packet, { now, observations });
};

const answerPlanForPacket = (packet, { now = Date.now(), observations = [] } = {}) => {
  if (!packet) return undefined;
  packet = supplementReviewedPacket(packet);
  const lifecycle = snapshotLifecycle(BROAD_SNAPSHOT_POLICY, now);
  if (!lifecycle.usable) return undefined;
  const matchedObservations = packet.criteria.map((criterion) => ({
    criterion,
    observations: observations.filter((observation) => broadObservationFits(observation, criterion)),
  }));
  const hasDynamicObservations = matchedObservations.some(({ observations: items }) => items.length > 0);
  const hasSnapshotData = matchedObservations.some(({ criterion, observations: items }) => items.length === 0 && criterion.fallbackData?.length);
  const unresolvedDimensions = matchedObservations.map(({ criterion, observations: items }) => unresolvedMissingDimensionsFor(criterion, items));
  const evidenceIds = [...new Set(packet.criteria.flatMap((item) => item.sourceIds).concat(matchedObservations.flatMap(({ observations: items }) => items.map((item) => item.id).filter(Boolean))))];
  const observationSources = matchedObservations.flatMap(({ observations: items }) => items.map((item) => item.source).filter((source) => source?.id && source?.url && source?.title));
  const planSources = [...new Map([...packet.sources, ...observationSources].map((source) => [source.id, source])).values()];
  const sourceIds = planSources.map((source) => source.id);
  const latestPeriodIn = (values) => periodRangeFromData(values)?.split('–').at(-1) || '';
  const fallbackIsNewer = (item, index) => {
    const matched = matchedObservations[index]?.observations || [];
    const fallback = item.fallbackData || [];
    if (!matched.length || !fallback.length) return false;
    const dynamic = formatSeriesData(matched, item.unit);
    return (item.preferFallbackWhenNewer === true || item.combineFallbackAsSeries === true) && latestPeriodIn(fallback) > latestPeriodIn(dynamic);
  };
  const criterionDataFor = (item, index) => {
    const matched = matchedObservations[index]?.observations || [];
    if (!matched.length) return item.fallbackData?.length ? item.fallbackData : [];
    const dynamic = formatSeriesData(matched, item.unit);
    const fallback = item.fallbackData || [];
    if (item.preferReviewedFallback && fallback.length) return fallback;
    // A warehouse may contain an older release while the reviewed packet has
    // a newer official snapshot. Preserve both only when the snapshot really
    // extends the observed period; never replace a compatible live series
    // with a stale fallback.
    if (item.combineFallbackAsSeries && fallbackIsNewer(item, index)) return [`Serie localizada: ${dynamic.at(-1)} → ${fallback.at(-1)}`];
    if (fallbackIsNewer(item, index)) return fallback;
    // Keep a reviewed multi-period series available for the detail view when
    // a live warehouse response only contains its latest point. The compact
    // answer still selects the latest compatible value; the full view can
    // then render the evolution without inventing a trend.
    if (fallback.some((value) => /→/.test(value)) && !dynamic.some((value) => /→/.test(value))) return [...dynamic, ...fallback];
    return fallback.length && latestPeriodIn(fallback) > latestPeriodIn(dynamic)
      ? [...dynamic, ...fallback]
      : dynamic;
  };
  const missingCriteria = matchedObservations
    .map(({ criterion, observations: items }, index) => ({ criterion, items, missing: unresolvedDimensions[index] }))
    .filter(({ criterion, items, missing }) => !items.length && !criterion.fallbackData?.length && !/\d/.test(criterion.finding) && missing.length)
    .flatMap(({ missing }) => missing);
  const scopedMissingDimensions = [...new Set([
    ...unresolvedDimensions.flat(),
    ...missingCriteria,
  ])];
  const evidenceGap = missingCriteria.length ? {
    type: 'evidence_gap',
    missing: missingCriteria,
    needed: ['una fuente primaria con valores, periodo y ámbito definidos', 'una comparación compatible con la afirmación'],
    nextAction: 'Localizar y mostrar los valores o documentos concretos antes de presentar una conclusión sobre la afirmación.',
  } : undefined;
  const observedPeriods = [...new Set(matchedObservations.filter(({ criterion }) => criterion.dataKind !== 'projected').flatMap(({ observations: items }) => observationsByMetric(items).map((item) => String(item.period || '')).filter(Boolean)))].sort();
  const limitation = observedPeriods.length > 1
    ? `Las series dinámicas observadas abarcan ${observedPeriods[0]}–${observedPeriods.at(-1)}. ${packet.limitations[0]}`
    : packet.limitations[0];
  const plan = {
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
        const found = [...latestObservationsByMetric(matchedObservations[index]?.observations || [])];
        const fallback = item.fallbackData || [];
        return `${item.label}: ${item.finding}${found.length ? ` Datos localizados: ${found.map((observation) => formatObservation(observation, item.unit)).join('; ')}.` : fallback.length ? ` Dato del snapshot: ${fallback.join('; ')}.` : ''}`;
      }) },
      { type: 'cannot_conclude', evidenceIds, points: [limitation] },
      ...(evidenceGap ? [evidenceGap] : []),
      { type: 'conversation_reply', evidenceIds, text: '' },
    ],
    limitation,
    evidenceIds,
    sourceIds,
    sourceLinks: planSources,
    asOf: '2026-09-25',
    ...(packet.warehouseSeries ? { warehouseSeries: packet.warehouseSeries } : {}),
    ...(packet.visuals?.length ? { visuals: packet.visuals.map((visual) => ({ ...visual, evidenceIds: visual.evidenceIds || [visual.sourceId].filter(Boolean) })) } : packet.visual ? { visual: { ...packet.visual, evidenceIds: packet.visual.evidenceIds || [packet.visual.sourceId].filter(Boolean) } } : {}),
    ...(shareableSourcesByPacket[packet.id] ? { shareableSourceIds: shareableSourcesByPacket[packet.id] } : {}),
    evidenceSummary: {
      mode: hasDynamicObservations ? (hasSnapshotData ? 'mixed' : 'dynamic') : 'snapshot',
      families: packet.criteria.map((item, index) => ({
        status: evidenceStatusFor(criterionDataFor(item, index), unresolvedDimensions[index]),
        dimensions: dimensionsFor(packet, item, criterionDataFor(item, index)),
        // A broad packet can contain several substantive evidence families
        // (for example demography, pensions, and public finance). Keep each
        // criterion stable on its own so the result view can render separate
        // sections; compound packets aggregate these entries back into their
        // packet-level family while preserving the criterion metadata.
        familyId: item.familyId || item.id,
        familyLabel: item.familyLabel || item.label,
        criterionId: item.id,
        replyPriority: item.replyPriority,
        label: item.label,
        direction: 'qualifies',
        evidenceIds: [...item.sourceIds, ...(matchedObservations[index]?.observations || []).map((observation) => observation.id).filter(Boolean)],
        sourceIds: [...new Set([...item.sourceIds, ...(matchedObservations[index]?.observations || []).map((observation) => observation.source?.id).filter(Boolean)])],
        ...(unresolvedDimensions[index].length ? { missingDimensions: unresolvedDimensions[index] } : {}),
        finding: item.finding,
        ...(criterionDataFor(item, index).length ? { data: criterionDataFor(item, index) } : {}),
        dataKind: item.dataKind || (matchedObservations[index]?.observations?.length ? 'observed' : item.fallbackData?.length ? 'snapshot' : 'context'),
      })),
      ...(scopedMissingDimensions.length ? { missingDimensions: scopedMissingDimensions.map((item) => item.replace(/^dato concreto sobre /, '')) } : {}),
      ...(hasSnapshotData ? { fallbackReason: packet.replyProfile === 'pension-sustainability'
        ? 'La Cuenta General 2024 y la serie AIReF 2020–2070 están completas dentro de sus respectivos perímetros; cada cifra conserva su periodo, población, denominador y unidad.'
        : hasDynamicObservations
          ? 'Se combinan observaciones dinámicas con datos de referencia revisados; cada valor conserva su periodo y alcance.'
          : 'Los indicadores mostrados son datos de referencia revisados y fechados; cada uno conserva su alcance.' } : {}),
    },
    snapshotPolicy: BROAD_SNAPSHOT_POLICY,
    knowledgeVersion: 'broad-domain-snapshot-7-claims-2026-09',
  };
  plan.blocks.find((block) => block.type === 'conversation_reply').text = composeFamilyReply(plan);
  const shareableReply = shareableReplyForPacket(packet.id, plan.evidenceSummary.families);
  if (shareableReply) plan.shareableReply = shareableReply;
  return plan;
};

export const answerPlanForBroadDomains = (text, { now = Date.now(), observations = [] } = {}) => {
  const familyPlans = broadDomainPacketsFor(text)
    .map((packet) => answerPlanForPacket(packet, { now, observations }))
    .filter(Boolean);
  if (!familyPlans.length) return undefined;
  if (familyPlans.length === 1) return familyPlans[0];

  const familyNames = { 'broad-immigration-regularization': 'Inmigración y regularización', 'broad-public-services': 'Servicios públicos', 'broad-benefits-recipients': 'Prestaciones', 'broad-tax-burden-purchasing-power': 'Fiscalidad y poder adquisitivo', 'broad-youth-living-housing': 'Condiciones de vida jóvenes', 'broad-security': 'Seguridad', 'broad-immigration': 'Migración', 'broad-emergency-election-powers': 'Límites legales y elecciones', 'broad-population-replacement': 'Demografía, capacidad y política', 'broad-agriculture-green-transition': 'Agricultura y normas ambientales' };
  const families = familyPlans.map((plan) => {
    const entries = plan.evidenceSummary?.families || [];
    const criteria = entries.map((family) => ({ id: family.criterionId || family.label.toLocaleLowerCase('es').replace(/[^a-z0-9]+/g, '-'), label: family.label, replyPriority: family.replyPriority, finding: family.finding || '', status: family.status || evidenceStatusFor(family.data, family.missingDimensions), dataKind: family.dataKind, dimensions: family.dimensions, evidenceIds: family.evidenceIds, sourceIds: family.sourceIds, data: family.data, missingDimensions: family.missingDimensions }));
    const status = criteria.some((criterion) => criterion.status === 'partial') || (criteria.some((criterion) => criterion.status === 'available') && criteria.some((criterion) => criterion.status === 'missing')) ? 'partial' : criteria.every((criterion) => criterion.status === 'available') ? 'available' : 'missing';
    return {
      familyId: plan.id,
      familyLabel: familyNames[plan.id] || plan.headline,
      label: familyNames[plan.id] || plan.headline,
      direction: 'qualifies',
      evidenceIds: [...new Set(entries.flatMap((family) => family.evidenceIds || []))],
      sourceIds: [...new Set(entries.flatMap((family) => family.sourceIds || []))],
      status,
      dimensions: { subject: plan.interpretation?.subject, geography: 'España', causalRequirement: /caus|provoc|efecto/i.test(plan.summary || '') ? 'comparación o diseño causal compatible' : undefined },
      finding: plan.summary,
      limitation: plan.limitation,
      criteria,
      data: [...new Set(entries.flatMap((family) => family.data || []))],
      // A criterion can have useful values and still leave a scoped question
      // unresolved (for example, waiting-list data without a collapse
      // threshold). Keep those gaps in the family summary instead of hiding
      // them merely because another value is available in the same family.
      missingDimensions: [...new Set(entries.flatMap((family) => family.missingDimensions || []))],
    };
  });
  const evidenceIds = [...new Set(familyPlans.flatMap((plan) => plan.evidenceIds || []))];
  const sourceIds = [...new Set(familyPlans.flatMap((plan) => plan.sourceIds || []))];
  const gaps = [...new Set(families.flatMap((family) => family.missingDimensions || []))];
  const dataPoints = familyPlans.flatMap((plan) => plan.blocks.find((block) => block.type === 'data_finding')?.points || []);
  const limitations = familyPlans.flatMap((plan) => plan.blocks.find((block) => block.type === 'cannot_conclude')?.points || []);
  const dataForCriterion = (packetId, criterionId) => familyPlans
    .find((familyPlan) => familyPlan.id === packetId)
    ?.evidenceSummary?.families?.flatMap((family) => family.criteria?.length ? family.criteria : [family])
    .find((criterion) => (criterion.criterionId || criterion.id) === criterionId)?.data || [];
  const dataPoint = (packetId, criterionId, pattern) => dataForCriterion(packetId, criterionId).find((value) => pattern.test(value));
  const applications = dataPoint('broad-immigration-regularization', 'regularization-counts', /^Solicitudes:/i);
  const processedCases = dataPoint('broad-immigration-regularization', 'regularization-counts', /^Expedientes tramitados:/i);
  const newAffiliations = dataPoint('broad-immigration-regularization', 'regularization-employment', /afiliaciones? a la Seguridad Social/i);
  const specialistWait = dataPoint('broad-public-services', 'public-service-waiting-list', /espera media para primera consulta externa/i);
  const imvTrend = dataForCriterion('broad-benefits-recipients', 'benefit-trend-causality').find((value) => /→/.test(value));
  const cleanImvTrend = imvTrend?.replace(/^Serie localizada:\s*/i, '');
  const surgeryWaiting = dataPoint('broad-public-services', 'public-service-waiting-list', /121 días de espera media para cirugía no urgente/i);
  const hasRegularizationServicesAndBenefits = ['broad-immigration-regularization', 'broad-public-services', 'broad-benefits-recipients'].every((id) => familyPlans.some((familyPlan) => familyPlan.id === id));
  const shareableReply = hasRegularizationServicesAndBenefits ? [
    'Evidencia limitada.',
    'El RD 316/2026 cubría a solicitantes de protección internacional antes del 1-1-2026 y a personas irregulares llegadas antes de esa fecha. Exigía cinco meses continuados, carecer de antecedentes y no amenazar el orden, seguridad o salud públicos; quienes no pidieron protección debían acreditar trabajo en España, familia elegible o vulnerabilidad. El permiso inicial autorizaba residir y trabajar en España un año; no daba nacionalidad ni ayudas automáticas.',
    applications && processedCases ? `Balance de julio: ${applications.replace(/^Solicitudes:\s*/i, '').replace(/ \([^)]+\)/, '')} solicitudes y ${processedCases.replace(/^Expedientes tramitados:\s*/i, '').replace(/ \([^)]+\)/, '')} tramitadas; no equivalen a permisos concedidos.` : '',
    newAffiliations ? `Al 30 de junio se atribuyeron ${newAffiliations.replace(/ nuevas afiliaciones a la Seguridad Social/i, '').replace(/ \([^)]+\)$/, '')} altas a la Seguridad Social; no son beneficiarios de ayudas.` : '',
    specialistWait && surgeryWaiting ? `SNS (diciembre de 2025): 102 días para primera consulta y 121 para cirugía no urgente (Andalucía 173, Madrid 50); son presiones concretas, no un colapso total.` : specialistWait ? `En el SNS, ${specialistWait.toLocaleLowerCase('es')}; es una presión concreta, no una medición de colapso total.` : '',
    cleanImvTrend ? `IMV en agosto: ${cleanImvTrend.replace(/^beneficiarios del IMV en agosto:\s*/i, '')}. La subida no demuestra dependencia, crecimiento exponencial ni causalidad con la regularización.` : '',
  ].filter(Boolean).join('\n\n') : undefined;
  const plan = {
    id: 'broad-compound-claim',
    schemaVersion: '1',
    evidenceLevel: 'limited',
    headline: `La afirmación mezcla ${families.map((family) => family.familyLabel.toLocaleLowerCase('es')).join(', ')}; las cifras disponibles no demuestran por sí solas las relaciones causales`,
    summary: familyPlans.map((plan) => plan.headline.replace(/[.]$/, '') + '.').join(' '),
    shareableReply,
    shareableSourceIds: ['regularizacion-extraordinaria-solicitudes-julio-2026', 'regularization-law-2026', 'public-services-waiting-list-source', 'benefits-imv-historic-source', 'benefits-imv-august-source', 'benefits-imv-previous-year-source'],
    visuals: familyPlans.flatMap((familyPlan) => familyPlan.visuals?.length ? familyPlan.visuals : familyPlan.visual ? [familyPlan.visual] : []).filter((visual, index, all) => all.findIndex((candidate) => `${candidate.sourceId}:${candidate.title}` === `${visual.sourceId}:${visual.title}`) === index),
    coverage: 'qualified',
    claimType: 'mixed',
    interpretation: { kind: 'mixed', subject: families.map((family) => family.familyLabel).join(', '), subjectType: 'mixed', predicate: 'allegedly_causes', normalizedClaim: text, interpretation: `Se comprueban por separado ${families.length} familias y las relaciones que se afirman entre ellas.` },
    blocks: [
      { type: 'data_finding', evidenceIds, points: dataPoints },
      { type: 'cannot_conclude', evidenceIds, points: [...limitations, 'La simultaneidad de dos series no demuestra causalidad.'] },
      ...(gaps.length ? [{ type: 'evidence_gap', missing: gaps, needed: ['programa, población, periodo, denominador y unidad compatibles'], nextAction: 'Localizar una serie específica para cada familia antes de cuantificar la afirmación.' }] : []),
      { type: 'conversation_reply', evidenceIds, text: '' },
    ],
    limitation: 'Cada cifra responde a su propia medida y población. Las tendencias simultáneas no establecen causalidad.',
    evidenceIds,
    sourceIds,
    sourceLinks: familyPlans.flatMap((plan) => plan.sourceLinks || []).filter((source, index, all) => all.findIndex((item) => item.id === source.id) === index),
    asOf: '2026-09-25',
    evidenceSummary: { mode: families.some((family) => family.data?.length) ? 'mixed' : 'snapshot', families, ...(gaps.length ? { missingDimensions: gaps } : {}), fallbackReason: 'Cada familia conserva solo sus medidas compatibles; no se sustituye una ausencia por una estadística cercana.' },
    snapshotPolicy: BROAD_SNAPSHOT_POLICY,
    knowledgeVersion: 'broad-domain-snapshot-7-claims-2026-09',
  };
  plan.blocks.find((block) => block.type === 'conversation_reply').text = composeFamilyReply(plan, { compact: true });
  return plan;
};
