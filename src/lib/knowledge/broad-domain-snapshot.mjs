// Small, reviewed context packets for broad claims. These are deliberately
// keyed by concepts and evidence dimensions, never by a particular slogan.
// They provide useful context when a claim is too broad for a single verdict
// or when the optional local classifier is unavailable.
import { snapshotLifecycle } from './snapshot-lifecycle.mjs';

const source = (id, title, publisher, url, publishedAt) => ({ id, title, publisher, url, publishedAt, retrievedAt: '2026-08-20', role: 'primary' });

const packets = [
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
    matches: /\b(paro|desemple|empleo|trabaj|ocupad|salari|datos del paro|mercado laboral)\b/i,
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
    matches: /\b(delincuenc|criminal|delito|seguridad|insegur|calle|salir)\w*\b/i,
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
  return packets.find((packet) => packet.matches.test(value));
};

export const answerPlanForBroadDomain = (text, { now = Date.now() } = {}) => {
  const packet = broadDomainPacketFor(text);
  if (!packet) return undefined;
  const lifecycle = snapshotLifecycle(BROAD_SNAPSHOT_POLICY, now);
  if (!lifecycle.usable) return undefined;
  const evidenceIds = packet.criteria.flatMap((item) => item.sourceIds);
  const sourceIds = [...new Set(packet.sources.map((item) => item.id))];
  return {
    schemaVersion: '1',
    evidenceLevel: 'limited',
    headline: packet.headline,
    summary: packet.summary,
    coverage: 'qualified',
    claimType: 'mixed',
    interpretation: packet.interpretation,
    blocks: [
      { type: 'data_finding', evidenceIds, points: packet.criteria.map((item) => `${item.label}: ${item.finding}`) },
      { type: 'cannot_conclude', evidenceIds, points: packet.limitations },
      { type: 'conversation_reply', evidenceIds, text: `${packet.summary} ${packet.limitations[0]}` },
    ],
    limitation: packet.limitations[0],
    evidenceIds,
    sourceIds,
    sourceLinks: packet.sources,
    asOf: '2026-08-20',
    evidenceSummary: {
      mode: 'snapshot',
      families: packet.criteria.map((item) => ({ label: item.label, direction: 'qualifies', evidenceIds: item.sourceIds })),
      fallbackReason: 'No se encontró una serie dinámica suficientemente compatible; se muestra un paquete revisado y fechado como contexto provisional.',
    },
    snapshotPolicy: BROAD_SNAPSHOT_POLICY,
    knowledgeVersion: 'broad-domain-snapshot-1',
  };
};
