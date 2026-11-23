// Eurostat EU-SILC annual observations, retrieved 2026-11-16. This snapshot is
// a fallback for the focused text resolver; the warehouse feed remains the
// primary refresh path.
const generalSource = {
  id: 'eurostat-in-work-poverty-2026-11',
  title: 'Riesgo de pobreza entre personas ocupadas · Eurostat EU-SILC',
  publisher: 'Eurostat',
  url: 'https://ec.europa.eu/eurostat/databrowser/view/ilc_iw01/default/table?lang=en',
  retrievedAt: '2026-11-16T16:10:40.198Z',
  schedule: 'annual',
  trust: 'primary',
};

const fullTimeSource = {
  id: 'eurostat-in-work-poverty-full-time-2026-11',
  title: 'Riesgo de pobreza entre personas ocupadas a jornada completa · Eurostat EU-SILC',
  publisher: 'Eurostat',
  url: 'https://ec.europa.eu/eurostat/databrowser/view/ilc_iw07/default/table?lang=en',
  retrievedAt: '2026-11-16T16:10:40.550Z',
  schedule: 'annual',
  trust: 'primary',
};

const partTimeSource = {
  id: 'eurostat-in-work-poverty-part-time-2026-11',
  title: 'Riesgo de pobreza entre personas ocupadas a jornada parcial · Eurostat EU-SILC',
  publisher: 'Eurostat',
  url: 'https://ec.europa.eu/eurostat/databrowser/view/ilc_iw07/default/table?lang=en',
  retrievedAt: '2026-11-16T16:10:40.550Z',
  schedule: 'annual',
  trust: 'primary',
};

const annualSeries = (source, metricId, metric, unit, population, denominator, dimensions, values) => values.map(([period, value]) => ({
  id: `${source.id}-${period}`,
  kind: 'observation',
  dataKind: 'snapshot',
  metricId,
  metric,
  value,
  unit,
  period,
  geography: 'España',
  population,
  denominator,
  dimensions: { ...dimensions, geo: 'ES', time: period },
  dimensionLabels: { geo: 'Spain', time: period },
  source,
}));

export const WORKING_POVERTY_SNAPSHOT = Object.freeze({
  schemaVersion: '1',
  owner: 'knowledge-review',
  createdAt: '2026-11-17',
  expiresAt: '2027-04-30',
  refreshCommand: 'npm run knowledge:refresh',
  validationStatus: 'reviewed',
  asOf: '2026-11-16',
  supportedScope: 'España; series anuales EU-SILC 2015–2025; indicador general (personas ocupadas de 18 años o más, empleadas más de la mitad del año de referencia) y desglose ilc_iw07 por jornada completa o parcial',
  unsupportedScope: 'dificultad subjetiva para llegar a fin de mes, hogares concretos, desgloses territoriales, por sexo, edad, ocupación o contrato; ilc_iw07 solo separa jornada completa y parcial y no tiene dimensión de edad',
  observations: [
    ...annualSeries(
      generalSource,
      'in_work_poverty_rate',
      'Personas ocupadas en riesgo de pobreza',
      'Percentage',
      'Personas ocupadas de 18 años o más, empleadas más de la mitad del año de referencia; renta disponible equivalente del hogar inferior al 60 % de la mediana nacional tras transferencias',
      'Personas ocupadas de 18 años o más, según su situación laboral más frecuente en el año de referencia',
      { freq: 'A', wstatus: 'EMP', sex: 'T', age: 'Y_GE18', unit: 'PC' },
      [['2015', 13.1], ['2016', 13.1], ['2017', 13.1], ['2018', 12.9], ['2019', 12.7], ['2020', 11.8], ['2021', 12.7], ['2022', 11.7], ['2023', 11.3], ['2024', 11.2], ['2025', 11.2]],
    ),
    ...annualSeries(
      fullTimeSource,
      'in_work_poverty_full_time_rate',
      'Personas ocupadas a jornada completa en riesgo de pobreza',
      'Percentage',
      'Personas ocupadas a jornada completa; renta disponible equivalente del hogar inferior al 60 % de la mediana nacional tras transferencias; el dataset no ofrece un desglose de edad',
      'Personas ocupadas a jornada completa',
      { freq: 'A', worktime: 'FT', unit: 'PC' },
      [['2015', 10.3], ['2016', 10.7], ['2017', 10.7], ['2018', 10.9], ['2019', 10.7], ['2020', 9.7], ['2021', 10.9], ['2022', 9.7], ['2023', 9.3], ['2024', 9.6], ['2025', 9.5]],
    ),
    ...annualSeries(
      partTimeSource,
      'in_work_poverty_part_time_rate',
      'Personas ocupadas a jornada parcial en riesgo de pobreza',
      'Percentage',
      'Personas ocupadas a jornada parcial; renta disponible equivalente del hogar inferior al 60 % de la mediana nacional tras transferencias; el dataset no ofrece un desglose de edad',
      'Personas ocupadas a jornada parcial',
      { freq: 'A', worktime: 'PT', unit: 'PC' },
      [['2015', 27.1], ['2016', 24.3], ['2017', 26.9], ['2018', 22.5], ['2019', 22.1], ['2020', 19], ['2021', 21.4], ['2022', 21.2], ['2023', 20.5], ['2024', 19.2], ['2025', 18.6]],
    ),
  ],
});
