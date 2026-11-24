const ineSavings = {
  id: 'ine-household-saving-rate-2025',
  title: 'Cuentas Trimestrales no Financieras de los Sectores Institucionales · T4 2025',
  publisher: 'INE',
  url: 'https://www.ine.es/dyngs/Prensa/CTNFSI4T25.pdf',
  publishedAt: '2026-04-01',
  retrievedAt: '2026-11-24',
  role: 'primary',
};
const bancoEspanaSavings = {
  id: 'bde-household-saving-rate-groups-2017-2024',
  title: 'Informe Anual 2025 · Cuadro 1.4: evolución del ahorro por grupos de población',
  publisher: 'Banco de España',
  url: 'https://www.bde.es/f/webbe/SES/Secciones/Publicaciones/PublicacionesAnuales/InformesAnuales/25/InfAnual_2025.pdf',
  publishedAt: '2026-06-18',
  retrievedAt: '2026-11-24',
  role: 'primary',
};
const epf2025 = {
  id: 'ine-household-budget-shares-2025',
  title: 'Encuesta de Presupuestos Familiares · 2025, resultados definitivos',
  publisher: 'INE',
  url: 'https://www.ine.es/dyngs/Prensa/EPF2025.htm',
  publishedAt: '2026-06-25',
  retrievedAt: '2026-11-24',
  role: 'primary',
};
const epf2024 = {
  id: 'ine-household-budget-shares-2024',
  title: 'Encuesta de Presupuestos Familiares · 2024, resultados definitivos',
  publisher: 'INE',
  url: 'https://www.ine.es/dyngs/Prensa/EPF2024.htm',
  publishedAt: '2025-06-26',
  retrievedAt: '2026-11-24',
  role: 'primary',
};

export const HOUSEHOLD_SAVING_SNAPSHOT = Object.freeze({
  schemaVersion: '1',
  owner: 'knowledge-review',
  createdAt: '2026-11-24',
  expiresAt: '2027-04-30',
  refreshCommand: 'npm run knowledge:refresh',
  validationStatus: 'reviewed',
  asOf: '2026-11-24',
  supportedScope: 'España; tasa de ahorro agregada del sector hogares en 2025; evolución 2017–2024 por los grupos de población publicados por el Banco de España; gasto medio de los hogares en 2024–2025',
  unsupportedScope: 'ahorro o capacidad de ahorro de hogares de renta media, hogares según número de personas perceptoras, hogares concretos y causas individuales del ahorro o desahorro',
  territories: ['ES'],
  directClaimEvidence: false,
  facts: [
    'En el conjunto de 2025, la tasa de ahorro del sector hogares fue el 12,0 % de su renta disponible bruta, 0,7 puntos porcentuales menos que en 2024. Es una tasa agregada anual, no la proporción que ahorró cada hogar.',
    'El Banco de España describe un aumento de la tasa de ahorro entre 2017 y 2024 en los grupos que analiza por edad, educación, país de nacimiento y régimen de tenencia de vivienda. El cuadro no desglosa el resultado por nivel de ingresos del hogar.',
    'La estimación del Banco de España define el ahorro como renta disponible menos gasto anual; combina renta de la ECV y gasto de la EPF, y excluye del gasto los alquileres imputados de viviendas en propiedad.',
    'Como contexto de gastos esenciales, la EPF sitúa en 2025 la vivienda, el agua, la electricidad, el gas y otros combustibles en el 33,2 % del gasto medio del hogar y los alimentos en el 16,0 %. En 2024 eran el 32,4 % y el 15,8 %, respectivamente; son partidas de gasto, no una medida de ahorro por nivel de ingresos o por número de sueldos.',
  ],
  factSourceIds: [
    ['ine-household-saving-rate-2025'],
    ['bde-household-saving-rate-groups-2017-2024'],
    ['bde-household-saving-rate-groups-2017-2024'],
    ['ine-household-budget-shares-2025', 'ine-household-budget-shares-2024'],
  ],
  factDimensions: [
    { subject: 'tasa de ahorro agregada del sector hogares', population: 'sector hogares; no hogares individuales ni un grupo de renta concreto', geography: 'España', period: '2025 frente a 2024', denominator: 'renta disponible bruta del sector', unit: 'porcentaje de la renta disponible bruta' },
    { subject: 'evolución de la tasa de ahorro por grupos de población', population: 'grupos publicados por edad, educación, país de nacimiento y tenencia de vivienda; sin desglose por renta', geography: 'España', period: '2017–2024', denominator: 'renta disponible de los grupos analizados', unit: 'cambio de la tasa de ahorro' },
    { subject: 'definición y construcción de la estimación microeconómica de ahorro', population: 'hogares encuestados en la ECV y la EPF', geography: 'España', period: '2017–2024', denominator: 'renta disponible; gasto excluye alquiler imputado de vivienda en propiedad', unit: 'renta disponible menos gasto anual' },
    { subject: 'peso de vivienda y alimentación en el presupuesto medio', population: 'hogares privados', geography: 'España', period: '2024–2025', denominator: 'gasto medio total del hogar', unit: 'porcentaje del gasto' },
  ],
  sources: [ineSavings, bancoEspanaSavings, epf2025, epf2024],
});

export const HOUSEHOLD_BUDGET_SNAPSHOT = Object.freeze({
  schemaVersion: '1',
  owner: 'knowledge-review',
  createdAt: '2026-11-24',
  expiresAt: '2027-07-01',
  refreshCommand: 'npm run knowledge:refresh',
  validationStatus: 'reviewed',
  asOf: '2026-11-24',
  supportedScope: 'España; participación del gasto de los hogares por categorías en 2024–2025 y distribución entre quintiles ordenados por gasto equivalente',
  unsupportedScope: 'inflación personal, cambio de precios aislado del cambio de cantidades o composición, facturas pagadas por hogares concretos, ahorro por renta o por número de perceptores, y datos de ciudades o comunidades autónomas',
  territories: ['ES'],
  dimensions: {
    subject: 'participación de vivienda y alimentos en el presupuesto medio',
    population: 'hogares privados; promedio nacional',
    geography: 'España',
    period: '2024–2025',
    denominator: 'gasto medio total por hogar',
    unit: 'porcentaje del gasto; euros corrientes',
  },
  directClaimEvidence: (claim) => {
    const text = String(claim || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const budget = /\b(presupuest\w*|gasto\w*|consumo\w*)\b/.test(text);
    const household = /\b(hogar\w*|famil\w*|domestic\w*)\b/.test(text);
    const category = /\b(viviend\w*|alquil\w*|alimentos?|comid\w*|electric\w*|gas|suministros?|servicios? basicos?|necesidades? basicas?|esenciales?)\b/.test(text);
    const causalOrPriceClaim = /\b(precio\w*|inflaci\w*|encarec\w*|ha convertid\w*|convirt\w*|caus\w*|provoc\w*|debido a|por culpa|secundari\w*)\b/.test(text);
    const individualOrUniversal = /\b(cada hogar|todos los hogares|todas las familias|mi hogar|mi familia)\b/.test(text);
    const unsupportedGroup = /\b(?:renta|ingresos?|salarios?|sueldos?|perceptores?|dos trabaj\w*|familias? con (?:hijos?|menores|dependientes)|hogares? (?:monoparentales?|unipersonales?))\b/.test(text);
    const unsupportedYear = [...text.matchAll(/\b(20\d{2})\b/g)].some(([, year]) => !['2024', '2025'].includes(year));
    return budget && household && category && !causalOrPriceClaim && !individualOrUniversal && !unsupportedGroup && !unsupportedYear;
  },
  claimVerdictFor: (claim) => {
    const text = String(claim || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const asksForShare = /\b(?:que parte|que porcentaje|que proporcion|cuanto(?: del| de la)?)\b/.test(text)
      && /\b(?:presupuest\w*|gasto\w*|consumo\w*)\b/.test(text);
    if (asksForShare && !/\d+(?:[,.]\d+)?\s*%/.test(text)) return 'supported';
    const percentMatches = [...text.matchAll(/(\d+(?:[,.]\d+)?)\s*%/g)];
    if (percentMatches.length > 1) {
      const housing = /\b(viviend\w*|alquil\w*|electric\w*|gas|suministros?|servicios? basicos?)\b/.test(text);
      const food = /\b(alimentos?|comid\w*|aliment\w*)\b/.test(text);
      if (percentMatches.length !== 2 || housing === food || !/\b2024\b/.test(text) || !/\b2025\b/.test(text)) return 'mixed';
      const values = percentMatches.map(([, value]) => Number(value.replace(',', '.')));
      const pair = housing ? [32.4, 33.2] : [15.8, 16.0];
      return values.every((value, index) => Math.abs(value - pair[index]) <= 0.05) ? 'supported' : 'contradicted';
    }
    const percentMatch = percentMatches[0];
    if (percentMatch) {
      const housing = /\b(viviend\w*|alquil\w*|electric\w*|gas|suministros?|servicios? basicos?)\b/.test(text);
      const food = /\b(alimentos?|comid\w*|aliment\w*)\b/.test(text);
      if (!housing && !food) return 'mixed';
      const year = /\b2024\b/.test(text) && !/\b2025\b/.test(text) ? '2024' : '2025';
      const expected = housing && food
        ? year === '2024' ? 48.2 : 49.2
        : housing ? year === '2024' ? 32.4 : 33.2
          : year === '2024' ? 15.8 : 16.0;
      const claimed = Number(percentMatch[1].replace(',', '.'));
      if (/\b(?:mas de|superior a|por encima de|excede)\b/.test(text)) return expected > claimed ? 'supported' : 'contradicted';
      if (/\b(?:menos de|inferior a|por debajo de|no llega a)\b/.test(text)) return expected < claimed ? 'supported' : 'contradicted';
      return Math.abs(expected - claimed) <= 0.05 ? 'supported' : 'contradicted';
    }
    const explicitPeriod = /\b2024\b/.test(text) && /\b2025\b/.test(text);
    if (/\b(baj\w*|disminu\w*|reduj\w*|perdi\w* peso)\b/.test(text)) return explicitPeriod ? 'contradicted' : 'mixed';
    if (/\b(aument\w*|sub\w*|crec\w*|gan\w* peso|cada vez|mayor\w*)\b/.test(text)) return explicitPeriod ? 'supported' : 'mixed';
    return 'mixed';
  },
  facts: [
    'En 2025, el grupo Vivienda, agua, electricidad, gas y otros combustibles representó el 33,2 % del gasto medio de los hogares, frente al 32,4 % en 2024. El gasto medio en ese grupo aumentó un 5,8 % en términos corrientes; el gasto total medio por hogar creció un 3,1 %.',
    'Alimentos y bebidas no alcohólicas representaron el 16,0 % del gasto medio en 2025, frente al 15,8 % en 2024. La suma de vivienda y alimentos pasó del 48,2 % al 49,2 % del presupuesto medio.',
    'El 20 % de hogares con menor gasto equivalente dedicó el 61,5 % de su presupuesto a vivienda y alimentos en 2025. Es un quintil ordenado por gasto equivalente, no por renta; no debe presentarse como el quintil de menores ingresos.',
    'La EPF registra gasto en euros corrientes y su grupo de vivienda incluye el alquiler imputado de viviendas ocupadas por sus propietarios o cedidas. Por tanto, el cambio de gasto no identifica por sí solo una subida de precios ni equivale a facturas pagadas.',
  ],
  factSourceIds: [
    ['ine-household-budget-shares-2025', 'ine-household-budget-shares-2024'],
    ['ine-household-budget-shares-2025', 'ine-household-budget-shares-2024'],
    ['ine-household-budget-shares-2025'],
    ['ine-household-budget-shares-2025'],
  ],
  factDimensions: [
    { subject: 'gasto medio y cuota del grupo de vivienda, agua, electricidad, gas y combustibles', population: 'hogares privados', geography: 'España', period: '2024–2025', denominator: 'gasto medio total por hogar', unit: 'euros corrientes; porcentaje del gasto' },
    { subject: 'cuota de alimentos y suma de vivienda más alimentos en el presupuesto medio', population: 'hogares privados', geography: 'España', period: '2024–2025', denominator: 'gasto medio total por hogar', unit: 'porcentaje del gasto' },
    { subject: 'presupuesto de los hogares con menor gasto equivalente', population: 'quintil 1 de gasto equivalente; no quintil de renta', geography: 'España', period: '2025', denominator: 'gasto total de los hogares de ese quintil', unit: 'porcentaje del gasto' },
    { subject: 'definición del gasto de consumo medido por la EPF', population: 'hogares privados, incluido alquiler imputado para algunas viviendas en propiedad o cedidas', geography: 'España', period: 'resultados anuales 2025', denominator: 'gasto de consumo registrado en el año', unit: 'euros corrientes' },
  ],
  sources: [epf2025, epf2024],
});
