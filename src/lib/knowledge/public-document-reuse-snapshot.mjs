import { knownSubnationalGeographyIds } from './geography-scope.mjs';

const source = {
  id: 'boe-law-39-2015-art28-document-reuse',
  title: 'Ley 39/2015 del Procedimiento Administrativo Común · artículo 28',
  publisher: 'BOE',
  url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565&p=20261001&tn=1',
  publishedAt: '2015-10-01',
  retrievedAt: '2026-11-24',
  role: 'primary',
};

const normalize = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const yearsFor = (claim) => [...normalize(claim).replace(/\bley\s+\d+\s+20\d{2}\b/g, ' ').matchAll(/\b20\d{2}\b/g)].map(([year]) => Number(year));
const mentionsHeldElsewhere = (text) => /\b(otra\w* administraci\w*|administraci\w* distinta|en poder de|ya (?:lo|la|los|las )?(?:tien\w*|dispone\w*|const\w*|obra\w*|recib\w*|recab\w*)|ya aportad\w*|ya presentad\w*|ya entregad\w*)\b/.test(text)
  || /\b(?:elabor|prepar|emit|exped|cread)\w*\b.{0,28}\b(?:otra\w* )?(?:administraci\w*|organismo\w* public\w*)\b/.test(text);

export const publicDocumentReuseClaimFor = (claim) => {
  const text = normalize(claim);
  const administration = /\b(administraci\w*|organismo\w* public\w*|entidad\w* public\w*|oficina\w* public\w*|ayuntamiento\w*)\b/.test(text);
  const record = /\b(document\w*|certificad\w*|justificant\w*|papel\w*|dato\w*)\b/.test(text);
  const requestOrRule = /\b(ped\w*|pid\w*|exig\w*|solicit\w*|aport\w*|present\w*|entreg\w*|consult\w*|recab\w*|recog\w*|derecho\w*|obligaci\w*|deben?\b|deber\w*|norma\w*|ley\w*|art[ií]culo\w*)\b/.test(text);
  return administration && record && requestOrRule && mentionsHeldElsewhere(text)
    && !/\b(vida laboral|antecedentes penales|registro civil|documento nacional de identidad|dni|pasaporte)\b/.test(text);
};

export const publicDocumentReuseLegalQuestionFor = (claim) => /\b(ley\w*|norma\w*|art[ií]culo\w*|derecho\w*|obligaci\w*|deben?\b|deber\w*|est[aá]n obligad\w*|pueden? oponerse|pued\w* no (?:present\w*|aport\w*|entreg\w*)|puedo negarme|no tiene que)\b/.test(normalize(claim));

const facts = [
  'La Ley 39/2015 (art. 28.2) reconoce el derecho a no aportar documentos que ya posee la administración que tramita o que elaboró otra; si no hay oposición, deben recabarse electrónicamente. No cabe oponerse en procedimientos sancionadores o de inspección. El art. 28.3 cubre documentos ya presentados si se indica cuándo y dónde, salvo oposición o consentimiento exigido por ley especial; si excepcionalmente no pueden recabarse, pueden volver a pedirlos.',
];
const factDimensions = [{
  subject: 'derecho y deberes de consulta y reutilización de documentos en un procedimiento administrativo común',
  population: 'personas interesadas y administraciones públicas sujetas a la Ley 39/2015',
  period: 'Ley 39/2015; texto consolidado consultado el 01-10-2026',
  geography: 'España; la regla nacional cubre los ámbitos subnacionales sujetos a esta ley',
  denominator: 'no aplica: norma jurídica, no recuento de solicitudes ni de incumplimientos',
  unit: 'derechos, deberes y excepciones legales',
}];
const noExceptionClaim = (text) => /\b(siempre|nunca|jamas|ningun\w*|en ningun caso|en todos los casos|sin excepcion\w*|aunque (?:la persona|el interesado) se oponga|incluso en (?:procedimientos? )?(?:sancionadores?|inspecciones?))\b/.test(text);
const claimVerdictFor = (claim) => {
  const text = normalize(claim);
  if (noExceptionClaim(text) && /\b(oposici\w*|oponer\w*|sancion\w*|inspecci\w*|consentimiento|document\w*|aport\w*|present\w*|entreg\w*|ped\w*|solicit\w*|recab\w*)\b/.test(text)) return 'contradicted';
  if (/\b(no tienen derecho|deben aportar|deben presentar|estan obligad\w* a (?:aportar|presentar|entregar))\b/.test(text)) return 'contradicted';
  return 'supported';
};

export const PUBLIC_DOCUMENT_REUSE_SNAPSHOT = Object.freeze({
  schemaVersion: '1',
  owner: 'knowledge-review',
  createdAt: '2026-11-24',
  asOf: '2026-11-24',
  expiresAt: '2027-11-24',
  validationStatus: 'reviewed',
  territories: ['ES', ...knownSubnationalGeographyIds],
  directClaimEvidence: false,
  when: (claim) => {
    const years = yearsFor(claim);
    return publicDocumentReuseClaimFor(claim) && years.every((year) => year >= 2018 && year <= 2026);
  },
  evidenceLabel: 'Derecho a no aportar documentos ya disponibles en otra administración · Ley 39/2015, artículo 28',
  supportedScope: 'procedimientos administrativos sujetos a la Ley 39/2015 en España; regla vigente desde la reforma de 2018 y texto consolidado consultado en 2026',
  unsupportedScope: 'frecuencia real de solicitudes repetidas; cumplimiento de la norma en cada oficina; procedimientos sujetos a normativa especial; tiempo o coste que su incumplimiento causa a la ciudadanía',
  dimensions: factDimensions[0],
  facts,
  factSourceIds: [[source.id]],
  factDimensions,
  sources: [source],
  selectForClaim: ({ claim }) => {
    if (!publicDocumentReuseClaimFor(claim)) return undefined;
    const direct = publicDocumentReuseLegalQuestionFor(claim);
    return {
      ...PUBLIC_DOCUMENT_REUSE_SNAPSHOT,
      directClaimEvidence: direct,
      claimVerdictFor: direct ? claimVerdictFor : undefined,
      facts,
      factSourceIds: [[source.id]],
      factDimensions,
      sources: [source],
      evidenceLabel: direct ? 'Qué establece el artículo 28 de la Ley 39/2015 sobre documentos ya disponibles'
        : 'Regla legal y límites de la evidencia sobre solicitudes repetidas de documentos',
    };
  },
});
