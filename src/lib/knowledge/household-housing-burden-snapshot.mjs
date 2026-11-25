const source = {
  id: 'eurostat-housing-overburden-household-composition-2025',
  title: 'Housing cost overburden rate by household type — EU-SILC (ilc_lvho07e)',
  publisher: 'Eurostat',
  url: 'https://ec.europa.eu/eurostat/databrowser/view/ilc_lvho07e/default/table?lang=en',
  retrievedAt: '2026-11-25',
  role: 'primary',
};

export const HOUSEHOLD_HOUSING_BURDEN_EVIDENCE = {
  directClaimEvidence: false,
  claimVerdict: 'insufficient',
  expiresAt: '2027-11-25',
  territories: ['ES'],
  when: (claim) => [...claim.matchAll(/\b20\d{2}\b/g)].every(([year]) => Number(year) >= 2020 && Number(year) <= 2025),
  evidenceLabel: 'Sobrecarga de los costes de vivienda por composición del hogar',
  dimensions: {
    subject: 'población menor de 65 años que vive en hogares con sobrecarga de costes de vivienda',
    population: 'personas menores de 65 años en hogares de un adulto o de dos adultos; no identifica parejas ni se limita a inquilinos',
    period: '2020 y 2025',
    geography: 'España',
    denominator: 'población del mismo grupo de composición del hogar',
    unit: 'porcentaje de personas que viven en hogares donde los costes de vivienda superan el 40 % de la renta disponible',
  },
  facts: [
    'En 2025, el 24,4 % de las personas menores de 65 años en hogares de un solo adulto vivía en un hogar con sobrecarga de costes de vivienda, frente al 8,4 % de quienes vivían en hogares de dos adultos menores de 65 años.',
    'En 2020, las tasas para esos mismos grupos fueron del 22,7 % y del 9,0 %, respectivamente.',
    'Eurostat define la sobrecarga como costes totales de vivienda superiores al 40 % de la renta disponible del hogar, descontadas las ayudas a la vivienda. Incluye propietarios e inquilinos y gastos como suministros; «dos adultos» no equivale necesariamente a una pareja.',
  ],
  factSourceIds: [[source.id], [source.id], [source.id]],
  factDimensions: [
    {
      subject: 'sobrecarga de vivienda entre personas menores de 65 años en hogares de un solo adulto',
      population: 'personas menores de 65 años que viven en hogares de un adulto',
      period: '2025',
      geography: 'España',
      denominator: 'población menor de 65 años que vive en hogares de un adulto',
      unit: '24,4 % supera el umbral de sobrecarga',
    },
    {
      subject: 'sobrecarga de vivienda entre personas menores de 65 años en hogares de dos adultos',
      population: 'personas menores de 65 años que viven en hogares de dos adultos',
      period: '2025',
      geography: 'España',
      denominator: 'población menor de 65 años que vive en hogares de dos adultos',
      unit: '8,4 % supera el umbral de sobrecarga',
    },
    {
      subject: 'cambio en la sobrecarga de costes de vivienda por composición del hogar',
      population: 'personas menores de 65 años en hogares de uno o dos adultos',
      period: '2020 y 2025',
      geography: 'España',
      denominator: 'población del mismo grupo de composición del hogar en cada año',
      unit: 'porcentaje de población del grupo que vive en un hogar sobrecargado: 22,7 % en hogares de un adulto y 9,0 % en hogares de dos adultos',
    },
  ],
  sources: [source],
  shareableReplyForContext: ({ facts }) => [
    facts[0] + ' ' + facts[1],
    facts[2],
    'La diferencia describe sobrecarga de costes en hogares de todos los regímenes de tenencia: no permite concluir que sea más fácil alquilar en pareja. Para comprobar el acceso al alquiler harían falta datos solo de inquilinos y resultados de solicitudes o contratos, con renta, edad y territorio comparables.',
  ].join('\n\n'),
};
