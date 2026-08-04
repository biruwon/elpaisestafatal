const normalise = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

const valueFor = (row, aliases) => {
  const entries = Object.entries(row || {});
  const found = entries.find(([key]) => aliases.some((alias) => normalise(key) === normalise(alias)));
  return found?.[1] ?? null;
};

const numberFor = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? '').replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

const common = (row, source, index) => ({
  id: `${source.id}-domain-${index}`,
  kind: 'observation',
  sourceId: source.id,
  datasetId: source.title,
  period: valueFor(row, ['period', 'periodo', 'year', 'año', 'fecha']),
  geography: valueFor(row, ['geography', 'territory', 'territorio', 'region', 'municipio', 'comunidad']),
  population: valueFor(row, ['population', 'poblacion', 'población', 'grupo', 'group']),
  dimensions: {
    group: valueFor(row, ['group', 'grupo', 'nationality', 'nacionalidad', 'citizenship', 'ciudadania']),
    category: valueFor(row, ['category', 'categoria', 'categoría', 'benefit', 'prestacion', 'delito', 'offence', 'programa']),
  },
  url: source.url,
});

const parsers = {
  immigration_benefits: (rows, source) => rows.map((row, index) => ({
    ...common(row, source, index), metricId: row.metricId || 'benefit_recipients_by_group', metric: row.metric || 'Beneficiarios de prestaciones por grupo', value: numberFor(valueFor(row, ['value', 'valor', 'beneficiaries', 'beneficiarios', 'holders', 'titulares', 'count', 'numero'])), unit: valueFor(row, ['unit', 'unidad']) || 'personas',
  })),
  immigration_crime: (rows, source) => rows.map((row, index) => ({
    ...common(row, source, index), metricId: 'crime_rate_by_group', metric: 'Delitos o condenas por grupo', value: numberFor(valueFor(row, ['rate', 'tasa', 'value', 'valor', 'count', 'numero'])), unit: valueFor(row, ['unit', 'unidad']) || 'tasa o personas',
  })),
  public_housing_allocation: (rows, source) => rows.map((row, index) => ({
    ...common(row, source, index), metricId: 'public_housing_allocations_by_group', metric: 'Adjudicaciones de vivienda pública por grupo', value: numberFor(valueFor(row, ['allocations', 'adjudicaciones', 'value', 'valor', 'count', 'numero'])), unit: valueFor(row, ['unit', 'unidad']) || 'adjudicaciones',
  })),
};

export const domainConnectorFor = (domain) => parsers[domain];

export const parseDelimited = (text) => {
  const lines = String(text || '').trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(';').length > lines[0].split(',').length ? lines[0].split(';') : lines[0].split(',');
  const separator = headers.length === lines[0].split(';').length ? ';' : ',';
  return lines.slice(1).map((line) => {
    const cells = line.split(separator);
    return Object.fromEntries(headers.map((header, index) => [header.trim(), String(cells[index] || '').trim()]));
  });
};

export const parseSpreadsheetBuffer = async (buffer) => {
  const { read, utils } = await import('xlsx');
  const workbook = read(buffer, { type: 'buffer', cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return sheet ? utils.sheet_to_json(sheet, { defval: '' }) : [];
};

export const parsePdfText = (text) => {
  const lines = String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const nationalityHeader = lines.findIndex((line) => /hombres\s+mujeres\s+española\s+extranjera/i.test(line));
  if (nationalityHeader >= 0) {
    const month = lines.join(' ').match(/nómina de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+(20\d{2})/i);
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const period = month ? `${month[2]}-${String(months.indexOf(month[1].toLocaleLowerCase('es')) + 1).padStart(2, '0')}` : null;
    const row = lines.slice(nationalityHeader + 1).find((line) => /^Total\s+\d[\d.]*\s+\d[\d.]*\s+\d[\d.]*\s+\d[\d.]*\s+\d[\d.]*/i.test(line));
    if (row && period) {
      const numbers = [...row.matchAll(/\d[\d.]*/g)].map((match) => numberFor(match[0]));
      if (numbers.length >= 5) return [
        { period, geography: 'España', group: 'Española', value: numbers[3], metricId: 'imv_title_holders_by_nationality', metric: 'Titulares del IMV por nacionalidad' },
        { period, geography: 'España', group: 'Extranjera', value: numbers[4], metricId: 'imv_title_holders_by_nationality', metric: 'Titulares del IMV por nacionalidad' },
      ];
    }
  }
  const headerIndex = lines.findIndex((line) => /period|periodo|año|year/i.test(line) && /grupo|group|nacionalidad|territorio|geography/i.test(line));
  if (headerIndex < 0) return [];
  const headers = lines[headerIndex].split(/\t+|;|\s{2,}/).map((item) => item.trim()).filter(Boolean);
  return lines.slice(headerIndex + 1).map((line) => line.split(/\t+|;|\s{2,}/).map((item) => item.trim())).filter((cells) => cells.length >= headers.length).map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] || ''])));
};

export const parseDomainPayload = (domain, payload, source) => {
  const parser = domainConnectorFor(domain);
  if (!parser) throw new Error(`Unknown domain connector: ${domain}`);
  const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.rows) ? payload.rows : [];
  const records = parser(rows, source).filter((record) => record.value !== null && record.period && record.geography);
  if (!records.length) throw new Error(`${domain} source did not provide value, period, and geography dimensions`);
  return records;
};

export const domainConnectorIds = () => Object.keys(parsers);
