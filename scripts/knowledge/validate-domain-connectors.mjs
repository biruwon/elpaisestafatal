import { domainConnectorIds, parseCrimeSeriesText, parseDelimited, parseDomainPayload, parseIneTempusSnapshot, parseIneConvictionTable, parseImvWorkbookBuffer, parsePdfText, parsePublicHousingActionsText, parseSpreadsheetBuffer, parseWildfireReportText, parseHealthEmergencyReportText } from './domain-connectors.mjs';
import * as XLSX from 'xlsx';

const source = { id: 'fixture-source', title: 'Fixture source', url: 'https://official.example/data' };
const ineSnapshot = parseIneTempusSnapshot([{ MetaData: [{ T3_Variable: 'Nacionalidad (española/extranjera)', Nombre: 'Extranjera' }], Data: [{ Valor: 1234 }] }], source);
if (ineSnapshot.length !== 1 || ineSnapshot[0].periodType !== 'retrieval_snapshot' || ineSnapshot[0].value !== 1234 || ineSnapshot[0].group !== 'Extranjera') throw new Error('INE Tempus snapshot parser did not preserve latest-snapshot semantics');
const convictionRows = parseIneConvictionTable([{ Nombre: 'Total Nacional. Total. Dato base. Total. Extranjera.', Data: [{ Anyo: 2025, Valor: 9123 }] }], { ...source, title: 'INE adult convictions by nationality and offence stage' });
if (convictionRows.length !== 1 || convictionRows[0].metricId !== 'crime_rate_by_group' || convictionRows[0].dimensions.legalStage !== 'conviction' || convictionRows[0].dimensions.group !== 'Extranjera') throw new Error('INE conviction nationality parser did not preserve legal stage and group');
const fixtures = {
  immigration_benefits: [{ periodo: '2025', territorio: 'España', grupo: 'nacionalidad extranjera', beneficiarios: '1200' }],
  immigration_crime: [{ periodo: '2025', territorio: 'España', grupo: 'nacionalidad', tasa: '42,5' }],
  public_housing_allocation: [{ periodo: '2025', municipio: 'Madrid', grupo: 'solicitantes extranjeros', adjudicaciones: '120' }],
  wildfire_statistics: [{ periodo: '2025', territorio: 'España', superficie: '354746.67' }],
  health_emergency_wait: [{ periodo: '2025', territorio: 'España', minutos: '216.69' }],
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
const imvBook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(imvBook, XLSX.utils.aoa_to_sheet([['1.5. IMV. Sexo y nacionalidad de los titulares. Nómina de marzo de 2026.'], [], [], [], [], [], [], [], [], [], [], ['CCAA', '', 'Número', '', '', 'Nacionalidad', ''], [''], ['Total', '', 100, 0, 0, 80, 20]]), 'IMV. 1.5. Titulares sexo y nac ');
XLSX.utils.book_append_sheet(imvBook, XLSX.utils.aoa_to_sheet([['1.7. IMV. Beneficiarios de la prestación por sexo y edad. Nómina de marzo de 2026.'], [], [], [], [], [], [], [], [], [], [], ['CCAA', '', 'Número de beneficiarios'], [''], ['Total', '', 250, 0, 0, 0, 0, 28.4]]), 'IMV. 1.7. Beneficiarios');
const imvRows = await parseImvWorkbookBuffer(XLSX.write(imvBook, { type: 'buffer', bookType: 'xlsx' }), { ...source, title: 'IMV workbook' });
if (imvRows.length !== 3 || !imvRows.some((row) => row.metricId === 'benefit_recipients_by_group' && row.value === 250) || !imvRows.some((row) => row.group === 'Extranjera' && row.value === 20)) throw new Error('IMV workbook parser did not preserve beneficiaries and nationality');
const crimeRows = parseCrimeSeriesText('Serie\n;2024;2023;\nTOTAL NACIONAL;\n1. Homicidios;1.000;900;\n2. Robos;2.000;1.800;');
if (crimeRows.length !== 4 || crimeRows[0].metricId !== 'recorded_offences' || crimeRows[0].category !== 'Homicidios') throw new Error('Crime series parsing failed');
const housingRows = parsePublicHousingActionsText('Comunidad Autónoma;Provincia;Mes;Año;Número de viviendas;Tipología;Estado\nMadrid;Madrid;9;2024;12;Vivienda;Certificación Definitiva');
if (housingRows.length !== 1 || housingRows[0].metricId !== 'public_housing_actions' || housingRows[0].value !== 12 || housingRows[0].period !== '2024-09') throw new Error('Public housing action parsing failed');
const wildfireRows = parseWildfireReportText('Total siniestros 9.171 8.199\nS. Forestal (ha) 105.614 354.746,67', source);
if (wildfireRows.length !== 4 || wildfireRows[0].metricId !== 'wildfire_incidents' || wildfireRows[2].value !== 354746.67) throw new Error('Wildfire report parsing failed');
const healthRows = parseHealthEmergencyReportText('Tiempo medio declarado: 216,69 minutos', source);
if (healthRows.length !== 1 || healthRows[0].metricId !== 'emergency_wait_declared' || healthRows[0].value !== 216.69) throw new Error('Health emergency report parsing failed');
const spreadsheet = await parseSpreadsheetBuffer(Buffer.from('period,territorio,grupo,beneficiarios\n2025,España,total,100'));
if (spreadsheet.length !== 1 || spreadsheet[0].grupo !== 'total') throw new Error('Spreadsheet parsing failed');
let rejected = false;
try { parseDomainPayload('immigration_crime', [{ valor: '2' }], source); } catch { rejected = true; }
if (!rejected) throw new Error('Incomplete domain data was not rejected');
console.log('Domain connector validation passed: JSON/CSV records preserve dimensions and incomplete source rows fail closed.');
