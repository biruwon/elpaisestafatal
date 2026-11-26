import { knownSubnationalGeographyIds } from './geography-scope.mjs';

const source = {
  id: 'bank-spain-housing-mobility-annual-2025',
  title: 'Informe Anual 2025 · efectos del alquiler en la movilidad entre provincias (recuadro 2.4)',
  publisher: 'Banco de España',
  url: 'https://www.bde.es/f/webbe/SES/Secciones/Publicaciones/PublicacionesAnuales/InformesAnuales/25/InfAnual_2025_Recuadros.pdf',
  publishedAt: '2026-06-18',
  retrievedAt: '2026-11-25',
  role: 'primary',
};

export const HOUSING_LABOUR_MOBILITY_EVIDENCE = {
  directClaimEvidence: false,
  claimVerdict: 'insufficient',
  expiresAt: '2027-06-18',
  territories: ['ES', ...knownSubnationalGeographyIds],
  when: (claim) => [...claim.matchAll(/\b20\d{2}\b/g)].every(([year]) => Number(year) >= 2014 && Number(year) <= 2024),
  evidenceLabel: 'Alquiler real y flujos de migración entre provincias',
  dimensions: {
    subject: 'efecto estimado de los precios reales del alquiler sobre flujos residenciales entre provincias',
    population: 'residentes que cambian de provincia; los modelos separan grupos por edad (menores de 35 o de 35 años o más) y lugar de nacimiento (España o extranjero), no por ocupación o cualificación',
    period: '2014–2024',
    geography: 'España; flujos entre provincias y coeficientes agregados, sin estimación separada para cada ciudad',
    denominator: 'cambio porcentual estimado en los flujos migratorios relativos ante una variación del 1 % del alquiler real relativo; no es un recuento de personas',
    unit: 'porcentaje de cambio estimado en flujos migratorios',
  },
  facts: [
    'El Banco de España modelizó los cambios de residencia entre provincias durante 2014–2024 usando flujos del INE y alquileres reales de la Agencia Tributaria. Los grupos se distinguen por edad —menores de 35 o de 35 años o más— y lugar de nacimiento —España o el extranjero—, no por profesión o nivel de estudios.',
    'En el modelo, un alquiler real medio un 1 % más alto en una provincia respecto a otra se asocia con un flujo relativo de migración interna un 0,6 % menor hacia la provincia más cara. Es una estimación del cambio relativo entre destinos, no el porcentaje de trabajadores que se marcha ni un número de empleos perdidos.',
    'El modelo compara destinos alternativos para el mismo origen, grupo y año, y controla por el salario medio y la población del destino. El coeficiente se agrupa para 2014–2024: la publicación no ofrece resultados por año, no desglosa por ocupación o cualificación, no pregunta el motivo de cada mudanza y no separa cada provincia o ciudad.',
  ],
  factSourceIds: [[source.id], [source.id], [source.id]],
  factDimensions: [
    {
      subject: 'flujos de cambios de residencia entre provincias en el análisis del Banco de España',
      population: 'residentes agrupados por edad (menores de 35 o de 35 años o más) y lugar de nacimiento (España o extranjero)',
      period: '2014–2024', geography: 'España, análisis provincial',
      denominator: 'flujos migratorios observados del INE combinados con alquileres medios reales provinciales de la AEAT',
      unit: 'observaciones de flujos residenciales; no puestos de trabajo',
    },
    {
      subject: 'respuesta estimada de los flujos de migración interna al alquiler real relativo del destino',
      population: 'residentes que se trasladan entre provincias españolas en los grupos estudiados',
      period: '2014–2024', geography: 'España, coeficiente agrupado entre provincias',
      denominator: 'flujo relativo hacia una provincia frente a destinos alternativos; variación del alquiler real relativo del 1 %',
      unit: 'cambio estimado del flujo relativo: −0,6 %',
    },
    {
      subject: 'controles y dimensiones no observadas en el estudio',
      population: 'modelos de flujos migratorios residenciales entre provincias',
      period: '2014–2024', geography: 'España; sin estimación por ciudad o provincia publicada en el resumen',
      denominator: 'comparación para mismo origen, grupo y año; se consideran salario medio y población de destino',
      unit: 'metodología y límites de desagregación',
    },
  ],
  sources: [source],
  shareableReplyForContext: () => {
    return [
      'El Banco de España estudió mudanzas entre provincias durante 2014–2024. Separó los grupos por edad (menores de 35 o 35 y más) y lugar de nacimiento (España o extranjero), no por ocupación.',
      'En el modelo, un alquiler real un 1 % más alto frente a destinos alternativos se asocia con un flujo relativo de migración interna un 0,6 % menor hacia esa provincia. Compara el mismo origen, grupo y año y controla por salario y población del destino; no es un recuento de trabajadores.',
      'Es un resultado agregado para España, sin desglose por ciudad o provincia. Mide mudanzas residenciales, no movilidad laboral: no demuestra que el alquiler frene cambios de trabajo ni obligue a profesionales a marcharse.',
    ].join('\n\n');
  },
};
