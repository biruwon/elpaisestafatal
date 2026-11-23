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
      replyIncludes: ['83,2 %', '20 a 64 años', '2025'],
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
      replyIncludes: ['83,2 %', '2025'],
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
];
