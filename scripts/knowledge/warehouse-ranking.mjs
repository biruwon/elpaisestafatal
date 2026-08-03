const normalise = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n');
const formatNumber = (value) => Number(value).toLocaleString('es-ES', { maximumFractionDigits: 2 });
const displayMetric = (item) => String(item.source?.title || item.metric || item.datasetId || 'Indicador comparado');
const comparableDimensions = (item) => Object.entries(item.dimensions || {})
  .filter(([key]) => !['geo', 'time', 'period', 'year', 'anyo', 'fecha'].includes(normalise(key)))
  .sort(([left], [right]) => left.localeCompare(right));
const baseKey = (item) => JSON.stringify({ source: item.source?.id || item.sourceId || '', metric: item.metric || item.datasetId || '', unit: item.unit || '', dimensions: comparableDimensions(item) });
const countryName = (item) => String(item.dimensionLabels?.geo || item.dimensions?.geo || item.geo || 'Territorio');

const spanishRegions = [
  { label: 'Galicia', aliases: ['galicia'] },
  { label: 'Principado de Asturias', aliases: ['asturias', 'principado de asturias'] },
  { label: 'Cantabria', aliases: ['cantabria'] },
  { label: 'País Vasco', aliases: ['pais vasco', 'euskadi'] },
  { label: 'Comunidad Foral de Navarra', aliases: ['navarra', 'comunidad foral de navarra'] },
  { label: 'La Rioja', aliases: ['la rioja', 'rioja'] },
  { label: 'Aragón', aliases: ['aragon'] },
  { label: 'Comunidad de Madrid', aliases: ['madrid', 'comunidad de madrid'] },
  { label: 'Castilla y León', aliases: ['castilla y leon', 'castilla leon'] },
  { label: 'Castilla-La Mancha', aliases: ['castilla la mancha'] },
  { label: 'Extremadura', aliases: ['extremadura'] },
  { label: 'Cataluña', aliases: ['cataluna', 'catalunya'] },
  { label: 'Comunitat Valenciana', aliases: ['comunidad valenciana', 'comunitat valenciana', 'valencia'] },
  { label: 'Illes Balears', aliases: ['illes balears', 'islas baleares', 'baleares'] },
  { label: 'Andalucía', aliases: ['andalucia'] },
  { label: 'Región de Murcia', aliases: ['murcia', 'region de murcia'] },
  { label: 'Canarias', aliases: ['canarias'] },
];

const regionName = (item) => String(item.dimensionLabels?.geo || item.dimensions?.geo || '').trim();
const regionMatches = (query, region) => {
  const normalized = normalise(query);
  return region.aliases.some((alias) => normalized.includes(normalise(alias)));
};

export const requestedSpanishRegions = (query) => spanishRegions.filter((region) => regionMatches(query, region));

export const summarizeWarehouseRegionalComparison = (text, observations) => {
  const regions = requestedSpanishRegions(text);
  if (regions.length < 2) return null;
  const regional = observations.filter((item) => item.metricId === 'regional_population_density' && /^ES\d/.test(String(item.dimensions?.geo || '')));
  if (!regional.length) return null;
  const matching = regions.map((region) => ({ region, observations: regional.filter((item) => regionMatches(region.label, { aliases: [regionName(item)] })) }));
  if (matching.some((item) => !item.observations.length)) return null;
  const commonPeriods = matching.reduce((periods, item) => {
    const values = new Set(item.observations.map((observation) => String(observation.period)));
    return new Set([...periods].filter((period) => values.has(period)));
  }, new Set(matching[0].observations.map((observation) => String(observation.period))));
  const period = [...commonPeriods].sort((left, right) => right.localeCompare(left))[0];
  if (!period) return null;
  const rows = matching.map(({ region, observations: items }) => ({ region, item: items.find((item) => String(item.period) === period) })).filter((item) => item.item);
  if (rows.length < 2) return null;
  const unit = 'personas por km²';
  const values = rows.map(({ region, item }) => `${region.label}: ${formatNumber(item.value)} ${unit}`);
  const [first, second] = rows;
  const comparison = Number(first.item.value) === Number(second.item.value)
    ? 'registran la misma densidad'
    : Number(first.item.value) > Number(second.item.value)
      ? `${first.region.label} registra ${formatNumber(first.item.value - second.item.value)} ${unit} más que ${second.region.label}`
      : `${second.region.label} registra ${formatNumber(second.item.value - first.item.value)} ${unit} más que ${first.region.label}`;
  return {
    regional: true,
    observations: rows.map(({ item }) => item),
    headline: `Densidad de población: ${first.region.label} frente a ${second.region.label} (${period})`,
    summary: `En ${period}, ${first.region.label} y ${second.region.label} ${comparison}.`,
    points: [
      ...values,
      'La comparación usa densidad de población: personas por kilómetro cuadrado; no mide por sí sola saturación de servicios ni calidad de vida.',
    ],
    reply: `En ${period}, ${first.region.label} registra ${formatNumber(first.item.value)} ${unit} y ${second.region.label} ${formatNumber(second.item.value)} ${unit}. Es una comparación de densidad, no una explicación automática de las diferencias entre territorios.`,
    replyEvidenceIds: rows.map(({ item }) => item.id),
  };
};

const isSpainObservation = (item) => {
  const code = normalise(item.dimensions?.geo || item.geo || '');
  const label = normalise(item.dimensionLabels?.geo || '');
  return code === 'es' || label === 'espana' || label === 'spain';
};

const isEuropeanUnionObservation = (item) => {
  const code = normalise(item.dimensions?.geo || item.geo || '');
  const label = normalise(item.dimensionLabels?.geo || '');
  return code === 'eu27 2020' || code === 'eu27_2020' || label.includes('european union') || label.includes('union europea');
};

const europeanComparisonDefinitions = {
  gdp_per_capita_europe: {
    label: 'PIB por habitante en poder adquisitivo',
    verb: 'registró un PIB por habitante equivalente',
    replyLead: 'el PIB por habitante equivalente fue de',
    differenceVerb: ['el PIB por habitante español fue más alto', 'el PIB por habitante español fue más bajo', 'España y la Unión Europea registraron el mismo PIB por habitante'],
    unit: 'PPS por habitante',
    replyUnit: 'PPS por habitante',
    differenceUnit: 'PPS por habitante',
    method: 'La comparación usa el PIB por habitante a precios corrientes expresado en estándares de poder adquisitivo (PPS) según Eurostat; no equivale a la renta disponible de los hogares, al salario medio ni al crecimiento real de la economía.',
    caveat: 'Es una medida agregada de producción económica ajustada por poder adquisitivo, no una medida directa de lo que ingresa o puede gastar cada familia.',
  },
  gdp_real_growth_europe: {
    label: 'PIB real',
    verb: 'creció',
    replyLead: 'el PIB real creció un',
    differenceVerb: ['España creció más', 'España creció menos', 'España y la Unión Europea crecieron al mismo ritmo'],
    unit: '% interanual',
    replyUnit: '% interanual',
    method: 'La comparación usa el PIB real interanual desestacionalizado; no demuestra por sí sola que los hogares tengan el mismo bienestar.',
    caveat: 'Es una medida de actividad agregada, no de bienestar de cada hogar.',
  },
  inflation_rate_europe: {
    label: 'Inflación armonizada',
    verb: 'registró una inflación',
    replyLead: 'la inflación armonizada fue del',
    differenceVerb: ['la inflación española fue más alta', 'la inflación española fue más baja', 'España y la Unión Europea registraron la misma inflación'],
    unit: '% interanual',
    replyUnit: '% interanual',
    method: 'La comparación usa la tasa armonizada de precios de consumo para todos los bienes; no representa exactamente la cesta de cada hogar.',
    caveat: 'Es una medida comparable de precios, no el coste de vida completo de cada hogar.',
  },
  employment_rate_europe: {
    label: 'Tasa de empleo',
    verb: 'registró una tasa de empleo',
    replyLead: 'la tasa de empleo fue del',
    differenceVerb: ['la tasa de empleo española fue más alta', 'la tasa de empleo española fue más baja', 'España y la Unión Europea registraron la misma tasa de empleo'],
    unit: '% de la población de 20 a 64 años',
    replyUnit: '% de la población de 20 a 64 años',
    method: 'La comparación usa la tasa de empleo de la población de 20 a 64 años según la definición comparable de Eurostat; no equivale a la tasa de paro ni describe todos los grupos de edad.',
    caveat: 'Es una medida de empleo entre 20 y 64 años, no una descripción completa de la calidad o estabilidad del trabajo.',
  },
  government_revenue_ratio_europe: {
    label: 'Ingresos públicos sobre el PIB',
    verb: 'registró unos ingresos públicos',
    replyLead: 'los ingresos públicos equivalieron al',
    differenceVerb: ['los ingresos públicos españoles fueron más altos', 'los ingresos públicos españoles fueron más bajos', 'España y la Unión Europea registraron el mismo nivel de ingresos públicos'],
    unit: '% del PIB',
    replyUnit: '% del PIB',
    method: 'La comparación usa los ingresos totales de las administraciones públicas como porcentaje del PIB según las cuentas nacionales de Eurostat; no equivale a la presión fiscal de cada hogar ni a los impuestos de una persona concreta.',
    caveat: 'Es un agregado de todas las administraciones públicas, no una medida directa de cuánto paga cada familia.',
  },
  government_expenditure_ratio_europe: {
    label: 'Gasto público sobre el PIB',
    verb: 'registró un gasto público',
    replyLead: 'el gasto público equivalió al',
    differenceVerb: ['el gasto público español fue más alto', 'el gasto público español fue más bajo', 'España y la Unión Europea registraron el mismo nivel de gasto público'],
    unit: '% del PIB',
    replyUnit: '% del PIB',
    method: 'La comparación usa el gasto total de las administraciones públicas como porcentaje del PIB según las cuentas nacionales de Eurostat; no identifica cuánto gasta un servicio concreto ni permite juzgar por sí sola su eficiencia.',
    caveat: 'Es un agregado de todas las administraciones públicas, no una medida directa de la calidad o del coste de un servicio.',
  },
  health_expenditure_per_capita_europe: {
    label: 'Gasto sanitario por habitante',
    verb: 'registró un gasto sanitario por habitante',
    replyLead: 'el gasto sanitario por habitante fue de',
    differenceVerb: ['el gasto sanitario por habitante español fue más alto', 'el gasto sanitario por habitante español fue más bajo', 'España y la Unión Europea registraron el mismo gasto sanitario por habitante'],
    unit: '€ por habitante',
    replyUnit: '€ por habitante',
    differenceUnit: '€ por habitante',
    method: 'La comparación usa el gasto sanitario corriente total por habitante, financiado por todos los esquemas, según Eurostat; no equivale al gasto de un hospital concreto ni mide por sí sola el acceso o la calidad de la atención.',
    caveat: 'Es un promedio nacional comparable, no el gasto de cada persona ni una medida directa de resultados sanitarios.',
  },
  median_equivalised_income_europe: {
    label: 'Renta disponible mediana por persona equivalente',
    verb: 'registró una renta disponible mediana por persona equivalente',
    replyLead: 'la renta disponible mediana por persona equivalente fue de',
    differenceVerb: ['la renta mediana española fue más alta', 'la renta mediana española fue más baja', 'España y la Unión Europea registraron la misma renta mediana'],
    unit: 'PPS por persona',
    replyUnit: 'PPS por persona',
    differenceUnit: 'PPS por persona',
    method: 'La comparación usa la renta disponible mediana equivalente expresada en estándares de poder adquisitivo (PPS), con la misma población total y metodología de Eurostat; no equivale al salario medio, al PIB por habitante ni al ingreso de cada hogar.',
    caveat: 'Es una mediana ajustada por el tamaño y composición del hogar; no describe por sí sola la desigualdad, la vivienda que puede pagar cada familia ni todos los costes locales.',
  },
};

export const summarizeWarehouseEuropeanComparison = (_text, observations) => {
  const definition = observations.map((item) => europeanComparisonDefinitions[item.metricId]).find(Boolean);
  if (!definition) return null;
  const metricId = Object.keys(europeanComparisonDefinitions).find((id) => europeanComparisonDefinitions[id] === definition);
  const candidate = observations.filter((item) => item.metricId === metricId && typeof item.value === 'number' && Number.isFinite(item.value) && item.period);
  if (!candidate.length) return null;
  const byPeriod = new Map();
  candidate.forEach((item) => {
    const rows = byPeriod.get(String(item.period)) || [];
    rows.push(item);
    byPeriod.set(String(item.period), rows);
  });
  const period = [...byPeriod.keys()].sort((left, right) => right.localeCompare(left)).find((value) => {
    const rows = byPeriod.get(value) || [];
    return rows.some(isSpainObservation) && rows.some(isEuropeanUnionObservation);
  });
  if (!period) return null;
  const rows = byPeriod.get(period) || [];
  const spain = rows.find(isSpainObservation);
  const europeanUnion = rows.find(isEuropeanUnionObservation);
  if (!spain || !europeanUnion) return null;
  const difference = Number(spain.value) - Number(europeanUnion.value);
  const directionIndex = Math.abs(difference) < 0.000001 ? 2 : difference > 0 ? 0 : 1;
  const direction = directionIndex === 2 ? 'al mismo ritmo que' : directionIndex === 0 ? 'por encima de' : 'por debajo de';
  const comparison = `${formatNumber(spain.value)} ${definition.unit} en España frente a ${formatNumber(europeanUnion.value)} ${definition.unit} en la Unión Europea`;
  return {
    european: true,
    metricId,
    observations: [spain, europeanUnion],
    headline: `${definition.label}: España frente a la Unión Europea (${period})`,
    summary: `En ${period}, España ${definition.verb} ${direction} la Unión Europea: ${comparison}.`,
    points: [
      `España: ${formatNumber(spain.value)} ${definition.unit}.`,
      `Unión Europea: ${formatNumber(europeanUnion.value)} ${definition.unit}.`,
      `Diferencia: ${formatNumber(Math.abs(difference))} ${definition.differenceUnit || 'puntos porcentuales'} ${difference < 0 ? 'menos' : difference > 0 ? 'más' : ''}.`,
      definition.method,
    ],
    reply: `En ${period}, ${definition.replyLead} ${formatNumber(spain.value)} ${definition.replyUnit || definition.unit} en España y ${formatNumber(europeanUnion.value)} ${definition.replyUnit || definition.unit} en la Unión Europea: ${definition.differenceVerb[directionIndex]} en esa comparación. ${definition.caveat}`,
    replyEvidenceIds: [spain.id, europeanUnion.id],
  };
};

export const summarizeWarehouseRanking = (text, observations) => {
  const query = normalise(text);
  const queryTerms = new Set(query.split(' ').filter(Boolean));
  const internationalRegionalQuery = ['europa', 'europea', 'europeas', 'union europea', 'paises europeos', 'comparar paises'].some((term) => query.includes(term)) || queryTerms.has('ue');
  const spanishRegionalQuery = !internationalRegionalQuery;
  const numeric = observations
    .filter((item) => typeof item.value === 'number' && Number.isFinite(item.value) && item.period)
    .filter((item) => !spanishRegionalQuery || item.metricId !== 'regional_population_density' || /^ES\d/.test(String(item.dimensions?.geo || '')));
  if (numeric.length < 2) return null;
  const groups = new Map();
  for (const item of numeric) {
    const key = baseKey(item);
    const group = groups.get(key) || [];
    group.push(item);
    groups.set(key, group);
  }
  const group = [...groups.values()].sort((left, right) => {
    const leftScore = left.reduce((sum, item) => sum + (typeof item.score === 'number' ? item.score : 0), 0) / left.length;
    const rightScore = right.reduce((sum, item) => sum + (typeof item.score === 'number' ? item.score : 0), 0) / right.length;
    return rightScore - leftScore || right.length - left.length;
  })[0] || [];
  const periodCounts = new Map();
  for (const item of group) periodCounts.set(item.period, (periodCounts.get(item.period) || 0) + 1);
  const period = [...periodCounts.entries()].sort(([leftPeriod, leftCount], [rightPeriod, rightCount]) => rightCount - leftCount || String(rightPeriod).localeCompare(String(leftPeriod)))[0]?.[0];
  const rows = group.filter((item) => item.period === period).sort((left, right) => right.value - left.value);
  if (rows.length < 2) return null;
  const spainIndex = rows.findIndex((item) => normalise(countryName(item)) === 'es' || normalise(countryName(item)).includes('espana') || item.dimensions?.geo === 'ES');
  const spain = spainIndex >= 0 ? rows[spainIndex] : null;
  const metric = displayMetric(spain || rows[0]);
  const isRegionalDensity = String(rows[0]?.metricId || '') === 'regional_population_density';
  const rawUnit = String(spain?.unit || rows[0].unit || '').trim();
  const unit = isRegionalDensity ? 'personas por km²' : normalise(rawUnit) === 'percentage of population in the labour force' ? '%' : rawUnit;
  const suffix = unit ? ` ${unit}` : '';
  const highest = rows[0];
  const claimsLowest = query.includes('mas baja') || query.includes('mas bajo') || query.includes('menor');
  const claimsHighest = !claimsLowest && (query.includes('mas') || query.includes('mayor') || query.includes('alta') || query.includes('alto'));
  const matchesClaim = claimsLowest ? spainIndex === rows.length - 1 : spainIndex === 0;
  const points = [
    spain ? `España registra ${formatNumber(spain.value)}${suffix} en ${period} y ocupa el puesto ${spainIndex + 1} de ${rows.length} territorios incluidos.` : `La comparación contiene ${rows.length} territorios en ${period}, pero no identifica España en el conjunto recuperado.`,
    `El valor más alto del conjunto es ${formatNumber(highest.value)}${suffix} (${countryName(highest)}).`,
  ];
  if ((claimsHighest || claimsLowest) && spain) points.push(matchesClaim ? 'España ocupa la posición que expresa la afirmación en este conjunto y periodo.' : 'España no ocupa la posición que expresa la afirmación en este conjunto y periodo.');
  return {
    observations: rows,
    headline: isRegionalDensity ? `La mayor densidad regional en ${period}` : `${metric}: ranking comparable de ${period}`,
    summary: spain
      ? `España ocupa el puesto ${spainIndex + 1} de ${rows.length} territorios en la comparación disponible para ${period}.`
      : isRegionalDensity
        ? `${countryName(highest)} registra la mayor densidad del conjunto localizado: ${formatNumber(highest.value)}${suffix} en ${period}.`
        : `Se ha localizado una comparación de ${rows.length} territorios para ${period}.`,
    points,
    reply: spain
      ? `En ${period}, España aparece en el puesto ${spainIndex + 1} de ${rows.length} territorios con ${formatNumber(spain.value)}${suffix}. El resultado depende de esta definición, población y conjunto de países.`
      : isRegionalDensity
        ? `En ${period}, ${countryName(highest)} registra la mayor densidad del conjunto localizado con ${formatNumber(highest.value)}${suffix}. La densidad no mide por sí sola la presión sobre servicios o la calidad de vida.`
        : 'La comparación localizada no incluye una observación identificable de España.',
    replyEvidenceIds: rows.map((item) => item.id),
  };
};
