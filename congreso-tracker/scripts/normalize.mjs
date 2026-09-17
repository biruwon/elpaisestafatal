import { readFile, mkdir, writeFile } from 'node:fs/promises';
const input=process.argv[2]; const out=process.argv[3]||'data/normalized/deputies.json';
if(!input) throw new Error('Usage: npm run normalize -- data/raw/file.json [output]');
const raw=JSON.parse(await readFile(input,'utf8')); const list=Array.isArray(raw)?raw:(raw.diputados||raw.deputies||raw.data||[]);
const deputies=list.map(x=>({id:String(x.codParlamentario||x.id||x.codigo||x.code||''),name:x.nombre||x.name||[x.apellidos,x.nombre].filter(Boolean).join(', '),group:x.grupoParlamentario||x.group||null,constituency:x.circunscripcion||x.provincia||null,service:{from:x.fechaAlta||x.service_from||null,to:x.fechaBaja||x.service_to||null},source:{raw:x}})).filter(x=>x.id&&x.name);
await mkdir('data/normalized',{recursive:true}); await writeFile(out,JSON.stringify({meta:{legislature:'XV',status:'normalized',generatedAt:new Date().toISOString(),source:input,parserVersion:'deputies-normalizer-v1'},deputies},null,2)); console.log(`normalized ${deputies.length} deputies`);
