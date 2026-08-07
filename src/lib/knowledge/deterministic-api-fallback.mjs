import { RUNTIME_VERSIONS } from './runtime-versions.mjs';

const topicQuestion = (text) => {
  const value = String(text || '').toLocaleLowerCase('es');
  if (/sanchez|presidente|gobierno|moncloa|psoe|pp|vox|sumar|politic|destru|ruina|fatal|desastr|cuesta abajo/.test(value)) return '¿Hablas de una decisión del Gobierno, economía, vivienda, empleo, inmigración o instituciones?';
  if (/viviend|alquiler|piso|casa/.test(value)) return '¿Hablas de precios, alquileres, vivienda pública o disponibilidad?';
  if (/inmigr|extranj|patera|ayuda|prestaci/.test(value)) return '¿Hablas de población, ayudas, empleo, llegadas o seguridad?';
  if (/empleo|trabaj|paro|salario|sueldo/.test(value)) return '¿Qué medida quieres comprobar: empleo, paro, salario, jornada o estabilidad?';
  if (/impuest|hacienda|recaud|deuda|gasto público/.test(value)) return '¿Qué impuesto, gasto, periodo o comparación quieres comprobar?';
  if (/sanidad|hospital|médic|medic|espera/.test(value)) return '¿Hablas de acceso, listas de espera, gasto, personal o resultados?';
  return '¿Qué hecho concreto, periodo o lugar quieres comprobar?';
};

const topicReference = (text) => {
  const value = String(text || '').toLocaleLowerCase('es');
  if (/sanchez|presidente|gobierno|moncloa|psoe|pp|vox|sumar|politic|destru|ruina|fatal|desastr|cuesta abajo/.test(value)) {
    return { kind: 'topic', slug: 'politica', title: 'Contexto político en España', href: '/preocupaciones/politica', confidence: 0.36 };
  }
  if (/econom[ií]a/.test(value) && /empleo|trabaj|paro|salario|sueldo/.test(value)) {
    return { kind: 'topic', slug: 'empleo', title: 'Empleo y condiciones de trabajo', href: '/preocupaciones/empleo', confidence: 0.36 };
  }
  return undefined;
};

const broadScorecard = (text) => {
  const value = String(text || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return /\b(?:gobernando|gobierno)\b[\s\w]{0,32}\b(?:izquierda|izquierdas|derecha)\b[\s\w]{0,32}\b(?:peor|mal|fatal)\b/.test(value)
    || /\b(?:espana|pais|este pais|el pais)\b[\s\w]{0,48}\b(?:va peor|peor|fatal|desastre|ruina)\b/.test(value);
};

const scorecardFallback = () => ({
  type: 'scorecard',
  baseline: { label: 'Antes del periodo', period: 'último dato anterior al Gobierno más reciente' },
  comparison: { label: 'Último dato compatible', period: 'última observación del almacén revisado' },
  items: [
    ['gdp_per_capita', 'PIB real por habitante'],
    ['median_equivalised_income', 'Renta mediana disponible real'],
    ['unemployment_rate', 'Desempleo'],
    ['arope_rate', 'AROPE'],
    ['housing_cost_overburden_rate', 'Sobrecarga del coste de vivienda'],
    ['unmet_healthcare_waiting_list_rate', 'Necesidades sanitarias no cubiertas por listas de espera'],
  ].map(([metricId, label]) => ({ metricId, label, direction: 'unavailable', evidenceIds: [], caveat: 'La conexión con el almacén de datos no está disponible ahora; no se inventa una cifra.' })),
});

const fallbackGuidance = (text, inputType) => {
  if (!text) {
    const subject = inputType === 'audio' ? 'el audio' : inputType === 'image' ? 'la captura' : 'el contenido';
    return {
      limitation: `No hemos podido leer ${subject} ahora. Puedes escribir o pegar la frase para comprobarla directamente.`,
      questions: ['Escribe la frase, titular o mensaje que quieres comprobar.'],
    };
  }
  return {
    limitation: 'Todavía no hay una comprobación publicada para esta frase. Podemos concretarla antes de buscar datos.',
    questions: [topicQuestion(text)],
  };
};

export const deterministicApiFallback = ({ text = '', inputType = 'text' } = {}) => {
  const original = String(text || '').trim().slice(0, 1200);
  const guidance = fallbackGuidance(original, inputType);
  if (!original) return { status: 'uncovered', relatedClaims: [], guidance };
  const related = topicReference(original);
  if (broadScorecard(original)) {
    return {
      status: 'uncovered',
      answerMode: 'scorecard',
      relatedClaims: related ? [related] : [],
      guidance: { limitation: 'La valoración política es demasiado amplia para una nota única. Mostramos los seis indicadores que deben compararse.', questions: ['¿Quieres abrir un indicador concreto del cuadro?'] },
      result: {
        schemaVersion: '1',
        answerMode: 'scorecard',
        headline: 'No hay una nota única: hay que comparar seis indicadores',
        summary: 'El cuadro de indicadores es la respuesta de respaldo. No calcula una nota partidista ni atribuye causalidad al Gobierno.',
        coverage: 'insufficient',
        claimType: 'comparative',
        blocks: [scorecardFallback(), { type: 'cannot_conclude', evidenceIds: [], points: ['Estos indicadores no producen una calificación global de la izquierda o la derecha.', 'Si el almacén vuelve a estar disponible, se rellenarán las observaciones y sus fuentes.', 'Un cambio simultáneo no demuestra qué política lo causó.'] }],
        clarificationQuestion: '¿Quieres abrir un indicador concreto del cuadro?',
        limitation: 'Este es un cuadro de respaldo sin cifras nuevas: las métricas aparecen como no disponibles hasta recuperar el almacén revisado.',
        evidenceIds: [],
        sourceIds: [],
        sourceLinks: [
          { id: 'catalogue-economy', title: 'Catálogo de datos económicos', url: '/datos/economia' },
          { id: 'catalogue-employment', title: 'Catálogo de empleo', url: '/datos/empleo' },
          { id: 'catalogue-housing', title: 'Catálogo de vivienda', url: '/datos/vivienda' },
          { id: 'catalogue-health', title: 'Catálogo de sanidad', url: '/datos/sanidad' },
        ],
        knowledgeVersion: RUNTIME_VERSIONS.fallbackKnowledge,
      },
    };
  }
  return {
    status: 'uncovered',
    relatedClaims: related ? [related] : [],
    guidance,
    result: {
      schemaVersion: '1',
      headline: 'No hay una coincidencia directa todavía',
      summary: 'La frase se ha recibido, pero no coincide con una comprobación publicada suficientemente directa.',
      coverage: 'insufficient',
      claimType: 'mixed',
      blocks: [
        { type: 'claim_breakdown', propositionIds: [], items: [{ text: original, type: 'mixed', explicit: true }] },
        { type: 'cannot_conclude', evidenceIds: [], points: ['No debemos convertir una coincidencia temática o una frase cercana en un veredicto.', 'Concreta el indicador, el periodo o el lugar para buscar una evidencia comparable.'] },
      ],
      clarificationQuestion: guidance.questions[0],
      limitation: guidance.limitation,
      evidenceIds: [],
      sourceIds: [],
      knowledgeVersion: RUNTIME_VERSIONS.fallbackKnowledge,
    },
  };
};
