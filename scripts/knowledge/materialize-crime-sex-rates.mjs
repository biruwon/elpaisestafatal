import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../../.local/source-warehouse/records/', import.meta.url).pathname;
const files = (await readdir(root)).filter((file) => file.endsWith('.json'));
const conviction = [];
const population = [];
for (const file of files) {
  const payload = JSON.parse(await readFile(join(root, file), 'utf8'));
  for (const record of payload.records || []) {
    if (record.metricId === 'crime_convictions_by_sex_nationality' && record.dimensions?.category === 'all offences') conviction.push(record);
    if (record.metricId === 'resident_population_18_plus_by_sex_nationality') population.push(record);
  }
}
const sexKey = (value) => /mujer/i.test(value || '') ? 'Women' : 'Men';
const popByKey = new Map(population.map((record) => [`${record.period}|${record.geography}|${record.dimensions.group}|${sexKey(record.dimensions.sex)}`, record]));
const records = conviction.flatMap((record) => {
  const denominator = popByKey.get(`${record.period}|${record.geography}|${record.dimensions.group}|${sexKey(record.dimensions.sex)}`);
  if (!denominator || denominator.value <= 0) return [];
  return [{
    id: `derived-crime-sex-rate-${record.id}`,
    kind: 'observation', sourceId: 'derived-ine-crime-sex-rate', datasetId: 'INE convictions and resident population aligned denominator',
    period: record.period, geography: record.geography, population: 'adults with a final conviction per residents aged 18 and over',
    dimensions: { group: record.dimensions.group, sex: record.dimensions.sex, measure: 'conviction rate', legalStage: 'conviction', category: 'all offences', denominator: 'residents aged 18 and over', derivedFrom: [record.id, denominator.id] },
    metricId: 'crime_conviction_rate_by_sex_nationality', metric: 'Tasa de personas adultas condenadas por sexo y nacionalidad', value: Number((record.value / denominator.value * 1000).toFixed(4)), unit: 'personas condenadas por 1.000 residentes de 18 y más años', url: 'https://www.ine.es/dyngs/Prensa/EPCAEPCM2025.htm',
  }];
});
await writeFile(join(root, 'derived-crime-sex-rates.json'), JSON.stringify({ source: { id: 'derived-ine-crime-sex-rate', title: 'Derived INE conviction rates by sex and nationality', publisher: 'INE', url: 'https://www.ine.es/dyngs/Prensa/EPCAEPCM2025.htm', domain: 'immigration_crime', contentType: 'application/json', retrievedAt: new Date().toISOString(), recordCount: records.length }, records }, null, 2));
console.log(`Materialized ${records.length} aligned sex/nationality conviction rates.`);
