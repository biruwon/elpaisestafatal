import { deterministicFallbackCompiler } from './fallback-compiler.mjs';

const normalise = (value) => String(value || '')
  .toLocaleLowerCase('es')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/ñ/g, 'n').replace(/[-–—]/g, ' ');

const hasAny = (text, terms) => terms.some((term) => text.includes(term));
const hasConcept = (concepts, ...ids) => ids.some((id) => concepts.has(id));

// Profiles describe evidence needs for reusable claim families. They do not
// contain answer text: the selected reviewed packet supplies evidence and the
// shared response composer turns it into a reply.
const profiles = [
  {
    id: 'tax_policy_tradeoffs', packetId: 'broad-tax-burden-purchasing-power',
    when: (text) => hasAny(text, ['impuestos', 'irpf', 'iva'])
      && hasAny(text, ['deflact', 'progresividad en frio', 'bajar el iva', 'rebajar el iva', 'bajar los impuestos']) && !/\d/.test(text),
    needs: ['tipo y base fiscal', 'hogar y periodo', 'recaudación y financiación del cambio'],
    sources: ['OCDE', 'AEAT', 'Ministerio de Hacienda'],
  },
  {
    id: 'youth_housing_access', packetId: 'broad-youth-living-housing',
    when: (text) => (hasAny(text, ['joven', 'juventud']) || /menores? de (?:30|treinta)/.test(text)) && hasAny(text, ['vivienda', 'casa', 'piso', 'alquiler', 'alquilar', 'emancip'])
      && hasAny(text, ['salario', 'sueldo', 'ingreso', 'padres', 'familia', 'herencia', 'emancip']),
    needs: ['alquiler e ingresos de la misma población joven', 'emancipación observada', 'apoyo familiar y periodo'],
    sources: ['Consejo de la Juventud de España', 'INE', 'Eurostat'],
  },
  {
    id: 'tax_prices_financing_tradeoffs', packetId: 'broad-tax-burden-purchasing-power',
    when: (text) => hasAny(text, ['impuestos', 'irpf', 'iva']) && hasAny(text, ['salario', 'sueldo', 'poder de compra', 'poder adquisitivo'])
      && hasAny(text, ['pensiones', 'baby boom', 'gasto publico', 'sistema solo aguanta']),
    needs: ['impuestos y cotizaciones de un hogar definido', 'salarios y precios comparables', 'financiación y gasto público'],
    sources: ['OCDE', 'INE', 'Ministerio de Hacienda'],
  },
  {
    id: 'youth_housing_family_counterfactual', packetId: 'broad-youth-living-housing',
    when: (text) => hasAny(text, ['joven', 'juventud']) && hasAny(text, ['vivienda', 'alquiler', 'emancip', 'coste de vida'])
      && hasAny(text, ['emigr', 'marcharse', 'irse del pais']) && hasAny(text, ['padres', 'familia', 'herencia']),
    needs: ['ingresos y costes de vivienda de la misma población joven', 'emancipación observada', 'encuesta o modelo contrafactual de emigración sin apoyo familiar'],
    sources: ['Consejo de la Juventud de España', 'INE', 'Eurostat'],
  },
  {
    id: 'illegal_occupation',
    packetId: 'broad-illegal-occupation',
    when: (text, concepts) => hasConcept(concepts, 'squatting_law')
      || (hasAny(text, ['vivienda', 'casa', 'piso', 'inmueble', 'morada'])
        && hasAny(text, ['okupa', 'ocupacion', 'ocupa ', 'se mete en', 'sin permiso'])
        && hasAny(text, ['policia', 'desaloj', 'echar', 'sacar', 'permanec', 'quedarse', 'anos', 'meses', 'puede'])),
    needs: ['tipo de inmueble y conducta', 'vía policial, penal o civil', 'periodo y territorio', 'duración del procedimiento comparable'],
    sources: ['Código Penal', 'Fiscalía General del Estado', 'Consejo General del Poder Judicial'],
    visual: 'procedure_duration',
  },
  {
    id: 'sexual_consent_law_effects',
    packetId: 'broad-sexual-consent-law-effects',
    when: (text, concepts) => hasConcept(concepts, 'sexual_consent_law')
      && (hasAny(text, ['solo si es si', 'ley de libertad sexual', '10/2022'])
        || (hasAny(text, ['reforma', 'cambio legal', 'nueva ley'])
          && hasAny(text, ['delitos sexuales', 'libertad sexual', 'proteccion de victimas'])
          && hasAny(text, ['rebaj', 'reduc', 'pena', 'conden', 'efecto', 'resultado']))),
    needs: ['resoluciones y fecha de corte', 'órganos incluidos y excluidos', 'reforma posterior', 'resultados comparables para víctimas'],
    sources: ['Consejo General del Poder Judicial', 'Boletín Oficial del Estado'],
    visual: 'legal_timeline',
  },
  {
    id: 'gender_law_evidence_standard',
    packetId: 'broad-gender-law-evidence-standard',
    when: (text, concepts) => hasConcept(concepts, 'gender_law')
      && hasAny(text, ['hombre', 'hombres', 'mascul', 'acusad', 'presuncion de inocencia', 'menos pruebas', 'estandar probatorio', 'discrimin']),
    needs: ['precepto penal comparado', 'regla de prueba aplicable', 'garantía de presunción de inocencia', 'jurisprudencia constitucional'],
    sources: ['Tribunal Constitucional', 'Constitución Española', 'Boletín Oficial del Estado'],
    visual: 'legal_comparison',
  },
  {
    id: 'nuclear_phaseout',
    packetId: 'broad-nuclear-phaseout-risk',
    when: (text, concepts) => hasConcept(concepts, 'nuclear_phaseout')
      && hasAny(text, ['cierre', 'cerrar', 'calendario', 'retirada', 'desmantel', 'apag', 'fin de vida', 'sustitu', 'prorroga'])
      && hasAny(text, ['precio', 'coste', 'luz', 'fiabilidad', 'seguridad energetica', 'suministro', 'electricidad', 'capacidad']),
    needs: ['mix eléctrico y periodo', 'calendario regulatorio vigente', 'costes o precios y unidad', 'capacidad firme y sustitución', 'escenario o diseño causal'],
    sources: ['Red Eléctrica', 'MITECO', 'estudios del mercado eléctrico'],
    visual: 'generation_mix',
  },
  {
    id: 'autonomous_competence_savings',
    packetId: 'broad-autonomous-communities-duplication',
    when: (text, concepts) => hasConcept(concepts, 'autonomous_competences')
      && hasAny(text, ['ahorro', 'coste', 'gasto', 'duplic', 'prescind', 'elimin', 'suprim', 'abol', 'transfer', 'traspas', 'centraliz', 'competenc']),
    needs: ['funciones transferidas', 'gasto administrativo frente a servicios', 'coste de transición', 'contrafactual de ahorro neto'],
    sources: ['Ministerio de Hacienda', 'Boletín Oficial del Estado', 'evaluación de reforma administrativa'],
    visual: 'regional_spending',
  },
  {
    id: 'migrant_minor_accommodation_cost',
    packetId: 'broad-migrant-minor-cost',
    when: (text, concepts) => hasConcept(concepts, 'minor_accommodation_cost')
      && hasAny(text, ['coste', 'costa', 'cuesta', 'gasto', 'euros', 'mensual', 'mes', 'pension', 'pagamos', 'financiacion']),
    needs: ['gasto ejecutado', 'menores atendidos en el mismo periodo', 'coste por persona o plaza', 'periodo y territorio', 'pensión comparable'],
    sources: ['Ministerio de Juventud e Infancia', 'comunidades autónomas', 'Seguridad Social'],
    visual: 'comparable_costs',
  },
  {
    id: 'amnesty_constitution',
    packetId: 'broad-amnesty-constitution',
    when: (text, concepts) => hasConcept(concepts, 'amnesty_equality')
      && hasAny(text, ['inconstitucional', 'constitucional', 'igualdad', 'igualitari', 'trato', 'independent', 'catalun', 'proces', 'separat']),
    needs: ['fallo y preceptos afectados', 'efectos jurídicos del fallo', 'argumento de igualdad', 'votos particulares si se discute valoración política'],
    sources: ['Tribunal Constitucional', 'Boletín Oficial del Estado'],
    visual: 'ruling_summary',
  },
  {
    id: 'public_housing_allocation',
    packetId: 'broad-housing-priority-migration',
    when: (text, concepts) => (hasConcept(concepts, 'immigration') || hasAny(text, ['nacionalidad', 'extranj', 'reci en llegad', 'sin papeles']))
      && hasAny(text, ['vivienda', 'piso', 'alquiler', 'vpo', 'protegida', 'social'])
      && hasAny(text, ['prior', 'lista', 'turno', 'adjudic', 'preferen', 'acceso', 'antes que', 'desplaz']),
    needs: ['programa y territorio', 'criterios de adjudicación', 'solicitudes elegibles', 'adjudicaciones por grupo', 'periodo'],
    sources: ['ayuntamiento', 'comunidad autónoma', 'registro de vivienda pública', 'reglamento del programa'],
    visual: 'decision_tree',
  },
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
];

export const domainProfileFor = (value) => {
  const text = normalise(value);
  const concepts = new Set(deterministicFallbackCompiler(value).concepts || []);
  return profiles.find((profile) => profile.when(text, concepts)) || null;
};

export const domainProfiles = profiles;
