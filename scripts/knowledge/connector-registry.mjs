export const connectorRegistry = {
  'ine-table': {
    formats: ['json'],
    parserVersion: 'ine-table-v1',
    description: 'INE DATOS_TABLA series with nested Data observations',
  },
  'json-stat': {
    formats: ['json'],
    parserVersion: 'json-stat-v1',
    description: 'JSON-stat datasets such as Eurostat dissemination responses',
  },
  'boe-summary': {
    formats: ['json', 'xml', 'html', 'pdf'],
    parserVersion: 'boe-summary-v3',
    description: 'BOE daily summaries, consolidated-law metadata, and versioned article blocks',
  },
  catalogue: {
    formats: ['json', 'html'],
    parserVersion: 'catalogue-v1',
    description: 'Dataset catalogue metadata; never direct proof',
  },
  'official-document': {
    formats: ['json', 'html', 'xml', 'pdf', 'text'],
    parserVersion: 'official-document-v1',
    description: 'Bounded official document retrieval and metadata storage',
  },
  'regional-open-data': {
    formats: ['json', 'csv', 'xml', 'html'],
    parserVersion: 'regional-open-data-v1',
    description: 'Regional and municipal open-data portals with explicit geography and period dimensions',
    requiredDimensions: ['geography', 'period', 'unit', 'source_role'],
  },
  'judicial-records': {
    formats: ['json', 'xml', 'html', 'pdf', 'text'],
    parserVersion: 'judicial-records-v1',
    description: 'Official court, Fiscalía, and judicial-statistics records preserving legal stage and jurisdiction',
    requiredDimensions: ['jurisdiction', 'legal_stage', 'period', 'source_role'],
  },
  procurement: {
    formats: ['json', 'xml', 'html', 'csv'],
    parserVersion: 'procurement-v1',
    description: 'Public procurement and infrastructure records preserving contracting authority, amount, status, and dates',
    requiredDimensions: ['contracting_authority', 'amount', 'status', 'period', 'source_role'],
  },
};

export const connectorForId = (id) => connectorRegistry[id];

export const formatForContentType = (contentType = '') => {
  const value = contentType.toLowerCase();
  if (value.includes('csv') || value.includes('tab-separated')) return 'csv';
  if (value.includes('json')) return 'json';
  if (value.includes('html')) return 'html';
  if (value.includes('xml')) return 'xml';
  if (value.includes('pdf')) return 'pdf';
  return 'text';
};

export const connectorSupports = (connectorId, contentType) => {
  const connector = connectorForId(connectorId);
  return Boolean(connector && connector.formats.includes(formatForContentType(contentType)));
};
