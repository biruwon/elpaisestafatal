export const sourceRegistry = [
  { id: 'ine', publisher: 'Instituto Nacional de Estadística', domains: ['ine.es'], trustTier: 'primary', connector: 'ine-table', schedule: 'daily', formats: ['json'] },
  { id: 'eurostat', publisher: 'Eurostat', domains: ['ec.europa.eu'], trustTier: 'primary', connector: 'json-stat', schedule: 'daily', formats: ['json'] },
  { id: 'boe', publisher: 'Agencia Estatal BOE', domains: ['boe.es'], trustTier: 'primary', connector: 'boe-summary', schedule: 'hourly', formats: ['html', 'xml', 'pdf', 'json'] },
  { id: 'lamoncloa', publisher: 'La Moncloa', domains: ['lamoncloa.gob.es'], trustTier: 'primary', connector: 'official-document', schedule: 'daily', formats: ['html', 'pdf'] },
  { id: 'hacienda', publisher: 'Ministerio de Hacienda', domains: ['hacienda.gob.es'], trustTier: 'primary', connector: 'official-document', schedule: 'daily', formats: ['json', 'html', 'pdf'] },
  { id: 'interior', publisher: 'Ministerio del Interior', domains: ['interior.gob.es'], trustTier: 'primary', connector: 'official-document', schedule: 'daily', formats: ['json', 'html', 'pdf'] },
  { id: 'social-security', publisher: 'Seguridad Social', domains: ['seg-social.es'], trustTier: 'primary', connector: 'official-document', schedule: 'daily', formats: ['json', 'html', 'pdf'] },
  { id: 'sepe', publisher: 'SEPE', domains: ['sepe.es'], trustTier: 'primary', connector: 'official-document', schedule: 'daily', formats: ['json', 'html', 'pdf'] },
  { id: 'bank-of-spain', publisher: 'Banco de España', domains: ['bde.es'], trustTier: 'primary', connector: 'official-document', schedule: 'weekly', formats: ['json', 'html', 'pdf'] },
  { id: 'datos-gob', publisher: 'datos.gob.es', domains: ['datos.gob.es'], trustTier: 'discovery', connector: 'catalogue', schedule: 'daily', formats: ['json', 'html'] },
  { id: 'congress', publisher: 'Congreso de los Diputados', domains: ['congreso.es'], trustTier: 'primary', connector: 'official-document', schedule: 'daily', formats: ['html', 'pdf'] },
  { id: 'senate', publisher: 'Senado', domains: ['senado.es'], trustTier: 'primary', connector: 'official-document', schedule: 'daily', formats: ['html', 'pdf'] },
  { id: 'judiciary', publisher: 'Consejo General del Poder Judicial', domains: ['poderjudicial.es'], trustTier: 'primary', connector: 'official-document', schedule: 'weekly', formats: ['html', 'pdf'] },
];

export const approvedSourceHosts = sourceRegistry.flatMap((source) => source.domains);

export const sourceForHost = (hostname) => sourceRegistry.find((source) => source.domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`)));
