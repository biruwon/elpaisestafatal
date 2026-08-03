import { readFile } from 'node:fs/promises';
import { warehouseRetrievalBenchmarkCases } from './warehouse-retrieval-benchmark-cases.mjs';

if (warehouseRetrievalBenchmarkCases.length < 300) throw new Error('PostgreSQL benchmark must cover the complete Spanish retrieval corpus');
const reportPath = new URL('../../.local/postgres-warehouse-benchmark.json', import.meta.url);
try {
  const report = JSON.parse(await readFile(reportPath, 'utf8'));
  for (const field of ['cases', 'positiveCases', 'negativeCases', 'top1', 'recallAt3', 'negativeRejections', 'errors', 'unsafeTopMatches', 'outcomes']) {
    if (!(field in report)) throw new Error(`PostgreSQL benchmark report is missing ${field}`);
  }
  if (report.cases !== warehouseRetrievalBenchmarkCases.length) throw new Error('PostgreSQL benchmark report does not cover the current corpus');
  if (report.errors !== 0 || report.negativeRejections !== report.negativeCases || report.unsafeTopMatches !== 0) throw new Error('PostgreSQL benchmark report contains errors, false positives, or unsafe matches');
  console.log(`PostgreSQL benchmark report valid: ${report.cases} cases, recall@3 ${report.recallAt3}/${report.positiveCases}.`);
} catch (error) {
  if (error?.code === 'ENOENT') {
    console.log('PostgreSQL benchmark report validation skipped: no live benchmark report is present.');
    process.exit(0);
  }
  throw error;
}
