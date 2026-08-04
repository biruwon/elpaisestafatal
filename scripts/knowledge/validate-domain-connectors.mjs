import { domainConnectorIds, parseDelimited, parseDomainPayload } from './domain-connectors.mjs';

const source = { id: 'fixture-source', title: 'Fixture source', url: 'https://official.example/data' };
const fixtures = {
  immigration_benefits: [{ periodo: '2025', territorio: 'España', grupo: 'nacionalidad extranjera', beneficiarios: '1200' }],
  immigration_crime: [{ periodo: '2025', territorio: 'España', grupo: 'nacionalidad', tasa: '42,5' }],
  public_housing_allocation: [{ periodo: '2025', municipio: 'Madrid', grupo: 'solicitantes extranjeros', adjudicaciones: '120' }],
};
for (const domain of domainConnectorIds()) {
  const records = parseDomainPayload(domain, fixtures[domain], source);
  if (records[0].value === null || !records[0].period || !records[0].geography) throw new Error(`${domain}: dimensions were not preserved`);
}
const csv = parseDelimited('period;territorio;grupo;beneficiarios\n2025;España;total;100');
if (csv.length !== 1 || csv[0].beneficiarios !== '100') throw new Error('Delimited source parsing failed');
let rejected = false;
try { parseDomainPayload('immigration_crime', [{ valor: '2' }], source); } catch { rejected = true; }
if (!rejected) throw new Error('Incomplete domain data was not rejected');
console.log('Domain connector validation passed: JSON/CSV records preserve dimensions and incomplete source rows fail closed.');
