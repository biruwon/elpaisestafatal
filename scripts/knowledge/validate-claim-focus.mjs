import assert from 'node:assert/strict';
import { utils, write } from 'xlsx';
import { claimFocusFor, focusedMetricIdsFor } from '../../src/lib/knowledge/claim-focus.mjs';
import { focusedEvidencePlan } from '../../src/lib/knowledge/focused-evidence-plan.mjs';
import { broadDomainPacketsFor } from '../../src/lib/knowledge/broad-domain-snapshot.mjs';
import { answerPlanForBroadDomains } from '../../src/lib/knowledge/broad-domain-snapshot.mjs';
import { publicResolveResponse } from '../../src/lib/knowledge/public-response.mjs';
import { shouldRetainReviewedPreview } from '../../src/lib/knowledge/reviewed-answer-stability.mjs';
import { localPublicCheckResponse } from '../lib/local-public-check-response.mjs';
import { parsePrimaryCareBarometerWorkbook } from './domain-connectors.mjs';
import { validateAnswerPlan } from './answer-plan-validation.mjs';
import { alignPropositionOutcomes, comparableObservationGroups, composePropositionFindings, evidenceForProposition } from '../lib/compound-evidence.mjs';
import { rankWarehouseObservations } from './warehouse-query.mjs';

const cases = [
  ['working-poverty', ['En España se puede trabajar a jornada completa y seguir sin llegar a fin de mes', 'Tener trabajo a tiempo completo no impide ser pobre', 'La pobreza también alcanza a personas ocupadas']],
  ['real-wages', ['Los salarios pierden poder adquisitivo frente al coste de la vida', 'Los sueldos no siguen el ritmo de los precios', 'La inflación se come la nómina']],
  ['rental-affordability', ['Con un sueldo normal ya no se puede alquilar un piso entero solo', 'El alquiler se lleva la mitad de los ingresos', 'La renta mensual consume casi todo el salario']],
  ['matched-pay', ['Las empresas españolas pagan menos por el mismo perfil profesional', 'Los salarios difieren entre países aun desempeñando el mismo puesto', 'Mismo trabajo y sueldo distinto según el país']],
  ['primary-care-waits', ['Hay que esperar demasiado para conseguir cita con el médico de familia', '¿Cuántos días tarda una cita en atención primaria?', 'La cita con el médico de cabecera llega con mucha demora']],
  ['private-healthcare-access', ['Se contrata seguro privado para evitar esperas de especialistas', '¿La sanidad privada permite acceder antes a las pruebas?', 'El seguro privado se compra por la rapidez de las citas']],
  ['electricity-price-transmission', ['El gas encarece la electricidad en el sistema marginalista', 'Los hogares no notan la electricidad barata de las renovables', 'El precio mayorista no llega íntegro a la factura de la luz']],
  ['rail-punctuality', ['Los retrasos de Cercanías hacen perder horas a los pasajeros', 'Los trenes de Renfe son poco puntuales', 'Las compensaciones por demoras ferroviarias no cubren el tiempo perdido']],
  ['pension-financing', ['El trabajador no ahorra sus cotizaciones para su propia pensión sino que financia a los jubilados actuales', '¿Las pensiones públicas usan reparto o cuentas individuales?', 'Las cotizaciones sostienen las jubilaciones actuales']],
  ['housing-supply', ['Los pisos turísticos retiran vivienda del alquiler residencial', 'Los apartamentos turísticos reducen la oferta de viviendas para residentes', '¿Cuántas casas vacías hay disponibles en la ciudad?']],
  ['nominal-wages', ['Los salarios españoles son más bajos que los europeos', 'El sueldo ha bajado durante años', 'Las remuneraciones aumentan en España']],
];
for (const [family, paraphrases] of cases) for (const claim of paraphrases) {
  assert.equal(claimFocusFor(claim)?.id, family, claim);
  assert.equal(broadDomainPacketsFor(claim).length, 0, `A precise claim inherited a broad packet: ${claim}`);
}
for (const claim of ['La temporalidad laboral ha bajado', 'La tasa de paro juvenil es elevada', 'Los hospitales tienen pocas camas', 'El seguro del coche ha subido', 'Los trenes transportan más pasajeros', 'Mi plan de pensiones privado acumula ahorro en una cuenta individual']) {
  assert.equal(claimFocusFor(claim), undefined, `Neighbour crossed into a different measurement: ${claim}`);
}
assert.deepEqual([...focusedMetricIdsFor('Trabajar a jornada completa y ser pobre')].filter((id) => id.includes('poverty')), ['in_work_poverty_full_time_rate']);

const source = { id: 'sanidad-wave-one', title: 'Barómetro Sanitario 2026, primera oleada', publisher: 'Ministerio de Sanidad', url: 'https://www.sanidad.gob.es/estadEstudios/estadisticas/BarometroSanitario/home_BS.htm', retrievedAt: '2026-10-30' };
const rows = [
  ['3551/0 BARÓMETRO SANITARIO 2026 (PRIMERA OLEADA)'],
  ['Pregunta 5c'], ['Desde que pidió cita hasta que le atendió el médico de familia, ¿cuánto tiempo pasó?'],
  ['Pasó más de un día porque no había cita antes', 71.16324068042688],
  ['Pasó más de un día porque la cita no le venía bien', 4.8737578604006035], ['(N)', 2061],
  ['Pregunta 5c_01'], ['¿Cuántos días?'], ['(N)', 1467], ['Media  (días)', 10.27], ['N', 1448],
  ['Pregunta 6'], ['Espera quirúrgica', 121],
];
const workbook = (inputRows) => { const book = utils.book_new(); utils.book_append_sheet(book, utils.aoa_to_sheet(inputRows), 'Marginales'); return write(book, { type: 'buffer', bookType: 'xlsx' }); };
const parsed = await parsePrimaryCareBarometerWorkbook(workbook(rows), source);
assert.equal(parsed.length, 2);
assert.equal(parsed.find((item) => item.metricId === 'primary_care_wait_days').value, 10.27);
assert.equal(parsed.find((item) => item.metricId === 'primary_care_wait_days').dimensions.validResponseSampleSize, 1448);
assert.equal(parsed.find((item) => item.metricId === 'primary_care_wait_over_one_day_rate').dimensions.sampleSize, 2061);
assert.ok(parsed.every((item) => item.period === '2026-O1' && item.dimensions.provisional));
await assert.rejects(() => parsePrimaryCareBarometerWorkbook(workbook(rows.filter((row) => row[0] !== 'Pregunta 5c_01')), source), /question 5c_01 missing/);
await assert.rejects(() => parsePrimaryCareBarometerWorkbook(workbook(rows.map((row) => String(row[0]).includes('no había cita') ? [row[0], 101] : row)), source), /values or respondent bases/);

const observations = parsed.map((row) => ({ ...row, source }));
const claim = cases.find(([family]) => family === 'primary-care-waits')[1][0];
const plan = focusedEvidencePlan(claim, { observations });
assert.equal(plan.evidenceLevel, 'limited');
assert.match(plan.shareableReply, /10,27/);
assert.match(plan.shareableReply, /71,2 %/);
assert.match(plan.shareableReply, /provisionales/);
assert.match(plan.shareableReply, /subgrupo|quienes esperaron|más de un día/);
assert.doesNotMatch(plan.shareableReply, /121|IMCV|peor que nunca/);
assert.ok(plan.shareableReply.split(/\s+/).length < 180, 'The primary answer must be easy to digest');
assert.ok(validateAnswerPlan(plan).ok, JSON.stringify(validateAnswerPlan(plan).errors));
const payload = { status: 'complete', requestId: 'focus-fixture', result: plan };
assert.ok(publicResolveResponse(payload));
const displayed = localPublicCheckResponse(payload, claim);
assert.equal(displayed.result.sources.length, 1);
assert.equal(displayed.result.answerScope.family, 'primary-care-waits');
assert.equal(shouldRetainReviewedPreview({ result: { evidenceSummary: { families: [{ label: 'Toda la sanidad' }] } } }, displayed), false);

for (const mismatch of ['En Madrid la cita con el médico de familia tarda mucho', 'En Francia la cita con el médico de familia tarda mucho', 'En 2010 la cita con el médico de familia tardaba mucho', 'Las mujeres esperan demasiado para la cita con el médico de familia']) {
  const answer = focusedEvidencePlan(mismatch, { observations });
  assert.equal(answer.evidenceIds.length, 0, `An unmatched scope inherited national survey data: ${mismatch}`);
  assert.doesNotMatch(answer.shareableReply, /10,27|71,2/);
}
const povertySource = { id: 'eurostat-poverty', title: 'In-work at-risk-of-poverty rate', publisher: 'Eurostat', url: 'https://ec.europa.eu/eurostat/databrowser/view/ilc_iw07/default/table', retrievedAt: '2026-10-30' };
const poverty = [{ id: 'full-time-poverty', metricId: 'in_work_poverty_full_time_rate', value: 9.5, period: '2025', unit: '%', dimensions: { geo: 'ES', worktime: 'FT' }, source: povertySource },
  { id: 'total-poverty', metricId: 'in_work_poverty_rate', value: 11.2, period: '2025', unit: '%', dimensions: { geo: 'ES' }, source: povertySource },
  { id: 'temporary', metricId: 'temporary_employment_rate', value: 14.7, period: '2026-Q2', unit: '%', source: povertySource }];
const fullTime = focusedEvidencePlan('Trabajar a jornada completa no impide ser pobre', { observations: poverty });
assert.deepEqual(fullTime.evidenceIds, ['full-time-poverty']);
assert.match(fullTime.shareableReply, /9,5/);
assert.doesNotMatch(fullTime.shareableReply, /11,2|14,7/);
const stalePoverty = focusedEvidencePlan('Trabajar a jornada completa no impide ser pobre', { observations: [{ ...poverty[0], freshness: 'stale', status: 'p' }] });
assert.match(stalePoverty.shareableReply, /fuente no se ha actualizado/);
assert.match(stalePoverty.shareableReply, /dato como provisional/);
const endsMeet = focusedEvidencePlan('A jornada completa no se llega a fin de mes', { observations: poverty });
assert.ok(endsMeet.blocks.some((block) => block.type === 'evidence_gap' && block.missing.some((part) => /dificultad declarada/.test(part))));
assert.equal(endsMeet.evidenceSummary.families[0].dataKind, 'context', 'A poverty threshold does not directly measure difficulty making ends meet');
assert.match(endsMeet.shareableReply, /Como contexto/);
const educationStaff = [{ ...poverty[0], id: 'teaching-staff', metricId: 'education_personnel', value: 120, unit: 'docentes' }];
for (const claim of ['Hay demasiados alumnos por aula', 'Las clases tienen muchos alumnos por grupo']) {
  const answer = focusedEvidencePlan(claim, { observations: educationStaff });
  assert.ok(answer.blocks.some((block) => block.type === 'evidence_gap' && block.missing.some((item) => /por grupo o aula/.test(item))), claim);
  assert.equal(answer.evidenceSummary.families[0].dataKind, 'context', 'The number of teachers cannot directly answer a class-size question');
  assert.match(answer.shareableReply, /no equivale al alumnado por aula/);
}
const perTeacher = focusedEvidencePlan('Hay muchos alumnos por profesor en las aulas', { observations: educationStaff });
assert.ok(perTeacher.blocks.some((block) => block.type === 'evidence_gap' && block.missing.includes('alumnado por docente')));
assert.equal(claimFocusFor('El alquiler cuesta más de la mitad del sueldo')?.id, 'rental-affordability');
assert.equal(claimFocusFor('Para el mismo perfil profesional los salarios son más bajos')?.id, 'matched-pay');
const pensionExplanation = focusedEvidencePlan('¿Las pensiones públicas usan reparto o cuentas individuales?', { now: Date.parse('2026-10-30') });
assert.ok(pensionExplanation.sourceLinks.some((item) => /seg-social\.es/.test(item.url)));
assert.equal(focusedEvidencePlan('¿Las pensiones públicas francesas usan reparto o cuentas individuales?', { now: Date.parse('2026-10-30') }).sourceLinks.length, 0, 'A Spanish institutional source cannot answer a French system question');
assert.equal(focusedEvidencePlan('¿Las pensiones públicas usan reparto o cuentas individuales?', { now: Date.parse('2027-02-01') }).sourceLinks.length, 0, 'Expired reviewed explanations must not appear as current');
const marginalClaim = 'El sistema marginalista hace que el gas pueda encarecer toda la electricidad aunque una parte se produzca más barata';
const marginal = focusedEvidencePlan(marginalClaim, { now: Date.parse('2026-10-30'), propositions: [
  { text: 'El sistema marginalista hace que el gas pueda encarecer toda la electricidad' }, { text: 'una parte se produzca más barata' },
] });
assert.ok(marginal?.sourceLinks.some((item) => item.publisher === 'Red Eléctrica'));
assert.match(marginal.shareableReply, /última oferta|última.*necesaria/);
const electricity = [{ ...poverty[0], id: 'electricity-price', metricId: 'household_electricity_price', value: 0.2739, period: '2026-S1', unit: 'Kilowatt-hour',
  dimensions: { geo: 'ES', currency: 'EUR', unit: 'KWH', nrg_cons: 'TOT_KWH', tax: 'I_TAX' } }];
const electricityAnswer = focusedEvidencePlan(marginalClaim, { observations: electricity, now: Date.parse('2026-10-30') });
assert.match(electricityAnswer.shareableReply, /0,2739 €\/kWh/);
assert.match(electricityAnswer.shareableReply, /todos los tramos de consumo, con impuestos y tasas incluidos/);
assert.doesNotMatch(electricityAnswer.shareableReply, /0,2739 Kilowatt-hour/);
const unknownCurrency = focusedEvidencePlan(marginalClaim, { observations: [{ ...electricity[0], dimensions: { ...electricity[0].dimensions, currency: undefined } }] });
assert.doesNotMatch(unknownCurrency.shareableReply, /0,2739/, 'An energy unit alone does not identify the currency of a price');
assert.equal(focusedEvidencePlan('La luz está cara y una parte de la educación empeora', { propositions: [
  { text: 'La luz está cara' }, { text: 'una parte de la educación empeora' },
] }), undefined, 'A new named subject must not inherit the electricity explanation');
const zero = focusedEvidencePlan('Trabajar a jornada completa no impide ser pobre', { observations: [{ ...poverty[0], value: 0 }] });
assert.match(zero.shareableReply, /0 %/);
for (const value of [null, '', Number.NaN]) assert.equal(focusedEvidencePlan('Trabajar a jornada completa no impide ser pobre', { observations: [{ ...poverty[0], value }] }).evidenceIds.length, 0);
const unaligned = focusedEvidencePlan('Los salarios pierden poder adquisitivo frente a los precios', { observations: [
  { ...poverty[0], id: 'wage', metricId: 'median_hourly_earnings', value: 11.02, period: '2022', unit: 'EUR' },
  { ...poverty[0], id: 'cpi', metricId: 'cpi_index', value: 119.94, period: '2025-12', unit: 'index' },
] });
assert.ok(unaligned.evidenceSummary.families.filter((item) => item.data.length).every((item) => item.dataKind === 'context'));
assert.match(unaligned.shareableReply, /mismas fechas|mismos periodos/);
assert.ok(unaligned.blocks.some((block) => block.type === 'evidence_gap'));
assert.equal(focusedEvidencePlan('Los salarios pierden poder adquisitivo y los trenes se retrasan', { propositions: [{ text: 'Los salarios pierden poder adquisitivo' }, { text: 'Los trenes se retrasan' }] }), undefined, 'A compound claim must not silently lose its second proposition');
const revenue = { id: 'revenue', metricId: 'government_revenue_ratio', metric: 'Ingresos públicos', value: 42.9, period: '2025', unit: '% del PIB', geography: 'España' };
assert.deepEqual(evidenceForProposition({ text: 'La recaudación aumenta' }, [revenue]), [revenue]);
assert.deepEqual(evidenceForProposition({ text: 'Los ciudadanos no notan mejoras en los servicios públicos' }, [revenue]), [], 'A shared word cannot attach revenue to perceived service quality');
const itemList = [{ text: 'Afirmación completa', explicit: true }, { text: 'Parte A', explicit: true }, { text: 'Parte B', explicit: true }];
const launched = itemList.slice(1);
const outcomes = [{ status: 'fulfilled', value: { result: { evidenceIds: ['source-A'], summary: 'A' } } }, { status: 'fulfilled', value: { result: { evidenceIds: ['source-B'], summary: 'B' } } }];
const alignedParts = alignPropositionOutcomes(itemList, outcomes, launched);
assert.equal(alignedParts[0].evidenceIds, undefined, 'A filtered whole-claim item inherited the first clause result');
assert.deepEqual(alignedParts[1].evidenceIds, ['source-A']);
assert.deepEqual(alignedParts[2].evidenceIds, ['source-B']);
assert.match(composePropositionFindings(alignedParts), /«Parte A»: A/);
assert.equal(alignPropositionOutcomes([{ text: 'La recaudación aumenta' }], [{ status: 'fulfilled', value: { result: { id: 'broad-health', evidenceIds: ['hospital'], evidenceLevel: 'limited' } } }], undefined, { requireCompatibility: true })[0].evidenceIds, undefined, 'An unrelated broad packet cannot become evidence for a clause');
assert.equal(comparableObservationGroups([revenue, { ...revenue, id: 'eu-revenue', geography: 'UE' }, { ...revenue, id: 'people', population: 'hogares' }]).length, 3, 'Different scopes became one trend');
assert.equal(rankWarehouseObservations('appointment delay', observations, 10, { metricIds: new Set(['primary_care_wait_days']) }).length, 1, 'An explicit metric ID must retrieve its source across languages');
const youthRent = answerPlanForBroadDomains('El alquiler se come más de la mitad del sueldo de muchos jóvenes');
assert.match(youthRent.shareableReply, /98,7/);
assert.match(youthRent.shareableReply, /no indican cuántos jóvenes superan un porcentaje/);
assert.doesNotMatch(youthRent.shareableReply, /emigra|66\.900|peor que nunca/i);
assert.ok(!youthRent.evidenceSummary.families.some((family) => family.criterionId === 'family-support-counterfactual'));
assert.ok(!youthRent.visuals?.some((visual) => /Alquiler de vivienda completa/.test(visual.title)), 'An approximated graphic must not present exact regional values');
const security = answerPlanForBroadDomains('No se puede salir a la calle de cómo está la seguridad');
assert.doesNotMatch(security.shareableReply, /extranj|nacionaliz|wokismo/i);
assert.ok(!security.evidenceSummary.families.some((family) => family.criterionId === 'group-causality'));
const health = answerPlanForBroadDomains('Las listas de espera sanitarias son muy largas');
assert.doesNotMatch(health.shareableReply, /peor que nunca/i);
assert.ok(!health.evidenceSummary.families.some((family) => family.criterionId === 'health-historical-claim'));
console.log('Claim focus validated: 33 paraphrases, negative neighbours, survey bases, scope rejection, denominator and source boundaries, missing values and preview replacement.');
