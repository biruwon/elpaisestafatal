import { isStrongClaimMatch, normaliseClaimText, rankClaimIndex, type ClaimIndexEntry, type RankedClaimIndexEntry } from '../data/claimIndex';
import { classifyDeterministicCoverage } from '../lib/knowledge/coverage';
import type { AnswerPlan } from '../lib/knowledge/contracts';
import { INPUT_LIMITS, validateInputMetadata } from '../lib/knowledge/input-contract.mjs';
import { semanticQuerySignature } from '../lib/knowledge/querySignature';

type SearchResponse = {
  status?: 'published' | 'related' | 'draft' | 'uncovered' | 'unavailable' | 'complete' | 'partial' | 'processing';
  requestId?: string;
  canonicalSignature?: string;
  input?: { original?: string; canonical?: string };
  primary?: { kind: 'claim' | 'topic'; slug: string; title: string; href: string; confidence: number; reason: string };
  alternatives?: Array<{ kind: 'claim' | 'topic'; slug: string; title: string; href: string; confidence: number }>;
  guidance?: { questions?: string[]; limitation?: string; suggestions?: Array<{ title: string; href: string }>; suggestionsLabel?: string };
  result?: AnswerPlan;
  relatedClaims?: Array<{ kind: 'claim' | 'topic'; slug: string; title: string; href: string; confidence: number }>;
};

type ConversationVisual = {
  slug: string;
  visuals?: {
    key?: { value: string; label: string; period: string };
    trend?: { available: boolean; labels: string[]; values: number[]; label: string; unit: string };
    comparison?: { labels: string[]; values: number[]; label: string; unit: string };
  };
};

let chartSequence = 0;

const readJson = <T>(id: string, fallback: T): T => {
  try {
    const element = document.querySelector(`#${id}`);
    return element ? JSON.parse(element.textContent || '') as T : fallback;
  } catch { return fallback; }
};

const escapeHtml = (value: string): string => value
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

const claimIndex = readJson<ClaimIndexEntry[]>('claim-index-data', []);
const conversationVisuals = readJson<ConversationVisual[]>('conversation-mvp-data', []);
const form = document.querySelector<HTMLFormElement>('#conversation-form');
const input = document.querySelector<HTMLTextAreaElement>('#conversation-input');
const fileInput = document.querySelector<HTMLInputElement>('#conversation-file');
const mediaDropZone = document.querySelector<HTMLElement>('[data-media-dropzone]');
const fileName = document.querySelector<HTMLElement>('[data-file-name]');
const mediaHelp = document.querySelector<HTMLElement>('#conversation-media-help');
const counter = document.querySelector<HTMLElement>('#conversation-counter');
const result = document.querySelector<HTMLElement>('#conversation-result');
const catalogElement = document.querySelector<HTMLElement>('#claim-index-data');
const advancedEnabled = catalogElement?.dataset.advanced === 'true';
let activeRequest: AbortController | null = null;
let requestVersion = 0;
const responseCache = new Map<string, SearchResponse>();

const updateCounter = (): void => {
  if (counter) counter.textContent = `${input?.value.length || 0}/${INPUT_LIMITS.maxTextCharacters}`;
};

const assignMediaFile = (file: File): void => {
  if (!fileInput) return;
  try {
    const transfer = new DataTransfer();
    transfer.items.add(file);
    fileInput.files = transfer.files;
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
  } catch {
    // Browsers without a writable FileList still retain the normal picker path.
  }
};

const coverageLabels: Record<string, string> = {
  strong: 'Evidencia directa',
  qualified: 'Contexto relacionado',
  partial: 'Cobertura parcial',
  insufficient: 'Evidencia insuficiente',
};

const assessmentLabels: Record<string, string> = {
  true: 'Verdadero',
  'mostly-true': 'Mayormente cierto',
  misleading: 'Generalización engañosa',
  unsupported: 'Sin respaldo suficiente',
  uncertain: 'Incierto',
  false: 'Falso',
};

const coverageLabel = (value?: string): string => coverageLabels[value || ''] || 'Aclaración provisional';

const propositionTypeLabels: Record<string, string> = {
  descriptive: 'Hecho',
  comparative: 'Comparación',
  definition: 'Definición',
  trend: 'Evolución',
  causal: 'Causa',
  predictive: 'Predicción',
  legal: 'Regla',
  normative: 'Prioridad',
  mixed: 'Afirmación',
};

const recordUncoveredQuestion = (text: string, response: SearchResponse): void => {
  if (response.status !== 'uncovered' && response.status !== 'partial' && response.status !== 'draft') return;
  void fetch('/api/questions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, canonical: response.input?.canonical || response.canonicalSignature, semanticSignature: semanticQuerySignature(response.input?.canonical || response.canonicalSignature || text), inputType: 'text', status: response.status, requestId: response.requestId }),
    keepalive: true,
  }).catch(() => { /* Operational learning is optional and never blocks the answer. */ });
};

const findEntry = (slug: string | undefined): ClaimIndexEntry | undefined => slug ? claimIndex.find((entry) => entry.slug === slug) : undefined;

const resultLink = (entry: ClaimIndexEntry): string => `<a class="claim-result-link" href="${escapeHtml(entry.href)}">${entry.kind === 'topic' ? 'Ver contexto del tema' : 'Ver datos y fuentes'} <span aria-hidden="true">→</span></a>`;

const shareUrlFor = (original: string, primary?: ClaimIndexEntry, state: 'published' | 'related' | 'draft' | 'uncovered' = 'published'): string => {
  if (state === 'published' && primary?.kind === 'claim') return new URL(primary.href, window.location.origin).toString();
  const url = new URL('/', window.location.origin);
  url.searchParams.set('q', original);
  url.hash = 'comprobar';
  return url.toString();
};

const alternativeMarkup = (entries: ClaimIndexEntry[]): string => entries.length
  ? `<div class="claim-alternatives"><span class="clarification-label">También puede estar relacionado</span>${entries.slice(0, 2).map((entry) => `<a href="${escapeHtml(entry.href)}">${escapeHtml(entry.title)}</a>`).join('')}</div>`
  : '';

const broadTopicSuggestions = (original: string): { items: Array<{ title: string; href: string }>; label: string } => {
  const query = normaliseClaimText(original);
  if (query.length < 12) return { items: [], label: '' };
  const topics = claimIndex.filter((entry) => entry.kind === 'topic');
  const matchedTopics = topics
    .filter((entry) => [...entry.aliases, ...entry.keywords].some((alias) => {
      const normalizedAlias = normaliseClaimText(alias);
      return normalizedAlias.length > 3 && (query.includes(normalizedAlias) || normalizedAlias.includes(query));
    }))
    .slice(0, 4)
    .map((entry) => ({ title: entry.title, href: entry.href }));
  if (matchedTopics.length) return { items: matchedTopics, label: 'Puedes concretarla por un tema' };

  // Keep an uncovered result honest. Popular checks are already discoverable
  // in the homepage examples; attaching one here to a misspelled or unrelated
  // input makes the result look like a recommendation and was the source of
  // misleading “closest” answers for genuinely unknown text.
  return { items: [], label: '' };
};

const fallbackPublishedClaims = (): ClaimIndexEntry[] => claimIndex
  .filter((entry) => entry.kind === 'claim')
  .slice(0, 2);

const visualMarkup = (entry?: ClaimIndexEntry): string => {
  if (!entry) return '';
  const visual = conversationVisuals.find((item) => item.slug === entry.slug)?.visuals;
  if (!visual?.key) return '';
  const comparison = visual.comparison;
  const signedComparison = Boolean(comparison?.values.some((value) => value < 0));
  const max = comparison ? Math.max(...comparison.values.map((value) => Math.abs(value)), 1) : 1;
  const comparisonRows = comparison?.labels.slice(0, 3).map((label, index) => {
    const value = Number(comparison.values[index] || 0);
    const width = signedComparison ? Math.max(5, Math.round((Math.abs(value) / max) * 50)) : Math.max(6, Math.round((value / max) * 100));
    const left = signedComparison ? (value < 0 ? 50 - width : 50) : 0;
    return `<div><span>${escapeHtml(label)}</span><i${signedComparison ? ' class="is-signed"' : ''}><b style="width:${width}%;${signedComparison ? `left:${left}%;` : ''}"></b></i><em>${escapeHtml(String(comparison.values[index]))}</em></div>`;
  }).join('');
  return `<div class="claim-visual-summary"><div class="claim-key-number"><span class="clarification-label">Dato clave · ${escapeHtml(visual.key.period)}</span><strong>${escapeHtml(visual.key.value)}</strong><small>${escapeHtml(visual.key.label)}</small></div>${comparison ? `<div class="claim-comparison${signedComparison ? ' is-signed' : ''}"><span class="clarification-label">${escapeHtml(comparison.label)}</span>${comparisonRows}<small>${escapeHtml(comparison.unit)}</small></div>` : ''}</div>`;
};

const formatChartValue = (value: number): string => Number(value).toLocaleString('es-ES', { maximumFractionDigits: 2 });

const chartDataMarkup = (entries: Array<{ label: string; value: number }>, unit: string): string => `<details class="claim-chart-data"><summary>Ver valores</summary><table><thead><tr><th>Periodo o grupo</th><th>Valor</th></tr></thead><tbody>${entries.map((entry) => `<tr><th scope="row">${escapeHtml(entry.label)}</th><td>${escapeHtml(formatChartValue(entry.value))} ${escapeHtml(unit)}</td></tr>`).join('')}</tbody></table></details>`;

const planVisualMarkup = (plan: AnswerPlan, block: Extract<AnswerPlan['blocks'][number], { type: 'line_chart' | 'bar_chart' | 'comparison_chart' }>): string => {
  const visual = conversationVisuals.find((item) => item.slug === block.visualId)?.visuals;
  const series = block.visualId === 'warehouse-observation'
    ? plan.warehouseSeries
    : block.type === 'line_chart' ? visual?.trend : visual?.comparison;
  if (!series || !series.values.length) return '';
  const entries = series.labels.slice(0, 8).map((label: string, index: number) => ({ label: String(label), value: Number(series.values[index]) })).filter((entry) => Number.isFinite(entry.value));
  if (!entries.length) return '';
  const width = 640;
  const height = 230;
  const left = 54;
  const right = 18;
  const top = 18;
  const bottom = 48;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const values = entries.map((entry) => entry.value);
  const rawMin = block.type === 'line_chart' ? Math.min(...values) : Math.min(0, ...values);
  const rawMax = Math.max(...values, 0);
  const padding = rawMax === rawMin ? Math.max(Math.abs(rawMax) * 0.12, 1) : (rawMax - rawMin) * 0.08;
  const domainMin = rawMin - padding;
  const domainMax = rawMax + padding;
  const yAt = (value: number): number => top + ((domainMax - value) / (domainMax - domainMin)) * plotHeight;
  const xAt = (index: number): number => entries.length === 1 ? left + plotWidth / 2 : left + (index / (entries.length - 1)) * plotWidth;
  const chartId = `claim-chart-${chartSequence += 1}`;
  const title = `${series.label}: ${entries[0].label} a ${entries.at(-1)?.label || entries[0].label}`;
  const tickMarkup = [0, 0.5, 1].map((fraction) => {
    const value = domainMax - (domainMax - domainMin) * fraction;
    const y = top + plotHeight * fraction;
    return `<line class="claim-chart-grid" x1="${left}" y1="${y.toFixed(2)}" x2="${width - right}" y2="${y.toFixed(2)}"></line><text class="claim-chart-axis-label" x="${left - 8}" y="${(y + 4).toFixed(2)}" text-anchor="end">${escapeHtml(formatChartValue(value))}</text>`;
  }).join('');
  const xLabels = entries.map((entry, index) => {
    if (entries.length > 4 && index !== 0 && index !== entries.length - 1 && index % 2 !== 0) return '';
    const label = entry.label.length > 15 ? `${entry.label.slice(0, 14)}…` : entry.label;
    return `<text class="claim-chart-axis-label" x="${xAt(index).toFixed(2)}" y="${height - 17}" text-anchor="middle">${escapeHtml(label)}</text>`;
  }).join('');
  const lineMarkup = entries.length > 1
    ? `<polyline class="claim-chart-series" points="${entries.map((entry, index) => `${xAt(index).toFixed(2)},${yAt(entry.value).toFixed(2)}`).join(' ')}"></polyline>${entries.map((entry, index) => `<circle class="claim-chart-point" cx="${xAt(index).toFixed(2)}" cy="${yAt(entry.value).toFixed(2)}" r="4"><title>${escapeHtml(`${entry.label}: ${formatChartValue(entry.value)} ${series.unit}`)}</title></circle>`).join('')}`
    : `<circle class="claim-chart-point" cx="${xAt(0).toFixed(2)}" cy="${yAt(entries[0].value).toFixed(2)}" r="5"><title>${escapeHtml(`${entries[0].label}: ${formatChartValue(entries[0].value)} ${series.unit}`)}</title></circle>`;
  const baseline = yAt(0);
  const barsMarkup = entries.map((entry, index) => {
    const x = left + ((index + 0.5) / entries.length) * plotWidth;
    const barWidth = Math.min(70, (plotWidth / entries.length) * 0.62);
    const y = yAt(entry.value);
    const rectY = Math.min(y, baseline);
    const rectHeight = Math.max(1, Math.abs(y - baseline));
    return `<rect class="claim-chart-bar" x="${(x - barWidth / 2).toFixed(2)}" y="${rectY.toFixed(2)}" width="${barWidth.toFixed(2)}" height="${rectHeight.toFixed(2)}"><title>${escapeHtml(`${entry.label}: ${formatChartValue(entry.value)} ${series.unit}`)}</title></rect>`;
  }).join('');
  const plotMarkup = block.type === 'line_chart' ? lineMarkup : `${barsMarkup}<line class="claim-chart-baseline" x1="${left}" y1="${baseline.toFixed(2)}" x2="${width - right}" y2="${baseline.toFixed(2)}"></line>`;
  return `<div class="claim-plan-chart ${block.type === 'line_chart' ? 'claim-plan-chart-line' : 'claim-plan-chart-bars'}"><span class="clarification-label">${escapeHtml(series.label)}</span><svg class="claim-plan-chart-svg" role="img" aria-labelledby="${chartId}-title ${chartId}-description" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><title id="${chartId}-title">${escapeHtml(title)}</title><desc id="${chartId}-description">${escapeHtml(`Valores de ${series.label} expresados en ${series.unit}.`)}</desc>${tickMarkup}${plotMarkup}${xLabels}</svg>${chartDataMarkup(entries, series.unit)}<small>${escapeHtml(series.unit)}</small></div>`;
};

const blockEvidenceMarkup = (_plan: AnswerPlan, evidenceIds?: string[]): string => {
  if (!evidenceIds?.length) return '';
  return `<div class="claim-plan-block-evidence"><span>Conecta con ${evidenceIds.length} registro${evidenceIds.length > 1 ? 's' : ''} de evidencia</span></div>`;
};

const renderStructuredBlock = (plan: AnswerPlan, block: AnswerPlan['blocks'][number]): string => {
  if (block.type === 'key_number') {
    return `<div class="claim-plan-number claim-plan-card"><span class="clarification-label">${escapeHtml(block.label)}</span><strong>${escapeHtml(block.value)}</strong>${block.caveat ? `<small>${escapeHtml(block.caveat)}</small>` : ''}${blockEvidenceMarkup(plan, [block.evidenceId])}</div>`;
  }
  if (block.type === 'claim_breakdown') {
    const items = block.items?.length
      ? `<ul>${block.items.map((item) => `<li data-explicit="${item.explicit}" data-proposition-type="${escapeHtml(item.type)}"><strong>${item.explicit ? (propositionTypeLabels[item.type] || 'Afirmación') : 'Implicación'}</strong><span>${escapeHtml(item.text)}</span></li>`).join('')}</ul>`
      : `<p>${escapeHtml(block.propositionIds.join(' · '))}</p>`;
    return `<div class="claim-plan-breakdown"><span class="clarification-label">Qué estamos comprobando</span>${items}</div>`;
  }
  if (block.type === 'confirmed') {
    const linked = block.evidenceIds?.length || block.propositionIds.length;
    return `<div class="claim-plan-confirmed claim-plan-card"><span class="clarification-label">Lo que sí está respaldado</span>${block.points?.length ? `<ul>${block.points.slice(0, 3).map((point) => `<li>${escapeHtml(point)}</li>`).join('')}</ul>` : `<p>${escapeHtml(`${linked} registro${linked === 1 ? '' : 's'} de evidencia vinculado${linked === 1 ? '' : 's'}`)}</p>`}${blockEvidenceMarkup(plan, block.evidenceIds)}</div>`;
  }
  if (block.type === 'strongest_valid_concern') {
    return `<div class="claim-plan-concern"><span class="clarification-label">La preocupación válida</span><p>${escapeHtml(block.text)}</p></div>`;
  }
  if (block.type === 'evidence_ladder') {
    const ladderLabel = block.steps[0]?.label === 'Resultado concreto'
      ? 'Cómo concretarla para poder comprobarla'
      : block.steps[0]?.label === 'Cambio observado'
        ? 'Qué haría falta para demostrar la causa'
        : 'Qué haría falta para comprobarla';
    return `<div class="claim-plan-method claim-plan-ladder"><span class="clarification-label">${ladderLabel}</span><ol>${block.steps.map((step) => `<li data-status="${escapeHtml(step.status)}"><span>${escapeHtml(step.label)}</span><p>${escapeHtml(step.detail)}</p></li>`).join('')}</ol>${blockEvidenceMarkup(plan, block.evidenceIds)}</div>`;
  }
  if (block.type === 'legal_decision_tree') {
    return `<div class="claim-plan-method"><span class="clarification-label">Ruta para comprobar la regla</span><ol>${block.items.map((item) => `<li data-status="${escapeHtml(item.status)}"><span>${escapeHtml(item.label)}</span><p>${escapeHtml(item.detail)}</p></li>`).join('')}</ol></div>`;
  }
  if (block.type === 'prediction_conditions') {
    return `<div class="claim-plan-method"><span class="clarification-label">Convertirla en una predicción comprobable</span><dl>${block.items.map((item) => `<div data-status="${escapeHtml(item.status)}"><dt>${escapeHtml(item.label)}</dt><dd>${escapeHtml(item.value)}</dd></div>`).join('')}</dl></div>`;
  }
  if (block.type === 'trade_offs') {
    return `<div class="claim-plan-method claim-plan-tradeoffs"><span class="clarification-label">Qué criterio queréis priorizar</span><p>${escapeHtml(block.principle)}</p><div>${block.alternatives.map((item) => `<section><strong>${escapeHtml(item.label)}</strong><p>${escapeHtml(item.consequence)}</p></section>`).join('')}</div></div>`;
  }
  if (block.type === 'group_comparison_requirements') {
    return `<div class="claim-plan-method"><span class="clarification-label">Comprobación de comparabilidad</span><ul>${block.items.map((item) => `<li data-status="${escapeHtml(item.status)}"><span>${escapeHtml(item.label)}</span><p>${escapeHtml(item.detail)}</p></li>`).join('')}</ul></div>`;
  }
  if (block.type === 'cannot_conclude') {
    return `<div class="claim-plan-limit claim-plan-card"><span class="clarification-label">Lo que no se puede concluir todavía</span><ul>${block.points.slice(0, 4).map((point) => `<li>${escapeHtml(point)}</li>`).join('')}</ul>${blockEvidenceMarkup(plan, block.evidenceIds)}</div>`;
  }
  if (block.type === 'money_flow') {
    return `<div class="claim-plan-flow"><span class="clarification-label">Flujo descrito en la fuente localizada</span>${block.amount ? `<strong>${escapeHtml(block.amount)}</strong>` : ''}<div><strong>${escapeHtml(block.origin || 'Origen')}</strong><span>↓ transferencia</span><strong>${escapeHtml(block.destination || 'Destino')}</strong></div>${block.purpose ? `<small>Finalidad: ${escapeHtml(block.purpose)}</small>` : ''}<small>Contexto provisional; no demuestra por sí solo un recorte de servicios.</small>${blockEvidenceMarkup(plan, block.evidenceIds)}</div>`;
  }
  if (block.type === 'data_finding') {
    return `<div class="claim-plan-finding"><span class="clarification-label">Lo que muestran los datos localizados</span><ul>${block.points.slice(0, 3).map((point) => `<li>${escapeHtml(point)}</li>`).join('')}</ul>${blockEvidenceMarkup(plan, block.evidenceIds)}</div>`;
  }
  if (block.type === 'source_excerpt') {
    return `<div class="claim-plan-excerpt"><span class="clarification-label">${escapeHtml(block.title)}</span><blockquote>${escapeHtml(block.excerpt)}</blockquote><small>Fragmento mostrado para orientar la comprobación; no es por sí solo un veredicto.</small>${blockEvidenceMarkup(plan, block.evidenceIds)}</div>`;
  }
  if (block.type === 'line_chart' || block.type === 'bar_chart' || block.type === 'comparison_chart') {
    const chart = planVisualMarkup(plan, block);
    return chart ? chart.slice(0, -6) + blockEvidenceMarkup(plan, block.evidenceIds) + '</div>' : '';
  }
  if (block.type === 'conversation_reply') {
    return `<div class="claim-plan-reply" data-result-target="reply"><span class="clarification-label">Una forma de explicarlo</span><p>${escapeHtml(block.text)}</p><button type="button" data-copy-answer="${escapeHtml(block.text)}">Copiar respuesta</button>${blockEvidenceMarkup(plan, block.evidenceIds)}</div>`;
  }
  if (block.type === 'sources') {
    return `<div class="claim-plan-sources"><span class="clarification-label">Fuentes vinculadas</span><p>${escapeHtml(block.sourceIds.join(' · '))}</p></div>`;
  }
  return '';
};

const structuredBlocksMarkup = (plan: AnswerPlan): string => {
  const secondaryTypes = new Set<AnswerPlan['blocks'][number]['type']>([
    'evidence_ladder',
    'legal_decision_tree',
    'prediction_conditions',
    'trade_offs',
    'group_comparison_requirements',
    'source_excerpt',
    'sources',
  ]);
  const primary: string[] = [];
  const secondary: string[] = [];
  const coreGuidanceTypes = new Set<AnswerPlan['blocks'][number]['type']>([
    'evidence_ladder',
    'legal_decision_tree',
    'prediction_conditions',
    'trade_offs',
    'group_comparison_requirements',
  ]);
  plan.blocks.forEach((block) => {
    const markup = renderStructuredBlock(plan, block);
    if (!markup) return;
    const coreGuidance = (plan.coverage === 'insufficient' || plan.coverage === 'values') && coreGuidanceTypes.has(block.type);
    (secondaryTypes.has(block.type) && !coreGuidance ? secondary : primary).push(markup);
  });
  const detailMarkup = secondary.length
    ? `<details class="claim-result-details"><summary><span>Ver el análisis detallado</span><small>${secondary.length} bloque${secondary.length === 1 ? '' : 's'} sobre método, fuentes y límites</small></summary><div class="claim-result-secondary">${secondary.join('')}</div></details>`
    : '';
  return `${primary.join('')}${detailMarkup}`;
};

const sourceLinksMarkup = (plan: AnswerPlan): string => plan.sourceLinks?.length
  ? `<div class="claim-plan-source-links" data-result-target="sources"><span class="clarification-label">Fuente consultada</span>${plan.sourceLinks.slice(0, 3).map((source) => `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.title)} <span aria-hidden="true">↗</span></a>`).join('')}</div>`
  : '';

const resultUseActionsMarkup = (plan: AnswerPlan): string => {
  const hasReply = plan.blocks.some((block) => block.type === 'conversation_reply');
  const hasSources = Boolean(plan.sourceLinks?.length);
  if (!hasReply && !hasSources) return '';
  return `<div class="claim-result-use" aria-label="Elige cómo quieres usar esta aclaración"><span>Verlo como</span><div role="group" aria-label="Modo de la aclaración"><button type="button" data-result-mode-button="understand" aria-pressed="true">Entender</button>${hasReply ? '<button type="button" data-result-mode-button="reply" aria-pressed="false">Responder</button>' : ''}${hasSources ? '<button type="button" data-result-mode-button="sources" aria-pressed="false">Fuentes</button>' : ''}</div></div>`;
};

const resultActionsMarkup = (shareUrl?: string): string => `<div class="claim-result-actions claim-result-actions-primary" data-result-target="actions"><button type="button" data-new-check>Comprobar otra frase</button>${shareUrl ? `<button type="button" data-share-result data-share-url="${escapeHtml(shareUrl)}">Compartir aclaración</button>` : ''}</div>`;

const definitionChoiceMarkup = (original: string, plan: AnswerPlan): string => {
  const isBroadDefinition = plan.coverage === 'insufficient'
    && plan.blocks.some((block) => block.type === 'evidence_ladder' && block.steps[0]?.label === 'Resultado concreto');
  if (!isBroadDefinition) return '';
  const query = normaliseClaimText(original);
  const topicChoices = query.includes('sanidad') || query.includes('hospital') || query.includes('medic') || query.includes('salud')
    ? [
      '¿Cuánto gasta España en sanidad por habitante?',
      '¿Ha empeorado el acceso a la sanidad?',
      '¿Ha aumentado la esperanza de vida en España?',
      '¿Qué tiempo de espera quieres comprobar?',
    ]
    : query.includes('vivienda') || query.includes('alquiler') || query.includes('casa') || query.includes('piso')
      ? [
        '¿Ha empeorado el acceso a la vivienda en España?',
        '¿Cómo han cambiado los alquileres en España?',
        '¿Han subido los precios de la vivienda en España?',
        '¿Qué porcentaje de hogares sufre sobrecarga de vivienda?',
      ]
      : query.includes('empleo') || query.includes('trabajo') || query.includes('paro') || query.includes('sueldo') || query.includes('salario')
        ? [
              '¿Cómo ha evolucionado el desempleo en España?',
              '¿Tiene España una tasa de empleo mayor que la Unión Europea?',
          '¿Qué porcentaje de la población activa encuentra trabajo?',
          '¿Está creciendo el empleo en España?',
          '¿Han subido los salarios en España?',
          '¿Cómo ha cambiado el salario mínimo en España?',
        ]
          : query.includes('inmigr') || query.includes('extranj') || query.includes('patera') || query.includes('refug')
          ? [
            '¿Cuántos residentes nacieron fuera de España?',
            '¿Cuántas personas inmigraron a España durante el último año?',
            '¿La inmigración aumenta la inseguridad?',
            '¿Las personas inmigrantes reciben prioridad en las ayudas?',
          ]
          : query.includes('pension') || query.includes('jubil')
            ? [
              '¿Cuánto gasta España en pensiones y prestaciones de supervivencia por habitante?',
              '¿Cuánto gasta España en prestaciones de protección social por habitante?',
              '¿España gasta más por habitante en pensiones que la Unión Europea?',
              '¿Cómo ha evolucionado el envejecimiento de la población española?',
              '¿Qué porcentaje de personas mayores depende de la población en edad de trabajar?',
            ]
          : query.includes('ayuda') || query.includes('prestacion') || query.includes('proteccion social') || query.includes('gasto social')
            ? [
              '¿Cuánto gasta España en prestaciones de protección social por habitante?',
              '¿Cuánto gasta España en pensiones y prestaciones de supervivencia por habitante?',
              '¿Las personas inmigrantes reciben prioridad en las ayudas?',
              '¿Qué porcentaje de personas está en riesgo de pobreza o exclusión?',
              '¿Cómo han evolucionado los ingresos públicos sobre el PIB?',
            ]
          : query.includes('impuesto') || query.includes('econom') || query.includes('pib') || query.includes('precio') || query.includes('inflac')
            ? [
              '¿Cuál es el tamaño de la economía española?',
              '¿Sigue creciendo el PIB real de España?',
              '¿Crece España más que la Unión Europea?',
              '¿Tiene España más PIB por habitante que la Unión Europea?',
              '¿Cuál es la inflación anual en España?',
              '¿Está la inflación de España por encima de la Unión Europea?',
              '¿España recauda más o menos que la media europea?',
              '¿España cobra más impuestos sobre renta y riqueza que la Unión Europea?',
              '¿España gasta más o menos que la media de la Unión Europea?',
              '¿España gasta más por habitante en sanidad que la Unión Europea?',
              '¿España tiene más renta mediana que la Unión Europea?',
            ]
            : [
              '¿Ha empeorado el acceso a la vivienda en España?',
              '¿Ha subido el coste de vida en España?',
              '¿Está aumentando el paro en España?',
              '¿Ha empeorado la seguridad en España?',
            ];
  return `<div class="claim-plan-choices"><span class="clarification-label">Elige por dónde concretarla</span><p>Si no sabes qué dato buscar, empieza por una de estas preguntas:</p><div>${topicChoices.map((choice: string) => `<button type="button" data-clarification-choice="${escapeHtml(choice)}">${escapeHtml(choice)} <span aria-hidden="true">→</span></button>`).join('')}</div></div>`;
};

const resetChecker = (): void => {
  activeRequest?.abort();
  activeRequest = null;
  requestVersion += 1;
  if (input) input.value = '';
  if (fileInput) fileInput.value = '';
  if (fileName) fileName.textContent = 'Añadir captura o audio';
  if (mediaDropZone) mediaDropZone.classList.remove('is-dragging');
  if (mediaHelp) mediaHelp.textContent = 'También puedes arrastrar o pegar una captura; se enviará automáticamente.';
  updateCounter();
  if (result) result.innerHTML = '';
  window.history.replaceState({}, '', '/#comprobar');
  input?.focus();
};

const bindResultActions = (): void => {
  result?.querySelectorAll<HTMLButtonElement>('[data-copy-answer]').forEach((button) => button.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(button.dataset.copyAnswer || ''); button.textContent = 'Respuesta copiada'; } catch { button.textContent = 'Selecciona el texto para copiarlo'; }
  }));
  result?.querySelector<HTMLButtonElement>('[data-share-result]')?.addEventListener('click', async () => {
    const card = result.querySelector<HTMLElement>('.claim-result-card');
    const headline = card?.querySelector('h3')?.textContent || 'Aclaración sobre una afirmación';
    const summary = card?.querySelector('.claim-result-summary, .claim-result-short-answer p')?.textContent || '';
    const shareUrl = result.querySelector<HTMLButtonElement>('[data-share-result]')?.dataset.shareUrl || `${location.origin}/#comprobar`;
    try {
      let shared = false;
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: headline, text: summary, url: shareUrl });
        shared = true;
      } else await navigator.clipboard.writeText(`${headline}\n${summary}\n${shareUrl}`);
      const button = result.querySelector<HTMLButtonElement>('[data-share-result]');
      if (button) button.textContent = shared ? 'Compartido' : 'Enlace y resumen copiados';
    } catch { /* Sharing is optional and must not interrupt the result. */ }
  });
  result?.querySelector<HTMLButtonElement>('[data-new-check]')?.addEventListener('click', resetChecker);
  result?.querySelectorAll<HTMLButtonElement>('[data-result-mode-button]').forEach((button) => button.addEventListener('click', () => {
    const mode = button.dataset.resultModeButton;
    const card = result?.querySelector<HTMLElement>('.claim-result-card');
    if (!mode || !card) return;
    card.dataset.resultMode = mode;
    result?.querySelectorAll<HTMLButtonElement>('[data-result-mode-button]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    if (mode === 'sources') result?.querySelectorAll<HTMLDetailsElement>('.claim-result-details').forEach((details) => { details.open = true; });
    const target = mode === 'reply' ? result?.querySelector<HTMLElement>('[data-result-target="reply"]') : mode === 'sources' ? result?.querySelector<HTMLElement>('[data-result-target="sources"]') : result?.querySelector<HTMLElement>('[data-result-target="answer"]');
    target?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }));
  result?.querySelectorAll<HTMLButtonElement>('[data-focus-result]').forEach((button) => button.addEventListener('click', () => {
    const targetName = button.dataset.focusResult;
    const target = [...(result?.querySelectorAll<HTMLElement>('[data-result-target]') || [])].find((element) => element.dataset.resultTarget === targetName);
    if (!target) return;
    const details = target.closest('details');
    if (details) details.open = true;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.remove('claim-result-focus');
    window.requestAnimationFrame(() => target.classList.add('claim-result-focus'));
    window.setTimeout(() => target.classList.remove('claim-result-focus'), 1500);
  }));
  result?.querySelectorAll<HTMLButtonElement>('[data-clarification-choice]').forEach((button) => button.addEventListener('click', () => {
    const choice = button.dataset.clarificationChoice;
    if (!choice || !input || !form) return;
    if (fileInput) fileInput.value = '';
    if (fileName) fileName.textContent = 'Añadir captura o audio';
    if (mediaHelp) mediaHelp.textContent = 'También puedes arrastrar o pegar una captura; se enviará automáticamente.';
    input.value = choice;
    form.requestSubmit();
  }));
};

const renderStructuredPlan = (original: string, plan: AnswerPlan, primary?: ClaimIndexEntry, alternatives: ClaimIndexEntry[] = [], requestId?: string, state: 'published' | 'draft' | 'related' | 'uncovered' = 'published'): void => {
  if (!result) return;
  const resultLabel = state === 'published' ? 'Ficha publicada' : state === 'related' ? 'Orientación relacionada' : state === 'uncovered' ? 'Sin coincidencia directa' : 'Resultado automático';
  const resultState = state === 'published' ? 'Basada en una ficha revisada' : state === 'related' ? 'No es una comprobación exacta; ayuda a concretar la discusión' : state === 'uncovered' ? 'No hay una comprobación publicada de esta afirmación' : 'Orientación automática · provisional, no publicada';
  const resultTitle = state === 'published' ? `La frase que comprobamos: ${plan.headline}` : plan.headline;
  const displayedAssessment = state === 'published' && primary?.assessment
    ? assessmentLabels[primary.assessment] || primary.assessment
    : coverageLabel(plan.coverage);
  const nextStep = plan.clarificationQuestion
    || (primary ? primary.kind === 'topic' ? 'Abre el contexto del tema para ver qué preguntas concretas podemos comprobar.' : 'Abre la ficha revisada para ver el detalle y las fuentes.' : 'Concreta la fecha, el lugar o el programa para comprobar mejor la afirmación.');
  const shareUrl = shareUrlFor(original, primary, state);
  result.innerHTML = `<article class="claim-result-card" data-state="${state}" data-result-mode="understand" aria-labelledby="claim-result-title"><div class="claim-result-top"><div><span class="eyebrow">${resultLabel}</span><span class="claim-result-state">${resultState}</span></div><span class="claim-assessment">${escapeHtml(displayedAssessment)}</span></div><p class="claim-result-input">Has escrito: “${escapeHtml(original)}”</p><h3 id="claim-result-title">${escapeHtml(resultTitle)}</h3><div class="claim-result-short-answer" data-result-target="answer"><span class="clarification-label">Respuesta breve</span><p class="claim-result-summary">${escapeHtml(plan.summary)}</p><button type="button" data-copy-answer="${escapeHtml(plan.summary)}">Copiar resumen</button></div><div class="claim-result-overview" data-result-overview aria-label="Resumen del estado y siguiente paso"><div><span>Estado de la evidencia</span><strong>${escapeHtml(coverageLabel(plan.coverage))}</strong></div><div><span>Siguiente paso</span><strong>${escapeHtml(nextStep)}</strong></div></div>${resultUseActionsMarkup(plan)}${resultActionsMarkup(requestId ? shareUrl : undefined)}<div class="claim-plan-blocks">${structuredBlocksMarkup(plan)}</div>${definitionChoiceMarkup(original, plan)}${plan.clarificationQuestion ? `<div class="claim-plan-question" data-result-target="question"><span class="clarification-label">La siguiente pregunta útil</span><p>${escapeHtml(plan.clarificationQuestion)}</p></div>` : ''}${plan.limitation ? `<p class="claim-plan-limitation"><strong>Límite:</strong> ${escapeHtml(plan.limitation)}</p>` : ''}${sourceLinksMarkup(plan)}${primary ? resultLink(primary) : ''}${alternativeMarkup(alternatives)}${requestId ? `<div class="claim-feedback" data-feedback-request="${escapeHtml(requestId)}"><span>¿Te ha servido esta aclaración?</span><button type="button" data-feedback-value="yes">Sí</button><button type="button" data-feedback-value="partly">En parte</button><button type="button" data-feedback-value="no">No</button></div>` : ''}</article>`;
  bindResultActions();
  result.querySelectorAll<HTMLButtonElement>('[data-feedback-value]').forEach((button) => button.addEventListener('click', async () => {
    const feedback = button.closest<HTMLElement>('[data-feedback-request]');
    const requestId = feedback?.dataset.feedbackRequest;
    if (!requestId) return;
    try {
      await fetch('/api/feedback', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ requestId, value: button.dataset.feedbackValue }) });
      feedback.querySelectorAll('button').forEach((item) => { item.disabled = true; });
      const label = feedback.querySelector('span');
      if (label) label.textContent = 'Gracias por tu respuesta.';
    } catch { /* Feedback must never interrupt the answer. */ }
  }));
};

const renderCard = (state: 'loading' | 'published' | 'related' | 'uncovered' | 'unavailable' | 'invalid', original: string, primary?: ClaimIndexEntry, alternatives: ClaimIndexEntry[] = [], guidance?: SearchResponse['guidance'], reason = '', inputKind: 'text' | 'media' = 'text'): void => {
  if (!result) return;
  const labels = {
    loading: 'Procesando el archivo',
    published: 'Coincidencia publicada',
    related: 'Orientación más cercana',
    uncovered: 'Aún no hay una ficha exacta',
    unavailable: 'Orientación rápida disponible',
    invalid: 'Archivo no compatible',
  };
  const title = primary ? (state === 'published' ? `La frase que comprobamos: ${primary.title}` : primary.title) : (state === 'uncovered' ? 'No encontramos una ficha exacta todavía' : state === 'invalid' ? 'Prueba con otro archivo' : state === 'loading' ? 'Estamos leyendo el archivo' : state === 'unavailable' && inputKind === 'media' ? 'No pudimos extraer una afirmación del archivo' : guidance?.questions?.[0] || 'Estamos preparando una orientación');
  const stateDescription: Record<typeof state, string> = {
    loading: 'El archivo se está leyendo',
    published: 'Coincidencia con una ficha revisada',
    related: 'Contexto cercano, no una coincidencia exacta',
    uncovered: 'Todavía no hay una ficha publicada para esta frase',
    unavailable: 'La orientación rápida se conserva',
    invalid: 'El archivo necesita otro formato',
  };
  const body = state === 'loading'
      ? `<p>Estamos leyendo el contenido del archivo para buscar una orientación útil.</p>`
    : state === 'uncovered'
      ? `<p><strong>${escapeHtml(guidance?.limitation || 'No tenemos una comprobación publicada de esta afirmación.')}</strong></p>${guidance?.questions?.length ? `<div class="claim-guidance"><span class="clarification-label">Para comprobarla haría falta concretar</span><ul>${guidance.questions.slice(0, 2).map((question) => `<li>${escapeHtml(question)}</li>`).join('')}</ul></div>` : ''}${guidance?.suggestions?.length ? `<div class="claim-guidance claim-guidance-suggestions"><span class="clarification-label">${escapeHtml(guidance.suggestionsLabel || 'Puedes concretarla por un tema')}</span><div>${guidance.suggestions.slice(0, 4).map((suggestion) => `<a href="${escapeHtml(suggestion.href)}">${escapeHtml(suggestion.title)} <span aria-hidden="true">↗</span></a>`).join('')}</div></div>` : ''}`
    : state === 'unavailable'
        ? `<p><strong>${escapeHtml(guidance?.limitation || 'La comprobación automática está tardando más de lo previsto.')}</strong></p>${alternatives.length ? `<div class="claim-guidance"><span class="clarification-label">Mientras tanto, puedes consultar</span><ul>${alternatives.slice(0, 2).map((entry) => `<li><a href="${escapeHtml(entry.href)}">${escapeHtml(entry.title)}</a></li>`).join('')}</ul></div>` : ''}`
      : state === 'invalid'
        ? `<p><strong>${escapeHtml(guidance?.limitation || 'Este archivo no tiene un formato compatible.')}</strong></p><div class="claim-guidance"><span class="clarification-label">Formatos aceptados</span><ul><li>Capturas: PNG, JPEG, WebP o GIF</li><li>Audio: WAV, MP3, M4A, OGG, WebM o FLAC</li><li>Máximo: ${Math.round(INPUT_LIMITS.maxFileBytes / 1024 / 1024)} MB</li></ul></div>`
      : `${visualMarkup(primary)}<div class="claim-result-short-answer"><span class="clarification-label">Orientación en una frase</span><p>${escapeHtml(primary?.answer || reason || 'Hemos encontrado una orientación útil para seguir comprobando la afirmación.')}</p>${primary?.answer ? `<button type="button" data-copy-answer="${escapeHtml(primary.answer)}">Copiar respuesta</button>` : ''}</div>${primary ? resultLink(primary) : ''}`;
  const assessment = state === 'published' && primary?.assessment ? `<span class="claim-assessment">${escapeHtml(assessmentLabels[primary.assessment] || primary.assessment)}</span>` : '';
  const alternativesMarkup = ['published', 'related', 'unavailable'].includes(state) ? alternativeMarkup(alternatives) : '';
  const inputMarkup = inputKind === 'media'
    ? `<p class="claim-result-input">Archivo recibido: “${escapeHtml(original)}”</p>`
    : original ? `<p class="claim-result-input">Has escrito: “${escapeHtml(original)}”</p>` : '';
  result.innerHTML = `<article class="claim-result-card" data-state="${state}" aria-busy="${state === 'loading'}" aria-labelledby="claim-result-title"><div class="claim-result-top"><div><span class="eyebrow">${labels[state]}</span><span class="claim-result-state">${stateDescription[state]}</span></div>${assessment}</div>${inputMarkup}<h3 id="claim-result-title">${escapeHtml(title)}</h3>${body}${resultActionsMarkup(primary?.answer ? shareUrlFor(original, primary, state === 'published' ? 'published' : 'related') : undefined)}${alternativesMarkup}</article>`;
  bindResultActions();
};

const renderDeterministic = (original: string, ranked: RankedClaimIndexEntry[]): void => {
  const primary = ranked[0];
  const alternatives = ranked.slice(1).map((entry) => entry);
  const coverage = classifyDeterministicCoverage(primary);
  if (coverage.status === 'strong' && primary && isStrongClaimMatch(primary)) {
    renderCard('published', original, primary, alternatives);
    return;
  }
  if (coverage.status === 'qualified' && primary) {
    renderCard('related', original, primary, alternatives, {
      questions: ['¿Qué fecha, lugar o decisión concreta quieres comprobar?'],
      limitation: 'Esta es la orientación más cercana que hemos encontrado; todavía no es una comprobación de esta frase exacta.',
    }, 'Estamos comprobando si esta relación es la más útil.');
    return;
  }
  if (primary?.kind === 'topic' && primary.score >= 36) {
    renderCard('related', original, primary, alternatives, {
      questions: ['¿Qué decisión, dato o consecuencia concreta quieres comprobar dentro de este tema?'],
      limitation: 'La frase es amplia, pero este es el contexto más cercano que tenemos publicado. Concreta el hecho para comprobarlo mejor.',
    }, primary.answer);
    return;
  }
  const suggestions = broadTopicSuggestions(original);
  renderCard('uncovered', original, undefined, [], {
    questions: [
      '¿Qué hecho concreto afirma el texto y cuándo habría ocurrido?',
      '¿Qué fuente o publicación quieres que revisemos?',
    ],
    limitation: 'No tenemos una comprobación publicada de esta afirmación. Puedes concretarla para encontrar una orientación más útil.',
    suggestions: suggestions.items,
    suggestionsLabel: suggestions.label,
  });
};

const clearDynamicStatus = (): void => {
  if (dynamicStatusTimer !== null) {
    window.clearTimeout(dynamicStatusTimer);
    dynamicStatusTimer = null;
  }
  result?.querySelector('[data-dynamic-status]')?.remove();
};

let dynamicStatusTimer: number | null = null;

const setDynamicStatus = (message: string, state: 'running' | 'slow' | 'unavailable' = 'running', mode: 'enrichment' | 'media' = 'enrichment'): void => {
  if (!result) return;
  clearDynamicStatus();
  const status = document.createElement('div');
  status.className = 'claim-result-enrichment';
  status.dataset.dynamicStatus = 'true';
  status.dataset.statusState = state;
  status.dataset.statusMode = mode;
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('role', 'status');
  const progress = state === 'running'
    ? '<span class="claim-result-progress" aria-hidden="true"><b>1</b><i></i><b class="is-active">2</b></span>'
    : '';
  const title = mode === 'media'
    ? state === 'running' ? 'Añadiendo contexto en segundo plano' : state === 'slow' ? 'La orientación rápida sigue disponible' : 'Contexto adicional no disponible'
    : state === 'running' ? 'Mejorando la orientación en segundo plano' : state === 'slow' ? 'La orientación rápida sigue disponible' : 'Contexto adicional no disponible';
  status.innerHTML = `${progress}<span class="claim-result-enrichment-dot" aria-hidden="true"></span><div><strong>${title}</strong><span>${escapeHtml(message)}</span></div>`;
  result.querySelector('article')?.append(status);
  if (state === 'running') {
    const fallbackMessage = mode === 'media'
      ? 'La lectura del archivo está tardando más de lo previsto. Puedes usar la orientación visible o escribir la frase directamente; no hace falta esperar.'
      : 'No hemos podido añadir más contexto todavía. Puedes usar la orientación visible; no hace falta esperar.';
    dynamicStatusTimer = window.setTimeout(() => {
      if (status.isConnected && status.dataset.statusState === 'running') setDynamicStatus(fallbackMessage, 'slow', mode);
    }, mode === 'media' ? 12000 : 8000);
  }
};

const applyResponse = (response: SearchResponse, original: string, fallback: RankedClaimIndexEntry[]): void => {
  clearDynamicStatus();
  const structuredPrimary = response.relatedClaims?.[0];
  const primary = findEntry(response.primary?.slug || structuredPrimary?.slug);
  const alternatives = (response.alternatives || []).map((item) => findEntry(item.slug)).filter((entry): entry is ClaimIndexEntry => Boolean(entry));
  if (response.status === 'complete' && response.result && primary) {
    renderStructuredPlan(original, response.result, primary, alternatives, response.requestId, 'published');
    return;
  }
  if (response.status === 'complete' && primary) {
    renderCard('published', original, primary, alternatives, undefined, response.result?.summary || response.primary?.reason);
    return;
  }
  if (response.status === 'draft' && response.result) {
    renderStructuredPlan(original, response.result, primary, alternatives, response.requestId, 'draft');
    return;
  }
  if (response.status === 'partial' && response.result) {
    renderStructuredPlan(original, response.result, primary, alternatives, response.requestId, 'related');
    return;
  }
  if (response.status === 'partial' && primary) {
    renderCard('related', original, primary, alternatives, undefined, response.result?.summary || response.primary?.reason);
    return;
  }
  if (response.status === 'published' && primary) {
    renderCard('published', original, primary, alternatives, undefined, response.primary?.reason);
    return;
  }
  if (response.status === 'related' && primary) {
    renderCard('related', original, primary, alternatives, undefined, response.primary?.reason);
    return;
  }
  if (response.status === 'uncovered') {
    if (response.result?.blocks?.some((block) => block.type === 'claim_breakdown')) {
      renderStructuredPlan(original, response.result, primary, alternatives, response.requestId, 'uncovered');
      return;
    }
    const localSuggestions = broadTopicSuggestions(original);
    const guidance = {
      ...(response.guidance || {
      questions: response.result?.clarificationQuestion ? [response.result.clarificationQuestion] : [],
      limitation: response.result?.limitation,
      }),
      suggestions: response.guidance?.suggestions || localSuggestions.items,
      suggestionsLabel: response.guidance?.suggestionsLabel || localSuggestions.label,
    };
    renderCard('uncovered', original, undefined, [], guidance);
    return;
  }
  renderDeterministic(original, fallback);
};

const classify = async (query: string, ranked: RankedClaimIndexEntry[], file?: File): Promise<void> => {
  if (!result || !advancedEnabled) return;
  const version = ++requestVersion;
  const cacheKey = normaliseClaimText(query);
  const cached = !file && cacheKey ? responseCache.get(cacheKey) || (() => {
    try { return JSON.parse(sessionStorage.getItem(`claim-classification:${cacheKey}`) || 'null') as SearchResponse | null; } catch { return null; }
  })() : null;
  if (cached) { applyResponse(cached, query, ranked); return; }
  activeRequest?.abort();
  activeRequest = new AbortController();
  try {
    const inputType = file?.type.startsWith('audio/') ? 'audio' : file ? 'image' : /^https:\/\//i.test(query) ? 'url' : 'text';
    const requestBody = file ? (() => { const body = new FormData(); body.set('text', query); body.set('inputType', inputType); body.set('file', file); return body; })() : JSON.stringify({ text: query, inputType });
    const response = await fetch('/api/classify', { method: 'POST', headers: file ? undefined : { 'content-type': 'application/json' }, body: requestBody, signal: activeRequest.signal });
    let data = await response.json() as SearchResponse;
    if (data.status === 'processing' && data.requestId) {
      const processingMessage = inputType === 'image'
        ? query ? 'La orientación visible ya está lista; leemos la captura en segundo plano para comprobar si añade contexto.' : 'Hemos recibido la captura; leemos su texto en segundo plano para encontrar una comprobación.'
        : inputType === 'audio'
          ? query ? 'La orientación visible ya está lista; transcribimos el audio en segundo plano para comprobar si añade contexto.' : 'Hemos recibido el audio; extraemos su contenido en segundo plano para encontrar una comprobación.'
          : inputType === 'url'
            ? 'La orientación visible ya está lista; leemos la página enlazada en segundo plano para comprobar si añade contexto.'
            : 'La orientación visible ya está lista; buscamos una ficha publicada o datos directos en segundo plano para mejorarla.';
      setDynamicStatus(processingMessage, 'running', file && !query ? 'media' : 'enrichment');
      const pendingRequestId = data.requestId;
      const maxAttempts = file ? 120 : 20;
      const waitMs = file ? 500 : 350;
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        await new Promise((resolve, reject) => {
          const timeout = window.setTimeout(resolve, waitMs);
          activeRequest?.signal.addEventListener('abort', () => { window.clearTimeout(timeout); reject(new DOMException('Aborted', 'AbortError')); }, { once: true });
        });
        const pending = await fetch(`/api/classify/${encodeURIComponent(pendingRequestId)}`, { signal: activeRequest.signal });
        data = await pending.json() as SearchResponse;
        if (data.status !== 'processing') break;
      }
    }
    if (version !== requestVersion) return;
    if (data.status === 'processing') {
      setDynamicStatus(file && !query
        ? 'No hemos podido leer el archivo a tiempo. Puedes escribir o pegar la frase para comprobarla directamente.'
        : 'No hemos podido añadir más contexto todavía. Esto no significa que la afirmación sea verdadera o falsa; la orientación rápida visible sigue disponible y no hace falta esperar.', 'slow', file && !query ? 'media' : 'enrichment');
      return;
    }
    if (data.status === 'unavailable') {
      if (file && query) setDynamicStatus('La orientación visible ya está lista; no hemos podido añadir el contenido del archivo ahora.', 'unavailable', 'media');
      else if (file) renderCard('unavailable', file.name, undefined, fallbackPublishedClaims(), {
        limitation: 'No hemos podido extraer una afirmación utilizable de este archivo ahora. Puedes escribir o pegar la frase para comprobarla directamente.',
      }, '', 'media');
      else setDynamicStatus('No hemos podido añadir más contexto ahora. La respuesta inicial de arriba sigue siendo utilizable.', 'unavailable');
      return;
    }
    if (!file && cacheKey) {
      responseCache.set(cacheKey, data);
      recordUncoveredQuestion(query, data);
    }
    applyResponse(data, query, ranked);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    if (version === requestVersion) {
      if (file && query) setDynamicStatus('La orientación visible ya está lista; no hemos podido añadir el contenido del archivo ahora.', 'unavailable', 'media');
      else if (file) renderCard('unavailable', file.name, undefined, fallbackPublishedClaims(), { limitation: 'No hemos podido extraer una afirmación utilizable de este archivo ahora. Puedes escribir o pegar la frase para comprobarla directamente.' }, '', 'media');
      else setDynamicStatus('No hemos podido añadir más contexto ahora. La respuesta inicial de arriba sigue siendo utilizable.', 'unavailable');
    }
  }
};

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  requestVersion += 1;
  activeRequest?.abort();
  activeRequest = null;
  const query = input?.value.trim() || '';
  const file = fileInput?.files?.[0];
  if ((!query && !file) || !result) return;
  window.history.replaceState({}, '', query ? `/?q=${encodeURIComponent(query)}#comprobar` : '/#comprobar');
  if (file) {
    const inputType = file.type.startsWith('audio/') ? 'audio' : 'image';
    const validation = validateInputMetadata({ text: query, inputType, hasFile: true, fileSize: file.size, mimeType: file.type });
    if (!validation.ok) {
      const limitation = validation.code === 'file_too_large'
        ? `El archivo supera el máximo de ${Math.round(INPUT_LIMITS.maxFileBytes / 1024 / 1024)} MB.`
        : validation.code === 'invalid_audio'
          ? 'El audio debe estar en WAV, MP3, M4A, OGG, WebM o FLAC.'
          : 'La imagen debe estar en PNG, JPEG, WebP o GIF.';
      renderCard('invalid', file.name, undefined, [], { limitation }, '', 'media');
      return;
    }
  }
  const ranked = query ? rankClaimIndex(query, claimIndex) : [];
  if (query) renderDeterministic(query, ranked);
  else renderCard('loading', file?.name || 'Archivo enviado', undefined, [], undefined, '', 'media');
  result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  result.setAttribute('tabindex', '-1');
  result.focus({ preventScroll: true });
  if (ranked[0] && isStrongClaimMatch(ranked[0]) && !file) return;
  void classify(query, ranked, file);
});

mediaDropZone?.addEventListener('dragover', (event) => {
  event.preventDefault();
  mediaDropZone.classList.add('is-dragging');
});

mediaDropZone?.addEventListener('dragleave', (event) => {
  if (!mediaDropZone.contains(event.relatedTarget as Node | null)) mediaDropZone.classList.remove('is-dragging');
});

mediaDropZone?.addEventListener('drop', (event) => {
  event.preventDefault();
  mediaDropZone.classList.remove('is-dragging');
  const file = event.dataTransfer?.files?.[0];
  if (file) assignMediaFile(file);
});

form?.addEventListener('paste', (event) => {
  const file = Array.from(event.clipboardData?.files || []).find((item) => item.type.startsWith('image/'));
  if (!file) return;
  event.preventDefault();
  assignMediaFile(file);
});

fileInput?.addEventListener('change', () => {
  const selected = fileInput.files?.[0];
  if (fileName) fileName.textContent = selected ? selected.name : 'Añadir captura o audio';
  if (mediaHelp && selected) mediaHelp.textContent = 'Archivo listo: se está enviando automáticamente para buscar una orientación.';
  if (mediaHelp && !selected) mediaHelp.textContent = 'También puedes arrastrar o pegar una captura; se enviará automáticamente.';
  if (selected) form?.requestSubmit();
});

document.querySelectorAll<HTMLButtonElement>('[data-example]').forEach((button) => button.addEventListener('click', () => {
  if (input) { input.value = button.dataset.example || ''; form?.requestSubmit(); }
}));

input?.addEventListener('input', updateCounter);
updateCounter();
const initialQuery = new URLSearchParams(window.location.search).get('q')?.trim() || '';
if (initialQuery && input) {
  input.value = initialQuery.slice(0, INPUT_LIMITS.maxTextCharacters);
  updateCounter();
  window.setTimeout(() => form?.requestSubmit(), 0);
}
