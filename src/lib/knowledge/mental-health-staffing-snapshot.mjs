const source = {
  id: 'ministry-sns-psychology-primary-care-2023',
  title: 'Informe Anual del Sistema Nacional de Salud 2024 · tabla 5-17',
  publisher: 'Ministerio de Sanidad',
  url: 'https://www.sanidad.gob.es/estadEstudios/estadisticas/sisInfSanSNS/tablasEstadisticas/InfAnual2024/INFORME_ANUAL_2024.pdf',
  retrievedAt: '2026-11-26',
  role: 'primary',
};

export const PUBLIC_MENTAL_HEALTH_STAFFING_SNAPSHOT = {
  directClaimEvidence: false,
  claimVerdict: 'insufficient',
  expiresAt: '2027-11-26',
  territories: ['ES'],
  when: (claim) => [...claim.matchAll(/\b20\d{2}\b/g)].every(([, year]) => Number(year) === 2023),
  evidenceLabel: 'Personal en la categoría Psicología de atención primaria del SNS',
  dimensions: {
    subject: 'profesionales clasificados en Psicología entre el personal de atención primaria del SNS',
    population: 'personal registrado en la categoría Psicología de otros profesionales sanitarios de atención primaria',
    period: '2023',
    geography: 'España, Sistema Nacional de Salud, atención primaria',
    denominator: 'recuento absoluto de profesionales en la categoría Psicología; no mide demanda asistencial',
    unit: 'profesionales registrados',
  },
  facts: [
    'El Informe Anual del Sistema Nacional de Salud 2024 contabiliza 548 profesionales en la categoría «Psicología» dentro de los otros profesionales sanitarios de atención primaria del SNS en España, con datos de 2023.',
    'La tabla cuenta personal de atención primaria, pero no desglosa cuántos son especialistas en Psicología Clínica ni equivalentes a jornada completa. Tampoco mide solicitudes, pacientes en espera o demanda no atendida.',
  ],
  factSourceIds: [[source.id], [source.id]],
  factDimensions: [
    {
      subject: 'profesionales clasificados en Psicología de atención primaria del SNS',
      population: 'otros profesionales sanitarios que trabajan en atención primaria del SNS',
      period: '2023',
      geography: 'España, Sistema Nacional de Salud',
      denominator: 'recuento absoluto de la categoría Psicología; sin denominador de jornada o demanda',
      unit: 'profesionales registrados',
    },
    {
      subject: 'dimensiones no desglosadas en el recuento de Psicología de atención primaria',
      population: 'personal de Psicología de atención primaria del SNS',
      period: '2023',
      geography: 'España, Sistema Nacional de Salud',
      denominator: 'no aplica; descripción del alcance de la tabla',
      unit: 'especialidad clínica, jornada equivalente y demanda no informadas',
    },
  ],
  sources: [source],
};
