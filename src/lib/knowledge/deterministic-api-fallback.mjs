import { RUNTIME_VERSIONS } from './runtime-versions.mjs';
import { GOVERNMENT_SCORECARD_SNAPSHOT, snapshotScorecard } from './scorecard-snapshot.mjs';
import { answerPlanForBroadDomain } from './broad-domain-snapshot.mjs';
import { snapshotLifecycle } from './snapshot-lifecycle.mjs';

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
    || /\b(?:espana|pais|este pais|el pais)\b[\s\w]{0,48}\b(?:va peor|peor|fatal|desastre|ruina|mejorando?|progresa?|avanza?)\b/.test(value)
    || /\b(?:destruy(?:e|endo)|carga)\s+espana\b/.test(value)
    || /\b(?:sanchez|presidente|gobierno|moncloa|psoe|pp|vox|sumar)\b[\s\w]{0,24}\b(?:destruy|hunde?|arruin|carga|mejor|arregl|levanta|transform)\w*[\s\w]{0,12}\b(?:espana|pais|este pais|el pais)\b/.test(value)
    || /\b(?:este pais|el pais|espana)\s+es\s+(?:un\s+)?desastre\b/.test(value);
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
    limitation: 'No hay evidencia pública suficiente para responderla todavía. El sistema puede investigar una versión más concreta si aportas un periodo, lugar o indicador.',
    questions: [topicQuestion(text)],
  };
};

export const deterministicApiFallback = ({ text = '', inputType = 'text' } = {}) => {
  const original = String(text || '').trim().slice(0, 1200);
  const guidance = fallbackGuidance(original, inputType);
  if (!original) return { status: 'uncovered', relatedClaims: [], guidance };
  const related = topicReference(original);
  const institutionalLabel = /\b(?:dictador|dictadura|autoritari[oa]|fascista)\b/i.test(original);
  if (institutionalLabel) {
    const evidenceIds = ['fallback-constitution', 'fallback-congress'];
    const sources = [
      { id: 'fallback-constitution', title: 'Constitución Española · Estado social y democrático de Derecho', publisher: 'BOE', url: 'https://www.boe.es/legislacion/documentos/ConstitucionCASTELLANO.pdf', retrievedAt: new Date().toISOString() },
      { id: 'fallback-congress', title: 'Congreso de los Diputados · Funciones y control parlamentario', publisher: 'Congreso de los Diputados', url: 'https://www.congreso.es/funciones', retrievedAt: new Date().toISOString() },
    ];
    return {
      status: 'complete', evidenceLevel: 'supported', relatedClaims: [], guidance: { limitation: 'La etiqueta se contrasta con rasgos institucionales observables, no con una valoración partidista.' },
      result: {
        schemaVersion: '1', evidenceLevel: 'supported', headline: 'La etiqueta no encaja con las instituciones descritas',
        summary: 'La frase se entiende como una afirmación sobre el ejercicio de poder dictatorial. España mantiene un sistema parlamentario con elecciones, oposición, leyes y control judicial; esa etiqueta no describe esas instituciones.', coverage: 'qualified', claimType: 'definition',
        blocks: [
          { type: 'confirmed', propositionIds: [], evidenceIds, points: ['La Constitución define un Estado democrático y parlamentario.', 'El Gobierno está sometido al control del Congreso y a las leyes y tribunales.'] },
          { type: 'cannot_conclude', evidenceIds, points: ['Esto no impide examinar decisiones concretas por abuso de poder, ilegalidad o mala gestión.'] },
          { type: 'conversation_reply', evidenceIds, text: 'Pedro Sánchez no encaja en la definición de dictador: dirige un Gobierno parlamentario, sometido a elecciones, oposición, leyes, tribunales y control del Congreso. Eso no impide analizar por separado decisiones concretas por posible abuso de poder.' },
        ], limitation: 'La conclusión se refiere a la etiqueta institucional general, no a la legalidad o calidad de cada decisión.', evidenceIds, sourceIds: evidenceIds, sourceLinks: sources, knowledgeVersion: RUNTIME_VERSIONS.fallbackKnowledge,
      },
    };
  }
  if (broadScorecard(original) && snapshotLifecycle(GOVERNMENT_SCORECARD_SNAPSHOT).usable && (typeof process === 'undefined' || process.env?.BROAD_SCORECARD !== '0')) {
    return {
      status: 'complete',
      evidenceLevel: 'supported',
      relatedClaims: related ? [related] : [],
      guidance: { limitation: 'La valoración política es demasiado amplia para una nota única. Mostramos los seis indicadores que deben compararse.', questions: ['¿Quieres abrir un indicador concreto del cuadro?'] },
      result: {
        schemaVersion: '1',
        evidenceLevel: 'supported',
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
        snapshotPolicy: { owner: GOVERNMENT_SCORECARD_SNAPSHOT.owner, createdAt: GOVERNMENT_SCORECARD_SNAPSHOT.createdAt, expiresAt: GOVERNMENT_SCORECARD_SNAPSHOT.expiresAt, refreshCommand: GOVERNMENT_SCORECARD_SNAPSHOT.refreshCommand, validationStatus: GOVERNMENT_SCORECARD_SNAPSHOT.validationStatus, supportedScope: GOVERNMENT_SCORECARD_SNAPSHOT.supportedScope, unsupportedScope: GOVERNMENT_SCORECARD_SNAPSHOT.unsupportedScope },
        evidenceSummary: {
          mode: 'snapshot',
          families: GOVERNMENT_SCORECARD_SNAPSHOT.metrics.map((metric) => ({ label: metric.label, direction: 'qualifies', evidenceIds: metric.sourceIds })),
          fallbackReason: 'Este cuadro es un snapshot revisado para ofrecer contexto cuando no se está respondiendo con una única serie dinámica.',
        },
        knowledgeVersion: RUNTIME_VERSIONS.fallbackKnowledge,
      },
    };
  }
  const broadDomainPlan = answerPlanForBroadDomain(original);
  if (broadDomainPlan) {
    return {
      status: 'complete',
      evidenceLevel: broadDomainPlan.evidenceLevel,
      relatedClaims: related ? [related] : [],
      guidance: { limitation: broadDomainPlan.limitation, questions: [broadDomainPlan.id === 'broad-housing' ? '¿Hablas de precios, alquileres, vivienda pública o disponibilidad?' : '¿Quieres concretar el periodo, territorio o indicador?'] },
      result: broadDomainPlan,
    };
  }
  return {
    status: 'uncovered',
    relatedClaims: related ? [related] : [],
    guidance,
    result: {
      schemaVersion: '1',
      evidenceLevel: 'insufficient',
      headline: 'No hay evidencia suficiente todavía',
      summary: 'No hemos encontrado datos o fuentes compatibles que permitan sostener una respuesta factual para esta frase.',
      coverage: 'insufficient',
      claimType: 'mixed',
      blocks: [
        { type: 'claim_breakdown', propositionIds: [], items: [{ text: original, type: 'mixed', explicit: true }] },
        { type: 'evidence_gap', missing: ['Un indicador y un periodo compatibles'], needed: ['Una fuente pública que mida directamente la afirmación'], nextAction: 'La siguiente búsqueda debe fijar el indicador, el periodo, el territorio y la población antes de extraer una conclusión.' },
        { type: 'cannot_conclude', evidenceIds: [], points: ['No debemos convertir una coincidencia temática o una frase cercana en un veredicto.', 'Concreta el indicador, el periodo o el lugar para buscar una evidencia comparable.'] },
      ],
      clarificationQuestion: guidance.questions[0],
      limitation: guidance.limitation,
      evidenceIds: [],
      sourceIds: [],
      evidenceSummary: { mode: 'none', families: [], missingDimensions: ['indicador compatible', 'periodo comparable'], fallbackReason: 'No se encontró una fuente dinámica ni un snapshot compatible.' },
      knowledgeVersion: RUNTIME_VERSIONS.fallbackKnowledge,
    },
  };
};
