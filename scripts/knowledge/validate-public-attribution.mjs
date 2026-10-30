import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { focusedEvidencePlan } from '../../src/lib/knowledge/focused-evidence-plan.mjs';
import { sourcesForEvidenceIds } from '../../src/lib/knowledge/evidence-source-ids.mjs';
import { localPublicCheckResponse } from '../lib/local-public-check-response.mjs';

// Bundle the real Pages mapper so this test exercises the production path as
// well as the local preview, including its TypeScript imports.
const built = await build({ entryPoints: ['functions/lib/public-check-response.ts'], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const { checkFromPlan } = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].contents).toString('base64')}`);
const source = { id: 'health-source', title: 'Health survey', publisher: 'Ministry', url: 'https://example.test/health' };
const rows = [
  { id: 'wait-days-observation', metricId: 'primary_care_wait_days', value: 10.27, unit: 'days', period: '2026-O1', geography: 'España', dimensions: { provisional: true }, source },
  { id: 'wait-rate-observation', metricId: 'primary_care_wait_over_one_day_rate', value: 71.16, unit: '%', period: '2026-O1', geography: 'España', dimensions: { provisional: true }, source },
];
const claim = 'Hay que esperar demasiado para conseguir cita con el médico de familia';
const plan = focusedEvidencePlan(claim, { observations: rows });
const published = checkFromPlan(claim, plan, 'direct');
const local = localPublicCheckResponse({ status: 'complete', requestId: 'direct', result: plan }, claim);
assert.equal(published.state, 'limited');
assert.equal(local.state, published.state, 'Local and Pages evidence labels disagree');
assert.equal(published.result.arguments[0].verdict, 'insufficient', 'Relevant data must not become proof of the entire claim');
assert.deepEqual(published.result.arguments[0].sourceIds, ['health-source']);
for (const result of [published.result, local.result]) {
  assert.ok(result.criteria.length >= 2);
  assert.ok(result.criteria.every((criterion) => criterion.sourceIds.includes('health-source')), 'Observation IDs were not mapped to their document');
  assert.ok(result.criteria.every((criterion) => criterion.sourceIds.every((id) => result.sources.some((item) => item.id === id))), 'A criterion references a missing source');
}

const povertySource = { id: 'poverty-source', title: 'Poverty survey', publisher: 'Eurostat', url: 'https://example.test/poverty' };
const poverty = [{ id: 'poverty-observation', metricId: 'in_work_poverty_full_time_rate', value: 9.5, unit: '%', period: '2025', geography: 'España', source: povertySource }];
const povertyClaim = 'A jornada completa no se llega a fin de mes';
const contextual = focusedEvidencePlan(povertyClaim, { observations: poverty });
const contextualPublic = checkFromPlan(povertyClaim, contextual, 'context');
assert.equal(contextualPublic.state, 'insufficient');
assert.equal(localPublicCheckResponse({ status: 'complete', requestId: 'context', result: contextual }, povertyClaim).state, 'insufficient');
assert.deepEqual(contextualPublic.result.arguments[0].evidenceIds, [], 'Contextual poverty data cannot prove difficulty making ends meet');
assert.deepEqual(contextualPublic.result.criteria[0].sourceIds, ['poverty-source']);
assert.match(contextualPublic.result.reply, /Como contexto/);

const explanation = focusedEvidencePlan('¿Las pensiones públicas usan reparto o cuentas individuales?', { now: Date.parse('2026-10-30') });
const explanationPublic = checkFromPlan('¿Las pensiones públicas usan reparto o cuentas individuales?', explanation, 'definition');
assert.equal(explanationPublic.state, 'limited');
assert.deepEqual(explanationPublic.result.arguments[0].sourceIds, ['social-security-pay-as-you-go']);
assert.deepEqual(sourcesForEvidenceIds({ sourceLinks: [{ id: 'known' }], evidenceSummary: { families: [] } }, ['unrelated-observation']), [], 'Unknown observations must not acquire guessed sources');
console.log('Public attribution passed: Pages and local results preserve direct evidence, source documents and contextual gaps.');
