import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
const current = JSON.parse(await readFile('data/current.json', 'utf8'));
const daily = JSON.parse(gunzipSync(await readFile('data/daily-presence-summaries.json.gz'), 'utf8')).summaries || [];
const errors = [];
const unique = (name, rows, key) => { const keys = rows.map(key); if (new Set(keys).size !== keys.length) errors.push(`${name} contains duplicate keys`); };
unique('deputies', current.deputies, x => x.id);
unique('interventions', current.interventions, x => x.id);
unique('daily summaries', daily, x => `${x.deputyId}|${x.date}`);
if (current.deputies.some(x => !x.officialId)) errors.push('a deputy is missing officialId');
if (current.presenceObservations.some(x => x.kind === 'remote_participation' && x.value === 'in_person')) errors.push('remote evidence marked as physical');
if (daily.some(x => x.status === 'unknown' && [x.interventionTurns, x.interventionSeconds, x.nominalVoteEvents, x.remoteVoteEvents].some(v => v !== null))) errors.push('unknown daily evidence has numeric measures');
if (current.formalBodyMemberships.some(x => x.validationStatus === 'official_response' && !x.sourceUrl)) errors.push('official committee row missing source URL');
if (current.interventions.filter(x => x.textUrl).length === 0) errors.push('no transcript links imported');
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`acceptance passed: ${current.deputies.length} deputies, ${current.interventions.length} interventions, ${current.formalBodyMemberships.length} body rows, ${daily.length} daily rows`);
