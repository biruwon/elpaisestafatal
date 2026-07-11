export type Source = { label: string; publisher: string; url: string; date: string };
export type Dossier = { eyebrow: string; heading: string; intro: string; metrics: { value: string; label: string }[]; series: { label: string; values: number[]; labels: string[]; unit: string }; source: Source; limits: string };
export type InvestigationSection = {
  id: string; number: string; title: string; intro: string; paragraphs: string[];
  metrics?: { value: string; label: string }[];
  chart?: { title: string; labels: string[]; values: number[]; unit: string; source: Source };
  bullets?: string[]; verdict?: string; source?: Source;
};

export type Concern = {
  slug: string;
  rank: number;
  title: string;
  short: string;
  summary: string;
  question: string;
  stat: string;
  statLabel: string;
  context: string;
  limits: string;
  sources: Source[];
  video?: { title: string; publisher: string; videoId: string; url: string; note: string };
  dossier: Dossier;
  investigation?: { kicker: string; title: string; standfirst: string; finding: string; sections: InvestigationSection[] };
};

import { housingInvestigation } from './investigations/vivienda';
import { immigrationInvestigation } from './investigations/inmigracion';
import { corruptionInvestigation } from './investigations/corrupcion';
import { politicsInvestigation } from './investigations/politica';
import { economyInvestigation } from './investigations/economia';
import { employmentInvestigation } from './investigations/empleo';

const survey: Source = {
  label: 'Barómetro de abril de 2026 · estudio 3557, pregunta 10R',
  publisher: 'Centro de Investigaciones Sociológicas (CIS)',
  url: 'https://www.cis.es/documents/20117/13932083/cues3557.pdf/99a129d1-2277-13b8-93ef-962dac37d64d?t=1778162217989&version=1.0',
  date: 'abril de 2026',
};

type Entry = Omit<Concern, 'rank' | 'stat' | 'statLabel' | 'dossier'> & { first: number; second: number; third: number; statOverride?: string; statLabelOverride?: string; dossier?: Dossier };
const concern = (entry: Entry, rank: number): Concern => ({
  ...entry,
  rank,
  stat: entry.statOverride ?? `${String(entry.first).replace('.', ',')} %`,
  statLabel: entry.statLabelOverride ?? 'lo señaló como primer problema de España',
  dossier: entry.dossier ?? {
    eyebrow: 'La situación, con datos', heading: 'La percepción no es el indicador principal', intro: 'Esta ficha está en ampliación con indicadores sectoriales. Mientras tanto, la fuente enlazada permite comprobar la pregunta de partida y su metodología.',
    metrics: [{ value: `${String(entry.first).replace('.', ',')} %`, label: 'la señaló en primer lugar' }, { value: `${String(entry.second).replace('.', ',')} %`, label: 'la señaló en segundo lugar' }, { value: `${String(entry.third).replace('.', ',')} %`, label: 'la señaló en tercer lugar' }],
    series: { label: 'Posición de la mención en la encuesta', labels: ['Primero', 'Segundo', 'Tercero'], values: [entry.first, entry.second, entry.third], unit: '%' }, source: survey,
    limits: 'Este gráfico describe preocupación declarada, no la situación material. Los indicadores sectoriales sustituyen progresivamente esta vista.',
  },
});

const entries: Entry[] = [
  {
    slug: 'politica', title: 'Política, políticos y partidos', short: 'Confianza, conducta, acuerdos y resultados', first: 37.5, second: 0, third: 0,
    statOverride: '37,5 %', statLabelOverride: 'mencionó al menos uno de los cinco problemas políticos agrupados',
    question: '¿Funciona la democracia aunque no confiemos en quienes la operan?', summary: 'España mantiene elecciones competitivas e instituciones capaces de controlar el poder, pero la confianza se erosiona entre polarización, personalismo, corrupción, nombramientos partidistas y dificultad para convertir acuerdos en resultados.',
    context: 'Esta ficha agrupa cinco respuestas solapadas: Gobierno o políticos concretos, problemas políticos generales, mal comportamiento, actividad de los partidos y falta de acuerdos. El 37,5% es la unión ponderada de personas que citó al menos una en cualquiera de sus tres respuestas.',
    limits: 'No se han sumado porcentajes. El cálculo usa los microdatos ponderados del estudio 3557 y evita contar dos veces a quien mencionó más de una categoría. Describe preocupación declarada, no calidad democrática objetiva.',
    sources: [survey, { label:'Microdatos del Barómetro de abril de 2026 · MD3557', publisher:'CIS', url:'https://www.cis.es/documents/20117/13932083/MD3557.zip/b06ffee0-bd18-6b3f-cb75-4b674616aa2a?version=1.0&t=1779881033257', date:'27 may. 2026' }, { label:'Composición de los grupos parlamentarios · XV Legislatura', publisher:'Congreso de los Diputados', url:'https://www.congreso.es/es/grupos/composicion-en-la-legislatura', date:'consulta jul. 2026' }],
    dossier: { eyebrow:'Cinco respuestas, una sola persona', heading:'El 37,5% citó al menos un problema político', intro:'El porcentaje se ha calculado sobre los 4.020 registros ponderados. Cuenta una sola vez a cada persona aunque mencionara varias de las cinco categorías en sus tres respuestas.', metrics:[{value:'37,5 %',label:'unión ponderada'},{value:'4.020',label:'entrevistas'},{value:'5',label:'categorías agrupadas'}], series:{label:'Peso individual de cada categoría · cualquier posición',labels:['Política general','Gobierno/figuras','Conducta','Partidos','Acuerdos'],values:[13.9,11.3,9.6,3.9,1.9],unit:'%'}, source:{label:'Microdatos del Barómetro de abril de 2026 · cálculo reproducido',publisher:'CIS',url:'https://www.cis.es/documents/20117/13932083/MD3557.zip/b06ffee0-bd18-6b3f-cb75-4b674616aa2a?version=1.0&t=1779881033257',date:'2026'}, limits:'Las barras individuales se solapan y no deben sumarse. El 37,5% es la unión de códigos 13, 24, 46, 50 y 51 en PESPANNA1–3, aplicando PESO.' },
    investigation: politicsInvestigation,
  },
  {
    slug: 'vivienda', title: 'Vivienda', short: 'Acceso, alquiler y compra', first: 25.1, second: 11, third: 5.2,
    question: '¿Qué está ocurriendo?', summary: 'Precios, renta disponible, oferta y territorio se mueven a ritmos distintos. Conviene mirar los cuatro antes de atribuir una causa única.',
    context: 'El Índice de Precios de Vivienda del INE usa compraventas escrituradas. Para el alquiler, el esfuerzo de los hogares y las diferencias territoriales hacen falta otras series.', limits: 'El promedio nacional no dice cuánto cuesta una vivienda concreta ni predice el precio de un barrio.',
    sources: [survey, { label: 'Índice de Precios de Vivienda · T1 2026', publisher: 'INE', url: 'https://www.ine.es/dyngs/Prensa/IPV1T26.htm', date: '8 jun. 2026' }],
    dossier: { eyebrow: 'Precios de compraventa', heading: 'La vivienda libre subió un 12,9% interanual', intro: 'El INE mide viviendas libres efectivamente compradas, no anuncios ni alquileres. La subida trimestral fue del 3,5%; segunda mano creció más que obra nueva.', metrics: [{ value: '12,9 %', label: 'variación anual total' }, { value: '13,5 %', label: 'segunda mano' }, { value: '9,1 %', label: 'obra nueva' }], series: { label: 'Variación anual del precio de vivienda libre', labels: ['T2 24', 'T3 24', 'T4 24', 'T1 25', 'T2 25', 'T3 25', 'T4 25', 'T1 26'], values: [7.8, 8.1, 11.3, 12.2, 12.7, 12.8, 12.9, 12.9], unit: '%' }, source: { label: 'Índice de Precios de Vivienda · T1 2026', publisher: 'INE', url: 'https://www.ine.es/dyngs/Prensa/IPV1T26.htm', date: '8 jun. 2026' }, limits: 'No mide alquileres ni el esfuerzo de pago. Las tablas anexas del INE permiten bajar a comunidades autónomas.' },
    video: { title: 'Para entrar a vivir: los datos clave de la vivienda en España', publisher: 'RTVE Noticias', videoId: 'DNfazdr2duo', url: 'https://www.youtube.com/watch?v=DNfazdr2duo', note: 'Selección provisional de un medio público; explica datos y no respalda una posición partidista.' },
    investigation: housingInvestigation,
  },
  {
    slug: 'gobierno-partidos', title: 'Gobierno y partidos concretos', short: 'Valoración de actores políticos', first: 8.7, second: 1.6, third: 1,
    question: '¿Qué se puede medir sin convertirlo en propaganda?', summary: 'Esta categoría recoge respuestas espontáneas sobre responsables políticos concretos. El dato describe una preocupación declarada, no verifica una acusación ni evalúa a un partido.',
    context: 'Para contrastar decisiones públicas, la ficha remite a normas, presupuestos, votaciones y portales de transparencia, no a interpretaciones partidistas.', limits: 'Una encuesta de opinión no establece causalidad ni prueba hechos sobre personas o formaciones.',
    sources: [survey, { label: 'Portal de la Transparencia · publicidad activa y derecho de acceso', publisher: 'Administración General del Estado', url: 'https://transparencia.gob.es/inicio', date: 'consulta continua' }],
    dossier: { eyebrow: 'Rendición de cuentas', heading: 'Hay trazabilidad pública, no un veredicto político', intro: 'La actividad y las decisiones de un gobierno se contrastan mejor con expedientes, normas, presupuestos y solicitudes de acceso que con una etiqueta general de aprobación o rechazo.', metrics: [{ value: '101.213', label: 'solicitudes de acceso (2025)' }, { value: '94,70 %', label: 'expedientes finalizados' }, { value: '62,62 %', label: 'concesiones' }], series: { label: 'Resolución de solicitudes de acceso · 2025', labels: ['Concesión', 'Inadmisión', 'Denegación'], values: [62.62, 21.53, 2.75], unit: '%' }, source: { label: 'Datos del derecho de acceso · 2025', publisher: 'Portal de la Transparencia', url: 'https://transparencia.gob.es/derecho-acceso/datos-derecho-de-acceso', date: '2025' }, limits: 'Estas cifras miden el ejercicio del derecho de acceso en la AGE; no son una valoración del Gobierno ni cubren por igual todas las administraciones.' },
  },
  {
    slug: 'problemas-politicos', title: 'Problemas políticos en general', short: 'Representación, acuerdos y confianza', first: 7.9, second: 3.3, third: 2.7,
    question: '¿Qué hay detrás de una etiqueta tan amplia?', summary: '“Problemas políticos” es una respuesta paraguas. Esta página separa percepción, funcionamiento institucional y datos verificables de actividad parlamentaria.',
    context: 'La actividad de las cámaras —iniciativas, votaciones y leyes— es pública y permite comprobar hechos sin convertirlos en un juicio editorial.', limits: 'El número de iniciativas o de leyes no mide por sí mismo su calidad ni el grado de acuerdo social.',
    sources: [survey, { label: 'Actividad parlamentaria', publisher: 'Congreso de los Diputados', url: 'https://www.congreso.es/es/busqueda-de-iniciativas', date: 'actualización continua' }],
    dossier: { eyebrow: 'Instituciones en abierto', heading: 'La actividad se puede comprobar iniciativa a iniciativa', intro: 'El Congreso publica iniciativas, votaciones, sesiones y dosieres legislativos. La realidad institucional no se resume en una sensación de “problemas políticos”.', metrics: [{ value: 'XV', label: 'legislatura en curso' }, { value: '62', label: 'dosieres legislativos publicados' }, { value: '2026', label: 'actualización consultada' }], series: { label: 'Dosieres legislativos publicados en 2026', labels: ['Ene.', 'Mar.', 'Abr.', 'May.', 'Jun.'], values: [3, 1, 3, 2, 2], unit: 'dosieres' }, source: { label: 'Documentación complementaria · XV Legislatura', publisher: 'Congreso de los Diputados', url: 'https://www.congreso.es/es/cem/dosieresxvleg', date: 'jul. 2026' }, limits: 'Los dosieres documentan actividad parlamentaria; no miden calidad de las leyes, acuerdos informales ni cumplimiento posterior.' },
  },
  {
    slug: 'economia', title: 'Economía y coste de la vida', short: 'Precios, renta y consumo', first: 7.3, second: 10.3, third: 7.3,
    question: '¿Cómo se mide una preocupación económica?', summary: 'Precios, salarios, empleo, deuda y expectativas pueden cambiar en sentidos distintos. La inflación no equivale al gasto de todos los hogares.',
    context: 'El IPC mide una cesta media. Para entender poder adquisitivo hay que compararlo con ingresos, composición familiar y costes de vivienda.', limits: 'Un promedio nacional puede ocultar diferencias grandes por renta, edad y territorio.',
    sources: [survey, { label: 'Indicador adelantado del IPC · junio 2026', publisher: 'INE', url: 'https://ine.es/dyngs/Prensa/es/adIPC0626.htm', date: '29 jun. 2026' }],
    dossier: { eyebrow: 'Crecimiento, precios y renta', heading: 'La economía creció un 2,7%; los precios no avanzan al mismo ritmo', intro: 'El PIB en volumen aumentó un 0,6% en el trimestre y un 2,7% en un año. Para los hogares, además importa la inflación y cómo evolucionan los ingresos.', metrics: [{ value: '2,7 %', label: 'PIB real interanual' }, { value: '0,6 %', label: 'PIB trimestral' }, { value: '3,2 %', label: 'IPC anual estimado' }], series: { label: 'Variación interanual · T1 2026', labels: ['PIB real', 'Horas', 'Empleo ETC'], values: [2.7, 2.1, 2.8], unit: '%' }, source: { label: 'Contabilidad Nacional Trimestral · T1 2026', publisher: 'INE', url: 'https://www.ine.es/dyngs/Prensa/CNTR1T26.htm', date: '25 jun. 2026' }, limits: 'PIB, IPC y renta disponible responden a preguntas distintas. Ninguna de estas medias mide por sí sola el coste de vida de un hogar concreto.' },
    investigation: economyInvestigation,
  },
  {
    slug: 'empleo', title: 'Empleo y paro', short: 'Acceso, estabilidad, salarios y jornada', first: 31.7, second: 0, third: 0,
    statOverride: '31,7 %', statLabelOverride: 'mencionó el paro o la calidad del empleo',
    question: '¿Basta con crear empleo?', summary: 'España tiene ocupación récord y menos temporalidad, pero conserva paro elevado y empleos que no siempre permiten vivienda, ahorro o estabilidad.',
    context: 'Esta ficha une dos respuestas solapadas del CIS: paro y problemas relacionados con la calidad del empleo. La investigación separa acceso al trabajo de salario, jornada, continuidad y progresión.', limits: 'El 31,7% es una unión ponderada de microdatos, no una suma. La EPA, los registros del SEPE y las estadísticas salariales miden poblaciones y conceptos distintos.',
    sources: [survey, { label:'Microdatos del Barómetro de abril de 2026 · MD3557',publisher:'CIS',url:'https://www.cis.es/documents/20117/13932083/MD3557.zip/b06ffee0-bd18-6b3f-cb75-4b674616aa2a?version=1.0&t=1779881033257',date:'27 may. 2026' }, { label: 'Encuesta de Población Activa · T1 2026', publisher: 'INE', url: 'https://www.ine.es/dyngs/Prensa/EPA1T26.htm', date: '28 abr. 2026' }],
    dossier: { eyebrow:'Dos respuestas, una sola persona',heading:'El 31,7% citó empleo o paro',intro:'El cálculo usa los 4.020 registros y la ponderación oficial. Cada persona cuenta una vez aunque mencionara ambas categorías o las repitiera entre sus tres respuestas.',metrics:[{value:'31,7 %',label:'unión ponderada'},{value:'18,8 %',label:'calidad del empleo'},{value:'14,4 %',label:'paro'}],series:{label:'Categorías individuales · cualquier posición',labels:['Calidad del empleo','Paro','Unión sin duplicados'],values:[18.8,14.4,31.7],unit:'%'},source:{label:'Microdatos CIS 3557 · cálculo reproducido',publisher:'CIS',url:'https://www.cis.es/documents/20117/13932083/MD3557.zip/b06ffee0-bd18-6b3f-cb75-4b674616aa2a?version=1.0&t=1779881033257',date:'2026'},limits:'Las dos tasas individuales se solapan. La unión usa los códigos 1 y 9 en PESPANNA1–3 y aplica PESO.'},
    investigation: employmentInvestigation,
    video: { title: 'El mercado de empleo se desinfla: claves de la EPA', publisher: 'RTVE Noticias', videoId: 'rn1QaqkSJcQ', url: 'https://www.youtube.com/watch?v=rn1QaqkSJcQ', note: 'Selección provisional: pieza explicativa basada en la EPA. Cárgala solo si quieres reproducir contenido de YouTube.' },
  },
  {
    slug: 'comportamiento-politico', title: 'Comportamiento de los políticos', short: 'Conducta pública y rendición de cuentas', first: 4.6, second: 3.4, third: 1.6,
    question: '¿Cómo se evita confundir indignación con prueba?', summary: 'La valoración de la conducta pública es legítima como percepción. Los hechos requieren expedientes, declaraciones, resoluciones y fechas comprobables.',
    context: 'Los registros de intereses, agendas y resoluciones de acceso son fuentes más sólidas que los recortes o las redes para verificar un hecho concreto.', limits: 'La percepción de mal comportamiento no identifica una conducta, una persona ni una infracción determinada.',
    sources: [survey, { label: 'Portal de la Transparencia', publisher: 'Administración General del Estado', url: 'https://transparencia.gob.es/inicio', date: 'consulta continua' }],
    dossier: { eyebrow: 'Control verificable', heading: 'La conducta pública se comprueba con expedientes', intro: 'Para separar crítica política de hechos, importa poder consultar agendas, contratos, declaraciones, resoluciones y decisiones judiciales con su fecha y órgano competente.', metrics: [{ value: '101.213', label: 'solicitudes de acceso en 2025' }, { value: '60.016', label: 'concesiones de acceso' }, { value: '2.632', label: 'denegaciones' }], series: { label: 'Resultado de solicitudes finalizadas · 2025', labels: ['Concedidas', 'Inadmitidas', 'Denegadas'], values: [60016, 20632, 2632], unit: 'expedientes' }, source: { label: 'Datos del derecho de acceso', publisher: 'Portal de la Transparencia', url: 'https://transparencia.gob.es/derecho-acceso/datos-derecho-de-acceso', date: '2025' }, limits: 'El acceso a información facilita rendición de cuentas, pero no prueba por sí mismo conducta irregular ni clasifica responsabilidades individuales.' },
  },
  {
    slug: 'inmigracion', title: 'Inmigración', short: 'Población, empleo e integración', first: 4.6, second: 5.9, third: 5.3,
    question: '¿Qué se puede afirmar con datos?', summary: 'La percepción sobre inmigración no sustituye la medición de población, empleo, escolarización, protección internacional o acceso a servicios.',
    context: 'Nacionalidad, lugar de nacimiento y residencia son conceptos distintos. Una persona nacida fuera de España puede tener nacionalidad española.', limits: 'Los datos agregados no justifican atribuir conductas o resultados a personas por su origen.',
    sources: [survey, { label: 'Estadística Continua de Población · T1 2026', publisher: 'INE', url: 'https://www.ine.es/dyngs/Prensa/ECP1T26.htm', date: '7 may. 2026' }],
    dossier: { eyebrow: 'Población y migraciones', heading: 'Nacionalidad y lugar de nacimiento no son lo mismo', intro: 'España tenía 49,687 millones de residentes el 1 de abril de 2026. La estadística distingue entre nacionalidad y lugar de nacimiento para no tratar categorías diferentes como si fueran iguales.', metrics: [{ value: '49,687 M', label: 'población residente' }, { value: '7,346 M', label: 'nacionalidad extranjera' }, { value: '10,155 M', label: 'nacidas fuera de España' }], series: { label: 'Población residente a 1 de abril', labels: ['2023', '2024', '2025', '2026'], values: [48.206, 48.701, 49.228, 49.687], unit: 'millones' }, source: { label: 'Estadística Continua de Población · T1 2026', publisher: 'INE', url: 'https://www.ine.es/dyngs/Prensa/ECP1T26.htm', date: '7 may. 2026' }, limits: 'Estos datos describen población y movimientos registrados; no permiten atribuir criminalidad, presión sobre servicios o resultados laborales a una nacionalidad u origen.' },
    investigation: immigrationInvestigation,
  },
  {
    slug: 'paro', title: 'Paro', short: 'Desempleo y búsqueda de trabajo', first: 4.5, second: 5.6, third: 4.2,
    question: '¿Qué fuente responde a qué pregunta?', summary: 'La EPA permite comparar desempleo; el paro registrado cuenta otra población administrativa. Son útiles, pero no intercambiables.',
    context: 'Edad, sexo, sector y duración de la búsqueda cambian mucho la experiencia detrás de una tasa agregada.', limits: 'Los registros administrativos y la encuesta tienen universos y metodologías distintas.',
    sources: [survey, { label: 'Encuesta de Población Activa · T1 2026', publisher: 'INE', url: 'https://www.ine.es/dyngs/Prensa/es/EPA1T26.htm', date: '28 abr. 2026' }, { label: 'Estadística de empleo', publisher: 'SEPE', url: 'https://www.sepe.es/HomeSepe/que-es-el-sepe/estadisticas.html', date: 'mensual' }],
    dossier: { eyebrow: 'Mercado laboral', heading: '2,71 millones de personas en paro según la EPA', intro: 'La EPA estima paro y empleo mediante encuesta a hogares. El paro registrado del SEPE es una estadística administrativa distinta; ambas deben citarse con su método.', metrics: [{ value: '10,83 %', label: 'tasa de paro' }, { value: '2,709 M', label: 'personas en paro' }, { value: '−80.600', label: 'paro en 12 meses' }], series: { label: 'Tasa de paro · primer trimestre', labels: ['2022', '2023', '2024', '2025', '2026'], values: [13.65, 13.26, 12.29, 11.36, 10.83], unit: '%' }, source: { label: 'EPA · Primer trimestre 2026', publisher: 'INE', url: 'https://www.ine.es/dyngs/Prensa/es/EPA1T26.htm', date: '28 abr. 2026' }, limits: 'La EPA ofrece una estimación muestral. Para comparar territorios o edades hay que usar las tablas desagregadas y sus intervalos de precisión.' },
  },
  {
    slug: 'corrupcion', title: 'Corrupción y fraude', short: 'Denuncias, procesos y condenas', first: 3.9, second: 3.2, third: 1.9,
    question: '¿Qué diferencia hay entre percepción y caso probado?', summary: 'Desconfianza, denuncias, investigaciones, juicios y condenas son indicadores distintos. La ficha no los presenta como equivalentes.',
    context: 'Una fuente judicial debe indicar órgano, fase procesal y fecha. La estadística oficial permite seguir agregados sin prejuzgar expedientes.', limits: 'Una investigación no es una condena; una percepción tampoco prueba un caso concreto.',
    sources: [survey, { label: 'Estadística judicial', publisher: 'Consejo General del Poder Judicial', url: 'https://www.poderjudicial.es/cgpj/es/Temas/Estadistica-Judicial/', date: 'actualización periódica' }, { label: 'Fiscalía contra la Corrupción', publisher: 'Fiscalía General del Estado', url: 'https://www.fiscal.es/fiscalias-especiales', date: 'memorias anuales' }],
    dossier: { eyebrow: 'Percepción, procesos y condenas', heading: 'El índice internacional mide percepción, no delitos probados', intro: 'España obtuvo 55 sobre 100 y el puesto 49 de 182 en el Índice de Percepción de la Corrupción 2025. Para hechos concretos, la fuente adecuada es judicial o fiscal.', metrics: [{ value: '55/100', label: 'índice de percepción 2025' }, { value: '49/182', label: 'posición global' }, { value: '−1', label: 'punto frente a 2024' }], series: { label: 'Índice de percepción de corrupción', labels: ['2023', '2024', '2025'], values: [60, 56, 55], unit: 'puntos / 100' }, source: { label: 'Índice de Percepción de la Corrupción 2025', publisher: 'Transparency International España', url: 'https://transparencia.org.es/actualidad/indice-de-percepcion-de-la-corrupcion-2025/', date: 'feb. 2026' }, limits: 'No es una tasa de corrupción ni un registro de condenas: sintetiza percepciones de expertos y empresas. Una investigación tampoco equivale a condena.' },
    investigation: corruptionInvestigation,
  },
  {
    slug: 'extremismos', title: 'Extremismos', short: 'Violencia, odio y polarización', first: 3.4, second: 2.7, third: 2.4,
    question: '¿Qué no conviene mezclar?', summary: 'Las posiciones políticas, la discriminación, los delitos de odio y la violencia son categorías diferentes y requieren fuentes específicas.',
    context: 'Las estadísticas registran hechos conocidos por las fuerzas de seguridad; no miden todas las actitudes ni autorizan generalizaciones sobre grupos.', limits: 'Un dato registrado depende de denuncia, clasificación y contexto legal.',
    sources: [survey, { label: 'Informe sobre evolución de delitos de odio', publisher: 'Ministerio del Interior', url: 'https://www.interior.gob.es/opencms/es/servicios-al-ciudadano/delitos-de-odio/', date: 'anual' }],
    dossier: { eyebrow: 'Violencia y delitos de odio', heading: 'Los hechos registrados de odio subieron a 2.417 en 2025', intro: 'El informe policial separa ámbitos y tipos de infracción. Es más preciso que usar “extremismo” como una etiqueta única para ideas, discursos y delitos.', metrics: [{ value: '2.417', label: 'hechos registrados' }, { value: '2.242', label: 'delitos de odio' }, { value: '+23,63 %', label: 'variación anual' }], series: { label: 'Delitos e incidentes de odio registrados', labels: ['2023', '2024', '2025'], values: [2268, 1955, 2417], unit: 'hechos' }, source: { label: 'Informe de evolución de delitos e incidentes de odio 2025', publisher: 'Ministerio del Interior', url: 'https://www.interior.gob.es/opencms/export/sites/default/.galleries/galeria-de-prensa/documentos-y-multimedia/balances-e-informes/2025/Informe-sobre-la-evolucion-de-los-delitos-e-incidentes-de-odio-en-Espana-2025.pdf', date: 'jun. 2026' }, limits: 'Son hechos conocidos por las fuerzas de seguridad. No miden todas las actitudes sociales ni permiten identificar ideologías o grupos fuera de la clasificación del informe.' },
  },
  {
    slug: 'juventud', title: 'Juventud y oportunidades', short: 'Empleo, emancipación y formación', first: 2.7, second: 3.4, third: 2.9,
    question: '¿Qué indicadores dan contexto?', summary: 'Empleo, formación, ingresos y acceso a vivienda condicionan la autonomía. Ninguno explica por sí solo las trayectorias de una generación.',
    context: 'Las comparaciones por edad deben indicar si hablan de población, hogares o personas ocupadas y el tramo de edad exacto.', limits: 'La etiqueta “jóvenes” reúne realidades muy distintas según edad, origen y territorio.',
    sources: [survey, { label: 'Observatorio de Emancipación', publisher: 'Consejo de la Juventud de España', url: 'https://www.cje.org/', date: 'publicación periódica' }, { label: 'Encuesta de Población Activa · T1 2026', publisher: 'INE', url: 'https://www.ine.es/dyngs/Prensa/es/EPA1T26.htm', date: '28 abr. 2026' }],
    dossier: { eyebrow: 'Emancipación y renta', heading: 'El 44,3% de quienes tienen 26–34 años vivía con sus padres', intro: 'La ECV permite relacionar la convivencia familiar con renta, edad y acceso a vivienda. No debe leerse como una elección idéntica para todas las personas jóvenes.', metrics: [{ value: '44,3 %', label: '26–34 años con sus padres' }, { value: '55,5 %', label: 'si renta < 6.000 €' }, { value: '29,4 %', label: 'si renta > 24.000 €' }], series: { label: 'Convivencia con progenitores por renta · 26–34', labels: ['< 6.000 €', 'Total', '> 24.000 €'], values: [55.5, 44.3, 29.4], unit: '%' }, source: { label: 'ECV · módulo sobre dificultades de acceso a vivienda', publisher: 'INE', url: 'https://www.ine.es/dyngs/Prensa/m3ECV2025.htm?print=1', date: 'may. 2026' }, limits: 'Describe convivencia en 2025, no deseo de emanciparse ni el conjunto de jóvenes de todas las edades.' },
  },
  {
    slug: 'seguridad', title: 'Inseguridad ciudadana', short: 'Delitos, denuncias y percepción', first: 2.1, second: 3.1, third: 3.2,
    question: '¿Qué se compara?', summary: 'La criminalidad registrada y la sensación de inseguridad responden a preguntas distintas. Las dos importan, pero no se sustituyen.',
    context: 'La comparación territorial requiere tasas por población y la misma tipología delictiva.', limits: 'La estadística depende de hechos conocidos y denunciados; no mide directamente todos los delitos.',
    sources: [survey, { label: 'Balance de criminalidad · T1 2026', publisher: 'Ministerio del Interior', url: 'https://www.interior.gob.es/opencms/es/prensa/balances-e-informes/', date: 'jun. 2026' }],
    dossier: { eyebrow: 'Delitos conocidos', heading: 'La criminalidad registrada subió un 1,0% interanual', intro: 'El balance contabiliza infracciones conocidas por los cuerpos policiales. La comparación útil separa tipologías, población y territorio, en lugar de usar un único relato sobre seguridad.', metrics: [{ value: '+1,0 %', label: 'variación interanual' }, { value: 'T1 2026', label: 'periodo del balance' }, { value: '6', label: 'cuerpos integrados' }], series: { label: 'Variación interanual registrada', labels: ['Total', 'Cibercriminalidad', 'Resto'], values: [1, 4.8, 0.2], unit: '%' }, source: { label: 'Balance de Criminalidad · primer trimestre 2026', publisher: 'Ministerio del Interior', url: 'https://www.interior.gob.es/opencms/es/prensa/balances-e-informes/', date: '2026' }, limits: 'La estadística depende de denuncias y clasificación de hechos conocidos. No mide directamente todos los delitos ni la percepción individual de seguridad.' },
  },
  {
    slug: 'partidos-politicos', title: 'Lo que hacen los partidos', short: 'Propuestas, votos y actividad', first: 2, second: 0.9, third: 1,
    question: '¿Dónde se comprueba la actividad?', summary: 'Las afirmaciones sobre partidos pueden comprobarse en iniciativas, votaciones, programas registrados y financiación publicada.',
    context: 'La ficha enlaza datos parlamentarios y de fiscalización. No puntúa ni recomienda opciones políticas.', limits: 'Un voto aislado o una iniciativa registrada no resume toda la actividad de una organización.',
    sources: [survey, { label: 'Iniciativas y votaciones', publisher: 'Congreso de los Diputados', url: 'https://www.congreso.es/es/busqueda-de-iniciativas', date: 'actualización continua' }, { label: 'Fiscalización de partidos políticos', publisher: 'Tribunal de Cuentas', url: 'https://www.tcu.es/', date: 'anual' }],
    dossier: { eyebrow: 'Actividad comprobable', heading: 'Las propuestas y votos están publicados', intro: 'La manera verificable de evaluar qué hacen los partidos es consultar iniciativa, texto, enmiendas, votación y fiscalización; no adjudicarles intenciones desde este proyecto.', metrics: [{ value: 'XV', label: 'legislatura actual' }, { value: '62', label: 'dosieres legislativos' }, { value: '2026', label: 'última actualización citada' }], series: { label: 'Dosieres legislativos publicados en 2026', labels: ['Ene.', 'Mar.', 'Abr.', 'May.', 'Jun.'], values: [3, 1, 3, 2, 2], unit: 'dosieres' }, source: { label: 'Actividad parlamentaria', publisher: 'Congreso de los Diputados', url: 'https://www.congreso.es/es/transparencia/actividad-parlamentaria', date: 'consulta continua' }, limits: 'Publicar actividad no permite inferir el impacto de una medida ni sustituye la lectura de sus textos y resultados de votación.' },
  },
  {
    slug: 'impuestos', title: 'Subida de impuestos', short: 'Recaudación, tipos y esfuerzo fiscal', first: 1.5, second: 1.6, third: 0.8,
    question: '¿Qué cifra conviene mirar?', summary: 'Tipo legal, recaudación, presión fiscal y carga efectiva son medidas diferentes. El efecto también cambia según renta, consumo y hogar.',
    context: 'Las comparaciones internacionales deben usar la misma definición y el mismo año de referencia.', limits: 'La presión fiscal agregada no equivale a la factura de una persona o empresa concreta.',
    sources: [survey, { label: 'Recaudación tributaria', publisher: 'Agencia Tributaria', url: 'https://sede.agenciatributaria.gob.es/Sede/estadisticas/recaudacion-tributaria.html', date: 'actualización periódica' }, { label: 'Base de datos estadística', publisher: 'Eurostat', url: 'https://ec.europa.eu/eurostat/data/database', date: 'serie internacional' }],
    dossier: { eyebrow: 'Recaudación y tipos efectivos', heading: 'La recaudación tributaria alcanzó 325.356 millones en 2025', intro: 'Recaudación, tipo legal, presión fiscal y carga efectiva son indicadores distintos. El informe tributario permite seguir bases, tipos y pagos sin asumir que el efecto es igual para todos.', metrics: [{ value: '325.356 M€', label: 'ingresos tributarios 2025' }, { value: '+10,4 %', label: 'variación anual' }, { value: '7,0 %', label: 'bases imponibles agregadas' }], series: { label: 'Crecimiento anual · 2025', labels: ['Ingresos', 'Bases', 'Medidas'], values: [10.4, 7, 2.7], unit: '%' }, source: { label: 'Informe anual de recaudación tributaria 2025', publisher: 'Agencia Tributaria', url: 'https://sede.agenciatributaria.gob.es/Sede/estadisticas/recaudacion-tributaria/informe-anual/ejercicio-2025/1-ingresos-tributarios-2025/introduccion.html', date: '2026' }, limits: 'La recaudación total no es la factura fiscal de un hogar. Para comparar países hay que usar una definición homogénea y la misma fecha.' },
  },
  {
    slug: 'problemas-sociales', title: 'Problemas sociales', short: 'Cohesión, cuidados y exclusión', first: 1.4, second: 1.4, third: 2,
    question: '¿Cómo hacer visible una categoría tan amplia?', summary: 'La categoría agrupa respuestas muy diversas. Para entenderla hay que desagregar pobreza, cuidados, vivienda, salud y acceso a servicios.',
    context: 'La Encuesta de Condiciones de Vida ofrece indicadores comparables de renta y privación; no cubre por sí sola todas las relaciones sociales.', limits: 'Una sola tasa no resume la cohesión de una sociedad ni la experiencia de cada hogar.',
    sources: [survey, { label: 'Encuesta de Condiciones de Vida · 2025', publisher: 'INE', url: 'https://www.ine.es/dyngs/Prensa/es/ECV2025.htm', date: '5 feb. 2026' }],
    dossier: { eyebrow: 'Renta y privación', heading: 'El 25,7% estaba en riesgo de pobreza o exclusión', intro: 'AROPE combina renta, carencia material y baja intensidad de empleo. Es un indicador europeo para seguir exclusión; no es una definición completa de todos los problemas sociales.', metrics: [{ value: '25,7 %', label: 'tasa AROPE' }, { value: '8,1 %', label: 'carencia severa' }, { value: '15.620 €', label: 'renta media por persona' }], series: { label: 'Tasa de riesgo de pobreza o exclusión', labels: ['2021', '2022', '2023', '2024', '2025'], values: [27.8, 26, 26.5, 25.8, 25.7], unit: '%' }, source: { label: 'Encuesta de Condiciones de Vida · 2025', publisher: 'INE', url: 'https://www.ine.es/dyngs/Prensa/es/ECV2025.htm', date: '5 feb. 2026' }, limits: 'AROPE es una medida de hogares y umbrales relativos. No mide por sí sola cuidados, soledad, discriminación o acceso efectivo a servicios.' },
  },
  {
    slug: 'crisis-valores', title: 'Crisis de valores', short: 'Civismo, convivencia y normas', first: 1.3, second: 1.4, third: 1.8,
    question: '¿Se puede convertir una sensación en un hecho?', summary: 'No de forma directa. “Crisis de valores” expresa un diagnóstico moral amplio; los datos solo pueden iluminar conductas o actitudes concretas.',
    context: 'Las encuestas deben leerse con su pregunta exacta, muestra y fecha. El proyecto evita presentar una opinión como un indicador objetivo.', limits: 'No existe una única métrica oficial de “valores” ni una lectura neutral de ese concepto.',
    sources: [survey],
    dossier: { eyebrow: 'Una idea, no una estadística', heading: '“Crisis de valores” no tiene un indicador oficial único', intro: 'Presentarla como una cifra objetiva sería engañoso. Para convertirla en una pregunta investigable hay que concretar qué conducta, población, periodo y fuente se está observando.', metrics: [{ value: '3', label: 'posiciones posibles en la pregunta' }, { value: '1,3 %', label: 'mención en primer lugar' }, { value: '1,8 %', label: 'mención en tercer lugar' }], series: { label: 'Mención por posición de respuesta', labels: ['Primero', 'Segundo', 'Tercero'], values: [1.3, 1.4, 1.8], unit: '%' }, source: survey, limits: 'No existe una métrica oficial de “valores”. Esta es la única ficha que mantiene la encuesta como gráfico porque el concepto no está operacionalizado de forma neutral.' },
  },
  {
    slug: 'crispacion-social', title: 'Crispación social', short: 'Conflicto, convivencia y debate público', first: 1.2, second: 1, third: 0.8,
    question: '¿Qué mide la crispación?', summary: 'El término puede referirse a tono político, conversación pública o conflicto social. Cada una de esas cosas necesita una medida diferente.',
    context: 'La cifra de la encuesta capta que alguien lo señala como problema; no cuantifica automáticamente el nivel de hostilidad social.', limits: 'No es correcto deducir violencia, delitos o conducta individual a partir de una percepción agregada.',
    sources: [survey],
    dossier: { eyebrow: 'Una percepción que hay que concretar', heading: 'La crispación no equivale a violencia ni a delito', intro: 'El término puede hablar de conversación pública, conflicto político o convivencia. Sin definirlo, un número puede crear más ruido que conocimiento.', metrics: [{ value: '1,2 %', label: 'mención en primer lugar' }, { value: '1,0 %', label: 'mención en segundo lugar' }, { value: '0,8 %', label: 'mención en tercer lugar' }], series: { label: 'Mención por posición de respuesta', labels: ['Primero', 'Segundo', 'Tercero'], values: [1.2, 1, 0.8], unit: '%' }, source: survey, limits: 'El gráfico describe percepción declarada, no una tasa de hostilidad, delitos o violencia. Añadiremos indicadores específicos solo cuando tengan una metodología pública comparable.' },
  },
  {
    slug: 'sanidad', title: 'Sanidad', short: 'Acceso, espera y recursos', first: 1.1, second: 5.7, third: 6,
    question: '¿Qué muestran los datos?', summary: 'Acceso, actividad, tiempos de espera, profesionales y resultados describen dimensiones distintas del sistema sanitario.',
    context: 'Las comparaciones necesitan comunidad autónoma, especialidad y periodo. La espera quirúrgica no resume la atención primaria ni la calidad clínica.', limits: 'Una lista de espera publicada no anticipa la cita individual ni mide toda la necesidad asistencial.',
    sources: [survey, { label: 'Listas de espera · diciembre 2025', publisher: 'Ministerio de Sanidad', url: 'https://www.sanidad.gob.es/estadEstudios/estadisticas/inforRecopilaciones/docs/Informe_situacion_listas_de_espera_dic_2025_V1.pdf', date: 'dic. 2025' }],
    dossier: { eyebrow: 'Acceso a cirugía', heading: '853.509 pacientes esperaban una operación al cierre de 2025', intro: 'La lista estructural recoge pacientes pendientes de intervención electiva. Los resultados cambian por comunidad autónoma y especialidad, por eso esta cifra nacional es punto de partida, no diagnóstico completo.', metrics: [{ value: '853.509', label: 'pacientes en lista' }, { value: '121 días', label: 'espera media' }, { value: '21,6 %', label: 'más de seis meses' }], series: { label: 'Espera media quirúrgica', labels: ['Dic. 2024', 'Jun. 2025', 'Dic. 2025'], values: [126, 119, 121], unit: 'días' }, source: { label: 'Listas de espera · diciembre 2025', publisher: 'Ministerio de Sanidad', url: 'https://www.sanidad.gob.es/estadEstudios/estadisticas/inforRecopilaciones/docs/Informe_situacion_listas_de_espera_dic_2025_V1.pdf', date: '2026' }, limits: 'No mide atención primaria, urgencias, calidad clínica ni la espera de cada persona. Los datos dependen de información remitida por las comunidades autónomas.' },
  },
  {
    slug: 'desigualdad', title: 'Desigualdades y pobreza', short: 'Renta, género y privación', first: 1, second: 1.9, third: 2,
    question: '¿Cómo evitar simplificaciones?', summary: 'Distribución de renta, pobreza monetaria, privación material y desigualdades de género son medidas relacionadas, pero no idénticas.',
    context: 'AROPE combina renta, carencia material y baja intensidad de empleo. Es útil para comparar, no un recuento de personas sin ingresos.', limits: 'Los umbrales relativos no equivalen a una cantidad idéntica para todos los hogares.',
    sources: [survey, { label: 'Encuesta de Condiciones de Vida · 2025', publisher: 'INE', url: 'https://www.ine.es/dyngs/Prensa/es/ECV2025.htm', date: '5 feb. 2026' }, { label: 'Base de datos de Eurostat', publisher: 'Eurostat', url: 'https://ec.europa.eu/eurostat/data/database', date: 'serie europea' }],
    dossier: { eyebrow: 'Distribución de renta', heading: 'La exclusión bajó ligeramente, pero sigue afectando a una de cada cuatro personas', intro: 'La desigualdad se observa con varias medidas: renta, privación, empleo, género, edad y territorio. AROPE permite comparaciones europeas con una metodología publicada.', metrics: [{ value: '25,7 %', label: 'AROPE en 2025' }, { value: '8,1 %', label: 'privación severa' }, { value: '−0,1 pp', label: 'AROPE frente a 2024' }], series: { label: 'Tasa AROPE', labels: ['2021', '2022', '2023', '2024', '2025'], values: [27.8, 26, 26.5, 25.8, 25.7], unit: '%' }, source: { label: 'Encuesta de Condiciones de Vida · 2025', publisher: 'INE', url: 'https://www.ine.es/dyngs/Prensa/es/ECV2025.htm', date: '5 feb. 2026' }, limits: 'La evolución agregada puede ocultar cambios muy distintos por edad, comunidad autónoma y tipo de hogar. No mide todas las desigualdades de género.' },
  },
  {
    slug: 'acuerdos-politicos', title: 'Falta de acuerdos e inestabilidad', short: 'Pactos, mayorías y continuidad', first: 1, second: 0.6, third: 0.3,
    question: '¿Qué se puede observar?', summary: 'La percepción de bloqueo se puede contrastar con actividad legislativa, acuerdos publicados y duración de los procedimientos parlamentarios.',
    context: 'Los registros de las cámaras permiten comprobar qué se presentó, debatió y votó, sin convertir el proyecto en árbitro de su conveniencia.', limits: 'El número de acuerdos no mide por sí solo su alcance, cumplimiento o legitimidad social.',
    sources: [survey, { label: 'Tramitación parlamentaria', publisher: 'Congreso de los Diputados', url: 'https://www.congreso.es/es/c/portal/update_language?groupId=20123&languageId=es_ES&layoutId=1&privateLayout=false&redirect=%2Fes%2Fbusqueda-de-iniciativas', date: 'actualización continua' }],
    dossier: { eyebrow: 'Acuerdos y actividad', heading: 'La actividad parlamentaria es pública; el acuerdo no se reduce a una cifra', intro: 'Para comprobar si una propuesta avanzó hay que seguir su iniciativa, enmiendas, ponencia, votación y publicación. “Inestabilidad” es una interpretación que requiere indicadores definidos.', metrics: [{ value: 'XV', label: 'legislatura en curso' }, { value: '62', label: 'dosieres legislativos' }, { value: '2026', label: 'actualización consultada' }], series: { label: 'Dosieres legislativos publicados en 2026', labels: ['Ene.', 'Mar.', 'Abr.', 'May.', 'Jun.'], values: [3, 1, 3, 2, 2], unit: 'dosieres' }, source: { label: 'Documentación complementaria · XV Legislatura', publisher: 'Congreso de los Diputados', url: 'https://www.congreso.es/es/cem/dosieresxvleg', date: 'jul. 2026' }, limits: 'Los dosieres no cuentan acuerdos informales ni miden estabilidad política. Sirven para verificar hechos del procedimiento parlamentario.' },
  },
];

const mergedSlugs = new Set(['gobierno-partidos', 'problemas-politicos', 'comportamiento-politico', 'partidos-politicos', 'acuerdos-politicos', 'paro']);
export const concerns = entries
  .filter((entry) => !mergedSlugs.has(entry.slug))
  .sort((a, b) => b.first - a.first)
  .map((entry, index) => concern(entry, index + 1));
export const getConcern = (slug: string) => concerns.find((item) => item.slug === slug);
