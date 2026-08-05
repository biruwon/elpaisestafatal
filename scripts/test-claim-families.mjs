const endpoint = process.env.CLAIM_SERVICE_URL || 'http://127.0.0.1:8790';
const cases = [
  'Desde que llegaron más extranjeros hay más inseguridad',
  '¿La llegada de inmigrantes ha hecho que España sea menos segura?',
  'Se pagan votos en las elecciones españolas',
  'Los fijos discontinuos son parados encubiertos',
  'Los contratos fijos discontinuos son parados ocultos',
  'La sanidad pública está colapsada',
  'La vivienda no para de encarecerse',
  'Nunca hubo tanta gente trabajando en España',
  'España nos fríe a impuestos comparada con Europa',
  'Los hospitales están saturados',
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
  if (payload.status === 'uncovered' || coverage === 'insufficient') {
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
