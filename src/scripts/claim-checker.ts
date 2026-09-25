import { INPUT_LIMITS, validateInputMetadata } from '../lib/knowledge/input-contract.mjs';
import { publicDirectionLabel, publicMetricLabel } from '../lib/knowledge/public-presentation';

type CheckResult = {
  claim: string; reply: string; answer: string; shareableReply?: string; shareableSourceIds?: string[]; thesis?: { conclusion: string; criteria?: string[] }; keyFact?: string; whatWeKnow: string[]; limitations: string[];
  scope: { geography?: string; period?: string; checkedAt?: string };
  criteria?: Array<{ id: string; label: string; finding: string }>;
  arguments?: Array<{ id: string; claim: string; verdict: string; finding: string; evidenceIds: string[]; sourceIds: string[]; limitations: string[] }>;
  coverageSummary?: { total: number; supported: number; contradicted: number; mixed: number; insufficient: number; notVerifiable: number };
  sources: Array<{ id: string; title: string; publisher?: string; url: string; publishedAt?: string }>;
  assessment?: string; canonicalHref?: string; visual?: CheckVisual; visuals?: CheckVisual[]; scorecard?: { title: string; baselinePeriod: string; comparisonPeriod: string; snapshotDate?: string; scope?: string; explanation?: string; items: Array<{ label: string; unit: string; baseline?: { value: string; period: string }; comparison?: { value: string; period: string }; change?: string; direction: 'improved' | 'worsened' | 'roughly_unchanged' | 'unavailable'; caveat?: string; sources: Array<{ title: string; publisher?: string; url: string; publishedAt?: string }> }> }; evidenceSummary?: { mode: 'dynamic' | 'snapshot' | 'mixed' | 'none'; families: EvidenceFamily[]; missingDimensions?: string[]; fallbackReason?: string };
};
type CheckVisual = { type?: 'line' | 'bar' | 'comparison' | 'money-flow'; title?: string; unit?: string; labels: string[]; values: number[]; evidenceIds?: string[]; sourceId?: string; note?: string; interpretation?: string; breakAfter?: number[] };
type EvidenceStatus = 'available' | 'partial' | 'missing';
type EvidenceDimensions = { subject?: string; population?: string; period?: string; geography?: string; denominator?: string; unit?: string; causalRequirement?: string };
type EvidenceDataKind = 'observed' | 'projected' | 'snapshot' | 'context';
type EvidenceCriterion = { id: string; criterionId?: string; label: string; finding?: string; status?: EvidenceStatus; dataKind?: EvidenceDataKind; dimensions?: EvidenceDimensions; evidenceIds?: string[]; sourceIds?: string[]; data?: string[]; missingDimensions?: string[] };
type EvidenceFamily = { familyId?: string; familyLabel?: string; researchNote?: string; label: string; direction: string; status?: EvidenceStatus; dataKind?: EvidenceDataKind; dimensions?: EvidenceDimensions; evidenceIds: string[]; sourceIds?: string[]; finding?: string; limitation?: string; period?: string; data?: string[]; missingDimensions?: string[]; criteria?: EvidenceCriterion[] };
type CheckResponse =
  | { state: 'clarification'; id: string; claim: string; question: string; options: Array<{ id: string; label: string; interpretation: { kind?: string; normalizedClaim: string } }> }
  | { state: 'supported' | 'limited' | 'insufficient'; id: string; result: CheckResult & { evidenceLevel?: string; interpretation?: { kind: string; normalizedClaim: string } } }
  | { state: 'processing'; id: string; claim: string; preview?: Extract<CheckResponse, { state: 'supported' | 'limited' | 'insufficient' }> }
  | { state: 'unavailable'; id: string; claim: string; message: string; retryable: boolean };

const form = document.querySelector<HTMLFormElement>('#conversation-form');
const input = document.querySelector<HTMLTextAreaElement>('#conversation-input');
const fileInput = document.querySelector<HTMLInputElement>('#conversation-file');
const result = document.querySelector<HTMLElement>('#conversation-result');
const counter = document.querySelector<HTMLElement>('#conversation-counter');
const fileName = document.querySelector<HTMLElement>('[data-file-name]');
const mediaHelp = document.querySelector<HTMLElement>('#conversation-media-help');
const dropzone = document.querySelector<HTMLElement>('[data-media-dropzone]');
const recent = document.querySelector<HTMLElement>('#recent-checks');
const recentList = document.querySelector<HTMLElement>('[data-recent-list]');
const suggestions = document.querySelector<HTMLDetailsElement>('#checker-suggestions');
const checker = document.querySelector<HTMLElement>('.hero-checker');
const checkerPage = document.querySelector<HTMLElement>('.checker-page');
const homepage = document.querySelector<HTMLElement>('.homepage');
const modeButtons = document.querySelectorAll<HTMLButtonElement>('[data-input-mode]');
const attachButtons = document.querySelectorAll<HTMLButtonElement>('[data-attach]');
const inputHelp = document.querySelector<HTMLElement>('[data-input-help]');
const recentChecksStorageKey = 'elpaisestafatal:recent-checks:v2';
let loadingTicker: number | undefined;
let loadingStartedAt = 0;
let request: AbortController | undefined;
let clarificationContext: { id: string; prompt: string; interpretation?: { kind: string; normalizedClaim: string } } | undefined;
let selectedInputMode: 'text' | 'url' = 'text';

const escapeHtml = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
const copyText = async (value: string): Promise<void> => { if (!navigator.clipboard) throw new Error('clipboard-unavailable'); await navigator.clipboard.writeText(value); };
const fetchJson = async (url: string, init: RequestInit, timeout = 45_000, externalSignal?: AbortSignal): Promise<CheckResponse> => {
  const controller = new AbortController();
  let timedOut = false;
  const timer = window.setTimeout(() => { timedOut = true; controller.abort(); }, timeout);
  const cancel = () => controller.abort();
  externalSignal?.addEventListener('abort', cancel, { once: true });
  const headers = new Headers(init.headers);
  // Local Vite development bypasses the server's in-memory result cache. The
  // explicit page flag also lets a deployed preview be tested against the
  // latest Worker code without changing production's normal request path.
  const developmentRequest = import.meta.env.DEV || new URLSearchParams(window.location.search).get('fresh') === '1';
  if (developmentRequest) headers.set('x-development-no-cache', '1');
  const requestUrl = developmentRequest
    ? `${url}${url.includes('?') ? '&' : '?'}fresh=1`
    : url;
  try { const response = await fetch(requestUrl, { ...init, headers, cache: 'no-store', signal: controller.signal }); return await response.json() as CheckResponse; }
  catch (error) { if (timedOut) throw new Error('request-timeout'); throw error; }
  finally { window.clearTimeout(timer); externalSignal?.removeEventListener('abort', cancel); }
};
const readRecent = (): string[] => { try { const value = JSON.parse(localStorage.getItem(recentChecksStorageKey) || '[]'); return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').slice(0, 6) : []; } catch { return []; } };
const writeRecent = (text: string): void => { try { localStorage.setItem(recentChecksStorageKey, JSON.stringify([text, ...readRecent().filter((item) => item !== text)].slice(0, 6))); } catch { /* optional */ } };
const renderRecent = (): void => { if (!recent || !recentList) return; const values = readRecent(); recent.hidden = values.length === 0; recentList.innerHTML = values.map((value) => `<button type="button" data-recent-query="${escapeHtml(value)}">${escapeHtml(value)}</button>`).join(''); };
const setMode = (active: boolean): void => { checker?.classList.toggle('has-result', active); checkerPage?.classList.toggle('has-result', active); homepage?.classList.toggle('has-result', active); if (active) suggestions?.removeAttribute('open'); };
const selectInputMode = (mode: 'text' | 'url'): void => {
  selectedInputMode = mode;
  if (fileInput) fileInput.value = '';
  if (mediaHelp) mediaHelp.dataset.fileSelected = 'false';
  modeButtons.forEach((button) => { const active = button.dataset.inputMode === mode; button.classList.toggle('is-active', active); button.setAttribute('aria-pressed', String(active)); });
  if (input) { input.placeholder = mode === 'url' ? 'Pega aquí el enlace que quieres comprobar…' : 'Escribe o pega aquí la afirmación…'; input.inputMode = mode === 'url' ? 'url' : 'text'; input.focus(); }
  if (inputHelp) inputHelp.textContent = mode === 'url' ? 'Leeremos el contenido del enlace para identificar la afirmación.' : 'Puedes pegar una frase, un titular o el texto de un mensaje.';
};
const focusResult = (): void => { if (!result) return; window.setTimeout(() => { result.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); result.focus({ preventScroll: true }); }, 0); };
const submitButton = (): HTMLButtonElement | null => form?.querySelector<HTMLButtonElement>('button[type="submit"]') || null;
const finishLoading = (): void => {
  if (loadingTicker) window.clearInterval(loadingTicker);
  loadingTicker = undefined;
  if (form) form.removeAttribute('aria-busy');
  const button = submitButton();
  if (button) { button.disabled = false; button.removeAttribute('aria-label'); }
};
const renderClarification = (response: Extract<CheckResponse, { state: 'clarification' }>): void => {
  if (!result) return; setMode(true);
  result.innerHTML = `<article class="claim-result claim-clarification"><span class="eyebrow">Antes de comprobar</span><p class="claim-original">${escapeHtml(response.claim)}</p><h2>${escapeHtml(response.question)}</h2><div class="clarification-options">${response.options.map((option) => `<button type="button" data-clarification-id="${escapeHtml(option.id)}" data-clarification-kind="${escapeHtml(option.interpretation.kind || 'specific_fact')}" data-clarification-prompt="${escapeHtml(option.interpretation.normalizedClaim)}">${escapeHtml(option.label)}<span aria-hidden="true">→</span></button>`).join('')}</div><label class="clarification-custom">Otra precisión<textarea rows="2" data-clarification-custom placeholder="Añade una precisión"></textarea></label><button type="button" class="clarification-submit" data-clarification-submit>Continuar</button></article>`;
  result.querySelectorAll<HTMLButtonElement>('[data-clarification-id]').forEach((button) => button.addEventListener('click', () => { result.querySelectorAll('[data-clarification-id]').forEach((item) => item.removeAttribute('aria-pressed')); button.setAttribute('aria-pressed', 'true'); clarificationContext = { id: button.dataset.clarificationId || '', prompt: button.dataset.clarificationPrompt || '', interpretation: { kind: button.dataset.clarificationKind || 'specific_fact', normalizedClaim: button.dataset.clarificationPrompt || '' } }; }));
  result.querySelector<HTMLButtonElement>('[data-clarification-submit]')?.addEventListener('click', () => { const custom = result.querySelector<HTMLTextAreaElement>('[data-clarification-custom]')?.value.trim(); if (custom) clarificationContext = { id: 'custom', prompt: custom }; if (!clarificationContext) return; form?.requestSubmit(); });
  focusResult();
};
const renderUnavailable = (response: Extract<CheckResponse, { state: 'unavailable' }>): void => { if (!result) return; setMode(true); result.innerHTML = `<article class="claim-result claim-unavailable"><span class="eyebrow">No hemos podido comprobarla</span><h2>${escapeHtml(response.message)}</h2><button type="button" data-new-check>Volver a intentarlo</button></article>`; result.querySelector('[data-new-check]')?.addEventListener('click', () => { setMode(false); result.innerHTML = ''; input?.focus(); }); focusResult(); };
const directionLabel = (direction: string): string => publicDirectionLabel(direction);
const stateConclusion = (state: 'supported' | 'limited' | 'insufficient', answer: string) => answer.trim() || (state === 'supported'
  ? 'La evidencia disponible permite sostener esta afirmación en el alcance indicado.'
  : state === 'limited'
    ? 'La evidencia aporta contexto, pero no permite dar por demostrada la afirmación completa.'
    : 'No hay evidencia directa suficiente para confirmar esta afirmación.');
const formatNumber = (value: number): string => value.toLocaleString('es-ES', { maximumFractionDigits: 2 });
const evidenceGroupStatus = (criteria: EvidenceCriterion[]): EvidenceStatus => criteria.some((criterion) => criterion.status === 'partial') || (criteria.some((criterion) => criterion.status === 'available') && criteria.some((criterion) => criterion.status === 'missing'))
  ? 'partial'
  : criteria.length > 0 && criteria.every((criterion) => criterion.status === 'available')
    ? 'available'
    : 'missing';
const evidenceDimensionLabels: Record<string, string> = {
  population: 'Población',
  geography: 'Territorio',
  period: 'Periodo',
  denominator: 'Denominador',
  unit: 'Unidad',
};
const periodRangeFromData = (data?: string[]): string | undefined => {
  const periods = [...new Set((data || []).flatMap((value) => String(value).match(/\b(?:19|20|21)\d{2}(?:-\d{2}(?:-\d{2})?)?\b/g) || []))].sort();
  if (!periods.length) return undefined;
  return periods[0] === periods.at(-1) ? periods[0] : `${periods[0]}–${periods.at(-1)}`;
};
const formatEvidenceDimensions = (dimensions?: EvidenceDimensions, data?: string[]): string => {
  if (!dimensions) return '';
  return Object.entries(dimensions)
    .filter(([key, value]) => Boolean(value) && key in evidenceDimensionLabels)
    .map(([key, value]) => `${evidenceDimensionLabels[key]}: ${key === 'period' ? periodRangeFromData(data) || value : value}`)
    .join(' · ');
};
const evidenceGroupsFor = (families: EvidenceFamily[]): EvidenceFamily[] => {
  const groups = new Map<string, EvidenceFamily>();
  families.forEach((family, index) => {
    const familyId = family.familyId || `evidence-family-${index + 1}`;
    const existing = groups.get(familyId);
    const criterion: EvidenceCriterion = { id: family.label, label: family.label, finding: family.finding, status: family.status, dataKind: family.dataKind, dimensions: family.dimensions, evidenceIds: family.evidenceIds, sourceIds: family.sourceIds, data: family.data, missingDimensions: family.missingDimensions };
    const criteria = family.criteria?.length ? family.criteria : [criterion];
    const missingDimensions = [...new Set([...(family.missingDimensions || []), ...criteria.flatMap((item) => item.missingDimensions || [])])];
    if (!existing) groups.set(familyId, { ...family, familyId, familyLabel: family.familyLabel || family.label, criteria, sourceIds: family.sourceIds || [], data: family.data || [], missingDimensions });
    else {
      existing.criteria = [...(existing.criteria || []), ...criteria];
      existing.status = evidenceGroupStatus(existing.criteria);
      existing.evidenceIds = [...new Set([...existing.evidenceIds, ...family.evidenceIds])];
      existing.sourceIds = [...new Set([...(existing.sourceIds || []), ...(family.sourceIds || [])])];
      existing.data = [...new Set([...(existing.data || []), ...(family.data || [])])];
      existing.missingDimensions = [...new Set([...(existing.missingDimensions || []), ...missingDimensions])];
    }
  });
  return [...groups.values()];
};
const evidenceHeadingFor = (mode: 'dynamic' | 'snapshot' | 'mixed' | 'none', groups: EvidenceFamily[]): string => groups.some((group) => group.status === 'partial') ? mode === 'snapshot' ? 'Contexto revisado; evidencia parcial' : 'Datos compatibles y límites' : mode === 'none' ? 'Datos relacionados, no una prueba directa' : 'La evidencia disponible';
const evidenceDataKindLabel = (kind?: EvidenceDataKind): string => ({ observed: 'Datos observados', projected: 'Proyección', snapshot: 'Dato de referencia revisado', context: 'Contexto' }[kind || 'observed'] || 'Datos localizados');
const evidenceValueLabel = (value: string): string => value.replace(/^Serie localizada:\s*/i, '').replace(/^Programa identificado para la comprobación:\s*/i, '').trim();
const renderMissingList = (label: string, dimensions: string[], className: string): string => dimensions.length ? `<div class="${className}"><strong>${escapeHtml(label)}</strong><ul>${dimensions.map((dimension) => `<li>${escapeHtml(dimension)}</li>`).join('')}</ul></div>` : '';
const renderEvidenceGroups = (groups: EvidenceFamily[], sources: CheckResult['sources']): string => groups.map((group, index) => {
  const criteria = group.criteria || [];
  const sourceLinks = [...new Map((group.sourceIds || []).map((id) => sources.find((source) => source.id === id)).filter((source): source is CheckResult['sources'][number] => Boolean(source)).map((source) => [source.url, source])).values()];
  const statusLabel = group.status === 'available' ? 'Datos disponibles' : group.status === 'partial' ? 'Evidencia parcial' : 'Datos pendientes';
  return `<section class="evidence-family" id="evidence-family-${index + 1}" data-family-id="${escapeHtml(group.familyId || group.label)}"><header><span class="eyebrow">Familia de evidencia · ${escapeHtml(statusLabel)}</span><h4>${escapeHtml(publicMetricLabel(group.familyLabel || group.label))}</h4><p>${escapeHtml(group.finding || 'Esta familia se evalúa con sus propias medidas.')}</p></header><div class="result-evidence-grid">${criteria.map((criterion) => { const dimensions = formatEvidenceDimensions(criterion.dimensions, criterion.data); const criterionSourceLinks = [...new Map((criterion.sourceIds || []).map((id) => sources.find((source) => source.id === id)).filter((source): source is CheckResult['sources'][number] => Boolean(source)).map((source) => [source.url, source])).values()]; const hasData = Boolean(criterion.data?.length); return `<article class="evidence-criterion ${hasData ? '' : 'evidence-criterion-missing'}" data-criterion-id="${escapeHtml(criterion.criterionId || criterion.id)}"><div class="evidence-criterion-heading"><strong>${escapeHtml(publicMetricLabel(criterion.label))}</strong><span class="evidence-criterion-status">${escapeHtml(hasData ? evidenceDataKindLabel(criterion.dataKind) : 'Medición pendiente')}</span></div><p class="evidence-finding ${hasData ? '' : 'evidence-finding-missing'}">${escapeHtml(criterion.finding || 'No hay una serie publicada con este alcance.')}</p>${hasData ? `<ul class="evidence-values">${criterion.data!.map((value) => `<li>${escapeHtml(evidenceValueLabel(value))}</li>`).join('')}</ul>` : ''}${dimensions ? `<small class="evidence-dimensions">${escapeHtml(dimensions)}</small>` : ''}${criterionSourceLinks.length ? `<div class="evidence-criterion-sources">${criterionSourceLinks.map((source) => `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.title)} ↗</a>`).join('')}</div>` : ''}</article>`; }).join('')}</div>${renderMissingList('Qué queda pendiente en esta familia', group.missingDimensions || [], 'result-note evidence-missing-note')}${group.researchNote ? `<p class="result-note evidence-research-note">${escapeHtml(group.researchNote)}</p>` : ''}${group.limitation ? `<p class="result-note evidence-family-limitation">${escapeHtml(group.limitation)}</p>` : ''}${sourceLinks.length ? `<div class="evidence-family-sources"><span class="eyebrow">Fuentes de esta familia</span>${sourceLinks.map((source) => `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.title)} ↗</a>`).join('')}</div>` : ''}</section>`;
}).join('');
const answerLeadFor = (answer: string): string => {
  const lead = answer.split(/(?:Valores observados|Datos observados|Proyecciones|Datos de referencia revisados):/i)[0]?.trim() || answer.trim();
  return lead || 'La evidencia disponible no permite una conclusión completa.';
};
const renderReplyText = (text: string): string => text.split(/\n{2,}/).map((paragraph) => `<p>${escapeHtml(paragraph.trim())}</p>`).filter((paragraph) => paragraph !== '<p></p>').join('');
const renderClaimMap = (groups: EvidenceFamily[]): string => {
  if (groups.length < 2) return '';
  const conclusion = groups.every((group) => group.status === 'available')
    ? 'Cada parte tiene medidas compatibles; eso no convierte sus resultados en una sola conclusión causal.'
    : groups.some((group) => group.status === 'partial')
      ? 'Hay medidas compatibles, pero algunas partes todavía tienen dimensiones pendientes.'
      : 'Hay partes medidas y otras para las que no se ha localizado una medición compatible.';
  const cards = groups.map((group, index) => {
    const status = group.status === 'available' ? 'Medido' : group.status === 'partial' ? 'Parcial' : 'Pendiente';
    const statusClass = group.status === 'available' ? 'is-available' : group.status === 'partial' ? 'is-partial' : 'is-missing';
    const finding = group.finding || group.criteria?.[0]?.finding || (group.status === 'available' ? 'Hay una medida compatible localizada.' : 'No hay una medida compatible suficiente para esta parte.');
    return `<article class="claim-map-card ${statusClass}"><div class="claim-map-top"><span>0${index + 1}</span><strong>${escapeHtml(status)}</strong></div><h4>${escapeHtml(publicMetricLabel(group.familyLabel || group.label))}</h4><p>${escapeHtml(finding)}</p></article>`;
  }).join('');
  return `<section class="result-section result-claim-map" aria-labelledby="claim-map-title"><div class="result-section-heading"><span class="eyebrow">La frase contiene varias preguntas</span><h3 id="claim-map-title">${escapeHtml(conclusion)}</h3></div><div class="claim-map-grid">${cards}</div></section>`;
};
const loadingStagesFor = (text: string): string[] => {
  const value = text.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const stages = ['Separando las afirmaciones'];
  if (/legaliz|regulariz|inmigr|migrant|extranj/.test(value)) stages.push('Comprobando la regularización');
  if (/servicios? publicos?|colapso|sanidad|educacion|hospital|escuela/.test(value)) stages.push('Buscando indicadores de servicios públicos');
  if (/paguitas?|prestacion|subsidio|renta minima|ingreso minimo|benefici/.test(value)) stages.push('Revisando prestaciones');
  if (/padres|apoyo familiar|bienes inmuebles/.test(value)) stages.push('Comprobando apoyo familiar');
  return stages;
};
const renderVisual = (visual: CheckVisual, source: CheckResult['sources'][number] | undefined, scope: CheckResult['scope'], index: number): string => {
  const entries = visual.labels.map((label, index) => ({ label, value: Number(visual.values[index]) })).filter((entry) => Number.isFinite(entry.value));
  if (!entries.length) return '';
  const unit = visual.unit || 'valor';
  const title = visual.title || 'Datos utilizados';
  const titleId = `result-visual-title-${index}`;
  const sourceText = source ? `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">Fuente: ${escapeHtml(source.title)}${source.publishedAt ? ` · ${escapeHtml(source.publishedAt)}` : ''} ↗</a>` : 'Fuente indicada en el detalle de la respuesta';
  const note = visual.note ? `<p class="result-visual-method-note">${escapeHtml(visual.note)}</p>` : '';
  const period = scope.period ? ` · Periodo: ${escapeHtml(scope.period)}` : '';
  const table = entries.map((entry) => `<tr><th scope="row">${escapeHtml(entry.label)}</th><td>${escapeHtml(formatNumber(entry.value))} ${escapeHtml(unit)}</td></tr>`).join('');
  if (visual.type === 'comparison') {
    const cards = entries.map((entry) => `<div class="result-comparison-card"><span>${escapeHtml(entry.label)}</span><strong>${escapeHtml(formatNumber(entry.value))}</strong><small>${escapeHtml(unit)}</small></div>`).join('');
    return `<section class="result-visual result-comparison" aria-labelledby="${titleId}"><div class="result-section-heading"><span class="eyebrow">Comparación de datos</span><h3 id="${titleId}">${escapeHtml(title)}</h3></div><div class="result-comparison-grid">${cards}</div>${note}<p class="result-visual-note">${sourceText}${period}</p><details class="result-data-table"><summary>Ver valores exactos</summary><table><thead><tr><th>Grupo o periodo</th><th>Valor</th></tr></thead><tbody>${table}</tbody></table></details></section>`;
  }
  if (visual.type === 'bar') {
    const minimum = Math.min(0, ...entries.map((entry) => entry.value));
    const maximum = Math.max(0, ...entries.map((entry) => entry.value));
    const span = maximum - minimum || 1;
    const padding = span * .08;
    const domainMin = minimum < 0 ? minimum - padding : 0;
    const domainMax = maximum > 0 ? maximum + padding : 0;
    const domainSpan = domainMax - domainMin || 1;
    const zero = ((0 - domainMin) / domainSpan) * 100;
    const rows = entries.map((entry) => {
      const position = ((entry.value - domainMin) / domainSpan) * 100;
      const left = Math.min(zero, position);
      const width = Math.max(Math.abs(position - zero), .6);
      const sign = entry.value < 0 ? 'is-negative' : 'is-positive';
      return `<div class="result-bar-row"><div class="result-bar-heading"><strong>${escapeHtml(entry.label)}</strong><span>${escapeHtml(formatNumber(entry.value))} ${escapeHtml(unit)}</span></div><div class="result-bar-track" aria-hidden="true"><i class="result-bar-zero" style="--zero-position:${zero}%"></i><i class="result-bar-fill ${sign}" style="--bar-left:${left}%;--bar-width:${width}%"></i></div></div>`;
    }).join('');
    const axisStart = formatNumber(domainMin);
    const axisEnd = formatNumber(domainMax);
    return `<section class="result-visual result-horizontal-visual" aria-labelledby="${titleId}"><div class="result-section-heading"><span class="eyebrow">Datos utilizados</span><h3 id="${titleId}">${escapeHtml(title)}</h3></div><div class="result-bar-chart" role="group" aria-label="${escapeHtml(title)}">${rows}<div class="result-bar-axis" aria-hidden="true"><span>${escapeHtml(axisStart)} ${escapeHtml(unit)}</span><span>${escapeHtml(axisEnd)} ${escapeHtml(unit)}</span></div></div>${note}<p class="result-visual-note">${sourceText}${period}</p><details class="result-data-table"><summary>Ver valores exactos</summary><table><thead><tr><th>Grupo o periodo</th><th>Valor</th></tr></thead><tbody>${table}</tbody></table></details></section>`;
  }
  const width = 720; const height = 250; const left = 66; const right = 18; const top = 22; const bottom = 52; const plotWidth = width - left - right; const plotHeight = height - top - bottom;
  const min = Math.min(...entries.map((entry) => entry.value)); const max = Math.max(...entries.map((entry) => entry.value)); const padding = max === min ? Math.max(Math.abs(max) * .12, 1) : (max - min) * .1; const domainMin = min - padding; const domainMax = max + padding;
  const x = (index: number) => entries.length === 1 ? left + plotWidth / 2 : left + (index / (entries.length - 1)) * plotWidth;
  const y = (value: number) => top + ((domainMax - value) / (domainMax - domainMin)) * plotHeight;
  const ticks = [0, .5, 1].map((fraction) => { const value = domainMax - (domainMax - domainMin) * fraction; const tickY = top + plotHeight * fraction; return `<line class="result-chart-grid" x1="${left}" y1="${tickY}" x2="${width - right}" y2="${tickY}"></line><text class="result-chart-label" x="${left - 10}" y="${tickY + 4}" text-anchor="end">${escapeHtml(formatNumber(value))}</text>`; }).join('');
  const labelEvery = Math.max(1, Math.ceil(entries.length / 8));
  const xLabels = entries.map((entry, index) => index % labelEvery === 0 || index === entries.length - 1 ? `<text class="result-chart-label" x="${x(index)}" y="${height - 16}" text-anchor="middle">${escapeHtml(entry.label.length > 16 ? `${entry.label.slice(0, 15)}…` : entry.label)}</text>` : '').join('');
  const breakAfter = new Set(visual.breakAfter || []);
  const segments: number[][] = [];
  let segment: number[] = [];
  entries.forEach((_entry, index) => { segment.push(index); if (breakAfter.has(index)) { if (segment.length) segments.push(segment); segment = []; } });
  if (segment.length) segments.push(segment);
  const lines = segments.filter((items) => items.length > 1).map((items) => `<polyline class="result-chart-line" points="${items.map((index) => `${x(index)},${y(entries[index].value)}`).join(' ')}"></polyline>`).join('');
  const chart = `${lines}${entries.map((entry, index) => `<circle class="result-chart-point" cx="${x(index)}" cy="${y(entry.value)}" r="5"><title>${escapeHtml(entry.label)}: ${escapeHtml(formatNumber(entry.value))} ${escapeHtml(unit)}</title></circle>`).join('')}`;
  const trend = entries.length > 1 ? entries[entries.length - 1].value - entries[0].value : 0;
  const interpretation = visual.interpretation || (entries.length > 1
      ? `La serie pasa de ${formatNumber(entries[0].value)} a ${formatNumber(entries[entries.length - 1].value)} ${unit}${trend === 0 ? '.' : trend > 0 ? ', un aumento en el periodo mostrado.' : ', un descenso en el periodo mostrado.'}`
      : `El valor observado es ${formatNumber(entries[0].value)} ${unit}.`);
  return `<section class="result-visual" aria-labelledby="${titleId}"><div class="result-section-heading"><span class="eyebrow">Datos utilizados</span><h3 id="${titleId}">${escapeHtml(title)}</h3></div><svg class="result-chart" role="img" aria-label="${escapeHtml(title)}" viewBox="0 0 ${width} ${height}">${ticks}${chart}${xLabels}</svg><p class="result-visual-interpretation">${escapeHtml(interpretation)}</p>${note}<p class="result-visual-note">${sourceText}${period}</p><details class="result-data-table"><summary>Ver valores exactos</summary><table><thead><tr><th>Grupo o periodo</th><th>Valor</th></tr></thead><tbody>${table}</tbody></table></details></section>`;
};
const renderScorecard = (scorecard: NonNullable<CheckResult['scorecard']>): string => {
  const improved = scorecard.items.filter((item) => item.direction === 'improved').length;
  const worsened = scorecard.items.filter((item) => item.direction === 'worsened').length;
  const unchanged = scorecard.items.filter((item) => item.direction === 'roughly_unchanged').length;
  const directionText = (direction: string): string => direction === 'improved' ? 'Mejora' : direction === 'worsened' ? 'Empeora' : direction === 'roughly_unchanged' ? 'Sin cambio claro' : 'No disponible';
  const cards = scorecard.items.map((item) => {
    const values = item.baseline && item.comparison ? `<div class="scorecard-values"><div><span>${escapeHtml(item.baseline.period)}</span><strong>${escapeHtml(item.baseline.value)}</strong></div><span class="scorecard-arrow" aria-hidden="true">→</span><div><span>${escapeHtml(item.comparison.period)}</span><strong>${escapeHtml(item.comparison.value)}</strong></div></div>` : `<p class="scorecard-unavailable">No hay dos observaciones compatibles para este indicador.</p>`;
    const source = item.sources[0];
    return `<article class="scorecard-card scorecard-${escapeHtml(item.direction)}"><header><h4>${escapeHtml(item.label)}</h4><span>${escapeHtml(directionText(item.direction))}</span></header>${values}<p class="scorecard-change">${escapeHtml(item.change || item.unit)}</p>${item.caveat ? `<p class="scorecard-caveat">${escapeHtml(item.caveat)}</p>` : ''}${source ? `<a class="scorecard-source" href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.title)} ↗</a>` : ''}</article>`;
  }).join('');
  return `<section class="result-section result-scorecard"><div class="result-section-heading"><span class="eyebrow">Datos que sí podemos comparar</span><h3>${escapeHtml(scorecard.title)}</h3><p>${escapeHtml(scorecard.baselinePeriod)} → ${escapeHtml(scorecard.comparisonPeriod)}${scorecard.scope ? ` · Alcance: ${escapeHtml(scorecard.scope)}` : ''}${scorecard.snapshotDate ? ` · Revisado ${escapeHtml(scorecard.snapshotDate)}` : ''}</p></div><div class="scorecard-summary"><strong>${improved}</strong><span>mejoran</span><strong>${worsened}</strong><span>empeoran</span>${unchanged ? `<strong>${unchanged}</strong><span>sin cambio claro</span>` : ''}</div><div class="scorecard-grid">${cards}</div>${scorecard.explanation ? `<details class="result-details scorecard-methodology"><summary>Cómo se ha construido este cuadro<span aria-hidden="true">＋</span></summary><p class="scorecard-explanation">${escapeHtml(scorecard.explanation)}</p></details>` : ''}</section>`;
};
const renderResultOverview = (groups: EvidenceFamily[], state: string): string => {
  if (!groups.length) return '';
  const statusLabel = (status?: EvidenceStatus): string => status === 'available' ? 'Medido' : status === 'partial' ? 'Parcial' : 'Pendiente';
  const statusClass = (status?: EvidenceStatus): string => status === 'available' ? 'is-available' : status === 'partial' ? 'is-partial' : 'is-missing';
  return `<nav class="result-overview" aria-label="Resumen de la comprobación"><div class="result-overview-heading"><span class="eyebrow">Resumen de la comprobación</span><strong>${escapeHtml(state === 'limited' ? 'La evidencia es parcial' : state === 'insufficient' ? 'Faltan mediciones clave' : 'Hay evidencia compatible')}</strong></div><div class="result-overview-links">${groups.map((group, index) => `<a class="result-overview-link ${statusClass(group.status)}" href="#evidence-family-${index + 1}"><span>${escapeHtml(statusLabel(group.status))}</span><strong>${escapeHtml(publicMetricLabel(group.familyLabel || group.label))}</strong><span aria-hidden="true">↓</span></a>`).join('')}</div></nav>`;
};
const renderResult = (response: Extract<CheckResponse, { state: 'supported' | 'limited' | 'insufficient' }>, phase?: 'provisional' | 'final'): void => {
  if (!result) return; const item = response.result; setMode(true);
  const stateLabel = response.state === 'supported' ? 'Respuesta con fuentes' : response.state === 'limited' ? 'Evidencia limitada' : 'Evidencia insuficiente';
  const assessment = `<span class="claim-assessment claim-assessment-${response.state}">${escapeHtml(stateLabel)}</span>`;
  const scope = [item.scope.geography, item.scope.period, item.scope.checkedAt ? `Comprobada ${item.scope.checkedAt}` : ''].filter(Boolean).join(' · ');
  const interpretation = item.interpretation ? `<section class="result-interpretation"><span class="eyebrow">Entendemos la frase así</span><p>${escapeHtml(item.interpretation.normalizedClaim)}</p></section>` : '';
  const evidenceGroups = !item.scorecard && item.evidenceSummary?.families?.length ? evidenceGroupsFor(item.evidenceSummary.families) : [];
  const groupedFamilies = evidenceGroups.length ? `<section class="result-section result-evidence" data-evidence-groups><div class="result-section-heading"><span class="eyebrow">Qué respaldan los datos</span><h3>${escapeHtml(evidenceHeadingFor(item.evidenceSummary?.mode || 'none', evidenceGroups))}</h3><p>Cada familia conserva su propia población, periodo, unidad y fuente; las cifras no se suman si su alcance no coincide.</p></div>${renderEvidenceGroups(evidenceGroups, item.sources)}${item.evidenceSummary?.fallbackReason ? `<p class="result-note">${escapeHtml(item.evidenceSummary.fallbackReason)}</p>` : ''}</section>` : '';
  const compoundKnown = evidenceGroups.length ? `<section class="result-section result-known"><div class="result-section-heading"><span class="eyebrow">Qué sabemos</span><h3>${evidenceGroups.length > 1 ? 'La evidencia está repartida entre varias familias' : 'La evidencia está organizada por una familia'}</h3><p>Este resumen indica qué familias tienen medidas compatibles; los detalles y las fuentes aparecen más abajo.</p></div><div class="known-family-grid">${evidenceGroups.map((group) => { const highlights = [...new Set((group.criteria || []).flatMap((criterion) => criterion.data || []))].slice(0, 2); const status = group.status === 'available' ? 'Medido' : group.status === 'partial' ? 'Parcial' : 'Pendiente'; return `<article class="known-family-card"><div><span class="eyebrow">${escapeHtml(status)}</span><h4>${escapeHtml(publicMetricLabel(group.familyLabel || group.label))}</h4></div>${highlights.length ? `<ul>${highlights.map((value) => `<li>${escapeHtml(evidenceValueLabel(value))}</li>`).join('')}</ul>` : '<p>No hay una medición compatible localizada.</p>'}</article>`; }).join('')}</div><div class="result-limit"><span class="eyebrow">Límites de la evidencia (qué no demuestra)</span><p>${escapeHtml(item.limitations[0] || 'La evidencia de una familia no demuestra por sí sola las demás.')}</p></div></section>` : '';
  const groupedMethodology = evidenceGroups.length ? `<details class="result-details result-methodology"><summary>Cómo se ha comprobado · ${evidenceGroups.map((group) => escapeHtml(group.familyLabel || group.label)).join(' · ')}<span aria-hidden="true">＋</span></summary><div><p>La frase se separa en familias independientes. Cada familia se evalúa con sus propias medidas, sin convertir una subida simultánea en una relación causal ni en una conclusión sin una medición compatible localizada.</p><ol class="methodology-families">${evidenceGroups.map((group) => `<li><strong>${escapeHtml(group.familyLabel || group.label)}</strong><span>${escapeHtml(group.status === 'available' ? 'Hay medidas compatibles.' : group.status === 'partial' ? 'Hay medidas compatibles, pero también dimensiones pendientes.' : 'No hay una medición compatible localizada.')}</span><small>${escapeHtml((group.criteria || []).map((criterion) => formatEvidenceDimensions(criterion.dimensions) || criterion.label).join(' · '))}</small></li>`).join('')}</ol></div></details>` : '';
  const families = !item.scorecard && item.evidenceSummary?.families?.length ? `<section class="result-section result-evidence"><div class="result-section-heading"><span class="eyebrow">Qué respaldan los datos</span><h3>${escapeHtml(evidenceHeadingFor(item.evidenceSummary.mode, evidenceGroupsFor(item.evidenceSummary.families)))}</h3></div><div class="result-evidence-grid">${item.evidenceSummary.families.map((family) => `<article><strong>${escapeHtml(publicMetricLabel(family.label))}</strong>${family.finding ? `<p class="evidence-finding">${escapeHtml(family.finding)}</p>` : '<p class="evidence-finding evidence-finding-missing">No hay un hallazgo disponible para esta dimensión.</p>'}${family.data?.length ? `<p class="evidence-data"><span>Valores observados</span>${family.data.map((value) => escapeHtml(value)).join(' · ')}</p>` : ''}<span class="evidence-direction evidence-direction-${escapeHtml(family.direction)}">${escapeHtml(directionLabel(family.direction))}</span>${family.period ? `<small class="evidence-period">Periodo: ${escapeHtml(family.period)}</small>` : ''}${family.limitation ? `<small class="evidence-limitation">${escapeHtml(family.limitation)}</small>` : ''}</article>`).join('')}</div>${item.evidenceSummary.missingDimensions?.length ? `<p class="result-note evidence-missing-note"><strong>Qué queda pendiente:</strong> ${escapeHtml(item.evidenceSummary.missingDimensions.join('; '))}.</p>` : ''}${item.evidenceSummary.fallbackReason ? `<p class="result-note">${escapeHtml(item.evidenceSummary.fallbackReason)}</p>` : ''}</section>` : '';
  const scorecard = item.scorecard ? renderScorecard(item.scorecard) : '';
  const known = item.scorecard ? `<section class="result-section result-two-column"><div><span class="eyebrow">Qué se puede afirmar</span><p>El cuadro compara indicadores concretos entre ${escapeHtml(item.scorecard.baselinePeriod)} y ${escapeHtml(item.scorecard.comparisonPeriod)}: ${item.scorecard.items.filter((entry) => entry.direction === 'improved').length} mejoran y ${item.scorecard.items.filter((entry) => entry.direction === 'worsened').length} empeora${item.scorecard.items.filter((entry) => entry.direction === 'worsened').length === 1 ? '' : 'n'}.</p></div><div class="result-limit"><span class="eyebrow">Qué no demuestra</span><p>${escapeHtml(item.limitations[0] || 'No demuestra por sí solo qué políticas causaron esos cambios ni permite calificar a un Gobierno como bueno o malo.')}</p></div></section>` : !evidenceGroups.length && item.whatWeKnow.length ? `<section class="result-section result-two-column"><div><span class="eyebrow">Qué sabemos</span><p>${escapeHtml(item.whatWeKnow[0])}</p></div><div class="result-limit"><span class="eyebrow">Qué no demuestra</span><p>${escapeHtml(item.limitations[0] || 'La evidencia tiene un alcance concreto y no permite generalizar más allá de él.')}</p></div></section>` : '';
  const argumentVerdictLabel = (verdict: string): string => ({ supported: 'Respaldada', contradicted: 'Contradicha', mixed: 'Parcial', insufficient: 'Sin evidencia suficiente', not_verifiable: 'No verificable' }[verdict] || 'Pendiente');
  const argumentCards = item.arguments?.map((argument) => {
    const linkedSources = argument.sourceIds?.map((id) => item.sources.find((source) => source.id === id)).filter((source): source is CheckResult['sources'][number] => Boolean(source)).slice(0, 2) || [];
    return `<article><h4><span class="argument-verdict argument-${escapeHtml(argument.verdict)}">${escapeHtml(argumentVerdictLabel(argument.verdict))}</span>${escapeHtml(argument.claim)}</h4><p>${escapeHtml(argument.finding)}</p>${argument.limitations?.[0] ? `<small>${escapeHtml(argument.limitations[0])}</small>` : ''}${linkedSources.map((source) => `<a class="argument-source" href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.title)} ↗</a>`).join('')}</article>`;
  }).join('') || '';
  const argumentsView = item.arguments?.length ? item.arguments.length > 1
    ? `<section class="result-section result-arguments"><div class="result-section-heading"><span class="eyebrow">Partes de la afirmación</span><h3>Qué responde la evidencia</h3></div><div class="result-arguments-grid">${argumentCards}</div></section>`
    : `<details class="claim-arguments result-details"><summary>Ver argumento comprobado<span aria-hidden="true">＋</span></summary>${argumentCards}</details>` : '';
  const criteria = item.criteria?.length ? `<details class="result-details"><summary>Cómo se ha comprobado<span aria-hidden="true">＋</span></summary><div>${item.criteria.map((criterion) => `<p><strong>${escapeHtml(criterion.label)}:</strong> ${escapeHtml(criterion.finding)}</p>`).join('')}</div></details>` : '';
  const visualList = item.visuals?.length ? item.visuals : item.visual ? [item.visual] : [];
  const visuals = visualList.map((visual, index) => {
    if (visual.labels.length !== visual.values.length) return '';
    const visualSource = visual.sourceId ? item.sources.find((source) => source.id === visual.sourceId) : item.sources[0];
    return renderVisual(visual, visualSource, item.scope, index + 1);
  }).join('');
  const visual = visuals ? `<div class="result-visual-set" aria-label="Gráficos de la comprobación">${visuals}</div>` : '';
  const sources = item.sources.length && evidenceGroups.length < 2 ? `<section class="claim-sources result-sources"><div class="result-section-heading"><span class="eyebrow">Trazabilidad</span><h3>Fuentes y fecha</h3></div>${item.sources.slice(0, 4).map((source) => `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer"><strong>${escapeHtml(source.title)}</strong><span>${escapeHtml(source.publisher || '')}${source.publishedAt ? ` · ${source.publishedAt}` : ''} ↗</span></a>`).join('')}</section>` : '';
  const isShareableResult = Boolean(item.shareableReply?.trim());
  const answer = item.shareableReply?.trim() || item.answer.trim() || item.reply;
  const responseText = answer || 'No hay una respuesta redactada para esta comprobación.';
  const shareableSources = [...new Map((item.shareableSourceIds || []).map((id) => item.sources.find((source) => source.id === id)).filter((source): source is CheckResult['sources'][number] => Boolean(source)).map((source) => [source.url, source])).values()].slice(0, 5);
  const shareableSourceNav = shareableSources.length ? `<nav class="claim-share-sources" aria-label="Fuentes principales"><span class="eyebrow">Fuentes principales</span>${shareableSources.map((source) => `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.title)} ↗</a>`).join('')}</nav>` : '';
  const phaseStatus = phase === 'provisional'
    ? '<p class="claim-enrichment-status" role="status" aria-live="polite"><span class="claim-enrichment-dot" aria-hidden="true"></span>Respuesta provisional · la estamos contrastando; puede cambiar y aún no se puede copiar.</p>'
    : phase === 'final'
      ? '<p class="claim-enrichment-status is-final" role="status" aria-live="polite"><span class="claim-enrichment-dot" aria-hidden="true"></span>Respuesta final · la revisión de fuentes ha terminado.</p>'
      : '';
  const claimMap = renderClaimMap(evidenceGroups);
  const shareLead = answerLeadFor(responseText);
  const resultHeading = item.keyFact || stateConclusion(response.state, shareLead);
  const evidenceExplorer = isShareableResult
    ? `<details class="result-details result-evidence-explorer"><summary>Explorar datos, límites y fuentes<span aria-hidden="true">＋</span></summary>${scope ? `<p class="claim-scope result-meta">${escapeHtml(scope)}</p>` : ''}${interpretation}${claimMap}${compoundKnown}${scorecard}${groupedFamilies || families}${known}${argumentsView}${groupedMethodology || criteria}${sources}</details>`
    : `${scope ? `<p class="claim-scope result-meta">${escapeHtml(scope)}</p>` : ''}${interpretation}${compoundKnown}${claimMap}${scorecard}${groupedFamilies || families}${known}${argumentsView}${groupedMethodology || criteria}${sources}`;
  result.innerHTML = `<article class="claim-result result-redesigned" data-state="${response.state}">${phaseStatus}<header class="claim-result-heading"><div><p class="claim-original">${escapeHtml(item.claim)}</p><h2>${escapeHtml(resultHeading)}</h2></div>${assessment}</header><section class="claim-reply result-share" aria-labelledby="claim-reply-title"><div class="result-share-heading"><div class="result-section-heading"><span class="eyebrow">Respuesta principal</span><h3 id="claim-reply-title">${isShareableResult ? 'Respuesta para compartir' : 'La respuesta'}</h3></div><button type="button" class="claim-copy" data-copy-answer>${isShareableResult ? 'Copiar respuesta breve' : 'Copiar respuesta'}</button></div><div class="claim-reply-text">${renderReplyText(responseText)}</div><span class="claim-live" aria-live="polite"></span></section>${shareableSourceNav}${visual}${renderResultOverview(evidenceGroups, response.state)}${evidenceExplorer}<div class="claim-result-footer"><button type="button" data-new-check>Comprobar otra frase</button></div></article>`;
  result.querySelector<HTMLButtonElement>('[data-copy-answer]')?.addEventListener('click', async () => { try { await copyText(answer); result.querySelector('.claim-live')!.textContent = 'Respuesta copiada'; } catch { result.querySelector('.claim-live')!.textContent = 'No se ha podido copiar automáticamente'; } });
  result.querySelectorAll<HTMLAnchorElement>('.result-overview-link').forEach((link) => link.addEventListener('click', () => { const explorer = result.querySelector<HTMLDetailsElement>('.result-evidence-explorer'); if (explorer) explorer.open = true; }));
  result.querySelector<HTMLButtonElement>('[data-new-check]')?.addEventListener('click', () => { request?.abort(); finishLoading(); setMode(false); result.innerHTML = ''; clarificationContext = undefined; if (fileInput) fileInput.value = ''; if (mediaHelp) mediaHelp.dataset.fileSelected = 'false'; input?.focus({ preventScroll: true }); input?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
  focusResult();
};
const setLoading = (text: string): void => {
  finishLoading();
  loadingStartedAt = Date.now();
  const loadingStages = loadingStagesFor(text);
  if (form) form.setAttribute('aria-busy', 'true');
  const button = submitButton();
  if (button) { button.disabled = true; button.setAttribute('aria-label', 'Comprobación en curso'); }
  if (result) {
    setMode(true);
    result.innerHTML = `<article class="claim-result claim-loading" aria-busy="true" role="status" aria-live="polite"><div class="claim-loading-mark" aria-hidden="true"><i></i><i></i><i></i></div><span class="eyebrow" data-loading-stage>Comprobación en curso</span><h2 data-loading-title>Estamos contrastando datos y fuentes</h2><p>${escapeHtml(text)}</p><p class="claim-loading-note" data-loading-note>Aún no hay una respuesta final; la conclusión y las cifras aparecerán cuando termine la comprobación.</p><p class="claim-loading-family" data-loading-family>Partes a revisar: ${escapeHtml(loadingStages.slice(1).join(' · ') || 'afirmación y fuentes disponibles')}</p><p class="claim-loading-elapsed" data-loading-elapsed>Acabamos de empezar</p><button type="button" class="claim-loading-cancel" data-cancel-check>Cancelar</button></article>`;
    result.querySelector<HTMLButtonElement>('[data-cancel-check]')?.addEventListener('click', () => { request?.abort(); finishLoading(); setMode(false); result.innerHTML = ''; input?.focus(); });
  }
  const update = (): void => {
    const elapsed = Math.round((Date.now() - loadingStartedAt) / 1000);
    const stage = result?.querySelector<HTMLElement>('[data-loading-stage]');
    const title = result?.querySelector<HTMLElement>('[data-loading-title]');
    const note = result?.querySelector<HTMLElement>('[data-loading-note]');
    const elapsedNode = result?.querySelector<HTMLElement>('[data-loading-elapsed]');
    if (elapsed < 2) return;
    if (elapsed < 8) { if (stage) stage.textContent = 'Comprobación en curso'; if (title) title.textContent = 'Estamos contrastando datos y fuentes'; if (note) note.textContent = 'Aún no hay una respuesta final; la conclusión y las cifras aparecerán cuando termine la comprobación.'; }
    else if (elapsed < 15) { if (stage) stage.textContent = 'Comprobación en curso'; if (title) title.textContent = 'La revisión sigue en marcha'; if (note) note.textContent = 'Contrastamos cada parte con fuentes y periodos compatibles; todavía no mostramos una conclusión provisional.'; }
    else { if (stage) stage.textContent = 'Comprobación en curso'; if (title) title.textContent = 'Seguimos esperando los resultados'; if (note) note.textContent = 'Está tardando más de lo habitual; puedes esperar o cancelar y volver a intentarlo.'; }
    if (elapsedNode) elapsedNode.textContent = `${elapsed} s · La comprobación sigue en curso`;
  };
  loadingTicker = window.setInterval(update, 1000);
};
const renderProcessingPreview = (response: Extract<CheckResponse, { state: 'processing' }>): void => {
  if (!response.preview) return;
  renderResult(response.preview, 'provisional');
  const article = result?.querySelector<HTMLElement>('.claim-result');
  const copyButton = article?.querySelector<HTMLButtonElement>('[data-copy-answer]');
  if (copyButton) { copyButton.disabled = true; copyButton.textContent = 'Esperando respuesta final'; }
};
const submit = async (event: SubmitEvent): Promise<void> => {
  event.preventDefault(); const original = input?.value.trim() || ''; const file = fileInput?.files?.[0]; if (!original && !file) return;
  const inputType = file ? (file.type.startsWith('audio/') ? 'audio' : 'image') : selectedInputMode === 'url' || /^https:\/\//i.test(original) ? 'url' : 'text';
  if (file) { const valid = validateInputMetadata({ text: original, inputType, hasFile: true, fileSize: file.size, mimeType: file.type }); if (!valid.ok) { renderUnavailable({ state: 'unavailable', id: `invalid-${Date.now()}`, claim: original, message: valid.code, retryable: false }); return; } }
  request?.abort(); request = new AbortController(); if (!clarificationContext) writeRecent(original); setLoading(file?.name || original);
  const payload = file ? (() => { const value = new FormData(); value.set('text', original); value.set('inputType', inputType); if (clarificationContext) value.set('clarification', JSON.stringify(clarificationContext)); value.set('file', file); return value; })() : JSON.stringify({ text: original, inputType, clarification: clarificationContext });
  try {
    let response = await fetchJson('/api/check', { method: 'POST', headers: file ? undefined : { 'content-type': 'application/json' }, body: payload }, file ? 60_000 : 45_000, request.signal);
    const initialPreview = response.state === 'processing' ? response.preview : undefined;
    if (response.state === 'processing') renderProcessingPreview(response);
    // Local model interpretation and evidence planning can take a little
    // longer on a cold worker. Keep the animated status visible while the
    // request is still healthy instead of presenting a misleading timeout at
    // the short network budget used by the hosted deterministic path.
    const enrichmentDeadline = Date.now() + 120_000;
    for (let attempt = 0; response.state === 'processing' && response.id && Date.now() < enrichmentDeadline; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, Math.min(1500, 500 + attempt * 100)));
      try {
        response = await fetchJson(`/api/check/${encodeURIComponent(response.id)}`, { method: 'GET', headers: { 'x-claim-text': original } }, 2000, request.signal);
      } catch (error) {
        // A status check can time out while the resolver is still working.
        // Keep the processing response so a transient timeout cannot replace
        // an already-rendered preview with a terminal error.
        if (error instanceof Error && error.message === 'request-timeout') continue;
        throw error;
      }
    }
    finishLoading();
    clarificationContext = undefined;
    if (response.state === 'processing') {
      if (initialPreview) {
        const status = result?.querySelector<HTMLElement>('.claim-enrichment-status');
        if (status) {
          status.classList.add('is-stalled');
          status.innerHTML = '<span class="claim-enrichment-dot" aria-hidden="true"></span>No han llegado más datos; esta respuesta conserva su carácter provisional.';
        }
        const copyButton = result?.querySelector<HTMLButtonElement>('[data-copy-answer]');
        if (copyButton) { copyButton.disabled = false; copyButton.textContent = 'Copiar contexto provisional'; }
        return;
      }
      renderUnavailable({ state: 'unavailable', id: response.id, claim: original, message: 'La comprobación está tardando más de lo esperado. Puedes intentarlo de nuevo.', retryable: true }); return;
    }
    if (response.state === 'clarification') renderClarification(response); else if (response.state === 'unavailable') renderUnavailable(response); else if (response.state === 'supported' || response.state === 'limited' || response.state === 'insufficient') { if (response.state === 'supported' && response.result.canonicalHref) { window.location.assign(response.result.canonicalHref); return; } renderResult(response, initialPreview ? 'final' : undefined); }
  } catch (error) { if (error instanceof DOMException && error.name === 'AbortError' && request?.signal.aborted) { finishLoading(); return; } finishLoading(); renderUnavailable({ state: 'unavailable', id: `error-${Date.now()}`, claim: original, message: error instanceof Error && error.message === 'request-timeout' ? 'La comprobación está tardando demasiado. Puedes intentarlo de nuevo.' : 'El servicio no está disponible ahora. Puedes intentarlo de nuevo.', retryable: true }); }
};

form?.addEventListener('submit', submit);
input?.addEventListener('input', () => { if (counter) counter.textContent = `${input.value.length}/${INPUT_LIMITS.maxTextCharacters}`; });
fileInput?.addEventListener('change', () => { const file = fileInput.files?.[0]; if (fileName) fileName.textContent = file?.name || 'Sin archivo seleccionado.'; if (mediaHelp) mediaHelp.dataset.fileSelected = file ? 'true' : 'false'; if (file) form?.requestSubmit(); });
modeButtons.forEach((button) => button.addEventListener('click', () => selectInputMode(button.dataset.inputMode === 'url' ? 'url' : 'text')));
attachButtons.forEach((button) => button.addEventListener('click', () => { if (!fileInput) return; const type = button.dataset.attach === 'audio' ? 'audio' : 'image'; fileInput.accept = `${type}/*`; fileInput.value = ''; fileInput.click(); }));
dropzone?.addEventListener('dragenter', (event) => { event.preventDefault(); dropzone.classList.add('is-dragging'); });
dropzone?.addEventListener('dragover', (event) => { event.preventDefault(); dropzone.classList.add('is-dragging'); });
dropzone?.addEventListener('dragleave', (event) => { if (!dropzone.contains(event.relatedTarget as Node | null)) dropzone.classList.remove('is-dragging'); });
dropzone?.addEventListener('drop', (event) => { event.preventDefault(); dropzone.classList.remove('is-dragging'); const file = event.dataTransfer?.files?.[0]; if (!fileInput || !file || (!file.type.startsWith('image/') && !file.type.startsWith('audio/'))) return; const transfer = new DataTransfer(); transfer.items.add(file); fileInput.files = transfer.files; fileInput.dispatchEvent(new Event('change', { bubbles: true })); });
input?.addEventListener('paste', (event) => { const file = Array.from(event.clipboardData?.files || []).find((item) => item.type.startsWith('image/')); if (!fileInput || !file) return; event.preventDefault(); const transfer = new DataTransfer(); transfer.items.add(file); fileInput.files = transfer.files; fileInput.dispatchEvent(new Event('change', { bubbles: true })); });
checker?.addEventListener('click', (event) => { const target = event.target as HTMLElement; const query = target.closest<HTMLButtonElement>('[data-example], [data-recent-query]'); if (query && input) { input.value = query.dataset.example || query.dataset.recentQuery || ''; form?.requestSubmit(); } if (target.closest('[data-clear-recent]')) { try { localStorage.removeItem(recentChecksStorageKey); } catch { /* optional */ } renderRecent(); } });
renderRecent();
if (counter && input) counter.textContent = `${input.value.length}/${INPUT_LIMITS.maxTextCharacters}`;
const initial = new URLSearchParams(window.location.search).get('q')?.trim();
if (initial && input) { input.value = initial.slice(0, INPUT_LIMITS.maxTextCharacters); window.setTimeout(() => form?.requestSubmit(), 0); }
