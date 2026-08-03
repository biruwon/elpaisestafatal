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
  const response = await fetch(`${base}${resolvePath}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-knowledge-gap-origin': 'smoke' }, body: JSON.stringify({ text, inputType }), signal: AbortSignal.timeout(10000) });
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
  const response = await fetch(`${base}${resolvePath}`, { method: 'POST', headers: { 'x-knowledge-gap-origin': 'smoke' }, body: form, signal: AbortSignal.timeout(10000) });
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
  { text: 'El Gobierno quita 310 millones de Educación para gastos de personal de Presidencia', status: 'complete', slug: 'gobierno-transfiere-310-millones-educacion-presidencia' },
  { text: 'España gasta menos por habitante en sanidad que la Unión Europea', status: 'complete', slug: 'espana-gasta-menos-sanidad-europa' },
  { text: 'España gasta menos por habitante en pensiones que la Unión Europea', status: 'complete', slug: 'espana-gasta-menos-pensiones-europa' },
  { text: 'España cobra menos impuestos sobre la renta y la riqueza que la Unión Europea', status: 'complete', slug: 'espana-cobra-menos-impuestos-renta-riqueza-europa' },
  { text: 'España tiene menos renta mediana que la Unión Europea', status: 'complete', slug: 'espana-tiene-menor-renta-mediana-europa' },
  { text: 'España tiene menos PIB por habitante que la Unión Europea', status: 'complete', slug: 'espana-tiene-menor-pib-habitante-europa' },
  { text: 'España tiene más inflación que la Unión Europea', status: 'complete', slug: 'espana-tiene-mas-inflacion-que-europa' },
  { text: 'España tiene una tasa de empleo mayor que la Unión Europea', status: 'complete', slug: 'espana-tiene-mayor-tasa-empleo-europa' },
  { text: 'España recauda menos que la Unión Europea como porcentaje del PIB', status: 'complete', slug: 'espana-recauda-menos-que-ue' },
  { text: 'España gasta menos que la Unión Europea como porcentaje del PIB', status: 'complete', slug: 'espana-gasta-menos-que-ue' },
  { text: 'El paro registrado y el de la EPA son la misma cifra.', status: 'complete', slug: 'paro-epa-registro' },
  { text: 'La tasa de paro de la EPA bajó del 10% en el segundo trimestre de 2026.', status: 'complete', slug: 'paro-epa-t2-2026-baja-10' },
  { text: 'El desempleo EPA bajó del diez por ciento.', status: 'complete', slug: 'paro-epa-t2-2026-baja-10' },
  { text: 'España ganó 486.000 ocupados en el segundo trimestre de 2026.', status: 'complete', slug: 'ocupacion-aumenta-t2-2026' },
  { text: 'La brecha salarial de género es un mito.', status: 'complete', slug: 'brecha-salarial-genero-no-es-mito' },
  { text: 'La ley trans permite cambiar de sexo sin ningún control.', status: 'complete', slug: 'la-ley-trans-permite-cambiar-de-sexo-sin-ningun-control' },
  { text: 'La amnistía rompe la igualdad ante la ley.', status: 'complete', slug: 'la-amnistia-rompe-la-igualdad-ante-la-ley' },
  { text: 'Desalojar a un ocupante ilegal tarda años.', status: 'complete', slug: 'desalojar-a-un-ocupante-ilegal-tarda-anos' },
  { text: 'España está sufriendo un reemplazo poblacional.', status: 'complete', slug: 'espana-esta-sufriendo-un-reemplazo-poblacional' },
  { text: 'La mayoría del empleo en España es temporal.', status: 'complete', slug: 'la-mayoria-del-empleo-es-temporal' },
  { text: 'España tiene menos empleo a tiempo parcial que la Unión Europea.', status: 'complete', slug: 'espana-menos-empleo-tiempo-parcial-europa' },
  { text: 'En España sobran universitarios y faltan trabajadores de oficios.', status: 'complete', slug: 'en-espana-sobran-universitarios-y-faltan-trabajadores-de-oficios' },
  { text: 'España tiene más empleo temporal que la Unión Europea.', status: 'complete', slug: 'espana-mas-empleo-temporal-europa' },
  { text: 'España cobra menos por hora que Europa.', status: 'complete', slug: 'espana-cobra-menos-por-hora-europa' },
  { text: 'España tiene 100 millones de habitantes.', status: 'complete', slug: 'espana-no-tiene-100-millones' },
  { text: 'El 7,2% de la población soporta una sobrecarga del coste de la vivienda en España.', status: 'complete', slug: 'sobrecarga-vivienda-2025' },
  { text: 'Los hoteles subieron precios aunque las pernoctaciones bajaron en junio de 2026.', status: 'complete', slug: 'precios-hoteles-sube-junio-2026' },
  { text: 'Tener más personas ocupadas demuestra que todo el empleo es de calidad.', status: 'complete', slug: 'empleo-record-calidad' },
  { text: 'Las llegadas irregulares representan toda la inmigración que vive en España.', status: 'complete', slug: 'inmigracion-flujos-no-total' },
  { text: 'La cibercriminalidad crece más que la delincuencia convencional.', status: 'complete', slug: 'cibercriminalidad-crece' },
  { text: 'La pobreza ha desaparecido porque baja el riesgo AROPE.', status: 'complete', slug: 'riesgo-pobreza-no-desaparece' },
  { text: 'La vivienda está bajando de precio en España.', status: 'complete', slug: 'precio-vivienda-sube' },
  { text: 'Los precios de la vivienda han subido en España.', status: 'complete', slug: 'precio-vivienda-ha-subido' },
  { text: 'Los precios de la vivienda causan la crisis en España.', status: 'complete', slug: 'precios-vivienda-causan-crisis' },
  { text: 'Los alquileres son más caros que en 2015.', status: 'complete', slug: 'alquileres-suben' },
  { text: 'España está en recesión.', status: 'complete', slug: 'espana-recesion' },
  { text: 'La recaudación tributaria bajó en 2025.', status: 'complete', slug: 'recaudacion-tributaria-crece' },
  { text: 'España ha reducido el abandono escolar temprano.', status: 'complete', slug: 'abandono-escolar-temprano-baja' },
  { text: 'España tiene más abandono escolar temprano que la Unión Europea.', status: 'complete', slug: 'abandono-escolar-espana-ue' },
  { text: 'La proporción de jóvenes de 25 a 34 años con estudios superiores ha aumentado.', status: 'complete', slug: 'titulacion-superior-aumenta' },
  { text: 'España ha reducido la proporción de jóvenes que ni estudian ni trabajan.', status: 'complete', slug: 'neet-baja' },
  { text: 'Ha aumentado la proporción de personas que no reciben atención médica por una lista de espera.', status: 'complete', slug: 'necesidades-medicas-lista-espera-aumentan' },
  { text: 'El PIB por habitante en España supera los 34.000 euros.', status: 'complete', slug: 'pib-por-habitante-supera-34000' },
  { text: 'El PIB nominal de España supera 1,6 billones de euros.', status: 'complete', slug: 'pib-nominal-supera-16-billones' },
  { text: 'El salario mínimo legal mensual equivalente en España supera los 1.400 euros.', status: 'complete', slug: 'salario-minimo-supera-1400' },
  { text: 'España tiene casi 7 millones de residentes con ciudadanía extranjera.', status: 'complete', slug: 'poblacion-ciudadania-casi-7m' },
  { text: 'España tiene casi 9,5 millones de residentes nacidos en el extranjero.', status: 'complete', slug: 'poblacion-nacida-fuera-casi-10m' },
  { text: 'La deuda pública de España supera 1,6 billones de euros.', status: 'complete', slug: 'deuda-publica-supera-16-billones' },
  { text: 'La deuda pública de España ha aumentado en euros desde 2015.', status: 'complete', slug: 'deuda-publica-crece' },
  { text: 'Pedro Sánchez está destruyendo España', status: 'partial', slug: 'politica' },
  { text: 'España está destruida', status: 'uncovered', slug: 'politica' },
  { text: 'España va cuesta abajo', status: 'uncovered', slug: 'politica' },
  { text: 'El país se va a la ruina', status: 'uncovered', slug: 'politica' },
];
for (const item of cases) {
  try {
    const result = await resolve(item.text);
    if (result.status === 'processing') failures.push(`${item.text}: request remained processing after polling`);
    if (result.status !== item.status) failures.push(`${item.text}: expected ${item.status}, received ${result.status}`);
    if (item.slug && result.relatedClaims?.[0]?.slug !== item.slug) failures.push(`${item.text}: expected primary ${item.slug}`);
    const guidanceTypes = new Set(['strongest_valid_concern', 'evidence_ladder', 'legal_decision_tree', 'prediction_conditions', 'trade_offs', 'group_comparison_requirements']);
    const guidanceBlockTypes = (result.result?.blocks || []).map((block) => block.type).filter((type) => guidanceTypes.has(type));
    if (new Set(guidanceBlockTypes).size !== guidanceBlockTypes.length) failures.push(`${item.text}: result repeated a guidance block type (${guidanceBlockTypes.join(', ')})`);
    if (item.slug && item.status === 'complete' && !result.result?.blocks?.some((block) => block.type === 'confirmed' && block.propositionIds?.length)) failures.push(`${item.text}: published result did not retain proposition traceability`);
    if (item.slug === 'precios-hoteles-sube-junio-2026' && !result.result?.blocks?.some((block) => block.type === 'comparison_chart' && block.visualId === item.slug)) failures.push(`${item.text}: published tourism result did not retain its signed comparison visual`);
    if (['la-ley-trans-permite-cambiar-de-sexo-sin-ningun-control', 'la-amnistia-rompe-la-igualdad-ante-la-ley', 'desalojar-a-un-ocupante-ilegal-tarda-anos'].includes(item.slug) && !result.result?.blocks?.some((block) => block.type === 'legal_decision_tree' && block.items?.some((entry) => entry.status === 'known'))) failures.push(`${item.text}: published legal result did not retain its decision path`);
    if (item.slug === 'espana-esta-sufriendo-un-reemplazo-poblacional' && !result.result?.blocks?.some((block) => block.type === 'evidence_ladder' && block.steps?.some((step) => step.status === 'missing'))) failures.push(`${item.text}: population-replacement result did not retain its evidence ladder`);
    if (item.slug === 'espana-esta-sufriendo-un-reemplazo-poblacional' && !result.result?.headline?.toLocaleLowerCase('es').includes('cambios demográficos')) failures.push(`${item.text}: population-replacement result did not lead with the evidence distinction`);
    if (item.text.toLocaleLowerCase().includes('destruyendo españa') && !result.result?.blocks?.some((block) => block.type === 'evidence_ladder')) failures.push(`${item.text}: related political guidance did not retain its structured method plan`);
    if (!item.slug && result.relatedClaims?.length) failures.push(`${item.text}: unrelated alternatives returned (${result.relatedClaims.map((claim) => claim.slug).join(', ')})`);
    if (['España está destruida', 'España va cuesta abajo', 'El país se va a la ruina'].includes(item.text) && result.relatedClaims?.some((claim) => claim.kind !== 'topic')) failures.push(`${item.text}: broad political guidance returned a non-topic claim`);
    if (['España está destruida', 'España va cuesta abajo', 'El país se va a la ruina'].includes(item.text) && /transferencia|recorte educativo|presidencia|recesion|pib real/i.test(`${result.result?.headline || ''} ${result.result?.summary || ''}`)) failures.push(`${item.text}: broad political guidance inherited unrelated economic or budget evidence`);
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
    const result = await resolve('Cómo ha cambiado el precio de la luz para los hogares');
    if (!['draft', 'partial'].includes(result.status)) failures.push(`electricity warehouse: expected provisional result, received ${result.status}`);
    if (result.result?.warehouseSeries?.metricId !== 'household_electricity_price') failures.push('electricity warehouse: selected the wrong metric family');
    if (!result.result?.warehouseSeries?.values?.length || result.result.warehouseSeries.values.length < 2) failures.push('electricity warehouse: missing a multi-period series');
    if (result.result?.warehouseSeries?.unit !== '€ por kWh') failures.push('electricity warehouse: did not localize the unit');
  } catch (error) { failures.push(`electricity warehouse: ${error.message}`); }
  try {
    const result = await resolve('La electricidad es más cara para las familias');
    if (!['draft', 'partial'].includes(result.status)) failures.push(`electricity-language warehouse: expected provisional result, received ${result.status}`);
    if (result.result?.warehouseSeries?.metricId !== 'household_electricity_price') failures.push('electricity-language warehouse: failed to route an informal family phrasing');
  } catch (error) { failures.push(`electricity-language warehouse: ${error.message}`); }
  try {
    const result = await resolve('Cómo han subido los alquileres en España');
    const published = result.status === 'complete' && result.relatedClaims?.[0]?.slug === 'alquileres-suben';
    if (!published && !['draft', 'partial'].includes(result.status)) failures.push(`rental warehouse: expected a published or provisional result, received ${result.status}`);
    if (published) {
      if (!result.result?.blocks?.some((block) => block.type === 'line_chart' && block.visualId === 'alquileres-suben')) failures.push('rental warehouse: published result lost its signed trend visual');
    } else {
      if (result.result?.warehouseSeries?.metricId !== 'rental_price_index') failures.push('rental warehouse: selected the wrong metric family');
      if (!result.result?.warehouseSeries?.values?.length || result.result.warehouseSeries.values.length < 2) failures.push('rental warehouse: missing a multi-period series');
      if (result.result?.warehouseSeries?.unit !== 'índice (2015=100)') failures.push('rental warehouse: did not localize the unit');
    }
  } catch (error) { failures.push(`rental warehouse: ${error.message}`); }
  try {
    const result = await resolve('Cuál es la inflación anual en España');
    if (!['draft', 'partial'].includes(result.status)) failures.push(`inflation warehouse: expected provisional result, received ${result.status}`);
    if (result.result?.warehouseSeries?.metricId !== 'inflation_rate') failures.push('inflation warehouse: selected the wrong metric family');
    if (!result.result?.warehouseSeries?.values?.length || result.result.warehouseSeries.values.length < 2) failures.push('inflation warehouse: missing a multi-period series');
    if (result.result?.warehouseSeries?.unit !== '% interanual') failures.push('inflation warehouse: did not localize the unit');
    if (String(result.result?.warehouseSeries?.labels?.at(-1) || '') < '2025') failures.push('inflation warehouse: candidate cap truncated the recent periods');
  } catch (error) { failures.push(`inflation warehouse: ${error.message}`); }
  for (const [text, metricId, unit] of [
    ['Porcentaje de la población activa que encuentra trabajo', 'employment_rate', '%'],
    ['Evolución del desempleo en España', 'unemployment_rate', '%'],
    ['¿Qué parte del empleo es a tiempo parcial en España?', 'part_time_employment_rate', '%'],
    ['¿España tiene más empleo parcial que Europa?', 'part_time_employment_rate_europe', '%'],
    ['¿Qué parte del empleo en España es temporal?', 'temporary_employment_rate', '%'],
    ['¿España tiene más temporalidad que Europa?', 'temporary_employment_rate_europe', '%'],
    ['¿Cuál es el salario mediano por hora en España?', 'median_hourly_earnings', '€ por hora'],
    ['¿España cobra menos por hora que Europa?', 'median_hourly_earnings_europe', '€ por hora'],
    ['¿España tiene más sobrecarga de vivienda que Europa?', 'housing_cost_overburden_rate_europe', '% de la población'],
    ['Cuántos habitantes viven normalmente en España', 'resident_population', 'personas'],
    ['Cuántos residentes nacieron fuera de España', 'foreign_born_population', 'personas'],
    ['Cuántos residentes tienen ciudadanía extranjera en España', 'foreign_citizenship_population', 'personas'],
    ['Cuántas personas inmigraron a España durante el último año', 'immigration_flows', 'personas'],
    ['Cuál es el tamaño de la economía española', 'gdp_current_prices', 'millones de euros'],
    ['Cómo ha cambiado el PIB por habitante en España', 'gdp_per_capita_current_prices', '€ por habitante'],
    ['¿Cómo ha cambiado el salario mínimo en España?', 'minimum_wage_monthly', '€ al mes'],
    ['¿Cuánto gasta España en prestaciones de protección social por habitante?', 'social_protection_benefits_per_capita', '€ por habitante'],
    ['¿Cuánto gasta España en pensiones y prestaciones de supervivencia por habitante?', 'old_age_survivors_benefits_per_capita', '€ por habitante'],
  ]) {
    try {
      const result = await resolve(text);
      if (!['draft', 'partial'].includes(result.status)) failures.push(`${metricId} warehouse: expected provisional result, received ${result.status}`);
      if (result.result?.warehouseSeries?.metricId !== metricId) failures.push(`${metricId} warehouse: selected the wrong metric family`);
      if (!result.result?.warehouseSeries?.values?.length || result.result.warehouseSeries.values.length < 2) failures.push(`${metricId} warehouse: missing a multi-period series`);
      if (result.result?.warehouseSeries?.unit !== unit) failures.push(`${metricId} warehouse: did not localize the unit`);
    } catch (error) { failures.push(`${metricId} warehouse: ${error.message}`); }
  }
  try {
    const result = await resolve('¿España gasta más por habitante en pensiones que la Unión Europea?');
    if (!['draft', 'partial'].includes(result.status)) failures.push(`old-age pension Europe warehouse: expected provisional result, received ${result.status}`);
    if (result.result?.warehouseSeries?.metricId !== 'old_age_survivors_benefits_per_capita_europe') failures.push('old-age pension Europe warehouse: selected the wrong metric family');
    if (!result.result?.warehouseSeries?.values?.length || result.result.warehouseSeries.values.length !== 2) failures.push('old-age pension Europe warehouse: missing the Spain/EU comparison observations');
    if (!result.result?.blocks?.some((block) => block.type === 'comparison_chart')) failures.push('old-age pension Europe warehouse: did not render a comparison visual');
    if (!/pension|vejez/i.test(`${result.result?.summary || ''} ${result.result?.reply || ''}`)) failures.push('old-age pension Europe warehouse: lost the pension-specific explanation');
  } catch (error) { failures.push(`old-age pension Europe warehouse: ${error.message}`); }
  try {
    const result = await resolve('¿España cobra más impuestos sobre renta y riqueza que la Unión Europea?');
    if (!['draft', 'partial'].includes(result.status)) failures.push(`current-taxes Europe warehouse: expected provisional result, received ${result.status}`);
    if (result.result?.warehouseSeries?.metricId !== 'government_current_taxes_income_wealth_europe') failures.push('current-taxes Europe warehouse: selected the wrong metric family');
    if (!result.result?.warehouseSeries?.values?.length || result.result.warehouseSeries.values.length !== 2) failures.push('current-taxes Europe warehouse: missing the Spain/EU comparison observations');
    if (!result.result?.blocks?.some((block) => block.type === 'comparison_chart')) failures.push('current-taxes Europe warehouse: did not render a comparison visual');
    if (!/impuestos|renta|riqueza/i.test(`${result.result?.summary || ''} ${result.result?.reply || ''}`)) failures.push('current-taxes Europe warehouse: lost the tax-specific explanation');
  } catch (error) { failures.push(`current-taxes Europe warehouse: ${error.message}`); }
  try {
    const result = await resolve('Madrid tiene más densidad que Andalucía');
    const series = result.result?.warehouseSeries;
    const published = result.status === 'complete' && result.relatedClaims?.[0]?.slug === 'densidad-madrid-andalucia';
    if (!published && !['draft', 'partial'].includes(result.status)) failures.push(`regional comparison: expected a published or provisional result, received ${result.status}`);
    if (published) {
      if (!result.result?.blocks?.some((block) => block.type === 'comparison' || block.type === 'comparison_chart')) failures.push('published regional comparison: lost the comparison visual');
      if (!/885,8/.test(JSON.stringify(result.result)) || !/99,7/.test(JSON.stringify(result.result))) failures.push('published regional comparison: lost the reviewed regional values');
    } else {
      if (series?.metricId !== 'regional_population_density') failures.push('regional comparison: selected the wrong metric family');
      if (!series || series.labels.length !== 2 || !series.labels.some((label) => /Madrid/i.test(label)) || !series.labels.some((label) => /Andaluc[ií]a/i.test(label))) failures.push('regional comparison: did not isolate both requested autonomous communities');
      if (!result.result?.blocks?.some((block) => block.type === 'comparison_chart' && block.visualId === 'warehouse-observation')) failures.push('regional comparison: did not render a comparison visual');
      if (!/frente a/i.test(result.result?.headline || '') || !/personas por km/i.test(result.result?.summary || '')) failures.push('regional comparison: public answer lost the explicit territory comparison or unit');
    }
  } catch (error) { failures.push(`regional comparison: ${error.message}`); }
  try {
    const result = await resolve('¿Qué comunidad tiene mayor densidad de población?');
    if (!['draft', 'partial'].includes(result.status)) failures.push(`regional density ranking: expected provisional result, received ${result.status}`);
    if (result.result?.warehouseSeries?.metricId !== 'regional_population_density') failures.push('regional density ranking: selected an unrelated metric family');
    if (!/mayor densidad/i.test(result.result?.headline || '') || !/Comunidad de Madrid/i.test(result.result?.summary || '')) failures.push('regional density ranking: did not identify the highest-density region');
    if (!result.result?.blocks?.some((block) => block.type === 'comparison_chart')) failures.push('regional density ranking: did not render a comparison visual');
  } catch (error) { failures.push(`regional density ranking: ${error.message}`); }
  try {
    const result = await resolve('Cómo han evolucionado los homicidios registrados en España');
    if (!['draft', 'partial'].includes(result.status)) failures.push(`recorded crime warehouse: expected provisional result, received ${result.status}`);
    if (result.result?.warehouseSeries?.metricId !== 'recorded_offences') failures.push('recorded crime warehouse: selected the wrong metric family');
    if (!result.result?.warehouseSeries?.values?.length || result.result.warehouseSeries.values.length < 2) failures.push('recorded crime warehouse: missing a multi-period series');
    if (result.result?.warehouseSeries?.unit !== 'delitos registrados') failures.push('recorded crime warehouse: did not localize the unit');
    if (!/homicidios.*registrados/i.test(`${result.result?.headline || ''} ${result.result?.warehouseSeries?.label || ''}`)) failures.push('recorded crime warehouse: lost the requested offence category in the public label');
  } catch (error) { failures.push(`recorded crime warehouse: ${error.message}`); }
  for (const [text, label] of [
    ['Cómo han evolucionado los robos registrados en España', /robos con violencia registrados/i],
    ['Cómo han evolucionado las estafas registradas en España', /fraudes registrados/i],
    ['Cómo han evolucionado las agresiones sexuales registradas en España', /agresiones sexuales registrados/i],
  ]) {
    try {
      const result = await resolve(text);
      if (!['draft', 'partial'].includes(result.status)) failures.push(`recorded category warehouse (${text}): expected provisional result, received ${result.status}`);
      if (result.result?.warehouseSeries?.metricId !== 'recorded_offences') failures.push(`recorded category warehouse (${text}): selected the wrong metric family`);
      if (!result.result?.warehouseSeries?.values?.length || result.result.warehouseSeries.values.length < 2) failures.push(`recorded category warehouse (${text}): missing a multi-period series`);
      if (!label.test(`${result.result?.headline || ''} ${result.result?.warehouseSeries?.label || ''}`)) failures.push(`recorded category warehouse (${text}): lost the requested category in the public label`);
    } catch (error) { failures.push(`recorded category warehouse (${text}): ${error.message}`); }
  }
  try {
    const result = await resolve('Cómo ha evolucionado la criminalidad registrada en España');
    if (result.result?.warehouseSeries?.metricId === 'recorded_offences') failures.push('broad recorded crime: exposed an arbitrary offence category');
    if (!/debe concretarse por categoría/i.test(result.result?.headline || '')) failures.push('broad recorded crime: did not explain why the category is required');
  } catch (error) { failures.push(`broad recorded crime: ${error.message}`); }
  try {
    const result = await resolve('precios de la vivienda en España');
    const series = result.result?.warehouseSeries;
    const published = result.status === 'complete' && result.relatedClaims?.[0]?.slug === 'precio-vivienda-ha-subido';
    if (!published && !['draft', 'partial'].includes(result.status)) failures.push(`warehouse: expected a provisional result, received ${result.status}`);
    if (published && !result.result?.blocks?.some((block) => block.type === 'confirmed' && block.propositionIds?.length)) failures.push('published housing result: lost proposition traceability');
    if (!published && (!series || series.values.length < 2 || series.values.length !== series.labels.length)) failures.push('warehouse: expected a traceable multi-period series');
    if (!published && new Set(series?.labels || []).size !== (series?.labels || []).length) failures.push('warehouse: mixed incompatible observations into one time series');
    if (!published && String(series?.unit || '').toLocaleLowerCase().includes('rate of change')) failures.push('warehouse: selected a rate-of-change series for a level-price query');
  } catch (error) { failures.push(`warehouse: ${error.message}`); }
  for (const [text, metricId, publishedSlug] of [
    ['precios vivienda España', 'house_price_index', 'precio-vivienda-ha-subido'],
    ['crecimiento interanual PIB real España', 'gdp_real_growth_quarterly'],
    ['porcentaje hogares soporta sobrecarga coste vivienda', 'housing_cost_overburden_rate'],
  ]) {
    try {
      const result = await resolve(text);
      const published = publishedSlug && result.status === 'complete' && result.relatedClaims?.[0]?.slug === publishedSlug;
      if (!published && !['draft', 'partial'].includes(result.status)) failures.push(`${metricId} shorthand: expected provisional result, received ${result.status}`);
      if (!published && result.result?.warehouseSeries?.metricId !== metricId) failures.push(`${metricId} shorthand: selected the wrong metric family`);
      if (/quarterly index|chain linked volumes|percentage of population|gross domestic product/i.test(JSON.stringify(result.result || {}))) failures.push(`${metricId} shorthand: leaked raw warehouse unit text`);
    } catch (error) { failures.push(`${metricId} shorthand: ${error.message}`); }
  }
  try {
    const result = await resolve('Cuál fue el crecimiento interanual del PIB real de España en el último trimestre');
    if (!['draft', 'partial'].includes(result.status)) failures.push(`real GDP warehouse: expected provisional result, received ${result.status}`);
    if (result.result?.warehouseSeries?.metricId !== 'gdp_real_growth_quarterly') failures.push('real GDP warehouse: selected the wrong metric family');
    if (!result.result?.sourceLinks?.some((source) => /eurostat/i.test(`${source.title} ${source.url}`))) failures.push('real GDP warehouse: missing Eurostat source trail');
    if (/gross domestic|quarterly data/i.test(result.result?.headline || '')) failures.push('real GDP warehouse: leaked raw dataset title into the public headline');
  } catch (error) { failures.push(`real GDP warehouse: ${error.message}`); }
  try {
    const result = await resolve('¿Crece España más que la Unión Europea?');
    if (!['draft', 'partial'].includes(result.status)) failures.push(`Spain/EU GDP comparison: expected provisional result, received ${result.status}`);
    if (result.result?.warehouseSeries?.metricId !== 'gdp_real_growth_europe') failures.push('Spain/EU GDP comparison: selected the Spain-only GDP family');
    if (result.result?.warehouseSeries?.unit !== '% interanual') failures.push('Spain/EU GDP comparison: did not localize the comparison unit');
    if (!/España.*Unión Europea|Unión Europea.*España/i.test(`${result.result?.headline || ''} ${result.result?.summary || ''}`)) failures.push('Spain/EU GDP comparison: lost the named comparison in the public answer');
    if (!/España creció más|por encima de/i.test(`${result.result?.summary || ''} ${result.result?.blocks?.map((block) => JSON.stringify(block)).join(' ') || ''}`)) failures.push('Spain/EU GDP comparison: did not calculate the direction of the comparison');
    if (!result.result?.blocks?.some((block) => block.type === 'comparison_chart')) failures.push('Spain/EU GDP comparison: did not render a comparison visual');
  } catch (error) { failures.push(`Spain/EU GDP comparison: ${error.message}`); }
  try {
    const result = await resolve('¿Tiene España más PIB por habitante que la Unión Europea?');
    if (!['draft', 'partial'].includes(result.status)) failures.push('Spain/EU GDP-per-capita comparison: expected provisional result, received ' + result.status);
    if (result.result?.warehouseSeries?.metricId !== 'gdp_per_capita_europe') failures.push('Spain/EU GDP-per-capita comparison: selected the wrong metric family');
    if (result.result?.warehouseSeries?.unit !== 'PPS por habitante') failures.push('Spain/EU GDP-per-capita comparison: did not localize the comparison unit');
    if (!/España.*Unión Europea|Unión Europea.*España/i.test(`${result.result?.headline || ''} ${result.result?.summary || ''}`)) failures.push('Spain/EU GDP-per-capita comparison: lost the named comparison in the public answer');
    if (!/PIB por habitante español fue más bajo|por debajo de/i.test(`${result.result?.summary || ''} ${result.result?.blocks?.map((block) => JSON.stringify(block)).join(' ') || ''}`)) failures.push('Spain/EU GDP-per-capita comparison: did not calculate the direction of the comparison');
    if (!result.result?.blocks?.some((block) => block.type === 'comparison_chart')) failures.push('Spain/EU GDP-per-capita comparison: did not render a comparison visual');
  } catch (error) { failures.push(`Spain/EU GDP-per-capita comparison: ${error.message}`); }
  try {
    const result = await resolve('¿Está la inflación de España por encima de la Unión Europea?');
    if (!['draft', 'partial'].includes(result.status)) failures.push(`Spain/EU inflation comparison: expected provisional result, received ${result.status}`);
    if (result.result?.warehouseSeries?.metricId !== 'inflation_rate_europe') failures.push('Spain/EU inflation comparison: selected the Spain-only inflation family');
    if (result.result?.warehouseSeries?.unit !== '% interanual') failures.push('Spain/EU inflation comparison: did not localize the comparison unit');
    if (!/España.*Unión Europea|Unión Europea.*España/i.test(`${result.result?.headline || ''} ${result.result?.summary || ''}`)) failures.push('Spain/EU inflation comparison: lost the named comparison in the public answer');
    if (!/inflación española fue más alta|por encima de/i.test(`${result.result?.summary || ''} ${result.result?.blocks?.map((block) => JSON.stringify(block)).join(' ') || ''}`)) failures.push('Spain/EU inflation comparison: did not calculate the direction of the comparison');
    if (!result.result?.blocks?.some((block) => block.type === 'comparison_chart')) failures.push('Spain/EU inflation comparison: did not render a comparison visual');
  } catch (error) { failures.push(`Spain/EU inflation comparison: ${error.message}`); }
  try {
    const result = await resolve('¿Tiene España una tasa de empleo mayor que la Unión Europea?');
    if (!['draft', 'partial'].includes(result.status)) failures.push(`Spain/EU employment comparison: expected provisional result, received ${result.status}`);
    if (result.result?.warehouseSeries?.metricId !== 'employment_rate_europe') failures.push('Spain/EU employment comparison: selected the Spain-only employment family');
    if (result.result?.warehouseSeries?.unit !== '%') failures.push('Spain/EU employment comparison: did not localize the comparison unit');
    if (!/España.*Unión Europea|Unión Europea.*España/i.test(`${result.result?.headline || ''} ${result.result?.summary || ''}`)) failures.push('Spain/EU employment comparison: lost the named comparison in the public answer');
    if (!/tasa de empleo española fue más baja|por debajo de/i.test(`${result.result?.summary || ''} ${result.result?.blocks?.map((block) => JSON.stringify(block)).join(' ') || ''}`)) failures.push('Spain/EU employment comparison: did not calculate the direction of the comparison');
    if (!result.result?.blocks?.some((block) => block.type === 'comparison_chart')) failures.push('Spain/EU employment comparison: did not render a comparison visual');
  } catch (error) { failures.push(`Spain/EU employment comparison: ${error.message}`); }
  for (const [text, metricId, unit, direction] of [
    ['¿España recauda más o menos que la media de la Unión Europea?', 'government_revenue_ratio_europe', '% del PIB', 'ingresos públicos españoles fueron más bajos'],
    ['¿España gasta más o menos que la media de la Unión Europea?', 'government_expenditure_ratio_europe', '% del PIB', 'gasto público español fue más bajo'],
    ['¿España gasta menos en educación que la Unión Europea?', 'government_education_expenditure_ratio_europe', '% del PIB', 'gasto español en educación fue más bajo'],
    ['Comparación europea del empleo a tiempo parcial', 'part_time_employment_rate_europe', '%', 'proporción española fue más baja'],
    ['Comparación europea del empleo temporal', 'temporary_employment_rate_europe', '%', 'proporción española fue más alta'],
    ['¿España gasta más por habitante en sanidad que la Unión Europea?', 'health_expenditure_per_capita_europe', '€ por habitante', 'gasto sanitario por habitante español fue más bajo'],
    ['¿España tiene más renta mediana que la Unión Europea?', 'median_equivalised_income_europe', 'PPS por persona', 'renta mediana española fue más baja'],
  ]) {
    try {
      const result = await resolve(text);
      if (!['draft', 'partial'].includes(result.status)) failures.push(`Spain/EU ${metricId} comparison: expected provisional result, received ${result.status}`);
      if (result.result?.warehouseSeries?.metricId !== metricId) failures.push(`Spain/EU ${metricId} comparison: selected the wrong metric family`);
      if (result.result?.warehouseSeries?.unit !== unit) failures.push(`Spain/EU ${metricId} comparison: did not localize the comparison unit`);
      if (!/España.*Unión Europea|Unión Europea.*España/i.test(`${result.result?.headline || ''} ${result.result?.summary || ''}`)) failures.push(`Spain/EU ${metricId} comparison: lost the named comparison in the public answer`);
      if (!new RegExp(direction).test(`${result.result?.summary || ''} ${result.result?.blocks?.map((block) => JSON.stringify(block)).join(' ') || ''}`)) failures.push(`Spain/EU ${metricId} comparison: did not calculate the direction of the comparison`);
      if (!result.result?.blocks?.some((block) => block.type === 'comparison_chart')) failures.push(`Spain/EU ${metricId} comparison: did not render a comparison visual`);
      if (metricId === 'government_education_expenditure_ratio_europe' && !/no es gasto por alumno|no mide resultados/i.test(JSON.stringify(result.result || {}))) failures.push('Spain/EU education spending comparison: lost the education-specific limitation');
    } catch (error) { failures.push(`Spain/EU ${metricId} comparison: ${error.message}`); }
  }
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
    const result = await resolve('¿Cuánto debe España en euros?');
    if (!['draft', 'partial'].includes(result.status)) failures.push(`absolute public debt warehouse: expected provisional result, received ${result.status}`);
    if (result.result?.warehouseSeries?.metricId !== 'government_debt_current_prices') failures.push('absolute public debt warehouse: selected the ratio instead of the debt stock');
    if (!result.result?.warehouseSeries?.values?.length || result.result.warehouseSeries.values.length < 2) failures.push('absolute public debt warehouse: missing a multi-period series');
    if (result.result?.warehouseSeries?.unit !== 'millones de euros') failures.push('absolute public debt warehouse: did not localize the unit');
  } catch (error) { failures.push(`absolute public debt warehouse: ${error.message}`); }
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
    const published = result.status === 'complete' && result.relatedClaims?.[0]?.slug === 'sobrecarga-vivienda-2025';
    if (!published && !['draft', 'partial'].includes(result.status)) failures.push(`housing affordability warehouse: expected provisional result, received ${result.status}`);
    if (published && !result.result?.blocks?.some((block) => block.type === 'confirmed' && block.propositionIds?.length)) failures.push('published housing affordability result: lost proposition traceability');
    if (!published && result.result?.warehouseSeries?.metricId !== 'housing_cost_overburden_rate') failures.push('housing affordability warehouse: selected the wrong metric family');
    if (!published && (!result.result?.warehouseSeries?.values?.length || result.result.warehouseSeries.values.length < 2)) failures.push('housing affordability warehouse: missing a multi-period series');
    if (!published && /housing cost overburden rate by age/i.test(result.result?.headline || '')) failures.push('housing affordability warehouse: leaked raw dataset title into the public headline');
  } catch (error) { failures.push(`housing affordability warehouse: ${error.message}`); }
  try {
    const result = await resolve('Cuánto se gasta en sanidad por habitante en España');
    const publishedHealthClaim = result.status === 'complete' && result.relatedClaims?.[0]?.slug === 'gasto-sanitario-habitante-sube';
    if (!publishedHealthClaim && !['draft', 'partial'].includes(result.status)) failures.push(`health expenditure warehouse: expected provisional result, received ${result.status}`);
    if (!publishedHealthClaim && result.result?.warehouseSeries?.metricId !== 'health_expenditure_per_capita') failures.push('health expenditure warehouse: selected the wrong metric family');
    if (!publishedHealthClaim && (!result.result?.warehouseSeries?.values?.length || result.result.warehouseSeries.values.length < 2)) failures.push('health expenditure warehouse: missing a multi-period series');
    if (/health care expenditure by financing scheme/i.test(result.result?.headline || '')) failures.push('health expenditure warehouse: leaked raw dataset title into the public headline');
  } catch (error) { failures.push(`health expenditure warehouse: ${error.message}`); }
  try {
    const result = await resolve('Cuánto gasta sanidad habitante España');
    if (!['draft', 'partial'].includes(result.status)) failures.push(`conversational health expenditure: expected provisional result, received ${result.status}`);
    if (result.result?.warehouseSeries?.metricId !== 'health_expenditure_per_capita') failures.push('conversational health expenditure: selected the wrong metric family');
  } catch (error) { failures.push(`conversational health expenditure: ${error.message}`); }
  try {
    const result = await resolve('Cuánto dinero se dedica por persona a la sanidad');
    if (!['draft', 'partial'].includes(result.status)) failures.push(`colloquial health expenditure: expected provisional result, received ${result.status}`);
    if (result.result?.warehouseSeries?.metricId !== 'health_expenditure_per_capita') failures.push('colloquial health expenditure: selected the wrong metric family');
  } catch (error) { failures.push(`colloquial health expenditure: ${error.message}`); }
  try {
    const result = await resolve('Cuánto debe España');
    if (!['draft', 'partial'].includes(result.status)) failures.push(`colloquial public debt: expected provisional result, received ${result.status}`);
    if (result.result?.warehouseSeries?.metricId !== 'government_debt_ratio') failures.push('colloquial public debt: selected the wrong metric family');
  } catch (error) { failures.push(`colloquial public debt: ${error.message}`); }
  try {
    const result = await resolve('Porcentaje de residentes AROPE en España');
    if (!['draft', 'partial'].includes(result.status)) failures.push(`AROPE resident percentage: expected provisional result, received ${result.status}`);
    if (result.result?.warehouseSeries?.metricId !== 'arope_rate') failures.push('AROPE resident percentage: selected the wrong metric family');
  } catch (error) { failures.push(`AROPE resident percentage: ${error.message}`); }
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
    const result = await resolve('Cuál fue la tasa de crecimiento de la población de España');
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
    const result = await resolve('Cuánto ingresan de media los hogares');
    if (!['draft', 'partial'].includes(result.status)) failures.push(`colloquial median income: expected provisional result, received ${result.status}`);
    if (result.result?.warehouseSeries?.metricId !== 'median_equivalised_income') failures.push('colloquial median income: selected the wrong metric family');
  } catch (error) { failures.push(`colloquial median income: ${error.message}`); }
  try {
    const result = await resolve('Qué porcentaje de jóvenes activos está en paro en España');
    if (!['draft', 'partial'].includes(result.status)) failures.push(`youth unemployment warehouse: expected provisional result, received ${result.status}`);
    if (result.result?.warehouseSeries?.metricId !== 'youth_unemployment_rate') failures.push('youth unemployment warehouse: selected the wrong metric family');
    if (!result.result?.warehouseSeries?.values?.length || result.result.warehouseSeries.values.length < 2) failures.push('youth unemployment warehouse: missing a multi-period series');
    if (/unemployment by sex and age/i.test(result.result?.headline || '')) failures.push('youth unemployment warehouse: leaked raw dataset title into the public headline');
  } catch (error) { failures.push(`youth unemployment warehouse: ${error.message}`); }
  try {
    const result = await resolve('¿Tiene España más paro juvenil que la Unión Europea?');
    if (!['draft', 'partial'].includes(result.status)) failures.push(`Spain/EU youth unemployment: expected provisional result, received ${result.status}`);
    if (result.result?.warehouseComparison?.metricId !== 'youth_unemployment_rate_europe') failures.push('Spain/EU youth unemployment: selected the wrong metric family');
    if (!result.result?.warehouseComparison?.reply?.includes('tasa de paro juvenil española fue más alta')) failures.push('Spain/EU youth unemployment: comparison reply did not use the youth-specific wording');
  } catch (error) { failures.push(`Spain/EU youth unemployment: ${error.message}`); }
  try {
    const result = await resolve('¿Tiene España más abandono escolar temprano que la Unión Europea?');
    if (!['draft', 'partial'].includes(result.status)) failures.push(`Spain/EU early school leaving: expected provisional result, received ${result.status}`);
    if (result.result?.warehouseComparison?.metricId !== 'early_school_leaving_rate_europe') failures.push('Spain/EU early school leaving: selected the wrong metric family');
    if (!result.result?.warehouseComparison?.reply?.includes('tasa española de abandono escolar temprano fue más alta')) failures.push('Spain/EU early school leaving: comparison reply did not use the education-specific wording');
  } catch (error) { failures.push(`Spain/EU early school leaving: ${error.message}`); }
  try {
    const result = await resolve('¿España tiene más titulados superiores que la Unión Europea?');
    if (!['draft', 'partial'].includes(result.status)) failures.push(`Spain/EU tertiary attainment: expected provisional result, received ${result.status}`);
    if (result.result?.warehouseComparison?.metricId !== 'tertiary_education_attainment_rate_europe') failures.push('Spain/EU tertiary attainment: selected the wrong metric family');
    if (!result.result?.warehouseComparison?.reply?.includes('proporción española fue más alta')) failures.push('Spain/EU tertiary attainment: comparison reply did not preserve the education-attainment wording');
  } catch (error) { failures.push(`Spain/EU tertiary attainment: ${error.message}`); }
  try {
    const result = await resolve('¿España tiene más ninis que la Unión Europea?');
    if (!['draft', 'partial'].includes(result.status)) failures.push(`Spain/EU NEET: expected provisional result, received ${result.status}`);
    if (result.result?.warehouseComparison?.metricId !== 'neet_rate_europe') failures.push('Spain/EU NEET: selected the wrong metric family');
    if (!result.result?.warehouseComparison?.reply?.includes('tasa española fue más alta')) failures.push('Spain/EU NEET: comparison reply did not preserve the NEET wording');
  } catch (error) { failures.push(`Spain/EU NEET: ${error.message}`); }
  try {
    const result = await resolve('¿España tiene más riesgo de pobreza o exclusión que la Unión Europea?');
    if (!['draft', 'partial'].includes(result.status)) failures.push(`Spain/EU AROPE: expected provisional result, received ${result.status}`);
    if (result.result?.warehouseComparison?.metricId !== 'arope_rate_europe') failures.push('Spain/EU AROPE: selected the wrong metric family');
    if (!result.result?.warehouseComparison?.reply?.includes('tasa española fue más alta')) failures.push('Spain/EU AROPE: comparison reply did not preserve the composite-indicator wording');
  } catch (error) { failures.push(`Spain/EU AROPE: ${error.message}`); }
  try {
    const result = await resolve('¿España vive más que Europa?');
    if (result.status !== 'complete') failures.push(`Spain/EU life expectancy: expected complete, received ${result.status}`);
    if (result.relatedClaims?.[0]?.slug !== 'esperanza-vida-espana-ue') failures.push('Spain/EU life expectancy: did not route to the reviewed claim');
    if (!result.result?.blocks?.some((block) => block.type === 'comparison_chart')) failures.push('Spain/EU life expectancy: comparison visual missing');
    if (!/84,0/.test(JSON.stringify(result.result)) || !/81,5/.test(JSON.stringify(result.result))) failures.push('Spain/EU life expectancy: lost the reviewed values');
  } catch (error) { failures.push(`Spain/EU life expectancy: ${error.message}`); }
  try {
    const result = await resolve('¿España tiene más espera sanitaria que Europa?');
    if (result.status !== 'complete') failures.push(`Spain/EU healthcare access: expected complete, received ${result.status}`);
    if (result.relatedClaims?.[0]?.slug !== 'necesidades-medicas-lista-espera-espana-ue') failures.push('Spain/EU healthcare access: did not route to the reviewed claim');
    if (!result.result?.blocks?.some((block) => block.type === 'comparison_chart')) failures.push('Spain/EU healthcare access: comparison visual missing');
    if (!/1,6/.test(JSON.stringify(result.result)) || !/1,2/.test(JSON.stringify(result.result))) failures.push('Spain/EU healthcare access: lost the reviewed values');
  } catch (error) { failures.push(`Spain/EU healthcare access: ${error.message}`); }
  try {
    const result = await resolve('¿España paga más por la luz que Europa?');
    if (result.status !== 'complete') failures.push(`Spain/EU household electricity: expected complete, received ${result.status}`);
    if (result.relatedClaims?.[0]?.slug !== 'electricidad-espana-europa') failures.push('Spain/EU household electricity: did not route to the reviewed claim');
    if (!result.result?.blocks?.some((block) => block.type === 'comparison_chart')) failures.push('Spain/EU household electricity: comparison visual missing');
    if (!/0,2872/.test(JSON.stringify(result.result)) || !/0,2942/.test(JSON.stringify(result.result))) failures.push('Spain/EU household electricity: lost the reviewed values');
  } catch (error) { failures.push(`Spain/EU household electricity: ${error.message}`); }
  try {
  const result = await resolve('El salario mínimo ha subido en España');
    if (!['draft', 'partial'].includes(result.status)) failures.push(`minimum wage warehouse: expected provisional result, received ${result.status}`);
    if (result.result?.warehouseSeries?.metricId !== 'minimum_wage_monthly') failures.push('minimum wage warehouse: selected the wrong metric family');
    if (result.result?.warehouseSeries?.labels?.[0] !== 'primer semestre de 2021') failures.push('minimum wage warehouse: chart omitted the series baseline');
    if (result.result?.warehouseSeries?.labels?.at(-1) !== 'segundo semestre de 2026') failures.push('minimum wage warehouse: chart omitted the latest period');
  } catch (error) { failures.push(`minimum wage warehouse: ${error.message}`); }
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
    if (!result.result?.headline?.toLocaleLowerCase('es').includes('transferencia')) failures.push('official transfer: result did not summarize the documented transfer clearly');
  } catch (error) { failures.push(`official transfer: ${error.message}`); }
  for (const text of ['Bolaños se lleva 310 millones de Educación', 'Educación pierde 310 millones para Presidencia']) {
    try {
      const result = await resolve(text);
      const moneyFlow = result.result?.blocks?.find((block) => block.type === 'money_flow');
      if (result.status !== 'draft' || !moneyFlow?.evidenceIds?.length) failures.push(`official transfer paraphrase: no structured money flow for ${text}`);
    } catch (error) { failures.push(`official transfer paraphrase ${text}: ${error.message}`); }
  }
  try {
    const result = await resolve('¿La información pública se puede reutilizar sin condiciones?');
    const legalTree = result.result?.blocks?.find((block) => block.type === 'legal_decision_tree');
    const reply = result.result?.blocks?.find((block) => block.type === 'conversation_reply');
    const excerpts = result.result?.blocks?.filter((block) => block.type === 'source_excerpt') || [];
    if (result.status !== 'draft') failures.push(`public information reuse: expected draft, received ${result.status}`);
    if (!legalTree?.items?.some((item) => /condiciones/i.test(item.label) && item.status === 'known')) failures.push('public information reuse: operative conditions were not shown');
    if (!reply?.evidenceIds?.length) failures.push('public information reuse: conversation reply lost its evidence IDs');
    if (!excerpts.length || !excerpts.some((block) => /art[ií]culo 4/i.test(block.title))) failures.push('public information reuse: relevant BOE article excerpt is missing');
    if (!result.result?.headline?.toLocaleLowerCase('es').includes('no:')) failures.push('public information reuse: result did not clearly reject the overbroad claim');
  } catch (error) { failures.push(`public information reuse: ${error.message}`); }
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
      if (text.includes('barrio ha subido') && (!/local/i.test(result.result?.headline || '') && !/locales/i.test(result.result?.headline || ''))) failures.push('specific local claim: did not explain that local evidence is needed');
      if (text.includes('barrio ha subido') && !result.result?.blocks?.some((block) => block.type === 'evidence_ladder')) failures.push('specific local claim: missing local evidence ladder');
    } catch (error) { failures.push(`specific unknown claim: ${error.message}`); }
  }
  try {
    const result = await resolve('Los precios de la vivienda causan la crisis en España');
    if (result.status !== 'complete' || result.relatedClaims?.[0]?.slug !== 'precios-vivienda-causan-crisis') failures.push(`causal long-tail: expected published clarification, received ${result.status}`);
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
    const result = await resolve('Los inmigrantes crean inseguridad');
    if (result.status !== 'complete' || !/relaci[oó]n afirmada|causalidad/i.test(result.result?.headline || '')) failures.push('causal published claim: headline repeated the claim instead of summarizing its unsupported causal assessment');
  } catch (error) { failures.push(`causal published claim: ${error.message}`); }
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
    if (result.status !== 'draft') failures.push(`quantity long-tail: expected provisional mismatch, received ${result.status}`);
    if (!result.result?.blocks?.some((block) => block.type === 'key_number')) failures.push('quantity long-tail: missing comparable key number');
    if (!result.result?.blocks?.some((block) => block.type === 'data_finding')) failures.push('quantity long-tail: missing numeric comparison details');
  } catch (error) { failures.push(`quantity long-tail: ${error.message}`); }
  try {
    const result = await resolve('España tiene tres millones de habitantes');
    if (result.status !== 'draft') failures.push(`written quantity long-tail: expected provisional mismatch, received ${result.status}`);
    if (!result.result?.blocks?.some((block) => block.type === 'key_number')) failures.push('written quantity long-tail: written number did not reach numeric comparison');
  } catch (error) { failures.push(`written quantity long-tail: ${error.message}`); }
  try {
    const result = await resolve('España tiene 100 millones de habitantes');
    if (result.status !== 'complete' || result.relatedClaims?.[0]?.slug !== 'espana-no-tiene-100-millones') failures.push(`mismatched quantity: expected published mismatch clarification, received ${result.status}`);
  } catch (error) { failures.push(`mismatched quantity: ${error.message}`); }
  try {
    const result = await resolve('España está destruida');
    if (result.status !== 'partial' || result.result?.relatedClaims?.length) failures.push(`broad evaluative claim: expected topic-only political guidance, received ${result.status}`);
    if (result.result?.relatedClaims?.length || result.result?.sourceLinks?.length || result.result?.evidenceIds?.length) failures.push('broad evaluative claim: leaked unrelated evidence');
    if (!result.result?.headline?.toLocaleLowerCase('es').includes('político')) failures.push('broad evaluative claim: did not identify the political context');
    if (!result.result?.blocks?.some((block) => block.type === 'strongest_valid_concern')) failures.push('broad evaluative claim: missing strongest valid concern');
    if (!result.result?.blocks?.some((block) => block.type === 'evidence_ladder')) failures.push('broad evaluative claim: missing concrete definition ladder');
  } catch (error) { failures.push(`broad evaluative claim: ${error.message}`); }
}

if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`Local resolver smoke passed: ${cases.length}${process.env.SMOKE_MEDIA === '1' ? ' + media' : ''}${process.env.SMOKE_URL === '1' ? ' + url' : ''}${process.env.SMOKE_DEDUPE === '1' ? ' + dedupe' : ''}${process.env.SMOKE_WAREHOUSE === '1' ? ' + warehouse' : ''}${process.env.SMOKE_OFFICIAL === '1' ? ' + official' : ''}${process.env.SMOKE_LONG_TAIL === '1' ? ' + long-tail' : ''} cases at ${base}`);
