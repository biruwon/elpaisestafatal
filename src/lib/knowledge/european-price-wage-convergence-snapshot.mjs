const priceSource = {
  id: 'eurostat-household-price-levels-eu-2026-11-24',
  title: 'Price level indices for household final consumption expenditure · Eurostat',
  publisher: 'Eurostat',
  url: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_ppp_ind_1?freq=A&indic_ppp=PLI_EU27_2020&ppp_cat18=E011&geo=ES&sinceTimePeriod=2010',
  retrievedAt: '2026-11-24',
  role: 'primary',
};

const earningsSource = {
  id: 'eurostat-median-hourly-earnings-spain-eu-2026-11-24',
  title: 'Median gross hourly earnings: Spain and the EU-27 · Eurostat',
  publisher: 'Eurostat',
  url: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/earn_ses_pub2s?geo=ES&geo=EU27_2020&sizeclas=GE10&sex=T&unit=EUR&sinceTimePeriod=2010',
  retrievedAt: '2026-11-24',
  role: 'primary',
};

const methodologySource = {
  id: 'eurostat-ppp-price-level-time-comparison-methodology-2026-11-24',
  title: 'Purchasing power parities: interpretation and comparisons over time · Eurostat',
  publisher: 'Eurostat',
  url: 'https://ec.europa.eu/eurostat/web/purchasing-power-parities/information-data',
  retrievedAt: '2026-11-24',
  role: 'primary',
};

export const EUROPEAN_PRICE_WAGE_CONVERGENCE_EVIDENCE = Object.freeze({
  directClaimEvidence: false,
  expiresAt: '2027-07-09',
  territories: ['ES', 'EU'],
  evidenceLabel: 'Niveles de precios del consumo doméstico y mediana salarial por hora: España y UE-27',
  dimensions: {
    subject: 'nivel de precios del consumo de los hogares y salario bruto mediano por hora, comparados con la UE-27',
    population: 'consumo final de los hogares; personas empleadas de ambos sexos, sin aprendices, en empresas de diez o más personas de los sectores B-S salvo agricultura, silvicultura, pesca y administración pública',
    period: '2010 y 2022, último año común de la serie de salarios',
    geography: 'España respecto a la media de la UE-27',
    denominator: 'índice de precios con UE-27=100; mediana salarial de España dividida por la mediana de la UE-27',
    unit: 'índice comparativo de nivel de precios y euros brutos por hora; métricas distintas',
  },
  facts: [
    'Precios del consumo final de los hogares (UE-27=100): España 99,7 en 2010 y 93,8 en 2022. Es un índice nacional; no mide alquileres ni ciudades.',
    'Mediana salarial bruta por hora (2022): España 11,02 €, UE-27 14,91 €. Relación España/UE-27: bajó de 79,6 % en 2010 a 73,9 % en 2022. Muestra: empleados de ambos sexos en empresas con al menos 10 empleados; excluye aprendices, agricultura, silvicultura, pesca y Administración pública.',
    'Eurostat indica que estos índices comparan países en un momento dado. Su cambio entre años solo orienta; no mide de forma fiable la evolución de los precios.',
  ],
  factSourceIds: [
    ['eurostat-household-price-levels-eu-2026-11-24'],
    ['eurostat-median-hourly-earnings-spain-eu-2026-11-24'],
    ['eurostat-ppp-price-level-time-comparison-methodology-2026-11-24'],
  ],
  factDimensions: [
    {
      subject: 'índice de nivel de precios del consumo final de los hogares',
      population: 'consumo final de los hogares, cesta amplia basada en COICOP 2018',
      period: '2010 y 2022',
      geography: 'España; media de la UE-27 fijada en 100 cada año',
      denominator: 'índice comparativo de nivel de precios, UE-27=100',
      unit: 'índice de nivel de precios',
    },
    {
      subject: 'salario bruto mediano por hora',
      population: 'personas empleadas de ambos sexos, sin aprendices, en empresas de diez o más personas de los sectores B-S salvo agricultura, silvicultura, pesca y administración pública',
      period: '2010 y 2022; encuesta estructural con observaciones cada cuatro años',
      geography: 'España y UE-27',
      denominator: 'mediana de los salarios brutos por hora observados en cada territorio',
      unit: 'euros brutos por hora; no ajustados por precios',
    },
    {
      subject: 'interpretación temporal de los índices de nivel de precios basados en PPA',
      population: 'comparaciones estadísticas internacionales de precios de consumo',
      period: 'metodología consultada el 24/11/2026',
      geography: 'Eurostat: comparaciones entre países de la UE y otros territorios',
      denominator: 'un índice PLI compara niveles relativos; sus cambios no sustituyen una serie temporal de inflación',
      unit: 'límite metodológico; no una observación numérica',
    },
  ],
  sources: [priceSource, earningsSource, methodologySource],
});
