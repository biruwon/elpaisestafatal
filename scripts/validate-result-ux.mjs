import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/scripts/claim-checker.ts', import.meta.url), 'utf8');
const page = await readFile(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
const required = ['renderResult', 'Respuesta con fuentes', 'Evidencia limitada', 'data-copy-answer', 'claim-sources', 'result-redesigned', 'result-scorecard', 'scorecard-grid', 'scorecard-values', 'scorecard-methodology', 'result-visual', 'result-chart', 'result-data-table', 'result-evidence', 'result-limit', 'result-details', 'claim-reply', 'claim-reply-text', 'item.keyFact || stateConclusion', 'publicMetricLabel', 'stateConclusion', 'prefers-reduced-motion', 'loadingStagesFor', 'Comprobando la regularización', 'Buscando indicadores de servicios públicos', 'Revisando prestaciones', 'no se marca ninguna fase como completada', 'evidenceGroupsFor', 'renderMissingList', 'data-evidence-groups', 'data-family-id', 'Fuentes de esta familia', 'Qué queda pendiente en esta familia', 'result-methodology', 'familia se evalúa con sus propias medidas', 'sin una medición compatible localizada', 'Datos compatibles y límites', '<ul>', 'statusLabel', 'evidence-family-limitation'];
const missing = required.filter((item) => !source.includes(item) && !page.includes(item));
if (missing.length) throw new Error(`Unified result UX is missing: ${missing.join(', ')}`);
if (!source.includes('formatEvidenceDimensions') || !source.includes('evidenceDimensionLabels')) throw new Error('Evidence dimensions must use readable labels instead of raw internal keys.');
if (source.includes('evidenceDimensionLabels[key] || key')) throw new Error('Unknown internal dimension keys must not be rendered raw.');
if (source.includes("renderMissingList('Datos pendientes', criterion.missingDimensions")) throw new Error('Criterion-level pending lists duplicate the grouped family pending list.');
if (!source.includes('periodRangeFromData(data) || value')) throw new Error('Evidence period metadata must prefer the observed data range.');
if (source.includes('Los datos no apoyan') || page.includes('Los datos no apoyan')) throw new Error('Unified result must not publish a global scorecard verdict');
if (!source.includes('stateConclusion') || !source.includes('publicDirectionLabel')) throw new Error('Result UX must expose a direct conclusion and readable evidence directions.');
if (source.includes('<p class="eyebrow">${stateLabel}</p>')) throw new Error('Result UX must not duplicate the evidence-status label.');
console.log('Result UX validation passed: conclusion hierarchy, public labels, charts, exact-value tables, provenance, limitations, and actions are present.');
