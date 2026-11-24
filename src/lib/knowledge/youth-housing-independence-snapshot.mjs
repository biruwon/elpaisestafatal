const ineSource = {
  id: 'youth-family-housing-ine',
  title: 'Encuesta de Condiciones de Vida 2025 · dificultades de acceso a la vivienda',
  publisher: 'Instituto Nacional de Estadística',
  url: 'https://www.ine.es/dyngs/Prensa/es/m3ECV2025.htm',
  publishedAt: '2026-04-27',
  retrievedAt: '2026-11-24',
  role: 'primary',
};

const cjeSource = {
  id: 'cje-emancipation-2025',
  title: 'Observatorio de Emancipación 2025 · balance general',
  publisher: 'Consejo de la Juventud de España',
  url: 'https://www.cje.org/download/313/ano-2025/23618/2025-balance-general.pdf',
  publishedAt: '2026-05-26',
  retrievedAt: '2026-11-24',
  role: 'primary',
};

const cjeMethodology = {
  id: 'cje-emancipation-methodology',
  title: 'Observatorio de Emancipación · población joven y alcance',
  publisher: 'Consejo de la Juventud de España',
  url: 'https://www.cje.org/observatorio-de-emancipacion/',
  retrievedAt: '2026-11-24',
  role: 'primary',
};

const requestedYearsFit = (claim) => [...String(claim || '').matchAll(/\b20\d{2}\b/g)]
  .map(([year]) => year)
  .every((year) => year === '2025');

export const YOUTH_HOUSING_INDEPENDENCE_SNAPSHOT = Object.freeze({
  schemaVersion: '1',
  owner: 'knowledge-review',
  createdAt: '2026-11-24',
  asOf: '2026-11-24',
  expiresAt: '2027-04-27',
  validationStatus: 'reviewed',
  territories: ['ES'],
  directClaimEvidence: false,
  when: requestedYearsFit,
  evidenceLabel: 'Emancipación juvenil y barreras declaradas de acceso a vivienda · España, 2025',
  supportedScope: 'España; encuesta ECV sobre personas de 26–34 años, desgloses por renta personal; tasas CJE de emancipación por situación laboral para jóvenes de 16–29 años y datos generales de salarios y alquiler, en 2025',
  unsupportedScope: 'situación de empleo estable o jornada completa; efecto causal de los precios de vivienda; duración del retraso en emanciparse; resultados para otros años o ciudades',
  dimensions: {
    subject: 'convivencia con los padres, motivos declarados de acceso a vivienda y emancipación juvenil',
    population: 'personas de 26–34 años en la ECV; personas jóvenes de 16–29 años en el CJE',
    period: '2025',
    geography: 'España',
    denominator: 'porcentajes de cada grupo de edad, renta o convivencia definido por la fuente; no son una tasa de empleo estable',
    unit: 'porcentaje de personas',
  },
  facts: [
    'En la ECV 2025, el 29,4 % de las personas de 26–34 años con más de 24.000 euros netos anuales de renta personal vivía con alguno de sus padres. Entre quienes convivían con sus padres dentro de ese grupo, el 30,0 % señaló como motivo principal no poder permitirse alquilar o comprar una vivienda. En el grupo con 6.000 euros netos anuales o menos, las cifras fueron 55,5 % y 48,7 %, respectivamente.',
    'En el conjunto de personas de 26–34 años, el 44,3 % convivía con alguno de sus padres. Entre quienes lo hacían, el 34,6 % señaló no poder permitirse alquilar y el 12,7 % no poder acceder a la compra; son motivos principales declarados, no una medida del tiempo que llevan esperando para emanciparse.',
    'El CJE situó en el 14,5 % la tasa general de emancipación residencial de las personas jóvenes en España en 2025; su población de referencia es de 16–29 años y la tasa no está desglosada por estabilidad del empleo o jornada.',
    'En 2025, el 25,2 % de la población ocupada de 16–29 años estaba emancipada, frente al 17,0 % de la población en paro y el 5,2 % de la inactiva. El CJE desglosa la emancipación por situación de actividad, no por estabilidad del contrato.',
    'El 67,0 % de las personas asalariadas de 16–29 años tenía contrato indefinido en 2025. El informe publica esa proporción y la tasa de emancipación de la población ocupada en tablas distintas; no informa qué parte de quienes tenían contrato indefinido estaba emancipada.',
    'A finales de 2025, el alquiler medio de una vivienda libre completa fue de 1.176 euros al mes. El CJE calculó que ese coste equivalía al 98,7 % del salario neto mensual mediano de una persona joven asalariada para alquilar en solitario; es una comparación de promedios, no el gasto observado de cada trabajador.',
    'La ECV publica cruces por renta personal y nivel de formación, no por estabilidad contractual o jornada. Ni esas respuestas ni las tasas anuales del CJE siguen a las mismas personas para medir cuánto retrasan los precios la emancipación.',
  ],
  factSourceIds: [
    [ineSource.id],
    [ineSource.id],
    [cjeSource.id, cjeMethodology.id],
    [cjeSource.id, cjeMethodology.id],
    [cjeSource.id],
    [cjeSource.id],
    [ineSource.id, cjeSource.id, cjeMethodology.id],
  ],
  factDimensions: [
    {
      subject: 'convivencia con los padres y motivo principal entre personas de 26–34 años por renta personal',
      population: 'personas de 26–34 años; motivos calculados solo entre quienes convivían con sus padres',
      period: 'ECV 2025',
      geography: 'España',
      denominator: 'renta personal neta anual superior a 24.000 euros para convivencia; motivos solo entre quienes convivían con sus padres; comparador de 6.000 euros o menos',
      unit: 'porcentaje',
    },
    {
      subject: 'convivencia con los padres y motivos declarados de acceso a vivienda',
      population: 'personas de 26–34 años; motivos calculados solo entre quienes convivían con sus padres',
      period: 'ECV 2025',
      geography: 'España',
      denominator: 'personas de 26–34 años para convivencia; personas convivientes para el motivo principal',
      unit: 'porcentaje',
    },
    {
      subject: 'tasa general de emancipación residencial juvenil',
      population: 'personas jóvenes de 16–29 años según la definición del Observatorio de Emancipación',
      period: '2025; balance publicado en mayo de 2026',
      geography: 'España',
      denominator: 'población joven de 16–29 años; no se desglosa por empleo o jornada',
      unit: 'porcentaje',
    },
    {
      subject: 'tasa de emancipación por situación de actividad',
      population: 'personas ocupadas, en paro o inactivas de 16–29 años',
      period: '2025',
      geography: 'España',
      denominator: 'personas de 16–29 años de cada grupo de actividad; no se desglosa por tipo de contrato',
      unit: 'porcentaje',
    },
    {
      subject: 'contratos indefinidos entre personas asalariadas jóvenes',
      population: 'personas asalariadas de 16–29 años',
      period: '2025',
      geography: 'España',
      denominator: 'población asalariada de 16–29 años; no cruzada con emancipación',
      unit: 'porcentaje',
    },
    {
      subject: 'precio medio del alquiler de una vivienda completa frente al salario joven',
      population: 'persona joven asalariada de 16–29 años que alquilaría sola; salario neto mediano de jóvenes asalariados de 16–29 años',
      period: 'finales de 2025',
      geography: 'España',
      denominator: 'salario neto mensual mediano de una persona joven asalariada de 16–29 años',
      unit: 'euros al mes; porcentaje del salario',
    },
    {
      subject: 'variables publicadas y límites para atribuir retrasos de emancipación a precios y empleo estable',
      population: 'personas de 26–34 años en la ECV y personas de 16–29 años en el CJE',
      period: 'ECV y CJE 2025',
      geography: 'España',
      denominator: 'cruce ECV por renta y formación; no incluye estabilidad contractual ni seguimiento temporal',
      unit: 'alcance metodológico',
    },
  ],
  sources: [cjeSource, cjeMethodology, ineSource],
});
