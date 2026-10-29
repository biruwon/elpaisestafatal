// Independent sources must not be lost because an earlier publisher is down.
// Preserve the failure in a machine-readable report and fail the run after
// attempting the remaining sources, so monitoring still sees the incident.
export const refreshBatch = async (jobs, { ingest, candidatesFor = (job) => [job.url], retryable = () => false, log = () => {} }) => {
  const report = { schemaVersion: '1', generatedAt: new Date().toISOString(), attempted: jobs.length, succeeded: 0, failed: 0, successes: [], failures: [] };
  for (const job of jobs) {
    let success = false;
    let reason = 'source_unavailable';
    for (const url of candidatesFor(job)) {
      log(`Refreshing ${job.sourceId}: ${url}`);
      try {
        await ingest(job, url);
        report.successes.push({ sourceId: job.sourceId, metricId: job.metricId, url });
        report.succeeded += 1;
        success = true;
        break;
      } catch (error) {
        reason = /Source returned (\d+)/.exec(error?.output || '')?.[0] || 'ingestion_failed';
        if (!retryable(job, url, error)) break;
      }
    }
    if (!success) {
      report.failed += 1;
      report.failures.push({ sourceId: job.sourceId, metricId: job.metricId, url: job.url, reason });
      log(`Could not refresh ${job.sourceId}; continuing with remaining feeds.`);
    }
  }
  return report;
};
