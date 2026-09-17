import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const start = new Date(process.env.AGENDA_FROM || '2023-08-17T00:00:00Z');
const end = new Date(process.env.AGENDA_TO || new Date().toISOString());
const rawDir = 'data/raw/agenda'; await mkdir(rawDir, { recursive: true });
const dates=[]; for(let d=new Date(start); d<=end; d.setUTCDate(d.getUTCDate()+1)) dates.push(new Date(d));
const endpoint=(d)=>`https://www.congreso.es:443/es/agenda?p_p_id=agenda&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view&_agenda_mvcPath=cambiaragenda&_agenda_tipoagenda=1&_agenda_dia=${d.getUTCDate()}&_agenda_mes=${d.getUTCMonth()+1}&_agenda_anio=${d.getUTCFullYear()}`;
const strip=s=>s.replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const rows=[]; let cursor=0;
async function worker(){while(cursor<dates.length){const d=dates[cursor++], key=d.toISOString().slice(0,10);try{const r=await fetch(endpoint(d),{headers:{'user-agent':'congreso-tracker/0.1 research contact'},signal:AbortSignal.timeout(15000)});const text=await r.text();await writeFile(path.join(rawDir,key+'.html'),text);const cells=[...text.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>[...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(x=>strip(x[1]))).filter(x=>x.length);for(const cell of cells) rows.push({id:`agenda-${key}-${rows.length+1}`,date:key,kind:'scheduled_business',fields:cell,sourceUrl:endpoint(d),httpStatus:r.status});}catch(e){rows.push({id:`agenda-${key}-error`,date:key,kind:'collection_gap',sourceUrl:endpoint(d),error:String(e)});}}}
await Promise.all(Array.from({length:8},worker));
await writeFile('data/agenda.json',JSON.stringify({meta:{legislature:'XV',from:start.toISOString().slice(0,10),to:end.toISOString().slice(0,10),daysAttempted:dates.length,parserVersion:'agenda-html-v1'},items:rows},null,2));
console.log(`imported ${rows.length} agenda rows across ${dates.length} dates`);
