const normalise = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').trim();

const labelsFor = (item) => Object.entries({ ...(item?.dimensions || {}), ...(item?.dimensionLabels || {}) })
  .filter(([key, value]) => !/^(time|period|freq|unit|geo)$/i.test(key) && value !== null && value !== undefined)
  .map(([, value]) => normalise(value))
  .filter(Boolean);

const metricFor = (item) => normalise(item?.metricId || item?.datasetId || item?.metric);
const geographyFor = (item) => normalise(item?.geography || item?.dimensionLabels?.geo || item?.dimensions?.geo);
const unitFor = (item) => normalise(item?.unit);
const populationFor = (item) => normalise(item?.population);
const denominatorFor = (item) => normalise(item?.denominator || item?.dimensions?.denominator || item?.dimensionLabels?.denominator);
const dimensionsFor = (item) => Object.fromEntries(Object.entries({ ...(item?.dimensions || {}), ...(item?.dimensionLabels || {}) })
  .filter(([key, value]) => !/^(?:time|period|freq|year|geo|unit)$/i.test(key)
    && value !== null && value !== undefined && String(value).trim())
  .map(([key, value]) => [normalise(key), normalise(value)])
  .sort(([left], [right]) => left.localeCompare(right)));
const isSubgroupDimension = (key) => /(?:group|grupo|sex|sexo|age|edad|nationality|nacionalidad|household|hogar|beneficiar|sector|actividad)/i.test(key);
const sameMeasure = (left, right) => metricFor(left) && metricFor(left) === metricFor(right)
  && unitFor(left) === unitFor(right)
  && populationFor(left) === populationFor(right)
  && denominatorFor(left) === denominatorFor(right)
  && normalise(left?.dataKind || 'observed') === normalise(right?.dataKind || 'observed')
  && normalise(left?.periodType || 'observation') === normalise(right?.periodType || 'observation');
const isExplicitCausalStudy = (item) => item?.causalEvidence === true
  || item?.kind === 'causal_study'
  || item?.evidenceType === 'causal_study'
  || item?.finding?.type === 'causal_study';

const hasAlignedContextComparison = (observations) => {
  for (let leftIndex = 0; leftIndex < observations.length; leftIndex += 1) {
    const left = observations[leftIndex];
    for (const right of observations.slice(leftIndex + 1)) {
      const period = normalise(left.period);
      if (!period || !sameMeasure(left, right) || period !== normalise(right.period)) continue;
      const leftDimensions = dimensionsFor(left);
      const rightDimensions = dimensionsFor(right);
      const dimensionKeys = new Set([...Object.keys(leftDimensions), ...Object.keys(rightDimensions)]);
      if ([...dimensionKeys].some((key) => !(key in leftDimensions) || !(key in rightDimensions))) continue;
      const leftGeography = geographyFor(left);
      const rightGeography = geographyFor(right);
      const dimensionsMatch = [...dimensionKeys].every((key) => leftDimensions[key] === rightDimensions[key]);
      if (leftGeography && rightGeography && leftGeography !== rightGeography && dimensionsMatch) return true;
      if (leftGeography === rightGeography) {
        const changedDimensions = [...dimensionKeys].filter((key) => leftDimensions[key] !== rightDimensions[key]);
        if (changedDimensions.length === 1 && isSubgroupDimension(changedDimensions[0])) return true;
      }
    }
  }
  return false;
};

const hasAlignedTemporalSequence = (observations) => {
  for (let leftIndex = 0; leftIndex < observations.length; leftIndex += 1) {
    const left = observations[leftIndex];
    const leftPeriod = normalise(left.period);
    if (!leftPeriod) continue;
    for (const right of observations.slice(leftIndex + 1)) {
      const rightPeriod = normalise(right.period);
      if (!rightPeriod || rightPeriod === leftPeriod || !sameMeasure(left, right)
        || geographyFor(left) !== geographyFor(right)
        || JSON.stringify(dimensionsFor(left)) !== JSON.stringify(dimensionsFor(right))) continue;
      return true;
    }
  }
  return false;
};

/** Keep causal context attached to evidence that passed the shared selector. */
export const causalContextObservations = ({ observations = [], evidenceSelection } = {}) => {
  const selectedIds = new Set((evidenceSelection?.selected || []).flatMap((item) => item.evidenceIds || []).filter(Boolean));
  return observations.filter((item) => typeof item?.value === 'number' && Number.isFinite(item.value)
    && (selectedIds.has(item.id) || isExplicitCausalStudy(item)));
};

export const causalEvidenceProfile = (observations = []) => {
  const usable = observations.filter((item) => typeof item?.value === 'number' && Number.isFinite(item.value));
  const periods = new Set(usable.map((item) => normalise(item.period)).filter(Boolean));
  const geographies = new Set(usable.flatMap((item) => [item.geography, item.dimensionLabels?.geo, item.dimensions?.geo].map(normalise)).filter(Boolean));
  const groups = new Set(usable.flatMap(labelsFor));
  const metrics = new Set(usable.map(metricFor).filter(Boolean));
  const directStudyObservations = usable.filter(isExplicitCausalStudy);
  const directStudy = directStudyObservations.length > 0;
  const hasTemporalSequence = hasAlignedTemporalSequence(usable);
  const hasCrossContextComparison = hasAlignedContextComparison(usable);
  return {
    observationCount: usable.length,
    periodCount: periods.size,
    geographyCount: geographies.size,
    groupCount: groups.size,
    metricCount: metrics.size,
    hasTemporalSequence,
    hasCrossContextComparison,
    hasDirectCausalStudy: directStudy,
    supportsCausalConclusion: directStudy && (hasAlignedContextComparison(directStudyObservations) || hasAlignedTemporalSequence(directStudyObservations)),
  };
};

export const causalEvidenceSteps = (profile) => [
  { label: 'Cambio observado', status: profile.observationCount ? 'available' : 'missing' },
  { label: 'Secuencia temporal', status: profile.hasTemporalSequence ? 'available' : 'missing' },
  { label: 'Comparación de contexto', status: profile.hasCrossContextComparison ? 'available' : 'missing' },
  { label: 'Estudio o mecanismo causal', status: profile.hasDirectCausalStudy ? 'available' : 'missing' },
  { label: 'Conclusión causal', status: profile.supportsCausalConclusion ? 'qualified' : 'missing' },
];
