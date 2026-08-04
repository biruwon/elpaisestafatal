import { domainConnectorIds, parseCrimeSeriesText, parseDelimited, parseDomainPayload, parsePdfText, parsePublicHousingActionsText, parseSpreadsheetBuffer } from './domain-connectors.mjs';

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
const pdfRows = parsePdfText('Period  Territory  Group  Value\n2025  España  extranjeros  1200');
if (pdfRows.length !== 1 || pdfRows[0]?.['Group'] !== 'extranjeros') throw new Error('PDF table text parsing failed');
const imvPdfRows = parsePdfText('1.5. IMV. Sexo y nacionalidad de los titulares. Nómina de junio de 2025.\nHombres Mujeres Española Extranjera\nTotal 736.867 237.646 499.221 606.810 129.794');
if (imvPdfRows.length !== 2 || imvPdfRows[0].metricId !== 'imv_title_holders_by_nationality' || imvPdfRows[1].value !== 129794) throw new Error('IMV nationality PDF parsing failed');
const crimeRows = parseCrimeSeriesText('Serie\n;2024;2023;\nTOTAL NACIONAL;\n1. Homicidios;1.000;900;\n2. Robos;2.000;1.800;');
if (crimeRows.length !== 4 || crimeRows[0].metricId !== 'recorded_offences' || crimeRows[0].category !== 'Homicidios') throw new Error('Crime series parsing failed');
const housingRows = parsePublicHousingActionsText('Comunidad Autónoma;Provincia;Mes;Año;Número de viviendas;Tipología;Estado\nMadrid;Madrid;9;2024;12;Vivienda;Certificación Definitiva');
if (housingRows.length !== 1 || housingRows[0].metricId !== 'public_housing_actions' || housingRows[0].value !== 12 || housingRows[0].period !== '2024-09') throw new Error('Public housing action parsing failed');
const spreadsheet = await parseSpreadsheetBuffer(Buffer.from('period,territorio,grupo,beneficiarios\n2025,España,total,100'));
if (spreadsheet.length !== 1 || spreadsheet[0].grupo !== 'total') throw new Error('Spreadsheet parsing failed');
let rejected = false;
try { parseDomainPayload('immigration_crime', [{ valor: '2' }], source); } catch { rejected = true; }
if (!rejected) throw new Error('Incomplete domain data was not rejected');
console.log('Domain connector validation passed: JSON/CSV records preserve dimensions and incomplete source rows fail closed.');
