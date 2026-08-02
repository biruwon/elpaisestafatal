const base = (process.env.SMOKE_RESOLVE_BASE_URL || 'http://127.0.0.1:4321').replace(/\/$/, '');
const resolvePath = process.env.SMOKE_RESOLVE_PATH || '/api/v1/resolve';
const healthPath = process.env.SMOKE_HEALTH_PATH || '/healthz';
const failures = [];

const health = await fetch(`${base}${healthPath}`, { signal: AbortSignal.timeout(5000) }).catch(() => null);
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

const resolveMultipart = async (inputType, mimeType, text = '') => {
  const form = new FormData();
  if (text) form.set('text', text);
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
  { text: 'El paro registrado y el de la EPA son la misma cifra.', status: 'complete', slug: 'paro-epa-registro' },
  { text: 'Tener más personas ocupadas demuestra que todo el empleo es de calidad.', status: 'complete', slug: 'empleo-record-calidad' },
  { text: 'Las llegadas irregulares representan toda la inmigración que vive en España.', status: 'complete', slug: 'inmigracion-flujos-no-total' },
  { text: 'La cibercriminalidad crece más que la delincuencia convencional.', status: 'complete', slug: 'cibercriminalidad-crece' },
  { text: 'La pobreza ha desaparecido porque baja el riesgo AROPE.', status: 'complete', slug: 'riesgo-pobreza-no-desaparece' },
  { text: 'La vivienda está bajando de precio en España.', status: 'complete', slug: 'precio-vivienda-sube' },
  { text: 'España está en recesión.', status: 'complete', slug: 'espana-recesion' },
  { text: 'La recaudación tributaria bajó en 2025.', status: 'complete', slug: 'recaudacion-tributaria-crece' },
  { text: 'Pedro Sánchez está destruyendo España', status: 'partial', slug: 'politica' },
  { text: 'España está destruida', status: 'uncovered', slug: null },
];
for (const item of cases) {
  try {
    const result = await resolve(item.text);
    if (result.status === 'processing') failures.push(`${item.text}: request remained processing after polling`);
    if (result.status !== item.status) failures.push(`${item.text}: expected ${item.status}, received ${result.status}`);
    if (item.slug && result.relatedClaims?.[0]?.slug !== item.slug) failures.push(`${item.text}: expected primary ${item.slug}`);
    if (item.slug && item.status === 'complete' && !result.result?.blocks?.some((block) => block.type === 'confirmed' && block.propositionIds?.length)) failures.push(`${item.text}: published result did not retain proposition traceability`);
    if (!item.slug && result.relatedClaims?.length) failures.push(`${item.text}: unrelated alternatives returned (${result.relatedClaims.map((claim) => claim.slug).join(', ')})`);
    if (!item.slug && !result.result?.blocks?.some((block) => block.type === 'claim_breakdown')) failures.push(`${item.text}: uncovered result did not explain the claim being checked`);
  } catch (error) { failures.push(`${item.text}: ${error.message}`); }
}

if (process.env.SMOKE_MEDIA === '1') {
  for (const [inputType, mimeType] of [['image', 'image/png'], ['audio', 'audio/wav']]) {
    try {
      const result = await resolveMultipart(inputType, mimeType, 'España está en recesión');
      if (result.status === 'processing') failures.push(`${inputType}: multipart request remained processing after polling`);
      if (result.status === 'unavailable') failures.push(`${inputType}: typed caption did not retain a useful fallback when media extraction was unavailable`);
    } catch (error) { failures.push(`${inputType}: ${error.message}`); }
  }
}

if (process.env.SMOKE_URL === '1') {
  try {
    const result = await resolve('https://example.com/', 'url');
    if (result.status === 'processing') failures.push('url: request remained processing after polling');
    if (!['complete', 'draft', 'partial', 'uncovered', 'unavailable'].includes(result.status)) failures.push(`url: unexpected terminal status ${result.status}`);
    if (JSON.stringify(result).toLocaleLowerCase().includes('ollama')) failures.push('url: provider detail leaked into response');
  } catch (error) { failures.push(`url: ${error.message}`); }
}

if (process.env.SMOKE_DEDUPE === '1') {
  try {
    const submit = (text) => fetch(`${base}${resolvePath}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, inputType: 'text' }), signal: AbortSignal.timeout(10000) }).then((response) => response.json());
    const [plain, conversational] = await Promise.all([
      submit('La brecha salarial de género es un mito'),
      submit('Mi cuñado insiste: la brecha salarial de género es un mito'),
    ]);
    if (!plain.requestId || plain.requestId !== conversational.requestId) failures.push('canonical dedupe: equivalent concurrent claims did not reuse one job');
  } catch (error) { failures.push(`canonical dedupe: ${error.message}`); }
}

if (process.env.SMOKE_WAREHOUSE === '1') {
  try {
    const result = await resolve('Cuál es la inflación anual en España');
    if (!['draft', 'partial'].includes(result.status)) failures.push(`inflation warehouse: expected provisional result, received ${result.status}`);
    if (result.result?.warehouseSeries?.metricId !== 'inflation_rate') failures.push('inflation warehouse: selected the wrong metric family');
    if (!result.result?.warehouseSeries?.values?.length || result.result.warehouseSeries.values.length < 2) failures.push('inflation warehouse: missing a multi-period series');
    if (result.result?.warehouseSeries?.unit !== '% interanual') failures.push('inflation warehouse: did not localize the unit');
  } catch (error) { failures.push(`inflation warehouse: ${error.message}`); }
  try {
    const result = await resolve('precios de la vivienda en España');
    const series = result.result?.warehouseSeries;
    if (!['draft', 'partial'].includes(result.status)) failures.push(`warehouse: expected a provisional result, received ${result.status}`);
    if (!series || series.values.length < 2 || series.values.length !== series.labels.length) failures.push('warehouse: expected a traceable multi-period series');
    if (new Set(series?.labels || []).size !== (series?.labels || []).length) failures.push('warehouse: mixed incompatible observations into one time series');
    if (String(series?.unit || '').toLocaleLowerCase().includes('rate of change')) failures.push('warehouse: selected a rate-of-change series for a level-price query');
  } catch (error) { failures.push(`warehouse: ${error.message}`); }
  try {
    const result = await resolve('Cuál fue el crecimiento interanual del PIB real de España en el último trimestre');
    if (!['draft', 'partial'].includes(result.status)) failures.push(`real GDP warehouse: expected provisional result, received ${result.status}`);
    if (result.result?.warehouseSeries?.metricId !== 'gdp_real_growth_quarterly') failures.push('real GDP warehouse: selected the wrong metric family');
    if (!result.result?.sourceLinks?.some((source) => /eurostat/i.test(`${source.title} ${source.url}`))) failures.push('real GDP warehouse: missing Eurostat source trail');
    if (/gross domestic|quarterly data/i.test(result.result?.headline || '')) failures.push('real GDP warehouse: leaked raw dataset title into the public headline');
  } catch (error) { failures.push(`real GDP warehouse: ${error.message}`); }
  try {
    const result = await resolve('Qué porcentaje de residentes está en AROPE en España');
    if (!['draft', 'partial'].includes(result.status)) failures.push(`AROPE warehouse: expected provisional result, received ${result.status}`);
    if (result.result?.warehouseSeries?.metricId !== 'arope_rate') failures.push('AROPE warehouse: selected the wrong metric family');
    if (!result.result?.sourceLinks?.some((source) => /eurostat/i.test(`${source.title} ${source.url}`))) failures.push('AROPE warehouse: missing Eurostat source trail');
    if (/persons at risk|age and sex/i.test(result.result?.headline || '')) failures.push('AROPE warehouse: leaked raw dataset title into the public headline');
  } catch (error) { failures.push(`AROPE warehouse: ${error.message}`); }
  try {
    const result = await resolve('Cómo ha evolucionado la deuda pública española sobre el PIB');
    if (!['draft', 'partial'].includes(result.status)) failures.push(`public debt warehouse: expected provisional result, received ${result.status}`);
    if (result.result?.warehouseSeries?.metricId !== 'government_debt_ratio') failures.push('public debt warehouse: selected the wrong metric family');
    if (!result.result?.warehouseSeries?.values?.length || result.result.warehouseSeries.values.length < 2) failures.push('public debt warehouse: missing a multi-period series');
    if (/government debt|associated data/i.test(result.result?.headline || '')) failures.push('public debt warehouse: leaked raw dataset title into the public headline');
  } catch (error) { failures.push(`public debt warehouse: ${error.message}`); }
  try {
    const result = await resolve('Qué porcentaje del PIB representan los ingresos públicos españoles');
    if (!['draft', 'partial'].includes(result.status)) failures.push(`public revenue warehouse: expected provisional result, received ${result.status}`);
    if (result.result?.warehouseSeries?.metricId !== 'government_revenue_ratio') failures.push('public revenue warehouse: selected the wrong metric family');
    if (!result.result?.warehouseSeries?.values?.length || result.result.warehouseSeries.values.length < 2) failures.push('public revenue warehouse: missing a multi-period series');
    if (/government revenue|associated data/i.test(result.result?.headline || '')) failures.push('public revenue warehouse: leaked raw dataset title into the public headline');
  } catch (error) { failures.push(`public revenue warehouse: ${error.message}`); }
  try {
    const result = await resolve('Qué porcentaje del PIB representa el gasto público español');
    if (!['draft', 'partial'].includes(result.status)) failures.push(`public expenditure warehouse: expected provisional result, received ${result.status}`);
    if (result.result?.warehouseSeries?.metricId !== 'government_expenditure_ratio') failures.push('public expenditure warehouse: selected the wrong metric family');
    if (!result.result?.warehouseSeries?.values?.length || result.result.warehouseSeries.values.length < 2) failures.push('public expenditure warehouse: missing a multi-period series');
    if (/government expenditure|associated data/i.test(result.result?.headline || '')) failures.push('public expenditure warehouse: leaked raw dataset title into the public headline');
  } catch (error) { failures.push(`public expenditure warehouse: ${error.message}`); }
  try {
    const result = await resolve('Qué porcentaje de personas soporta una sobrecarga del coste de la vivienda');
    if (!['draft', 'partial'].includes(result.status)) failures.push(`housing affordability warehouse: expected provisional result, received ${result.status}`);
    if (result.result?.warehouseSeries?.metricId !== 'housing_cost_overburden_rate') failures.push('housing affordability warehouse: selected the wrong metric family');
    if (!result.result?.warehouseSeries?.values?.length || result.result.warehouseSeries.values.length < 2) failures.push('housing affordability warehouse: missing a multi-period series');
    if (/housing cost overburden rate by age/i.test(result.result?.headline || '')) failures.push('housing affordability warehouse: leaked raw dataset title into the public headline');
  } catch (error) { failures.push(`housing affordability warehouse: ${error.message}`); }
  try {
    const result = await resolve('Cuánto se gasta en sanidad por habitante en España');
    if (!['draft', 'partial'].includes(result.status)) failures.push(`health expenditure warehouse: expected provisional result, received ${result.status}`);
    if (result.result?.warehouseSeries?.metricId !== 'health_expenditure_per_capita') failures.push('health expenditure warehouse: selected the wrong metric family');
    if (!result.result?.warehouseSeries?.values?.length || result.result.warehouseSeries.values.length < 2) failures.push('health expenditure warehouse: missing a multi-period series');
    if (/health care expenditure by financing scheme/i.test(result.result?.headline || '')) failures.push('health expenditure warehouse: leaked raw dataset title into the public headline');
  } catch (error) { failures.push(`health expenditure warehouse: ${error.message}`); }
  try {
    const result = await resolve('Cómo ha evolucionado la esperanza de vida en España');
    if (!['draft', 'partial'].includes(result.status)) failures.push(`life expectancy warehouse: expected provisional result, received ${result.status}`);
    if (result.result?.warehouseSeries?.metricId !== 'life_expectancy_at_birth') failures.push('life expectancy warehouse: selected the wrong metric family');
    if (!result.result?.warehouseSeries?.values?.length || result.result.warehouseSeries.values.length < 2) failures.push('life expectancy warehouse: missing a multi-period series');
    if (result.result?.warehouseSeries?.unit !== 'años') failures.push('life expectancy warehouse: did not localize the unit');
  } catch (error) { failures.push(`life expectancy warehouse: ${error.message}`); }
  try {
    const result = await resolve('Cómo ha evolucionado la fecundidad en España');
    if (!['draft', 'partial'].includes(result.status)) failures.push(`fertility warehouse: expected provisional result, received ${result.status}`);
    if (result.result?.warehouseSeries?.metricId !== 'fertility_rate') failures.push('fertility warehouse: selected the wrong metric family');
    if (!result.result?.warehouseSeries?.values?.length || result.result.warehouseSeries.values.length < 2) failures.push('fertility warehouse: missing a multi-period series');
    if (result.result?.warehouseSeries?.unit !== 'hijos por mujer') failures.push('fertility warehouse: did not localize the unit');
  } catch (error) { failures.push(`fertility warehouse: ${error.message}`); }
  try {
    const result = await resolve('Cómo ha evolucionado el envejecimiento de la población española');
    if (!['draft', 'partial'].includes(result.status)) failures.push(`ageing warehouse: expected provisional result, received ${result.status}`);
    if (result.result?.warehouseSeries?.metricId !== 'old_age_dependency_ratio') failures.push('ageing warehouse: selected the wrong metric family');
    if (!result.result?.warehouseSeries?.values?.length || result.result.warehouseSeries.values.length < 2) failures.push('ageing warehouse: missing a multi-period series');
    if (result.result?.warehouseSeries?.unit !== 'personas mayores por cada 100 en edad de trabajar') failures.push('ageing warehouse: did not localize the unit');
  } catch (error) { failures.push(`ageing warehouse: ${error.message}`); }
  try {
    const result = await resolve('Qué porcentaje de personas mayores de 65 años hay en España');
    if (!['draft', 'partial'].includes(result.status)) failures.push(`older-population warehouse: expected provisional result, received ${result.status}`);
    if (result.result?.warehouseSeries?.metricId !== 'older_population_share') failures.push('older-population warehouse: selected the wrong metric family');
    if (!result.result?.warehouseSeries?.values?.length || result.result.warehouseSeries.values.length < 2) failures.push('older-population warehouse: missing a multi-period series');
    if (result.result?.warehouseSeries?.unit !== '% de la población') failures.push('older-population warehouse: did not localize the unit');
    if (/no coincide/i.test(result.result?.headline || '')) failures.push('older-population warehouse: age threshold was treated as a claimed value');
  } catch (error) { failures.push(`older-population warehouse: ${error.message}`); }
  try {
    const result = await resolve('Qué porcentaje de la población tiene menos de 15 años');
    if (!['draft', 'partial'].includes(result.status)) failures.push(`young-population warehouse: expected provisional result, received ${result.status}`);
    if (result.result?.warehouseSeries?.metricId !== 'young_population_share') failures.push('young-population warehouse: selected the wrong metric family');
    if (!result.result?.warehouseSeries?.values?.length || result.result.warehouseSeries.values.length < 2) failures.push('young-population warehouse: missing a multi-period series');
    if (result.result?.warehouseSeries?.unit !== '% de la población') failures.push('young-population warehouse: did not localize the unit');
  } catch (error) { failures.push(`young-population warehouse: ${error.message}`); }
  try {
    const result = await resolve('España está perdiendo población');
    if (!['draft', 'partial'].includes(result.status)) failures.push(`population-change warehouse: expected provisional result, received ${result.status}`);
    if (result.result?.warehouseSeries?.metricId !== 'population_change_rate') failures.push('population-change warehouse: selected the wrong metric family');
    if (!result.result?.warehouseSeries?.values?.length || result.result.warehouseSeries.values.length < 2) failures.push('population-change warehouse: missing a multi-period series');
    if (result.result?.warehouseSeries?.unit !== 'por cada 1.000 habitantes') failures.push('population-change warehouse: did not localize the unit');
  } catch (error) { failures.push(`population-change warehouse: ${error.message}`); }
  try {
    const result = await resolve('Cómo ha evolucionado la desigualdad de ingresos en España');
    if (!['draft', 'partial'].includes(result.status)) failures.push(`Gini warehouse: expected provisional result, received ${result.status}`);
    if (result.result?.warehouseSeries?.metricId !== 'gini_coefficient') failures.push('Gini warehouse: selected the wrong metric family');
    if (!result.result?.warehouseSeries?.values?.length || result.result.warehouseSeries.values.length < 2) failures.push('Gini warehouse: missing a multi-period series');
    if (result.result?.warehouseSeries?.unit !== 'escala Gini 0–100') failures.push('Gini warehouse: did not localize the unit');
  } catch (error) { failures.push(`Gini warehouse: ${error.message}`); }
  try {
    const result = await resolve('Cómo ha cambiado el déficit público sobre el PIB');
    if (!['draft', 'partial'].includes(result.status)) failures.push(`public deficit warehouse: expected provisional result, received ${result.status}`);
    if (result.result?.warehouseSeries?.metricId !== 'government_deficit_ratio') failures.push('public deficit warehouse: selected the wrong metric family');
    if (!result.result?.warehouseSeries?.values?.length || result.result.warehouseSeries.values.length < 2) failures.push('public deficit warehouse: missing a multi-period series');
    if (result.result?.warehouseSeries?.unit !== '% del PIB') failures.push('public deficit warehouse: did not localize the unit');
  } catch (error) { failures.push(`public deficit warehouse: ${error.message}`); }
  try {
    const result = await resolve('Cómo ha evolucionado la renta mediana de los hogares');
    if (!['draft', 'partial'].includes(result.status)) failures.push(`median income warehouse: expected provisional result, received ${result.status}`);
    if (result.result?.warehouseSeries?.metricId !== 'median_equivalised_income') failures.push('median income warehouse: selected the wrong metric family');
    if (!result.result?.warehouseSeries?.values?.length || result.result.warehouseSeries.values.length < 2) failures.push('median income warehouse: missing a multi-period series');
    if (result.result?.warehouseSeries?.unit !== '€ por persona') failures.push('median income warehouse: did not localize the unit');
  } catch (error) { failures.push(`median income warehouse: ${error.message}`); }
  try {
    const result = await resolve('Qué porcentaje de jóvenes activos está en paro en España');
    if (!['draft', 'partial'].includes(result.status)) failures.push(`youth unemployment warehouse: expected provisional result, received ${result.status}`);
    if (result.result?.warehouseSeries?.metricId !== 'youth_unemployment_rate') failures.push('youth unemployment warehouse: selected the wrong metric family');
    if (!result.result?.warehouseSeries?.values?.length || result.result.warehouseSeries.values.length < 2) failures.push('youth unemployment warehouse: missing a multi-period series');
    if (/unemployment by sex and age/i.test(result.result?.headline || '')) failures.push('youth unemployment warehouse: leaked raw dataset title into the public headline');
  } catch (error) { failures.push(`youth unemployment warehouse: ${error.message}`); }
  try {
    const result = await resolve('Qué porcentaje de la población activa no encuentra trabajo');
    if (result.result?.warehouseSeries?.metricId === 'youth_unemployment_rate') failures.push('general unemployment warehouse: incorrectly selected the youth metric without youth wording');
  } catch (error) { failures.push(`general unemployment warehouse: ${error.message}`); }
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
  for (const item of [
    ['La mayoría de inmigratnes llega en patera', 'inmigrantes-patera'],
    ['Los inmigratnes pagarán nuestras pensiones', 'inmigrantes-pensiones'],
    ['Si la vivenda sube un 12,9%, todas las casas suben lo mismo', 'subida-vivienda-no-todas-igual'],
  ]) {
    try {
      const result = await resolve(item[0]);
      if (result.status !== 'complete' || result.relatedClaims?.[0]?.slug !== item[1]) failures.push(`typo published match: expected ${item[1]}, received ${result.status}/${result.relatedClaims?.[0]?.slug || 'none'}`);
    } catch (error) { failures.push(`typo published match ${item[1]}: ${error.message}`); }
  }
  for (const text of [
    'En mi calle todos los pisos sociales se los dan a extranjeros',
    'En mi barrio ha subido la inseguridad este mes',
    'No se puede saber la intención privada de una persona con este dato',
  ]) {
    try {
      const result = await resolve(text);
      if (result.status !== 'uncovered') failures.push(`specific unknown claim: expected uncovered for “${text}”, received ${result.status}`);
      if (result.relatedClaims?.length || result.result?.sourceLinks?.length || result.result?.evidenceIds?.length) failures.push(`specific unknown claim: leaked unrelated context for “${text}”`);
    } catch (error) { failures.push(`specific unknown claim: ${error.message}`); }
  }
  try {
    const result = await resolve('Los precios de la vivienda causan la crisis en España');
    if (result.status !== 'draft') failures.push(`causal long-tail: expected draft, received ${result.status}`);
    if (!result.result?.headline?.toLocaleLowerCase('es').includes('causalidad')) failures.push('causal long-tail: did not explain the causal limitation');
    if (!result.result?.blocks?.some((block) => block.type === 'data_finding')) failures.push('causal long-tail: missing contextual data block');
    if (!result.result?.blocks?.some((block) => block.type === 'evidence_ladder')) failures.push('causal long-tail: missing evidence ladder');
  } catch (error) { failures.push(`causal long-tail: ${error.message}`); }
  try {
    const result = await resolve('Los españoles deberían tener prioridad en las ayudas');
    if (result.status !== 'uncovered' || result.result?.coverage !== 'values') failures.push(`normative long-tail: expected uncovered values guidance, received ${result.status}/${result.result?.coverage}`);
    if (!result.result?.headline?.toLocaleLowerCase('es').includes('prioridad')) failures.push('normative long-tail: did not identify the value disagreement');
    if (!result.result?.blocks?.some((block) => block.type === 'trade_offs')) failures.push('normative long-tail: missing trade-off comparison');
  } catch (error) { failures.push(`normative long-tail: ${error.message}`); }
  try {
    const result = await resolve('Los inmigrantes reciben más ayudas que los españoles');
    if (result.status !== 'uncovered') failures.push(`group-comparison long-tail: expected uncovered, received ${result.status}`);
    if (result.result?.sourceLinks?.length || result.result?.evidenceIds?.length) failures.push('group-comparison long-tail: leaked unrelated evidence');
    if (!result.result?.headline?.toLocaleLowerCase('es').includes('comparaci')) failures.push('group-comparison long-tail: did not explain missing direct comparison');
    if (!result.result?.blocks?.some((block) => block.type === 'group_comparison_requirements')) failures.push('group-comparison long-tail: missing comparability checklist');
  } catch (error) { failures.push(`group-comparison long-tail: ${error.message}`); }
  try {
    const result = await resolve('España cobra los impuestos más altos de Europa');
    const unrelated = (result.result?.sourceLinks || []).some((source) => /inmigraci[oó]n/i.test(`${source.title || ''} ${source.url || ''}`));
    if (unrelated) failures.push('published tax claim: inherited an unrelated immigration source');
  } catch (error) { failures.push(`published tax claim: ${error.message}`); }
  try {
    const result = await resolve('Los extranjeros delinquen más');
    if (result.status === 'complete' && result.relatedClaims?.[0]?.slug === 'inmigracion-delincuencia') failures.push('group comparison: accepted a causal published claim as an exact match');
  } catch (error) { failures.push(`group comparison compatibility: ${error.message}`); }
  try {
    const result = await resolve('La ley permite echar a cualquiera de su casa');
    if (result.status !== 'uncovered') failures.push(`legal long-tail: expected uncovered, received ${result.status}`);
    if (result.result?.sourceLinks?.length || result.result?.evidenceIds?.length) failures.push('legal long-tail: leaked unrelated evidence');
    if (!result.result?.headline?.toLocaleLowerCase('es').includes('supuesto')) failures.push('legal long-tail: did not ask for the concrete scenario');
    if (!result.result?.blocks?.some((block) => block.type === 'legal_decision_tree')) failures.push('legal long-tail: missing legal decision tree');
  } catch (error) { failures.push(`legal long-tail: ${error.message}`); }
  try {
    const result = await resolve('La vivienda va a bajar un 30 por ciento el año que viene');
    if (!['draft', 'uncovered'].includes(result.status)) failures.push(`prediction long-tail: expected provisional or unresolved guidance, received ${result.status}`);
    if (!result.result?.headline?.toLocaleLowerCase('es').includes('predic')) failures.push('prediction long-tail: did not label the forecast');
    if (result.result?.blocks?.some((block) => block.type === 'line_chart')) failures.push('prediction long-tail: presented historical context as a forecast chart');
    if (!result.result?.blocks?.some((block) => block.type === 'prediction_conditions')) failures.push('prediction long-tail: missing verification conditions');
  } catch (error) { failures.push(`prediction long-tail: ${error.message}`); }
  try {
    const result = await resolve('España tiene 48 millones de habitantes');
    if (result.status !== 'draft') failures.push(`quantity long-tail: expected draft, received ${result.status}`);
    if (!result.result?.blocks?.some((block) => block.type === 'key_number')) failures.push('quantity long-tail: missing comparable key number');
    if (!result.result?.blocks?.some((block) => block.type === 'data_finding')) failures.push('quantity long-tail: missing numeric comparison details');
  } catch (error) { failures.push(`quantity long-tail: ${error.message}`); }
  try {
    const result = await resolve('España tiene 100 millones de habitantes');
    if (result.status !== 'draft') failures.push(`mismatched quantity: expected provisional draft, received ${result.status}`);
    if (!result.result?.headline?.toLocaleLowerCase('es').includes('no coincide')) failures.push('mismatched quantity: did not show the numerical mismatch');
    if (!result.result?.blocks?.some((block) => block.type === 'cannot_conclude')) failures.push('mismatched quantity: missing explicit limitation');
  } catch (error) { failures.push(`mismatched quantity: ${error.message}`); }
  try {
    const result = await resolve('España está destruida');
    if (result.status !== 'uncovered') failures.push(`broad evaluative claim: expected uncovered, received ${result.status}`);
    if (result.result?.relatedClaims?.length || result.result?.sourceLinks?.length || result.result?.evidenceIds?.length) failures.push('broad evaluative claim: leaked unrelated evidence');
    if (!result.result?.headline?.toLocaleLowerCase('es').includes('significa')) failures.push('broad evaluative claim: did not ask to define the expression');
    if (!result.result?.blocks?.some((block) => block.type === 'strongest_valid_concern')) failures.push('broad evaluative claim: missing strongest valid concern');
    if (!result.result?.blocks?.some((block) => block.type === 'evidence_ladder')) failures.push('broad evaluative claim: missing concrete definition ladder');
  } catch (error) { failures.push(`broad evaluative claim: ${error.message}`); }
}

if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`Local resolver smoke passed: ${cases.length}${process.env.SMOKE_MEDIA === '1' ? ' + media' : ''}${process.env.SMOKE_URL === '1' ? ' + url' : ''}${process.env.SMOKE_DEDUPE === '1' ? ' + dedupe' : ''}${process.env.SMOKE_WAREHOUSE === '1' ? ' + warehouse' : ''}${process.env.SMOKE_OFFICIAL === '1' ? ' + official' : ''}${process.env.SMOKE_LONG_TAIL === '1' ? ' + long-tail' : ''} cases at ${base}`);
