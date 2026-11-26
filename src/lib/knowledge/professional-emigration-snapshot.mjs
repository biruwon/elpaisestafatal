// The latest reviewed INE occupational breakdown for Spanish nationals who
// emigrated abroad. It is useful context for brain-drain claims, but it does
// not establish where people studied, whether they worked after arrival, or
// why they emigrated.
export const PROFESSIONAL_EMIGRATION_SNAPSHOT = Object.freeze({
  directClaimEvidence: false,
  expiresAt: '2027-03-31',
  territories: ['ES'],
  evidenceLabel: 'Ocupación de las personas de nacionalidad española que emigraron al extranjero',
  dimensions: {
    subject: 'ocupación de personas emigrantes, según la clasificación publicada por el INE',
    population: 'personas de nacionalidad española que emigraron desde España al extranjero',
    period: 'emigraciones de 2023; publicadas en diciembre de 2025',
    geography: 'salidas desde España a destinos del extranjero, agregados',
    denominator: 'total de emigrantes de nacionalidad española en la clasificación ocupacional del INE',
    unit: 'porcentaje del total de emigrantes españoles',
  },
  facts: [
    'En 2023, técnicos y profesionales científicos e intelectuales representaron el 18,3 % de las personas de nacionalidad española que emigraron al extranjero, según la Estadística de Migraciones y Cambios de Residencia (EMCR) del INE.',
    'La EMCR registra movimientos de residencia y características censales como nivel educativo, actividad y ocupación. Esta clasificación ocupacional no identifica dónde se formó cada persona, si trabajó en el país de destino ni el motivo de su salida.',
  ],
  factSourceIds: [
    ['ine-emcr-2024-professional-emigration'],
    ['ine-emcr-methodology-faq'],
  ],
  factDimensions: [
    {
      subject: 'técnicos y profesionales científicos e intelectuales entre las personas emigrantes',
      population: 'personas de nacionalidad española que emigraron desde España al extranjero',
      period: '2023',
      geography: 'emigración exterior desde España; destinos agregados',
      denominator: 'total de emigrantes de nacionalidad española en la clasificación ocupacional del INE',
      unit: 'porcentaje',
    },
    {
      subject: 'variables que caracterizan los movimientos migratorios exteriores',
      population: 'personas que protagonizan movimientos migratorios exteriores de residentes en España',
      period: 'EMCR; serie anual desde 2021',
      geography: 'España y países de destino',
      denominator: 'no aplica; descripción metodológica',
      unit: 'alcance de la estadística',
    },
  ],
  sources: [
    {
      id: 'ine-emcr-2024-professional-emigration',
      title: 'Estadística de Migraciones y Cambios de Residencia (EMCR), año 2024',
      publisher: 'Instituto Nacional de Estadística (INE)',
      url: 'https://www.ine.es/dyngs/Prensa/EMCR2024.htm',
      publishedAt: '2025-12-11',
      retrievedAt: '2026-11-26',
      role: 'primary',
    },
    {
      id: 'ine-emcr-methodology-faq',
      title: 'EMCR: preguntas frecuentes y alcance de las variables',
      publisher: 'Instituto Nacional de Estadística (INE)',
      url: 'https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736177098&idp=1254735573002&menu=faq',
      retrievedAt: '2026-11-26',
      role: 'primary',
    },
  ],
});
