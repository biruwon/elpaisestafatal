const endpoint = process.env.CLAIM_SERVICE_URL || 'http://127.0.0.1:8790';
const cases = [
  'Desde que llegaron más extranjeros hay más inseguridad',
  '¿La llegada de inmigrantes ha hecho que España sea menos segura?',
  'Se pagan votos en las elecciones españolas',
  'Los fijos discontinuos son parados encubiertos',
  'Los contratos fijos discontinuos son parados ocultos',
  'La sanidad pública está colapsada',
  'La vivienda no para de encarecerse',
  'Los alquileres son cada vez más caros en España',
  'Nunca hubo tanta gente trabajando en España',
  'España nos fríe a impuestos comparada con Europa',
  'Los hospitales están saturados',
  'Los inmigrantes reciben más ayudas que los españoles',
  'Los extranjeros reciben ayudas económicas desproporcionadas',
  'Cada vez llegan más inmigrantes a España',
  'La vivienda se ha encarecido muchísimo',
];
const exploratoryCases = [
  'Los alquileres son cada vez más caros en España',
  'España compara peor en paro que Europa',
  'La lista de espera de los hospitales no deja de crecer',
  'La inmigración sirve para pagar las pensiones',
  'La ley trans permite cambiar de sexo sin controles',
  'El salario mínimo ha destruido puestos de trabajo',
  'La vivienda que compré hace años vale el triple',
  'España tiene una deuda pública por encima del PIB',
];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

for (const text of cases) {
  const response = await fetch(`${endpoint}/v1/classify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, inputType: 'text' }),
  });
  let payload = await response.json();
  for (let attempt = 0; payload.status === 'processing' && attempt < 160; attempt += 1) {
    await sleep(250);
    payload = await (await fetch(`${endpoint}/v1/classify/${payload.requestId}`)).json();
  }
  const coverage = payload.result?.coverage;
  if (payload.status !== 'complete' || coverage !== 'strong') {
    throw new Error(`${text}: expected complete/strong, got ${JSON.stringify({ status: payload.status, coverage })}`);
  }
  console.log(JSON.stringify({ text, status: payload.status, coverage, headline: payload.result?.headline }));
}

console.log(`Claim-family paraphrase validation passed: ${cases.length} variants reused published evidence families.`);

for (const text of exploratoryCases) {
  const response = await fetch(`${endpoint}/v1/classify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, inputType: 'text' }),
  });
  let payload = await response.json();
  for (let attempt = 0; payload.status === 'processing' && attempt < 160; attempt += 1) {
    await sleep(250);
    payload = await (await fetch(`${endpoint}/v1/classify/${payload.requestId}`)).json();
  }
  const coverage = payload.result?.coverage;
  if (payload.status === 'uncovered' || (coverage === 'insufficient' && !payload.relatedClaims?.length)) {
    throw new Error(`${text}: exploratory paraphrase became a dead end: ${JSON.stringify({ status: payload.status, coverage })}`);
  }
  console.log(JSON.stringify({ text, status: payload.status, coverage, headline: payload.result?.headline }));
}

console.log(`Exploratory family validation passed: ${exploratoryCases.length} additional variants retained useful guidance.`);

const broadComplaintCases = ['España está destruida', 'Este país es un desastre'];
for (const text of broadComplaintCases) {
  const response = await fetch(`${endpoint}/v1/classify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, inputType: 'text' }),
  });
  let payload = await response.json();
  for (let attempt = 0; payload.status === 'processing' && attempt < 160; attempt += 1) {
    await sleep(250);
    payload = await (await fetch(`${endpoint}/v1/classify/${payload.requestId}`)).json();
  }
  if (!['complete', 'partial'].includes(payload.status) || !payload.relatedClaims?.some((item) => item.slug === 'politica')) {
    throw new Error(`${text}: broad complaint did not route to reusable political guidance`);
  }
  console.log(JSON.stringify({ text, status: payload.status, related: 'politica' }));
}
console.log(`Broad complaint routing validation passed: ${broadComplaintCases.length} variants reused topic guidance.`);

for (const [text, expectedSlug] of [
  ['Hay una invasión migratoria', 'inmigracion'],
  ['La vivienda está cara', 'vivienda'],
  ['La vivienda es imposible para los jóvenes', 'vivienda'],
  ['Los inmigrantes vienen a vivir de las ayudas', 'inmigracion'],
  ['España es un país inseguro', 'seguridad'],
  ['El Estado gasta más de lo que ingresa', 'economia'],
  ['Nunca ha habido tantos trabajadores', 'empleo-record'],
]) {
  const response = await fetch(`${endpoint}/v1/classify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, inputType: 'text' }),
  });
  let payload = await response.json();
  for (let attempt = 0; payload.status === 'processing' && attempt < 160; attempt += 1) {
    await sleep(250);
    payload = await (await fetch(`${endpoint}/v1/classify/${payload.requestId}`)).json();
  }
  const related = [...(payload.alternatives || []), ...(payload.relatedClaims || [])];
  if ((!['complete', 'related', 'partial'].includes(payload.status) && !(['uncovered', 'draft'].includes(payload.status) && related.some((item) => item.kind === 'topic'))) || !related.some((item) => item.slug === expectedSlug)) {
    throw new Error(`${text}: domain wording did not route to ${expectedSlug}: ${JSON.stringify(payload)}`);
  }
  console.log(JSON.stringify({ text, status: payload.status, related: expectedSlug }));
}
console.log('Domain broad-wording routing validation passed: new surface forms reuse domain guidance.');

const reversedComparison = await fetch(`${endpoint}/v1/classify`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ text: 'Los españoles reciben más ayudas que los inmigrantes', inputType: 'text' }),
});
let reversedPayload = await reversedComparison.json();
for (let attempt = 0; reversedPayload.status === 'processing' && attempt < 160; attempt += 1) {
  await sleep(250);
  reversedPayload = await (await fetch(`${endpoint}/v1/classify/${reversedPayload.requestId}`)).json();
}
if (reversedPayload.primary?.slug === 'inmigrantes-ayudas-desproporcionadas' || reversedPayload.status === 'published' && reversedPayload.result?.coverage === 'strong') {
  throw new Error(`Reversed group comparison incorrectly reused the directional benefits family: ${JSON.stringify(reversedPayload)}`);
}
console.log(JSON.stringify({ text: 'Los españoles reciben más ayudas que los inmigrantes', status: reversedPayload.status, related: reversedPayload.relatedClaims?.map((item) => item.slug) || [] }));

for (const [text, expectedSlug] of [
  ['El Gobierno compra votos con ayudas', 'compra-votos-espana'],
  ['Sánchez paga a la gente para que le vote', 'compra-votos-espana'],
  ['La deuda pública es impagable', 'economia'],
]) {
  const form = new FormData();
  form.set('text', text);
  form.set('inputType', 'text');
  const response = await fetch(`${endpoint}/api/classify`, { method: 'POST', body: form });
  const payload = await response.json();
  if (!(payload.alternatives || []).some((item) => item.slug === expectedSlug)) {
    throw new Error(`${text}: expected reusable guidance ${expectedSlug}, got ${JSON.stringify(payload.alternatives || [])}`);
  }
  console.log(JSON.stringify({ text, related: expectedSlug, status: payload.status }));
}
console.log('Compound-family guidance validation passed: political and economic variants reuse existing domains.');

const unrelatedProbe = 'La inmigración destruye la productividad de las pymes';
const unrelatedResponse = await fetch(`${endpoint}/v1/classify`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ text: unrelatedProbe, inputType: 'text' }),
});
let unrelatedPayload = await unrelatedResponse.json();
for (let attempt = 0; unrelatedPayload.status === 'processing' && attempt < 160; attempt += 1) {
  await sleep(250);
  unrelatedPayload = await (await fetch(`${endpoint}/v1/classify/${unrelatedPayload.requestId}`)).json();
}
if (unrelatedPayload.relatedClaims?.some((item) => item.slug === 'inmigracion-delincuencia')) {
  throw new Error('An immigration/productivity claim received unrelated immigration/crime guidance');
}
console.log('Unrelated-family guard validation passed.');

const causalCompoundProbe = 'Hay más delincuencia porque hay más inmigrantes';
const causalCompoundResponse = await fetch(`${endpoint}/v1/classify`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ text: causalCompoundProbe, inputType: 'text' }),
});
let causalCompoundPayload = await causalCompoundResponse.json();
for (let attempt = 0; causalCompoundPayload.status === 'processing' && attempt < 160; attempt += 1) {
  await sleep(250);
  causalCompoundPayload = await (await fetch(`${endpoint}/v1/classify/${causalCompoundPayload.requestId}`)).json();
}
if (causalCompoundPayload.status === 'complete' && causalCompoundPayload.result?.coverage === 'strong') {
  throw new Error('Causal compound claim was incorrectly promoted from independent published claims');
}
console.log('Causal composite safety validation passed.');
