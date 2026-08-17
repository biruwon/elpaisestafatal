const scalar = (value) => {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return '';
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (/^(?:true|false)$/i.test(trimmed)) return trimmed.toLowerCase() === 'true';
  return trimmed;
};

export const parseDelimitedRows = (text, { rowId = (index) => `row-${index + 1}`, sourceId = '', metricId, retrievedAt = '' } = {}) => {
  const sample = String(text || '').split(/\r?\n/, 1)[0] || '';
  const delimiter = [';', '\t', ','].sort((left, right) => (sample.split(right).length - 1) - (sample.split(left).length - 1))[0];
  const rows = [];
  let row = [], field = '', quoted = false;
  const value = String(text || '');
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === '"' && value[index + 1] === '"' && quoted) { field += '"'; index += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === delimiter && !quoted) { row.push(field.trim()); field = ''; continue; }
    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && value[index + 1] === '\n') index += 1;
      row.push(field.trim()); field = '';
      if (row.some((item) => item !== '')) rows.push(row);
      row = [];
      continue;
    }
    field += char;
  }
  if (field || row.length) { row.push(field.trim()); if (row.some((item) => item !== '')) rows.push(row); }
  const [header, ...data] = rows;
  if (!header?.length) return [];
  return data.slice(0, 100000).map((values, index) => ({ id: rowId(index), sourceId, metricId, dimensions: Object.fromEntries(header.map((key, column) => [key || `column_${column + 1}`, scalar(values[column] ?? '')])), retrievedAt }));
};
