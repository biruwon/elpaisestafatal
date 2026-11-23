// Reviewed from Banco de España, Financial Stability Report, Spring 2026,
// box 4.1. Its comparison uses a modelled 2016–2023 sample; it is not a
// current-year statistic or a measure of every household's purchase access.
export const MORTGAGE_ENTRY_VS_PAYMENT_EVIDENCE = Object.freeze({
  directClaimEvidence: true,
  claimVerdictFor: (claim) => {
    const text = String(claim || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
    const entry = '(?:entrada|ahorro previo|ahorro inicial|pago inicial|aportacion inicial|recursos iniciales|riqueza disponible)';
    const payment = '(?:cuota(?:s)?(?: hipotecarias?)?|mensualidad(?:es)?|pago mensual(?: hipotecario)?|capacidad de pago|pagos regulares)';
    const greater = '(?:mas|mayor(?:es)?|principal|importante|dificil|complicad\w*|limitant\w*|frecuent\w*|pes\w*|obstacul\w*|barrer\w*)';
    const less = '(?:menos|menor(?:es)?|secundari\w*|facil\w*|inferior\w*)';
    const entryMore = new RegExp(`\\b${entry}\\b.{0,90}\\b${greater}\\b.{0,80}\\b${payment}\\b`).test(text)
      || new RegExp(`\\b${payment}\\b.{0,80}\\b${less}\\b.{0,80}\\b${entry}\\b`).test(text);
    const paymentMore = new RegExp(`\\b${payment}\\b.{0,90}\\b${greater}\\b.{0,80}\\b${entry}\\b`).test(text)
      || new RegExp(`\\b${entry}\\b.{0,80}\\b${less}\\b.{0,80}\\b${payment}\\b`).test(text);
    const deniesEntryMore = new RegExp(`\\b${entry}\\b.{0,45}\\bno\\b.{0,60}\\b${greater}\\b.{0,80}\\b${payment}\\b`).test(text);
    const deniesPaymentMore = new RegExp(`\\b${payment}\\b.{0,45}\\bno\\b.{0,60}\\b${greater}\\b.{0,80}\\b${entry}\\b`).test(text);
    if (deniesEntryMore && !deniesPaymentMore) return 'contradicted';
    if (deniesPaymentMore && !deniesEntryMore) return 'supported';
    if (entryMore === paymentMore) return 'mixed';
    return entryMore ? 'supported' : 'contradicted';
  },
  expiresAt: '2027-05-14',
  territories: ['ES'],
  when: (claim) => {
    const text = String(claim || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
    const years = [...text.matchAll(/\b(?:19|20|21)\d{2}\b/g)];
    const asksSubgroup = /\b(?:joven\w*|juventud|menores? de \d+|mujer\w*|hombre\w*|por sexo|por genero|madrid|barcelona|valencia|sevilla|malaga|bilbao|ciudad|municipio|provincia|comunidad autonoma|mi hipoteca|mi vivienda|mi salario|mi sueldo)\b/.test(text);
    const asksCurrentPeriod = /\b(?:actual\w*|hoy|ahora|este ano|en este momento|en la actualidad|reciente\w*)\b/.test(text);
    const asksCausality = /\b(?:caus\w*|provoc\w*|gener\w*|impid\w*|evit\w*|responsable|por culpa|reduce\w*|aument\w*)\b/.test(text);
    return years.length === 0 && !asksSubgroup && !asksCurrentPeriod && !asksCausality;
  },
  evidenceLabel: 'Restricciones de patrimonio y capacidad de pago en el acceso hipotecario',
  dimensions: {
    subject: 'capacidad financiera para adquirir mediante hipoteca la primera vivienda principal deseada',
    population: 'hogares que vivían de alquiler o adquirían su primera vivienda principal con hipoteca; quedan fuera propietarios previos, compras sin hipoteca y hogares no emancipados',
    period: 'muestra 2016–2023; los porcentajes resumen el periodo y no describen solo 2023 ni la situación actual',
    geography: 'España',
    denominator: 'hogares de la muestra expuestos a comprar su primera vivienda mediante hipoteca o continuar en alquiler',
    unit: 'porcentaje con baja capacidad financiera modelada por restricción de riqueza o de renta',
  },
  facts: [
    'En la muestra anual española de hogares que alquilaban o compraban su primera vivienda con hipoteca (2016–2023), la limitación patrimonial fue más frecuente que la de renta: alrededor del 86 % frente al 35 %.',
    'La limitación patrimonial supone no tener patrimonio neto para una entrada del 20 %, impuestos y gastos de compra y un año de consumo, bajo una hipoteca del 80 % del precio deseado.',
    'La limitación de renta supone que el servicio total de deuda supere el 35 % de la renta neta. Los criterios pueden solaparse; los porcentajes no se suman.',
    'No se incluyeron propietarios, compras sin hipoteca ni hogares no emancipados; el estudio calcula que estos grupos son el 82 % de la población.',
  ],
  factSourceIds: [
    ['bde-financial-capacity-housing-2026-spring'],
    ['bde-financial-capacity-housing-2026-spring'],
    ['bde-financial-capacity-housing-2026-spring'],
    ['bde-financial-capacity-housing-2026-spring'],
  ],
  factDimensions: [
    {
      subject: 'baja capacidad financiera asociada al patrimonio neto necesario para la entrada, costes de transacción y un año de consumo',
      population: 'hogares que viven en alquiler o compran por primera vez su vivienda principal con hipoteca',
      period: 'muestra 2016–2023; promedio del periodo', geography: 'España',
      denominator: 'hogares de la muestra', unit: 'porcentaje de hogares',
    },
    {
      subject: 'baja capacidad financiera asociada a renta disponible después de pagar el servicio total de deuda',
      population: 'hogares que viven en alquiler o compran por primera vez su vivienda principal con hipoteca',
      period: 'muestra 2016–2023; promedio del periodo', geography: 'España',
      denominator: 'hogares de la muestra', unit: 'porcentaje de hogares',
    },
    {
      subject: 'comparación entre restricciones de entrada y de pago hipotecario',
      population: 'hogares de la muestra; las categorías pueden solaparse',
      period: 'muestra 2016–2023', geography: 'España',
      denominator: 'hogares de la muestra', unit: 'porcentaje de hogares',
    },
    {
      subject: 'representatividad del análisis de acceso hipotecario',
      population: 'población residente en España; el análisis considera hogares emancipados que alquilan o compran primera vivienda con hipoteca',
      period: 'muestra 2016–2023', geography: 'España',
      denominator: 'población residente', unit: 'porcentaje excluido del análisis',
    },
  ],
  sources: [{
    id: 'bde-financial-capacity-housing-2026-spring',
    title: 'Informe de Estabilidad Financiera · primavera de 2026, recuadro 4.1: capacidad financiera y acceso a la vivienda en propiedad mediante hipoteca',
    publisher: 'Banco de España',
    url: 'https://www.bde.es/f/webbe/Secciones/Publicaciones/InformesBoletinesRevistas/InformesEstabilidadFinancera/26/IEF_2026_1_Rec4_1.pdf',
    publishedAt: '2026-05-14',
    retrievedAt: '2026-11-23',
    role: 'primary',
  }],
});
