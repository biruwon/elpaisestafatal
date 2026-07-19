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
    parserVersion: 'boe-summary-v2',
    description: 'BOE daily publication summaries and consolidated-legislation metadata',
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
};

export const connectorForId = (id) => connectorRegistry[id];

export const formatForContentType = (contentType = '') => {
  const value = contentType.toLowerCase();
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
