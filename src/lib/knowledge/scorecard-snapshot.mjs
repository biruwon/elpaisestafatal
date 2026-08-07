// Reviewed, versioned fallback used when the live warehouse is unavailable.
// Values are frozen from the national Eurostat series refreshed 2026-07-31.
export const GOVERNMENT_SCORECARD_SNAPSHOT = {
  schemaVersion: '1',
  asOf: '2026-07-31',
  warehouseVersion: 'eurostat-es-2026-07-31',
  periods: {
    'since-2018': { label: 'Desde junio de 2018', baseline: '2017', comparison: '2025', assumption: 'Se compara el último año completo anterior a junio de 2018 con el último año compatible disponible.' },
    'current-term': { label: 'Desde noviembre de 2023', baseline: '2022', comparison: '2025', assumption: 'Se usa el último año completo anterior al Gobierno nacional más reciente.' },
  },
  metrics: [
    { metricId: 'gdp_per_capita_real', label: 'PIB real por habitante', unit: 'euros de 2017', baseline: { value: 25160, period: '2017' }, comparison: { value: 27040, period: '2025' }, direction: 'improved', change: '+7,5 %', thresholdVersion: 'relative-v1', caveat: 'Calculado con PIB por habitante y deflactor de precios; no mide por sí solo bienestar.', sourceIds: ['gdp-per-capita', 'gdp-deflator'] },
    { metricId: 'median_equivalised_income_real', label: 'Renta mediana disponible real', unit: 'euros de 2017', baseline: { value: 14203, period: '2017' }, comparison: { value: 15830, period: '2025' }, direction: 'improved', change: '+11,5 %', thresholdVersion: 'relative-v1', caveat: 'Deflactada a euros de 2017; no equivale al salario medio.', sourceIds: ['median-income', 'cpi'] },
    { metricId: 'unemployment_rate', label: 'Desempleo', unit: '% de población activa', baseline: { value: 17.2, period: '2017' }, comparison: { value: 10.5, period: '2025' }, direction: 'improved', change: '-6,7 puntos', thresholdVersion: 'percentage-point-v1', sourceIds: ['unemployment'] },
    { metricId: 'arope_rate', label: 'AROPE', unit: '% de población', baseline: { value: 27.5, period: '2017' }, comparison: { value: 25.7, period: '2025' }, direction: 'improved', change: '-1,8 puntos', thresholdVersion: 'percentage-point-v1', sourceIds: ['arope'] },
    { metricId: 'housing_cost_overburden_rate', label: 'Sobrecarga del coste de vivienda', unit: '% de población', baseline: { value: 9.8, period: '2017' }, comparison: { value: 7.2, period: '2025' }, direction: 'improved', change: '-2,6 puntos', thresholdVersion: 'percentage-point-v1', sourceIds: ['housing'] },
    { metricId: 'unmet_healthcare_waiting_list_rate', label: 'Necesidades sanitarias no cubiertas por listas de espera', unit: '% de población', baseline: { value: 0.1, period: '2017' }, comparison: { value: 1.5, period: '2025' }, direction: 'worsened', change: '+1,4 puntos', thresholdVersion: 'percentage-point-v1', sourceIds: ['healthcare'] },
  ],
  sources: [
    { id: 'gdp-per-capita', title: 'Eurostat · PIB por habitante', url: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10_pc?geo=ES&na_item=B1GQ&unit=CP_EUR_HAB', publisher: 'Eurostat', role: 'primary' },
    { id: 'gdp-deflator', title: 'Eurostat · deflactor del PIB', url: 'https://ec.europa.eu/eurostat/databrowser/view/namq_10_gdp/default/table', publisher: 'Eurostat', role: 'primary' },
    { id: 'median-income', title: 'Eurostat · renta mediana equivalente', url: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/ilc_di03?geo=ES&age=TOTAL&statinfo=MED_EI&unit=EUR', publisher: 'Eurostat', role: 'primary' },
    { id: 'cpi', title: 'Eurostat · índice de precios de consumo', url: 'https://ec.europa.eu/eurostat/databrowser/view/prc_hicp_aind/default/table', publisher: 'Eurostat', role: 'primary' },
    { id: 'unemployment', title: 'Eurostat · tasa de desempleo', url: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/une_rt_a?geo=ES&sex=T&age=Y15-74&unit=PC_ACT', publisher: 'Eurostat', role: 'primary' },
    { id: 'arope', title: 'Eurostat · riesgo de pobreza o exclusión', url: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/ilc_peps01n?geo=ES&unit=PC&age=TOTAL&sex=T', publisher: 'Eurostat', role: 'primary' },
    { id: 'housing', title: 'Eurostat · sobrecarga de vivienda', url: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/ilc_lvho07a?geo=ES&unit=PC&rskpovth=TOTAL&age=TOTAL&sex=T', publisher: 'Eurostat', role: 'primary' },
    { id: 'healthcare', title: 'Eurostat · necesidades médicas no cubiertas', url: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/hlth_silc_08?geo=ES&quant_inc=TOTAL&reason=WLIST&age=Y_GE16&sex=T&unit=PC', publisher: 'Eurostat', role: 'primary' },
  ],
};

export const snapshotScorecard = (periodId = 'since-2018') => {
  const period = GOVERNMENT_SCORECARD_SNAPSHOT.periods[periodId] || GOVERNMENT_SCORECARD_SNAPSHOT.periods['since-2018'];
  return {
    type: 'scorecard',
    baseline: { label: 'Base', period: period.baseline },
    comparison: { label: 'Comparación', period: period.comparison },
    items: GOVERNMENT_SCORECARD_SNAPSHOT.metrics.map((metric) => ({ ...metric, baseline: { ...metric.baseline, value: String(metric.baseline.value) }, comparison: { ...metric.comparison, value: String(metric.comparison.value) }, evidenceIds: metric.sourceIds })),
    assumption: period.assumption,
  };
};
