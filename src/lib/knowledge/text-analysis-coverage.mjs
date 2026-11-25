import { RUNTIME_VERSIONS } from './runtime-versions.mjs';

export const LOCAL_COMPILER_TEXT_LIMIT = 4000;

export const textAnalysisLimitFor = (text) => String(text || '').trim().length > LOCAL_COMPILER_TEXT_LIMIT
  ? LOCAL_COMPILER_TEXT_LIMIT
  : undefined;

export const textAnalysisLimitPlan = (limit) => {
  const analyzedLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : LOCAL_COMPILER_TEXT_LIMIT;
  const reason = `La entrada supera el límite de ${analyzedLimit} caracteres y no se ha contrastado ninguna afirmación del texto.`;
  const reply = `${reason} Esto no confirma ni descarta las afirmaciones del texto completo. Pega una afirmación concreta de hasta ${analyzedLimit} caracteres para contrastarla con fuentes.`;
  return {
    schemaVersion: RUNTIME_VERSIONS.answerPlanSchema,
    headline: 'La entrada supera el límite de análisis',
    summary: reason,
    shareableReply: reply,
    coverage: 'insufficient',
    claimType: 'mixed',
    evidenceLevel: 'insufficient',
    blocks: [
      { type: 'conversation_reply', evidenceIds: [], text: reply },
      { type: 'cannot_conclude', evidenceIds: [], points: [
        'No se ha evaluado la entrada completa con una interpretación verificable.',
        'La falta de análisis no demuestra que ninguna afirmación del texto sea falsa.',
      ] },
    ],
    clarificationQuestion: `¿Puedes pegar solo la afirmación concreta que quieres comprobar, en ${analyzedLimit} caracteres o menos?`,
    limitation: reason,
    evidenceIds: [],
    sourceIds: [],
    knowledgeVersion: RUNTIME_VERSIONS.fallbackKnowledge,
  };
};
