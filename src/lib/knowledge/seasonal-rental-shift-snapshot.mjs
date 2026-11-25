import { requestedGeographyScopes } from './geography-scope.mjs';

const source = {
  id: 'catalonia-seasonal-rental-deposits-q2-2026',
  title: 'Lloguer de temporada per trimestres i municipis fins al 2n trimestre de 2026',
  publisher: 'Agència de l’Habitatge de Catalunya · INCASÒL',
  url: 'https://habitatge.gencat.cat/ca/dades/indicadors_estadistiques/estadistiques_de_construccio_i_mercat_immobiliari/mercat_de_lloguer/lloguer-de-temporada/',
  publishedAt: '2026-11-02',
  retrievedAt: '2026-11-25',
  role: 'primary',
};

export const SEASONAL_RENTAL_SHIFT_EVIDENCE = {
  directClaimEvidence: false,
  claimVerdict: 'insufficient',
  expiresAt: '2027-02-02',
  territories: ['ES', 'cataluna'],
  when: (claim) => [...claim.matchAll(/\b20\d{2}\b/g)].every(([year]) => Number(year) >= 2023 && Number(year) <= 2026),
  evidenceLabel: 'Contratos de temporada con fianza depositada en Cataluña',
  dimensions: {
    subject: 'contratos de alquiler de temporada con fianza registrada en el INCASÒL',
    population: 'contratos de temporada incluidos en el registro de fianzas; no viviendas seguidas en el tiempo',
    period: '2023–2026-T2',
    geography: 'Cataluña; suma de los registros municipales',
    denominator: 'contratos de temporada con fianza depositada; no incluye el total de contratos de larga duración',
    unit: 'contratos registrados',
  },
  facts: [
    'Sumando el campo «Total» de los 947 municipios de Cataluña, el registro contabiliza 9.330 contratos de temporada con fianza en 2023, 13.517 en 2024 y 13.152 en 2025.',
    'En el primer semestre de 2026 se registraron 4.191 contratos de temporada con fianza en Cataluña, frente a 6.594 en el mismo semestre de 2025; son periodos parciales comparables, no totales anuales.',
    'La estadística parte de las fianzas de alquiler de temporada depositadas en el INCASÒL. Cuenta contratos, no viviendas únicas: no enlaza un contrato temporal con el contrato previo de larga duración ni mide qué parte de la oferta temporal corresponde a zonas de alta demanda.',
  ],
  factSourceIds: [[source.id], [source.id], [source.id]],
  factDimensions: [
    {
      subject: 'contratos de temporada con fianza depositada',
      population: 'contratos incluidos en la suma de las tablas de 947 municipios catalanes',
      period: '2023–2025', geography: 'Cataluña, suma municipal',
      denominator: 'suma del campo «Total» de cada municipio; no es un recuento de viviendas únicas ni una proporción de todos los alquileres',
      unit: 'contratos con fianza depositada por año',
    },
    {
      subject: 'contratos de temporada con fianza depositada en los dos primeros trimestres',
      population: 'contratos incluidos en la suma de las tablas de 947 municipios catalanes',
      period: '2025-T1–T2 y 2026-T1–T2', geography: 'Cataluña, suma municipal',
      denominator: 'contratos con fianza depositada en el mismo semestre; no es un año completo',
      unit: 'contratos registrados: 6.594 en 2025-T1–T2 y 4.191 en 2026-T1–T2',
    },
    {
      subject: 'cobertura de la estadística de alquiler de temporada',
      population: 'contratos de temporada a partir de las fianzas inscritas en el INCASÒL',
      period: 'serie publicada desde 2023; último dato consultado: 2026-T2',
      geography: 'Cataluña, con desglose municipal disponible en la fuente',
      denominator: 'no enlaza cambios de régimen en una misma vivienda ni publica el total comparable de contratos de larga duración',
      unit: 'contratos registrados, no transiciones entre tipos de alquiler',
    },
  ],
  sources: [source],
  shareableReplyForContext: ({ claim, facts }) => {
    const namesSubnationalArea = requestedGeographyScopes(claim).some(({ type }) => type === 'region');
    return [
      facts[0],
      facts[1],
      facts[2],
      ...(namesSubnationalArea ? ['La fuente ofrece datos por municipio, pero estos totales regionales no demuestran que los contratos habituales se hayan sustituido en la zona concreta que indica la afirmación.'] : []),
      'Los datos aportan contexto sobre contratos temporales registrados en Cataluña, pero no permiten concluir que el alquiler temporal esté sustituyendo al de larga duración en zonas de alta demanda. Para comprobarlo hacen falta contratos temporales y habituales comparables y un seguimiento de las mismas viviendas o una medida de conversión entre ambos tipos.',
    ].join('\n\n');
  },
};
