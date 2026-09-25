import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { answerPlanForBroadDomains, broadDomainPacketsFor } from '../src/lib/knowledge/broad-domain-snapshot.mjs';
import { broadObservationFits } from '../src/lib/knowledge/broad-observation-fit.mjs';
import { familyResearchRequests, researchFamilyGaps } from './knowledge/research-family-gaps.mjs';
import { reviewedContextualAnswer } from '../functions/lib/reviewed-contextual-answer.mjs';
const claims = JSON.parse(await readFile(new URL('./fixtures/claim-objective-cases.json', import.meta.url)));
const expected = ['broad-compound-claim', 'broad-public-administration', 'broad-demography-pension-finance', 'broad-youth-living-housing', 'broad-security', 'broad-population-replacement', 'broad-tax-burden-purchasing-power'];
const variants = [
  { id: expected[0], cases: ['¿La amnistía migratoria está saturando hospitales y disparando las ayudas sociales?', '¿La regularización extraordinaria hará colapsar la sanidad y aumentará los beneficiarios del ingreso mínimo vital?'] },
  { id: expected[1], cases: ['¿Cuántas plazas públicas pueden automatizarse y cuántos funcionarios están calentando silla?', 'El funcionariado está anquilosado: puestos innecesarios ocupados por gente con plaza fija que no trabaja.'] },
  { id: expected[2], cases: ['La pirámide poblacional envejece y las pensiones quebrarán las cuentas del Estado.', '¿Cuál es la ratio de cotizantes y pensionistas y por qué el sistema es insostenible?'] },
  { id: expected[3], cases: ['Los menores de 30 no pueden emanciparse: el alquiler se lleva todo el sueldo y necesitan dinero de sus padres.', 'Los precios de la casa y los salarios estancados dejan a la gente joven sin futuro; ¿cuántos se irían sin herencia?'] },
  { id: 'broad-immigration-security', cases: ['¿Es cierto que la inmigración ha traído más robos y agresiones a España?', 'Los extranjeros han provocado una ola de inseguridad y nadie les pone freno.'] },
  { id: expected[5], cases: ['¿Qué países de origen y motivos de llegada predominan, y hay pruebas de que los inmigrantes tengan menos IQ?', '¿Las personas inmigrantes son menos inteligentes y por eso más fáciles de manipular políticamente?'] },
  { id: expected[6], cases: ['¿Han subido los impuestos y perdido poder adquisitivo las familias por la progresividad en frío?', '¿Se puede bajar el IVA o deflactar el IRPF sin cargar el coste a generaciones jóvenes?'] },
];
const assertVisuals = (plan, label) => {
  const visuals = plan.visuals?.length ? plan.visuals : plan.visual ? [plan.visual] : [];
  assert(visuals.length, `${label} needs at least one labeled visual`);
  const sourceIds = new Set(plan.sourceLinks.map((source) => source.id));
  for (const visual of visuals) {
    assert(visual.labels?.length && visual.labels.length === visual.values.length, `${label} visual values must align with labels`);
    assert(visual.sourceId && sourceIds.has(visual.sourceId), `${label} visual must identify an available source`);
    assert(visual.evidenceIds?.includes(visual.sourceId), `${label} visual source must be included in evidence attribution`);
  }
  return visuals;
};
for (const [index, text] of claims.entries()) {
  const plan = answerPlanForBroadDomains(text);
  assert.equal(plan?.id, expected[index], `Exact claim ${index + 1} routed to the wrong topic`);
  assert(plan.shareableReply?.trim(), `Exact claim ${index + 1} needs a concise, reusable answer`);
  assert(plan.shareableReply.trim().split(/\s+/).length <= 160, `Exact claim ${index + 1} answer is too long to scan`);
  assert(plan.shareableSourceIds?.length, `Exact claim ${index + 1} needs primary sources near the answer`);
  const visuals = assertVisuals(plan, `Exact claim ${index + 1}`);
  if (index === 0) assert(visuals.length >= 3, 'Compound immigration claim should visualize services, regional waiting lists, and the IMV trend separately');
  if (index === 5) assert(visuals.length >= 5, 'Population/IQ claim should visualize population, origins, permit motives, and PISA evidence separately');
  const replies = plan.blocks.filter((block) => block.type === 'conversation_reply');
  assert.equal(replies.length, 1);
  const labels = [...new Set(plan.evidenceSummary.families.map((family) => family.familyLabel))];
  for (const label of labels) assert(new RegExp(`(?:^|\\n\\n)${label.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\.`).test(replies[0].text), `${index + 1}: missing paragraph for ${label}`);
  assert.equal(replies[0].text.split('\n\n').length, labels.length + (plan.id === 'broad-compound-claim' ? 0 : 2), plan.id === 'broad-compound-claim' ? 'One concise paragraph per family with an integrated conclusion' : 'One lead, one paragraph per family, one conclusion');
  const sourceIds = new Set(plan.sourceLinks.map((source) => source.id));
  for (const family of plan.evidenceSummary.families) {
    for (const id of family.sourceIds || []) assert(sourceIds.has(id), `Missing source ${id}`);
    for (const criterion of family.criteria || [family]) if (criterion.data?.length) {
      assert(criterion.sourceIds?.length, `${criterion.label}: unattributed data`);
      assert(criterion.dimensions?.period || /\b(?:19|20|21)\d{2}/.test(criterion.data.join(' ')), `${criterion.label}: undated data`);
    }
  }
}
for (const [index, item] of variants.entries()) {
  for (const [variantIndex, text] of item.cases.entries()) {
    const route = broadDomainPacketsFor(text).map((packet) => packet.id);
    const expectedRoute = index === 0 ? ['broad-immigration-regularization', 'broad-public-services', 'broad-benefits-recipients'] : [item.id];
    assert.deepEqual(route, expectedRoute, `Claim ${index + 1}, paraphrase ${variantIndex + 1} routed to ${route.join(', ') || 'no packet'}`);
    const plan = answerPlanForBroadDomains(text);
    assert.equal(plan?.id, item.id, `Claim ${index + 1}, paraphrase ${variantIndex + 1} composed into the wrong result`);
    assert(plan?.shareableReply?.trim(), `Claim ${index + 1}, paraphrase ${variantIndex + 1} needs a concise answer`);
    assert(plan.shareableReply.trim().split(/\s+/).length <= 160, `Claim ${index + 1}, paraphrase ${variantIndex + 1} answer is too long`);
    assert(plan.shareableSourceIds?.length, `Claim ${index + 1}, paraphrase ${variantIndex + 1} needs cited sources`);
    assertVisuals(plan, `Claim ${index + 1}, paraphrase ${variantIndex + 1}`);
  }
}
const reviewedPreview = { state: 'limited', result: { id: 'broad-compound-claim', reply: 'reviewed answer' } };
assert.equal(reviewedContextualAnswer({ state: 'supported', result: { id: 'model-answer' } }, reviewedPreview), reviewedPreview, 'A late model answer replaced a reviewed broad-domain answer');
assert.equal(reviewedContextualAnswer({ state: 'clarification' }, reviewedPreview), undefined, 'An explicit clarification was swallowed by the reviewed fallback');
const endpoint = await readFile(new URL('../functions/api/check.ts', import.meta.url), 'utf8');
const browserClient = await readFile(new URL('../src/scripts/claim-checker.ts', import.meta.url), 'utf8');
assert.match(endpoint, /reviewedContextualAnswer\(model, contextual\)/, 'POST response selection must preserve the reviewed answer');
assert.match(endpoint, /chooseResponse\(claim, modelResponse, contextual\)/, 'Final poll must use the same response selection as POST');
assert.match(browserClient, /'x-claim-text': original/, 'The final poll must retain the submitted claim to rebuild the same contextual response');
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
assert(plan.shareableReply.includes('1.467.252 personas (2023) → 1.957.700 (2024) → 2.335.553 (2025) → 2.725.899 (2026; +16,7 % interanual)'), 'Shareable reply omitted the reviewed IMV trend');
const dynamicallyEnrichedPlan = answerPlanForBroadDomains(claims[0], { observations: [
  { id: 'older-imv-point', metricId: 'benefit_recipients_by_group', value: 2_682_646, unit: 'Person', period: '2026-07', geography: 'Spain' },
] });
assert(dynamicallyEnrichedPlan.shareableReply.includes('1.467.252 personas (2023) → 1.957.700 (2024) → 2.335.553 (2025) → 2.725.899 (2026; +16,7 % interanual)'), 'Live enrichment changed the reviewed baseline or mismatched the IMV growth rate');
assert(!dynamicallyEnrichedPlan.shareableReply.includes('julio de 2026'), 'A single-month live point replaced the reviewed IMV comparison');
const dynamicallyEnrichedBenefits = dynamicallyEnrichedPlan.evidenceSummary.families.find((family) => family.familyId === 'broad-benefits-recipients');
const reviewedTrend = dynamicallyEnrichedBenefits.criteria.find((criterion) => criterion.id === 'benefit-trend-causality');
assert.equal(reviewedTrend.data[0], 'Serie localizada: beneficiarios del IMV en agosto: 1.467.252 personas (2023) → 1.957.700 (2024) → 2.335.553 (2025) → 2.725.899 (2026; +16,7 % interanual)');
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
console.log('Seven exact claims and fourteen paraphrases, citations, multiple visuals, IMV labels, and stable final responses validated.');

assert(!broadObservationFits({ metricId: 'cpi_index', value: 3, period: '2025', unit: '%' }, { metricIds: ['cpi_index'] }));
assert(!broadObservationFits({ metricId: 'cpi_index', value: 120, period: '2025', unit: 'index', dimensions: { geo: 'FR' } }, { metricIds: ['cpi_index'] }));
assert(!broadObservationFits({ metricId: 'hospital_beds_per_100k', value: 138368, period: '2025', unit: 'number' }, { metricIds: ['hospital_beds_per_100k'] }));
