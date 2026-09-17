import { readFile, writeFile } from 'node:fs/promises';
import { gunzipSync, gzipSync } from 'node:zlib';

const current = JSON.parse(await readFile('data/current.json', 'utf8'));
const file = 'data/daily-presence-summaries.json.gz';
const payload = JSON.parse(gunzipSync(await readFile(file), 'utf8'));
const rows = new Map((payload.summaries || []).map(row => [`${row.deputyId}|${row.date}`, row]));
const parse = value => { const t = Date.parse(value || ''); return Number.isFinite(t) ? t : null; };
for (const deputy of current.deputies || []) {
  const from = parse(deputy.service?.from || '2023-08-17');
  const to = parse(deputy.service?.to || '2999-12-31');
  for (const session of current.sessions || []) {
    const day = parse(session.date);
    if (!session.date || day === null || day < from || day > to) continue;
    const key = `${deputy.id}|${session.date}`;
    if (!rows.has(key)) rows.set(key, { deputyId: deputy.id, date: session.date, interventionTurns: null, interventionSeconds: null, nominalVoteEvents: null, remoteVoteEvents: null, evidenceKinds: ['unknown'], status: 'unknown' });
  }
}
payload.summaries = [...rows.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.deputyId).localeCompare(String(b.deputyId)));
payload.meta = { ...payload.meta, expandedAt: new Date().toISOString(), unknownRowsIncluded: true, denominator: 'deputy-service-period x indexed-session-date' };
await writeFile(file, gzipSync(JSON.stringify(payload)));
console.log(`expanded daily summaries to ${payload.summaries.length} rows (${payload.summaries.filter(row => row.status === 'unknown').length} unknown)`);
