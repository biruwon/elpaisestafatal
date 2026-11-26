import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { LABOUR_PRODUCTIVITY_SNAPSHOT } from '../src/lib/knowledge/labour-productivity-snapshot.mjs';
import { HICP_BASKET_SNAPSHOT } from '../src/lib/knowledge/hicp-basket-snapshot.mjs';
import { EDUCATION_EARNINGS_SNAPSHOT } from '../src/lib/knowledge/education-earnings-snapshot.mjs';
import { TOURIST_HOUSING_SNAPSHOT } from '../src/lib/knowledge/tourist-housing-snapshot.mjs';
import { SECTORAL_VALUE_ADDED_SNAPSHOT } from '../src/lib/knowledge/sectoral-value-added-snapshot.mjs';

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
const gdpTotalRows = [
  ['2019', 1267926],
  ['2025', 1395075],
].map(([period, value]) => ({
  id: `gdp-real-total-${period}`, kind: 'observation', dataset_id: 'Annual real GDP Spain',
  metric: 'PIB real total anual', metric_id: 'gdp_real_annual', value, unit: 'million euro, chain-linked volumes (2020)',
  period, geography: 'España', population: 'resident producer units',
  dimensions_json: JSON.stringify({ freq: 'A', geo: 'ES', na_item: 'B1GQ', unit: 'CLV20_MEUR', time: period }),
  dimension_labels_json: '{}', url: null, excerpt: null,
  payload_json: JSON.stringify({ denominator: 'aggregate output', dataKind: 'observed', ...(period === '2025' ? { status: 'p' } : {}) }),
  source_id: 'eurostat-gdp-total-test', publisher: 'Eurostat', title: 'Annual real GDP Spain',
  source_url: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10_gdp?freq=A&geo=ES&na_item=B1GQ&unit=CLV20_MEUR',
  published_at: null, retrieved_at: '2026-11-23T12:00:00.000Z', trust_tier: 'primary', aliases_json: '[]', source_registry_id: 'eurostat', schedule: 'daily',
}));
const partialGdpDatabase = {
  prepare() {
    let metricId;
    return {
      bind(value) { metricId = value; return this; },
      async all() { return { results: gdpTotalRows.filter((row) => row.metric_id === metricId) }; },
      async run() { return {}; },
    };
  },
};
const partialProductivityRows = LABOUR_PRODUCTIVITY_SNAPSHOT.observations
  .filter((item) => item.metricId === 'real_labour_productivity_per_person')
  .map((item) => ({
    id: item.id, kind: 'observation', dataset_id: 'Annual labour productivity Spain', metric: item.metric,
    metric_id: item.metricId, value: item.value, unit: item.unit, period: item.period, geography: item.geography,
    population: item.denominator, dimensions_json: JSON.stringify(item.dimensions), dimension_labels_json: '{}',
    url: null, excerpt: null,
    payload_json: JSON.stringify({ denominator: item.denominator, dataKind: 'observed', ...(item.status ? { status: item.status } : {}) }),
    source_id: item.source.id, publisher: item.source.publisher, title: item.source.title, source_url: item.source.url,
    published_at: null, retrieved_at: item.source.retrievedAt, trust_tier: 'primary', aliases_json: '[]', source_registry_id: 'eurostat', schedule: 'daily',
  }));
const partialProductivityDatabase = {
  prepare() {
    let metricId;
    return {
      bind(value) { metricId = value; return this; },
      async all() { return { results: partialProductivityRows.filter((row) => row.metric_id === metricId) }; },
      async run() { return {}; },
    };
  },
};
const partialHicpBasketRows = HICP_BASKET_SNAPSHOT.observations
  .filter((item) => item.metricId === 'annual_hicp_food_index')
  .map((item) => ({
    id: item.id, kind: 'observation', dataset_id: 'Annual HICP basket Spain', metric: item.metric,
    metric_id: item.metricId, value: item.value, unit: item.unit, period: item.period, geography: item.geography,
    population: item.population, dimensions_json: JSON.stringify(item.dimensions), dimension_labels_json: '{}',
    url: null, excerpt: null,
    payload_json: JSON.stringify({ dataKind: 'observed', ...(item.status ? { status: item.status } : {}) }),
    source_id: item.source.id, publisher: item.source.publisher, title: item.source.title, source_url: item.source.url,
    published_at: null, retrieved_at: item.source.retrievedAt, trust_tier: 'primary', aliases_json: '[]', source_registry_id: 'eurostat', schedule: 'daily',
  }));
const partialHicpBasketDatabase = {
  prepare() {
    let metricId;
    return {
      bind(value) { metricId = value; return this; },
      async all() { return { results: partialHicpBasketRows.filter((row) => row.metric_id === metricId) }; },
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
const checkWithoutDatabase = async (text) => {
  const response = await api.onRequestPost(context(text, undefined));
  return { httpStatus: response.status, body: await response.json() };
};

const tourismEmploymentClaim = 'España depende demasiado del turismo para sostener el empleo';
const tourismEmployment = await check(tourismEmploymentClaim);
assert.equal(tourismEmployment.body.state, 'limited');
assert.equal(tourismEmployment.body.result.answerScope.family, 'tourism-employment-contribution');
assert.equal(tourismEmployment.body.result.arguments[0].verdict, 'insufficient', 'A measured employment share cannot determine whether dependence is excessive');
assert.match(tourismEmployment.body.result.reply, /En 2024.*12,3 %.*empleo total en España/s);
assert.match(tourismEmployment.body.result.reply, /2,78 millones de puestos/);
assert.match(tourismEmployment.body.result.reply, /estimaci[oó]n de avance/);
assert.ok(tourismEmployment.body.result.sources.some((source) => source.id === 'ine-tourism-employment-share-cste-2024'));
assert.ok(tourismEmployment.body.result.sources.some((source) => source.id === 'ine-tourism-characteristic-jobs-2024'));
const tourismEmploymentParaphrase = await check('¿Qué parte del empleo español corresponde a las actividades turísticas?');
assert.equal(tourismEmploymentParaphrase.body.state, 'limited');
assert.equal(tourismEmploymentParaphrase.body.result.answerScope.family, tourismEmployment.body.result.answerScope.family);
assert.deepEqual(tourismEmploymentParaphrase.body.result.sources.map((source) => source.id), tourismEmployment.body.result.sources.map((source) => source.id));
assert.match(tourismEmploymentParaphrase.body.result.reply, /12,3 %/);
const tourismEmploymentRegional = await check('El turismo genera más empleo en Andalucía que la agricultura');
assert.equal(tourismEmploymentRegional.body.state, 'insufficient');
assert.deepEqual(tourismEmploymentRegional.body.result.answerScope.directMetrics, []);
assert.deepEqual(tourismEmploymentRegional.body.result.answerScope.contextMetrics, []);
assert.deepEqual(tourismEmploymentRegional.body.result.sources, [], 'National figures must not settle a regional cross-sector comparison');
assert.doesNotMatch(tourismEmploymentRegional.body.result.reply, /12,3 %|2,78 millones/);
assert.match(tourismEmploymentRegional.body.result.reply, /recuentos comparables de empleo en turismo y agricultura/);
for (const claim of [
  'Reducir drásticamente el turismo destruiría empleo en regiones muy dependientes de él',
  'Si cae mucho el turismo, se perderían empleos en las regiones que dependen de él',
]) {
  const regionalTourismImpact = await check(claim);
  assert.equal(regionalTourismImpact.body.state, 'insufficient');
  assert.equal(regionalTourismImpact.body.result.answerScope.family, 'tourism-employment-contribution');
  assert.deepEqual(regionalTourismImpact.body.result.answerScope.directMetrics, []);
  assert.deepEqual(regionalTourismImpact.body.result.answerScope.contextMetrics, ['tourism_characteristic_employment_share', 'tourism_characteristic_employment_jobs']);
  assert.equal(regionalTourismImpact.body.result.arguments[0].verdict, 'insufficient');
  assert.match(regionalTourismImpact.body.result.reply, /2024.*12,3 %.*empleo total en Espa[nñ]a/s);
  assert.match(regionalTourismImpact.body.result.reply, /cuota incluida es nacional.*no est[aá] desglosada por regi[oó]n/);
  assert.match(regionalTourismImpact.body.result.reply, /no estima cu[aá]ntos puestos cambiar[ií]an si se redujera el turismo/);
  assert.doesNotMatch(regionalTourismImpact.body.result.reply, /no establece un umbral estad[ií]stico/);
  assert.deepEqual(regionalTourismImpact.body.result.sources.map((source) => source.id).sort(), ['ine-tourism-characteristic-jobs-2024', 'ine-tourism-employment-share-cste-2024']);
}
const pensionFinancing = await check('El trabajador no ahorra sus cotizaciones para su propia pensión sino que financia a los jubilados actuales');
assert.equal(pensionFinancing.body.state, 'limited');
assert.equal(pensionFinancing.body.result.answerScope.family, 'pension-financing');
assert.match(pensionFinancing.body.result.reply, /cotizaciones y otros ingresos corrientes financian las prestaciones actuales/);
assert.match(pensionFinancing.body.result.reply, /financiaci[oó]n de reparto, distinta de acumular capital en una cuenta individual/);
assert.match(pensionFinancing.body.result.reply, /no permite confirmar por s[ií] sola la sostenibilidad del sistema/i);
assert.deepEqual(pensionFinancing.body.result.sources.map((source) => source.id), ['social-security-pay-as-you-go']);

const pensionPrivateClaims = [
  'Ahorrar de forma privada será imprescindible aunque se siga cotizando al sistema público',
  'La pensión pública quizá no alcance para mantener el nivel de vida y habrá que ahorrar por cuenta propia',
];
let pensionPrivateSourceIds;
for (const claim of pensionPrivateClaims) {
  const response = await check(claim);
  assert.equal(response.body.state, 'insufficient', 'Legal and aggregate context cannot prove that everyone needs private pension saving');
  assert.equal(response.body.result.answerScope.family, 'pension-private-savings-requirement');
  assert.equal(response.body.result.arguments[0].verdict, 'insufficient');
  assert.deepEqual(response.body.result.answerScope.directMetrics, []);
  assert.deepEqual(response.body.result.answerScope.contextMetrics, []);
  const sourceIds = response.body.result.sources.map((source) => source.id);
  if (!pensionPrivateSourceIds) pensionPrivateSourceIds = sourceIds;
  else assert.deepEqual(sourceIds, pensionPrivateSourceIds, 'Equivalent wording must reuse the same legal and projection sources');
  assert.deepEqual(sourceIds, [
    'boe-social-security-contribution-obligation',
    'boe-private-pension-plans-voluntary',
    'airef-pension-replacement-rate-projection-2025',
  ]);
  assert.match(response.body.result.reply, /cotizar a la Seguridad Social es obligatorio/);
  assert.match(response.body.result.reply, /planes privados son voluntarios/);
  assert.match(response.body.result.reply, /72,4 % en 2027.*70 % desde 2050/s);
  assert.match(response.body.result.reply, /no demuestran que toda persona necesite ahorrar/);
}
for (const claim of [
  '¿Es obligatorio contratar un plan privado además de cotizar a la Seguridad Social?',
  '¿La ley obliga a sus cotizantes a contratar pensiones privadas?',
]) {
  const response = await check(claim);
  assert.equal(response.body.state, 'limited');
  assert.equal(response.body.result.answerScope.family, 'pension-private-savings-requirement');
  assert.equal(response.body.result.interpretation.kind, 'legal');
  assert.equal(response.body.result.arguments[0].verdict, 'mixed');
  assert.deepEqual(response.body.result.arguments[0].sourceIds, [
    'boe-social-security-contribution-obligation',
    'boe-private-pension-plans-voluntary',
  ]);
  assert.match(response.body.result.reply, /no obliga por s[ií] solo a contratar un plan privado/);
  assert.match(response.body.result.reply, /adhesi[oó]n autom[aá]tica.*excluirse por escrito/);
  assert.doesNotMatch(response.body.result.reply, /AIReF|72,4 %|70 %/);
}
const pensionPrivateFrance = await check('¿Es obligatorio contratar un plan privado de pensiones además de cotizar a la Seguridad Social en Francia?');
assert.equal(pensionPrivateFrance.body.state, 'insufficient');
assert.equal(pensionPrivateFrance.body.result.answerScope.family, 'pension-private-savings-requirement');
assert.deepEqual(pensionPrivateFrance.body.result.sources, [], 'Spanish pension sources must not leak into a France-scoped answer');
assert.doesNotMatch(pensionPrivateFrance.body.result.reply, /72,4 %|AIReF|Espa[nñ]a/);

const fixedDiscontinuousClaim = 'Los contratos fijos discontinuos esconden parte del desempleo estacional';
const fixedDiscontinuous = await check(fixedDiscontinuousClaim);
assert.equal(fixedDiscontinuous.body.state, 'insufficient');
assert.equal(fixedDiscontinuous.body.result.answerScope.family, 'fixed-discontinuous-employment-status');
assert.deepEqual(fixedDiscontinuous.body.result.answerScope.directMetrics, []);
assert.equal(fixedDiscontinuous.body.result.arguments[0].verdict, 'insufficient');
assert.match(fixedDiscontinuous.body.result.reply, /al menos una hora/);
assert.match(fixedDiscontinuous.body.result.reply, /busc[oó] activamente en las cuatro semanas anteriores/);
assert.match(fixedDiscontinuous.body.result.reply, /inactividad productiva entre campa[nñ]as/);
assert.match(fixedDiscontinuous.body.result.reply, /no permiten confirmar que la EPA oculte parte del paro/);
assert.deepEqual(fixedDiscontinuous.body.result.sources.map((source) => source.id), [
  'boe-statute-fixed-discontinuous-2026',
  'ine-epa-employment-status-faq',
  'eurostat-eu-lfs-seasonal-worker-status',
  'sepe-fixed-discontinuous-benefit-inactivity',
]);
const fixedDiscontinuousParaphrase = await check('El paro estacional permanece oculto entre los trabajadores fijos discontinuos');
assert.equal(fixedDiscontinuousParaphrase.body.state, fixedDiscontinuous.body.state);
assert.equal(fixedDiscontinuousParaphrase.body.result.answerScope.family, fixedDiscontinuous.body.result.answerScope.family);
assert.deepEqual(fixedDiscontinuousParaphrase.body.result.sources.map((source) => source.id), fixedDiscontinuous.body.result.sources.map((source) => source.id));
assert.match(fixedDiscontinuousParaphrase.body.result.reply, /microdatos EPA por semana/);

const priceWageConvergenceClaim = 'El coste de vida español se ha acercado al de países más ricos sin que los salarios hayan convergido igual';
const priceWageConvergence = await check(priceWageConvergenceClaim);
assert.equal(priceWageConvergence.body.state, 'insufficient');
assert.equal(priceWageConvergence.body.result.answerScope.family, 'price-wage-european-convergence');
assert.deepEqual(priceWageConvergence.body.result.answerScope.directMetrics, []);
assert.equal(priceWageConvergence.body.result.arguments[0].verdict, 'insufficient');
assert.match(priceWageConvergence.body.result.reply, /99,7 en 2010 y 93,8 en 2022/);
assert.match(priceWageConvergence.body.result.reply, /Espa[nñ]a 11,02 €, UE-27 14,91 €/);
assert.match(priceWageConvergence.body.result.reply, /79,6 % en 2010 a 73,9 % en 2022/);
assert.match(priceWageConvergence.body.result.reply, /no mide de forma fiable la evoluci[oó]n de los precios/);
assert.deepEqual(priceWageConvergence.body.result.sources.map((source) => source.id), [
  'eurostat-household-price-levels-eu-2026-11-24',
  'eurostat-median-hourly-earnings-spain-eu-2026-11-24',
  'eurostat-ppp-price-level-time-comparison-methodology-2026-11-24',
]);
const priceWageConvergenceParaphrase = await check('Los precios en España ya se parecen a los de Europa, pero los sueldos siguen sin alcanzar a los europeos');
assert.equal(priceWageConvergenceParaphrase.body.state, priceWageConvergence.body.state);
assert.equal(priceWageConvergenceParaphrase.body.result.answerScope.family, priceWageConvergence.body.result.answerScope.family);
assert.deepEqual(priceWageConvergenceParaphrase.body.result.sources.map((source) => source.id), priceWageConvergence.body.result.sources.map((source) => source.id));
assert.match(priceWageConvergenceParaphrase.body.result.reply, /no representa a todos los pa[ií]ses m[aá]s ricos/);

const reportedWorkedHoursQueries = [
  'En hostelería se declaran menos horas de las que realmente se trabajan',
  'Los empleados de hostelería trabajan más horas de las que constan oficialmente',
  'En hostelería, las jornadas oficiales omiten parte de las horas efectivamente trabajadas',
];
let reportedWorkedHoursSourceIds;
for (const query of reportedWorkedHoursQueries) {
  const result = await check(query);
  assert.equal(result.httpStatus, 200);
  assert.equal(result.body.state, 'insufficient', 'Reported overtime context cannot settle unrecorded working hours');
  assert.equal(result.body.result.answerScope.family, 'reported-vs-worked-hours');
  assert.deepEqual(result.body.result.answerScope.directMetrics, []);
  assert.deepEqual(result.body.result.arguments[0].verdict, 'insufficient');
  assert.match(result.body.result.reply, /27\.700 personas/);
  assert.match(result.body.result.reply, /30,8 % de quienes hicieron horas extra/);
  assert.match(result.body.result.reply, /no coteja lo declarado con el registro horario o el contrato/);
  assert.match(result.body.result.reply, /no confirma que se trabajen m[aá]s horas de las registradas/);
  const sourceIds = result.body.result.sources.map((source) => source.id);
  assert.deepEqual(sourceIds, ['ine-epa-unpaid-overtime-2026', 'ine-epa-questionnaire-2021']);
  if (reportedWorkedHoursSourceIds) assert.deepEqual(sourceIds, reportedWorkedHoursSourceIds, `Unreported-hours paraphrase changed source selection: ${query}`);
  reportedWorkedHoursSourceIds = sourceIds;
}
const contractHoursGap = await check('La jornada laboral real supera la jornada que figura en contrato');
assert.equal(contractHoursGap.body.state, 'insufficient');
assert.equal(contractHoursGap.body.result.answerScope.family, 'reported-vs-worked-hours');
assert.deepEqual(contractHoursGap.body.result.sources, [], 'Hospitality context must not be attached without that sector');
assert.match(contractHoursGap.body.result.reply, /horas efectivamente trabajadas y registradas para las mismas personas/);
assert.match(contractHoursGap.body.result.reply, /horas extra no pagadas separadas de horas que no se registraron/);
const unpaidOvertimeNeighbour = await check('Las horas extra sin pagar son habituales en hostelería');
assert.equal(unpaidOvertimeNeighbour.body.result.answerScope.family, 'unpaid-overtime');
const tourismEmploymentNeighbour = await check('Las ramas características del turismo concentran demasiados puestos de trabajo');
assert.equal(tourismEmploymentNeighbour.body.result.answerScope.family, 'tourism-employment-contribution');
const migrantTourismClaim = 'El modelo de turismo y hostelería necesita inmigración porque muchos puestos no se cubren con las condiciones ofrecidas';
const migrantTourism = await check(migrantTourismClaim);
assert.equal(migrantTourism.body.state, 'limited');
assert.equal(migrantTourism.body.result.answerScope.family, 'foreign-affiliation-in-tourism-and-agriculture');
assert.deepEqual(migrantTourism.body.result.answerScope.directMetrics, []);
assert.deepEqual(migrantTourism.body.result.answerScope.contextMetrics, ['foreign_affiliate_share_hospitality_rg']);
assert.equal(migrantTourism.body.result.arguments[0].verdict, 'insufficient');
assert.match(migrantTourism.body.result.reply, /octubre de 2026.*33,5 %/s);
assert.match(migrantTourism.body.result.reply, /Régimen General/);
assert.match(migrantTourism.body.result.reply, /no prueban dependencia ni explican vacantes sin cubrir/);
assert.doesNotMatch(migrantTourism.body.result.reply, /42,7 %|29,1 %/, 'A hospitality claim must not inherit the agricultural percentages');
assert.ok(migrantTourism.body.result.sources.some((source) => source.id === 'tgss-foreign-affiliates-sector-shares-2026-10'));
const migrantTourismParaphrase = await check('En los hoteles hay vacantes por las condiciones de trabajo y se recurre a personal extranjero');
assert.equal(migrantTourismParaphrase.body.result.answerScope.family, migrantTourism.body.result.answerScope.family);
assert.deepEqual(migrantTourismParaphrase.body.result.sources.map((source) => source.id), migrantTourism.body.result.sources.map((source) => source.id));
assert.match(migrantTourismParaphrase.body.result.reply, /33,5 %/);
const migrantAgricultureClaim = await check('La agricultura española depende en gran medida de mano de obra inmigrante estacional');
assert.equal(migrantAgricultureClaim.body.state, 'limited');
assert.deepEqual(migrantAgricultureClaim.body.result.answerScope.contextMetrics, ['foreign_affiliate_share_agriculture_rg', 'foreign_affiliate_share_agricultural_special_system']);
assert.match(migrantAgricultureClaim.body.result.reply, /Agricultura \(Régimen General\): 29,1 %.*Sistema Especial de Trabajadores Agrarios: 42,7 %/s);
assert.match(migrantAgricultureClaim.body.result.reply, /denominadores distintos/);
assert.match(migrantAgricultureClaim.body.result.reply, /no miden estacionalidad/);
const exactMigrantAffiliateShare = await check('¿Qué porcentaje de afiliados del Régimen General en hostelería tiene nacionalidad extranjera?');
assert.equal(exactMigrantAffiliateShare.body.result.arguments[0].verdict, 'supported');
assert.deepEqual(exactMigrantAffiliateShare.body.result.answerScope.directMetrics, ['foreign_affiliate_share_hospitality_rg']);
assert.match(exactMigrantAffiliateShare.body.result.reply, /33,5 %/);
assert.doesNotMatch(exactMigrantAffiliateShare.body.result.reply, /29,1 %|42,7 %/);
const exactAgriculturalGeneralAffiliateShare = await check('¿Qué porcentaje de afiliados del Régimen General en agricultura tiene nacionalidad extranjera?');
assert.equal(exactAgriculturalGeneralAffiliateShare.body.result.arguments[0].verdict, 'supported');
assert.deepEqual(exactAgriculturalGeneralAffiliateShare.body.result.answerScope.directMetrics, ['foreign_affiliate_share_agriculture_rg']);
assert.match(exactAgriculturalGeneralAffiliateShare.body.result.reply, /29,1 %/);
assert.doesNotMatch(exactAgriculturalGeneralAffiliateShare.body.result.reply, /33,5 %|42,7 %/);
const exactAgriculturalSpecialAffiliateShare = await check('¿Qué porcentaje de afiliados extranjeros hay en el Sistema Especial de Trabajadores Agrarios?');
assert.equal(exactAgriculturalSpecialAffiliateShare.body.result.arguments[0].verdict, 'supported');
assert.deepEqual(exactAgriculturalSpecialAffiliateShare.body.result.answerScope.directMetrics, ['foreign_affiliate_share_agricultural_special_system']);
assert.match(exactAgriculturalSpecialAffiliateShare.body.result.reply, /42,7 %/);
assert.doesNotMatch(exactAgriculturalSpecialAffiliateShare.body.result.reply, /33,5 %|29,1 %/);
const migrantTourismRegional = await check('En Andalucía, la hostelería depende de trabajadores extranjeros por las vacantes sin cubrir');
assert.equal(migrantTourismRegional.body.result.answerScope.family, 'foreign-affiliation-in-tourism-and-agriculture');
assert.deepEqual(migrantTourismRegional.body.result.sources, [], 'National affiliation shares must not answer a regional claim');
assert.doesNotMatch(migrantTourismRegional.body.result.reply, /33,5 %/);
const ruralMedicalAccess = await check('Los pacientes rurales tienen menos acceso a médicos y especialistas que quienes viven en ciudades');
assert.equal(ruralMedicalAccess.body.state, 'insufficient');
assert.equal(ruralMedicalAccess.body.result.answerScope.family, 'rural-urban-service-access');
assert.deepEqual(ruralMedicalAccess.body.result.sources, []);
assert.match(ruralMedicalAccess.body.result.reply, /disponibilidad de médicos y especialistas o tiempo de acceso, comparados por población rural y urbana/);
assert.doesNotMatch(ruralMedicalAccess.body.result.reply, /alquiler o compra e ingresos locales/);

const futureRetirementQueries = [
  'Trabajar hasta cerca de los setenta años será normal para quienes hoy son jóvenes',
  'La edad efectiva de jubilación seguirá subiendo para las generaciones jóvenes',
];
let futureRetirementSourceIds;
for (const query of futureRetirementQueries) {
  const result = await check(query);
  assert.equal(result.httpStatus, 200);
  assert.equal(result.body.state, 'insufficient', 'National averages cannot establish retirement age for a future youth cohort');
  assert.equal(result.body.result.answerScope.family, 'future-retirement-age');
  assert.deepEqual(result.body.result.answerScope.directMetrics, []);
  assert.deepEqual(result.body.result.answerScope.contextMetrics, []);
  assert.equal(result.body.result.arguments[0].verdict, 'insufficient');
  assert.match(result.body.result.reply, /65,4 años.*64,4 en 2019/);
  assert.match(result.body.result.reply, /AIReF proyecta una edad media efectiva de 66,2 años en 2035/);
  assert.match(result.body.result.reply, /no predicen la edad de la juventud actual|no identifica la edad a la que se jubilarán las generaciones jóvenes/);
  assert.ok(result.body.result.reply.trim().split(/\s+/).length <= 160);
  const sourceIds = result.body.result.sources.map((source) => source.id);
  assert.deepEqual(sourceIds, ['boe-social-security-retirement-age', 'social-security-retirement-age-rules-2026', 'social-security-effective-retirement-age-2026', 'airef-effective-retirement-age-projection-2025']);
  if (futureRetirementSourceIds) assert.deepEqual(sourceIds, futureRetirementSourceIds, `Retirement-age paraphrase changed sources: ${query}`);
  futureRetirementSourceIds = sourceIds;
}
const statutoryAge2027 = await check('La edad ordinaria de jubilación será de 67 años desde 2027');
assert.equal(statutoryAge2027.body.state, 'limited');
assert.equal(statutoryAge2027.body.result.answerScope.family, 'statutory-retirement-age');
assert.equal(statutoryAge2027.body.result.arguments[0].verdict, 'mixed');
assert.deepEqual(statutoryAge2027.body.result.sources.map((source) => source.id), ['boe-social-security-retirement-age', 'social-security-retirement-age-rules-2026']);
assert.match(statutoryAge2027.body.result.reply, /67 años con menos de 38 años y 6 meses.*65 años con 38 años y 6 meses o más/);
assert.match(statutoryAge2027.body.result.reply, /no significa que todas las personas trabajen hasta esa edad/i);
const statutoryAge2026 = await check('¿Cuál es la edad legal de jubilación en 2026?');
assert.equal(statutoryAge2026.body.result.answerScope.family, 'statutory-retirement-age');
assert.match(statutoryAge2026.body.result.reply, /66 años y 10 meses.*38 años y 3 meses cotizados/);
assert.doesNotMatch(statutoryAge2026.body.result.reply, /Desde 2027/);
const statutoryAgeFrance = await check('La edad legal de jubilación en Francia cambia desde 2027');
assert.deepEqual(statutoryAgeFrance.body.result.sources, [], 'A Spain-specific legal schedule must not answer a French claim');
assert.doesNotMatch(statutoryAgeFrance.body.result.reply, /66 años y 10 meses|67 años con menos/);

const educationPayQueries = [
  'Los sueldos de muchos trabajos cualificados son demasiado parecidos a los de puestos que exigen mucha menos formación',
  'Tener un máster o un doctorado no garantiza un salario acorde con la cualificación',
];
let educationPaySourceIds;
for (const query of educationPayQueries) {
  const result = await check(query);
  assert.equal(result.httpStatus, 200);
  assert.equal(result.body.state, 'insufficient');
  assert.equal(result.body.result.answerScope.family, 'education-pay-comparison');
  assert.deepEqual(result.body.result.answerScope.directMetrics, []);
  assert.deepEqual(result.body.result.answerScope.contextMetrics, ['mean_hourly_earnings_by_education']);
  assert.equal(result.body.result.evidenceSummary.mode, 'snapshot');
  assert.match(result.body.result.reply, /10,04 €\/hora.*11,48 €\/hora.*17,71 €\/hora/s);
  assert.match(result.body.result.reply, /estudios alcanzados.*no los exigidos por el puesto/);
  assert.match(result.body.result.reply, /empresas con al menos 10 empleados/);
  assert.match(result.body.result.reply, /cualificaciones exigidas comparables por ocupaci[oó]n, jornada, experiencia, sector, territorio y periodo/);
  assert.equal(result.body.result.arguments[0].verdict, 'insufficient');
  const sourceIds = result.body.result.sources.map((source) => source.id);
  assert.deepEqual(sourceIds, ['eurostat-spain-ses-2022-education']);
  if (educationPaySourceIds) assert.deepEqual(sourceIds, educationPaySourceIds, `Education-pay paraphrase changed source selection: ${query}`);
  educationPaySourceIds = sourceIds;
}

const educationRows = EDUCATION_EARNINGS_SNAPSHOT.observations.map((item) => ({
  id: item.id, kind: 'observation', dataset_id: item.source.title, metric: item.metric,
  metric_id: item.metricId, value: item.value, unit: item.unit, period: item.period,
  geography: item.geography, population: item.population, dimensions_json: JSON.stringify(item.dimensions),
  dimension_labels_json: '{}', url: null, excerpt: null,
  payload_json: JSON.stringify({ dataKind: 'observed' }), source_id: item.source.id,
  publisher: item.source.publisher, title: item.source.title, source_url: item.source.url,
  published_at: null, retrieved_at: item.source.retrievedAt, trust_tier: 'primary', aliases_json: '[]',
}));
const partialEducationDatabase = {
  prepare() {
    let metricId;
    return {
      bind(value) { metricId = value; return this; },
      async all() { return { results: educationRows.filter((row) => row.metric_id === metricId).slice(0, 1) }; },
      async run() { return {}; },
    };
  },
};
const partialEducationPay = await check(educationPayQueries[0], partialEducationDatabase);
assert.equal(partialEducationPay.body.state, 'insufficient');
assert.deepEqual(partialEducationPay.body.result.sources, [], 'A partial D1 series must not be completed with the full reviewed snapshot');
assert.doesNotMatch(partialEducationPay.body.result.reply, /10,04|11,48|17,71/);
const unavailableEducationPay = await check(educationPayQueries[0], brokenDatabase);
assert.equal(unavailableEducationPay.body.state, 'unavailable', 'A D1 failure must remain distinguishable from an empty read');
assert.doesNotMatch(unavailableEducationPay.body.result?.reply || '', /10,04|11,48|17,71/);

const touristHousingQueries = [
  'Los pisos turísticos están retirando demasiada vivienda del alquiler residencial',
  'El alquiler turístico es solo una parte del problema y la escasez estructural de oferta pesa más',
];
let touristHousingSourceIds;
for (const query of touristHousingQueries) {
  const result = await check(query);
  assert.equal(result.body.state, 'insufficient');
  assert.equal(result.body.result.answerScope.family, 'tourist-housing-supply');
  assert.deepEqual(result.body.result.answerScope.directMetrics, []);
  assert.deepEqual(result.body.result.answerScope.contextMetrics, ['tourist_housing_count', 'tourist_housing_share']);
  assert.equal(result.body.result.evidenceSummary.mode, 'snapshot');
  assert.match(result.body.result.reply, /mayo de 2026.*341\.001 viviendas.*1,28 % del parque total/s);
  assert.match(result.body.result.reply, /no mide viviendas que dejaron el alquiler residencial/i);
  assert.match(result.body.result.reply, /Censo.*2021/);
  assert.equal(result.body.result.arguments[0].verdict, 'insufficient');
  const sourceIds = result.body.result.sources.map((source) => source.id);
  assert.deepEqual(sourceIds, ['ine-tourist-count', 'ine-tourist-share']);
  if (touristHousingSourceIds) assert.deepEqual(sourceIds, touristHousingSourceIds, `Tourist-housing paraphrase changed source selection: ${query}`);
  touristHousingSourceIds = sourceIds;
}

const touristHousingRows = TOURIST_HOUSING_SNAPSHOT.observations.map((item) => ({
  id: item.id, kind: 'observation', dataset_id: item.source.title, metric: item.metric,
  metric_id: item.metricId, value: item.value, unit: item.unit, period: item.period,
  geography: item.geography, population: item.population, dimensions_json: JSON.stringify(item.dimensions),
  dimension_labels_json: '{}', url: null, excerpt: null,
  payload_json: JSON.stringify({ dataKind: 'observed' }), source_id: item.source.id,
  publisher: item.source.publisher, title: item.source.title, source_url: item.source.url,
  published_at: null, retrieved_at: item.source.retrievedAt, trust_tier: 'primary', aliases_json: '[]',
}));
const partialTouristHousingDatabase = {
  prepare() {
    let metricId;
    return {
      bind(value) { metricId = value; return this; },
      async all() { return { results: metricId === 'tourist_housing_count' ? touristHousingRows.filter((row) => row.metric_id === metricId) : [] }; },
      async run() { return {}; },
    };
  },
};
const partialTouristHousing = await check(touristHousingQueries[0], partialTouristHousingDatabase);
assert.equal(partialTouristHousing.body.state, 'insufficient');
assert.doesNotMatch(partialTouristHousing.body.result.reply, /1,28 %/, 'A partial D1 result must not be completed with the full snapshot');
assert.deepEqual(partialTouristHousing.body.result.sources.map((source) => source.id), ['ine-tourist-count']);
const touristRegistration = await check('¿Cuántas viviendas turísticas con licencia hay en España?');
assert.equal(touristRegistration.body.state, 'insufficient');
assert.equal(touristRegistration.body.result.answerScope.family, 'tourist-housing-registration');
assert.deepEqual(touristRegistration.body.result.answerScope.directMetrics, []);
assert.deepEqual(touristRegistration.body.result.answerScope.contextMetrics, ['tourist_housing_count']);
assert.match(touristRegistration.body.result.reply, /341\.001 viviendas.*mayo de 2026/s);
assert.match(touristRegistration.body.result.reply, /no es un registro de licencias/);
assert.deepEqual(touristRegistration.body.result.sources.map((source) => source.id), ['ine-tourist-count']);
const touristHousingNeighbourhood = await check('Las viviendas turísticas han reducido la oferta para residentes en los barrios más céntricos');
assert.equal(touristHousingNeighbourhood.body.state, 'insufficient');
assert.deepEqual(touristHousingNeighbourhood.body.result.sources, [], 'National estimates must not answer a neighborhood-level claim');
assert.doesNotMatch(touristHousingNeighbourhood.body.result.reply, /341\.001|1,28 %/);
const unavailableTouristHousing = await check(touristHousingQueries[0], brokenDatabase);
assert.equal(unavailableTouristHousing.body.state, 'unavailable');
assert.doesNotMatch(unavailableTouristHousing.body.result?.reply || '', /341\.001|1,28 %/);

const renewableGridClaim = 'Los cuellos de botella de la red eléctrica impiden aprovechar toda la generación renovable disponible';
const renewableGrid = await check(renewableGridClaim);
assert.equal(renewableGrid.body.state, 'insufficient');
assert.equal(renewableGrid.body.result.answerScope.family, 'renewable-grid-integration');
assert.deepEqual(renewableGrid.body.result.answerScope.directMetrics, []);
assert.match(renewableGrid.body.result.reply, /154 GW.*reducci[oó]n significativa de los vertidos/s);
assert.match(renewableGrid.body.result.reply, /no una medici[oó]n de los MWh que hoy no se integran por l[ií]mites de red/);
assert.equal(renewableGrid.body.result.shareableReply?.split(/\n{2,}/).length, 2);
assert.deepEqual(renewableGrid.body.result.sources.map((source) => source.id), ['miteco-electricity-plan-2030']);
const renewableGridRegion = await check('Los cuellos de botella de la red eléctrica impiden aprovechar toda la generación renovable disponible en Andalucía');
assert.equal(renewableGridRegion.body.state, 'insufficient');
assert.deepEqual(renewableGridRegion.body.result.sources, [], 'A national plan cannot answer a claim about regional renewable bottlenecks');
assert.doesNotMatch(renewableGridRegion.body.result.reply, /154 GW/);

const gridInvestmentClaim = 'La inversión en redes eléctricas va por detrás del crecimiento de renovables y nueva demanda';
const gridInvestment = await check(gridInvestmentClaim);
assert.equal(gridInvestment.body.state, 'insufficient');
assert.equal(gridInvestment.body.result.answerScope.family, 'electricity-grid-investment-gap');
assert.deepEqual(gridInvestment.body.result.answerScope.directMetrics, []);
assert.match(gridInvestment.body.result.reply, /límites anuales vigentes de inversión.*insuficientes/s);
assert.match(gridInvestment.body.result.reply, /17\.142 millones de euros.*47 GW.*importes planificados, no gasto ya ejecutado/s);
assert.equal(gridInvestment.body.result.shareableReply?.split(/\n{2,}/).length, 2);
assert.match(gridInvestment.body.result.limitations?.join(' '), /no compara el gasto ejecutado con el crecimiento efectivo/);
assert.deepEqual(gridInvestment.body.result.sources.map((source) => source.id), ['miteco-electricity-investment-limits-2026', 'miteco-electricity-plan-2030']);

const selfConsumptionDelayClaim = 'Los trámites para autoconsumo y conexión frenan instalaciones solares que serían rentables';
const selfConsumptionDelay = await check(selfConsumptionDelayClaim);
assert.equal(selfConsumptionDelay.body.state, 'insufficient');
assert.equal(selfConsumptionDelay.body.result.answerScope.family, 'self-consumption-connection-delays');
assert.deepEqual(selfConsumptionDelay.body.result.answerScope.directMetrics, []);
assert.match(selfConsumptionDelay.body.result.reply, /est[aá]n exentas de permisos de acceso y conexi[oó]n.*15 kW/s);
assert.match(selfConsumptionDelay.body.result.reply, /no mide cu[aá]nto tardan los tr[aá]mites ni cu[aá]ntos proyectos rentables se frenan/);
assert.equal(selfConsumptionDelay.body.result.shareableReply?.split(/\n{2,}/).length, 2);
assert.deepEqual(selfConsumptionDelay.body.result.sources.map((source) => source.id), ['miteco-autoconsumo-access-connection']);
const selfConsumptionDelayRegion = await check('Los trámites de autoconsumo retrasan las instalaciones solares rentables en Andalucía');
assert.equal(selfConsumptionDelayRegion.body.state, 'insufficient');
assert.deepEqual(selfConsumptionDelayRegion.body.result.sources, [], 'National regulation must not be presented as regional evidence about delays');
assert.doesNotMatch(selfConsumptionDelayRegion.body.result.reply, /15 kW/);

const urbanPlanningDelayClaim = 'Se construye demasiado poco por la lentitud de las licencias urbanísticas';
const urbanPlanningDelay = await check(urbanPlanningDelayClaim);
assert.equal(urbanPlanningDelay.body.state, 'insufficient');
assert.equal(urbanPlanningDelay.body.result.answerScope.family, 'urban-planning-license-delays');
assert.deepEqual(urbanPlanningDelay.body.result.answerScope.directMetrics, []);
assert.match(urbanPlanningDelay.body.result.reply, /licencias de obra mayor concedidas.*duraci[oó]n prevista.*no el plazo de tramitaci[oó]n/s);
assert.match(urbanPlanningDelay.body.result.reply, /no mide cu[aá]ntos d[ií]as tard[oó] cada expediente/);
assert.equal(urbanPlanningDelay.body.result.shareableReply?.split(/\n{2,}/).length, 2);
assert.deepEqual(urbanPlanningDelay.body.result.sources.map((source) => source.id), ['ine-building-permits-methodology']);
const urbanPlanningDelayRegion = await check('Las licencias urbanísticas retrasan la construcción de obra pública en Andalucía');
assert.equal(urbanPlanningDelayRegion.body.state, 'insufficient');
assert.deepEqual(urbanPlanningDelayRegion.body.result.sources, [], 'National permit methodology must not be presented as regional evidence about delays');
assert.doesNotMatch(urbanPlanningDelayRegion.body.result.reply, /licencias de obra mayor concedidas/);

const selfEmploymentCostClaim = 'La cuota y los costes fijos hacen inviable ser autónomo con ingresos bajos o irregulares';
const selfEmploymentCost = await check(selfEmploymentCostClaim);
assert.equal(selfEmploymentCost.body.state, 'insufficient');
assert.equal(selfEmploymentCost.body.result.answerScope.family, 'self-employment-cost-viability');
assert.deepEqual(selfEmploymentCost.body.result.answerScope.directMetrics, []);
assert.match(selfEmploymentCost.body.result.reply, /hasta 670 €.*653,59 € a 718,94 €.*205,88 € al mes/s);
assert.match(selfEmploymentCost.body.result.reply, /antes de reducciones o bonificaciones/);
assert.match(selfEmploymentCost.body.result.reply, /no permite confirmar que iniciar una actividad est[eé] penalizado/);
assert.equal(selfEmploymentCost.body.result.shareableReply?.split(/\n{2,}/).length, 2);
assert.deepEqual(selfEmploymentCost.body.result.sources.map((source) => source.id), ['boe-reta-contributions-2026']);

for (const claim of [
  'El sistema fiscal castiga empezar una actividad antes de que el negocio tenga ingresos estables',
  'Iniciar un negocio antes de tener ingresos estables sale caro por las cuotas e impuestos',
]) {
  const startupCosts = await check(claim);
  assert.equal(startupCosts.body.state, 'insufficient');
  assert.equal(startupCosts.body.result.answerScope.family, 'self-employment-cost-viability');
  assert.deepEqual(startupCosts.body.result.answerScope.directMetrics, []);
  assert.match(startupCosts.body.result.reply, /653,59 €.*205,88 € al mes/s);
  assert.match(startupCosts.body.result.reply, /solo la cotizaci[oó]n a la Seguridad Social del RETA; no suma todos los impuestos/);
  assert.match(startupCosts.body.result.reply, /no permite confirmar que iniciar una actividad est[eé] penalizado/);
  assert.equal(startupCosts.body.result.shareableReply?.split(/\n{2,}/).length, 2);
  assert.deepEqual(startupCosts.body.result.sources.map((source) => source.id), ['boe-reta-contributions-2026']);
}

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

const gdpComparison = await check('España puede crecer en PIB total mientras el nivel de vida por persona mejora mucho menos');
assert.equal(gdpComparison.httpStatus, 200);
assert.equal(gdpComparison.body.state, 'limited');
assert.equal(gdpComparison.body.result.answerScope.family, 'gdp-total-per-capita');
assert.equal(gdpComparison.body.result.evidenceSummary.mode, 'snapshot');
assert.equal(gdpComparison.body.result.arguments[0].verdict, 'mixed');
assert.match(gdpComparison.body.result.reply, /10,0 %.*4,9 %.*5,1 puntos porcentuales/s);
assert.ok(gdpComparison.body.result.sources.some((source) => source.id === 'eurostat-annual-real-gdp-spain-2026-11-23'));
assert.ok(gdpComparison.body.result.sources.some((source) => source.id === 'eurostat-annual-real-gdp-per-capita-spain-2026-11-23'));

const gdpPartial = await check('España puede crecer en PIB total mientras el nivel de vida por persona mejora mucho menos', partialGdpDatabase);
assert.equal(gdpPartial.body.state, 'insufficient', 'A single successful GDP series must not be completed with a reviewed snapshot');
assert.deepEqual(gdpPartial.body.result.arguments[0].evidenceIds, []);
assert.doesNotMatch(gdpPartial.body.result.reply, /10,0 %|4,9 %/);

const productivity = await check('El crecimiento basado en más población puede ocultar una productividad estancada');
assert.equal(productivity.httpStatus, 200);
assert.equal(productivity.body.state, 'limited');
assert.equal(productivity.body.result.answerScope.family, 'labour-productivity-and-growth');
assert.equal(productivity.body.result.evidenceSummary.mode, 'snapshot');
assert.equal(productivity.body.result.arguments[0].verdict, 'mixed');
assert.match(productivity.body.result.reply, /bajó aproximadamente un 0,8 %.*subió aproximadamente un 2,0 %.*10,0 %.*4,9 %.*4,8 %/s);
assert.match(productivity.body.result.reply, /la población media/);
assert.ok(productivity.body.result.sources.some((source) => source.id === 'eurostat-real-labour-productivity-per-person-spain-2026-11-23'));
assert.ok(productivity.body.result.sources.some((source) => source.id === 'eurostat-real-labour-productivity-per-hour-spain-2026-11-23'));

const productivityPartial = await check('El crecimiento basado en más población puede ocultar una productividad estancada', partialProductivityDatabase);
assert.equal(productivityPartial.body.state, 'insufficient', 'A single live productivity denominator must not be completed with reviewed GDP or snapshot values');
assert.deepEqual(productivityPartial.body.result.arguments[0].evidenceIds, []);
assert.doesNotMatch(productivityPartial.body.result.reply, /0,8 %|2,0 %|10,0 %|4,9 %/);

const employmentProductivityClaim = 'El crecimiento económico español depende demasiado del aumento de empleo y poco de la productividad';
const employmentProductivity = await check(employmentProductivityClaim);
assert.equal(employmentProductivity.httpStatus, 200);
assert.equal(employmentProductivity.body.state, 'limited');
assert.equal(employmentProductivity.body.result.answerScope.family, 'labour-productivity-and-growth');
assert.equal(employmentProductivity.body.result.evidenceSummary.mode, 'snapshot');
assert.equal(employmentProductivity.body.result.arguments[0].verdict, 'mixed');
assert.match(employmentProductivity.body.result.reply, /46,0 %.*2,5 puntos porcentuales/s);
assert.match(employmentProductivity.body.result.reply, /no cuantifican cuánto del crecimiento del PIB corresponde a más empleo frente a mejoras de productividad/);
assert.ok(employmentProductivity.body.result.sources.some((source) => source.id === 'eurostat-employment-persons-per-capita-spain-2026-11-23'));

const employmentProductivityPartial = await check(employmentProductivityClaim, partialProductivityDatabase);
assert.equal(employmentProductivityPartial.body.state, 'insufficient', 'Partial live productivity data must not be completed with reviewed employment/GDP snapshot values');
assert.deepEqual(employmentProductivityPartial.body.result.arguments[0].evidenceIds, []);
assert.doesNotMatch(employmentProductivityPartial.body.result.reply, /0,8 %|2,0 %|10,0 %|4,9 %|46,0 %|2,5 puntos porcentuales/);

const basketClaim = 'El IPC general no refleja bien lo que notan los hogares que gastan mucho en comida y alquiler';
const basketSnapshot = await check(basketClaim);
assert.equal(basketSnapshot.httpStatus, 200);
assert.equal(basketSnapshot.body.state, 'limited');
assert.equal(basketSnapshot.body.result.answerScope.family, 'household-inflation-basket');
assert.equal(basketSnapshot.body.result.evidenceSummary.mode, 'snapshot');
assert.match(basketSnapshot.body.result.reply, /21,9 %.*34,7 %.*8,9 %/s);
assert.ok(basketSnapshot.body.result.sources.some((source) => source.id === 'eurostat-hicp-methodology-2026-11-23'));

const basketPartial = await check(basketClaim, partialHicpBasketDatabase);
assert.equal(basketPartial.body.state, 'limited', 'A partial live basket can fall back to one complete reviewed revision');
assert.equal(basketPartial.body.result.evidenceSummary.mode, 'snapshot', 'Partial D1 data must not be mixed with the reviewed snapshot');
assert.match(basketPartial.body.result.reply, /21,9 %.*34,7 %.*8,9 %/s);
assert.ok(basketPartial.body.result.sources.some((source) => source.id === 'eurostat-annual-hicp-spain-2026-11-23'));
assert.ok(basketPartial.body.result.sources.some((source) => source.id === 'eurostat-annual-hicp-actual-rents-spain-2026-11-23'));

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
assert.match(graduateOutcome.body.result.reply, /Eurostat \(España, 2025\): el 83,2 %/);
assert.match(graduateOutcome.body.result.reply, /medida de sobrecualificación, entre las personas ocupadas de ese grupo, el 34 %/);
assert.match(graduateOutcome.body.result.reply, /diferencia de definición; compara años con cautela/);
assert.match(graduateOutcome.body.result.reply, /no garantizan el resultado individual ni demuestran un cambio temporal/);
assert.doesNotMatch(graduateOutcome.body.result.reply, /no compara dos periodos/);
assert.ok(graduateOutcome.body.result.sources.some((source) => source.id === 'eurostat-tertiary-employment'));
assert.ok(graduateOutcome.body.result.sources.some((source) => source.id === 'eurostat-tertiary-overqualification'));
assert.ok(graduateOutcome.body.result.reply.trim().split(/\s+/).length <= 160);

const youthOverqualification = await check('Los jóvenes con estudios superiores están sobrecualificados en sus empleos');
assert.equal(youthOverqualification.body.state, 'limited');
assert.match(youthOverqualification.body.result.reply, /34,4 %.*20 a 34 años/);
assert.match(youthOverqualification.body.result.reply, /34,4 % de las personas ocupadas de 20 a 34 años con educación terciaria/);
assert.match(youthOverqualification.body.result.reply, /no equivale a recién graduados/);
assert.ok(youthOverqualification.body.result.sources.some((source) => source.id === 'eurostat-tertiary-overqualification'));
assert.doesNotMatch(youthOverqualification.body.result.reply, /34 % de las personas ocupadas de 20 a 64 años/);

const educationNeighbour = await check('La FP tiene más salidas laborales que la universidad');
assert.equal(educationNeighbour.body.state, 'insufficient');
assert.doesNotMatch(JSON.stringify(educationNeighbour.body.result?.sources || []), /eurostat-tertiary-/);
assert.match(educationNeighbour.body.result.reply, /tasas de empleo de los grupos de titulaciones comparados, con edad, tiempo desde la titulaci[oó]n, territorio y periodo compatibles/);
assert.doesNotMatch(educationNeighbour.body.result.reply, /83,2 %|34 %/);

const fpTiming = await check('La Formación Profesional permite entrar antes al mercado laboral que muchas carreras');
assert.equal(fpTiming.body.state, 'insufficient');
assert.match(fpTiming.body.result.reply, /tiempo desde terminar FP o universidad hasta el primer empleo, por cohorte, territorio y periodo comparables/);
assert.doesNotMatch(fpTiming.body.result.reply, /83,2 %|34,4 %/);
assert.deepEqual(fpTiming.body.result.sources, []);

const degreeRequirementTrend = await check('Cada vez se exige un máster para trabajos que antes pedían solo una carrera');
assert.equal(degreeRequirementTrend.body.state, 'insufficient');
assert.match(degreeRequirementTrend.body.result.reply, /anuncios de las mismas ocupaciones en periodos comparables, contando qu[eé] proporci[oó]n exige un m[aá]ster/);
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

const psychologistCapacity = await check('La salud mental pública tiene demasiados pocos psicólogos clínicos para la demanda existente');
assert.equal(psychologistCapacity.body.state, 'insufficient');
assert.equal(psychologistCapacity.body.result.answerScope.family, 'public-mental-health-psychologist-capacity');
assert.equal(psychologistCapacity.body.result.arguments[0].verdict, 'insufficient');
assert.deepEqual(psychologistCapacity.body.result.sources.map((source) => source.id), ['ministry-sns-psychology-primary-care-2023']);
assert.match(psychologistCapacity.body.result.reply, /548 profesionales.*con datos de 2023/s);
assert.match(psychologistCapacity.body.result.reply, /no desglosa cuántos son especialistas en Psicología Clínica ni equivalentes a jornada completa/);
assert.match(psychologistCapacity.body.result.reply, /Tampoco mide solicitudes, pacientes en espera o demanda no atendida/);
assert.match(psychologistCapacity.body.result.reply, /no permite concluir si la plantilla es suficiente o insuficiente/);

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
assert.deepEqual(graduatePay.body.result.answerScope.contextMetrics, ['mean_hourly_earnings_by_education']);
assert.match(graduatePay.body.result.reply, /10,04 €\/hora.*11,48 €\/hora.*17,71 €\/hora/s);
assert.match(graduatePay.body.result.reply, /cualificaciones exigidas comparables por ocupaci[oó]n, jornada, experiencia, sector, territorio y periodo/);
assert.match(graduatePay.body.result.reply, /no una distribuci[oó]n salarial/);
assert.ok(graduatePay.body.result.sources.some((source) => source.id === 'eurostat-spain-ses-2022-education'));
assert.doesNotMatch(graduatePay.body.result.reply, /80,2 %|34 %/);

const doctorEmigration = await check('España forma médicos que luego se marchan a otros países por mejores condiciones');
assert.equal(doctorEmigration.body.state, 'insufficient');
assert.deepEqual(doctorEmigration.body.result.sources.map((source) => source.id), [
  'ine-emcr-2024-professional-emigration', 'ine-emcr-methodology-faq',
]);
assert.match(doctorEmigration.body.result.reply, /2023.*18,3\s*%/s);
assert.match(doctorEmigration.body.result.reply, /no es una cifra de médicos formados en España/i);
assert.match(doctorEmigration.body.result.reply, /no identifica dónde se formó cada persona.*por qué emigró/s);
assert.doesNotMatch(doctorEmigration.body.result.reply, /confirma que.*médicos.*emigraran por/);

const regionalPayHousing = await check('El coste de vivienda ha eliminado la ventaja salarial de trabajar en Madrid o Barcelona');
assert.equal(regionalPayHousing.body.state, 'insufficient');
assert.deepEqual(regionalPayHousing.body.result.sources.map((source) => source.id), ['bank-spain-housing-mobility-annual-2025']);
assert.match(regionalPayHousing.body.result.reply, /2014–2024/);
assert.match(regionalPayHousing.body.result.reply, /1 %.*0,6 %/s);
assert.match(regionalPayHousing.body.result.reply, /frente a destinos alternativos/);
assert.match(regionalPayHousing.body.result.reply, /tampoco demuestra que el alquiler causara esas mudanzas/i);
assert.match(regionalPayHousing.body.result.reply, /no permite atribuir ese efecto a la ciudad o provincia mencionada/);
assert.ok(regionalPayHousing.body.result.reply.trim().split(/\s+/).length <= 150);
assert.doesNotMatch(regionalPayHousing.body.result.reply, /17 € por hora|índice de precios de vivienda.*\d/);

const mortgageEntry = await check('La entrada de una hipoteca es una barrera mayor que la cuota mensual para acceder a una vivienda');
assert.equal(mortgageEntry.body.state, 'limited');
assert.equal(mortgageEntry.body.result.answerScope.family, 'mortgage-entry-vs-payment');
assert.equal(mortgageEntry.body.result.arguments[0].verdict, 'supported');
assert.match(mortgageEntry.body.result.reply, /alrededor del 86 %/i);
assert.match(mortgageEntry.body.result.reply, /35 %/i);
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

const waiterCount = await check('¿Cuántas vacantes estimó Eurostat para camareros y bármanes en España en 2024?');
assert.equal(waiterCount.body.state, 'limited');
assert.equal(waiterCount.body.result.answerScope.family, 'waiter-vacancy-and-conditions');
assert.deepEqual(waiterCount.body.result.answerScope.directMetrics, ['experimental_job_vacancies_waiters']);
assert.equal(waiterCount.body.result.arguments[0].verdict, 'supported');
assert.match(waiterCount.body.result.reply, /5,12 mil puestos vacantes.*estimaci[oó]n experimental/s);
assert.match(waiterCount.body.result.reply, /ruptura de serie/);
assert.ok(waiterCount.body.result.sources.some((source) => source.id === 'eurostat-experimental-waiter-vacancies-2024'));
const waiterCountNoDatabase = await checkWithoutDatabase('¿Cuántas vacantes estimó Eurostat para camareros y bármanes en España en 2024?');
assert.equal(waiterCountNoDatabase.body.state, 'limited', 'The reviewed text snapshot should remain usable without a D1 binding');
assert.match(waiterCountNoDatabase.body.result.reply, /5,12 mil puestos vacantes/);

const valueAddedClaim = 'España depende demasiado de empleos de poco valor añadido';
const valueAddedNoDatabase = await checkWithoutDatabase(valueAddedClaim);
assert.equal(valueAddedNoDatabase.body.state, 'limited');
assert.equal(valueAddedNoDatabase.body.result.answerScope.family, 'employment-value-added-by-activity');
assert.equal(valueAddedNoDatabase.body.result.arguments[0].verdict, 'insufficient', 'A relative sector average cannot establish that the employment mix is excessive');
assert.match(valueAddedNoDatabase.body.result.reply, /83,0 %.*2025/s);
assert.match(valueAddedNoDatabase.body.result.reply, /Eurostat marca como provisionales los datos de 2025/);
assert.match(valueAddedNoDatabase.body.result.reply, /no mide cada puesto, salarios ni calidad del empleo/);
assert.deepEqual(valueAddedNoDatabase.body.result.sources.map((source) => source.id), SECTORAL_VALUE_ADDED_SNAPSHOT.observations
  .filter((item) => item.period === '2025').map((item) => item.source.id).filter((id, index, ids) => ids.indexOf(id) === index));
const valueAddedEmptyD1 = await check(valueAddedClaim);
assert.equal(valueAddedEmptyD1.body.result.answerScope.family, valueAddedNoDatabase.body.result.answerScope.family);
assert.deepEqual(valueAddedEmptyD1.body.result.sources.map((source) => source.id), valueAddedNoDatabase.body.result.sources.map((source) => source.id));
const valueAddedParaphrase = await check('España se apoya excesivamente en puestos con poco valor agregado');
assert.equal(valueAddedParaphrase.body.result.answerScope.family, valueAddedNoDatabase.body.result.answerScope.family);
assert.deepEqual(valueAddedParaphrase.body.result.sources.map((source) => source.id), valueAddedNoDatabase.body.result.sources.map((source) => source.id));
assert.match(valueAddedParaphrase.body.result.reply, /83,0 %/);
const valueAddedUnavailable = await check(valueAddedClaim, brokenDatabase);
assert.equal(valueAddedUnavailable.body.state, 'unavailable', 'A failed D1 read must remain distinct from a successful empty read');
assert.doesNotMatch(valueAddedUnavailable.body.result?.reply || '', /83,0 %|34,5 €/);

const tertiaryEmploymentClaim = '¿Cuál fue la tasa de empleo en España de las personas de 20 a 64 años con educación terciaria en 2025?';
const tertiaryEmploymentNoDatabase = await checkWithoutDatabase(tertiaryEmploymentClaim);
assert.ok(['limited', 'supported'].includes(tertiaryEmploymentNoDatabase.body.state), 'A current reviewed snapshot should answer without a D1 binding');
assert.equal(tertiaryEmploymentNoDatabase.body.result.answerScope.family, 'education-employment-outcomes');
assert.ok(tertiaryEmploymentNoDatabase.body.result.sources.some((source) => source.id === 'eurostat-tertiary-employment'));
assert.match(tertiaryEmploymentNoDatabase.body.result.reply, /83,2 %/);
assert.match(tertiaryEmploymentNoDatabase.body.result.keyFact, /83,2 %/);
assert.match(tertiaryEmploymentNoDatabase.body.result.reply, /personas residentes de 20 a 64 años/);
const tertiaryEmploymentParaphrase = await checkWithoutDatabase('¿Qué porcentaje de personas residentes de 20 a 64 años con estudios superiores tenía empleo en España en 2025?');
assert.equal(tertiaryEmploymentParaphrase.body.state, tertiaryEmploymentNoDatabase.body.state);
assert.equal(tertiaryEmploymentParaphrase.body.result.answerScope.family, tertiaryEmploymentNoDatabase.body.result.answerScope.family);
assert.deepEqual(tertiaryEmploymentParaphrase.body.result.sources.map((source) => source.id), tertiaryEmploymentNoDatabase.body.result.sources.map((source) => source.id));
assert.match(tertiaryEmploymentParaphrase.body.result.reply, /83,2 %/);

const touristHousingClaim = 'Los pisos turísticos están retirando demasiada vivienda del alquiler residencial';
const touristHousingNoDatabase = await checkWithoutDatabase(touristHousingClaim);
assert.equal(touristHousingNoDatabase.body.state, 'insufficient', 'Contextual snapshots must not decide the unsupported causal claim');
assert.equal(touristHousingNoDatabase.body.result.answerScope.family, 'tourist-housing-supply');
assert.deepEqual(touristHousingNoDatabase.body.result.sources.map((source) => source.id), ['ine-tourist-count', 'ine-tourist-share']);
assert.match(touristHousingNoDatabase.body.result.reply, /no mide viviendas que dejaron el alquiler residencial/i);

for (const claim of [
  'La supuesta falta de camareros es en realidad una falta de empleos con salario y horario aceptables',
  'Los salarios y horarios de los puestos ofrecidos explican la escasez de camareros',
]) {
  const waiterShortage = await check(claim);
  assert.equal(waiterShortage.body.state, 'limited');
  assert.equal(waiterShortage.body.result.answerScope.family, 'waiter-vacancy-and-conditions');
  assert.deepEqual(waiterShortage.body.result.answerScope.directMetrics, []);
  assert.deepEqual(waiterShortage.body.result.answerScope.contextMetrics, ['experimental_job_vacancies_waiters']);
  assert.equal(waiterShortage.body.result.arguments[0].verdict, 'insufficient');
  assert.deepEqual(waiterShortage.body.result.arguments[0].sourceIds, []);
  assert.deepEqual(waiterShortage.body.result.arguments[0].contextSourceIds.sort(), [
    'eurostat-experimental-waiter-vacancies-2024', 'eurostat-job-vacancies-occupation-methodology',
  ].sort());
  assert.match(waiterShortage.body.result.reply, /no mide salarios, horarios ni las razones/);
  assert.match(waiterShortage.body.result.reply, /no demuestra que las condiciones expliquen/);
}
const waiterTrend = await check('¿Aumentaron las vacantes de camareros entre 2023 y 2024?');
assert.equal(waiterTrend.body.state, 'limited');
assert.equal(waiterTrend.body.result.arguments[0].verdict, 'insufficient');
assert.deepEqual(waiterTrend.body.result.answerScope.directMetrics, []);
assert.match(waiterTrend.body.result.reply, /No puede establecerse la tendencia.*ruptura de serie/s);
assert.doesNotMatch(waiterTrend.body.result.reply, /aumentaron en 0,39|subieron un 8/i);

const waiterRegional = await check('¿Cuántas vacantes de camarero hay en Madrid?');
assert.equal(waiterRegional.body.state, 'limited');
assert.equal(waiterRegional.body.result.answerScope.family, 'waiter-vacancy-and-conditions');
assert.deepEqual(waiterRegional.body.result.answerScope.directMetrics, ['experimental_job_vacancies_waiters']);
assert.equal(waiterRegional.body.result.arguments[0].verdict, 'insufficient');
assert.deepEqual(waiterRegional.body.result.arguments[0].sourceIds, []);
assert.deepEqual(waiterRegional.body.result.arguments[0].contextSourceIds.sort(), [
  'eurostat-experimental-waiter-vacancies-2024', 'eurostat-job-vacancies-occupation-methodology',
].sort());
assert.match(waiterRegional.body.result.reply, /celdas regionales de España.*confidenciales/);
assert.doesNotMatch(waiterRegional.body.result.reply, /5,12 mil|4,73 mil/);
const waiterHospitality = await check('¿Cuántas vacantes de camareros hay en hostelería?');
assert.equal(waiterHospitality.body.state, 'limited');
assert.deepEqual(waiterHospitality.body.result.answerScope.directMetrics, []);
assert.match(waiterHospitality.body.result.reply, /no identifica solo vacantes de hostelería/);
const waiterFutureYear = await check('¿Cuántas vacantes de camareros había en España en 2026?');
assert.equal(waiterFutureYear.body.state, 'limited');
assert.match(waiterFutureYear.body.result.reply, /estimaci[oó]n compatible para 2026/);
assert.doesNotMatch(waiterFutureYear.body.result.reply, /5,12 mil|4,73 mil/);
const waiterUnavailable = await check('¿Cuántas vacantes de camareros hay en España?', brokenDatabase);
assert.equal(waiterUnavailable.body.state, 'unavailable', 'A failed D1 lookup must not be replaced with the reviewed snapshot');
assert.doesNotMatch(waiterUnavailable.body.result?.reply || '', /5,12 mil|4,73 mil/);

await Promise.all(pending);
console.log('Reviewed text snapshot Pages fallback passed: empty D1 uses scoped answers, unsupported comparisons exclude mismatched statistics, and failed D1 reads remain unavailable.');
