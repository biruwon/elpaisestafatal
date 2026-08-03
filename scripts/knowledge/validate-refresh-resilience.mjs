import { boeSummaryCandidates, isBoeLegalDiscoveryUrl, isBoeSummaryUrl } from './refresh-utils.mjs';

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
console.log('Refresh resilience validation passed: BOE publication gaps are bounded and ad-hoc legal sources have their own cadence.');
