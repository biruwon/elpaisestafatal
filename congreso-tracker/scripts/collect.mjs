import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const base='https://www.congreso.es';
const urls={active:`${base}/webpublica/opendata/diputados/DiputadosActivos__20260917050011.json`,interventions:`${base}/es/opendata/intervenciones`,votes:`${base}/es/opendata/votaciones`};
const log=[]; await mkdir(new URL('../data/raw/', import.meta.url),{recursive:true});
for(const [name,url] of Object.entries(urls)){try{const r=await fetch(url,{headers:{'user-agent':'congreso-tracker/0.1 research contact'}});const text=await r.text();log.push({name,url,status:r.status,retrievedAt:new Date().toISOString(),bytes:text.length});if(r.ok)await writeFile(new URL(`../data/raw/${name}.${r.headers.get('content-type')?.includes('json')?'json':'html'}`,import.meta.url),text);}catch(error){log.push({name,url,error:String(error),retrievedAt:new Date().toISOString()});}}
await writeFile(new URL('../data/collection-log.json',import.meta.url),JSON.stringify({generatedAt:new Date().toISOString(),sources:log},null,2)); console.log(JSON.stringify(log,null,2));
