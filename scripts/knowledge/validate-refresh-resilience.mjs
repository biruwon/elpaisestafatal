import { boeSummaryCandidates, isBoeLegalDiscoveryUrl, isBoeSummaryUrl } from './refresh-utils.mjs';
import { readFile } from 'node:fs/promises';

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const source = 'https://www.boe.es/datosabiertos/api/boe/sumario/20260802';
const candidates = boeSummaryCandidates(source, { maxDays: 3 });
assert(isBoeSummaryUrl(source), 'BOE summary URL was not recognized');
assert(candidates.length === 4, 'BOE fallback did not include the requested date plus bounded previous days');
assert(candidates[0].endsWith('/sumario/20260802'), 'BOE fallback changed the requested date');
assert(candidates[1].endsWith('/sumario/20260801') && candidates[3].endsWith('/sumario/20260730'), 'BOE fallback dates were not descending by UTC day');
assert(boeSummaryCandidates('https://ec.europa.eu/eurostat/api/data').length === 1, 'Non-BOE URL unexpectedly received publication-day fallback');
assert(isBoeLegalDiscoveryUrl('https://www.boe.es/datosabiertos/api/legislacion-consolidada/id/BOE-A-2007-19814/metadatos'), 'BOE legal discovery URL was not recognized');
assert(!isBoeLegalDiscoveryUrl(source), 'BOE daily summary was misclassified as legal discovery');
const workflow = await readFile(new URL('../../.github/workflows/knowledge-refresh.yml', import.meta.url), 'utf8');
const domainRefresh = await readFile(new URL('./refresh-domain-sources.mjs', import.meta.url), 'utf8');
assert(workflow.includes('--config config/source-refresh.json'), 'production refresh must use the canonical source configuration');
assert(workflow.includes('knowledge:domain-refresh'), 'production refresh must include active domain source packs');
assert(!workflow.includes('--config config/source-refresh.example.json'), 'production refresh must not use the example configuration');
assert(domainRefresh.includes('failures.push') && domainRefresh.includes('continuing with remaining feeds') && domainRefresh.includes('domain-refresh-report.json'), 'domain refresh must separate one-feed failures and persist a batch report');
assert(workflow.includes('Validate domain refresh report') && workflow.includes('path: .local/domain-refresh-report.json'), 'refresh workflow must validate and upload the operational report');
assert(/id:\s*coverage\s*\n\s*continue-on-error:\s*true/.test(workflow), 'missing coverage must be reported without blocking validated sources from syncing');
assert(workflow.includes("steps.coverage.outcome == 'failure'") && workflow.includes("steps.d1.outputs.configured != 'true'"), 'incomplete coverage and skipped production sync must fail the scheduled job visibly');
const refreshConfig = JSON.parse(await readFile(new URL('../../config/source-refresh.json', import.meta.url), 'utf8'));
const priceFeeds = Object.values(refreshConfig).flat().filter((item) => ['inflation_rate', 'inflation_rate_europe', 'rental_price_index', 'harmonised_price_index'].includes(item.metricId));
assert(priceFeeds.length === 4 && priceFeeds.every((item) => new URL(item.url).pathname.endsWith('/prc_hicp_minr')), 'Current HICP feeds must use the active ECOICOP v2 dataset, not the frozen 1996–2025 tables');
for (const item of priceFeeds) {
  const url = new URL(item.url);
  assert(url.searchParams.get('coicop18') === (item.metricId === 'rental_price_index' ? 'CP041' : 'TOTAL'), `Wrong HICP consumption group for ${item.metricId}`);
  const units = url.searchParams.getAll('unit');
  assert(units.includes(item.metricId.startsWith('inflation_rate') ? 'RCH_A' : 'I15'), `Missing the required HICP measurement for ${item.metricId}`);
}
const annualHicpFeeds = Object.values(refreshConfig).flat().filter((item) => ['annual_hicp_index', 'annual_hicp_food_index', 'annual_hicp_actual_rent_index'].includes(item.metricId));
const annualHicpGroups = { annual_hicp_index: 'TOTAL', annual_hicp_food_index: 'CP01', annual_hicp_actual_rent_index: 'CP041' };
assert(annualHicpFeeds.length === 3 && annualHicpFeeds.every((item) => new URL(item.url).pathname.endsWith('/prc_hicp_ainr')), 'Annual HICP comparison must use the active annual dataset for the overall basket, food, and actual rents');
for (const item of annualHicpFeeds) {
  const url = new URL(item.url);
  assert(url.searchParams.get('geo') === 'ES' && url.searchParams.get('coicop18') === annualHicpGroups[item.metricId], `Wrong annual HICP geography or group for ${item.metricId}`);
  assert(url.searchParams.get('unit') === 'INX_A_AVG' && (!url.searchParams.has('freq') || url.searchParams.get('freq') === 'A'), `Wrong annual HICP measurement for ${item.metricId}`);
}
assert(Object.values(refreshConfig).flat().some((item) => item.metricId === 'cpi_index' && item.url.includes('/DATOS_SERIE/IPC290751')), 'The national CPI index must use the current single INE index series');
console.log('Refresh resilience validation passed: BOE publication gaps are bounded and ad-hoc legal sources have their own cadence.');
