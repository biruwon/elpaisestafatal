import { compareGroupObservations } from './domain-verification.mjs';

const result = compareGroupObservations([
  { metricId: 'crime_rate_by_group', value: 42, period: '2025', geography: 'Spain', dimensions: { group: 'foreign nationals' } },
  { metricId: 'crime_rate_by_group', value: 31, period: '2025', geography: 'Spain', dimensions: { group: 'Spanish nationals' } },
]);
if (!result.comparable || result.difference !== 11 || result.ratio !== 42 / 31) throw new Error('Comparable group rates were not calculated');
if (compareGroupObservations([{ metricId: 'crime_rate_by_group', value: 42, period: '2025', geography: 'Spain', dimensions: { group: 'foreign nationals' } }]).comparable) throw new Error('Single-group evidence was treated as a comparison');
console.log('Domain verification validation passed: group comparisons require aligned period, geography, metric, and two groups.');
