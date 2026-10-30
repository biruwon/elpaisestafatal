import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';

const reservation = createServer();
reservation.listen(0, '127.0.0.1');
await once(reservation, 'listening');
const port = reservation.address().port;
await new Promise((resolve) => reservation.close(resolve));
const child = spawn(process.execPath, ['scripts/local-claim-service.mjs'], {
  env: { ...process.env, LOCAL_CLASSIFIER_BIND_HOST: '127.0.0.1', LOCAL_CLASSIFIER_PORT: String(port), LOCAL_CLASSIFIER_TOKEN: '',
    LOCAL_CLAIM_COMPILER: '0', LOCAL_ANSWER_PLANNER: '0', CURRENT_EVENT_RESEARCH: '0', GENERAL_WEB_RESEARCH: '0' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
child.stderr.on('data', (chunk) => { logs += chunk.toString().slice(0, 10000); });
const now = Date.now();
const source = (id, dataset, retrieved) => ({ id, title: id.startsWith('price') ? 'Índice armonizado anual de precios en España · Eurostat' : 'Índice anual de salarios y sueldos brutos por hora en España · Eurostat', publisher: 'Eurostat',
  url: `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/${dataset}?geo=ES`, retrievedAt: new Date(retrieved).toISOString(), schedule: 'daily', sourceRegistryId: 'eurostat', trust: 'primary' });
const wageSource = source('wage-new', 'lc_lci_r2_a', now - 1000), oldSource = source('wage-old', 'lc_lci_r2_a', now - 86400000), priceSource = source('price-new', 'prc_hicp_ainr', now - 1000);
const records = [];
for (const [year, wage, price] of [[2018, 94.1, 81.69], [2019, 96.3, 82.33], [2020, 100, 82.05], [2021, 100.3, 84.52], [2022, 103.4, 91.55], [2023, 108.5, 94.66], [2024, 112.9, 97.38], [2025, 116.3, 100]]) {
  const dimensions = { freq: 'A', geo: 'ES', unit: 'I20', nace_r2: 'B-S', lcstruct: 'D11', time: String(year) };
  // Put the older revision first so file/input order cannot decide the answer.
  records.push({ id: `old-${year}`, metricId: 'annual_hourly_wage_index', value: year === 2025 ? 200 : 100, period: String(year), unit: 'Index, 2020=100', dimensions, source: oldSource });
  records.push({ id: `wage-${year}`, metricId: 'annual_hourly_wage_index', value: wage, period: String(year), unit: 'Index, 2020=100', dimensions, source: wageSource });
  records.push({ id: `price-${year}`, metricId: 'annual_hicp_index', value: price, period: String(year), unit: 'Annual average index', dimensions: { freq: 'A', geo: 'ES', unit: 'INX_A_AVG', coicop18: 'TOTAL', time: String(year) }, source: priceSource });
}
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Resolver did not start: ${logs.slice(-1000)}`)), 20000);
    child.once('error', (error) => { clearTimeout(timer); reject(error); });
    child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`Resolver exited ${code}: ${logs.slice(-1000)}`)); });
    child.stdout.on('data', (chunk) => { if (chunk.toString().includes('Local claim service listening')) { clearTimeout(timer); resolve(); } });
  });
  const base = `http://127.0.0.1:${port}/v1/classify`;
  const check = async (text) => {
    const response = await fetch(base, { method: 'POST', headers: { 'content-type': 'application/json', connection: 'close' }, body: JSON.stringify({ text, inputType: 'text', warehouseRecords: records }), signal: AbortSignal.timeout(10000) });
    let result = await response.json();
    const deadline = Date.now() + 45000;
    while (result.status === 'processing' && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      try { result = await (await fetch(`${base}/${encodeURIComponent(result.requestId)}`, { headers: { connection: 'close' }, signal: AbortSignal.timeout(5000) })).json(); }
      catch { /* A busy local process can briefly delay a poll. */ }
    }
    assert.equal(result.status, 'complete');
    return result.result;
  };
  const general = await check('Los salarios pierden poder adquisitivo frente al coste de la vida');
  assert.match(general.shareableReply, /2020 y 2025/);
  assert.match(general.shareableReply, /índice salarial bajó aproximadamente un 4,6 %/);
  assert.ok(general.sourceIds.includes('wage-new') && !general.sourceIds.includes('wage-old'), 'The resolver selected an older wage revision');
  const since = await check('Los salarios han perdido poder adquisitivo desde 2018');
  assert.match(since.shareableReply, /2018 y 2025/);
  assert.match(since.shareableReply, /índice salarial subió aproximadamente un 1 %/);
  const youth = await check('Los salarios de los jóvenes pierden poder adquisitivo frente a los precios');
  assert.equal(youth.evidenceLevel, 'insufficient');
  assert.doesNotMatch(youth.shareableReply, /4,6 %|1 %/);
} finally {
  child.kill('SIGTERM');
  await Promise.race([once(child, 'exit').catch(() => {}), new Promise((resolve) => setTimeout(resolve, 2000))]);
  if (child.exitCode === null) child.kill('SIGKILL');
}
console.log('Real-wage runtime passed: source revisions, requested periods and youth-scope boundaries are preserved.');
