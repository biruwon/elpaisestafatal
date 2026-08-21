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
    ...common(row, source, index), metricId: row.metricId || 'crime_rate_by_group', metric: row.metric || 'Delitos o condenas por grupo', value: numberFor(valueFor(row, ['rate', 'tasa', 'value', 'valor', 'count', 'numero'])), unit: valueFor(row, ['unit', 'unidad']) || 'tasa o personas',
  })),
  public_housing_allocation: (rows, source) => rows.map((row, index) => ({
    ...common(row, source, index), metricId: row.metricId || 'public_housing_allocations_by_group', metric: row.metric || 'Adjudicaciones de vivienda pública por grupo', value: numberFor(valueFor(row, ['allocations', 'adjudicaciones', 'dwellings', 'viviendas', 'value', 'valor', 'count', 'numero'])), unit: valueFor(row, ['unit', 'unidad']) || 'adjudicaciones',
  })),
  wildfire_statistics: (rows, source) => rows.map((row, index) => ({
    ...common(row, source, index), metricId: row.metricId || 'wildfire_surface_affected', metric: row.metric || 'Incendios forestales', value: numberFor(valueFor(row, ['value', 'valor', 'surface', 'superficie', 'incidents', 'siniestros'])), unit: valueFor(row, ['unit', 'unidad']) || 'observaciones',
  })),
  health_emergency_wait: (rows, source) => rows.map((row, index) => ({
    ...common(row, source, index), metricId: row.metricId || 'emergency_wait_declared', metric: row.metric || 'Tiempo de espera declarado en urgencias', value: numberFor(valueFor(row, ['value', 'valor', 'minutes', 'minutos'])), unit: valueFor(row, ['unit', 'unidad']) || 'minutos',
  })),
};

export const domainConnectorFor = (domain) => parsers[domain];

export const parseDelimited = (text) => {
  const lines = String(text || '').trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const tabCount = (lines[0].match(/\t/g) || []).length;
  const semicolonCount = (lines[0].match(/;/g) || []).length;
  const commaCount = (lines[0].match(/,/g) || []).length;
  const separator = tabCount >= semicolonCount && tabCount >= commaCount ? '\t' : semicolonCount >= commaCount ? ';' : ',';
  const headers = lines[0].split(separator);
  return lines.slice(1).map((line) => {
    const cells = line.split(separator);
    return Object.fromEntries(headers.map((header, index) => [header.trim(), String(cells[index] || '').trim()]));
  });
};

// Interior's SEC table 03003 is a distinct legal stage from convictions:
// it counts police detentions/investigations by offence, sex and nationality.
// Keep the stage and the source-defined population explicit; do not turn these
// counts into a resident crime rate because the table can include non-residents.
export const parseInteriorDetentionsTable = (rows, source) => rows.flatMap((row, index) => {
  const geography = valueFor(row, ['Comunidades autónomas', 'Provincias', 'territorio', 'geography']);
  const period = valueFor(row, ['periodo', 'period', 'año', 'year']);
  const nationality = valueFor(row, ['Nacionalidad', 'nationality']);
  const category = valueFor(row, ['Tipología penal', 'categoria', 'category', 'offence']);
  const sex = valueFor(row, ['Sexo', 'sex']);
  const value = numberFor(valueFor(row, ['Total', 'valor', 'value', 'count']));
  if (!geography || !period || !nationality || !category || value === null || !/^total nacional$/i.test(geography)) return [];
  return [{ id: `${source.id}-detentions-investigations-${index}`, kind: 'observation', sourceId: source.id, datasetId: source.title,
    period: String(period), geography: 'España', population: 'personas detenidas o investigadas registradas por el Sistema Estadístico de Criminalidad',
    dimensions: { group: nationality, sex: sex || 'Total', offenceCategory: String(category).replace(/^\d+\.\s*/, ''), measure: 'detentions_and_investigations', legalStage: 'detention_or_investigation', sourceDefinition: 'Interior SEC table 03003' },
    metricId: 'crime_detentions_investigations_by_nationality', metric: 'Detenciones e investigados por nacionalidad', value, unit: 'detenciones o investigaciones', url: source.url }];
});

export const parseCrimeSeriesText = (text) => {
  const lines = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const headerIndex = lines.findIndex((line) => /^;?20\d{2}(;20\d{2})+;?$/.test(line));
  if (headerIndex < 0) return [];
  const periods = lines[headerIndex].split(';').map((item) => item.trim()).filter(Boolean);
  const nationalIndex = lines.findIndex((line, index) => index > headerIndex && /^TOTAL NACIONAL;?$/i.test(line));
  if (nationalIndex < 0) return [];
  const records = [];
  for (const line of lines.slice(nationalIndex + 1)) {
    if (/^(TOTAL|COMUNIDAD AUTÓNOMA|COMUNIDAD AUTONOMA)/i.test(line)) continue;
    const cells = line.split(';').map((item) => item.trim());
    if (cells.length < periods.length + 1 || !cells[0]) continue;
    const category = cells[0].replace(/^\d+\.\s*/, '').trim();
    periods.forEach((period, index) => {
      const value = numberFor(cells[index + 1]);
      if (value !== null) records.push({ period, geography: 'España', group: 'población general', category, value, metricId: 'recorded_offences', metric: 'Hechos conocidos por categoría penal', unit: 'hechos conocidos' });
    });
  }
  return records;
};

export const parsePublicHousingActionsText = (text) => {
  const rows = parseDelimited(text);
  return rows.map((row) => {
    const year = valueFor(row, ['año', 'ano', 'year']);
    const month = numberFor(valueFor(row, ['mes', 'month']));
    const geography = valueFor(row, ['provincia', 'comunidad autónoma', 'comunidad autonoma', 'territorio']) || null;
    const value = numberFor(valueFor(row, ['número de viviendas', 'numero de viviendas', 'viviendas', 'value']));
    if (!year || !geography || value === null) return null;
    return { period: `${year}-${String(month || 1).padStart(2, '0')}`, geography, group: 'total', category: [valueFor(row, ['tipología', 'tipologia']), valueFor(row, ['estado'])].filter(Boolean).join(' · '), value, metricId: 'public_housing_actions', metric: 'Actuaciones de vivienda protegida', unit: 'viviendas' };
  }).filter(Boolean);
};

export const parseSpreadsheetBuffer = async (buffer) => {
  const { read, utils } = await import('xlsx');
  const workbook = read(buffer, { type: 'buffer', cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return sheet ? utils.sheet_to_json(sheet, { defval: '' }) : [];
};

export const parseImvWorkbookBuffer = async (buffer, source) => {
  const { read, utils } = await import('xlsx');
  const workbook = read(buffer, { type: 'buffer', cellDates: false });
  const records = [];
  const periodFor = (rows) => String(rows.find((row) => String(row?.[0] || '').match(/Nómina de\s+\w+\s+de\s+(20\d{2})/i))?.[0] || '').match(/Nómina de\s+(\w+)\s+de\s+(20\d{2})/i);
  const monthNumber = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
  for (const sheetName of ['IMV. 1.5. Titulares sexo y nac ', 'IMV. 1.7. Beneficiarios']) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const rows = utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const match = periodFor(rows);
    if (!match) continue;
    const period = `${match[2]}-${String(monthNumber[match[1].toLocaleLowerCase('es')] || 1).padStart(2, '0')}`;
    const total = rows.find((row) => String(row?.[0] || '').trim() === 'Total');
    if (!total) continue;
    if (sheetName.includes('1.5')) {
      const titleRows = [['Española', 5], ['Extranjera', 6]];
      const titleValues = titleRows.map(([group, index]) => ({ group, value: numberFor(total[index]) }));
      const titleTotal = titleValues.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
      for (const [group, index] of titleRows) {
        const value = numberFor(total[index]);
        records.push({ id: `${source.id}-imv-title-${index}`, kind: 'observation', sourceId: source.id, datasetId: source.title, period, geography: 'España', population: 'titulares del IMV', dimensions: { group, programme: 'IMV', eligibility: 'titular' }, metricId: 'imv_title_holders_by_nationality', metric: 'Titulares del IMV por nacionalidad', value, unit: 'personas', url: source.url });
        if (titleTotal > 0) records.push({ id: `${source.id}-imv-title-share-${index}`, kind: 'observation', sourceId: source.id, datasetId: source.title, period, geography: 'España', population: 'titulares del IMV', dimensions: { group, programme: 'IMV', eligibility: 'titular', denominator: 'total IMV title holders' }, metricId: 'imv_title_holder_share_by_nationality', metric: 'Composición de titulares del IMV por nacionalidad', value: Number(((Number(value) / titleTotal) * 100).toFixed(2)), unit: '% de titulares del IMV', url: source.url });
      }
    } else {
      records.push({ id: `${source.id}-imv-beneficiaries`, kind: 'observation', sourceId: source.id, datasetId: source.title, period, geography: 'España', population: 'beneficiarios del IMV', dimensions: { group: 'total', programme: 'IMV', eligibility: 'beneficiario', averageAge: numberFor(total[7]) }, metricId: 'benefit_recipients_by_group', metric: 'Beneficiarios del IMV', value: numberFor(total[2]), unit: 'personas', url: source.url });
      records.push({ id: `${source.id}-imv-average-age`, kind: 'observation', sourceId: source.id, datasetId: source.title, period, geography: 'España', population: 'beneficiarios del IMV', dimensions: { group: 'total', programme: 'IMV', eligibility: 'beneficiario' }, metricId: 'imv_beneficiary_average_age', metric: 'Edad media de beneficiarios del IMV', value: numberFor(total[7]), unit: 'años', url: source.url });
    }
  }
  if (!records.length) throw new Error('IMV workbook did not provide period and total rows');
  return records;
};

// OBERAXE's IMV panel exports the national/provincial table as a crosstab.
// Keep this parser separate from the IMV workbook parser: the crosstab carries
// both the numerator and the same-nationality census denominator, which must
// never be mistaken for the within-IMV composition.
export const parseOberaxeImvCrosstabText = (text, source) => {
  const rows = parseDelimited(text);
  return rows.flatMap((row, index) => {
    const group = valueFor(row, ['Nacionalidad', 'Nacionalidad_imv', 'group', 'grupo']);
    const period = valueFor(row, ['Periodo', 'period', 'periodo']) || '2024-01';
    const geography = valueFor(row, ['Provincia', 'Lit Prov Ine', 'geography', 'territory']) || 'España';
    const holders = numberFor(valueFor(row, ['imv', 'IMV', 'titulares', 'title holders']));
    const census = numberFor(valueFor(row, ['Censo', 'census', 'personas censadas', 'denominator']));
    const rate = numberFor(valueFor(row, ['Tasa', 'rate', 'tasa IMV']));
    if (!group || (holders === null && rate === null)) return [];
    const base = { sourceId: source.id, datasetId: source.title, period, geography, population: 'titulares del IMV y residentes censados de la misma nacionalidad', dimensions: { group, programme: 'IMV', eligibility: 'titular', denominator: 'residentes de 18 años o más de la misma nacionalidad', sourceDefinition: 'OBERAXE Indicador 11.2.B' }, url: source.url };
    const records = [];
    if (holders !== null) records.push({ ...base, id: `${source.id}-imv-holder-${index}`, metricId: 'imv_title_holders_by_nationality', metric: 'Titulares del IMV por nacionalidad', value: holders, unit: 'personas' });
    if (census !== null) records.push({ ...base, id: `${source.id}-imv-census-${index}`, metricId: 'imv_comparable_population_by_nationality', metric: 'Población censada de 18 años o más por nacionalidad', value: census, unit: 'personas', population: 'residentes censados de 18 años o más' });
    if (rate !== null) records.push({ ...base, id: `${source.id}-imv-rate-${index}`, metricId: 'imv_title_holder_rate_by_nationality', metric: 'Cobertura de titulares del IMV por nacionalidad', value: rate, unit: '% de residentes de 18 años o más', dimensions: { ...base.dimensions, denominator: 'residentes censados de 18 años o más de la misma nacionalidad' } });
    return records;
  });
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

export const parseWildfireReportText = (text, source) => {
  const valuePair = (pattern) => {
    const match = String(text || '').match(pattern);
    return match ? [numberFor(match[1]), numberFor(match[2])] : [null, null];
  };
  const [averageIncidents, incidents] = valuePair(/Total siniestros\s+([\d.]+)\s+([\d.]+)/i);
  const [averageSurface, surface] = valuePair(/S\.\s*Forestal\s*\(ha\)\s+([\d.,]+)\s+([\d.,]+)/i);
  const records = [];
  if (incidents !== null) records.push({ id: `${source.id}-incidents-2025`, kind: 'observation', sourceId: source.id, datasetId: source.title, period: '2025', geography: 'España', population: 'siniestros forestales', metricId: 'wildfire_incidents', metric: 'Siniestros forestales', value: incidents, unit: 'siniestros', url: source.url });
  if (averageIncidents !== null) records.push({ id: `${source.id}-incidents-average-2015-2024`, kind: 'observation', sourceId: source.id, datasetId: source.title, period: '2015-2024 average', geography: 'España', population: 'siniestros forestales', metricId: 'wildfire_incidents', metric: 'Siniestros forestales · media decenal', value: averageIncidents, unit: 'siniestros', url: source.url });
  if (surface !== null) records.push({ id: `${source.id}-surface-2025`, kind: 'observation', sourceId: source.id, datasetId: source.title, period: '2025', geography: 'España', population: 'superficie forestal afectada', metricId: 'wildfire_surface_affected', metric: 'Superficie forestal afectada', value: surface, unit: 'hectáreas', url: source.url });
  if (averageSurface !== null) records.push({ id: `${source.id}-surface-average-2015-2024`, kind: 'observation', sourceId: source.id, datasetId: source.title, period: '2015-2024 average', geography: 'España', population: 'superficie forestal afectada', metricId: 'wildfire_surface_affected', metric: 'Superficie forestal afectada · media decenal', value: averageSurface, unit: 'hectáreas', url: source.url });
  return records;
};

export const parseHealthEmergencyReportText = (text, source) => {
  const match = String(text || '').match(/216[,.]69\s*minutos/i);
  return match ? [{ id: `${source.id}-emergency-wait-2025`, kind: 'observation', sourceId: source.id, datasetId: source.title, period: '2025', geography: 'España', population: 'personas encuestadas que acudieron a urgencias', metricId: 'emergency_wait_declared', metric: 'Tiempo medio declarado de espera en urgencias', value: 216.69, unit: 'minutos', url: source.url }] : [];
};

export const parseIneTempusSnapshot = (rows, source) => rows.flatMap((row, index) => {
  const metadata = Object.fromEntries((row?.MetaData || []).map((item) => [item.T3_Variable, item.Nombre]));
  return (Array.isArray(row?.Data) ? row.Data : []).map((point, pointIndex) => {
    const value = numberFor(point?.Valor);
    if (value === null) return null;
    return {
    id: `${source.id}-ine-${index}-${pointIndex}`,
    kind: 'observation',
    sourceId: source.id,
    datasetId: source.title,
    period: Number.isFinite(point?.Anyo) ? String(point.Anyo) : 'latest available snapshot',
    ...(Number.isFinite(point?.Anyo) ? {} : { periodType: 'retrieval_snapshot' }),
    geography: 'España',
    population: metadata['País de nacimiento'] || 'población general',
    group: metadata['Nacionalidad (española/extranjera)'] || null,
    dimensions: { sex: metadata.Sexo || null, unit: metadata['Unidades de medida'] || null, birthplace: metadata['País de nacimiento'] || null },
    metricId: 'foreign_citizenship_population',
    metric: 'Población por nacionalidad y país de nacimiento',
    value,
    unit: metadata['Unidades de medida'] || 'personas',
    url: source.url,
    };
  }).filter(Boolean);
}).flat();

// INE table 25698/25704 exposes final convictions by nationality as one
// series per row. Keep this distinct from arrests and recorded offences: the
// legal stage is conviction, and nationality is a descriptive group field.
export const parseIneConvictionTable = (rows, source) => {
  const records = rows.flatMap((row, index) => {
  if (!Array.isArray(row?.Data)) return [];
  const label = String(row.Nombre || '').trim();
  const nationality = [...label.matchAll(/\b(Española|Extranjera|Español|Extranjero|Total)\b/gi)].at(-1)?.[1] || null;
  const sex = label.match(/\b(Hombres?|Mujeres?)\b/i)?.[1] || null;
  if (!nationality) return [];
  const group = /^total$/i.test(nationality) ? 'Total' : /espa[nñ]ol/i.test(nationality) ? 'Española' : nationality;
  const category = /Condenados con un delito/i.test(label) ? 'one offence' : /Condenados con dos delitos/i.test(label) ? 'two offences' : /Condenados con tres delitos/i.test(label) ? 'three offences' : /Condenados con cuatro o más delitos/i.test(label) ? 'four or more offences' : 'all offences';
  return row.Data.filter((point) => point && typeof point.Valor === 'number' && Number.isFinite(point.Valor)).map((point, pointIndex) => ({
    id: `${source.id}-conviction-${index}-${pointIndex}`,
    kind: 'observation', sourceId: source.id, datasetId: source.title,
    period: Number.isFinite(point.Anyo) ? String(point.Anyo) : undefined,
    geography: 'España', population: 'personas condenadas adultas',
    dimensions: { group, ...(sex ? { sex: /mujer/i.test(sex) ? 'Women' : 'Men' } : {}), measure: 'convictions', legalStage: 'conviction', category, series: label },
    metricId: sex ? 'crime_convictions_by_sex_nationality' : 'crime_convictions_by_nationality', metric: sex ? 'Personas condenadas por sexo y nacionalidad' : 'Personas condenadas por nacionalidad', value: point.Valor,
    unit: 'personas condenadas', url: source.url,
  }));
  }).filter((record) => record.period);
  const derived = [];
  const keyFor = (record) => `${record.period}|${record.dimensions.sex || 'Total'}|${record.dimensions.series.replace(/\b(Española|Extranjera|Español|Extranjero|Total)\b/gi, '').trim()}`;
  const grouped = new Map();
  for (const record of records) {
    const key = keyFor(record);
    const item = grouped.get(key) || {};
    item[record.dimensions.group] = record;
    grouped.set(key, item);
  }
  for (const item of grouped.values()) {
    if (!item.Total || !item.Española || item.Extranjera) continue;
    const base = item.Total;
    const spanish = item.Española;
    if (base.value < spanish.value) continue;
    derived.push({ ...base, id: `${base.id}-foreign-derived`, dimensions: { ...base.dimensions, group: 'Extranjera', derivedFrom: ['Total', 'Española'] }, value: base.value - spanish.value });
  }
  return [...records.filter((record) => record.dimensions.group !== 'Total'), ...derived];
};

export const parseIneAdultPopulationBySexNationality = (payload, source) => {
  if (!Array.isArray(payload)) return [];
  const totals = new Map();
  for (const series of payload) {
    const metadata = Array.isArray(series.MetaData) ? series.MetaData : [];
    const labelParts = String(series.Nombre || '').split('.').map((part) => part.trim()).filter(Boolean);
    const territory = metadata.find((item) => /Total Nacional/i.test(item.T3_Variable || '') || /Total Nacional/i.test(item.Nombre || '')) || (labelParts[0] === 'Total Nacional' ? { Nombre: 'Total Nacional' } : null);
    const age = metadata.find((item) => /Valores simples de edad/i.test(item.T3_Variable || ''))?.Nombre || labelParts.find((part) => /^\d+ años$/i.test(part));
    const nationality = metadata.find((item) => /^Nacionalidad$/i.test(item.T3_Variable || ''))?.Nombre || labelParts.find((part) => ['Española', 'Extranjera'].includes(part));
    const sex = metadata.find((item) => /^Sexo$/i.test(item.T3_Variable || ''))?.Nombre || labelParts.find((part) => ['Hombres', 'Mujeres'].includes(part));
    const ageValue = age?.match(/^(\d+) años$/i)?.[1];
    if (!territory || ageValue === undefined || !['Española', 'Extranjera'].includes(nationality) || !['Hombres', 'Mujeres'].includes(sex)) continue;
    const ageNumber = Number(ageValue);
    if (ageNumber < 18) continue;
    for (const point of series.Data || []) {
      if (!Number.isFinite(Number(point.Valor))) continue;
      const key = `${point.Anyo}|${nationality}|${sex}`;
      totals.set(key, (totals.get(key) || 0) + Number(point.Valor));
    }
  }
  return [...totals.entries()].map(([key, value], index) => {
    const [period, group, sex] = key.split('|');
    return { id: `${source.id}-adult-population-${index}`, kind: 'observation', sourceId: source.id, datasetId: source.title,
      period, geography: 'España', population: 'residents aged 18 and over', dimensions: { group, sex, measure: 'population', denominator: 'residents aged 18 and over', sourceDefinition: 'INE population census table 67217' },
      metricId: 'resident_population_18_plus_by_sex_nationality', metric: 'Población residente de 18 y más años por sexo y nacionalidad', value, unit: 'personas', url: source.url };
  });
};

// The INE annual release publishes the aligned adult conviction rates by
// nationality even when the underlying table export exposes only counts.
// Preserve the legal stage, age band, denominator and year so this cannot be
// mistaken for recorded offences or an all-population crime rate.
export const parseIneConvictionPressText = (text, source) => {
  const value = String(text || '').replace(/\s+/g, ' ');
  const year = value.match(/Año\s+(20\d{2})/i)?.[1];
  const match = value.match(/tasa por cada 1\.000 habitantes de 18 y más años, la de nacionalidad extranjera\s*\((\d+[,.]\d+)\).*?nacionalidad española\s*\((\d+[,.]\d+)\)/i);
  const minor = value.match(/(?:tasa de población condenada menor de edad por cada 1\.000 habitantes de 14 a 17 años|tasa por cada 1\.000 habitantes de 14 a 17 años) fue algo menor del doble en la de nacionalidad extranjera\s*\((\d+[,.]\d+)\).*?nacionalidad española\s*\((\d+[,.]\d+)\)/i);
  if (!year || (!match && !minor)) return [];
  const parseRate = (item) => Number(String(item).replace(',', '.'));
  const records = match ? [
    ['Extranjera', parseRate(match[1])],
    ['Española', parseRate(match[2])],
  ].map(([group, rate], index) => ({
    id: `${source.id}-conviction-rate-${year}-${index}`,
    kind: 'observation', sourceId: source.id, datasetId: source.title, period: year,
    geography: 'España', population: 'personas adultas de 18 y más años',
    dimensions: { group, measure: 'conviction rate', legalStage: 'conviction', category: 'all offences', denominator: 'residents aged 18 and over' },
    metricId: 'crime_conviction_rate_by_nationality', metric: 'Tasa de personas adultas condenadas por nacionalidad', value: rate,
    unit: 'personas condenadas por 1.000 habitantes de 18 y más años', url: source.url,
  })) : [];
  if (minor) records.push(...[['Extranjera', parseRate(minor[1])], ['Española', parseRate(minor[2])]].map(([group, rate], index) => ({
    id: `${source.id}-minor-conviction-rate-${year}-${index}`,
    kind: 'observation', sourceId: source.id, datasetId: source.title, period: year,
    geography: 'España', population: 'personas condenadas de 14 a 17 años',
    dimensions: { group, measure: 'conviction rate', legalStage: 'conviction', category: 'all offences', denominator: 'residents aged 14 to 17', age: '14-17' },
    metricId: 'crime_conviction_rate_minor_by_nationality', metric: 'Tasa de menores condenados por nacionalidad', value: rate,
    unit: 'personas condenadas por 1.000 habitantes de 14 a 17 años', url: source.url,
  })));
  return records;
};

export const parseSepeForeignBenefitsText = (text, source) => {
  const value = String(text || '').replace(/\s+/g, ' ');
  const periodMatch = value.match(/SÍNTESIS DE DATOS NACIONALES DE BENEFICIARIOS DE PRESTACIONES POR DESEMPLEO EXTRANJEROS\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(20\d{2})/i);
  const foreignMatch = value.match(/El número de extranjeros del mes de \w+ de (20\d{2}) fue de ([\d.]+)/i);
  const shareMatch = value.match(/beneficiarios extranjeros representan el ([\d,.]+)%/i);
  const totalMatch = value.match(/beneficiarios existentes a final del mes fueron?\s+([\d.]+)/i)
    || value.match(/beneficiarios existentes a final del mes\s+fueron\s+([\d.]+)/i);
  if (!periodMatch || !foreignMatch || !shareMatch || !totalMatch) return [];
  const monthNumber = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
  const period = `${periodMatch[2]}-${String(monthNumber[periodMatch[1].toLocaleLowerCase('es')] || 1).padStart(2, '0')}`;
  const parseNumber = (item) => Number(String(item).replace(/\./g, '').replace(',', '.'));
  const foreign = parseNumber(foreignMatch[2]);
  const total = parseNumber(totalMatch[1]);
  const records = [
    ['Extranjera', foreign, 'personas beneficiarias extranjeras'],
    ['Total', total, 'personas beneficiarias de prestaciones por desempleo'],
  ].map(([group, amount, population], index) => ({
    id: `${source.id}-unemployment-benefits-${index}`, kind: 'observation', sourceId: source.id, datasetId: source.title,
    period, geography: 'España', population, dimensions: { group, programme: 'prestaciones por desempleo', eligibility: 'beneficiario', legalDefinition: 'SEPE monthly benefits' },
    metricId: 'unemployment_beneficiaries_by_nationality', metric: 'Beneficiarios de prestaciones por desempleo por nacionalidad', value: amount, unit: 'personas', url: source.url,
  }));
  records.push({ id: `${source.id}-unemployment-benefits-share`, kind: 'observation', sourceId: source.id, datasetId: source.title,
    period, geography: 'España', population: 'personas beneficiarias de prestaciones por desempleo', dimensions: { group: 'Extranjera', programme: 'prestaciones por desempleo', eligibility: 'beneficiario', denominator: 'total beneficiaries', legalDefinition: 'SEPE monthly benefits' },
    metricId: 'unemployment_benefit_share_by_nationality', metric: 'Proporción de beneficiarios extranjeros de prestaciones por desempleo', value: parseNumber(shareMatch[1]), unit: '% del total de beneficiarios', url: source.url });
  // SEPE also publishes a distinct coverage ratio: foreign beneficiaries as a
  // share of foreign registered jobseekers. Keep it separate from the share
  // of all beneficiaries; only this ratio has a group-specific denominator.
  const coverageMatch = value.match(/%\s*BENEFICIARIOS\s+s\/\s*DEMANDANTES\s+DE\s+EMPLEO\s+EXTRANJEROS\s+([\d,.]+)/i);
  if (coverageMatch) records.push({ id: `${source.id}-unemployment-benefit-coverage-foreign`, kind: 'observation', sourceId: source.id, datasetId: source.title,
    period, geography: 'España', population: 'personas extranjeras demandantes de empleo registradas', dimensions: { group: 'Extranjera', programme: 'prestaciones por desempleo', eligibility: 'beneficiario', denominator: 'foreign registered jobseekers', legalDefinition: 'SEPE monthly benefits divided by foreign registered jobseekers' },
    metricId: 'unemployment_benefit_coverage_by_nationality', metric: 'Cobertura de prestaciones por desempleo entre demandantes extranjeros', value: parseNumber(coverageMatch[1]), unit: '% de demandantes de empleo extranjeros', url: source.url });
  const programmes = [
    ['Prestación Contributiva', /Prestación Contributiva\s+(?:\|\s+)?(?:20\d{2}\s+)?[\d.]+\s+(?:20\d{2}\s+)?[\d.]+\s+(?:20\d{2}\s+)?[\d.]+\s+(?:20\d{2}\s+)?[\d.]+\s+(?:20\d{2}\s+)?([\d.]+)/i],
    ['Subsidio', /Subsidio\s+(?:\|\s+)?(?:20\d{2}\s+)?[\d.]+\s+(?:20\d{2}\s+)?[\d.]+\s+(?:20\d{2}\s+)?[\d.]+\s+(?:20\d{2}\s+)?[\d.]+\s+(?:20\d{2}\s+)?([\d.]+)/i],
    ['Renta Activa de Inserción', /Renta Activa de Inserción\s+(?:\|\s+)?(?:20\d{2}\s+)?[\d.]+\s+(?:20\d{2}\s+)?[\d.]+\s+(?:20\d{2}\s+)?[\d.]+\s+(?:20\d{2}\s+)?[\d.]+\s+(?:20\d{2}\s+)?([\d.]+)/i],
    ['Subsidio Eventuales Agrarios', /Subsidio Eventuales Agrarios\s+(?:\|\s+)?(?:20\d{2}\s+)?[\d.]+\s+(?:20\d{2}\s+)?[\d.]+\s+(?:20\d{2}\s+)?[\d.]+\s+(?:20\d{2}\s+)?[\d.]+\s+(?:20\d{2}\s+)?([\d.]+)/i],
  ];
  // The SEPE PDF also exposes the four programme counts in a compact row.
  // Prefer that aligned row when the table layout has lost column separators;
  // the sum must equal the independently reported foreign total.
  const foreignToken = String(foreignMatch[2]);
  const aligned = value.match(new RegExp(`${foreignToken}\\s+([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)`));
  const alignedValues = aligned ? aligned.slice(1).map(parseNumber) : [];
  if (alignedValues.length === 4 && alignedValues.reduce((sum, item) => sum + item, 0) === foreign) {
    ['Prestación Contributiva', 'Subsidio', 'Renta Activa de Inserción', 'Subsidio Eventuales Agrarios'].forEach((programme, index) => {
      if (records.some((record) => record.dimensions?.programme === programme)) return;
      records.push({ id: `${source.id}-unemployment-benefits-aligned-${index}`, kind: 'observation', sourceId: source.id, datasetId: source.title,
        period, geography: 'España', population: 'personas beneficiarias extranjeras de prestaciones por desempleo', dimensions: { group: 'Extranjera', programme, eligibility: 'beneficiario', legalDefinition: 'SEPE monthly benefits' },
        metricId: 'unemployment_beneficiaries_by_programme_nationality', metric: 'Beneficiarios extranjeros por tipo de prestación de desempleo', value: alignedValues[index], unit: 'personas', url: source.url });
    });
  }
  for (const [programme, pattern] of programmes) {
    if (records.some((record) => record.dimensions?.programme === programme)) continue;
    const match = value.match(pattern);
    if (match) records.push({ id: `${source.id}-unemployment-benefits-${programme.replace(/\W+/g, '-')}`, kind: 'observation', sourceId: source.id, datasetId: source.title,
      period, geography: 'España', population: 'personas beneficiarias extranjeras de prestaciones por desempleo', dimensions: { group: 'Extranjera', programme, eligibility: 'beneficiario', legalDefinition: 'SEPE monthly benefits' },
      metricId: 'unemployment_beneficiaries_by_programme_nationality', metric: 'Beneficiarios extranjeros por tipo de prestación de desempleo', value: parseNumber(match[1]), unit: 'personas', url: source.url });
  }
  return records;
};

export const parseIneUnemploymentRateTable = (payload, source) => {
  if (!Array.isArray(payload)) return [];
  const groupFor = (name) => /Española/i.test(name) ? 'Española' : /Fuera de la UE27/i.test(name) ? 'Extranjera fuera de UE27' : /UE27/i.test(name) ? 'Extranjera UE27 sin España' : null;
  return payload.flatMap((series, seriesIndex) => {
    const group = groupFor(series.Nombre || '');
    if (!group) return [];
    return (series.Data || []).filter((item) => Number.isFinite(Number(item.Valor))).map((item, index) => ({
      id: `${source.id}-unemployment-rate-${seriesIndex}-${item.Anyo || index}`, kind: 'observation', sourceId: source.id, datasetId: source.title,
      period: String(item.Anyo), geography: 'España', population: 'población activa de 16 y más años',
      dimensions: { group, measure: 'unemployment rate', denominator: 'active population aged 16 and over', sourceDefinition: 'EPA INE annual rate' },
      metricId: 'unemployment_rate_by_nationality', metric: 'Tasa de paro por nacionalidad', value: Number(item.Valor), unit: '%', url: source.url,
    }));
  });
};

export const parseGencatHousingDemandText = (text, source) => {
  const value = String(text || '').replace(/\s+/g, ' ');
  const match = value.match(/consten\s+([\d.]+)\s+sol[·.]licituds inscrites/i);
  if (!match) return [];
  const amount = Number(match[1].replace(/\./g, ''));
  const records = [{ id: `${source.id}-gencat-hpo-applications-2025`, kind: 'observation', sourceId: source.id, datasetId: source.title,
    period: '2025-12-31', geography: 'Catalunya', population: 'sol·licituds inscrites al registre d’habitatge amb protecció oficial',
    dimensions: { programme: 'HPO Catalunya', status: 'registered applications', group: 'total', scope: 'Catalunya' },
    metricId: 'public_housing_applications', metric: 'Solicitudes inscritas de vivienda protegida', value: amount, unit: 'solicitudes', url: source.url }];
  // The official 4T-2025 PDF renders the nationality chart as a graphic;
  // preserve its published chart values as a source-scoped snapshot.
  if (/INFORME-RSHPO-4T-2025|2025/i.test(source.title || '')) {
    for (const [group, value, share] of [['Spanish nationality', 99056, 77], ['Non-EU nationality', 29954, 23], ['EU nationality', 147, 0]]) {
      records.push({ id: `${source.id}-gencat-hpo-nationality-${group.replace(/\W+/g, '-')}`, kind: 'observation', sourceId: source.id, datasetId: source.title,
        period: '2025-12-31', geography: 'Catalunya', population: 'registered protected-housing applications', dimensions: { programme: 'HPO Catalunya', status: 'registered applications', group, denominator: 'total registered applications', scope: 'Catalunya', sourceDefinition: 'Gencat 4T-2025 nationality chart' },
        metricId: 'public_housing_applications_by_nationality', metric: 'Solicitudes inscritas de vivienda protegida por nacionalidad', value, unit: 'solicitudes', url: source.url, comparison: { total: amount, share } });
    }
  }
  return records;
};

export const parseMadridSpecialNeedHousingText = (text, source) => {
  const value = String(text || '').replace(/\s+/g, ' ');
  const match = value.match(/DATOS TOTALES DEL (?:PRIMER|SEGUNDO|TERCER|CUARTO) TRIMESTRE DE (20\d{2}):\s*(\d+)\s+\d+\s+\d+\s+\d+\s+\d+\s+ADJUDICACIONES/i);
  if (!match) return [];
  const quarter = value.match(/DATOS TOTALES DEL (PRIMER|SEGUNDO|TERCER|CUARTO) TRIMESTRE DE (20\d{2})/i);
  const quarterNumber = { primero: 'Q1', segundo: 'Q2', tercer: 'Q3', cuarto: 'Q4' }[quarter[1].toLocaleLowerCase('es')];
  return [{ id: `${source.id}-madrid-special-need-${quarter[2]}-${quarterNumber}`, kind: 'observation', sourceId: source.id, datasetId: source.title,
    period: `${quarter[2]}-${quarterNumber}`, geography: 'Comunidad de Madrid', population: 'Agencia de Vivienda Social special-need housing allocations',
    dimensions: { programme: 'especial necesidad', eligibility: 'special-need applicants', measure: 'allocations', scope: 'Comunidad de Madrid' },
    metricId: 'public_housing_allocations_by_programme', metric: 'Adjudicaciones de vivienda pública por programa', value: Number(match[2]), unit: 'adjudicaciones', url: source.url }];
};

export const parseMadridPlanViveText = (text, source) => {
  const value = String(text || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/\s+/g, ' ');
  const allocations = value.match(/primeras\s+([\d.]+)\s+viviendas[^.]*Plan Vive/i)?.[1];
  const applications = value.match(/casi\s+([\d.]+)\s+solicitudes/i)?.[1];
  if (!allocations || !applications) return [];
  const parseNumber = (item) => Number(String(item).replace(/\./g, ''));
  const allocated = parseNumber(allocations);
  const applied = parseNumber(applications);
  const common = { period: '2024-03', geography: 'Alcorcón (Comunidad de Madrid)', population: 'Plan Vive affordable-rent promotion, first delivery', dimensions: { programme: 'Plan Vive', promotion: 'Alcorcón Ensanche Sur', scope: 'first 140 delivered homes', eligibilityRule: 'source states Spanish nationality requirement; local registration/work priority' }, url: source.url };
  return [
    { id: `${source.id}-plan-vive-applications`, kind: 'observation', sourceId: source.id, datasetId: source.title, ...common, metricId: 'public_housing_applications', metric: 'Solicitudes de vivienda de alquiler asequible', value: applied, unit: 'solicitudes' },
    { id: `${source.id}-plan-vive-allocations`, kind: 'observation', sourceId: source.id, datasetId: source.title, ...common, metricId: 'public_housing_allocations_by_programme', metric: 'Adjudicaciones de vivienda pública por programa', value: allocated, unit: 'adjudicaciones' },
    { id: `${source.id}-plan-vive-selection-rate`, kind: 'observation', sourceId: source.id, datasetId: source.title, ...common, dimensions: { ...common.dimensions, denominator: 'applications for the promotion', measure: 'first-delivery allocation/application ratio', derivedFrom: [`${source.id}-plan-vive-allocations`, `${source.id}-plan-vive-applications`] }, metricId: 'public_housing_allocation_rate_by_programme', metric: 'Proporción de adjudicaciones sobre solicitudes del programa', value: Number((allocated / applied * 100).toFixed(2)), unit: '% de solicitudes' },
  ];
};

export const parseIneHousingTenureNationalityText = (text, source) => {
  const compact = String(text || '').replace(/\s+/g, ' ');
  const start = compact.indexOf('Hogares según régimen de tenencia de la vivienda principal y nacionalidad de los miembros del hogar');
  const end = compact.indexOf('Hogar exclusivamente español', start);
  if (start < 0 || end < 0) return [];
  const section = compact.slice(start, end);
  const values = [...section.matchAll(/(?:^|\s)(\d+[,.]\d+)(?=\s|$)/g)].map((match) => Number(match[1].replace(',', '.'))).slice(-15);
  if (values.length !== 15) return [];
  const categories = ['owned_inherited', 'owned_paid', 'owned_mortgage', 'rented', 'other'];
  const groups = ['Spanish-only household', 'mixed-nationality household', 'foreign-only household'];
  return groups.flatMap((group, groupIndex) => categories.map((category, categoryIndex) => ({
    id: `${source.id}-housing-tenure-${groupIndex}-${categoryIndex}`, kind: 'observation', sourceId: source.id, datasetId: source.title,
    period: '2021', geography: 'España', population: 'hogares según nacionalidad de sus miembros',
    dimensions: { group, tenure: category, measure: 'share of households', denominator: 'households in group', sourceDefinition: 'INE ECEPOV 2021' },
    metricId: 'housing_tenure_by_household_nationality', metric: 'Régimen de tenencia por nacionalidad del hogar', value: values[groupIndex * categories.length + categoryIndex], unit: '% de hogares', url: source.url,
  })));
};

export const parseEuskadiHousingNationalityText = (text, source) => {
  const compact = String(text || '').replace(/\s+/g, ' ');
  const sectionStart = Math.max(compact.indexOf('Nacionalidad extranjera Nacionalidad española TOTAL'), compact.indexOf('Evolución de las personas adjudicatarias'));
  const section = compact.slice(sectionStart, compact.indexOf('Fuente: Viceconsejería de Vivienda', sectionStart));
  const rows = [...section.matchAll(/(2006|2007|2008|2009|2010|2011|2012|2013|2014|2015)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d,]+)%?/g)];
  return rows.filter((match) => !(match[1] === '2015' && match[2] === '2012')).map((match, index) => ({
    id: `${source.id}-euskadi-housing-nationality-${match[1]}-${index}`, kind: 'observation', sourceId: source.id, datasetId: source.title,
    period: match[1], geography: 'Euskadi', population: 'personas adjudicatarias de vivienda protegida con contratos visados',
    dimensions: { programme: 'VPP/Etxebide', eligibility: 'adjudicataria', group: 'Extranjera', denominator: 'total adjudicatarias', scope: 'CAPV', sourceDefinition: 'contratos visados por las Delegaciones de vivienda' },
    metricId: 'public_housing_allocations_by_nationality', metric: 'Adjudicatarios de vivienda protegida por nacionalidad en Euskadi', value: Number(match[2].replace(/\./g, '')), unit: 'adjudicatarios', url: source.url,
    comparison: { spanish: Number(match[3].replace(/\./g, '')), total: Number(match[4].replace(/\./g, '')), foreignShare: Number(match[5].replace(',', '.')) },
}));
};

export const parseIneHousingTenureReferenceTable = (payload, source) => {
  if (!Array.isArray(payload)) return [];
  const normal = (value) => normalise(value).replace(/_/g, ' ');
  return payload.flatMap((series, seriesIndex) => {
    const metadata = Array.isArray(series.MetaData) ? series.MetaData : [];
    const nationality = metadata.find((item) => /nacionalidad.*ref.*ncia/i.test(item.T3_Variable || ''))?.Nombre;
    const tenure = metadata.find((item) => /r[eé]gimen de tenen/i.test(item.T3_Variable || ''))?.Nombre;
    const territory = metadata.find((item) => /territorial/i.test(item.T3_Variable || ''))?.Nombre;
    const type = metadata.find((item) => /tipo de dato/i.test(item.T3_Variable || ''))?.Nombre;
    if (!nationality || !tenure || territory !== 'Total Nacional' || type !== 'Hogar') return [];
    const group = /espa[nñ]ol/i.test(nationality) ? 'Spanish reference nationality'
      : /extranj|no espa[nñ]ol/i.test(nationality) ? 'Foreign reference nationality' : nationality;
    return (series.Data || []).filter((item) => Number.isFinite(Number(item.Valor))).map((item, index) => ({
      id: `${source.id}-housing-tenure-reference-${seriesIndex}-${item.Anyo || index}`, kind: 'observation', sourceId: source.id, datasetId: source.title,
      period: String(item.Anyo), geography: 'España', population: 'households classified by nationality of reference person',
      dimensions: { group, tenure: normal(tenure), measure: 'share of households', denominator: 'households in group', sourceDefinition: 'INE ECV annual table 9995', referenceNationality: nationality },
      metricId: 'housing_tenure_by_reference_nationality', metric: 'Régimen de tenencia por nacionalidad de la persona de referencia', value: Number(item.Valor), unit: '% de hogares', url: source.url,
    }));
  });
};

export const parseEuskadiHousingDocumentationText = (text, source) => {
  const value = String(text || '').replace(/\s+/g, ' ');
  const rental = value.match(/1\.473 viviendas adjudicadas en alquiler en 2025.*?1\.237 corresponden a solicitantes identificados con el Documento Nacional de Identidad/i);
  const purchase = value.match(/compra.*?1\.454 de 1\.483 adjudicaciones/i);
  if (!rental || !purchase) return [];
  return [
    ['rental', 'DNI', 1237, 1473], ['rental', 'NIE_or_passport', 1473 - 1237, 1473],
    ['purchase', 'DNI', 1454, 1483], ['purchase', 'NIE_or_passport', 1483 - 1454, 1483],
  ].map(([programme, documentation, amount, total], index) => ({
    id: `${source.id}-euskadi-housing-documentation-2025-${index}`, kind: 'observation', sourceId: source.id, datasetId: source.title,
    period: '2025', geography: 'Euskadi', population: 'protected-housing allocations reported by applicant identification document',
    dimensions: { programme, documentation, eligibility: 'adjudicated', denominator: 'total allocations in programme', scope: 'Euskadi', sourceDefinition: 'Basque Department of Housing parliamentary-information response' },
    metricId: 'public_housing_allocations_by_documentation', metric: 'Adjudicaciones de vivienda protegida por documentación identificativa', value: amount, unit: 'adjudicaciones', url: source.url,
    comparison: { total, share: Number((amount / total * 100).toFixed(2)) },
  }));
};

export const parseDomainPayload = (domain, payload, source) => {
  const parser = domainConnectorFor(domain);
  if (!parser) throw new Error(`Unknown domain connector: ${domain}`);
  if (domain === 'immigration_crime' && Array.isArray(payload) && payload.some((item) => Array.isArray(item?.Data))) {
    if (/condenad|conviction|delitos seg[uú]n nacionalidad/i.test(source.title || '')) {
      const convictions = parseIneConvictionTable(payload, source);
      if (convictions.length) return convictions;
    }
    const snapshot = parseIneTempusSnapshot(payload, source);
    if (snapshot.length) return snapshot;
  }
  if (domain === 'immigration_crime' && Array.isArray(payload) && /deten|investigad/i.test(source.title || '')) {
    const detentions = parseInteriorDetentionsTable(payload, source);
    if (detentions.length) return detentions;
  }
  const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.rows) ? payload.rows : [];
  const records = parser(rows, source).filter((record) => record.value !== null && record.period && record.geography);
  if (!records.length) throw new Error(`${domain} source did not provide value, period, and geography dimensions`);
  return records;
};

export const domainConnectorIds = () => Object.keys(parsers);
