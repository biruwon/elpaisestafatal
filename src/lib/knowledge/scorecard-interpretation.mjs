import { RUNTIME_VERSIONS } from './runtime-versions.mjs';
import { GOVERNMENT_SCORECARD_SNAPSHOT } from './scorecard-snapshot.mjs';
import { snapshotLifecycle } from './snapshot-lifecycle.mjs';

const normalize = (text) => String(text || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Identify broad country or government performance judgements that need a
// multi-indicator comparison instead of a binary claim verdict.
export const isBroadGovernmentScorecardClaim = (text) => {
  const value = normalize(text);
  return /\b(?:gobernando|gobierno)\b[\s\w]{0,32}\b(?:izquierda|izquierdas|derecha)\b[\s\w]{0,32}\b(?:peor|mal|fatal)\b/.test(value)
    || /\b(?:espana|pais|este pais|el pais)\b[\s\w]{0,48}\b(?:va peor|peor|fatal|desastr\w*|ruin\w*|hund\w*|destruy\w*|arruin\w*|mejor\w*|progresa?|avanza?)\b/.test(value)
    || /\b(?:destruy(?:e|endo)|carga)\s+espana\b/.test(value)
    || /\b(?:sanchez|presidente|gobierno|moncloa|psoe|pp|vox|sumar)\b[\s\w]{0,24}\b(?:destruy|hund|arruin|carg|mejor|arregl|levant|transform)\w*[\s\w]{0,12}\b(?:espana|pais|este pais|el pais)\b/.test(value)
    || /\b(?:este pais|el pais|espana)\s+es\s+(?:un\s+)?desastre\b/.test(value)
    || /\b(?:sanchez|presidente|gobierno|moncloa|psoe|pp|vox|sumar)\b[\s\w]{0,32}\b(?:peor|mejor|mejores|peores)\b/.test(value);
};

export const governmentScorecardGapPlan = (now = Date.now(), { disabled = false } = {}) => {
  const lifecycle = snapshotLifecycle(GOVERNMENT_SCORECARD_SNAPSHOT, now);
  const freshness = lifecycle.status === 'expired'
    ? `El último cuadro nacional revisado caducó el ${GOVERNMENT_SCORECARD_SNAPSHOT.expiresAt}; no mostramos sus cifras.`
    : lifecycle.status === 'unreviewed'
      ? 'El cuadro nacional disponible aún no está revisado para uso factual; no mostramos sus cifras.'
      : disabled && lifecycle.usable
        ? 'El cuadro nacional revisado no está habilitado para esta comprobación; no mostramos sus cifras.'
        : 'No hay un cuadro nacional de indicadores disponible para esta comprobación; no inventamos una valoración.';
  const missing = ['indicadores actuales con periodos comparables'];
  return {
    id: 'broad-government-scorecard-gap',
    schemaVersion: '1',
    evidenceLevel: 'insufficient',
    headline: 'La valoración necesita indicadores actuales',
    summary: `La frase reúne varios resultados y no indica un periodo. ${freshness} Los cambios observados por sí solos tampoco demuestran qué política los causó.`,
    coverage: 'insufficient',
    claimType: 'comparative',
    blocks: [{
      type: 'evidence_gap',
      missing,
      needed: ['un resultado concreto y un periodo definido', 'una comparación causal si se quiere atribuir el cambio a un Gobierno'],
      nextAction: 'Elige un tema —por ejemplo, empleo, renta, vivienda o salud— y un periodo para contrastar la serie adecuada; la coincidencia temporal no basta para atribuir el resultado.',
    }],
    clarificationQuestion: '¿Qué resultado concreto quieres comparar y entre qué años?',
    limitation: freshness,
    evidenceIds: [],
    sourceIds: [],
    evidenceSummary: { mode: 'none', families: [], missingDimensions: missing, fallbackReason: freshness },
    knowledgeVersion: RUNTIME_VERSIONS.fallbackKnowledge,
  };
};
