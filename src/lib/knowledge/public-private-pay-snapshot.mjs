const source = {
  id: 'ine-ees-public-private-pay-2022',
  title: 'Encuesta de Estructura Salarial 2022 · principales resultados',
  publisher: 'Instituto Nacional de Estadística',
  url: 'https://www.ine.es/metodologia/t22/ees_prinre22.pdf',
  publishedAt: '2024-09-23',
  retrievedAt: '2026-11-24',
  role: 'primary',
};

const population = 'Personas asalariadas cubiertas por la Encuesta de Estructura Salarial del INE';
const period = '2022';
const geography = 'España';

export const PUBLIC_PRIVATE_PAY_SNAPSHOT = Object.freeze({
  schemaVersion: '1',
  owner: 'knowledge-review',
  createdAt: '2026-11-24',
  asOf: '2026-11-24',
  expiresAt: '2027-11-24',
  validationStatus: 'reviewed',
  territories: ['ES'],
  directClaimEvidence: false,
  when: (claim) => [...String(claim || '').matchAll(/\b20\d{2}\b/g)]
    .map(([year]) => Number(year))
    .every((year) => year === 2022),
  evidenceLabel: 'Ganancia bruta anual por tipo de control de la empresa · España, 2022',
  dimensions: {
    subject: 'ganancia bruta anual media y mediana por tipo de control del empleador',
    population,
    period,
    geography,
    denominator: 'personas asalariadas cubiertas por la EES; promedios agregados, no salarios por puesto equivalente',
    unit: 'euros brutos por trabajador y año',
  },
  facts: [
    'En 2022, la ganancia bruta anual media fue de 35.212,32 euros por trabajador en empresas de control público y de 24.751,40 euros en las de control privado; las medianas fueron 32.544,96 euros y 20.475,36 euros, respectivamente.',
    'El INE advierte que las ocupaciones y actividades difieren entre grupos: la comparación agregada no iguala puesto, cualificación, jornada ni antigüedad. El grupo público incluye empleados de empresas públicas y excluye a funcionarios adscritos al Sistema Especial de Clases Pasivas.',
  ],
  factSourceIds: [
    [source.id],
    [source.id],
  ],
  factDimensions: [
    {
      subject: 'media y mediana de la ganancia bruta anual por tipo de control empresarial',
      population,
      period,
      geography,
      denominator: 'personas asalariadas cubiertas por la EES, agrupadas por control público o privado; no se igualan puestos',
      unit: 'euros brutos por trabajador y año',
    },
    {
      subject: 'definición de control público y límites de la comparación agregada',
      population: 'empresas y trabajadores clasificados por el control del empleador; la EES excluye funcionarios adscritos al Sistema Especial de Clases Pasivas del grupo público e incluye empleados de empresas públicas',
      period: 'EES 2022',
      geography,
      denominator: 'composición ocupacional y actividades económicas de cada grupo; no es una comparación de puestos equivalentes',
      unit: 'cautela de alcance metodológico',
    },
  ],
  sources: [source],
});
