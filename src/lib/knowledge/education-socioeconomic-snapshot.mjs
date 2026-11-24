// OECD PISA 2025 results for Spain, reviewed 2026-11-24. This is context for
// claims about socioeconomic background and student performance; the data do
// not isolate family income or identify a causal effect.
const spainResults = {
  id: 'oecd-pisa-2025-spain-socioeconomic-results',
  title: 'PISA 2025 Results (Volume I): Spain · OECD country note',
  publisher: 'OECD',
  url: 'https://www.oecd.org/en/publications/pisa-2025-results-volume-i-country-notes_2d4ff9ea-en/spain_748275c0-en.html',
  publishedAt: '2026-09-08',
  retrievedAt: '2026-11-24',
  role: 'primary',
};

const escsDefinition = {
  id: 'oecd-pisa-2025-framework',
  title: 'PISA 2025 Assessment and Analytical Framework · OECD',
  publisher: 'OECD',
  url: 'https://www.oecd.org/content/dam/oecd/en/publications/reports/2026/05/pisa-2025-assessment-and-analytical-framework_3abce6d6/86c36975-en.pdf',
  retrievedAt: '2026-11-24',
  role: 'primary',
};

export const EDUCATION_SOCIOECONOMIC_SNAPSHOT = Object.freeze({
  schemaVersion: '1',
  owner: 'knowledge-review',
  createdAt: '2026-11-24',
  expiresAt: '2028-09-08',
  validationStatus: 'reviewed',
  asOf: '2026-11-24',
  directClaimEvidence: false,
  evidenceLabel: 'Diferencias socioeconómicas en el rendimiento de ciencias según PISA 2025',
  supportedScope: 'España; resultados PISA 2025 de ciencias entre estudiantes de 15 años; asociación con el índice socioeconómico ESCS',
  unsupportedScope: 'efecto causal de los ingresos familiares; calificaciones escolares; todas las edades, materias, cursos o centros; acceso a centros según el barrio; tutorías privadas; una medida de si la diferencia es «demasiado» grande',
  dimensions: {
    subject: 'diferencia de puntuación en ciencias y asociación estadística con el estatus socioeconómico en PISA',
    population: 'estudiantes de 15 años; la nota nacional representa aproximadamente 459.800 estudiantes a partir de una muestra de 29.967 estudiantes de 956 centros',
    period: 'PISA 2025; resultados publicados el 8 de septiembre de 2026',
    geography: 'España',
    denominator: 'los cuartiles comparan cada uno al 25 % de los estudiantes de 15 años según ESCS; el 9 % se refiere a la variación de las puntuaciones de ciencias',
    unit: 'puntos PISA y porcentaje de variación estadística',
  },
  facts: [
    'En PISA 2025, los estudiantes de 15 años en España del cuartil socioeconómico superior obtuvieron 71 puntos más en ciencias que los del cuartil inferior; cada grupo representa el 25 % del alumnado. La diferencia media entre ambos grupos en la OCDE fue de 85 puntos.',
    'En PISA 2025, la asociación con el estatus socioeconómico correspondió estadísticamente al 9 % de la variación de las puntuaciones de ciencias en España; la media de la OCDE fue del 12 %.',
    'El índice ESCS combina educación y ocupación parentales con posesiones del hogar; no mide solo los ingresos familiares. El marco de PISA indica que sus resultados identifican correlaciones empíricas, no efectos causales.',
  ],
  factSourceIds: [
    ['oecd-pisa-2025-spain-socioeconomic-results'],
    ['oecd-pisa-2025-spain-socioeconomic-results'],
    ['oecd-pisa-2025-framework'],
  ],
  factDimensions: [
    {
      subject: 'brecha entre puntuaciones medias en ciencias por cuartil nacional de ESCS',
      population: 'estudiantes de 15 años en el cuartil superior y el cuartil inferior del estatus socioeconómico; 25 % en cada cuartil',
      period: 'PISA 2025', geography: 'España',
      denominator: 'puntuaciones de ciencias de cada cuartil; no es una diferencia entre calificaciones escolares',
      unit: 'puntos PISA',
    },
    {
      subject: 'variación de las puntuaciones de ciencias asociada estadísticamente al estatus socioeconómico',
      population: 'estudiantes de 15 años participantes en PISA',
      period: 'PISA 2025', geography: 'España; comparación con la media OCDE',
      denominator: 'variación estadística de las puntuaciones de ciencias',
      unit: 'porcentaje de variación; no es una proporción causal',
    },
    {
      subject: 'definición del índice socioeconómico y cultural ESCS y alcance causal de los resultados PISA',
      population: 'estudiantes participantes en PISA', period: 'marco analítico de PISA 2025', geography: 'países participantes en PISA',
      denominator: 'componentes del índice: educación parental, estatus ocupacional parental y posesiones del hogar; PISA identifica correlaciones',
      unit: 'índice compuesto; no mide exclusivamente ingresos ni identifica efectos causales',
    },
  ],
  sources: [spainResults, escsDefinition],
});
