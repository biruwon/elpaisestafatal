const topicQuestion = (text) => {
  const value = String(text || '').toLocaleLowerCase('es');
  if (/viviend|alquiler|piso|casa/.test(value)) return '¿Hablas de precios, alquileres, vivienda pública o disponibilidad?';
  if (/inmigr|extranj|patera|ayuda|prestaci/.test(value)) return '¿Hablas de población, ayudas, empleo, llegadas o seguridad?';
  if (/empleo|trabaj|paro|salario|sueldo/.test(value)) return '¿Qué medida quieres comprobar: empleo, paro, salario, jornada o estabilidad?';
  if (/impuest|hacienda|recaud|deuda|gasto público/.test(value)) return '¿Qué impuesto, gasto, periodo o comparación quieres comprobar?';
  if (/sanidad|hospital|médic|medic|espera/.test(value)) return '¿Hablas de acceso, listas de espera, gasto, personal o resultados?';
  return '¿Qué hecho concreto, periodo o lugar quieres comprobar?';
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
  return {
    status: 'uncovered',
    relatedClaims: [],
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
      knowledgeVersion: 'deterministic-fallback-1',
    },
  };
};
