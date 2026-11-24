const chainPricesSource = {
  id: 'mapa-food-chain-prices-and-methodology',
  title: 'Estudios e informes de cadena de valor · precios en origen, mayorista y destino',
  publisher: 'Ministerio de Agricultura, Pesca y Alimentación',
  url: 'https://www.mapa.gob.es/es/alimentacion/temas/observatorio-cadena/cadenas-valor',
  retrievedAt: '2026-11-24',
  role: 'primary',
};

const producerPriceSource = {
  id: 'mapa-agricultural-prices-perceived',
  title: 'Índices y precios percibidos agrarios',
  publisher: 'Ministerio de Agricultura, Pesca y Alimentación',
  url: 'https://www.mapa.gob.es/es/estadistica/temas/estadisticas-agrarias/economia/precios-percibidos-pagados/precios-percibidos-por-los-agricultores-y-ganaderos',
  retrievedAt: '2026-11-24',
  role: 'primary',
};

export const FOOD_CHAIN_PRICE_SPREAD_EVIDENCE = Object.freeze({
  directClaimEvidence: false,
  expiresAt: '2027-11-24',
  territories: ['ES'],
  evidenceLabel: 'Precios por etapas de productos alimentarios y límites de comparación',
  dimensions: {
    subject: 'precios de productos seleccionados en distintas etapas comerciales e índices nacionales de precios percibidos por agricultores',
    population: 'productos y mercados incluidos en las series del MAPA; su cobertura varía según producto y etapa',
    period: 'varía por producto y publicación; algunas series de precios percibidos son mensuales y anuales',
    geography: 'España; el alcance territorial y los mercados observados varían por serie',
    denominator: 'depende del producto y etapa; las series no ofrecen una cuota universal del precio final',
    unit: 'euros por kilogramo, unidad o docena, o índice de precios, según la serie',
  },
  facts: [
    'El Observatorio del MAPA publica precios de productos seleccionados en origen, mayorista y destino. Su estadística de precios percibidos sigue la evolución nacional mensual y anual de lo que reciben agricultores y ganaderos; no mide qué parte del precio final obtiene el productor.',
    'El MAPA advierte que las series de cada etapa usan especificaciones propias. La diferencia de precios es un margen bruto, no el beneficio neto: para calcularlo hay que descontar los costes atribuibles a cada fase de comercialización.',
  ],
  factSourceIds: [
    ['mapa-food-chain-prices-and-methodology', 'mapa-agricultural-prices-perceived'],
    ['mapa-food-chain-prices-and-methodology'],
  ],
  factDimensions: [
    {
      subject: 'precios de productos seleccionados en distintas etapas y evolución de los precios percibidos por los productores',
      population: 'productos y mercados incluidos en las series del MAPA; cobertura variable por producto y etapa',
      period: 'precios percibidos mensuales y anuales; otras series varían por producto',
      geography: 'España; depende de los mercados observados por la serie',
      denominator: 'no mide qué proporción del precio minorista corresponde al productor',
      unit: 'euros por kilogramo, unidad o docena, o índice, según la serie',
    },
    {
      subject: 'diferencia entre precios brutos y beneficio neto por eslabón',
      population: 'costes de los procesos de comercialización de cada producto',
      period: 'criterio metodológico publicado por el MAPA',
      geography: 'España',
      denominator: 'beneficio neto requiere descontar costes directos e indirectos atribuibles',
      unit: 'margen bruto y beneficio neto; no son medidas equivalentes',
    },
  ],
  sources: [chainPricesSource, producerPriceSource],
});
