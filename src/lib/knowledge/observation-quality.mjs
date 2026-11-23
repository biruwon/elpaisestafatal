export const observationFlags = (status) => String(status || '').toLowerCase().replace(/[\s,;]/g, '');

export const observationFlagNotes = (status) => {
  const flags = observationFlags(status);
  return [
    flags.includes('p') ? 'La fuente marca este dato como provisional.' : '',
    flags.includes('a') ? 'La fuente marca este dato como una estimación de avance.' : '',
    flags.includes('e') ? 'La fuente marca este dato como estimado.' : '',
    flags.includes('d') ? 'La fuente señala que la definición de este dato difiere; consulta sus metadatos antes de compararlo.' : '',
    flags.includes('b') ? 'La fuente señala una ruptura en la serie; los periodos pueden no ser comparables.' : '',
    flags.includes('u') ? 'La fuente advierte de baja fiabilidad para este dato.' : '',
    /[^abdepu]/.test(flags) ? 'La fuente adjunta otra marca de calidad que debe revisarse en sus metadatos.' : '',
  ].filter(Boolean);
};

// A break marks the first period after a change. It prevents a comparison
// across that point, but not a same-period comparison between territories.
export const comparisonQuality = (items, { temporal = false, firstPeriod = '' } = {}) => {
  const notes = [...new Set(items.flatMap((item) => observationFlagNotes(item.status)))];
  const breakPoint = temporal && items.find((item) => observationFlags(item.status).includes('b')
    && String(item.period || '') > String(firstPeriod));
  const uncertain = items.some((item) => /[du]|[^abdepu]/.test(observationFlags(item.status)));
  const reason = breakPoint
    ? `La fuente marca una ruptura de serie en ${breakPoint.period}; no podemos comparar los extremos sin revisar los metadatos.`
    : uncertain ? 'La fuente señala diferencias de definición o de calidad que deben revisarse antes de comparar estos datos.' : '';
  return { blocked: Boolean(reason), reason, notes };
};
