import assert from 'node:assert/strict';
import { build } from 'esbuild';

const compiled = await build({ entryPoints: ['functions/api/check.ts'], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const api = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].contents).toString('base64')}`);
const pending = [];
const emptyDatabase = {
  prepare() {
    return { bind() { return this; }, async all() { return { results: [] }; }, async run() { return {}; } };
  },
};
const primaryCareRows = [
  {
    id: 'primary-care-wave1-rate', kind: 'observation', dataset_id: 'Barómetro Sanitario 2026, primera oleada', metric: 'Espera superior a un día por falta de cita en atención primaria', metric_id: 'primary_care_wait_over_one_day_rate', value: 71.16324068042688, unit: '%', period: '2026-O1', geography: 'España', population: 'personas adultas que consultaron por un problema propio con medicina de familia pública en los últimos 12 meses, excluida mutualidad con atención privada', dimensions_json: JSON.stringify({ service: 'primary_care', surveyYear: '2026', surveyWave: '1', provisional: true, question: '5c', sampleSize: 2061 }), dimension_labels_json: '{}', url: null, excerpt: null, payload_json: JSON.stringify({ denominator: 'pacientes de la base de la pregunta 5c', dataKind: 'observed' }), source_id: 'sanidad-primary-care-wave1', publisher: 'Ministerio de Sanidad', title: 'Barómetro Sanitario 2026, primera oleada', source_url: 'https://www.sanidad.gob.es/estadEstudios/estadisticas/BarometroSanitario/Barom_Sanit_2026/BS_2026_CIS_1_OLA_3551.xlsx', published_at: null, retrieved_at: '2026-10-30T12:00:00.000Z', trust_tier: 'primary', aliases_json: '[]', source_registry_id: 'sanidad', schedule: 'monthly',
  },
  {
    id: 'primary-care-wave1-delay', kind: 'observation', dataset_id: 'Barómetro Sanitario 2026, primera oleada', metric: 'Demora media declarada entre quienes esperaron más de un día por falta de cita', metric_id: 'primary_care_wait_days', value: 10.27, unit: 'días', period: '2026-O1', geography: 'España', population: 'personas adultas que consultaron por un problema propio con medicina de familia pública en los últimos 12 meses, excluida mutualidad con atención privada; solo quienes esperaron más de un día por falta de cita', dimensions_json: JSON.stringify({ service: 'primary_care', surveyYear: '2026', surveyWave: '1', provisional: true, question: '5c_01', eligibleSampleSize: 1467, validResponseSampleSize: 1448 }), dimension_labels_json: '{}', url: null, excerpt: null, payload_json: JSON.stringify({ denominator: 'personas de la pregunta 5c_01 con respuesta válida en días', dataKind: 'observed' }), source_id: 'sanidad-primary-care-wave1', publisher: 'Ministerio de Sanidad', title: 'Barómetro Sanitario 2026, primera oleada', source_url: 'https://www.sanidad.gob.es/estadEstudios/estadisticas/BarometroSanitario/Barom_Sanit_2026/BS_2026_CIS_1_OLA_3551.xlsx', published_at: null, retrieved_at: '2026-10-30T12:00:00.000Z', trust_tier: 'primary', aliases_json: '[]', source_registry_id: 'sanidad', schedule: 'monthly',
  },
];
const stalePrimaryCareDatabase = {
  prepare() {
    let metricId;
    return {
      bind(value) { metricId = value; return this; },
      async all() { return { results: primaryCareRows.filter((row) => row.metric_id === metricId) }; },
      async run() { return {}; },
    };
  },
};
const brokenDatabase = {
  prepare() {
    return { bind() { return this; }, async all() { throw new Error('D1 read failed'); }, async run() { throw new Error('D1 write failed'); } };
  },
};
let snapshotRequestNumber = 0;
const context = (text, DB) => ({
  request: new Request('https://site.test/api/check?fresh=1', {
    method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': `snapshot-validation-${++snapshotRequestNumber}` }, body: JSON.stringify({ text, inputType: 'text' }),
  }),
  env: { DB },
  waitUntil: (promise) => pending.push(promise),
});
const check = async (text, DB = emptyDatabase) => {
  const response = await api.onRequestPost(context(text, DB));
  return { httpStatus: response.status, body: await response.json() };
};

const fullTime = await check('Trabajar a jornada completa no impide estar en riesgo de pobreza');
assert.equal(fullTime.httpStatus, 200);
assert.equal(fullTime.body.state, 'limited');
assert.equal(fullTime.body.result.evidenceSummary.mode, 'snapshot');
assert.equal(fullTime.body.result.arguments[0].verdict, 'supported');
assert.match(fullTime.body.result.reply, /9,5 %.*2025/);
assert.ok(fullTime.body.result.sources.some((source) => source.id === 'eurostat-in-work-poverty-full-time-2026-11'));

const comparison = await check('La tasa de riesgo de pobreza es más alta en jornada parcial que en jornada completa');
assert.equal(comparison.body.state, 'limited');
assert.equal(comparison.body.result.evidenceSummary.mode, 'snapshot');
assert.equal(comparison.body.result.arguments[0].verdict, 'supported');
assert.match(comparison.body.result.reply, /9,1 puntos porcentuales más en jornada parcial/);
assert.ok(comparison.body.result.sources.some((source) => source.id === 'eurostat-in-work-poverty-part-time-2026-11'));
assert.ok(comparison.body.result.sources.some((source) => source.id === 'eurostat-in-work-poverty-full-time-2026-11'));

const partTimeAboveThreshold = await check('En 2025 el riesgo de pobreza entre las personas ocupadas a jornada parcial superó el 15 %');
assert.equal(partTimeAboveThreshold.body.state, 'limited');
assert.equal(partTimeAboveThreshold.body.result.answerScope.family, 'working-poverty');
assert.equal(partTimeAboveThreshold.body.result.arguments[0].verdict, 'supported');
assert.match(partTimeAboveThreshold.body.result.reply, /18,6 %.*2025/);
assert.match(partTimeAboveThreshold.body.result.reply, /supera el umbral de 15 %; respalda esa parte/);
assert.ok(partTimeAboveThreshold.body.result.sources.some((source) => source.id === 'eurostat-in-work-poverty-part-time-2026-11'));

const partTimeBelowThreshold = await check('En 2025 el riesgo de pobreza entre las personas ocupadas a jornada parcial no llegó al 15 %');
assert.equal(partTimeBelowThreshold.body.state, 'limited');
assert.equal(partTimeBelowThreshold.body.result.arguments[0].verdict, 'contradicted');
assert.match(partTimeBelowThreshold.body.result.reply, /La fuente contradice la afirmación/);
assert.match(partTimeBelowThreshold.body.result.reply, /18,6 %.*2025/);
assert.match(partTimeBelowThreshold.body.result.reply, /supera el umbral de 15 %; contradice esa parte/);
assert.ok(partTimeBelowThreshold.body.result.sources.some((source) => source.id === 'eurostat-in-work-poverty-part-time-2026-11'));

const headcount = await check('¿Cada vez hay más personas ocupadas en riesgo de pobreza?');
assert.equal(headcount.body.state, 'insufficient');
assert.equal(headcount.body.result.arguments[0].verdict, 'insufficient');
assert.deepEqual(headcount.body.result.arguments[0].evidenceIds, []);
assert.match(headcount.body.result.reply, /mide un porcentaje, no el número de personas/);

const ageSpecific = await check('La tasa de riesgo de pobreza de trabajadores de 25 a 34 años a jornada parcial es alta');
assert.equal(ageSpecific.body.state, 'insufficient');
assert.equal(ageSpecific.body.result.arguments[0].evidenceIds.length, 0);
assert.doesNotMatch(ageSpecific.body.result.reply, /18,6 %/);

const graduateOutcome = await check('Un título universitario ya no garantiza encontrar un empleo cualificado');
assert.equal(graduateOutcome.httpStatus, 200);
assert.equal(graduateOutcome.body.state, 'limited');
assert.equal(graduateOutcome.body.result.evidenceSummary.mode, 'snapshot');
assert.match(graduateOutcome.body.result.reply, /83,2 %.*2025/);
assert.match(graduateOutcome.body.result.reply, /34 %.*2025/);
assert.match(graduateOutcome.body.result.reply, /definición de este dato difiere/);
assert.match(graduateOutcome.body.result.reply, /no garantizan el resultado de cada persona/);
assert.doesNotMatch(graduateOutcome.body.result.reply, /no compara dos periodos/);
assert.ok(graduateOutcome.body.result.sources.some((source) => source.id === 'eurostat-tertiary-employment'));
assert.ok(graduateOutcome.body.result.sources.some((source) => source.id === 'eurostat-tertiary-overqualification'));
assert.ok(graduateOutcome.body.result.reply.trim().split(/\s+/).length <= 160);

const youthOverqualification = await check('Los jóvenes con estudios superiores están sobrecualificados en sus empleos');
assert.equal(youthOverqualification.body.state, 'limited');
assert.match(youthOverqualification.body.result.reply, /34,4 %.*20 a 34 años/);
assert.match(youthOverqualification.body.result.reply, /denominador son solo las personas ocupadas de ese grupo/);
assert.match(youthOverqualification.body.result.reply, /no equivale a recién graduados/);
assert.ok(youthOverqualification.body.result.sources.some((source) => source.id === 'eurostat-tertiary-overqualification'));
assert.doesNotMatch(youthOverqualification.body.result.reply, /34 % de las personas ocupadas de 20 a 64 años/);

const educationNeighbour = await check('La FP tiene más salidas laborales que la universidad');
assert.equal(educationNeighbour.body.state, 'insufficient');
assert.doesNotMatch(JSON.stringify(educationNeighbour.body.result?.sources || []), /eurostat-tertiary-/);
assert.match(educationNeighbour.body.result.reply, /no compara por s[ií] sola los grupos que menciona/);
assert.doesNotMatch(educationNeighbour.body.result.reply, /83,2 %|34 %/);

const fpTiming = await check('La Formación Profesional permite entrar antes al mercado laboral que muchas carreras');
assert.equal(fpTiming.body.state, 'insufficient');
assert.match(fpTiming.body.result.reply, /no indica cu[aá]nto tardan las personas tituladas en encontrar su primer trabajo/);
assert.doesNotMatch(fpTiming.body.result.reply, /83,2 %|34,4 %/);
assert.deepEqual(fpTiming.body.result.sources, []);

const degreeRequirementTrend = await check('Cada vez se exige un máster para trabajos que antes pedían solo una carrera');
assert.equal(degreeRequirementTrend.body.state, 'insufficient');
assert.match(degreeRequirementTrend.body.result.reply, /no muestran qu[eé] titulaci[oó]n piden las ofertas/);
assert.match(degreeRequirementTrend.body.result.evidenceSummary.missingDimensions.join(' '), /anuncios de las mismas ocupaciones en periodos comparables/);
assert.deepEqual(degreeRequirementTrend.body.result.sources, []);

for (const paraphrase of [
  '¿Cuántas viviendas nuevas se terminaron en España en 2025?',
  '¿Cuál fue el recuento de viviendas terminadas en España durante 2025?',
  'En 2025 se acabaron 92.000 viviendas nuevas en España',
  '¿Cuántas viviendas nuevas se concluyeron en España en 2025?',
]) {
  const housingCompletion = await check(paraphrase);
  assert.equal(housingCompletion.body.state, 'limited', paraphrase);
  assert.equal(housingCompletion.body.result.answerScope.family, 'housing-completions', paraphrase);
  assert.equal(housingCompletion.body.result.arguments[0].verdict, 'supported', paraphrase);
  assert.match(housingCompletion.body.result.reply, /92\.000.*2025/, paraphrase);
  assert.doesNotMatch(housingCompletion.body.result.reply, /^La evidencia no basta para confirmar toda la afirmaci[oó]n/, paraphrase);
  assert.ok(housingCompletion.body.result.sources.some((source) => source.id === 'bde-housing-supply-2025'), paraphrase);
  assert.ok(housingCompletion.body.result.reply.trim().split(/\s+/).length <= 160, paraphrase);
}

for (const paraphrase of [
  'La falta de vivienda nueva explica buena parte de la subida del alquiler',
  'La escasez de nuevas viviendas presiona los alquileres porque la oferta no sigue el crecimiento de los hogares',
]) {
  const housingPressure = await check(paraphrase);
  assert.equal(housingPressure.body.state, 'insufficient', paraphrase);
  assert.equal(housingPressure.body.result.answerScope.family, 'housing-construction-pressure', paraphrase);
  assert.equal(housingPressure.body.result.evidenceSummary.mode, 'snapshot', paraphrase);
  assert.match(housingPressure.body.result.reply, /240\.000 hogares netos nuevos.*92\.000 viviendas nuevas terminadas/, paraphrase);
  assert.match(housingPressure.body.result.reply, /750\.000 viviendas.*3,7 % del stock de hogares de 2025/, paraphrase);
  assert.match(housingPressure.body.result.reply, /no demuestra|no cuantifica/, paraphrase);
  assert.ok(housingPressure.body.result.sources.some((source) => source.id === 'bde-housing-supply-2025'), paraphrase);
  assert.ok(housingPressure.body.result.reply.trim().split(/\s+/).length <= 160, paraphrase);
}

const housingCompletionWrongYear = await check('¿Cuántas viviendas nuevas se terminaron en España en 2024?');
assert.equal(housingCompletionWrongYear.body.state, 'insufficient');
assert.deepEqual(housingCompletionWrongYear.body.result.sources, []);
assert.doesNotMatch(housingCompletionWrongYear.body.result.reply, /92\.000|750\.000/);

const housingCompletionWrongTerritory = await check('¿Cuántas viviendas nuevas se terminaron en Madrid en 2025?');
assert.equal(housingCompletionWrongTerritory.body.state, 'insufficient');
assert.deepEqual(housingCompletionWrongTerritory.body.result.sources, []);
assert.doesNotMatch(housingCompletionWrongTerritory.body.result.reply, /92\.000|750\.000/);

const housingPressureWrongTerritory = await check('La falta de vivienda nueva en Madrid explica la subida del alquiler');
assert.equal(housingPressureWrongTerritory.body.state, 'insufficient');
assert.deepEqual(housingPressureWrongTerritory.body.result.sources, []);
assert.doesNotMatch(housingPressureWrongTerritory.body.result.reply, /240\.000|92\.000|750\.000/);

const housingPressureWrongPeriod = await check('La falta de vivienda nueva explica la subida del alquiler entre 2022 y 2024');
assert.equal(housingPressureWrongPeriod.body.state, 'insufficient');
assert.deepEqual(housingPressureWrongPeriod.body.result.sources, []);
assert.doesNotMatch(housingPressureWrongPeriod.body.result.reply, /240\.000|92\.000|750\.000/);

const rentPriceNeighbour = await check('El precio del alquiler subió en España durante 2025');
assert.notEqual(rentPriceNeighbour.body.result?.answerScope?.family, 'housing-construction-pressure');
assert.doesNotMatch(JSON.stringify(rentPriceNeighbour.body.result?.sources || []), /bde-housing-supply-2025/);
assert.doesNotMatch(rentPriceNeighbour.body.result?.reply || '', /240\.000|92\.000|750\.000/);

const touristHousingNeighbour = await check('Los pisos turísticos reducen la oferta de alquiler residencial');
assert.notEqual(touristHousingNeighbour.body.result?.answerScope?.family, 'housing-construction-pressure');
assert.doesNotMatch(JSON.stringify(touristHousingNeighbour.body.result?.sources || []), /bde-housing-supply-2025/);

const primaryCareWait = await check('Hay que esperar demasiado para conseguir cita con el médico de familia');
assert.equal(primaryCareWait.httpStatus, 200);
assert.equal(primaryCareWait.body.state, 'limited');
assert.equal(primaryCareWait.body.result.evidenceSummary.mode, 'snapshot');
assert.match(primaryCareWait.body.result.reply, /72 %/);
assert.match(primaryCareWait.body.result.reply, /9,71 días/);
assert.match(primaryCareWait.body.result.reply, /2026.*oleada 2/);
assert.match(primaryCareWait.body.result.reply, /provisionales/);
assert.match(primaryCareWait.body.result.reply, /quienes esperaron más de un día/);
assert.match(primaryCareWait.body.result.reply, /no define un umbral universal/);
assert.ok(primaryCareWait.body.result.sources.some((source) => source.id === 'sanidad-primary-care-2026-wave2'));
assert.ok(primaryCareWait.body.result.reply.trim().split(/\s+/).length <= 150);

const primaryCareDaysAbove = await check('La demora media para conseguir cita con el médico de familia superó los 7 días en la segunda oleada de 2026');
assert.equal(primaryCareDaysAbove.body.state, 'limited');
assert.deepEqual(primaryCareDaysAbove.body.result.answerScope.directMetrics, ['primary_care_wait_days']);
assert.equal(primaryCareDaysAbove.body.result.arguments[0].verdict, 'supported');
assert.match(primaryCareDaysAbove.body.result.reply, /9,71 días/);
assert.match(primaryCareDaysAbove.body.result.reply, /supera el umbral de 7 días; respalda esa parte/);
assert.doesNotMatch(primaryCareDaysAbove.body.result.reply, /72 %/);

const primaryCareDaysBelow = await check('La demora media para conseguir cita con el médico de familia no llegó a los 7 días en la segunda oleada de 2026');
assert.equal(primaryCareDaysBelow.body.state, 'limited');
assert.equal(primaryCareDaysBelow.body.result.arguments[0].verdict, 'contradicted');
assert.match(primaryCareDaysBelow.body.result.reply, /La fuente contradice la afirmación/);
assert.match(primaryCareDaysBelow.body.result.reply, /9,71 días/);
assert.match(primaryCareDaysBelow.body.result.reply, /supera el umbral de 7 días; contradice esa parte/);

const primaryCareRateAbove = await check('Más del 70 % de pacientes de atención primaria esperó más de un día por falta de cita en la segunda oleada de 2026');
assert.equal(primaryCareRateAbove.body.result.arguments[0].verdict, 'supported');
assert.deepEqual(primaryCareRateAbove.body.result.answerScope.directMetrics, ['primary_care_wait_over_one_day_rate']);
assert.match(primaryCareRateAbove.body.result.reply, /72 %/);
assert.match(primaryCareRateAbove.body.result.reply, /supera el umbral de 70 %; respalda esa parte/);
assert.doesNotMatch(primaryCareRateAbove.body.result.reply, /9,71 días/);

const primaryCareRateNumericDayParaphrase = await check('Más del 70 % de pacientes de atención primaria esperó más de 1 día por falta de cita en la segunda oleada de 2026');
assert.equal(primaryCareRateNumericDayParaphrase.body.result.arguments[0].verdict, 'supported');
assert.deepEqual(primaryCareRateNumericDayParaphrase.body.result.answerScope.directMetrics, ['primary_care_wait_over_one_day_rate']);
assert.match(primaryCareRateNumericDayParaphrase.body.result.reply, /72 %/);
assert.match(primaryCareRateNumericDayParaphrase.body.result.reply, /supera el umbral de 70 %; respalda esa parte/);
assert.doesNotMatch(primaryCareRateNumericDayParaphrase.body.result.reply, /9,71 días/);

const primaryCareRateWrongDayThreshold = await check('Más del 70 % de pacientes de atención primaria esperó más de 10 días por falta de cita en la segunda oleada de 2026');
assert.equal(primaryCareRateWrongDayThreshold.body.result.arguments[0].verdict, 'insufficient');
assert.doesNotMatch(primaryCareRateWrongDayThreshold.body.result.reply, /supera el umbral de 70 %/);

const stalePrimaryCare = await check('Hay que esperar demasiado para conseguir cita con el médico de familia', stalePrimaryCareDatabase);
assert.equal(stalePrimaryCare.body.state, 'limited');
assert.match(stalePrimaryCare.body.result.reply, /72 %/);
assert.match(stalePrimaryCare.body.result.reply, /9,71 días/);
assert.doesNotMatch(stalePrimaryCare.body.result.reply, /10,27|71,2 %/);
assert.ok(stalePrimaryCare.body.result.sources.some((source) => source.id === 'sanidad-primary-care-2026-wave2'));
assert.ok(!stalePrimaryCare.body.result.sources.some((source) => source.id === 'sanidad-primary-care-wave1'));

for (const paraphrase of [
  'La cita con el médico de cabecera llega con mucha demora',
  '¿Cuánto se espera para ver al médico de familia?',
  '¿Cuántos días tarda una cita en atención primaria?',
]) {
  const answer = await check(paraphrase);
  assert.equal(answer.body.state, 'limited', paraphrase);
  assert.ok(answer.body.result.sources.some((source) => source.id === 'sanidad-primary-care-2026-wave2'), paraphrase);
  assert.match(answer.body.result.reply, /9,71 días/, paraphrase);
}

const localPrimaryCare = await check('En Madrid se espera demasiado para una cita con el médico de familia');
assert.equal(localPrimaryCare.body.state, 'insufficient');
assert.doesNotMatch(localPrimaryCare.body.result.reply, /72 %|9,71/);
assert.doesNotMatch(JSON.stringify(localPrimaryCare.body.result.sources), /sanidad-primary-care-2026-wave2/);

const specialistWait = await check('Las demoras para consultas externas de especialistas varían entre comunidades autónomas');
assert.doesNotMatch(JSON.stringify(specialistWait.body.result.sources), /sanidad-primary-care-2026-wave2/);
assert.doesNotMatch(specialistWait.body.result.reply, /9,71|72 %/);

const specialistNamedRegion = await check('La espera media de consultas externas fue mayor en Canarias que en Melilla en 2025');
assert.equal(specialistNamedRegion.body.state, 'limited');
assert.equal(specialistNamedRegion.body.result.answerScope.family, 'specialist-outpatient-regional-waits');
assert.equal(specialistNamedRegion.body.result.arguments[0].verdict, 'supported');
assert.match(specialistNamedRegion.body.result.reply, /162 días en Canarias y 16 días en Melilla/);
assert.match(specialistNamedRegion.body.result.reply, /31 de diciembre de 2025/);
assert.ok(specialistNamedRegion.body.result.sources.some((source) => source.id === 'sisle-sns-regional-consultations-dec-2025'));
assert.equal((specialistNamedRegion.body.result.reply.match(/A 31 de diciembre de 2025/g) || []).length, 1);

const specialistReversedRegion = await check('La espera media de consultas externas fue mayor en Melilla que en Canarias en 2025');
assert.equal(specialistReversedRegion.body.state, 'limited');
assert.equal(specialistReversedRegion.body.result.arguments[0].verdict, 'contradicted');
assert.match(specialistReversedRegion.body.result.reply, /La fuente contradice la afirmación/);
assert.match(specialistReversedRegion.body.result.reply, /16 días en Melilla y 162 días en Canarias/);
assert.equal((specialistReversedRegion.body.result.reply.match(/A 31 de diciembre de 2025/g) || []).length, 1);

for (const outOfScopeSpecialistWait of [
  'La espera media de consultas externas fue mayor en Canarias que en Melilla en 2024',
  'La espera media de consultas externas fue mayor en Canarias que en Lisboa en 2025',
  'La espera media de consultas externas fue mayor en Canarias que en Valencia en 2025',
  'La espera media de cirugía fue mayor en Canarias que en Melilla en 2025',
]) {
  const answer = await check(outOfScopeSpecialistWait);
  assert.doesNotMatch(JSON.stringify(answer.body.result.sources), /sisle-sns-regional-consultations-dec-2025/, outOfScopeSpecialistWait);
}

const primaryCareCause = await check('La demora del médico de familia obliga a la gente a ir a urgencias');
assert.equal(primaryCareCause.body.state, 'insufficient');
assert.equal(primaryCareCause.body.result.arguments[0].verdict, 'insufficient');
assert.deepEqual(primaryCareCause.body.result.arguments[0].evidenceIds, []);
assert.deepEqual(primaryCareCause.body.result.arguments[0].sourceIds, []);
assert.match(primaryCareCause.body.result.reply, /no mide si las esperas llevan a urgencias/);
assert.match(primaryCareCause.body.result.reply, /9,71 días/);
assert.match(primaryCareCause.body.result.reply, /1\.417 respuestas válidas de 1\.454 elegibles/);
assert.match(primaryCareCause.body.result.reply, /En España.*adultos.*medicina de familia pública.*12 meses previos/);
assert.ok(primaryCareCause.body.result.reply.trim().split(/\s+/).length <= 150);

const primaryCareTrend = await check('Cada vez se tarda más en conseguir cita con el médico de familia');
assert.equal(primaryCareTrend.body.state, 'insufficient');
assert.equal(primaryCareTrend.body.result.arguments[0].verdict, 'insufficient');
assert.deepEqual(primaryCareTrend.body.result.arguments[0].evidenceIds, []);
assert.match(primaryCareTrend.body.result.reply, /no establece una tendencia|oleadas comparables/);
assert.match(primaryCareTrend.body.result.reply, /9,71 días/);

const unavailable = await check('Trabajar a jornada completa no impide estar en riesgo de pobreza', brokenDatabase);
assert.equal(unavailable.body.state, 'unavailable');
assert.match(unavailable.body.message, /no hemos podido consultar las series estadísticas/i);
assert.doesNotMatch(unavailable.body.result?.reply || '', /9,5 %/);

const educationUnavailable = await check('Un título universitario ya no garantiza encontrar un empleo cualificado', brokenDatabase);
assert.equal(educationUnavailable.body.state, 'unavailable');
assert.doesNotMatch(educationUnavailable.body.result?.reply || '', /83,2 %|34 %/);

const primaryCareUnavailable = await check('¿Cuántos días tarda una cita en atención primaria?', brokenDatabase);
assert.equal(primaryCareUnavailable.body.state, 'unavailable');
assert.doesNotMatch(primaryCareUnavailable.body.result?.reply || '', /9,71|72 %/);

const graduatePay = await check('Tener un máster o un doctorado no garantiza cobrar un salario acorde con la cualificación');
assert.equal(graduatePay.body.state, 'insufficient');
assert.deepEqual(graduatePay.body.result.sources, []);
assert.match(graduatePay.body.result.reply, /promedios por nivel educativo o por ocupación/);
assert.match(graduatePay.body.result.reply, /no comparan salarios/);
assert.doesNotMatch(graduatePay.body.result.reply, /80,2 %|34 %|17 € por hora/);

const regionalPayHousing = await check('El coste de vivienda ha eliminado la ventaja salarial de trabajar en Madrid o Barcelona');
assert.equal(regionalPayHousing.body.state, 'insufficient');
assert.deepEqual(regionalPayHousing.body.result.sources, []);
assert.match(regionalPayHousing.body.result.reply, /promedios nacionales no permiten medir ese balance entre ciudades/);
assert.doesNotMatch(regionalPayHousing.body.result.reply, /17 € por hora|índice de precios de vivienda.*\d/);

const mortgageEntry = await check('La entrada de una hipoteca es una barrera mayor que la cuota mensual para acceder a una vivienda');
assert.equal(mortgageEntry.body.state, 'limited');
assert.equal(mortgageEntry.body.result.answerScope.family, 'mortgage-entry-vs-payment');
assert.equal(mortgageEntry.body.result.arguments[0].verdict, 'supported');
assert.match(mortgageEntry.body.result.reply, /alrededor del 86 %/i);
assert.match(mortgageEntry.body.result.reply, /alrededor del 35 %/i);
assert.match(mortgageEntry.body.result.reply, /2016–2023/);
assert.ok(mortgageEntry.body.result.sources.some((source) => source.id === 'bde-financial-capacity-housing-2026-spring'));

const mortgageQuotaReversed = await check('La cuota mensual es una barrera mayor que reunir la entrada para comprar una vivienda con hipoteca');
assert.equal(mortgageQuotaReversed.body.state, 'limited');
assert.equal(mortgageQuotaReversed.body.result.arguments[0].verdict, 'contradicted');
assert.ok(mortgageQuotaReversed.body.result.sources.some((source) => source.id === 'bde-financial-capacity-housing-2026-spring'));

const mortgageMadrid = await check('En Madrid la entrada de una hipoteca es una barrera mayor que la cuota mensual para comprar una vivienda');
assert.equal(mortgageMadrid.body.state, 'insufficient');
assert.deepEqual(mortgageMadrid.body.result.sources, []);
assert.doesNotMatch(mortgageMadrid.body.result.reply, /86 %|35 %/);

await Promise.all(pending);
console.log('Reviewed text snapshot Pages fallback passed: empty D1 uses scoped answers, unsupported comparisons exclude mismatched statistics, and failed D1 reads remain unavailable.');
