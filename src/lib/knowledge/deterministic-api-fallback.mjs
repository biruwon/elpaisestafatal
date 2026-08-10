import { RUNTIME_VERSIONS } from './runtime-versions.mjs';
import { GOVERNMENT_SCORECARD_SNAPSHOT, snapshotScorecard } from './scorecard-snapshot.mjs';

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
  if (broadScorecard(original) && (typeof process === 'undefined' || process.env?.BROAD_SCORECARD !== '0')) {
    return {
      status: 'complete',
      answerMode: 'scorecard',
      relatedClaims: related ? [related] : [],
      guidance: { limitation: 'La valoración política es demasiado amplia para una nota única. Mostramos los seis indicadores que deben compararse.', questions: ['¿Quieres abrir un indicador concreto del cuadro?'] },
      result: {
        schemaVersion: '1',
        answerMode: 'scorecard',
        headline: 'La mayoría de indicadores mejoran, pero no hay una nota partidista',
        summary: `Desde junio de 2018, ${GOVERNMENT_SCORECARD_SNAPSHOT.metrics.filter((metric) => metric.direction === 'improved').length} de ${GOVERNMENT_SCORECARD_SNAPSHOT.metrics.length} indicadores mejoran y ${GOVERNMENT_SCORECARD_SNAPSHOT.metrics.filter((metric) => metric.direction === 'worsened').length} empeora. Esto describe cambios observados; no demuestra qué políticas los causaron.`,
        coverage: 'qualified',
        claimType: 'comparative',
        blocks: [snapshotScorecard(), { type: 'cannot_conclude', evidenceIds: [], points: ['Estos indicadores no producen una calificación global de la izquierda o la derecha.', 'La coincidencia temporal no demuestra causalidad gubernamental.'] }],
        clarificationQuestion: 'Puedes abrir un indicador concreto para ver qué mide y sus fuentes.',
        limitation: `Base: ${GOVERNMENT_SCORECARD_SNAPSHOT.periods['since-2018'].assumption}`,
        evidenceIds: GOVERNMENT_SCORECARD_SNAPSHOT.metrics.flatMap((metric) => metric.sourceIds),
        sourceIds: GOVERNMENT_SCORECARD_SNAPSHOT.sources.map((source) => source.id),
        asOf: GOVERNMENT_SCORECARD_SNAPSHOT.asOf,
        sourceLinks: GOVERNMENT_SCORECARD_SNAPSHOT.sources,
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
