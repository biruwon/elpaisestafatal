import { readFile, writeFile } from 'node:fs/promises';
const page = await (await fetch('https://www.congreso.es/es/opendata/iniciativas', { headers: { 'user-agent': 'congreso-tracker/0.1 research contact' } })).text();
const urls = [...page.matchAll(/href=["']([^"']*opendata\/iniciativas\/[^"']+\.json)["']/gi)].map(m => new URL(m[1], 'https://www.congreso.es').href);
const records = [];
for (const url of urls) { try { const response = await fetch(url, { headers: { 'user-agent': 'congreso-tracker/0.1 research contact' }, signal: AbortSignal.timeout(30000) }); if (!response.ok) continue; const values = await response.json(); for (const value of values) records.push({ ...value, sourceUrl: url }); } catch {} }
const unique = [...new Map(records.filter(x => x.NUMEXPEDIENTE || x.NUMERO_LEY).map(x => [`${x.NUMEXPEDIENTE || 'ley-' + x.NUMERO_LEY}|${x.TIPO || ''}|${x.OBJETO || x.TITULO_LEY || ''}`, x])).values()];
await writeFile('data/official-initiatives.json', JSON.stringify({ meta: { legislature: 'XV', generatedAt: new Date().toISOString(), sourceCount: urls.length, recordCount: unique.length }, records: unique }, null, 2));
console.log(`imported ${unique.length} official initiative records from ${urls.length} feeds`);
