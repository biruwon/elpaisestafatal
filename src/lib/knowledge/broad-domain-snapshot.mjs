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
      { id: 'exceptional-state', label: 'Regla jurídica', finding: 'Hay que identificar la declaración concreta, su duración, sus medidas y las prórrogas autorizadas; no basta con invocar “emergencia” de forma genérica.', fallbackData: ['Estado de alarma: máximo inicial de 15 días; una prórroga requiere autorización del Congreso (art. 116.2 de la Constitución).', 'Estado de excepción: máximo de 30 días, prorrogable por otro periodo igual con autorización del Congreso (art. 116.3).'], sourceIds: ['constitutional-emergency-powers'] },
      { id: 'election-continuity', label: 'Elecciones', finding: 'Para afirmar que no se convocarían elecciones hace falta una norma, resolución o calendario oficial que produzca ese efecto; el temor o una crisis territorial no lo demuestra.', fallbackData: ['Durante los estados excepcionales no se interrumpe el funcionamiento de los poderes constitucionales y el Congreso no puede disolverse (art. 116.5 de la Constitución).'], sourceIds: ['constitutional-emergency-powers'] },
      { id: 'dictatorship-analogy', label: 'Analogía histórica', finding: 'Que algunas dictaduras comenzaran con medidas excepcionales es un contexto histórico, no una prueba de que una democracia actual siga necesariamente ese mismo camino.', sourceIds: ['constitutional-emergency-powers'] },
    ],
    limitations: ['No se puede confirmar una predicción sobre una “emergencia perpetua” sin una decisión concreta, fechas y norma aplicable. Para evaluar un riesgo real hay que revisar la declaración oficial, sus prórrogas, el control parlamentario y judicial y el calendario electoral.'],
    sources: [source('constitutional-emergency-powers', 'Constitución Española · artículo 116', 'Boletín Oficial del Estado', 'https://www.boe.es/buscar/act.php?id=BOE-A-1978-31229', '1978-12-29')],
  },
  {
    id: 'broad-demography-pension-finance',
    matches: /\b(arbol demografico|estructura demografica|demograf[ií]a|envejecimiento|poblaci[oó]n)\b[\s\S]{0,180}\b(pension|jubilaci[oó]n|cotizaci[oó]n|arcas p[uú]blicas|sostenib|arruin|d[eé]ficit)\w*\b|\b(pension|jubilaci[oó]n|cotizaci[oó]n|arcas p[uú]blicas|sostenib|arruin|d[eé]ficit)\w*[\s\S]{0,180}\b(arbol demografico|estructura demografica|demograf[ií]a|envejecimiento|poblaci[oó]n)\b/i,
    interpretation: { kind: 'mixed', subject: 'demografía y sistema de pensiones', subjectType: 'country', predicate: 'puts_pressure_on', object: 'financiación pública', normalizedClaim: 'cambio demográfico, sostenibilidad de las pensiones y efecto sobre las cuentas públicas', interpretation: 'La frase combina una descripción demográfica, una predicción sobre sostenibilidad y una acusación sobre las cuentas públicas. Cada parte requiere una medida distinta.' },
    headline: 'El envejecimiento puede aumentar la presión sobre las pensiones, pero no demuestra por sí solo una quiebra pública',
    summary: 'La estructura demográfica puede aumentar la presión sobre las pensiones al cambiar la relación entre cotizantes y pensionistas. Eso no basta para afirmar que el sistema sea “completamente insostenible” ni que ya esté arruinando las arcas públicas: hay que separar dependencia demográfica, ingresos por cotizaciones, gasto en pensiones, transferencias, déficit y deuda, con sus periodos y definiciones, antes de emitir ese veredicto.',
    criteria: [
      { id: 'demographic-structure', familyId: 'demography', familyLabel: 'Demografía', label: 'Dependencia demográfica', finding: 'La dependencia de mayores mide una relación demográfica, no la relación efectiva entre cotizantes y pensionistas. “Árbol demográfico invertido” es una descripción retórica, no un indicador estadístico único.', metricIds: ['old_age_dependency_ratio'], population: 'residentes de 65 años o más en relación con residentes de 15 a 64 años', denominator: 'personas de 15 a 64 años', unit: 'personas de 65 años o más por cada 100 de 15 a 64 años', fallbackData: ['29,5 personas de 65 años o más por cada 100 personas de 15 a 64 años (2020)'], sourceIds: ['demography-pension-finance', 'pension-beneficiaries-source'] },
      { id: 'projected-demography', familyId: 'demography', familyLabel: 'Demografía', label: 'Proyección demográfica', finding: 'La proyección de Eurostat es un escenario de referencia: muestra qué ocurriría bajo sus supuestos, no una predicción segura ni una proyección financiera del sistema.', metricIds: ['projected_population_65_plus', 'projected_population_20_64'], population: 'población proyectada de 65 años o más y de 20 a 64 años', denominator: 'personas proyectadas en cada grupo de edad', unit: 'personas proyectadas', missingDimensions: ['proyección demográfica'], resolvesMissing: [{ dimension: 'proyección demográfica', metricIds: ['projected_population_65_plus', 'projected_population_20_64'], minimumObservations: 2, requireAllMetricIds: true }], sourceIds: ['demography-projections-source'] },
      { id: 'contributor-pensioner-ratio', familyId: 'pensions', familyLabel: 'Pensiones', label: 'Cotizantes por pensionista', finding: 'La Seguridad Social publicó una ratio de 2,5 afiliados por pensionista en julio de 2026, máximo desde 2011. Es una medida del momento y no sustituye a una proyección actuarial.', population: 'personas afiliadas y pensionistas incluidos en la ratio publicada', denominator: 'pensionistas', unit: 'cotizantes por pensionista', fallbackData: ['2,5 cotizantes por pensionista (julio de 2026; máximo desde 2011)'], sourceIds: ['social-security-affiliation-source'] },
      { id: 'pension-balance', familyId: 'pensions', familyLabel: 'Pensiones', label: 'Gasto por habitante', finding: 'La sostenibilidad requiere comparar ingresos contributivos, gasto, transferencias y compromisos futuros; el gasto actual aislado no decide el resultado.', metricIds: ['old_age_survivors_benefits_per_capita'], population: 'gasto en prestaciones de protección social para vejez y supervivencia', denominator: 'población residente', unit: '€ por habitante en prestaciones de vejez y supervivencia', fallbackData: ['3.293,16 € por habitante en prestaciones de vejez y supervivencia (2020)'], missingDimensions: ['saldo del sistema', 'proyección de ingresos y gastos'], sourceIds: ['pension-spending-source'] },
      { id: 'pension-beneficiaries', familyId: 'pensions', familyLabel: 'Pensiones', label: 'Personas beneficiarias', finding: 'El recuento de Eurostat cubre personas que reciben pensiones de vejez y supervivencia en todos los esquemas; no equivale por sí solo a cotizantes ni a pensionistas del sistema contributivo español.', metricIds: ['old_age_survivors_pension_beneficiaries'], population: 'personas beneficiarias de pensiones de vejez y supervivencia', denominator: 'personas', unit: 'personas', sourceIds: ['pension-beneficiaries-source'] },
      { id: 'pension-expenditure-total', familyId: 'pensions', familyLabel: 'Pensiones', label: 'Gasto total de vejez y supervivencia', finding: 'El gasto total localizado cubre prestaciones de vejez y supervivencia de todos los esquemas. No es un desglose del gasto contributivo neto ni un saldo del sistema de pensiones.', metricIds: ['old_age_survivors_benefits_total'], population: 'gasto total en prestaciones de protección social para vejez y supervivencia', denominator: 'ninguno; importe agregado', unit: 'millones de euros', missingDimensions: ['gasto contributivo neto'], sourceIds: ['pension-expenditure-total-source'] },
      { id: 'social-contributions', familyId: 'pensions', familyLabel: 'Pensiones', label: 'Cotizaciones sociales', finding: 'Eurostat registra las cotizaciones recibidas por los esquemas de protección social en conjunto. La serie no atribuye esos ingresos exclusivamente a las pensiones.', metricIds: ['social_protection_contributions_total'], population: 'ingresos de los esquemas de protección social procedentes de cotizaciones', denominator: 'ninguno; importe agregado', unit: 'millones de euros', missingDimensions: ['ingresos exclusivamente imputables a pensiones'], sourceIds: ['social-protection-receipts-source'] },
      { id: 'government-financing', familyId: 'pensions', familyLabel: 'Pensiones', label: 'Aportaciones públicas', finding: 'Eurostat registra aportaciones generales de las administraciones a la protección social. No permite tratarlas como transferencias específicas al sistema de pensiones.', metricIds: ['social_protection_government_contributions_total'], population: 'ingresos de los esquemas de protección social procedentes de las administraciones públicas', denominator: 'ninguno; importe agregado', unit: 'millones de euros', missingDimensions: ['transferencias específicas al sistema de pensiones'], sourceIds: ['social-protection-receipts-source'] },
      { id: 'pension-financial-outlook', familyId: 'pensions', familyLabel: 'Pensiones', label: 'Proyección financiera', finding: 'La AIReF proyecta un gasto bruto público en pensiones equivalente al 14,6 % del PIB de media entre 2022 y 2050, medidas de ingresos del 1,6 % y transferencias implícitas que llegarían al 3,0 % del PIB. Es un escenario de proyección, no una quiebra observada.', population: 'gasto bruto público en pensiones, medidas de ingresos y transferencias implícitas proyectadas', denominator: 'PIB', unit: '% del PIB', fallbackData: ['Gasto bruto público en pensiones: 14,6 % del PIB de media (2022–2050)', 'Medidas de ingresos: 1,6 % del PIB de media (2022–2050)', 'Transferencias implícitas del resto de fondos o de la Administración Central: hasta el 3,0 % del PIB en la proyección (2022–2050)'], missingDimensions: ['saldo anual completo del sistema de pensiones'], sourceIds: ['airef-pension-sustainability-source'] },
      { id: 'public-finance-effect', familyId: 'public-finance', familyLabel: 'Arcas públicas', label: 'Saldo y deuda pública', finding: 'Para afirmar que las pensiones ya arruinan las cuentas públicas hay que observar saldo presupuestario, deuda, financiación del sistema y evolución temporal, no solo la existencia de déficit.', metricIds: ['government_deficit_ratio', 'government_debt_ratio'], population: 'administraciones públicas consolidadas', denominator: 'PIB', unit: '% del PIB', fallbackData: ['119,3 % del PIB de deuda pública (2020)'], missingDimensions: ['gasto e ingreso atribuible exclusivamente a pensiones', 'criterio medible para “arruinando”'], resolvesMissing: [{ dimension: 'saldo presupuestario del periodo', metricId: 'government_deficit_ratio', minimumObservations: 1 }, { dimension: 'serie temporal de deuda', metricId: 'government_debt_ratio', minimumObservations: 2 }], sourceIds: ['public-finance-source'] },
    ],
    limitations: ['Las series muestran demografía, beneficiarios, gasto y financiación de la protección social, déficit y deuda, pero no un balance pensionista completo ni una proyección financiera. Por eso no confirman que el sistema sea “completamente insostenible” ni que exista una quiebra inmediata. La presión demográfica y la quiebra pública son afirmaciones diferentes.'],
    sources: [
      source('demography-pension-finance', 'Población y estructura demográfica', 'Eurostat', 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Population_structure_and_ageing', '2025-10-01'),
      source('demography-projections-source', 'Proyecciones de población EUROPOP2023', 'Eurostat', 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/proj_23np?geo=ES&projection=BSL&sex=T&unit=PER&sinceTimePeriod=2022', '2024-03-01'),
      source('pension-spending-source', 'Social protection statistics · old-age and survivors benefits', 'Eurostat', 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Social_protection_statistics', '2025-10-01'),
      source('pension-beneficiaries-source', 'Pension beneficiaries by type · Eurostat', 'Eurostat', 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/spr_pns_ben?geo=ES&spdepm=TOTAL&spscheme=TOTAL&spdepb=OLD_SRV&sex=T&unit=PER&sinceTimePeriod=2015', '2025-10-01'),
      source('pension-expenditure-total-source', 'Total old-age and survivors benefits expenditure · Eurostat', 'Eurostat', 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/spr_exp_func?geo=ES&spdeps=SPR&spfunc=OLD_SRV&unit=MIO_EUR&sinceTimePeriod=2015', '2025-10-01'),
      source('social-protection-receipts-source', 'Social protection receipts by type · Eurostat', 'Eurostat', 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/spr_rec_sumt?geo=ES&unit=MIO_EUR&sinceTimePeriod=2015', '2025-10-01'),
      source('social-security-affiliation-source', 'España supera por primera vez los 22,5 millones de afiliados', 'Ministerio de Inclusión, Seguridad Social y Migraciones', 'https://www.inclusion.gob.es/es/w/espana-supera-por-primera-vez-los-22-5-millones-de-afiliados-medios-tras-crear-mas-de-642.500-empleos-en-el-ultimo-ano', '2026-07-31'),
      source('airef-pension-sustainability-source', 'La regla de gasto de pensiones se cumple formalmente, pero no garantiza la sostenibilidad', 'AIReF', 'https://www.airef.es/es/noticias/la-airef-ratifica-el-resultado-de-2025-la-regla-de-gasto-de-pensiones-se-cumple-formalmente-pero-no-garantiza-la-sostenibilidad/', '2026-05-13'),
      source('public-finance-source', 'Government finance statistics · debt and deficit', 'Eurostat', 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Government_finance_statistics', '2025-10-01'),
    ],
  },
  {
    id: 'broad-public-administration',
    matches: /\b(administraci[oó]n p[uú]blica|empleo p[uú]blico|empleados? p[uú]blicos?|funcionari|oposici[oó]n|plazas? fijas?|servicios? p[uú]blicos?)\b/i,
    interpretation: { kind: 'mixed', subject: 'administración y empleo público', subjectType: 'institution', predicate: 'has_multiple_measures', normalizedClaim: 'plantilla, desempeño y calidad de los servicios públicos', interpretation: 'La frase mezcla una valoración de la administración con acusaciones sobre puestos y conducta individual; son cuestiones distintas y medibles de forma diferente.' },
    headline: 'La administración pública requiere medir plantilla, desempeño y calidad del servicio',
    summary: 'No existe una cifra oficial de puestos “prescindibles” ni una estadística que permita clasificar como vagos a los empleados públicos en general. La oposición establece una relación de empleo regulada, pero no elimina las obligaciones de rendimiento ni demuestra por sí sola falta de actividad. Para evaluar la administración hay que separar plantilla, vacantes, absentismo, carga de trabajo, tiempos de atención, productividad, digitalización y resultados por servicio y territorio.',
    criteria: [
      { id: 'public-employment-definition', label: 'Qué se mide', finding: 'El recuento de efectivos no indica cuántos puestos son prescindibles ni mide rendimiento; no existe una clasificación oficial general de puestos “prescindibles”.', fallbackData: ['3.037.432 empleados públicos; 1.634.510 funcionarios de carrera (enero de 2025)'], sourceIds: ['public-administration-source'] },
      { id: 'public-service-performance', label: 'Desempeño', finding: 'Para evaluar la administración hacen falta tiempos de tramitación, cargas de trabajo, vacantes, absentismo, productividad y resultados del servicio, con una comparación compatible.', missingDimensions: ['tiempos de tramitación', 'carga de trabajo', 'vacantes', 'absentismo', 'productividad', 'resultados comparables por servicio y territorio'], sourceIds: ['public-administration-source'] },
      { id: 'individual-conduct', label: 'Conducta individual', finding: 'Una oposición otorga una relación de empleo regulada; no demuestra por sí sola rendimiento, absentismo o derecho a permanecer sin cumplir sus obligaciones.', missingDimensions: ['persona o puesto concreto', 'registro de desempeño', 'absentismo individual', 'expediente o resultado disciplinario'], sourceIds: ['public-administration-source'] },
    ],
    limitations: ['La frase no aporta un servicio, puesto, territorio, periodo ni indicador. Sin esos datos no se puede estimar cuántos empleos son prescindibles. Una acusación individual exigiría además expedientes de desempeño o absentismo; no puede atribuirse vagancia a un colectivo entero.'],
    sources: [source('public-administration-source', 'Estadística del personal al servicio de las Administraciones Públicas', 'Ministerio para la Transformación Digital y de la Función Pública', 'https://digital.gob.es/funcion-publica/dgfp/registro-central-personal/evolucion-administraciones-publicas', '2025-07-01')],
  },
  {
    id: 'broad-public-services',
    matches: /\b(servicios? p[uú]blicos?|colapso(?:\s+total)?[^.]{0,80}servicios?|sanidad|educaci[oó]n|atenci[oó]n p[uú]blica)\b/i,
    interpretation: { kind: 'quantitative', subject: 'capacidad y resultados de los servicios públicos', subjectType: 'institution', predicate: 'has_multiple_measures', normalizedClaim: 'capacidad, uso y resultados de los servicios públicos', interpretation: '“Colapso total” es una conclusión extrema: hay que identificar el servicio, el territorio, el periodo y el umbral observable que la definiría.' },
    headline: 'El estado de los servicios públicos exige indicadores del servicio concreto',
    summary: 'La expresión “colapso total” no es un indicador estadístico. Para comprobarla hay que medir capacidad, demanda, tiempos de atención, cobertura y resultados del servicio afectado, con periodo y territorio definidos.',
    criteria: [
      { id: 'public-service-capacity', label: 'Capacidad y demanda', metricIds: ['hospital_beds_per_100k', 'emergency_wait_declared'], finding: 'No se puede confirmar un colapso sin identificar el servicio y comparar recursos, demanda y capacidad efectiva en el mismo periodo y territorio.', population: 'camas hospitalarias para atención con ingreso y tiempo declarado de espera en urgencias', denominator: 'población residente para camas; minutos de espera para urgencias', unit: 'camas por 100.000 habitantes; minutos', fallbackData: ['294,6 camas hospitalarias por 100.000 habitantes (2019)', '216,69 minutos de espera declarada en urgencias (2025)'], missingDimensions: ['servicio concreto', 'territorio', 'periodo', 'umbral de colapso'], sourceIds: ['public-services-source', 'public-services-hospital-source', 'public-services-emergency-source'] },
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
    matches: /\b(impuesto|impuestos|irpf|iva|carga fiscal|presi[oó]n fiscal|recaudaci[oó]n|inflaci[oó]n|poder de compra|salarios?|baby boom|gasto p[uú]blico|subir impuestos|subida de impuestos)\w*\b/i,
    interpretation: { kind: 'mixed', subject: 'carga fiscal, precios, salarios y cuentas públicas en España', subjectType: 'country', predicate: 'has_multiple_measures', normalizedClaim: 'evolución de impuestos, poder adquisitivo, gasto público y pensiones', interpretation: 'La afirmación encadena cambios de impuestos, precios, salarios, gasto y jubilación. Son proposiciones separadas y una no prueba la siguiente.' },
    headline: 'Impuestos, precios, salarios y pensiones requieren series separadas',
    summary: 'La carga fiscal, la inflación y el poder adquisitivo no son la misma medida. Para comprobar la frase hay que comparar ingresos públicos, impuestos concretos, precios de consumo, salarios, gasto público y presión demográfica en los mismos periodos y con sus unidades; que varias series suban a la vez no demuestra que una subida de impuestos sea la causa de todo el resultado.',
    criteria: [
      { id: 'tax-revenue', label: 'Ingresos e impuestos', finding: 'Los ingresos públicos y los impuestos sobre renta y riqueza deben distinguirse del tipo legal de IRPF o IVA y del importe que paga cada hogar.', metricIds: ['government_revenue_ratio', 'government_current_taxes_income_wealth_europe'], sourceIds: ['tax-burden-eurostat'] },
      { id: 'prices-and-wages', label: 'Precios y salarios', finding: 'La inflación mide precios; el poder adquisitivo exige compararla con una serie salarial compatible, periodo, población y unidad definidos.', metricIds: ['cpi_index', 'median_hourly_earnings'], sourceIds: ['tax-burden-eurostat'] },
      { id: 'spending-and-pensions', label: 'Gasto y pensiones', finding: 'El gasto público, las prestaciones de vejez y la dependencia demográfica son indicadores distintos; ninguno demuestra por sí solo que el sistema solo pueda sostenerse subiendo impuestos.', metricIds: ['government_expenditure_ratio', 'old_age_survivors_benefits_per_capita', 'old_age_dependency_ratio'], sourceIds: ['tax-burden-eurostat'] },
      { id: 'tax-causality', label: 'Conclusión causal', finding: 'Para afirmar que las pensiones obligan a subir impuestos hace falta identificar decisiones tributarias, periodos, mecanismo y una comparación que descarte otros factores.', missingDimensions: ['impuesto y base afectados', 'serie temporal alineada', 'mecanismo y comparación causal'], sourceIds: ['tax-burden-eurostat'] },
    ],
    limitations: ['Los indicadores agregados pueden mostrar evolución de precios, salarios, recaudación, gasto o dependencia, pero no prueban por sí solos pérdida de poder adquisitivo de todos los hogares ni que el sistema solo aguante subiendo impuestos.'],
    sources: [
      source('tax-burden-eurostat', 'Tax revenue, prices, wages and government finance statistics', 'Eurostat', 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Tax_revenue_statistics', '2025-10-01'),
    ],
  },
  {
    id: 'broad-population-replacement',
    matches: /\b(reemplazo poblacional|reemplaz\w* poblacional|menos iq|menor iq|manipulables?|manipulable|gente que viene)\b/i,
    interpretation: { kind: 'causal', subject: 'población residente, capacidades individuales y decisiones políticas', subjectType: 'group', predicate: 'allegedly_changes', object: 'composición y funcionamiento institucional', normalizedClaim: 'reemplazo poblacional, capacidad cognitiva y aprovechamiento político', interpretation: 'La frase combina una afirmación demográfica con una generalización sobre capacidad individual y una acusación causal sobre políticos. La población puede medirse; las otras partes exigen definiciones y evidencia específica.' },
    headline: 'Un cambio demográfico no demuestra menor capacidad ni manipulación política',
    summary: 'La composición de la población y los flujos migratorios son medibles, pero “reemplazo poblacional” necesita una definición de población y periodo. No hay una categoría estadística válida que permita afirmar que las personas que llegan tienen menor IQ, y esa generalización no demuestra que sean más manipulables ni que los políticos se aprovechen del sistema.',
    criteria: [
      { id: 'population-composition', label: 'Composición demográfica', finding: 'La población nacida fuera de España puede medirse como residentes por país de nacimiento; es un stock y no demuestra por sí solo un reemplazo de la población ni una intención política.', metricIds: ['foreign_born_population'], sourceIds: ['replacement-population-source'] },
      { id: 'cognitive-generalisation', label: 'IQ y capacidades', finding: '“Menor IQ” no identifica una población comparable ni un estudio representativo; no es una propiedad que pueda atribuirse a todas las personas por su origen.', missingDimensions: ['definición de IQ', 'población comparable', 'edad, educación, idioma y periodo', 'estudio representativo'], sourceIds: ['replacement-comparability-source'] },
      { id: 'political-manipulation', label: 'Manipulación y aprovechamiento', finding: 'La acusación sobre políticos y un “sistema podrido” requiere decisiones, actores, mecanismo y resultados observables; no se deduce de la nacionalidad o del país de nacimiento.', missingDimensions: ['actor y decisión concreta', 'mecanismo', 'comparación o control', 'resultado medible'], sourceIds: ['replacement-comparability-source'] },
    ],
    limitations: ['Una variación en la población nacida fuera del país no prueba sustitución deliberada, menor capacidad cognitiva ni manipulación política. Esas conclusiones requieren proposiciones y fuentes independientes.'],
    sources: [
      source('replacement-population-source', 'Población por país de nacimiento en España', 'Eurostat', 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/migr_pop3ctb?geo=ES&age=TOTAL&sex=T&sinceTimePeriod=2015', '2026-08-17'),
      source('replacement-comparability-source', 'Population and social indicators: methodological comparability', 'Eurostat', 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Population_and_population_change_statistics', '2025-10-01'),
    ],
  },
  {
    id: 'broad-benefits-recipients',
    matches: /\b(paguitas?|ayudas? para vivir|dependientes? de las ayudas|prestaciones?|beneficiarios?|subsidios?|rentas? m[ií]nimas?|ingreso m[ií]nimo vital)\b/i,
    interpretation: { kind: 'quantitative', subject: 'personas perceptoras de prestaciones', subjectType: 'group', predicate: 'has_multiple_measures', normalizedClaim: 'alcance y evolución de las prestaciones sociales', interpretation: '“Paguitas” no identifica un programa oficial ni demuestra dependencia, abuso o inactividad. Hay que especificar la prestación, la población, el periodo y el denominador.' },
    headline: 'Las prestaciones deben identificarse por programa, población y periodo',
    summary: '“Paguitas” es una etiqueta coloquial y no una categoría estadística. El número de perceptores, el gasto y la duración dependen del programa; no permiten por sí solos afirmar que una población necesite ayudas para vivir ni que su aumento sea exponencial.',
    criteria: [
      { id: 'benefit-programme', label: 'Programa y alcance', finding: '“Paguitas” no es una categoría oficial. El Ingreso Mínimo Vital (IMV) ofrece un programa concreto que puede medirse, pero no representa automáticamente todas las prestaciones.', population: 'hogares y personas beneficiarias del IMV', denominator: 'hogares perceptores y personas beneficiarias', unit: 'hogares y personas', fallbackData: ['Programa identificado para la comprobación: Ingreso Mínimo Vital (IMV), julio de 2026'], missingDimensions: ['cobertura de todos los programas de prestaciones'], sourceIds: ['benefits-imv-source', 'benefits-statistics-source'] },
      { id: 'benefit-recipients', label: 'Perceptores', metricIds: ['benefit_recipients_by_group'], preferFallbackWhenNewer: true, finding: 'El balance oficial del IMV de julio de 2026 registra 879.225 hogares y 2.682.646 personas beneficiarias. Son cifras del IMV, no del conjunto de ayudas ni una medida de dependencia económica.', population: 'personas y hogares beneficiarios del IMV en España', denominator: 'hogares perceptores y personas beneficiarias', unit: 'personas y hogares', fallbackData: ['2.682.646 personas beneficiarias en 879.225 hogares (IMV, 2026-07; julio de 2026)'], missingDimensions: ['cobertura de todos los programas de prestaciones'], sourceIds: ['benefits-imv-source'] },
      { id: 'benefit-composition', label: 'Composición del IMV', metricIds: ['imv_title_holders_by_nationality', 'imv_title_holder_share_by_nationality'], finding: 'En el dossier oficial del IMV de julio de 2026, el 82,53 % de los titulares tenía nacionalidad española y el 17,47 % extranjera. La composición de titulares no demuestra por sí sola necesidad, abuso o causalidad.', population: 'titulares del IMV por nacionalidad', denominator: 'total de titulares del IMV', unit: '% de titulares del IMV y personas titulares', missingDimensions: ['comparación con la población elegible de cada grupo'], sourceIds: ['benefits-imv-source'] },
      { id: 'benefit-trend-causality', label: 'Evolución y causalidad', metricIds: ['benefit_recipients_by_group'], combineFallbackAsSeries: true, finding: '“Incremento exponencial” requiere una serie temporal y una tasa definida. Una coincidencia temporal con la inmigración no demuestra que una medida migratoria cause el aumento.', fallbackData: ['2.682.646 personas beneficiarias en 879.225 hogares (IMV, 2026-07; julio de 2026)'], missingDimensions: ['tasa de crecimiento comparable entre programas', 'diseño causal'], resolvesMissing: [{ dimension: 'serie temporal', metricId: 'benefit_recipients_by_group', minimumObservations: 2 }], sourceIds: ['benefits-imv-source'] },
    ],
    limitations: ['El IMV aporta una medición concreta de personas y hogares, pero no cubre automáticamente todas las prestaciones. Sin una serie comparable y un diseño causal no se puede afirmar un incremento exponencial, dependencia económica ni que una regularización lo haya provocado.'],
    sources: [source('benefits-imv-source', 'El Ingreso Mínimo Vital llega en julio a cerca de 2,7 millones de personas', 'Instituto Nacional de la Seguridad Social', 'https://revista.seg-social.es/-/el-ingreso-m%C3%ADnimo-vital-llega-en-julio-a-cerca-de-2-7-millones-de-personas-que-residen-en-879.225-hogares?redirect=%2F', '2026-07-01'), source('benefits-statistics-source', 'Social protection statistics', 'Eurostat', 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Social_protection_statistics', '2025-10-01')],
  },
  {
    id: 'broad-youth-living-housing',
    matches: /\b(j[oó]ven(?:es)?|juventud|poblaci[oó]n joven)\b[\s\S]{0,220}\b(viviend|alquil|coste de vida|salari|sueldo|padres|emigr|oportunidad)\w*\b|\b(viviend|alquil|coste de vida|salari|sueldo|padres|emigr|oportunidad)\w*[\s\S]{0,220}\b(j[oó]ven(?:es)?|juventud|poblaci[oó]n joven)\b/i,
    interpretation: { kind: 'mixed', subject: 'condiciones de vida de la población joven', subjectType: 'group', predicate: 'faces_multiple_constraints', object: 'empleo, precios y acceso a vivienda', normalizedClaim: 'coste de vida, salarios, oportunidades y acceso joven a la vivienda', interpretation: 'La afirmación combina evolución de precios, ingresos, empleo, vivienda y una pregunta contrafactual sobre el apoyo familiar. Son dimensiones distintas y no deben resumirse en un único índice.' },
    headline: 'La situación joven exige separar precios, salarios, empleo, vivienda y apoyo familiar',
    summary: 'La precariedad o la falta de oportunidades de la población joven no se pueden medir con el precio de la vivienda por sí solo. Hay que comprobar por separado el coste de vida, la evolución de los ingresos, el empleo juvenil, los precios y el esfuerzo de vivienda, la construcción y la emancipación; la pregunta sobre cuántas personas emigrarían sin ayuda familiar es contrafactual y no tiene una cifra observada equivalente.',
    criteria: [
      { id: 'youth-cost-of-living', label: 'Coste de vida', finding: 'El IPC mide la evolución de los precios de consumo, no cuánto puede pagar cada joven ni el coste específico de una vivienda.', metricIds: ['cpi_index'], sourceIds: ['youth-living-eurostat'] },
      { id: 'youth-income-employment', label: 'Ingresos y empleo', finding: 'La evolución salarial y el desempleo juvenil deben medirse con series separadas y con su población, unidad y periodo definidos.', metricIds: ['median_hourly_earnings', 'youth_unemployment_rate'], sourceIds: ['youth-labour-eurostat'] },
      { id: 'youth-housing-access', label: 'Vivienda', finding: 'El precio de la vivienda y la sobrecarga de costes describen presión residencial, pero no prueban por sí solos que nadie pueda comprar ni explican el papel de cada territorio.', metricIds: ['house_price_index', 'housing_cost_overburden_rate'], sourceIds: ['youth-housing-eurostat'] },
      { id: 'youth-supply', label: 'Oferta', finding: 'La construcción puede medirse con su índice de producción, pero no equivale automáticamente a viviendas disponibles para jóvenes ni a precios asequibles.', metricIds: ['construction_output_index'], sourceIds: ['youth-housing-eurostat'] },
      { id: 'family-support-counterfactual', label: 'Apoyo familiar y emigración', finding: 'No hay una estadística observada que indique cuántos jóvenes emigrarían si no recibieran ayuda o patrimonio familiar; es un contrafactual que requiere una encuesta o modelo explícito.', missingDimensions: ['encuesta o modelo contrafactual', 'población joven de referencia', 'periodo', 'definición de emigración evitada'], sourceIds: ['youth-emancipation-source'] },
    ],
    limitations: ['Sin edad, ciudad o territorio, periodo y definición de “precariedad” no se puede estimar la imposibilidad de comprar una vivienda. Tampoco se puede convertir la convivencia con los padres en un número de emigraciones evitadas sin una hipótesis identificable.'],
    sources: [
      source('youth-living-eurostat', 'Consumer prices and cost of living indicators', 'Eurostat', 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Consumer_prices_-_inflation', '2025-10-01'),
      source('youth-labour-eurostat', 'Youth labour market statistics', 'Eurostat', 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Youth_statistics_-_employment', '2025-10-01'),
      source('youth-housing-eurostat', 'Housing in Europe — statistics on housing conditions', 'Eurostat', 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Housing_in_Europe', '2025-10-01'),
      source('youth-emancipation-source', 'Observatorio de Emancipación', 'Consejo de la Juventud de España', 'https://www.cje.org/', '2025-10-01'),
    ],
  },
  {
    id: 'broad-immigration-regularization',
    matches: /\b(legalizaci[oó]n|regularizaci[oó]n|regularizar|regularizad[ao]s?|residencia legal)\b/i,
    interpretation: { kind: 'legal', subject: 'personas migrantes en España', subjectType: 'group', predicate: 'is_covered_by', object: 'un proceso de regularización o legalización', normalizedClaim: 'existencia, alcance y resultado de una medida de regularización migratoria', interpretation: '“Legalización masiva” es una etiqueta imprecisa: hay que identificar la norma o programa y distinguir solicitudes, expedientes tramitados y autorizaciones concedidas.' },
    headline: 'Regularización y legalización no son una sola cifra',
    summary: 'Para comprobar una supuesta legalización masiva hay que identificar la norma o programa, su fecha y sus requisitos. Una regularización puede admitir solicitudes extraordinarias para personas que ya residen en España, pero las solicitudes, los expedientes tramitados y las autorizaciones concedidas son cifras distintas.',
    criteria: [
      { id: 'regularization-measure', label: 'Medida concreta', finding: 'El término “legalización masiva” no identifica por sí solo una ley, decreto o programa; hace falta localizar la norma y comprobar su alcance, requisitos y exclusiones.', missingDimensions: ['norma o programa', 'fecha', 'requisitos y exclusiones'], sourceIds: ['regularizacion-extraordinaria-solicitudes-julio-2026'] },
      { id: 'regularization-counts', label: 'Cifras del proceso', finding: 'El balance oficial localizado registra 1.174.978 solicitudes y 609.737 expedientes tramitados; ninguna de esas cifras equivale automáticamente a autorizaciones concedidas.', fallbackData: ['Solicitudes: 1.174.978 (2026-07-02)', 'Expedientes tramitados: 609.737 (2026-07-02)'], sourceIds: ['regularizacion-extraordinaria-solicitudes-julio-2026'] },
      { id: 'legal-status', label: 'Resultado jurídico', finding: 'Para saber cuántas personas obtuvieron autorización hay que consultar resoluciones concedidas, denegadas y pendientes, además del tipo y duración del permiso.', missingDimensions: ['autorizaciones concedidas', 'denegaciones', 'expedientes pendientes', 'tipo y duración del permiso'], sourceIds: ['regularizacion-requisitos-antecedentes-2026'] },
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
    matches: /\b(delincuenc|criminal|delito|seguridad|insegur|calle|salir|polic[ií]a|droga|judicial|disuasor|denuncia)\w*\b/i,
    interpretation: { kind: 'quantitative', subject: 'seguridad en España', subjectType: 'country', predicate: 'has_distinct_offence_and_perception_measures', normalizedClaim: 'delincuencia, seguridad y experiencia del espacio público en España', interpretation: 'La delincuencia nacional, los delitos concretos y la sensación de inseguridad no son la misma medida.', confidence: 0.72, evidenceNeeds: ['categoría de delito', 'periodo', 'territorio', 'medida'] },
    headline: 'La seguridad no se puede resumir en una sola cifra de delincuencia',
    summary: 'Los datos nacionales no describen automáticamente lo que ocurre en una calle concreta. En 2025 la delincuencia convencional bajó ligeramente mientras la ciberdelincuencia creció; ambos fenómenos pueden coexistir con problemas locales y con una percepción real de inseguridad.',
    criteria: [
      { id: 'total-offences', label: 'Total y composición', finding: 'El balance nacional separa infracciones totales, delincuencia convencional y cibercriminalidad; no son una única medida de inseguridad.', fallbackData: ['2,47 millones de infracciones (2025); delincuencia convencional −0,2%; cibercriminalidad +5,3% (2025)'], sourceIds: ['security-balance'] },
      { id: 'conventional-rate', label: 'Delincuencia convencional', finding: 'La tasa convencional permite comparar el volumen registrado con la población; por sí sola no describe cada calle ni cada delito.', fallbackData: ['40,4 infracciones convencionales por mil habitantes (2025)'], sourceIds: ['security-balance'] },
      { id: 'scope', label: 'Alcance', finding: 'Una tendencia nacional puede convivir con deterioro en un barrio, estación o zona turística; hace falta una categoría y un territorio concretos.', sourceIds: ['security-balance'] },
      { id: 'group-causality', label: 'Grupo y causalidad', finding: 'Los totales nacionales no permiten afirmar que un grupo definido por nacionalidad u origen sea responsable de acuchillamientos, robos, violaciones o palizas. Esa conclusión exige tasas comparables y ajuste por edad, sexo, exposición y territorio.', missingDimensions: ['delito concreto', 'grupo y denominador', 'edad, sexo y territorio', 'periodo comparable', 'diseño causal'], sourceIds: ['security-balance'] },
      { id: 'institutional-response', label: 'Policía y justicia', finding: 'La afirmación de que “nadie hace nada” requiere medir recursos, denuncias, tiempos de respuesta, resoluciones y resultados por servicio; el total de delitos no mide por sí solo la actuación institucional.', missingDimensions: ['medida u organismo', 'periodo', 'indicador de respuesta', 'resultado del servicio'], sourceIds: ['security-balance'] },
      { id: 'loaded-label', label: '“Wokismo”', finding: '“Wokismo” es una etiqueta política, no una categoría estadística. No se puede usar para explicar una tendencia delictiva sin identificar una política o actuación concreta y medir su efecto.', missingDimensions: ['política o actuación concreta', 'definición operativa', 'periodo', 'resultado comparable'], sourceIds: ['security-balance'] },
    ],
    limitations: ['“No se puede salir a la calle” expresa una experiencia o valoración que las estadísticas nacionales no pueden confirmar literalmente. Para comprobarla hacen falta lugar, periodo, delito o datos de victimización.'],
    sources: [
      source('security-balance', 'Balance de Criminalidad 2025', 'Ministerio del Interior', 'https://www.interior.gob.es/opencms/es/prensa/balances-e-informes/', '2026-01-01'),
    ],
  },
];

const normalise = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n');

export const BROAD_SNAPSHOT_POLICY = Object.freeze({ owner: 'knowledge-review', createdAt: '2026-08-20', expiresAt: '2026-11-20', refreshCommand: 'npm run knowledge:domain-refresh', validationStatus: 'reviewed', supportedScope: 'España, contexto nacional y fuentes citadas en cada packet', unsupportedScope: 'atribución causal, barrios concretos y generalizaciones no medidas' });

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
  const administrationSignal = /administraci[oó]n|funcionari|oposici[oó]n|plantilla|absentismo|puestos? prescindibles?|empleo p[uú]blico/i.test(value);
  const demographyPensionSignal = /arbol demografico|estructura demografica|demograf[ií]a|envejecimiento/i.test(value) && /pension|jubilaci[oó]n|cotizaci[oó]n|arcas p[uú]blicas|sostenib|arruin|deficit/i.test(value);
  const youthSignal = /j[oó]ven|juventud|poblaci[oó]n joven/i.test(value) && /viviend|alquil|coste de vida|salari|sueldo|padres|emigr|oportunidad|precar/i.test(value);
  const taxSignal = /\b(impuestos?|irpf|iva|carga fiscal|presi[oó]n fiscal|recaudaci[oó]n|poder de compra|subir impuestos|subida de impuestos)\b/i.test(value);
  const replacementSignal = /reemplazo poblacional|reemplaz\w* poblacional|menos iq|menor iq|manipulables?|manipulable|gente que viene/i.test(value);
  const securitySignal = /\b(delincuenc\w*|criminal\w*|acuchill\w*|roba\w*|robo\w*|hurt\w*|viola\w*|violac\w*|paliza\w*|insegur\w*|polic[ií]a|justicia|wokismo)\b/i.test(value);
  const compoundSignal = /legalizaci[oó]n|regularizaci[oó]n|regularizar/i.test(value) && /servicios? p[uú]blicos?|colapso/i.test(value) && /paguitas?|prestaci[oó]n|ayuda|subsidio|renta m[ií]nima|ingreso m[ií]nimo|benefici/i.test(value);
  const packetById = (id) => packets.find((packet) => packet.id === id);
  // Strong multi-proposition routes are resolved before broad keyword matches.
  // This keeps a claim about one subject from inheriting nearby but incompatible
  // packets such as generic taxes, pensions, employment or economy context.
  if (compoundSignal) return ['broad-immigration-regularization', 'broad-public-services', 'broad-benefits-recipients'].map(packetById).filter(Boolean);
  if (replacementSignal) return [packetById('broad-population-replacement')].filter(Boolean);
  if (administrationSignal) return [packetById('broad-public-administration')].filter(Boolean);
  if (demographyPensionSignal) return [packetById('broad-demography-pension-finance')].filter(Boolean);
  if (youthSignal) return [packetById('broad-youth-living-housing')].filter(Boolean);
  if (taxSignal && (/inflaci[oó]n|poder de compra|salari|baby boom|gasto p[uú]blico|pensiones?/.test(value) || /impuesto|irpf|iva|carga fiscal|presi[oó]n fiscal/.test(value))) return [packetById('broad-tax-burden-purchasing-power')].filter(Boolean);
  if (/\b(inmigr\w*|migrant\w*|extranj\w*|migrator\w*)\b/i.test(value) && securitySignal) return [packetById('broad-immigration-security')].filter(Boolean);
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
  const value = typeof observation.value === 'number' ? new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(observation.value) : String(observation.value || '').trim();
  const rawUnit = observation.displayUnit || observation.unit || fallbackUnit || '';
  const unit = ({
    old_age_dependency_ratio: 'personas de 65 años o más por cada 100 de 15 a 64 años',
    hospital_beds_per_100k: 'camas por 100.000 habitantes',
    old_age_survivors_benefits_per_capita: '€ por habitante en prestaciones de vejez y supervivencia',
    old_age_survivors_benefits_total: 'millones de euros',
    old_age_survivors_pension_beneficiaries: 'personas beneficiarias',
    social_protection_contributions_total: 'millones de euros',
    social_protection_government_contributions_total: 'millones de euros',
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
const observationSeriesKey = (item) => JSON.stringify({ metricId: item?.metricId || '', dimensions: comparableObservationDimensions(item) });
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
const observationsByMetric = (items) => [...new Set(items.map((item) => item.metricId).filter(Boolean))].flatMap((metricId) => preferredSeriesForMetric(items.filter((item) => item.metricId === metricId)));
const latestObservationsByMetric = (items) => observationsByMetric(items).reduce((latest, item) => {
  const current = latest.get(item.metricId);
  if (!current || String(item.period || '') > String(current.period || '')) latest.set(item.metricId, item);
  return latest;
}, new Map()).values();
const observationMetricLabel = (metricId) => ({
  government_deficit_ratio: 'Saldo presupuestario',
  government_debt_ratio: 'Deuda pública',
  hospital_beds_per_100k: 'Camas hospitalarias',
  projected_population_65_plus: 'Población de 65 años o más proyectada',
  projected_population_20_64: 'Población de 20 a 64 años proyectada',
}[metricId] || '');
const formatSeriesData = (items, fallbackUnit) => {
  const selected = observationsByMetric(items);
  const seenMetrics = new Set();
  return selected.flatMap((item) => {
    if (seenMetrics.has(item.metricId)) return [];
    seenMetrics.add(item.metricId);
    const metricItems = selected.filter((candidate) => candidate.metricId === item.metricId);
    const first = metricItems[0];
    const latest = metricItems.at(-1);
    const label = observationMetricLabel(latest.metricId);
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
const evidenceStatusFor = (data, missingDimensions, snapshotOnly = false) => data?.length ? (missingDimensions?.length || snapshotOnly ? 'partial' : 'available') : 'missing';
const periodRangeFromData = (data) => {
  const periods = [...new Set((data || []).flatMap((value) => String(value).match(/\b(?:19|20|21)\d{2}(?:-\d{2}(?:-\d{2})?)?\b/g) || []))].sort();
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

export const answerPlanForBroadDomain = (text, { now = Date.now(), observations = [] } = {}) => {
  const packet = broadDomainPacketFor(text);
  return answerPlanForPacket(packet, { now, observations });
};

const answerPlanForPacket = (packet, { now = Date.now(), observations = [] } = {}) => {
  if (!packet) return undefined;
  const lifecycle = snapshotLifecycle(BROAD_SNAPSHOT_POLICY, now);
  if (!lifecycle.usable) return undefined;
  const matchedObservations = packet.criteria.map((criterion) => ({
    criterion,
    observations: observations.filter((observation) => criterion.metricIds?.includes(observation.metricId) && typeof observation.value === 'number' && Number.isFinite(observation.value)),
  }));
  const hasDynamicObservations = matchedObservations.some(({ observations: items }) => items.length > 0);
  const hasSnapshotData = matchedObservations.some(({ criterion, observations: items }) => items.length === 0 && criterion.fallbackData?.length);
  const unresolvedDimensions = matchedObservations.map(({ criterion, observations: items }) => unresolvedMissingDimensionsFor(criterion, items));
  const evidenceIds = [...new Set(packet.criteria.flatMap((item) => item.sourceIds).concat(matchedObservations.flatMap(({ observations: items }) => items.map((item) => item.id).filter(Boolean))))];
  const sourceIds = [...new Set(packet.sources.map((item) => item.id))];
  const cleanQuantitative = (value) => String(value).trim().replace(/[.;]\s*$/, '');
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
    // A warehouse may contain an older release while the reviewed packet has
    // a newer official snapshot. Preserve both only when the snapshot really
    // extends the observed period; never replace a compatible live series
    // with a stale fallback.
    if (item.combineFallbackAsSeries && fallbackIsNewer(item, index)) return [`Serie localizada: ${dynamic.at(-1)} → ${fallback.at(-1)}`];
    if (fallbackIsNewer(item, index)) return fallback;
    return fallback.length && latestPeriodIn(fallback) > latestPeriodIn(dynamic)
      ? [...dynamic, ...fallback]
      : dynamic;
  };
  const quantitativeFindings = matchedObservations.flatMap(({ criterion, observations: items }, index) => fallbackIsNewer(criterion, index)
    ? criterionDataFor(criterion, index).map((value) => `${criterion.label}: ${cleanQuantitative(value)}`)
    : [...latestObservationsByMetric(items)].map((item) => {
    const metricLabel = observationMetricLabel(item.metricId);
    return `${criterion.label}${metricLabel ? ` · ${metricLabel}` : ''}: ${formatObservation(item, criterion.unit)}`;
  }));
  matchedObservations.forEach(({ criterion, observations: items }, index) => {
    const data = criterionDataFor(criterion, index);
    const dynamic = items.length ? formatSeriesData(items, criterion.unit) : [];
    const dynamicText = new Set(dynamic);
    const additional = data.filter((value) => !dynamicText.has(value));
    if (!fallbackIsNewer(criterion, index) && additional.length) quantitativeFindings.push(...additional.map((value) => `${criterion.label}: ${cleanQuantitative(value)}`));
  });
  const reviewedQuantitativeFindings = packet.criteria
    .map((item) => item.finding)
    .filter((finding) => /\d/.test(finding))
    .map(cleanQuantitative);
  quantitativeFindings.push(...reviewedQuantitativeFindings.slice(0, Math.max(0, 2 - quantitativeFindings.length)));
  const missingCriteria = matchedObservations
    .map(({ criterion, observations: items }, index) => ({ criterion, items, missing: unresolvedDimensions[index] }))
    .filter(({ criterion, items, missing }) => !items.length && !criterion.fallbackData?.length && !/\d/.test(criterion.finding) && missing.length)
    .flatMap(({ missing }) => missing.map((dimension) => `dato concreto sobre ${dimension}`));
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
  const observedPeriods = [...new Set(matchedObservations.flatMap(({ observations: items }) => observationsByMetric(items).map((item) => String(item.period || '')).filter(Boolean)))].sort();
  const limitation = observedPeriods.length > 1
    ? `Las series observadas abarcan ${observedPeriods[0]}–${observedPeriods.at(-1)}. ${packet.limitations[0]}`
    : packet.limitations[0];
  const conversationReply = [
    `${packet.headline}.`,
    quantitativeFindings.length ? `${hasDynamicObservations ? 'Valores observados' : 'Indicadores contextuales observados'}: ${quantitativeFindings.join('; ')}.` : 'No se localizaron valores compatibles para las dimensiones de esta afirmación.',
    evidenceGap ? 'Quedan sin resolver varias dimensiones de esta afirmación; se detallan en las secciones de evidencia.' : undefined,
    limitation,
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
        const found = [...latestObservationsByMetric(matchedObservations[index]?.observations || [])];
        const fallback = item.fallbackData || [];
        return `${item.label}: ${item.finding}${found.length ? ` Datos localizados: ${found.map((observation) => formatObservation(observation, item.unit)).join('; ')}.` : fallback.length ? ` Dato del snapshot: ${fallback.join('; ')}.` : ''}`;
      }) },
      { type: 'cannot_conclude', evidenceIds, points: [limitation] },
      ...(evidenceGap ? [evidenceGap] : []),
      { type: 'conversation_reply', evidenceIds, text: conversationReply },
    ],
    limitation,
    evidenceIds,
    sourceIds,
    sourceLinks: packet.sources,
    asOf: '2026-08-20',
    evidenceSummary: {
      mode: hasDynamicObservations ? (hasSnapshotData ? 'mixed' : 'dynamic') : 'snapshot',
      families: packet.criteria.map((item, index) => ({
        status: evidenceStatusFor(criterionDataFor(item, index), unresolvedDimensions[index], !matchedObservations[index]?.observations?.length && Boolean(item.fallbackData?.length)),
        dimensions: dimensionsFor(packet, item, criterionDataFor(item, index)),
        // A broad packet can contain several substantive evidence families
        // (for example demography, pensions, and public finance). Keep each
        // criterion stable on its own so the result view can render separate
        // sections; compound packets aggregate these entries back into their
        // packet-level family while preserving the criterion metadata.
        familyId: item.familyId || item.id,
        familyLabel: item.familyLabel || item.label,
        criterionId: item.id,
        label: item.label,
        direction: 'qualifies',
        evidenceIds: [...item.sourceIds, ...(matchedObservations[index]?.observations || []).map((observation) => observation.id).filter(Boolean)],
        sourceIds: item.sourceIds,
        ...(unresolvedDimensions[index].length ? { missingDimensions: unresolvedDimensions[index] } : {}),
        finding: item.finding,
        ...(criterionDataFor(item, index).length ? { data: criterionDataFor(item, index) } : {}),
      })),
      ...(scopedMissingDimensions.length ? { missingDimensions: scopedMissingDimensions.map((item) => item.replace(/^dato concreto sobre /, '')) } : {}),
      ...(hasSnapshotData ? { fallbackReason: 'No se encontró una serie dinámica suficientemente compatible; los indicadores mostrados son contexto revisado y fechado, no un balance completo.' } : {}),
    },
    snapshotPolicy: BROAD_SNAPSHOT_POLICY,
    knowledgeVersion: 'broad-domain-snapshot-1',
  };
};

export const answerPlanForBroadDomains = (text, { now = Date.now(), observations = [] } = {}) => {
  const familyPlans = broadDomainPacketsFor(text)
    .map((packet) => answerPlanForPacket(packet, { now, observations }))
    .filter(Boolean);
  if (!familyPlans.length) return undefined;
  if (familyPlans.length === 1) return familyPlans[0];

  const familyNames = { 'broad-immigration-regularization': 'Inmigración y regularización', 'broad-public-services': 'Servicios públicos', 'broad-benefits-recipients': 'Prestaciones' };
  const families = familyPlans.map((plan) => {
    const entries = plan.evidenceSummary?.families || [];
    const criteria = entries.map((family) => ({ id: family.criterionId || family.label.toLocaleLowerCase('es').replace(/[^a-z0-9]+/g, '-'), label: family.label, finding: family.finding || '', status: family.status || evidenceStatusFor(family.data, family.missingDimensions), dimensions: family.dimensions, evidenceIds: family.evidenceIds, sourceIds: family.sourceIds, data: family.data, missingDimensions: family.missingDimensions }));
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
  const observed = families.flatMap((family) => family.data || []);
  const reply = [
    'La frase mezcla tres afirmaciones distintas: regularización migratoria, capacidad de los servicios públicos y prestaciones.',
    observed.length ? `En el balance oficial localizado constan ${observed.join(' y ').replace(/\.{2,}/g, '.')}.` : undefined,
    'No se ha localizado una medición compatible para “colapso total” ni para “incremento exponencial” de una categoría de prestaciones no especificada.',
    'Las cifras disponibles no demuestran por sí solas que una regularización provoque un colapso de los servicios o un aumento de las prestaciones. La simultaneidad temporal no prueba causalidad.',
  ].filter(Boolean).join(' ');
  return {
    id: 'broad-compound-claim',
    schemaVersion: '1',
    evidenceLevel: 'limited',
    headline: 'La frase mezcla regularización, servicios públicos y prestaciones; cada parte requiere su propia evidencia',
    summary: 'Las tres partes deben comprobarse con poblaciones, periodos, denominadores y unidades compatibles. Un dato sobre una familia no sustituye al de otra.',
    coverage: 'qualified',
    claimType: 'mixed',
    interpretation: { kind: 'mixed', subject: 'regularización, servicios públicos y prestaciones', subjectType: 'mixed', predicate: 'allegedly_causes', normalizedClaim: 'efectos de una regularización sobre servicios públicos y prestaciones', interpretation: 'La frase contiene una medida migratoria, dos resultados extremos y una relación causal; se mantienen separados.' },
    blocks: [
      { type: 'data_finding', evidenceIds, points: dataPoints },
      { type: 'cannot_conclude', evidenceIds, points: [...limitations, 'La simultaneidad de dos series no demuestra que una medida migratoria cause el resultado observado.'] },
      ...(gaps.length ? [{ type: 'evidence_gap', missing: gaps, needed: ['programa, población, periodo, denominador y unidad compatibles'], nextAction: 'Localizar una serie específica para cada familia antes de cuantificar la afirmación.' }] : []),
      { type: 'conversation_reply', evidenceIds, text: reply },
    ],
    limitation: 'Los datos deben mantenerse separados por familia y no prueban por sí solos colapso, crecimiento exponencial ni causalidad.',
    evidenceIds,
    sourceIds,
    sourceLinks: familyPlans.flatMap((plan) => plan.sourceLinks || []).filter((source, index, all) => all.findIndex((item) => item.id === source.id) === index),
    asOf: '2026-08-20',
    evidenceSummary: { mode: families.some((family) => family.data?.length) ? 'mixed' : 'snapshot', families, ...(gaps.length ? { missingDimensions: gaps } : {}), fallbackReason: 'Cada familia conserva solo sus medidas compatibles; no se sustituye una ausencia por una estadística cercana.' },
    snapshotPolicy: BROAD_SNAPSHOT_POLICY,
    knowledgeVersion: 'broad-domain-snapshot-1',
  };
};
