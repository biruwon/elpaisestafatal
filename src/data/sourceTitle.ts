/**
 * Some source records were generated from chart objects and retained
 * their internal `source: { label: ... }` representation as the title. Keep
 * the source registry shape while presenting a useful label to
 * readers.
 */
export const normaliseSourceTitle = (value: string): string => {
  const raw = value.trim();
  if (!raw) return 'Fuente pública';

  const sourceLabel = raw.match(/source\s*-\s*\{?\s*label\s*-\s*['"]?(.+)$/i);
  const title = (sourceLabel?.[1] ?? raw)
    .replace(/[}'"]+$/g, '')
    .replace(/^['"]+/, '')
    .trim();

  return title || 'Fuente pública';
};

const sourceTypeLabels: Record<string, string> = {
  official: 'Fuente oficial',
  academic: 'Fuente académica',
  judicial: 'Fuente judicial',
  independent: 'Fuente independiente',
  media: 'Medio de comunicación',
  'existing-investigation-source': 'Fuente de la investigación',
};

export const sourceTypeLabel = (value: string): string => sourceTypeLabels[value] || 'Fuente pública';
