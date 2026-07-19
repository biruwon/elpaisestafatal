const normalise = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n');

const formatNumber = (value) => Number(value).toLocaleString('es-ES', { maximumFractionDigits: 2 });

const comparableDimensions = (item) => Object.entries(item.dimensions || {})
  .filter(([key]) => !['time', 'period', 'year', 'anyo', 'fecha'].includes(normalise(key)))
  .sort(([left], [right]) => left.localeCompare(right));

const seriesKey = (item) => JSON.stringify({
  source: item.source?.id || item.sourceId || '',
  metric: item.metric || item.datasetId || '',
  unit: item.unit || '',
  dimensions: comparableDimensions(item),
});

export const compatibleTrendSeries = (observations) => {
  const groups = new Map();
  for (const item of observations) {
    if (typeof item.value !== 'number' || !Number.isFinite(item.value) || !item.period) continue;
    const key = seriesKey(item);
    const group = groups.get(key) || [];
    group.push(item);
    groups.set(key, group);
  }
  const best = [...groups.values()].sort((left, right) => right.length - left.length)[0] || [];
  return best.slice().sort((left, right) => String(left.period).localeCompare(String(right.period)));
};

export const summarizeWarehouseTrend = (text, observations) => {
  const numeric = compatibleTrendSeries(observations);
  if (numeric.length < 2) return null;
  const first = numeric[0];
  const latest = numeric[numeric.length - 1];
  const delta = latest.value - first.value;
  const unit = String(latest.unit || first.unit || '').trim();
  const suffix = unit ? ` ${unit}` : '';
  const metric = String(latest.metric || latest.datasetId || latest.source?.title || 'La serie localizada');
  const direction = Math.abs(delta) < 0.000001 ? 'se mantuvo prácticamente estable' : delta < 0 ? 'bajó' : 'subió';
  const change = `${formatNumber(Math.abs(delta))}${suffix}`;
  const directionWords = normalise(text);
  const expectedLower = directionWords.includes('menos') || directionWords.includes('baja') || directionWords.includes('disminuye') || directionWords.includes('cae');
  const expectedHigher = directionWords.includes('mas') || directionWords.includes('sube') || directionWords.includes('aumenta') || directionWords.includes('crece');
  const points = [
    `${metric} ${direction}, de ${formatNumber(first.value)}${suffix} (${first.period}) a ${formatNumber(latest.value)}${suffix} (${latest.period}).`,
    `El cambio entre esos dos puntos es de ${change}${delta < 0 ? ' menos' : delta > 0 ? ' más' : ''}.`,
  ];
  if ((expectedLower || expectedHigher) && Math.abs(delta) >= 0.000001) {
    const agrees = (expectedLower && delta < 0) || (expectedHigher && delta > 0);
    points.push(agrees ? 'La dirección de la serie coincide con la comparación expresada en la afirmación.' : 'La dirección de la serie no coincide con la comparación expresada en la afirmación.');
  }
  return {
    observations: numeric,
    headline: `${metric}: comparación entre ${first.period} y ${latest.period}`,
    summary: `${metric} ${direction} entre el primer y el último periodo localizado (${first.period}–${latest.period}).`,
    points,
    reply: `${metric} ${direction}: pasó de ${formatNumber(first.value)}${suffix} a ${formatNumber(latest.value)}${suffix}. Es una comparación descriptiva de la serie; por sí sola no demuestra la causa del cambio.`,
    replyEvidenceIds: numeric.map((item) => item.id),
  };
};
