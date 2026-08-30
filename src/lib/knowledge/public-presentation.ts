const metricLabels: Record<string, string> = {
  resident_population: 'Población residente',
  foreign_born_population: 'Personas nacidas fuera de España',
  foreign_citizenship_population: 'Personas con ciudadanía extranjera',
  immigration_flows: 'Llegadas de personas a España',
  unemployment_rate: 'Tasa de desempleo',
  house_price_index: 'Precios de la vivienda',
  rental_price_index: 'Precios del alquiler',
  recorded_offences: 'Delitos registrados',
};

/** Converts resolver vocabulary into language suitable for a public answer. */
export const publicMetricLabel = (value: string): string => {
  const key = value.trim().toLowerCase();
  if (metricLabels[key]) return metricLabels[key];
  if (!/^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/.test(key)) return value;
  return key
    .split('_')
    .map((part) => part === 'eu' ? 'UE' : part)
    .join(' ')
    .replace(/^./, (letter) => letter.toUpperCase());
};

export const publicDirectionLabel = (direction: string): string => ({
  supports: 'respalda esta parte',
  qualifies: 'aporta contexto y matices',
  contradicts: 'contradice esta parte',
  neutral: 'describe esta dimensión',
}[direction] || 'aporta contexto');
