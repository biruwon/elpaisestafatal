const endpoint = process.env.CLAIM_RESOLVER_URL || 'http://127.0.0.1:8790';

// Atomic claims extracted from the supplied post. These are deliberately kept
// as plain user wording so the fixture tests real input rather than curated
// canonical questions.
const claims = [
  ['fiscal', 'La presión fiscal es la más alta de la historia'],
  ['housing-price', 'La vivienda que compré hace tres años hoy cuesta casi tres veces más'],
  ['housing-rent', 'Los alquileres se han disparado por la poca oferta y la inseguridad jurídica'],
  ['occupation-law', 'La ocupación está respaldada por el Gobierno y es delito leve'],
  ['eviction-delay', 'Los juicios de desahucio se retrasan dos o tres años'],
  ['imv', 'Más de 1,2 millones cobran el ingreso mínimo vital y la edad media es 28,5 años'],
  ['immigration-open', 'España tiene una política de inmigración de puertas abiertas'],
  ['immigration-crime', 'Los inmigrantes delinquen y piden ayudas'],
  ['residence-day', 'Cualquiera que venga a trabajar obtiene residencia desde el primer día'],
  ['work-one-year', 'Si una persona inmigrante no trabaja en un año debe marcharse'],
  ['benefits', 'Los inmigrantes reciben ayudas económicas desproporcionadas'],
  ['repeat-detainees', 'Hay delincuentes con 100, 200 y 300 detenciones que siguen esperando juicio'],
  ['residence-pending', 'Los detenidos obtienen residencia porque aún no han sido condenados'],
  ['regularization', 'El Gobierno ha regularizado a 1,2 millones de personas mediante un decreto extraordinario'],
  ['prison-regularization', 'Personas en prisión provisional han podido regularizarse'],
  ['family-reunification', 'Regularizar a 1,2 millones traerá cuatro o cinco millones de familiares en dos años'],
  ['no-expulsions', 'España no expulsa a nadie, incluidos delincuentes reincidentes'],
  ['morocco-expulsion', 'Marruecos solo acepta expulsiones con pasaporte físico y en vigor'],
  ['health-wait', 'Hay listas de espera sanitarias de uno o dos años'],
  ['emergency-wait', 'Las urgencias tienen esperas de 12, 15 o 24 horas'],
  ['universal-health', 'La sanidad universal es insostenible porque los recursos no son infinitos'],
  ['ela', 'Los enfermos de ELA están abandonados por falta de recursos'],
  ['infrastructure', 'España no construye nuevos hospitales, carreteras, presas, desaladoras, centrales, aeropuertos o trenes'],
  ['infrastructure-decay', 'Las infraestructuras españolas están en decadencia y sin mantenimiento'],
  ['industry', 'Se ha liquidado la industria española a precio de saldo'],
  ['external', 'España depende de todo del exterior y ya no produce lo que producía'],
  ['primary-sector', 'España solo vende productos del sector primario'],
  ['fires-field', 'El campo está abandonado, se ha prohibido el pastoreo y los cortafuegos están abandonados'],
  ['fire-aircraft', 'España tiene 14 hidroaviones y solo 7 funcionan'],
  ['fires-record', 'España sufre incendios cada vez peores y récords históricos de superficie devastada'],
  ['corruption', 'El sistema español está corrupto de izquierda a derecha y de arriba abajo'],
  ['institutions', 'Las instituciones españolas están secuestradas'],
  ['resignations', 'Nadie asume responsabilidades ni dimite ante las catástrofes'],
  ['ministers-prison', 'Hay ministros en prisión'],
  ['prosecutor', 'La Fiscalía depende del Gobierno y hay un fiscal general condenado'],
  ['supreme', 'El Tribunal Supremo es elegido por quienes debe juzgar'],
  ['tax-agency', 'Hacienda detecta los 100 euros no declarados pero no detecta grandes pagos no declarados'],
  ['police', 'La Policía y la Guardia Civil están totalmente manipuladas por el Gobierno'],
  ['votes', 'En España se compran votos'],
  ['support', 'Más de 1,2 millones de personas viven de ayudas y mantienen a cuatro o cinco millones'],
  ['grandchildren', 'La Ley de Nietos dará la nacionalidad a cientos de miles de personas'],
  ['middle-class', 'Cobrar 1.500 o 2.000 euros hace difícil llegar a fin de mes y no permite ahorrar'],
  ['unemployment', 'España tiene un récord de parados aunque anuncie un récord de ocupados'],
  ['fixed-discontinuous', 'Los fijos discontinuos ocultan más de un millón de parados'],
  ['schools', 'Donde antes había 30 alumnos ahora hay 80 y no se construyen escuelas nuevas'],
  ['education', 'Los profesores están desbordados y los alumnos terminan sin aprender'],
  ['crime-stats', 'Las cifras de delincuencia están manipuladas y los hurtos se registran como extravíos'],
  ['serious-crime', 'Los delitos graves han aumentado el doble o el triple aunque se camuflen'],
  ['unemployment-stats', 'El desempleo está manipulado porque los fijos discontinuos se cuentan como ocupados'],
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const resolveClaim = async (text) => {
  const response = await fetch(`${endpoint}/v1/classify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, inputType: 'text' }),
  });
  let result = await response.json();
  for (let attempt = 0; result.status === 'processing' && attempt < 160; attempt += 1) {
    await sleep(250);
    result = await (await fetch(`${endpoint}/v1/classify/${result.requestId}`)).json();
  }
  return result;
};

const results = [];
for (const [id, text] of claims) {
  const response = await resolveClaim(text);
  const result = response.result || {};
  results.push({
    id,
    status: response.status,
    coverage: result.coverage || '',
    headline: result.headline || '',
    blocks: (result.blocks || []).map((block) => block.type),
    seriesLength: result.warehouseSeries?.values?.length || 0,
  });
  console.log(JSON.stringify(results.at(-1)));
}

const counts = results.reduce((summary, item) => {
  summary[item.status] = (summary[item.status] || 0) + 1;
  return summary;
}, {});

const expectedStrong = new Set(['eviction-delay', 'unemployment', 'fixed-discontinuous', 'health-wait', 'unemployment-stats', 'fiscal', 'housing-price', 'imv', 'benefits', 'occupation-law', 'immigration-crime', 'residence-day', 'work-one-year', 'regularization', 'grandchildren', 'middle-class', 'residence-pending', 'no-expulsions', 'family-reunification', 'universal-health', 'fire-aircraft', 'immigration-open', 'fires-record', 'crime-stats', 'emergency-wait', 'ela', 'primary-sector', 'external', 'education', 'infrastructure', 'infrastructure-decay', 'industry', 'schools', 'fires-field']);
const strongResults = new Set(results.filter((item) => item.status === 'complete' && item.coverage === 'strong').map((item) => item.id));
for (const id of expectedStrong) {
  if (!strongResults.has(id)) throw new Error(`Expected a strong direct answer for ${id}, got ${JSON.stringify(results.find((item) => item.id === id))}`);
}

const mustRemainNonStrong = new Set(['housing-rent']);
for (const id of mustRemainNonStrong) {
  if (strongResults.has(id)) throw new Error(`Unsafe adjacent evidence was promoted to strong for ${id}`);
}

console.error(JSON.stringify({ total: results.length, counts }));
