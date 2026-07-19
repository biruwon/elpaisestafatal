const base = (process.env.SMOKE_RESOLVE_BASE_URL || 'http://127.0.0.1:4321').replace(/\/$/, '');
const resolvePath = process.env.SMOKE_RESOLVE_PATH || '/api/v1/resolve';
const failures = [];

const health = await fetch(`${base}/healthz`, { signal: AbortSignal.timeout(5000) }).catch(() => null);
if (!health?.ok) failures.push('healthz did not return OK');
else {
  const healthBody = await health.json().catch(() => ({}));
  if (healthBody.deterministic !== true) failures.push('healthz did not advertise deterministic fallback availability');
}

const resolve = async (text, inputType = 'text') => {
  const response = await fetch(`${base}${resolvePath}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, inputType }), signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`POST returned ${response.status}`);
  let result = await response.json();
  for (let attempt = 0; attempt < 30 && result.status === 'processing'; attempt += 1) {
    await new Promise((resolveWait) => setTimeout(resolveWait, 350));
    const pending = await fetch(`${base}${resolvePath}/${encodeURIComponent(result.requestId)}`, { signal: AbortSignal.timeout(5000) });
    result = await pending.json();
  }
  return result;
};

const resolveMultipart = async (inputType, mimeType) => {
  const form = new FormData();
  form.set('inputType', inputType);
  form.set('file', new Blob(['smoke-test'], { type: mimeType }), 'smoke-test.bin');
  const response = await fetch(`${base}${resolvePath}`, { method: 'POST', body: form, signal: AbortSignal.timeout(10000) });
  if (response.status === 400) throw new Error(`${inputType} multipart request was rejected as missing text`);
  let result = await response.json();
  for (let attempt = 0; attempt < 30 && result.status === 'processing'; attempt += 1) {
    await new Promise((resolveWait) => setTimeout(resolveWait, 350));
    const pending = await fetch(`${base}${resolvePath}/${encodeURIComponent(result.requestId)}`, { signal: AbortSignal.timeout(5000) });
    result = await pending.json();
  }
  return result;
};

const cases = [
  { text: 'España cobra demasiados impuestos', status: 'complete', slug: 'espana-impuestos-europa' },
  { text: 'España está destruida', status: 'uncovered', slug: null },
];
for (const item of cases) {
  try {
    const result = await resolve(item.text);
    if (result.status === 'processing') failures.push(`${item.text}: request remained processing after polling`);
    if (result.status !== item.status) failures.push(`${item.text}: expected ${item.status}, received ${result.status}`);
    if (item.slug && result.relatedClaims?.[0]?.slug !== item.slug) failures.push(`${item.text}: expected primary ${item.slug}`);
    if (!item.slug && result.relatedClaims?.length) failures.push(`${item.text}: unrelated alternatives returned (${result.relatedClaims.map((claim) => claim.slug).join(', ')})`);
    if (!item.slug && !result.result?.blocks?.some((block) => block.type === 'claim_breakdown')) failures.push(`${item.text}: uncovered result did not explain the claim being checked`);
  } catch (error) { failures.push(`${item.text}: ${error.message}`); }
}

if (process.env.SMOKE_MEDIA === '1') {
  for (const [inputType, mimeType] of [['image', 'image/png'], ['audio', 'audio/wav']]) {
    try {
      const result = await resolveMultipart(inputType, mimeType);
      if (result.status === 'processing') failures.push(`${inputType}: multipart request remained processing after polling`);
    } catch (error) { failures.push(`${inputType}: ${error.message}`); }
  }
}

if (process.env.SMOKE_WAREHOUSE === '1') {
  try {
    const result = await resolve('precios de la vivienda en España');
    const series = result.result?.warehouseSeries;
    if (!['draft', 'partial'].includes(result.status)) failures.push(`warehouse: expected a provisional result, received ${result.status}`);
    if (!series || series.values.length < 2 || series.values.length !== series.labels.length) failures.push('warehouse: expected a traceable multi-period series');
    if (new Set(series?.labels || []).size !== (series?.labels || []).length) failures.push('warehouse: mixed incompatible observations into one time series');
    if (String(series?.unit || '').toLocaleLowerCase().includes('rate of change')) failures.push('warehouse: selected a rate-of-change series for a level-price query');
  } catch (error) { failures.push(`warehouse: ${error.message}`); }
}

if (process.env.SMOKE_OFFICIAL === '1') {
  try {
    const result = await resolve('El Gobierno quita 310 millones de educación para gastos de personal de presidencia');
    const moneyFlow = result.result?.blocks?.find((block) => block.type === 'money_flow');
    const reply = result.result?.blocks?.find((block) => block.type === 'conversation_reply');
    if (result.status !== 'draft') failures.push(`official transfer: expected draft, received ${result.status}`);
    if (!moneyFlow?.evidenceIds?.length) failures.push('official transfer: money flow lost its evidence IDs');
    if (!reply?.evidenceIds?.length) failures.push('official transfer: conversation reply lost its evidence IDs');
    if (!result.result?.sourceLinks?.length || !result.result.sourceLinks.every((source) => /^https:\/\//i.test(source.url))) failures.push('official transfer: source link is missing or not attributable');
  } catch (error) { failures.push(`official transfer: ${error.message}`); }
}

if (process.env.SMOKE_LONG_TAIL === '1') {
  try {
    const result = await resolve('Los precios de la vivienda causan la crisis en España');
    if (result.status !== 'draft') failures.push(`causal long-tail: expected draft, received ${result.status}`);
    if (!result.result?.headline?.toLocaleLowerCase('es').includes('causalidad')) failures.push('causal long-tail: did not explain the causal limitation');
    if (!result.result?.blocks?.some((block) => block.type === 'data_finding')) failures.push('causal long-tail: missing contextual data block');
  } catch (error) { failures.push(`causal long-tail: ${error.message}`); }
  try {
    const result = await resolve('Los españoles deberían tener prioridad en las ayudas');
    if (result.status !== 'uncovered' || result.result?.coverage !== 'values') failures.push(`normative long-tail: expected uncovered values guidance, received ${result.status}/${result.result?.coverage}`);
    if (!result.result?.headline?.toLocaleLowerCase('es').includes('prioridad')) failures.push('normative long-tail: did not identify the value disagreement');
  } catch (error) { failures.push(`normative long-tail: ${error.message}`); }
  try {
    const result = await resolve('Los inmigrantes reciben más ayudas que los españoles');
    if (result.status !== 'uncovered') failures.push(`group-comparison long-tail: expected uncovered, received ${result.status}`);
    if (result.result?.sourceLinks?.length || result.result?.evidenceIds?.length) failures.push('group-comparison long-tail: leaked unrelated evidence');
    if (!result.result?.headline?.toLocaleLowerCase('es').includes('comparaci')) failures.push('group-comparison long-tail: did not explain missing direct comparison');
  } catch (error) { failures.push(`group-comparison long-tail: ${error.message}`); }
  try {
    const result = await resolve('La ley permite echar a cualquiera de su casa');
    if (result.status !== 'uncovered') failures.push(`legal long-tail: expected uncovered, received ${result.status}`);
    if (result.result?.sourceLinks?.length || result.result?.evidenceIds?.length) failures.push('legal long-tail: leaked unrelated evidence');
    if (!result.result?.headline?.toLocaleLowerCase('es').includes('supuesto')) failures.push('legal long-tail: did not ask for the concrete scenario');
  } catch (error) { failures.push(`legal long-tail: ${error.message}`); }
  try {
    const result = await resolve('La vivienda va a bajar un 30 por ciento el año que viene');
    if (result.status !== 'draft') failures.push(`prediction long-tail: expected draft, received ${result.status}`);
    if (!result.result?.headline?.toLocaleLowerCase('es').includes('predic')) failures.push('prediction long-tail: did not label the forecast');
    if (result.result?.blocks?.some((block) => block.type === 'line_chart')) failures.push('prediction long-tail: presented historical context as a forecast chart');
  } catch (error) { failures.push(`prediction long-tail: ${error.message}`); }
}

if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`Local resolver smoke passed: ${cases.length}${process.env.SMOKE_MEDIA === '1' ? ' + media' : ''}${process.env.SMOKE_WAREHOUSE === '1' ? ' + warehouse' : ''}${process.env.SMOKE_OFFICIAL === '1' ? ' + official' : ''}${process.env.SMOKE_LONG_TAIL === '1' ? ' + long-tail' : ''} cases at ${base}`);
