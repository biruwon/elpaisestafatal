const normalise = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').trim();

export const predictionSpecFor = (text = '', compiler = {}) => {
  const normalized = normalise(text);
  const numbers = Array.isArray(compiler?.numbers) ? compiler.numbers : (String(text).match(/\b\d[\d.,%]*\b/g) || []);
  const deadline = normalized.match(/\b(20\d{2})\b/)?.[1] || (/(?:ano que viene|proximo ano|proxima legislatura)/.test(normalized) ? 'relative deadline' : null);
  const indicator = ['empleo', 'paro', 'desempleo', 'vivienda', 'alquiler', 'precios', 'inflacion', 'deuda', 'delincuencia', 'poblacion', 'pensiones', 'salarios'].find((term) => normalized.includes(term)) || null;
  const hasThreshold = numbers.length > 0 || /\b(?:duplic|mitad|dobl|por ciento|%|puntos|millones)\b/.test(normalized);
  const conditions = /\b(?:si|salvo|mientras|depende|condicion|escenario|tipo de interes|interes|guerra|recesion)\b/.test(normalized);
  return { indicator, deadline, threshold: hasThreshold ? numbers[0] || 'qualitative magnitude' : null, hasConditions: conditions, measurable: Boolean(indicator && deadline && hasThreshold), numbers };
};

export const predictionStepsFor = (spec) => [
  { label: 'Indicador', status: spec.indicator ? 'specified' : 'missing' },
  { label: 'Magnitud', status: spec.threshold ? 'specified' : 'missing' },
  { label: 'Fecha límite', status: spec.deadline ? 'specified' : 'missing' },
  { label: 'Condiciones', status: spec.hasConditions ? 'specified' : 'missing' },
  { label: 'Resultado comprobable', status: spec.measurable ? 'ready' : 'missing' },
];
