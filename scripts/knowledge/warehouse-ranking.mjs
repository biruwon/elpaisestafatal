const normalise = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n');
const formatNumber = (value) => Number(value).toLocaleString('es-ES', { maximumFractionDigits: 2 });
const comparableDimensions = (item) => Object.entries(item.dimensions || {})
  .filter(([key]) => !['geo', 'time', 'period', 'year', 'anyo', 'fecha'].includes(normalise(key)))
  .sort(([left], [right]) => left.localeCompare(right));
const baseKey = (item) => JSON.stringify({ source: item.source?.id || item.sourceId || '', metric: item.metric || item.datasetId || '', unit: item.unit || '', dimensions: comparableDimensions(item) });
const countryName = (item) => String(item.dimensionLabels?.geo || item.dimensions?.geo || item.geo || 'Territorio');

export const summarizeWarehouseRanking = (text, observations) => {
  const numeric = observations.filter((item) => typeof item.value === 'number' && Number.isFinite(item.value) && item.period);
  if (numeric.length < 2) return null;
  const groups = new Map();
  for (const item of numeric) {
    const key = baseKey(item);
    const group = groups.get(key) || [];
    group.push(item);
    groups.set(key, group);
  }
  const group = [...groups.values()].sort((left, right) => {
    const leftScore = left.reduce((sum, item) => sum + (typeof item.score === 'number' ? item.score : 0), 0) / left.length;
    const rightScore = right.reduce((sum, item) => sum + (typeof item.score === 'number' ? item.score : 0), 0) / right.length;
    return rightScore - leftScore || right.length - left.length;
  })[0] || [];
  const periodCounts = new Map();
  for (const item of group) periodCounts.set(item.period, (periodCounts.get(item.period) || 0) + 1);
  const period = [...periodCounts.entries()].sort(([leftPeriod, leftCount], [rightPeriod, rightCount]) => rightCount - leftCount || String(rightPeriod).localeCompare(String(leftPeriod)))[0]?.[0];
  const rows = group.filter((item) => item.period === period).sort((left, right) => right.value - left.value);
  if (rows.length < 2) return null;
  const spainIndex = rows.findIndex((item) => normalise(countryName(item)) === 'es' || normalise(countryName(item)).includes('espana') || item.dimensions?.geo === 'ES');
  const spain = spainIndex >= 0 ? rows[spainIndex] : null;
  const metric = String(spain?.metric || spain?.datasetId || rows[0].source?.title || 'Indicador comparado');
  const rawUnit = String(spain?.unit || rows[0].unit || '').trim();
  const unit = normalise(rawUnit) === 'percentage of population in the labour force' ? '%' : rawUnit;
  const suffix = unit ? ` ${unit}` : '';
  const highest = rows[0];
  const query = normalise(text);
  const claimsLowest = query.includes('mas baja') || query.includes('mas bajo') || query.includes('menor');
  const claimsHighest = !claimsLowest && (query.includes('mas') || query.includes('mayor') || query.includes('alta') || query.includes('alto'));
  const matchesClaim = claimsLowest ? spainIndex === rows.length - 1 : spainIndex === 0;
  const points = [
    spain ? `España registra ${formatNumber(spain.value)}${suffix} en ${period} y ocupa el puesto ${spainIndex + 1} de ${rows.length} territorios incluidos.` : `La comparación contiene ${rows.length} territorios en ${period}, pero no identifica España en el conjunto recuperado.`,
    `El valor más alto del conjunto es ${formatNumber(highest.value)}${suffix} (${countryName(highest)}).`,
  ];
  if ((claimsHighest || claimsLowest) && spain) points.push(matchesClaim ? 'España ocupa la posición que expresa la afirmación en este conjunto y periodo.' : 'España no ocupa la posición que expresa la afirmación en este conjunto y periodo.');
  return {
    observations: rows,
    headline: `${metric}: ranking comparable de ${period}`,
    summary: spain ? `España ocupa el puesto ${spainIndex + 1} de ${rows.length} territorios en la comparación disponible para ${period}.` : `Se ha localizado una comparación de ${rows.length} territorios para ${period}.`,
    points,
    reply: spain ? `En ${period}, España aparece en el puesto ${spainIndex + 1} de ${rows.length} territorios con ${formatNumber(spain.value)}${suffix}. El resultado depende de esta definición, población y conjunto de países.` : 'La comparación localizada no incluye una observación identificable de España.',
  };
};
