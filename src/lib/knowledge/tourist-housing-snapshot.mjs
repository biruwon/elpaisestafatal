// INE experimental tourist-dwelling estimate for May 2026, reviewed 24 Nov 2026.
// The national totals are context and do not measure dwellings withdrawn from
// long-term rent or the effect of tourism on housing supply.
const countSource = {
  id: 'ine-tourist-count',
  title: 'Viviendas turísticas estimadas en España · mayo de 2026 · INE',
  publisher: 'Instituto Nacional de Estadística',
  url: 'https://www.ine.es/consul/serie.do?d=true&nult=15&s=VTE71',
  retrievedAt: '2026-11-24',
  role: 'primary',
};

const shareSource = {
  id: 'ine-tourist-share',
  title: 'Viviendas turísticas sobre el total de viviendas censadas · mayo de 2026 · INE',
  publisher: 'Instituto Nacional de Estadística',
  url: 'https://www.ine.es/consul/serie.do?L=0&d=true&s=VTE287',
  retrievedAt: '2026-11-24',
  role: 'primary',
};

const population = 'Viviendas turísticas estimadas por el INE a partir de anuncios en plataformas de alojamiento';

export const TOURIST_HOUSING_SNAPSHOT = Object.freeze({
  schemaVersion: '1',
  owner: 'knowledge-review',
  createdAt: '2026-11-24',
  expiresAt: '2027-01-31',
  refreshCommand: 'Review the next INE experimental Viviendas Turísticas release and update the count and housing-stock share.',
  validationStatus: 'reviewed',
  asOf: '2026-11-24',
  supportedScope: 'Spain national level; INE experimental estimate of tourist dwellings and their share of the 2021 Census housing stock; May 2026',
  unsupportedScope: 'homes withdrawn from residential rent, available rental supply, licensed dwellings, neighborhood effects, current rental-stock denominator, or a causal effect of tourism on housing costs or supply',
  observations: [
    {
      id: 'ine-tourist-dwellings-2026M05-ES',
      kind: 'observation',
      dataKind: 'snapshot',
      metricId: 'tourist_housing_count',
      metric: 'Viviendas turísticas estimadas',
      value: 341001,
      unit: 'viviendas',
      period: '2026M05',
      geography: 'España',
      population,
      dimensions: { geo: 'ES', geographyLevel: 'country' },
      source: countSource,
    },
    {
      id: 'ine-tourist-housing-share-2026M05-ES',
      kind: 'observation',
      dataKind: 'snapshot',
      metricId: 'tourist_housing_share',
      metric: 'Viviendas turísticas sobre el total de viviendas censadas',
      value: 1.28,
      unit: '%',
      period: '2026M05',
      geography: 'España',
      population,
      denominator: 'Viviendas del Censo de Población y Viviendas 2021',
      dimensions: {
        geo: 'ES', geographyLevel: 'country',
        denominator: 'total housing stock in the 2021 Population and Housing Census',
      },
      source: shareSource,
    },
  ],
});
