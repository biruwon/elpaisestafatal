import { domainConnectorIds, parseAirefPensionProjectionWorkbook, parseCrimeSeriesText, parseDelimited, parseDomainPayload, parseEuskadiHousingDocumentationText, parseEuskadiHousingNationalityText, parseGencatHousingDemandText, parseIneAdultPopulationBySexNationality, parseIneHousingTenureNationalityText, parseIneHousingTenureReferenceTable, parseIneTempusSnapshot, parseIneConvictionTable, parseIneConvictionPressText, parseIneUnemploymentRateTable, parseImvWorkbookBuffer, parseInteriorDetentionsTable, parseMadridPlanViveText, parseMadridSpecialNeedHousingText, parseOberaxeImvCrosstabText, parsePdfText, parsePublicHousingActionsText, parseSepeForeignBenefitsText, parseSocialSecurityPensionBudgetWorkbook, parseSocialSecurityPensionFinanceText, parseSocialSecurityPensionTransfersText, parseSpreadsheetBuffer, parseWildfireReportText, parseHealthEmergencyReportText } from './domain-connectors.mjs';
import * as XLSX from 'xlsx';

const source = { id: 'fixture-source', title: 'Fixture source', url: 'https://official.example/data' };
const ineSnapshot = parseIneTempusSnapshot([{ MetaData: [{ T3_Variable: 'Nacionalidad (española/extranjera)', Nombre: 'Extranjera' }], Data: [{ Valor: 1234 }] }], source);
if (ineSnapshot.length !== 1 || ineSnapshot[0].periodType !== 'retrieval_snapshot' || ineSnapshot[0].value !== 1234 || ineSnapshot[0].group !== 'Extranjera') throw new Error('INE Tempus snapshot parser did not preserve latest-snapshot semantics');
const convictionRows = parseIneConvictionTable([{ Nombre: 'Total Nacional. Total. Dato base. Total. Extranjera.', Data: [{ Anyo: 2025, Valor: 9123 }] }], { ...source, title: 'INE adult convictions by nationality and offence stage' });
if (convictionRows.length !== 1 || convictionRows[0].metricId !== 'crime_convictions_by_nationality' || convictionRows[0].dimensions.legalStage !== 'conviction' || convictionRows[0].dimensions.group !== 'Extranjera') throw new Error('INE conviction nationality parser did not preserve legal stage and group');
const sexConvictionRows = parseIneConvictionTable([{ Nombre: 'Total Nacional. Mujeres. Extranjera.', Data: [{ Anyo: 2025, Valor: 1200 }] }], { ...source, title: 'INE adult convictions by sex and nationality' });
if (sexConvictionRows.length !== 1 || sexConvictionRows[0].metricId !== 'crime_convictions_by_sex_nationality' || sexConvictionRows[0].dimensions.sex !== 'Women') throw new Error('INE conviction sex/nationality parser did not preserve sex dimension');
const adultPopulationRows = parseIneAdultPopulationBySexNationality([{ MetaData: [{ T3_Variable: 'Total Nacional', Nombre: 'Total Nacional' }, { T3_Variable: 'Valores simples de edad', Nombre: '18 años' }, { T3_Variable: 'Nacionalidad', Nombre: 'Extranjera' }, { T3_Variable: 'Sexo', Nombre: 'Mujeres' }], Data: [{ Anyo: 2025, Valor: 100 }] }], source);
if (adultPopulationRows.length !== 1 || adultPopulationRows[0].metricId !== 'resident_population_18_plus_by_sex_nationality' || adultPopulationRows[0].value !== 100) throw new Error('INE adult-population parser did not preserve aligned denominator');
const convictionRateRows = parseIneConvictionPressText('Estadística de la Población Condenada: Adulta. Año 2025. La tasa por cada 1.000 habitantes de 18 y más años, la de nacionalidad extranjera (15,3) fue superior a la de nacionalidad española (6,1). La tasa de población condenada menor de edad por cada 1.000 habitantes de 14 a 17 años fue algo menor del doble en la de nacionalidad extranjera (10,2) que en la de nacionalidad española (5,6).', source);
if (convictionRateRows.length !== 4 || convictionRateRows[0].metricId !== 'crime_conviction_rate_by_nationality' || convictionRateRows[0].dimensions.denominator !== 'residents aged 18 and over' || !convictionRateRows.some((row) => row.metricId === 'crime_conviction_rate_minor_by_nationality')) throw new Error('INE conviction-rate parser did not preserve aligned denominators');
const sepeRows = parseSepeForeignBenefitsText('SÍNTESIS DE DATOS NACIONALES DE BENEFICIARIOS DE PRESTACIONES POR DESEMPLEO EXTRANJEROS NOVIEMBRE 2025. Los beneficiarios existentes a final del mes fueron 1.784.520. El número de extranjeros del mes de noviembre de 2025 fue de 231.920. Los beneficiarios extranjeros representan el 13,00% del total de beneficiarios. % BENEFICIARIOS s/DEMANDANTES DE EMPLEO EXTRANJEROS 35,39.', source);
if (sepeRows.length !== 4 || !sepeRows.some((row) => row.metricId === 'unemployment_benefit_share_by_nationality' && row.value === 13) || !sepeRows.some((row) => row.metricId === 'unemployment_benefit_coverage_by_nationality' && row.value === 35.39) || !sepeRows.some((row) => row.dimensions?.group === 'Total' && row.value === 1784520)) throw new Error('SEPE unemployment-benefit parser did not preserve compatible group denominator and coverage');
const oberaxeRows = parseOberaxeImvCrosstabText('Nacionalidad;Provincia;Periodo;imv;Censo;Tasa\nEspañola;España;2024-01;620000;39000000;1,59\nExtranjera;España;2024-01;120000;3500000;3,43', { ...source, title: 'OBERAXE IMV coverage crosstab' });
if (oberaxeRows.length !== 6 || !oberaxeRows.some((row) => row.metricId === 'imv_title_holder_rate_by_nationality' && row.dimensions.group === 'Extranjera' && row.value === 3.43) || !oberaxeRows.some((row) => row.metricId === 'imv_comparable_population_by_nationality' && row.value === 3500000)) throw new Error('OBERAXE IMV crosstab parser did not preserve numerator, denominator, and rate');
const gencatRows = parseGencatHousingDemandText('Al conjunt del territori consten 129.157 sol·licituds inscrites', { ...source, title: 'Catalonia protected-housing applicant register, INFORME-RSHPO-4T-2025' });
if (gencatRows.length !== 4 || gencatRows[0].metricId !== 'public_housing_applications' || gencatRows[0].value !== 129157 || gencatRows[1].metricId !== 'public_housing_applications_by_nationality' || gencatRows[1].value !== 99056 || gencatRows[0].geography !== 'Catalunya') throw new Error('Gencat housing-demand parser did not preserve scope and nationality chart');
const euskadiRows = parseEuskadiHousingNationalityText('Evolución de las personas adjudicatarias de vivienda protegida de la CAPV y peso relativo sobre total de adjudicatarios según nacionalidad, 2006-2015 Nacionalidad extranjera Nacionalidad española TOTAL 2012 687 6.691 7.378 9,3% 2013 613 5.725 6.338 9,7% 2014 738 6.637 7.375 10,0% 2015 795 5.173 5.968 13,3% Fuente: Viceconsejería de Vivienda', source);
if (euskadiRows.length !== 4 || euskadiRows.find((row) => row.period === '2015')?.value !== 795 || euskadiRows.find((row) => row.period === '2015')?.comparison.foreignShare !== 13.3) throw new Error('Euskadi housing-nationality parser did not preserve scope and comparison');
const unemploymentRows = parseIneUnemploymentRateTable([{ Nombre: 'Tasa de paro de la población. Española.', Data: [{ Anyo: 2024, Valor: 6.2 }] }, { Nombre: 'Tasa de paro de la población. Fuera de la UE27_2020 y otros.', Data: [{ Anyo: 2024, Valor: 14.1 }] }], source);
if (unemploymentRows.length !== 2 || unemploymentRows[0].metricId !== 'unemployment_rate_by_nationality' || unemploymentRows[1].dimensions.group !== 'Extranjera fuera de UE27') throw new Error('INE unemployment-rate parser did not preserve nationality groups');
const tenureRows = parseIneHousingTenureNationalityText('Hogares según régimen de tenencia de la vivienda principal y nacionalidad de los miembros del hogar Porcentajes 11,9 41,3 27,3 10,5 9,0 4,6 17,2 25,4 43,3 9,5 1,6 19,0 16,8 56,4 6,2 Hogar exclusivamente español', source);
if (tenureRows.length !== 15 || tenureRows.find((row) => row.dimensions.group === 'foreign-only household' && row.dimensions.tenure === 'rented')?.value !== 56.4) throw new Error('INE housing-tenure parser did not preserve nationality groups and categories');
const referenceTenureRows = parseIneHousingTenureReferenceTable([{ Nombre: 'Extranjera. Alquiler. Total Nacional. Hogar.', MetaData: [{ T3_Variable: 'Nacionalidad de la persona de refencia', Nombre: 'Extranjera' }, { T3_Variable: 'Régimen de tenenecia de la vivienda principal', Nombre: 'Alquiler' }, { T3_Variable: 'Totales Territoriales', Nombre: 'Total Nacional' }, { T3_Variable: 'Tipo de dato', Nombre: 'Hogar' }], Data: [{ Anyo: 2025, Valor: 58.2 }] }], source);
if (referenceTenureRows.length !== 1 || referenceTenureRows[0].metricId !== 'housing_tenure_by_reference_nationality' || referenceTenureRows[0].dimensions.group !== 'Foreign reference nationality') throw new Error('INE table 9995 housing-tenure parser did not preserve reference-person nationality');
const documentationRows = parseEuskadiHousingDocumentationText('De las 1.473 viviendas adjudicadas en alquiler en 2025, 1.237 corresponden a solicitantes identificados con el Documento Nacional de Identidad. En compra, 1.454 de 1.483 adjudicaciones.', source);
if (documentationRows.length !== 4 || documentationRows[0].value !== 1237 || documentationRows[0].comparison.share !== 83.98) throw new Error('Euskadi housing-documentation parser did not preserve programme totals');
const madridRows = parseMadridSpecialNeedHousingText('DATOS TOTALES DEL SEGUNDO TRIMESTRE DE 2026: 21 7 0 5 5 ADJUDICACIONES', source);
if (madridRows.length !== 1 || madridRows[0].value !== 21 || madridRows[0].period !== '2026-Q2') throw new Error('Madrid special-need housing parser did not preserve total and period');
const viveRows = parseMadridPlanViveText('La Comunidad de Madrid ha entregado las primeras 140 viviendas de alquiler a precio asequible del Plan Vive, con casi 11.000 solicitudes. Ha de disponer de la nacionalidad española, teniendo prioridad los empadronados.', source);
if (viveRows.length !== 3 || !viveRows.some((row) => row.metricId === 'public_housing_allocations_by_programme' && row.value === 140) || !viveRows.some((row) => row.metricId === 'public_housing_applications' && row.value === 11000) || !viveRows.some((row) => row.metricId === 'public_housing_allocation_rate_by_programme' && row.value === 1.27)) throw new Error('Madrid Plan Vive parser did not preserve applications, allocations, and derived selection ratio');
const fixtures = {
  immigration_benefits: [{ periodo: '2025', territorio: 'España', grupo: 'nacionalidad extranjera', beneficiarios: '1200' }],
  immigration_crime: [{ periodo: '2025', territorio: 'España', grupo: 'nacionalidad', tasa: '42,5' }],
  public_housing_allocation: [{ periodo: '2025', municipio: 'Madrid', grupo: 'solicitantes extranjeros', adjudicaciones: '120' }],
  wildfire_statistics: [{ periodo: '2025', territorio: 'España', superficie: '354746.67' }],
  health_emergency_wait: [{ periodo: '2025', territorio: 'España', minutos: '216.69' }],
  pension_finance: [{ periodo: '2024', territorio: 'España', valor: '-2900.90' }],
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
if (imvRows.length !== 6 || !imvRows.some((row) => row.metricId === 'benefit_recipients_by_group' && row.value === 250) || !imvRows.some((row) => row.metricId === 'imv_beneficiary_average_age' && row.value === 28.4) || !imvRows.some((row) => row.dimensions?.group === 'Extranjera' && row.value === 20) || !imvRows.some((row) => row.metricId === 'imv_title_holder_share_by_nationality')) throw new Error('IMV workbook parser did not preserve beneficiaries, age, nationality, and composition');
const crimeRows = parseCrimeSeriesText('Serie\n;2024;2023;\nTOTAL NACIONAL;\n1. Homicidios;1.000;900;\n2. Robos;2.000;1.800;');
if (crimeRows.length !== 4 || crimeRows[0].metricId !== 'recorded_offences' || crimeRows[0].category !== 'Homicidios') throw new Error('Crime series parsing failed');
const detentionRows = parseInteriorDetentionsTable(parseDelimited('Comunidades autónomas\tTipología penal\tSexo\tNacionalidad\tperiodo\tTotal\nTOTAL NACIONAL\t1. Homicidio\tMasculino\tExtranjera\t2024\t1.234'), { ...source, title: 'Interior SEC detenciones e investigados' });
if (detentionRows.length !== 1 || detentionRows[0].metricId !== 'crime_detentions_investigations_by_nationality' || detentionRows[0].dimensions.legalStage !== 'detention_or_investigation' || detentionRows[0].value !== 1234) throw new Error('Interior detention/investigation parser did not preserve stage, group, or value');
const housingRows = parsePublicHousingActionsText('Comunidad Autónoma;Provincia;Mes;Año;Número de viviendas;Tipología;Estado\nMadrid;Madrid;9;2024;12;Vivienda;Certificación Definitiva');
if (housingRows.length !== 1 || housingRows[0].metricId !== 'public_housing_actions' || housingRows[0].value !== 12 || housingRows[0].period !== '2024-09') throw new Error('Public housing action parsing failed');
const wildfireRows = parseWildfireReportText('Total siniestros 9.171 8.199\nS. Forestal (ha) 105.614 354.746,67', source);
if (wildfireRows.length !== 4 || wildfireRows[0].metricId !== 'wildfire_incidents' || wildfireRows[2].value !== 354746.67) throw new Error('Wildfire report parsing failed');
const healthRows = parseHealthEmergencyReportText('Tiempo medio declarado: 216,69 minutos', source);
if (healthRows.length !== 1 || healthRows[0].metricId !== 'emergency_wait_declared' || healthRows[0].value !== 216.69) throw new Error('Health emergency report parsing failed');
const pensionRows = parseSocialSecurityPensionFinanceText('481 PENSIONES 1,00 2,00 3,00 4,00 172.653.504.701,48\n1. Cotizaciones Sociales 146.148,70\n4. Transferencias corrientes 48.151,75\nINGRESOS OPERACIONES CORRIENTES 195.891,23\nGASTOS POR OPERACIONES CORRIENTES 205.201,38\nDEFICIT/SUPERAVIT -9.310,15\nRESULTADO PRESUPUESTARIO TOTAL -2.900,90', { ...source, id: 'account-source' });
if (pensionRows.length !== 7 || pensionRows.find((row) => row.metricId === 'social_security_contributory_pension_expenditure')?.value !== 172653.504701 || pensionRows.find((row) => row.metricId === 'social_security_current_balance')?.value !== -9310.15 || !pensionRows.every((row) => row.period === '2024' && row.geography === 'España')) throw new Error('Social Security account parser did not preserve pension expenditure, budget results, and dimensions');
const airefBook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(airefBook, XLSX.utils.aoa_to_sheet([
  ['metadata'], ['metadata'], ['metadata'], ['metadata'],
  ['', '', '', '', 2020, 2025, 2070],
  ['', 'Pensiones contributivas', 'Ingreso', 'Cotizaciones SSS dedicadas a pensiones', 9.2, 9.6, 10.3],
  ['', '', '', '', '', '', ''],
  ['', '', '', '', '', '', ''],
  ['', '', '', '', '', '', ''],
  ['', '', '', '', '', '', ''],
  ['', '', '', '', '', '', ''],
  ['', '', '', '', '', '', ''],
  ['', '', 'Ingreso', 'Transferencias de AC', 0.8, 1.6, 1.7],
  ['', '', '', '', '', '', ''],
  ['', '', 'Gasto', 'Pensiones SS + complemento a mínimos', 12.3, 11.3, 14.8],
  ['', '', 'Gasto', 'No contributivas', 0.2, 0.2, 0.2],
  ['', '', '', '', '', '', ''],
  ['', 'TOTAL', 'Ingresos', '', 11.5, 12.6, 12.4],
  ['', 'TOTAL', 'Gastos', '', 14.0, 12.9, 15.4],
  ['', 'TOTAL', 'Saldo', '', -2.5, -0.3, -3.0],
  ['', 'TOTAL', '', 'Transferencias implícitas', 2.5, 0.3, 3.0],
]), 'Gráfico 12');
const airefRows = await parseAirefPensionProjectionWorkbook(XLSX.write(airefBook, { type: 'buffer', bookType: 'xlsx' }), { ...source, id: 'airef-source', title: 'AIReF projection workbook' });
if (airefRows.length !== 24 || !airefRows.some((row) => row.metricId === 'pension_system_balance_projected' && row.period === '2070' && row.value === -3) || !airefRows.every((row) => row.dataKind === 'projected' && row.unit === '% del PIB' && row.dimensions.scenario)) throw new Error('AIReF projection parser did not preserve annual projected pension-finance series');
const budgetBook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(budgetBook, XLSX.utils.aoa_to_sheet([
  ['Cuadro 9.4'],
  ['Concepto', 'TOTAL CONTRIBUTIVO', 'TOTAL COMPLEMENTOS A MÍNIMOS', '', '', 'PRESTACIONES NO CONTRIBUTIVAS', 'TOTAL PRESTACIONES'],
  ['PENSIONES', 159526468.39, 7250126.54, '', '', 2806060.84, 169582905.52],
]), 'C9.4');
const budgetRows = await parseSocialSecurityPensionBudgetWorkbook(XLSX.write(budgetBook, { type: 'buffer', bookType: 'xlsx' }), { ...source, id: 'budget-source', title: 'Social Security 2025P pension budget' });
if (budgetRows.length !== 4 || budgetRows.find((row) => row.metricId === 'social_security_contributory_pension_budget')?.value !== 159526.46839 || budgetRows.find((row) => row.metricId === 'social_security_pension_budget_total')?.value !== 169582.90552 || !budgetRows.every((row) => row.period === '2025P' && row.unit === 'millones de euros')) throw new Error('Social Security pension budget parser did not preserve 2025P breakdown and units');
const transferRows = parseSocialSecurityPensionTransfersText('C3 INGRESOS POR TRANSFERENCIAS 2025P\nComplementos a mínimos 7.261.170,00\nPensiones no contributivas 3.002.958,15\nPacto de Toledo 19.888.000,00', { ...source, id: 'transfer-source', title: 'Social Security C3 2025P transfers' });
if (transferRows.length !== 3 || transferRows.find((row) => row.metricId === 'social_security_minimum_complements_transfer_budget')?.value !== 7261.17 || transferRows.find((row) => row.metricId === 'social_security_pact_toledo_transfer_budget')?.value !== 19888 || !transferRows.every((row) => row.period === '2025P' && row.dataKind === 'context' && row.unit === 'millones de euros')) throw new Error('Social Security transfer parser did not preserve budgeted destinations and scope');
const spreadsheet = await parseSpreadsheetBuffer(Buffer.from('period,territorio,grupo,beneficiarios\n2025,España,total,100'));
if (spreadsheet.length !== 1 || spreadsheet[0].grupo !== 'total') throw new Error('Spreadsheet parsing failed');
let rejected = false;
try { parseDomainPayload('immigration_crime', [{ valor: '2' }], source); } catch { rejected = true; }
if (!rejected) throw new Error('Incomplete domain data was not rejected');
console.log('Domain connector validation passed: JSON/CSV records preserve dimensions and incomplete source rows fail closed.');
