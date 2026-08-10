import { buildNeutralQueries, classifyEventSources, detectCurrentEvent, eventStatusFor } from './current-events.mjs';
import { readFile } from 'node:fs/promises';

const failures = [];
const resolverSource = await readFile(new URL('../local-claim-service.mjs', import.meta.url), 'utf8');
if (!resolverSource.includes('/res/v1/news/search') || !resolverSource.includes('freshness=pm')) failures.push('live current-event research must use Brave News Search with a freshness filter');
if (!resolverSource.includes('item.page_age || item.publishedAt || item.date')) failures.push('event source dates must prefer parseable publication metadata');
const frame = detectCurrentEvent('con la invasion de Ceuta están violando a las mujeres');
if (!frame || frame.geography !== 'ceuta' || frame.propositions.length !== 3 || buildNeutralQueries(frame).length !== 3) failures.push('Ceuta allegation must decompose into event, allegation and attribution propositions');
if (buildNeutralQueries(frame).some((query) => /invasion|violando|violacion/i.test(query))) failures.push('neutral queries must not contain loaded allegation wording');
const noSources = classifyEventSources([]);
if (noSources.status !== 'unconfirmed' || noSources.sources.length) failures.push('no-source event must remain unconfirmed');
const one = classifyEventSources([{ id: 'efe-1', url: 'https://efe.com/ceuta/story', publisher: 'EFE' }]);
if (one.status !== 'single_report' || one.sources.length !== 1) failures.push('one media source must remain a single report');
const syndicated = classifyEventSources([
  { id: 'efe-1', url: 'https://efe.com/ceuta/story', publisher: 'EFE' },
  { id: 'copy-1', url: 'https://rtve.es/noticias/efe-copy', publisher: 'RTVE', originPublisher: 'EFE' },
]);
if (syndicated.sources.length !== 1) failures.push('syndicated reports must deduplicate by origin publisher');
const official = classifyEventSources([{ id: 'interior-1', url: 'https://interior.gob.es/noticias/ceuta', publisher: 'Interior' }]);
if (official.status !== 'officially_reported') failures.push('official source must classify as officially reported');
const independent = classifyEventSources([
  { id: 'efe-2', url: 'https://efe.com/ceuta/story-2', publisher: 'EFE' },
  { id: 'rtve-2', url: 'https://rtve.es/noticias/ceuta/story-2', publisher: 'RTVE' },
]);
if (independent.status !== 'corroborated_report' || independent.sources.length !== 2) failures.push('two independent media sources must be corroborated');
const stale = classifyEventSources([{ id: 'efe-old', url: 'https://efe.com/ceuta/old', publisher: 'EFE', publishedAt: '2020-01-01T00:00:00Z' }], { now: Date.parse('2026-08-01T00:00:00Z') });
if (stale.status !== 'context_only') failures.push('stale reports must be context only');
const disputed = classifyEventSources([
  { id: 'efe-3', url: 'https://efe.com/ceuta/story-3', publisher: 'EFE', status: 'disputed' },
  { id: 'rtve-3', url: 'https://rtve.es/noticias/ceuta/story-3', publisher: 'RTVE' },
]);
if (disputed.status !== 'disputed') failures.push('conflicting reports must remain disputed');
const stages = classifyEventSources([{ id: 'fiscal-1', url: 'https://fiscal.es/ceuta/case', publisher: 'Fiscalía', stage: 'complaint' }]);
if (!stages.stages.includes('complaint') || stages.status !== 'officially_reported') failures.push('complaint stage must remain distinct from a conviction');
const status = eventStatusFor(frame, { status: 'unconfirmed', sources: [], detail: 'No confirmation found as of retrieval.' });
if (status.propositions.some((item) => item.status !== 'unconfirmed')) failures.push('unconfirmed packet must not become a false verdict');
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('Current-event contract validation passed: neutral decomposition, source roles, deduplication and uncertainty are enforced.');
