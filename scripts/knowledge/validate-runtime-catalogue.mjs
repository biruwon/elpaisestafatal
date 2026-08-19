import { readFile } from 'node:fs/promises';

const path = process.env.CATALOGUE_SEED || '.local/catalogue-seed.json';
const catalogue = JSON.parse(await readFile(path, 'utf8'));
const records = Array.isArray(catalogue.records) ? catalogue.records : [];
const failures = [];
if (catalogue.canonicalEntries < 3000) failures.push(`expected at least 3000 canonical entries, found ${catalogue.canonicalEntries}`);
if (catalogue.formulations < 50000) failures.push(`expected at least 50000 formulations, found ${catalogue.formulations}`);
if (!records.length) failures.push('runtime catalogue has no records');
const seen = new Map();
for (const record of records) {
  if (!record.slug || !record.formulation || !record.fingerprint || !record.canonicalId) failures.push('record is missing routing fields');
  if (seen.has(record.fingerprint) && seen.get(record.fingerprint) !== record.canonicalId) failures.push(`formulation collision: ${record.formulation}`);
  seen.set(record.fingerprint, record.canonicalId);
  if (/https?:\/\/|www\./i.test(record.formulation)) failures.push(`URL leaked into formulation: ${record.formulation}`);
}
const normalize = (value) => value.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
for (const phrase of ['la vivienda no para de subir', 'los politicos nos roban']) {
  if (!records.some((record) => normalize(record.formulation).replace(/[¿?¡!.,]/g, '').includes(phrase))) failures.push(`missing routing fixture: ${phrase}`);
}
if (failures.length) { console.error(failures.slice(0, 30).join('\n')); process.exit(1); }
console.log(`Runtime catalogue validation passed: ${catalogue.canonicalEntries} canonical entries, ${catalogue.formulations} formulations.`);
