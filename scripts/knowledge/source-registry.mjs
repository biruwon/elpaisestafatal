export const sourceRegistry = [
  { id: 'ine', publisher: 'Instituto Nacional de Estadística', domains: ['ine.es'], trustTier: 'primary', connector: 'ine-table', schedule: 'daily', formats: ['json'] },
  { id: 'eurostat', publisher: 'Eurostat', domains: ['ec.europa.eu'], trustTier: 'primary', connector: 'json-stat', schedule: 'daily', formats: ['json'] },
  { id: 'boe', publisher: 'Agencia Estatal BOE', domains: ['boe.es'], trustTier: 'primary', connector: 'boe-summary', schedule: 'hourly', formats: ['html', 'xml', 'pdf', 'json'] },
  { id: 'lamoncloa', publisher: 'La Moncloa', domains: ['lamoncloa.gob.es'], trustTier: 'primary', connector: 'official-document', schedule: 'daily', formats: ['html', 'pdf'] },
  { id: 'hacienda', publisher: 'Ministerio de Hacienda', domains: ['hacienda.gob.es'], trustTier: 'primary', connector: 'official-document', schedule: 'daily', formats: ['json', 'html', 'pdf'] },
  { id: 'interior', publisher: 'Ministerio del Interior', domains: ['interior.gob.es'], trustTier: 'primary', connector: 'official-document', schedule: 'daily', formats: ['json', 'html', 'pdf'] },
  { id: 'policia', publisher: 'Policía Nacional', domains: ['policia.es'], trustTier: 'primary', connector: 'official-document', schedule: 'daily', formats: ['html', 'pdf'] },
  { id: 'guardia-civil', publisher: 'Guardia Civil', domains: ['guardiacivil.es'], trustTier: 'primary', connector: 'official-document', schedule: 'daily', formats: ['html', 'pdf'] },
  { id: 'fiscalia', publisher: 'Fiscalía General del Estado', domains: ['fiscal.es'], trustTier: 'primary', connector: 'official-document', schedule: 'daily', formats: ['html', 'pdf'] },
  { id: 'social-security', publisher: 'Seguridad Social', domains: ['seg-social.es'], trustTier: 'primary', connector: 'official-document', schedule: 'daily', formats: ['json', 'html', 'pdf'] },
  { id: 'sepe', publisher: 'SEPE', domains: ['sepe.es'], trustTier: 'primary', connector: 'official-document', schedule: 'daily', formats: ['json', 'html', 'pdf'] },
  { id: 'bank-of-spain', publisher: 'Banco de España', domains: ['bde.es'], trustTier: 'primary', connector: 'official-document', schedule: 'weekly', formats: ['json', 'html', 'pdf'] },
  { id: 'datos-gob', publisher: 'datos.gob.es', domains: ['datos.gob.es'], trustTier: 'discovery', connector: 'catalogue', schedule: 'daily', formats: ['json', 'html'] },
  { id: 'congress', publisher: 'Congreso de los Diputados', domains: ['congreso.es'], trustTier: 'primary', connector: 'official-document', schedule: 'daily', formats: ['html', 'pdf'] },
  { id: 'senate', publisher: 'Senado', domains: ['senado.es'], trustTier: 'primary', connector: 'official-document', schedule: 'daily', formats: ['html', 'pdf'] },
  { id: 'judiciary', publisher: 'Consejo General del Poder Judicial', domains: ['poderjudicial.es'], trustTier: 'primary', connector: 'official-document', schedule: 'weekly', formats: ['html', 'pdf'] },
  { id: 'miteco', publisher: 'Ministerio para la Transición Ecológica y el Reto Demográfico', domains: ['miteco.gob.es'], trustTier: 'primary', connector: 'official-document', schedule: 'weekly', formats: ['html', 'pdf'] },
  { id: 'health-ministry', publisher: 'Ministerio de Sanidad', domains: ['sanidad.gob.es'], trustTier: 'primary', connector: 'official-document', schedule: 'weekly', formats: ['html', 'pdf'] },
  { id: 'aemet', publisher: 'Agencia Estatal de Meteorología', domains: ['aemet.es'], trustTier: 'primary', connector: 'official-document', schedule: 'daily', formats: ['json', 'html', 'pdf'] },
  { id: 'airef', publisher: 'Autoridad Independiente de Responsabilidad Fiscal', domains: ['airef.es'], trustTier: 'primary', connector: 'official-document', schedule: 'weekly', formats: ['html', 'pdf'] },
  { id: 'cnmc', publisher: 'Comisión Nacional de los Mercados y la Competencia', domains: ['cnmc.es'], trustTier: 'primary', connector: 'official-document', schedule: 'weekly', formats: ['json', 'html', 'pdf'] },
  { id: 'cnmv', publisher: 'Comisión Nacional del Mercado de Valores', domains: ['cnmv.es'], trustTier: 'primary', connector: 'official-document', schedule: 'daily', formats: ['html', 'pdf'] },
  { id: 'isciii', publisher: 'Instituto de Salud Carlos III', domains: ['isciii.es'], trustTier: 'primary', connector: 'official-document', schedule: 'weekly', formats: ['html', 'pdf'] },
  { id: 'defensor-pueblo', publisher: 'Defensor del Pueblo', domains: ['defensordelpueblo.es'], trustTier: 'primary', connector: 'official-document', schedule: 'weekly', formats: ['html', 'pdf'] },
  { id: 'administracion', publisher: 'Administración General del Estado', domains: ['administracion.gob.es'], trustTier: 'primary', connector: 'official-document', schedule: 'daily', formats: ['html', 'pdf', 'json'] },
  { id: 'ceuta', publisher: 'Ciudad Autónoma de Ceuta', domains: ['ceuta.es'], trustTier: 'primary', connector: 'official-document', schedule: 'daily', formats: ['html', 'pdf'] },
  { id: 'melilla', publisher: 'Ciudad Autónoma de Melilla', domains: ['melilla.es'], trustTier: 'primary', connector: 'official-document', schedule: 'daily', formats: ['html', 'pdf'] },
];

export const approvedSourceHosts = sourceRegistry.flatMap((source) => source.domains);

export const sourceForHost = (hostname) => sourceRegistry.find((source) => source.domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`)));

// Event and live-web sources use the same versioned registry, while remaining
// separate from the warehouse trust tier used for durable source snapshots.
export const liveSourceRegistry = [
  { id: 'tribunal-constitucional', publisher: 'Tribunal Constitucional', role: 'primary', domains: ['tribunalconstitucional.es'] },
  { id: 'junta-extremadura', publisher: 'Junta de Extremadura', role: 'primary', domains: ['juntaex.es'] },
  { id: 'efe', publisher: 'Agencia EFE', role: 'corroboration', domains: ['efe.com'] },
  { id: 'rtve', publisher: 'RTVE', role: 'corroboration', domains: ['rtve.es'] },
  { id: 'europa-press', publisher: 'Europa Press', role: 'corroboration', domains: ['europapress.es'] },
  { id: 'maldita', publisher: 'Maldita.es', role: 'corroboration', domains: ['maldita.es'] },
  { id: 'newtral', publisher: 'Newtral', role: 'corroboration', domains: ['newtral.es'] },
  { id: 'verificat', publisher: 'Verificat', role: 'corroboration', domains: ['verificat.cat'] },
];

export const liveSourceForHost = (hostname) => {
  const host = String(hostname || '').replace(/^www\./, '').toLocaleLowerCase('es');
  const registered = sourceForHost(host);
  // Discovery/catalogue hosts may help locate a document, but they are not
  // incident evidence. Only explicitly primary registry entries can be used
  // as primary live-event sources.
  if (registered?.trustTier === 'primary') return { id: registered.id, publisher: registered.publisher, role: 'primary', domains: registered.domains };
  return liveSourceRegistry.find((source) => source.domains.some((domain) => host === domain || host.endsWith(`.${domain}`)));
};
