const endpoint = process.env.CLAIM_SERVICE_URL || 'http://127.0.0.1:8790';
const cases = [
  'Desde que llegaron más extranjeros hay más inseguridad',
  '¿La llegada de inmigrantes ha hecho que España sea menos segura?',
  'Se pagan votos en las elecciones españolas',
  'El desempleo real está oculto por los contratos fijos discontinuos',
  'Los contratos fijos discontinuos son parados ocultos',
  'El desempleo sigue bajando en España',
  'La sanidad pública está colapsada',
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
