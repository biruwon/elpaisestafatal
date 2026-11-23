// Held-out from the semantic phrase corpus: these claims grade the public
// answer's evidence, scope, value, and uncertainty rather than route recall.
export const textAnswerAccuracyCases = [
  {
    id: 'housing-completions-built-verb',
    equivalenceGroup: 'housing-completions-es-2025',
    input: 'En 2025 se acabaron 92.000 viviendas nuevas en España',
    expected: {
      state: 'limited',
      family: 'housing-completions',
      verdict: 'supported',
      directSourceIds: ['bde-housing-supply-2025'],
      replyIncludes: ['92.000', '2025', '9 % menos que en 2024'],
      replyExcludes: ['T2 2026', '+12,2 %', 'índice de compraventa'],
      evidence: [{
        familyId: 'housing-completions',
        sourceIds: ['bde-housing-supply-2025'],
        dataIncludes: ['92.000', '2025'],
        dimensions: { period: '2025', geography: 'España', population: 'viviendas nuevas terminadas', denominator: 'recuento anual', unit: 'viviendas' },
      }],
      maxReplyWords: 100,
    },
  },
  {
    id: 'housing-completions-finished-synonym',
    equivalenceGroup: 'housing-completions-es-2025',
    input: '¿Cuántas viviendas nuevas se concluyeron en España en 2025?',
    expected: {
      state: 'limited',
      family: 'housing-completions',
      verdict: 'supported',
      directSourceIds: ['bde-housing-supply-2025'],
      replyIncludes: ['92.000', '2025'],
      replyExcludes: ['T2 2026', '+12,2 %', 'índice de compraventa'],
      evidence: [{
        familyId: 'housing-completions',
        sourceIds: ['bde-housing-supply-2025'],
        dataIncludes: ['92.000', '2025'],
        dimensions: { period: '2025', geography: 'España', population: 'viviendas nuevas terminadas', denominator: 'recuento anual', unit: 'viviendas' },
      }],
      maxReplyWords: 100,
    },
  },
  {
    id: 'housing-completions-wrong-year',
    input: '¿Cuántas viviendas nuevas se terminaron en España en 2024?',
    expected: {
      state: 'insufficient', family: 'housing-completions', verdict: 'insufficient', directSourceIds: [],
      replyExcludes: ['92.000', '750.000'], evidence: [], maxReplyWords: 100,
    },
  },
  {
    id: 'housing-completions-wrong-territory',
    input: '¿Cuántas viviendas nuevas se terminaron en Madrid en 2025?',
    expected: {
      state: 'insufficient', family: 'housing-completions', verdict: 'insufficient', directSourceIds: [],
      replyExcludes: ['92.000', '750.000'], evidence: [], maxReplyWords: 100,
    },
  },
  {
    id: 'tertiary-employment-above-threshold',
    equivalenceGroup: 'tertiary-employment-2025-threshold',
    input: 'La tasa de empleo de las personas con estudios universitarios superó el 80 % en 2025',
    expected: {
      state: 'limited', family: 'education-employment-outcomes', verdict: 'supported',
      directSourceIds: ['eurostat-tertiary-employment'],
      replyIncludes: ['83,2 %', '20 a 64 años', '2025', 'supera el umbral de 80 %', 'respalda esa parte'],
      evidence: [{
        familyId: 'employment_rate_tertiary_education',
        sourceIds: ['eurostat-tertiary-employment'],
        dataIncludes: ['83,2 %', '2025'],
        dimensions: { period: '2025', geography: 'España', population: '20 a 64 años', denominator: 'todas las personas residentes', unit: '%' },
      }],
      maxReplyWords: 100,
    },
  },
  {
    id: 'tertiary-employment-below-threshold-neighbour',
    equivalenceGroup: 'tertiary-employment-2025-threshold',
    input: 'La tasa de empleo de las personas con estudios universitarios no llegó al 80 % en 2025',
    expected: {
      state: 'limited', family: 'education-employment-outcomes', verdict: 'contradicted',
      directSourceIds: ['eurostat-tertiary-employment'],
      replyIncludes: ['83,2 %', '2025', 'supera el umbral de 80 %', 'contradice esa parte'],
      evidence: [{
        familyId: 'employment_rate_tertiary_education',
        sourceIds: ['eurostat-tertiary-employment'],
        dataIncludes: ['83,2 %', '2025'],
        dimensions: { period: '2025', geography: 'España', population: '20 a 64 años', denominator: 'todas las personas residentes', unit: '%' },
      }],
      maxReplyWords: 100,
    },
  },
  {
    id: 'working-poverty-part-time-above-threshold',
    input: 'En 2025 el riesgo de pobreza entre las personas ocupadas a jornada parcial superó el 15 %',
    expected: {
      state: 'limited', family: 'working-poverty', verdict: 'supported',
      directSourceIds: ['eurostat-in-work-poverty-part-time-2026-11'],
      replyIncludes: ['18,6 %', '15 %', 'supera el umbral de 15 %', 'respalda esa parte', '2025'],
      evidence: [{
        familyId: 'in_work_poverty_part_time_rate',
        sourceIds: ['eurostat-in-work-poverty-part-time-2026-11'],
        dataIncludes: ['18,6 %', '2025'],
        dimensions: { period: '2025', geography: 'España', population: 'jornada parcial', denominator: 'personas ocupadas a jornada parcial', unit: '%' },
      }],
      maxReplyWords: 140,
    },
  },
  {
    id: 'working-poverty-part-time-below-threshold-neighbour',
    input: 'En 2025 el riesgo de pobreza entre las personas ocupadas a jornada parcial no llegó al 15 %',
    expected: {
      state: 'limited', family: 'working-poverty', verdict: 'contradicted',
      directSourceIds: ['eurostat-in-work-poverty-part-time-2026-11'],
      replyIncludes: ['18,6 %', '15 %', 'supera el umbral de 15 %', 'contradice esa parte', '2025'],
      evidence: [{
        familyId: 'in_work_poverty_part_time_rate',
        sourceIds: ['eurostat-in-work-poverty-part-time-2026-11'],
        dataIncludes: ['18,6 %', '2025'],
        dimensions: { period: '2025', geography: 'España', population: 'jornada parcial', denominator: 'personas ocupadas a jornada parcial', unit: '%' },
      }],
      maxReplyWords: 140,
    },
  },
  {
    id: 'working-poverty-part-time-comparison',
    input: 'En 2025 el riesgo de pobreza fue mayor entre quienes trabajan a jornada parcial que entre quienes trabajan a jornada completa',
    expected: {
      state: 'limited', family: 'working-poverty', verdict: 'supported',
      directSourceIds: ['eurostat-in-work-poverty-full-time-2026-11', 'eurostat-in-work-poverty-part-time-2026-11'],
      replyIncludes: ['18,6 %', '9,5 %', '9,1 puntos porcentuales', '2025'],
      evidence: [
        {
          familyId: 'in_work_poverty_part_time_rate', sourceIds: ['eurostat-in-work-poverty-part-time-2026-11'], dataIncludes: ['18,6 %', '2025'],
          dimensions: { period: '2025', geography: 'España', population: 'jornada parcial', denominator: 'personas ocupadas a jornada parcial', unit: '%' },
        },
        {
          familyId: 'in_work_poverty_full_time_rate', sourceIds: ['eurostat-in-work-poverty-full-time-2026-11'], dataIncludes: ['9,5 %', '2025'],
          dimensions: { period: '2025', geography: 'España', population: 'jornada completa', denominator: 'personas ocupadas a jornada completa', unit: '%' },
        },
      ],
      maxReplyWords: 150,
    },
  },
  {
    id: 'working-poverty-count-vs-rate',
    input: 'Ha aumentado el número de personas ocupadas en riesgo de pobreza entre 2015 y 2025',
    expected: {
      state: 'insufficient', family: 'working-poverty', verdict: 'insufficient', directSourceIds: [],
      replyIncludes: ['mide un porcentaje, no el número de personas', '13,1 %', '11,2 %'],
      evidence: [{
        familyId: 'in_work_poverty_rate', sourceIds: ['eurostat-in-work-poverty-2026-11'], dataIncludes: ['13,1 %', '11,2 %'],
        dimensions: { period: '2025', geography: 'España', population: 'personas ocupadas de 18 años o más', denominator: 'personas ocupadas de 18 años o más', unit: '%' },
      }],
      maxReplyWords: 160,
    },
  },
  {
    id: 'working-poverty-youth-age-boundary',
    input: 'En 2025, el riesgo de pobreza para jóvenes con jornada parcial fue del 18,6 %',
    expected: {
      state: 'insufficient', verdict: 'insufficient', directSourceIds: [], evidence: [],
      replyExcludes: ['18,6 %', '9,5 %'], maxReplyWords: 100,
    },
  },
  {
    id: 'primary-care-delay-days-above-threshold',
    input: 'La demora media para conseguir cita con el médico de familia superó los 7 días en la segunda oleada de 2026',
    expected: {
      state: 'limited', family: 'primary-care-waits', verdict: 'supported',
      directSourceIds: ['sanidad-primary-care-2026-wave2'],
      replyIncludes: ['9,71 días', '2026', 'oleada 2', 'supera el umbral de 7 días', 'respalda esa parte', 'provisionales'],
      evidence: [{
        familyId: 'primary_care_wait_days', sourceIds: ['sanidad-primary-care-2026-wave2'], dataIncludes: ['9,71 días', '2026 · oleada 2'],
        dimensions: { period: '2026-O2', geography: 'España', population: 'solo quienes esperaron más de un día por falta de cita', denominator: 'pregunta 5c_01 con respuesta válida en días', unit: 'días' },
      }],
      maxReplyWords: 160,
    },
  },
  {
    id: 'primary-care-delay-days-below-threshold-neighbour',
    input: 'La demora media para conseguir cita con el médico de familia no llegó a los 7 días en la segunda oleada de 2026',
    expected: {
      state: 'limited', family: 'primary-care-waits', verdict: 'contradicted',
      directSourceIds: ['sanidad-primary-care-2026-wave2'],
      replyIncludes: ['9,71 días', '2026', 'oleada 2', 'supera el umbral de 7 días', 'contradice esa parte'],
      evidence: [{
        familyId: 'primary_care_wait_days', sourceIds: ['sanidad-primary-care-2026-wave2'], dataIncludes: ['9,71 días', '2026 · oleada 2'],
        dimensions: { period: '2026-O2', geography: 'España', population: 'solo quienes esperaron más de un día por falta de cita', denominator: 'pregunta 5c_01 con respuesta válida en días', unit: 'días' },
      }],
      maxReplyWords: 160,
    },
  },
  {
    id: 'primary-care-wait-rate-above-threshold',
    equivalenceGroup: 'primary-care-rate-2026-threshold',
    input: 'Más del 70 % de pacientes de atención primaria esperó más de un día por falta de cita en la segunda oleada de 2026',
    expected: {
      state: 'limited', family: 'primary-care-waits', verdict: 'supported',
      directSourceIds: ['sanidad-primary-care-2026-wave2'],
      replyIncludes: ['72 %', '2026', 'oleada 2', 'supera el umbral de 70 %', 'respalda esa parte'],
      evidence: [{
        familyId: 'primary_care_wait_over_one_day_rate', sourceIds: ['sanidad-primary-care-2026-wave2'], dataIncludes: ['72 %', '2026 · oleada 2'],
        dimensions: { period: '2026-O2', geography: 'España', population: 'consultaron por un problema propio con medicina de familia pública en los últimos 12 meses', denominator: 'pacientes de la base de la pregunta 5c', unit: '%' },
      }],
      maxReplyWords: 160,
    },
  },
  {
    id: 'primary-care-wait-rate-numeric-day-paraphrase',
    equivalenceGroup: 'primary-care-rate-2026-threshold',
    input: 'Más del 70 % de pacientes de atención primaria esperó más de 1 día por falta de cita en la segunda oleada de 2026',
    expected: {
      state: 'limited', family: 'primary-care-waits', verdict: 'supported',
      directSourceIds: ['sanidad-primary-care-2026-wave2'],
      replyIncludes: ['72 %', '2026', 'oleada 2', 'supera el umbral de 70 %', 'respalda esa parte'],
      evidence: [{
        familyId: 'primary_care_wait_over_one_day_rate', sourceIds: ['sanidad-primary-care-2026-wave2'], dataIncludes: ['72 %', '2026 · oleada 2'],
        dimensions: { period: '2026-O2', geography: 'España', population: 'consultaron por un problema propio con medicina de familia pública en los últimos 12 meses', denominator: 'pacientes de la base de la pregunta 5c', unit: '%' },
      }],
      maxReplyWords: 160,
    },
  },
  {
    id: 'primary-care-wait-rate-wrong-day-threshold-neighbour',
    input: 'Más del 70 % de pacientes de atención primaria esperó más de 10 días por falta de cita en la segunda oleada de 2026',
    expected: {
      state: 'limited', family: 'primary-care-waits', verdict: 'insufficient',
      directSourceIds: ['sanidad-primary-care-2026-wave2'],
      replyIncludes: ['72 %', '2026', 'oleada 2', 'más de un día'],
      replyExcludes: ['supera el umbral de 70 %', 'contradice esa parte'],
      evidence: [{
        familyId: 'primary_care_wait_over_one_day_rate', sourceIds: ['sanidad-primary-care-2026-wave2'], dataIncludes: ['72 %', '2026 · oleada 2'],
        dimensions: { period: '2026-O2', geography: 'España', population: 'consultaron por un problema propio con medicina de familia pública en los últimos 12 meses', denominator: 'pacientes de la base de la pregunta 5c', unit: '%' },
      }],
      maxReplyWords: 160,
    },
  },
];
