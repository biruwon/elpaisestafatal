import { buildNeutralQueries, classifyEventSources, detectCurrentEvent, eventStatusFor } from './current-events.mjs';

const failures = [];
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
const status = eventStatusFor(frame, { status: 'unconfirmed', sources: [], detail: 'No confirmation found as of retrieval.' });
if (status.propositions.some((item) => item.status !== 'unconfirmed')) failures.push('unconfirmed packet must not become a false verdict');
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('Current-event contract validation passed: neutral decomposition, source roles, deduplication and uncertainty are enforced.');
