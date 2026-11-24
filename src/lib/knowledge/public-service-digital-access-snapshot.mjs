const sources = [
  {
    id: 'ine-tich-2026-egovernment-documentation',
    title: 'Documentación oficial o reclamación por web o apps de las administraciones · TIC-H 2026',
    publisher: 'INE',
    url: 'https://www.ine.es/jaxi/Tabla.htm?L=0&tpx=82795',
    retrievedAt: '2026-11-24',
    role: 'primary',
  },
  {
    id: 'ine-tich-2026-egovernment-nonuse-reasons',
    title: 'Razones para no solicitar documentación o reclamación online teniendo necesidad · TIC-H 2026',
    publisher: 'INE',
    url: 'https://www.ine.es/jaxi/Tabla.htm?L=0&tpx=82797',
    retrievedAt: '2026-11-24',
    role: 'primary',
  },
  {
    id: 'ine-tich-2026-egovernment-problems',
    title: 'Problemas al utilizar sitios web o apps de las administraciones · TIC-H 2026',
    publisher: 'INE',
    url: 'https://www.ine.es/jaxi/Tabla.htm?L=0&tpx=82799',
    retrievedAt: '2026-11-24',
    role: 'primary',
  },
];

const [documentationSource, nonuseSource, problemsSource] = sources;
const normalize = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const yearsFor = (claim) => [...normalize(claim).matchAll(/\b20\d{2}\b/g)].map(([year]) => year);
const olderAge = (text) => /\b(mayor\w*|ancian\w*|65 a 74|65 74|tercera edad|jubilad\w*)\b/.test(text);
const publicServiceDigitalAccessClaim = (claim) => {
  const text = normalize(claim);
  const publicService = /\b(administraci\w*|servicios? public\w*|gestion\w* public\w*|tramites?|sede electronica|gobierno|web\w* public\w*|apps? public\w*|paginas? public\w*|document\w* oficial\w*|reclamaci\w*)\b/.test(text);
  const digitalChannel = /\b(digital\w*|online|internet|web\w*|apps?|electron\w*|en linea)\b/.test(text);
  const relevantIssue = /\b(exclu\w*|barrer\w*|dificult\w*|problem\w*|fall\w*|error\w*|habilidad\w*|conocimient\w*|competenc\w*|acces\w*|utiliz\w*|us\w*|solicit\w*|pid\w*|pued\w*|traslad\w*|carg\w*|necesidad\w*|necesit\w*)\b/.test(text);
  const unrelatedAdministrativeClaim = /\b(cita previa|citas? (?:para|de) (?:la )?(?:dgt|hacienda|extranjeria)|otras? administraciones? ya|ya (?:los )?tienen|obra en poder)\b/.test(text);
  return publicService && digitalChannel && relevantIssue && !unrelatedAdministrativeClaim;
};

const digitalAccessMeasureFor = (claim) => {
  const text = normalize(claim);
  const years = yearsFor(claim);
  if (years.some((year) => year !== '2026') || /\b(actual\w*|hoy|ahora|vigente|en este momento)\b/.test(text)) return undefined;
  const onlineNeedNotCompleted = /\b(no (?:se )?(?:(?:lo|la|los|las|un|una|el) )?(?:solicit\w*|pid\w*|tramitar\w*|present\w*|realiz\w*|hicieron|pudo|pudieron|logr\w*|consig\w*)|sin (?:poder|llegar a|conseguir|solicitar)|no llegaron a)\b/.test(text)
    && /\b(necesidad|necesit\w*|document\w*|certificad\w*|reclamaci\w*|tramite\w*)\b/.test(text);
  const skills = /\b(habilidad\w*|conocimient\w*|competenc\w*|no saber|falta de preparacion)\b/.test(text);
  const problemsWhileUsing = /\b(problem\w*|dificult\w*|fall\w*|error\w*|complicad\w*)\b/.test(text)
    && /\b(utiliz\w*|us\w*|al acceder|acceder|entrar|firm\w*|p[aá]gina|web\w*|apps?)\b/.test(text);
  const explicitDigitalServiceUsers = /\b(usuario\w*|usaron|han usado|han utilizad\w*|utilizaron|quienes usaron|quienes utilizaron)\b/.test(text);

  if (skills && onlineNeedNotCompleted) return olderAge(text) ? 'older-skills' : 'skills';
  if (onlineNeedNotCompleted) return olderAge(text) ? 'older-unmet-need' : 'unmet-need';
  if (problemsWhileUsing && explicitDigitalServiceUsers) return olderAge(text) ? 'age-problems' : 'problems';
  return undefined;
};

const findings = [
  'En la Encuesta TIC-H 2026 del INE, el 4,4 % de las personas de 16–74 años no solicitó por internet un documento oficial o una reclamación durante los últimos 12 meses, aunque necesitaba hacerlo. El denominador es toda la población de 16–74 años; no mide todas las gestiones administrativas.',
  'Encuesta TIC-H 2026 del INE: entre las personas de 65–74 años, el 6,5 % no solicitó por internet un documento oficial o una reclamación durante los últimos 12 meses, aunque necesitaba hacerlo. El porcentaje usa como denominador a todas las personas de 65–74 años.',
  'Encuesta TIC-H 2026 del INE: entre las personas de 16–24 años, el 2,4 % no solicitó por internet un documento oficial o una reclamación durante los últimos 12 meses, aunque necesitaba hacerlo. El porcentaje usa como denominador a todas las personas de 16–24 años.',
  'Encuesta TIC-H 2026 del INE: entre los usuarios de internet de 16–74 años que necesitaban un documento oficial o una reclamación y no la solicitaron por internet, el 51,1 % declaró falta de habilidades o conocimientos. No es el porcentaje de toda la población.',
  'Encuesta TIC-H 2026 del INE: entre los usuarios de internet de 65–74 años que necesitaban un documento oficial o una reclamación y no la solicitaron por internet, el 73,3 % declaró falta de habilidades o conocimientos. No es el porcentaje de todas las personas mayores.',
  'Encuesta TIC-H 2026 del INE: entre las personas de 16–74 años que usaron por motivos particulares una web o app de las administraciones durante los últimos 12 meses, el 55,9 % declaró haber tenido algún problema. Quienes no usaron esos canales no forman parte de este denominador.',
  'Encuesta TIC-H 2026 del INE: entre quienes usaron por motivos particulares una web o app de las administraciones durante los últimos 12 meses, declaró algún problema el 55,8 % de las personas de 16–24 años y el 51,9 % de las de 65–74. La dificultad de uso fue del 31,4 % y el 35,4 %, respectivamente. Son porcentajes entre usuarios de cada edad, no entre toda la población de esos grupos.',
];

const factDimensions = [
  {
    subject: 'personas que necesitaban solicitar un documento oficial o una reclamación y no lo hicieron por internet',
    population: 'personas de 16–74 años residentes en hogares privados en España',
    period: 'Encuesta TIC-H 2026; últimos 12 meses',
    geography: 'España',
    denominator: 'todas las personas de 16–74 años',
    unit: 'porcentaje de personas',
  },
  {
    subject: 'personas de 65–74 años que necesitaban solicitar un documento oficial o una reclamación y no lo hicieron por internet',
    population: 'personas de 65–74 años residentes en hogares privados en España',
    period: 'Encuesta TIC-H 2026; últimos 12 meses',
    geography: 'España',
    denominator: 'todas las personas de 65–74 años',
    unit: 'porcentaje de personas',
  },
  {
    subject: 'personas de 16–24 años que necesitaban solicitar un documento oficial o una reclamación y no lo hicieron por internet',
    population: 'personas de 16–24 años residentes en hogares privados en España',
    period: 'Encuesta TIC-H 2026; últimos 12 meses',
    geography: 'España',
    denominator: 'todas las personas de 16–24 años',
    unit: 'porcentaje de personas',
  },
  {
    subject: 'falta de habilidades o conocimientos declarada por quienes necesitaban un documento oficial o una reclamación y no la solicitaron por internet',
    population: 'usuarios de internet de 16–74 años que necesitaban el trámite y no lo solicitaron por internet',
    period: 'Encuesta TIC-H 2026; últimos 12 meses',
    geography: 'España',
    denominator: 'personas de 16–74 años con necesidad no tramitada online',
    unit: 'porcentaje de ese grupo',
  },
  {
    subject: 'falta de habilidades o conocimientos declarada por quienes necesitaban un documento oficial o una reclamación y no la solicitaron por internet',
    population: 'usuarios de internet de 65–74 años que necesitaban el trámite y no lo solicitaron por internet',
    period: 'Encuesta TIC-H 2026; últimos 12 meses',
    geography: 'España',
    denominator: 'personas de 65–74 años con necesidad no tramitada online',
    unit: 'porcentaje de ese grupo',
  },
  {
    subject: 'problemas al utilizar una web o app pública por motivos particulares',
    population: 'usuarios de internet de 16–74 años que usaron una web o app de las administraciones por motivos particulares',
    period: 'Encuesta TIC-H 2026; últimos 12 meses',
    geography: 'España',
    denominator: 'usuarios de internet de 16–74 años de esos canales públicos',
    unit: 'porcentaje que declaró algún problema',
  },
  {
    subject: 'problemas y dificultades de uso al utilizar webs o apps públicas por motivos particulares',
    population: 'usuarios de internet de 16–24 y 65–74 años que usaron webs o apps públicas',
    period: 'Encuesta TIC-H 2026; últimos 12 meses',
    geography: 'España',
    denominator: 'usuarios de webs o apps públicas dentro de cada grupo de edad',
    unit: 'porcentaje que declaró problemas o dificultad de uso',
  },
];

const sourceIdsByFact = [
  [documentationSource.id], [documentationSource.id], [documentationSource.id],
  [nonuseSource.id], [nonuseSource.id], [problemsSource.id], [problemsSource.id],
];
const directFactIndexes = (kind) => ({
  'unmet-need': [0],
  'older-unmet-need': [1],
  skills: [3],
  'older-skills': [4],
  problems: [5],
  'age-problems': [6],
}[kind]);
const expectedPercentages = (kind) => ({
  'unmet-need': [4.4],
  'older-unmet-need': [6.5],
  skills: [51.1],
  'older-skills': [73.3],
  problems: [55.9],
  'age-problems': [55.8, 51.9, 31.4, 35.4],
}[kind] || []);
const claimVerdictFor = (claim, kind) => {
  const raw = String(claim || '');
  const percentages = [...raw.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:%|por ciento)/gi)].map((match) => Number(match[1].replace(',', '.')));
  if (kind === 'age-problems') {
    const normalizedClaim = normalize(claim);
    const asksUseDifficulty = /\b(dificultad\w* de uso|dificultad\w* para usar|complicad\w* de usar)\b/.test(normalizedClaim);
    const expected = asksUseDifficulty ? [31.4, 35.4] : [55.8, 51.9];
    if (!percentages.length) {
      return /\b(mas|mayor|superior|menos|menor|inferior|compar\w*|frente)\b/.test(normalizedClaim) ? 'mixed' : 'supported';
    }
    return percentages.every((value) => expected.some((expectedValue) => Math.abs(value - expectedValue) <= 0.15))
      ? 'supported' : 'contradicted';
  }
  const expected = expectedPercentages(kind);
  if (!percentages.length) return 'supported';
  if (percentages.some((value) => !expected.some((expectedValue) => Math.abs(value - expectedValue) <= 0.15))) return 'contradicted';
  return 'supported';
};

const contextIndexesFor = (claim) => {
  const text = normalize(claim);
  if (/\b(problem\w*|dificult\w*|fall\w*|error\w*)\b/.test(text)) return olderAge(text) ? [6] : [5];
  if (olderAge(text)) return [1, 4];
  return [0, 3];
};

export const PUBLIC_SERVICE_DIGITAL_ACCESS_SNAPSHOT = Object.freeze({
  schemaVersion: '1',
  owner: 'knowledge-review',
  createdAt: '2026-11-24',
  asOf: '2026-11-24',
  expiresAt: '2027-11-05',
  validationStatus: 'reviewed',
  territories: ['ES'],
  directClaimEvidence: false,
  when: (claim) => publicServiceDigitalAccessClaim(claim) && yearsFor(claim).every((year) => year === '2026'),
  evidenceLabel: 'Acceso a trámites y problemas con servicios públicos digitales · Encuesta TIC-H 2026',
  supportedScope: 'España; personas de 16–74 años y uso particular de webs o apps públicas, últimos 12 meses; resultados por edad',
  unsupportedScope: 'exclusión universal; personas mayores de 74 años; causalidad atribuible a la digitalización; todos los trámites o toda la administración; cita previa; carga de trabajo transferida al ciudadano',
  dimensions: {
    subject: 'uso de trámites digitales, necesidad no resuelta por internet, motivos declarados y problemas de uso',
    population: 'personas de 16–74 años en hogares privados; los denominadores varían por tabla y se detallan en cada dato',
    period: 'Encuesta TIC-H 2026; los indicadores se refieren a los últimos 12 meses',
    geography: 'España',
    denominator: 'varía según la tabla: población por edad, personas con una necesidad no tramitada online o usuarios de servicios digitales públicos',
    unit: 'porcentaje de personas; cada porcentaje conserva su población base',
  },
  facts: findings,
  factSourceIds: sourceIdsByFact,
  factDimensions,
  sources,
  selectForClaim: ({ claim }) => {
    const kind = digitalAccessMeasureFor(claim);
    const indexes = kind ? directFactIndexes(kind) : contextIndexesFor(claim);
    if (!indexes?.length) return undefined;
    return {
      ...PUBLIC_SERVICE_DIGITAL_ACCESS_SNAPSHOT,
      directClaimEvidence: Boolean(kind),
      claimVerdictFor: kind ? (submittedClaim) => claimVerdictFor(submittedClaim, kind) : undefined,
      facts: indexes.map((index) => findings[index]),
      factSourceIds: indexes.map((index) => sourceIdsByFact[index]),
      factDimensions: indexes.map((index) => factDimensions[index]),
      sources: [...new Set(indexes.flatMap((index) => sourceIdsByFact[index]))].map((id) => sources.find((source) => source.id === id)),
      evidenceLabel: kind === 'unmet-need' ? 'Necesidad de realizar un trámite que no se completó online'
        : kind === 'older-unmet-need' ? 'Necesidad de realizar un trámite no completado online · 65–74 años'
          : kind === 'skills' ? 'Falta de habilidades entre quienes tenían una necesidad no tramitada online'
            : kind === 'older-skills' ? 'Falta de habilidades entre personas de 65–74 años con una necesidad no tramitada online'
              : kind === 'problems' ? 'Problemas declarados por usuarios de servicios públicos digitales'
                : kind === 'age-problems' ? 'Problemas de uso de servicios públicos digitales por edad'
                  : 'Contexto sobre barreras de acceso a servicios públicos digitales',
    };
  },
});

export const publicServiceDigitalAccessClaimFor = (claim) => publicServiceDigitalAccessClaim(claim);
export const publicServiceDigitalAccessMeasureFor = (claim) => digitalAccessMeasureFor(claim);
