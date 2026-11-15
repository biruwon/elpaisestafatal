// Eurostat publishes indices and rates of change under the same price metric.
// Preserve the unit supplied by the source instead of assuming a base year.
export const priceMeasurement = (item = {}) => {
  const label = String(item.unit || item.dimensionLabels?.unit || '').trim();
  const code = String(item.dimensions?.unit || '').toUpperCase();
  const normalized = label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const rate = code === 'RCH_A' || /annual rate of change|year.on.year|interanual|same period in (?:the )?previous year/.test(normalized) ? 'interanual'
    : code === 'RCH_Q' || /quarterly rate of change|quarter.on.quarter|trimestral/.test(normalized) ? 'trimestral'
    : code === 'RCH_M' || /monthly rate of change|month.on.month|mensual/.test(normalized) ? 'mensual'
    : /rate of change|percentage change|tasa de variacion/.test(normalized) ? 'de variación'
    : '';
  if (rate) return { kind: 'rate', period: rate, unit: `% ${rate}` };
  if (/\b(?:index|indice)\b/.test(normalized) || /^I\d{2,4}$/.test(code)) {
    const base = /\b((?:19|20)\d{2})\s*=\s*100\b/.exec(label)?.[1];
    return { kind: 'index', unit: base ? `índice (${base}=100)` : 'índice' };
  }
  return { kind: 'unknown', unit: label };
};

export const priceRateRequested = (text) => /\b(?:interanual|trimestral|mensual|ritmo|tasa|variaci[oó]n (?:anual|interanual|trimestral|mensual|porcentual))\b|(?:a[nñ]o|mes|trimestre) anterior/i.test(String(text || ''));
