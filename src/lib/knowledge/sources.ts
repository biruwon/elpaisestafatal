export type SourceConnectorDefinition = {
  id: string;
  publisher: string;
  trustTier: 'primary' | 'discovery';
  domains: string[];
  allowedHosts: string[];
  formats: string[];
};

export const sourceRegistry: SourceConnectorDefinition[] = [
  { id: 'ine', publisher: 'Instituto Nacional de Estadística', trustTier: 'primary', domains: ['population', 'migration', 'employment', 'housing', 'prices', 'income'], allowedHosts: ['ine.es'], formats: ['json', 'csv', 'html'] },
  { id: 'eurostat', publisher: 'Eurostat', trustTier: 'primary', domains: ['european-comparisons', 'employment', 'population', 'prices', 'income'], allowedHosts: ['ec.europa.eu'], formats: ['json', 'csv', 'sdmx'] },
  { id: 'boe', publisher: 'Agencia Estatal BOE', trustTier: 'primary', domains: ['legislation', 'appointments', 'government-decisions'], allowedHosts: ['boe.es'], formats: ['xml', 'html', 'pdf'] },
  { id: 'council-of-ministers', publisher: 'La Moncloa', trustTier: 'primary', domains: ['government-decisions', 'budgets'], allowedHosts: ['lamoncloa.gob.es'], formats: ['html', 'pdf'] },
  { id: 'finance', publisher: 'Ministerio de Hacienda', trustTier: 'primary', domains: ['budgets', 'taxes', 'public-finance'], allowedHosts: ['hacienda.gob.es'], formats: ['csv', 'json', 'html', 'pdf'] },
  { id: 'interior', publisher: 'Ministerio del Interior', trustTier: 'primary', domains: ['crime', 'security', 'migration'], allowedHosts: ['interior.gob.es'], formats: ['csv', 'html', 'pdf'] },
  { id: 'social-security', publisher: 'Seguridad Social', trustTier: 'primary', domains: ['employment', 'pensions', 'benefits'], allowedHosts: ['seg-social.es'], formats: ['csv', 'html', 'pdf'] },
  { id: 'sepe', publisher: 'SEPE', trustTier: 'primary', domains: ['employment', 'unemployment', 'benefits'], allowedHosts: ['sepe.es'], formats: ['csv', 'html', 'pdf'] },
  { id: 'banco-de-espana', publisher: 'Banco de España', trustTier: 'primary', domains: ['economy', 'housing', 'credit', 'public-finance'], allowedHosts: ['bde.es'], formats: ['csv', 'json', 'html', 'pdf'] },
  { id: 'datos-gob', publisher: 'datos.gob.es', trustTier: 'discovery', domains: ['discovery'], allowedHosts: ['datos.gob.es'], formats: ['json', 'html'] },
  { id: 'airef', publisher: 'Autoridad Independiente de Responsabilidad Fiscal', trustTier: 'primary', domains: ['public-finance', 'budgets', 'pensions'], allowedHosts: ['airef.es'], formats: ['html', 'pdf'] },
  { id: 'cnmc', publisher: 'Comisión Nacional de los Mercados y la Competencia', trustTier: 'primary', domains: ['prices', 'energy', 'competition', 'telecommunications'], allowedHosts: ['cnmc.es'], formats: ['json', 'html', 'pdf'] },
  { id: 'cnmv', publisher: 'Comisión Nacional del Mercado de Valores', trustTier: 'primary', domains: ['finance', 'markets'], allowedHosts: ['cnmv.es'], formats: ['html', 'pdf'] },
  { id: 'aemet', publisher: 'Agencia Estatal de Meteorología', trustTier: 'primary', domains: ['weather', 'climate', 'environment'], allowedHosts: ['aemet.es'], formats: ['json', 'html', 'pdf'] },
  { id: 'isciii', publisher: 'Instituto de Salud Carlos III', trustTier: 'primary', domains: ['health', 'research'], allowedHosts: ['isciii.es'], formats: ['html', 'pdf'] },
  { id: 'defensor-pueblo', publisher: 'Defensor del Pueblo', trustTier: 'primary', domains: ['rights', 'public-services'], allowedHosts: ['defensordelpueblo.es'], formats: ['html', 'pdf'] },
  { id: 'administracion', publisher: 'Administración General del Estado', trustTier: 'primary', domains: ['government', 'public-services'], allowedHosts: ['administracion.gob.es'], formats: ['html', 'pdf', 'json'] },
  { id: 'ceuta', publisher: 'Ciudad Autónoma de Ceuta', trustTier: 'primary', domains: ['regional-government', 'local-services'], allowedHosts: ['ceuta.es'], formats: ['html', 'pdf'] },
  { id: 'melilla', publisher: 'Ciudad Autónoma de Melilla', trustTier: 'primary', domains: ['regional-government', 'local-services'], allowedHosts: ['melilla.es'], formats: ['html', 'pdf'] },
];

export const sourceForHost = (host: string): SourceConnectorDefinition | undefined => sourceRegistry.find((source) => source.allowedHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`)));
