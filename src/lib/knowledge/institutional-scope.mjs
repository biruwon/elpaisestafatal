// Match a present-day institutional claim, not the mere presence of a loaded
// word. Historical, foreign, quoted and compound allegations need their own
// evidence and must not inherit Spain's current constitutional description.
export const spanishInstitutionalScope = (claim = '', now = new Date()) => {
  const text = String(claim).toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/[.!?]+$/, '');
  if (/\b(?:era|fue|antes|histor|franco|franquismo|siempre|nunca)\b/.test(text)) return undefined;
  const years = text.match(/\b(?:18|19|20)\d{2}\b/g) || [];
  if (years.some((year) => Number(year) !== now.getUTCFullYear())) return undefined;
  const country = /^(?:hoy\s+|actualmente\s+)?espana\s+(?:es|vive en|se ha convertido en)\s+(?:una?\s+)?(?:dictadura|estado autoritario|estado fascista)(?:\s+(?:hoy|ahora|actualmente))?$/;
  const office = /^(?:hoy\s+|actualmente\s+)?(?:pedro\s+)?sanchez\s+(?:es|actua como|gobierna como)\s+(?:una?\s+)?(?:dictador|autoritario|fascista)(?:\s+(?:hoy|ahora|actualmente))?$/;
  const government = /^(?:hoy\s+|actualmente\s+)?(?:el\s+)?(?:gobierno (?:de espana|espanol)|presidente del gobierno(?: de espana)?)\s+(?:es|actua como|gobierna como)\s+(?:una?\s+)?(?:dictadura|dictador|autoritario|fascista)(?:\s+(?:hoy|ahora|actualmente))?$/;
  return country.test(text) || office.test(text) || government.test(text) ? { geography: 'España', subject: country.test(text) ? 'el sistema institucional español' : 'el Gobierno de España' } : undefined;
};
