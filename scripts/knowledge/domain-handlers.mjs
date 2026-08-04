const normalise = (value) => String(value || '')
  .toLocaleLowerCase('es')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/ñ/g, 'n');

const hasAny = (text, terms) => terms.some((term) => text.includes(term));

const profiles = [
  {
    id: 'immigration_benefits',
    when: (text) => hasAny(text, ['inmigr', 'extranj', 'mena', 'marroqui', 'rumano']) && hasAny(text, ['ayuda', 'prestacion', 'subsidio', 'beneficio', 'cobrar', 'dinero']),
    needs: ['programa de ayuda', 'reglas de elegibilidad', 'beneficiarios por grupo', 'mismo denominador', 'periodo'],
    sources: ['Seguridad Social', 'Ministerio de Inclusión', 'comunidad autónoma', 'ayuntamiento'],
    visual: 'group_comparison',
  },
  {
    id: 'immigration_crime',
    when: (text) => hasAny(text, ['inmigr', 'extranj', 'mena', 'marroqui', 'rumano']) && hasAny(text, ['delincuencia', 'delito', 'crimen', 'inseguridad', 'robo', 'agresion']),
    needs: ['delito o indicador concreto', 'tasa por población', 'periodo y territorio', 'estructura de edad y sexo', 'medida de resultado'],
    sources: ['Ministerio del Interior', 'INE', 'CGPJ', 'estudio causal'],
    visual: 'group_comparison',
  },
  {
    id: 'public_housing_allocation',
    when: (text) => hasAny(text, ['inmigr', 'extranj', 'marroqui', 'rumano', 'espanol', 'nacional']) && hasAny(text, ['vivienda', 'piso', 'alquiler', 'social', 'ayuda']) && hasAny(text, ['prioridad', 'antes', 'adjudic', 'dan', 'reciben']),
    needs: ['programa y territorio', 'criterios de adjudicación', 'solicitudes elegibles', 'adjudicaciones por grupo', 'periodo'],
    sources: ['ayuntamiento', 'comunidad autónoma', 'registro de vivienda pública', 'reglamento del programa'],
    visual: 'decision_tree',
  },
];

export const domainProfileFor = (value) => {
  const text = normalise(value);
  return profiles.find((profile) => profile.when(text)) || null;
};

export const domainProfiles = profiles;
