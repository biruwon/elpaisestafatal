import { readFile, writeFile } from 'node:fs/promises';
import { gunzipSync, gzipSync } from 'node:zlib';

const file = 'data/daily-presence-summaries.json.gz';
const payload = JSON.parse(gunzipSync(await readFile(file), 'utf8'));
const isoDate = value => {
  const text = String(value || '');
  const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return text;
  return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
};
for (const row of payload.summaries || []) row.date = isoDate(row.date);
payload.meta = { ...payload.meta, normalizedAt: new Date().toISOString(), dateFormat: 'ISO-8601' };
await writeFile(file, gzipSync(JSON.stringify(payload)));
console.log(`normalized ${payload.summaries?.length || 0} daily summaries`);
