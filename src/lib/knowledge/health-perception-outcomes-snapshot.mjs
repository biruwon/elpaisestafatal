const satisfactionSeriesSource = {
  id: 'sanidad-barometer-satisfaction-2015-2025',
  title: 'Satisfacción con el funcionamiento del sistema sanitario público · evolución 2015–2025',
  publisher: 'Ministerio de Sanidad y CIS',
  url: 'https://www.sanidad.gob.es/estadEstudios/estadisticas/BarometroSanitario/Barom_Sanit_2025/Totales/Resumen_grafico-Barometro_Sanitario_2025-Evolutivas.pdf',
  retrievedAt: '2026-11-24',
  role: 'primary',
};

const satisfactionWaveSource = {
  id: 'sanidad-barometer-satisfaction-2026-wave2',
  title: 'Barómetro Sanitario 2026 · segunda oleada',
  publisher: 'Ministerio de Sanidad y CIS',
  url: 'https://www.sanidad.gob.es/estadEstudios/estadisticas/BarometroSanitario/Barom_Sanit_2026/2Oleada/2026_2_OLA_NOTA_TECNICA.pdf',
  publishedAt: '2026-11-03',
  retrievedAt: '2026-11-24',
  role: 'primary',
};

const oecdHealthSource = {
  id: 'oecd-health-at-a-glance-2025-spain',
  title: 'Health at a Glance 2025 · Spain country note',
  publisher: 'OECD',
  url: 'https://www.oecd.org/en/publications/2025/11/health-at-a-glance-2025-country-notes_2f94481e/spain_dff91989.html',
  publishedAt: '2025-11-13',
  retrievedAt: '2026-11-24',
  role: 'primary',
};

const adultPopulation = 'población general de España de 18 años o más';

export const HEALTH_PERCEPTION_OUTCOMES_SNAPSHOT = Object.freeze({
  schemaVersion: '1',
  owner: 'knowledge-review',
  createdAt: '2026-11-24',
  asOf: '2026-11-24',
  expiresAt: '2027-04-30',
  refreshCommand: 'Revisar la siguiente oleada del Barómetro Sanitario y la próxima actualización de Health Statistics de la OCDE, conservando periodos, población y ponderaciones.',
  validationStatus: 'reviewed',
  territories: ['ES'],
  supportedScope: 'España; satisfacción de la población general de 18 años o más con el funcionamiento del sistema sanitario público en una escala de 1 a 10, serie 2015–2025 y comparación entre segundas oleadas de 2025 y 2026; indicadores de salud, acceso y calidad comparados con la media de la OCDE en Health at a Glance 2025',
  unsupportedScope: 'opinión de cada paciente; satisfacción con un servicio o territorio concreto; una media anual de 2026; explicación causal de la satisfacción o los resultados; una valoración exhaustiva de toda la calidad clínica; resultados de salud de una persona concreta',
  directClaimEvidence: true,
  dimensions: {
    subject: 'percepción del sistema sanitario público y resultados de salud de la población',
    population: 'población general de España de 18 años o más en el Barómetro; población de España comparada con la OCDE en sus indicadores de salud',
    period: 'Barómetro Sanitario 2015–2026 (segunda oleada); edición OCDE 2025 con años de referencia variables según indicador',
    geography: 'España; comparación con media de la OCDE',
    denominator: 'personas entrevistadas de 18 años o más; métricas de salud según su definición estadística',
    unit: 'puntuación media en escala de 1 a 10; años de esperanza de vida; defunciones por 100.000 habitantes',
  },
  facts: [
    'Barómetro Sanitario, población general de 18 años o más y escala de 1 a 10: satisfacción de 6,74 en 2019 y 6,02 en 2025 (−0,72 puntos), el valor más bajo de la serie hasta 2025. No se hizo la encuesta en 2020 ni 2021; entre 2022 y 2025 la serie fue 6,25, 6,22, 6,22 y 6,02, con ponderaciones actualizadas para los datos desde 2022.',
    'En la segunda oleada del Barómetro, la nota fue 6,02 en 2025 (n=2.318) y 6,19 en 2026 (n=2.644), ambas para población general de 18 años o más: una subida de 0,17 puntos en esa comparación entre oleadas, no una media anual de 2026.',
    'Health at a Glance 2025 informa que España supera la media de la OCDE en 8 de 10 indicadores de estado de salud y factores de riesgo, pero en 5 de 10 indicadores de acceso y calidad (falta un indicador comparable). La esperanza de vida es 84 años, 2,9 más que la media OCDE; la mortalidad prevenible es 92 frente a 145 y la tratable 50 frente a 77 por 100.000 habitantes. La OCDE reúne los últimos datos comparables disponibles y los años de referencia varían por indicador.',
  ],
  factSourceIds: [
    [satisfactionSeriesSource.id],
    [satisfactionWaveSource.id],
    [oecdHealthSource.id],
  ],
  factDimensions: [
    {
      subject: 'satisfacción general con el funcionamiento del sistema sanitario público',
      population: adultPopulation,
      period: 'serie anual 2015–2025; sin encuesta en 2020–2021',
      geography: 'España',
      denominator: 'población general encuestada de 18 años o más, haya usado o no el sistema',
      unit: 'puntuación media en escala de 1 (muy insatisfecho) a 10 (muy satisfecho)',
    },
    {
      subject: 'satisfacción general con el funcionamiento del sistema sanitario público',
      population: adultPopulation,
      period: 'segunda oleada de 2025 frente a segunda oleada de 2026',
      geography: 'España',
      denominator: 'personas entrevistadas: n=2.318 en 2025 y n=2.644 en 2026',
      unit: 'puntuación media en escala de 1 a 10',
    },
    {
      subject: 'estado de salud, factores de riesgo, acceso y calidad asistencial',
      population: 'población de España comparada con la de los países de la OCDE',
      period: 'Health at a Glance 2025; año de referencia según cada indicador',
      geography: 'España y media de la OCDE',
      denominator: 'población total para esperanza de vida y tasas por 100.000; 10 indicadores seleccionados por dimensión',
      unit: 'años; defunciones por 100.000 habitantes; número de indicadores por encima de la media OCDE',
    },
  ],
  sources: [satisfactionSeriesSource, satisfactionWaveSource, oecdHealthSource],
  claimVerdictFor: () => 'mixed',
});
