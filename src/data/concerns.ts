export type Source = { label: string; publisher: string; url: string; date: string };

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
  evidence: { heading: string; intro: string; metrics: { value: string; label: string }[]; series: { label: string; values: number[]; labels: string[]; unit: string }; source: Source };
};

const survey: Source = {
  label: 'Barómetro de abril de 2026 · estudio 3557, pregunta 10R',
  publisher: 'Centro de Investigaciones Sociológicas (CIS)',
  url: 'https://www.cis.es/documents/20117/13932083/cues3557.pdf/99a129d1-2277-13b8-93ef-962dac37d64d?t=1778162217989&version=1.0',
  date: 'abril de 2026',
};

type Entry = Omit<Concern, 'rank' | 'stat' | 'statLabel' | 'evidence'> & { first: number; second: number; third: number };
const concern = (entry: Entry, rank: number): Concern => ({
  ...entry,
  rank,
  stat: `${String(entry.first).replace('.', ',')} %`,
  statLabel: 'lo señaló como primer problema de España',
  evidence: {
    heading: 'Una preocupación no cabe en un único orden',
    intro: 'La misma pregunta pide hasta tres problemas. Este gráfico separa el primer, segundo y tercer lugar: no suma personas ni mide la gravedad objetiva del asunto.',
    metrics: [
      { value: `${String(entry.first).replace('.', ',')} %`, label: 'primer problema' },
      { value: `${String(entry.second).replace('.', ',')} %`, label: 'segundo problema' },
      { value: `${String(entry.third).replace('.', ',')} %`, label: 'tercer problema' },
    ],
    series: { label: 'Menciones por posición de respuesta', labels: ['Primero', 'Segundo', 'Tercero'], values: [entry.first, entry.second, entry.third], unit: '%' },
    source: survey,
  },
});

const entries: Entry[] = [
  {
    slug: 'vivienda', title: 'Vivienda', short: 'Acceso, alquiler y compra', first: 25.1, second: 11, third: 5.2,
    question: '¿Qué está ocurriendo?', summary: 'Precios, renta disponible, oferta y territorio se mueven a ritmos distintos. Conviene mirar los cuatro antes de atribuir una causa única.',
    context: 'El Índice de Precios de Vivienda del INE usa compraventas escrituradas. Para el alquiler, el esfuerzo de los hogares y las diferencias territoriales hacen falta otras series.', limits: 'El promedio nacional no dice cuánto cuesta una vivienda concreta ni predice el precio de un barrio.',
    sources: [survey, { label: 'Índice de Precios de Vivienda · T1 2026', publisher: 'INE', url: 'https://www.ine.es/dyngs/Prensa/IPV1T26.htm', date: '8 jun. 2026' }],
    video: { title: 'Para entrar a vivir: los datos clave de la vivienda en España', publisher: 'RTVE Noticias', videoId: 'DNfazdr2duo', url: 'https://www.youtube.com/watch?v=DNfazdr2duo', note: 'Selección provisional de un medio público; explica datos y no respalda una posición partidista.' },
  },
  {
    slug: 'gobierno-partidos', title: 'Gobierno y partidos concretos', short: 'Valoración de actores políticos', first: 8.7, second: 1.6, third: 1,
    question: '¿Qué se puede medir sin convertirlo en propaganda?', summary: 'Esta categoría recoge respuestas espontáneas sobre responsables políticos concretos. El dato describe una preocupación declarada, no verifica una acusación ni evalúa a un partido.',
    context: 'Para contrastar decisiones públicas, la ficha remite a normas, presupuestos, votaciones y portales de transparencia, no a interpretaciones partidistas.', limits: 'Una encuesta de opinión no establece causalidad ni prueba hechos sobre personas o formaciones.',
    sources: [survey, { label: 'Portal de la Transparencia · publicidad activa y derecho de acceso', publisher: 'Administración General del Estado', url: 'https://transparencia.gob.es/inicio', date: 'consulta continua' }],
  },
  {
    slug: 'problemas-politicos', title: 'Problemas políticos en general', short: 'Representación, acuerdos y confianza', first: 7.9, second: 3.3, third: 2.7,
    question: '¿Qué hay detrás de una etiqueta tan amplia?', summary: '“Problemas políticos” es una respuesta paraguas. Esta página separa percepción, funcionamiento institucional y datos verificables de actividad parlamentaria.',
    context: 'La actividad de las cámaras —iniciativas, votaciones y leyes— es pública y permite comprobar hechos sin convertirlos en un juicio editorial.', limits: 'El número de iniciativas o de leyes no mide por sí mismo su calidad ni el grado de acuerdo social.',
    sources: [survey, { label: 'Actividad parlamentaria', publisher: 'Congreso de los Diputados', url: 'https://www.congreso.es/es/busqueda-de-iniciativas', date: 'actualización continua' }],
  },
  {
    slug: 'economia', title: 'Economía y coste de la vida', short: 'Precios, renta y consumo', first: 7.3, second: 10.3, third: 7.3,
    question: '¿Cómo se mide una preocupación económica?', summary: 'Precios, salarios, empleo, deuda y expectativas pueden cambiar en sentidos distintos. La inflación no equivale al gasto de todos los hogares.',
    context: 'El IPC mide una cesta media. Para entender poder adquisitivo hay que compararlo con ingresos, composición familiar y costes de vivienda.', limits: 'Un promedio nacional puede ocultar diferencias grandes por renta, edad y territorio.',
    sources: [survey, { label: 'Indicador adelantado del IPC · junio 2026', publisher: 'INE', url: 'https://ine.es/dyngs/Prensa/es/adIPC0626.htm', date: '29 jun. 2026' }],
  },
  {
    slug: 'calidad-empleo', title: 'Calidad del empleo', short: 'Estabilidad, salarios y jornada', first: 5, second: 8.9, third: 5.3,
    question: '¿Tener empleo responde a todo?', summary: 'No. Salario, tipo de contrato, jornada, horas no deseadas y capacidad de progresar describen dimensiones diferentes de la calidad del empleo.',
    context: 'La EPA mide empleo, paro y actividad. Las tablas de salarios y condiciones de trabajo deben leerse por separado para no convertir la tasa de paro en un indicador de todo.', limits: 'Una media nacional no resume un contrato, un sector ni una comunidad autónoma.',
    sources: [survey, { label: 'Encuesta de Población Activa · T1 2026', publisher: 'INE', url: 'https://www.ine.es/dyngs/Prensa/es/EPA1T26.htm', date: '28 abr. 2026' }, { label: 'Encuesta anual de estructura salarial', publisher: 'INE', url: 'https://www.ine.es/prensa/ees_2023.pdf', date: 'última publicación disponible' }],
    video: { title: 'El mercado de empleo se desinfla: claves de la EPA', publisher: 'RTVE Noticias', videoId: 'rn1QaqkSJcQ', url: 'https://www.youtube.com/watch?v=rn1QaqkSJcQ', note: 'Selección provisional: pieza explicativa basada en la EPA. Cárgala solo si quieres reproducir contenido de YouTube.' },
  },
  {
    slug: 'comportamiento-politico', title: 'Comportamiento de los políticos', short: 'Conducta pública y rendición de cuentas', first: 4.6, second: 3.4, third: 1.6,
    question: '¿Cómo se evita confundir indignación con prueba?', summary: 'La valoración de la conducta pública es legítima como percepción. Los hechos requieren expedientes, declaraciones, resoluciones y fechas comprobables.',
    context: 'Los registros de intereses, agendas y resoluciones de acceso son fuentes más sólidas que los recortes o las redes para verificar un hecho concreto.', limits: 'La percepción de mal comportamiento no identifica una conducta, una persona ni una infracción determinada.',
    sources: [survey, { label: 'Portal de la Transparencia', publisher: 'Administración General del Estado', url: 'https://transparencia.gob.es/inicio', date: 'consulta continua' }],
  },
  {
    slug: 'inmigracion', title: 'Inmigración', short: 'Población, empleo e integración', first: 4.6, second: 5.9, third: 5.3,
    question: '¿Qué se puede afirmar con datos?', summary: 'La percepción sobre inmigración no sustituye la medición de población, empleo, escolarización, protección internacional o acceso a servicios.',
    context: 'Nacionalidad, lugar de nacimiento y residencia son conceptos distintos. Una persona nacida fuera de España puede tener nacionalidad española.', limits: 'Los datos agregados no justifican atribuir conductas o resultados a personas por su origen.',
    sources: [survey, { label: 'Estadística Continua de Población · T1 2026', publisher: 'INE', url: 'https://www.ine.es/dyngs/Prensa/ECP1T26.htm', date: '7 may. 2026' }],
  },
  {
    slug: 'paro', title: 'Paro', short: 'Desempleo y búsqueda de trabajo', first: 4.5, second: 5.6, third: 4.2,
    question: '¿Qué fuente responde a qué pregunta?', summary: 'La EPA permite comparar desempleo; el paro registrado cuenta otra población administrativa. Son útiles, pero no intercambiables.',
    context: 'Edad, sexo, sector y duración de la búsqueda cambian mucho la experiencia detrás de una tasa agregada.', limits: 'Los registros administrativos y la encuesta tienen universos y metodologías distintas.',
    sources: [survey, { label: 'Encuesta de Población Activa', publisher: 'INE', url: 'https://www.ine.es/dyngs/Prensa/EPA.htm', date: 'trimestral' }, { label: 'Estadística de empleo', publisher: 'SEPE', url: 'https://www.sepe.es/HomeSepe/que-es-el-sepe/estadisticas.html', date: 'mensual' }],
  },
  {
    slug: 'corrupcion', title: 'Corrupción y fraude', short: 'Denuncias, procesos y condenas', first: 3.9, second: 3.2, third: 1.9,
    question: '¿Qué diferencia hay entre percepción y caso probado?', summary: 'Desconfianza, denuncias, investigaciones, juicios y condenas son indicadores distintos. La ficha no los presenta como equivalentes.',
    context: 'Una fuente judicial debe indicar órgano, fase procesal y fecha. La estadística oficial permite seguir agregados sin prejuzgar expedientes.', limits: 'Una investigación no es una condena; una percepción tampoco prueba un caso concreto.',
    sources: [survey, { label: 'Estadística judicial', publisher: 'Consejo General del Poder Judicial', url: 'https://www.poderjudicial.es/cgpj/es/Temas/Estadistica-Judicial/', date: 'actualización periódica' }, { label: 'Fiscalía contra la Corrupción', publisher: 'Fiscalía General del Estado', url: 'https://www.fiscal.es/fiscalias-especiales', date: 'memorias anuales' }],
  },
  {
    slug: 'extremismos', title: 'Extremismos', short: 'Violencia, odio y polarización', first: 3.4, second: 2.7, third: 2.4,
    question: '¿Qué no conviene mezclar?', summary: 'Las posiciones políticas, la discriminación, los delitos de odio y la violencia son categorías diferentes y requieren fuentes específicas.',
    context: 'Las estadísticas registran hechos conocidos por las fuerzas de seguridad; no miden todas las actitudes ni autorizan generalizaciones sobre grupos.', limits: 'Un dato registrado depende de denuncia, clasificación y contexto legal.',
    sources: [survey, { label: 'Informe sobre evolución de delitos de odio', publisher: 'Ministerio del Interior', url: 'https://www.interior.gob.es/opencms/es/servicios-al-ciudadano/delitos-de-odio/', date: 'anual' }],
  },
  {
    slug: 'juventud', title: 'Juventud y oportunidades', short: 'Empleo, emancipación y formación', first: 2.7, second: 3.4, third: 2.9,
    question: '¿Qué indicadores dan contexto?', summary: 'Empleo, formación, ingresos y acceso a vivienda condicionan la autonomía. Ninguno explica por sí solo las trayectorias de una generación.',
    context: 'Las comparaciones por edad deben indicar si hablan de población, hogares o personas ocupadas y el tramo de edad exacto.', limits: 'La etiqueta “jóvenes” reúne realidades muy distintas según edad, origen y territorio.',
    sources: [survey, { label: 'Indicadores de emancipación', publisher: 'Consejo de la Juventud de España', url: 'https://www.cje.org/observatorio-emancipacion/', date: 'trimestral' }, { label: 'Encuesta de Población Activa', publisher: 'INE', url: 'https://www.ine.es/dyngs/Prensa/EPA.htm', date: 'trimestral' }],
  },
  {
    slug: 'seguridad', title: 'Inseguridad ciudadana', short: 'Delitos, denuncias y percepción', first: 2.1, second: 3.1, third: 3.2,
    question: '¿Qué se compara?', summary: 'La criminalidad registrada y la sensación de inseguridad responden a preguntas distintas. Las dos importan, pero no se sustituyen.',
    context: 'La comparación territorial requiere tasas por población y la misma tipología delictiva.', limits: 'La estadística depende de hechos conocidos y denunciados; no mide directamente todos los delitos.',
    sources: [survey, { label: 'Balance de criminalidad · T1 2026', publisher: 'Ministerio del Interior', url: 'https://www.interior.gob.es/opencms/es/prensa/balances-e-informes/', date: 'jun. 2026' }],
  },
  {
    slug: 'partidos-politicos', title: 'Lo que hacen los partidos', short: 'Propuestas, votos y actividad', first: 2, second: 0.9, third: 1,
    question: '¿Dónde se comprueba la actividad?', summary: 'Las afirmaciones sobre partidos pueden comprobarse en iniciativas, votaciones, programas registrados y financiación publicada.',
    context: 'La ficha enlaza datos parlamentarios y de fiscalización. No puntúa ni recomienda opciones políticas.', limits: 'Un voto aislado o una iniciativa registrada no resume toda la actividad de una organización.',
    sources: [survey, { label: 'Iniciativas y votaciones', publisher: 'Congreso de los Diputados', url: 'https://www.congreso.es/es/busqueda-de-iniciativas', date: 'actualización continua' }, { label: 'Fiscalización de partidos políticos', publisher: 'Tribunal de Cuentas', url: 'https://www.tcu.es/', date: 'anual' }],
  },
  {
    slug: 'impuestos', title: 'Subida de impuestos', short: 'Recaudación, tipos y esfuerzo fiscal', first: 1.5, second: 1.6, third: 0.8,
    question: '¿Qué cifra conviene mirar?', summary: 'Tipo legal, recaudación, presión fiscal y carga efectiva son medidas diferentes. El efecto también cambia según renta, consumo y hogar.',
    context: 'Las comparaciones internacionales deben usar la misma definición y el mismo año de referencia.', limits: 'La presión fiscal agregada no equivale a la factura de una persona o empresa concreta.',
    sources: [survey, { label: 'Recaudación tributaria', publisher: 'Agencia Tributaria', url: 'https://sede.agenciatributaria.gob.es/Sede/datosabiertos/catalogo/hacienda/recaudacion.html', date: 'actualización periódica' }, { label: 'Revenue statistics', publisher: 'OECD', url: 'https://www.oecd.org/en/topics/sub-issues/global-tax-revenues.html', date: 'serie internacional' }],
  },
  {
    slug: 'problemas-sociales', title: 'Problemas sociales', short: 'Cohesión, cuidados y exclusión', first: 1.4, second: 1.4, third: 2,
    question: '¿Cómo hacer visible una categoría tan amplia?', summary: 'La categoría agrupa respuestas muy diversas. Para entenderla hay que desagregar pobreza, cuidados, vivienda, salud y acceso a servicios.',
    context: 'La Encuesta de Condiciones de Vida ofrece indicadores comparables de renta y privación; no cubre por sí sola todas las relaciones sociales.', limits: 'Una sola tasa no resume la cohesión de una sociedad ni la experiencia de cada hogar.',
    sources: [survey, { label: 'Encuesta de Condiciones de Vida · 2025', publisher: 'INE', url: 'https://www.ine.es/dyngs/Prensa/es/ECV2025.htm', date: '5 feb. 2026' }],
  },
  {
    slug: 'crisis-valores', title: 'Crisis de valores', short: 'Civismo, convivencia y normas', first: 1.3, second: 1.4, third: 1.8,
    question: '¿Se puede convertir una sensación en un hecho?', summary: 'No de forma directa. “Crisis de valores” expresa un diagnóstico moral amplio; los datos solo pueden iluminar conductas o actitudes concretas.',
    context: 'Las encuestas deben leerse con su pregunta exacta, muestra y fecha. El proyecto evita presentar una opinión como un indicador objetivo.', limits: 'No existe una única métrica oficial de “valores” ni una lectura neutral de ese concepto.',
    sources: [survey, { label: 'Banco de datos de estudios', publisher: 'Centro de Investigaciones Sociológicas', url: 'https://www.cis.es/es/banco-de-datos', date: 'consulta continua' }],
  },
  {
    slug: 'crispacion-social', title: 'Crispación social', short: 'Conflicto, convivencia y debate público', first: 1.2, second: 1, third: 0.8,
    question: '¿Qué mide la crispación?', summary: 'El término puede referirse a tono político, conversación pública o conflicto social. Cada una de esas cosas necesita una medida diferente.',
    context: 'La cifra de la encuesta capta que alguien lo señala como problema; no cuantifica automáticamente el nivel de hostilidad social.', limits: 'No es correcto deducir violencia, delitos o conducta individual a partir de una percepción agregada.',
    sources: [survey, { label: 'Estudios y series de opinión pública', publisher: 'Centro de Investigaciones Sociológicas', url: 'https://www.cis.es/es/estudios/catalogo', date: 'consulta continua' }],
  },
  {
    slug: 'sanidad', title: 'Sanidad', short: 'Acceso, espera y recursos', first: 1.1, second: 5.7, third: 6,
    question: '¿Qué muestran los datos?', summary: 'Acceso, actividad, tiempos de espera, profesionales y resultados describen dimensiones distintas del sistema sanitario.',
    context: 'Las comparaciones necesitan comunidad autónoma, especialidad y periodo. La espera quirúrgica no resume la atención primaria ni la calidad clínica.', limits: 'Una lista de espera publicada no anticipa la cita individual ni mide toda la necesidad asistencial.',
    sources: [survey, { label: 'Listas de espera · diciembre 2025', publisher: 'Ministerio de Sanidad', url: 'https://www.sanidad.gob.es/estadEstudios/estadisticas/inforRecopilaciones/docs/Informe_situacion_listas_de_espera_dic_2025_V1.pdf', date: 'dic. 2025' }],
  },
  {
    slug: 'desigualdad', title: 'Desigualdades y pobreza', short: 'Renta, género y privación', first: 1, second: 1.9, third: 2,
    question: '¿Cómo evitar simplificaciones?', summary: 'Distribución de renta, pobreza monetaria, privación material y desigualdades de género son medidas relacionadas, pero no idénticas.',
    context: 'AROPE combina renta, carencia material y baja intensidad de empleo. Es útil para comparar, no un recuento de personas sin ingresos.', limits: 'Los umbrales relativos no equivalen a una cantidad idéntica para todos los hogares.',
    sources: [survey, { label: 'Encuesta de Condiciones de Vida · 2025', publisher: 'INE', url: 'https://www.ine.es/dyngs/Prensa/es/ECV2025.htm', date: '5 feb. 2026' }, { label: 'Gender statistics', publisher: 'Eurostat', url: 'https://ec.europa.eu/eurostat/web/gender-equality', date: 'serie europea' }],
  },
  {
    slug: 'acuerdos-politicos', title: 'Falta de acuerdos e inestabilidad', short: 'Pactos, mayorías y continuidad', first: 1, second: 0.6, third: 0.3,
    question: '¿Qué se puede observar?', summary: 'La percepción de bloqueo se puede contrastar con actividad legislativa, acuerdos publicados y duración de los procedimientos parlamentarios.',
    context: 'Los registros de las cámaras permiten comprobar qué se presentó, debatió y votó, sin convertir el proyecto en árbitro de su conveniencia.', limits: 'El número de acuerdos no mide por sí solo su alcance, cumplimiento o legitimidad social.',
    sources: [survey, { label: 'Tramitación parlamentaria', publisher: 'Congreso de los Diputados', url: 'https://www.congreso.es/es/c/portal/update_language?groupId=20123&languageId=es_ES&layoutId=1&privateLayout=false&redirect=%2Fes%2Fbusqueda-de-iniciativas', date: 'actualización continua' }],
  },
];

export const concerns = entries.map((entry, index) => concern(entry, index + 1));
export const getConcern = (slug: string) => concerns.find((item) => item.slug === slug);
