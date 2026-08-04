const normalise = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').trim();

const labelsFor = (item) => Object.entries({ ...(item?.dimensions || {}), ...(item?.dimensionLabels || {}) })
  .filter(([key, value]) => !/^(time|period|freq|unit|geo)$/i.test(key) && value !== null && value !== undefined)
  .map(([, value]) => normalise(value))
  .filter(Boolean);

export const causalEvidenceProfile = (observations = []) => {
  const usable = observations.filter((item) => typeof item?.value === 'number' && Number.isFinite(item.value));
  const periods = new Set(usable.map((item) => normalise(item.period)).filter(Boolean));
  const geographies = new Set(usable.flatMap((item) => [item.geography, item.dimensionLabels?.geo, item.dimensions?.geo].map(normalise)).filter(Boolean));
  const groups = new Set(usable.flatMap(labelsFor));
  const metrics = new Set(usable.map((item) => normalise(item.metric || item.datasetId)).filter(Boolean));
  const directStudy = usable.some((item) => /causal|impact|effect|experiment|research|study|estudio|efecto|impacto/i.test(`${item.kind || ''} ${item.metric || ''} ${item.excerpt || ''}`));
  return {
    observationCount: usable.length,
    periodCount: periods.size,
    geographyCount: geographies.size,
    groupCount: groups.size,
    metricCount: metrics.size,
    hasTemporalSequence: periods.size >= 2,
    hasCrossContextComparison: geographies.size >= 2 || groups.size >= 2 || metrics.size >= 2,
    hasDirectCausalStudy: directStudy,
    supportsCausalConclusion: directStudy && (geographies.size >= 2 || groups.size >= 2 || periods.size >= 2),
  };
};

export const causalEvidenceSteps = (profile) => [
  { label: 'Cambio observado', status: profile.observationCount ? 'available' : 'missing' },
  { label: 'Secuencia temporal', status: profile.hasTemporalSequence ? 'available' : 'missing' },
  { label: 'Comparación de contexto', status: profile.hasCrossContextComparison ? 'available' : 'missing' },
  { label: 'Estudio o mecanismo causal', status: profile.hasDirectCausalStudy ? 'available' : 'missing' },
  { label: 'Conclusión causal', status: profile.supportsCausalConclusion ? 'qualified' : 'missing' },
];
