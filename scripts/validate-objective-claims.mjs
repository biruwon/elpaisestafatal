import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { answerPlanForBroadDomains } from '../src/lib/knowledge/broad-domain-snapshot.mjs';
import { broadObservationFits } from '../src/lib/knowledge/broad-observation-fit.mjs';
import { familyResearchRequests, researchFamilyGaps } from './knowledge/research-family-gaps.mjs';
const claims = JSON.parse(await readFile(new URL('./fixtures/claim-objective-cases.json', import.meta.url)));
const expected = ['broad-compound-claim', 'broad-public-administration', 'broad-demography-pension-finance', 'broad-youth-living-housing', 'broad-security', 'broad-population-replacement', 'broad-tax-burden-purchasing-power'];
for (const [index, text] of claims.entries()) {
  const plan = answerPlanForBroadDomains(text);
  assert.equal(plan?.id, expected[index], `Exact claim ${index + 1} routed to the wrong topic`);
  const replies = plan.blocks.filter((block) => block.type === 'conversation_reply');
  assert.equal(replies.length, 1);
  const labels = [...new Set(plan.evidenceSummary.families.map((family) => family.familyLabel))];
  for (const label of labels) assert(replies[0].text.includes(`\n\n${label}.`), `${index + 1}: missing paragraph for ${label}`);
  assert.equal(replies[0].text.split('\n\n').length, labels.length + 2, 'One lead, one paragraph per family, one conclusion');
  const sourceIds = new Set(plan.sourceLinks.map((source) => source.id));
  for (const family of plan.evidenceSummary.families) {
    for (const id of family.sourceIds || []) assert(sourceIds.has(id), `Missing source ${id}`);
    for (const criterion of family.criteria || [family]) if (criterion.data?.length) {
      assert(criterion.sourceIds?.length, `${criterion.label}: unattributed data`);
      assert(criterion.dimensions?.period || /\b(?:19|20|21)\d{2}/.test(criterion.data.join(' ')), `${criterion.label}: undated data`);
    }
  }
}
// Changing the combination must not reuse the immigration-specific answer.
const novel = answerPlanForBroadDomains('La regularización de inmigrantes aumenta el precio del alquiler');
assert(!novel.blocks.find((block) => block.type === 'conversation_reply').text.includes('tres afirmaciones'));
// Unit, country and nationality changes must not be joined as a time series.
const imv = answerPlanForBroadDomains('¿Quién recibe el ingreso mínimo vital?', { observations: [
  { id: 'foreign', metricId: 'imv_title_holders_by_nationality', value: 153529, unit: 'personas', period: '2026-07', dimensionLabels: { nationality: 'extranjera' }, dimensions: { nationality: 'foreign' } },
  { id: 'spanish', metricId: 'imv_title_holders_by_nationality', value: 725696, unit: 'personas', period: '2026-07', dimensionLabels: { nationality: 'española' }, dimensions: { nationality: 'spanish' } },
] });
const data = imv.evidenceSummary.families.find((family) => family.label === 'Composición del IMV').data;
assert(data.some((value) => value.includes('extranjera') && value.includes('153.529')));
assert(data.some((value) => value.includes('española') && value.includes('725.696')));
assert(data.every((value) => !value.includes('→')), 'Separate populations became a spurious trend');
// One family with numbers must not suppress another family's research.
const plan = answerPlanForBroadDomains(claims[0]);
const requests = familyResearchRequests(plan);
assert(requests.some((request) => request.label === 'Prestaciones'));
assert(requests.some((request) => request.label === 'Servicios públicos'));
const directory = await mkdtemp(join(tmpdir(), 'claim-family-research-'));
const calls = [];
try {
  const before = JSON.stringify(plan.evidenceSummary.families.map((family) => family.data));
  await researchFamilyGaps(plan, { cacheDirectory: directory, discover: async (query) => { calls.push(query); return [{ url: 'https://www.ine.es/example', title: 'Research candidate' }]; }, search: async () => [], enrich: async (items) => items });
  assert.equal(calls.length, requests.length);
  assert.equal(JSON.stringify(plan.evidenceSummary.families.map((family) => family.data)), before, 'Search hits were promoted to numbers');
  assert(plan.evidenceSummary.families.every((family) => family.researchNote));
  await researchFamilyGaps(plan, { cacheDirectory: directory, discover: async () => { throw new Error('Should reuse receipt'); }, search: async () => [] });
  assert.equal(calls.length, requests.length);
} finally { await rm(directory, { recursive: true, force: true }); }
console.log('Seven exact objective claims, novel composition, population labels, citations and family research validated.');

assert(!broadObservationFits({ metricId: 'cpi_index', value: 3, period: '2025', unit: '%' }, { metricIds: ['cpi_index'] }));
assert(!broadObservationFits({ metricId: 'cpi_index', value: 120, period: '2025', unit: 'index', dimensions: { geo: 'FR' } }, { metricIds: ['cpi_index'] }));
assert(!broadObservationFits({ metricId: 'hospital_beds_per_100k', value: 138368, period: '2025', unit: 'number' }, { metricIds: ['hospital_beds_per_100k'] }));
