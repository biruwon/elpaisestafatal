/**
 * Reproducible review helper for the government-period snapshot.
 * It deliberately does not publish values: a human must replace the reviewed
 * snapshot after checking the cited warehouse observations and methodology.
 */
import { GOVERNMENT_SCORECARD_SNAPSHOT } from '../../src/lib/knowledge/scorecard-snapshot.mjs';

const metrics = GOVERNMENT_SCORECARD_SNAPSHOT.metrics;
const periods = Object.keys(GOVERNMENT_SCORECARD_SNAPSHOT.periods);
if (!GOVERNMENT_SCORECARD_SNAPSHOT.asOf || periods.length < 2) throw new Error('Snapshot needs an asOf date and comparison periods');
if (metrics.length !== 6) throw new Error(`Expected six fixed metrics, found ${metrics.length}`);
for (const metric of metrics) {
  if (!metric.metricId || !metric.sourceIds?.length) throw new Error(`Metric ${metric.metricId || '(unknown)'} has no source references`);
  if (typeof metric.baseline?.value !== 'number' || typeof metric.comparison?.value !== 'number') throw new Error(`${metric.metricId} missing numeric baseline/comparison`);
}
const report = {
  asOf: GOVERNMENT_SCORECARD_SNAPSHOT.asOf,
  periods: GOVERNMENT_SCORECARD_SNAPSHOT.periods,
  metrics: metrics.map(({ metricId, label, unit, direction, sourceIds, baseline, comparison }) => ({ metricId, label, unit, direction, sourceIds, baseline, comparison })),
  nextStep: 'Review each cited source and update scorecard-snapshot.mjs through editorial review; this command never writes or publishes data.',
};
if (process.argv.includes('--json')) console.log(JSON.stringify(report, null, 2));
else console.log(`Government scorecard snapshot is reproducible for review (${metrics.length} metrics, as of ${report.asOf}).`);
