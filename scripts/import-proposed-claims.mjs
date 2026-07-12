import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const source = await readFile(join(root, 'docs/new_topics_and_claims.md'), 'utf8');
const topicSlugs = {
  'Educación':'educacion', 'Igualdad, feminismo, sexo y familia':'igualdad-feminismo-sexo-familia', 'Modelo territorial, separatismo e identidad nacional':'modelo-territorial',
  'Clima, energía, agua y mundo rural':'clima-energia-agua-rural', 'Justicia, leyes y sistema penal':'justicia-leyes-sistema-penal', 'Medios, redes, censura y desinformación':'medios-redes-desinformacion',
  'Unión Europea, soberanía y política exterior':'union-europea-politica-exterior', 'Demografía, natalidad y envejecimiento':'demografia-natalidad-envejecimiento',
  'Defensa, fronteras estratégicas y seguridad nacional':'defensa-seguridad-nacional', 'Religión, laicidad y libertad de conciencia':'religion-laicidad-libertad-conciencia',
};
const slugify = (value) => value.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const lines=source.split('\n'); const records=[]; let topic=''; let inClaims=false;
for(const line of lines){
  const heading=line.match(/^# \d+\. (.+)$/); if(heading){topic=heading[1];inClaims=false;continue;}
  if(/^## Claims iniciales:/.test(line)){inClaims=true;continue;}
  if(/^## /.test(line)){inClaims=false;continue;}
  const claim=line.match(/^\d+\. (.+)$/); if(inClaims&&claim&&topicSlugs[topic])records.push({claim:claim[1],topicSlug:topicSlugs[topic]});
}
if(records.length!==182)throw new Error(`Expected 182 proposed claims, found ${records.length}`);
const target=join(root,'content/claims'); await mkdir(target,{recursive:true}); const seen=new Set();
for(const record of records){let slug=slugify(record.claim); if(seen.has(slug))slug=`${slug}-${record.topicSlug}`; seen.add(slug);
  const body=['## Estado editorial','','Claim propuesto en el catálogo. No se publica hasta completar fuentes primarias, evaluación, límites y revisión editorial.',''].join('\n');
  const front=['---',`slug: ${slug}`,`claim: ${JSON.stringify(record.claim)}`,'assessment: uncertain',`topicSlugs: ${JSON.stringify([record.topicSlug])}`,`aliases: ${JSON.stringify([record.claim])}`,'claimType: mixed','evidenceStrength: insufficient','geography: España','period: pending','reviewed: pending','status: planned','sourceRefs: []','evidenceIds: []','---','',body].join('\n');
  await writeFile(join(target,`${slug}.md`),front);
}
console.log(`Imported ${records.length} planned claims.`);
