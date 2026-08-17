import { evaluationCases } from './evaluation-cases.mjs';

const requiredCategories = ['causal', 'definition', 'group_comparison', 'impossible', 'legal', 'local', 'normative', 'prediction', 'quantity', 'ranking', 'trend', 'adjacent'];
const errors = [];
if (evaluationCases.length < 300) errors.push(`Expected at least 300 cases, found ${evaluationCases.length}`);
const ids = new Set();
for (const item of evaluationCases) {
  if (!item.id || ids.has(item.id)) errors.push(`Missing or duplicate case id: ${item.id || '(empty)'}`);
  ids.add(item.id);
  if (typeof item.input !== 'string' || item.input.trim().length < 5) errors.push(`${item.id}: input is too short`);
  if (!item.expected || !['known', 'unknown'].includes(item.expected.status)) errors.push(`${item.id}: invalid expected status`);
  if (!item.category) errors.push(`${item.id}: missing category`);
}
for (const category of requiredCategories) if (!evaluationCases.some((item) => item.category === category)) errors.push(`Missing category: ${category}`);
const regression = evaluationCases.find((item) => item.input === 'España está destruida');
if (!regression || regression.expected.status !== 'unknown') errors.push('Regression case for España está destruida is missing or misclassified');
for (const slug of ['presion-fiscal-mas-alta-historia', 'vivienda-triplica-en-tres-anos', 'alquileres-suben-oferta-inseguridad', 'ocupacion-respaldo-gobierno-delito-leve', 'espana-politica-inmigracion-puertas-abiertas', 'residencia-desde-primer-dia-trabajo']) {
  const variants = evaluationCases.filter((item) => item.expected.slug === slug);
  if (variants.length < 12) errors.push(`${slug}: expected at least 12 paraphrase/wrapper variants, found ${variants.length}`);
}
if (evaluationCases.filter((item) => item.category === 'adjacent').length < 7) errors.push('Adjacent-family rejection controls are incomplete');
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Evaluation corpus valid: ${evaluationCases.length} Spanish inputs across ${new Set(evaluationCases.map((item) => item.category)).size} categories.`);
