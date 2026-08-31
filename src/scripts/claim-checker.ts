import { INPUT_LIMITS, validateInputMetadata } from '../lib/knowledge/input-contract.mjs';
import { publicDirectionLabel, publicMetricLabel } from '../lib/knowledge/public-presentation';

type CheckResult = {
  claim: string; reply: string; answer: string; thesis?: { conclusion: string; criteria?: string[] }; keyFact?: string; whatWeKnow: string[]; limitations: string[];
  scope: { geography?: string; period?: string; checkedAt?: string };
  criteria?: Array<{ id: string; label: string; finding: string }>;
  arguments?: Array<{ id: string; claim: string; verdict: string; finding: string; evidenceIds: string[]; sourceIds: string[]; limitations: string[] }>;
  coverageSummary?: { total: number; supported: number; contradicted: number; mixed: number; insufficient: number; notVerifiable: number };
  sources: Array<{ id: string; title: string; publisher?: string; url: string; publishedAt?: string }>;
  assessment?: string; canonicalHref?: string; visual?: { type?: 'line' | 'bar' | 'comparison' | 'money-flow'; title?: string; unit?: string; labels: string[]; values: number[] }; scorecard?: { title: string; baselinePeriod: string; comparisonPeriod: string; snapshotDate?: string; scope?: string; explanation?: string; items: Array<{ label: string; unit: string; baseline?: { value: string; period: string }; comparison?: { value: string; period: string }; change?: string; direction: 'improved' | 'worsened' | 'roughly_unchanged' | 'unavailable'; caveat?: string; sources: Array<{ title: string; publisher?: string; url: string; publishedAt?: string }> }> }; evidenceSummary?: { mode: 'dynamic' | 'snapshot' | 'mixed' | 'none'; families: Array<{ label: string; direction: string; evidenceIds: string[]; finding?: string; data?: string[]; limitation?: string; period?: string }>; missingDimensions?: string[]; fallbackReason?: string };
};
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
  try { const response = await fetch(url, { ...init, signal: controller.signal }); return await response.json() as CheckResponse; }
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
const renderVisual = (visual: NonNullable<CheckResult['visual']>, source: CheckResult['sources'][number] | undefined, scope: CheckResult['scope']): string => {
  const entries = visual.labels.map((label, index) => ({ label, value: Number(visual.values[index]) })).filter((entry) => Number.isFinite(entry.value)).slice(0, 8);
  if (!entries.length) return '';
  const unit = visual.unit || 'valor';
  const title = visual.title || 'Datos utilizados';
  const sourceText = source ? `Fuente: ${source.title}${source.publishedAt ? ` · ${source.publishedAt}` : ''}` : 'Fuente indicada en el detalle de la respuesta';
  const table = entries.map((entry) => `<tr><th scope="row">${escapeHtml(entry.label)}</th><td>${escapeHtml(formatNumber(entry.value))} ${escapeHtml(unit)}</td></tr>`).join('');
  if (entries.length === 2 || visual.type === 'comparison') {
    const cards = entries.map((entry) => `<div class="result-comparison-card"><span>${escapeHtml(entry.label)}</span><strong>${escapeHtml(formatNumber(entry.value))}</strong><small>${escapeHtml(unit)}</small></div>`).join('');
    return `<section class="result-visual result-comparison" aria-labelledby="result-visual-title"><div class="result-section-heading"><span class="eyebrow">Comparación de datos</span><h3 id="result-visual-title">${escapeHtml(title)}</h3></div><div class="result-comparison-grid">${cards}</div><p class="result-visual-note">${escapeHtml(sourceText)}${scope.period ? ` · Periodo: ${escapeHtml(scope.period)}` : ''}</p><details class="result-data-table"><summary>Ver valores exactos</summary><table><thead><tr><th>Grupo o periodo</th><th>Valor</th></tr></thead><tbody>${table}</tbody></table></details></section>`;
  }
  const width = 720; const height = 250; const left = 66; const right = 18; const top = 22; const bottom = 52; const plotWidth = width - left - right; const plotHeight = height - top - bottom;
  const min = Math.min(...entries.map((entry) => entry.value)); const max = Math.max(...entries.map((entry) => entry.value)); const padding = max === min ? Math.max(Math.abs(max) * .12, 1) : (max - min) * .1; const domainMin = min - padding; const domainMax = max + padding;
  const x = (index: number) => entries.length === 1 ? left + plotWidth / 2 : left + (index / (entries.length - 1)) * plotWidth;
  const y = (value: number) => top + ((domainMax - value) / (domainMax - domainMin)) * plotHeight;
  const ticks = [0, .5, 1].map((fraction) => { const value = domainMax - (domainMax - domainMin) * fraction; const tickY = top + plotHeight * fraction; return `<line class="result-chart-grid" x1="${left}" y1="${tickY}" x2="${width - right}" y2="${tickY}"></line><text class="result-chart-label" x="${left - 10}" y="${tickY + 4}" text-anchor="end">${escapeHtml(formatNumber(value))}</text>`; }).join('');
  const xLabels = entries.map((entry, index) => `<text class="result-chart-label" x="${x(index)}" y="${height - 16}" text-anchor="middle">${escapeHtml(entry.label.length > 16 ? `${entry.label.slice(0, 15)}…` : entry.label)}</text>`).join('');
  const chart = visual.type === 'bar' ? entries.map((entry, index) => { const barWidth = Math.min(70, (plotWidth / entries.length) * .62); const barX = left + ((index + .5) / entries.length) * plotWidth - barWidth / 2; const barY = y(entry.value); return `<rect class="result-chart-bar" x="${barX}" y="${barY}" width="${barWidth}" height="${Math.max(2, top + plotHeight - barY)}><title>${escapeHtml(entry.label)}: ${escapeHtml(formatNumber(entry.value))} ${escapeHtml(unit)}</title></rect>`; }).join('') : `<polyline class="result-chart-line" points="${entries.map((entry, index) => `${x(index)},${y(entry.value)}`).join(' ')}"></polyline>${entries.map((entry, index) => `<circle class="result-chart-point" cx="${x(index)}" cy="${y(entry.value)}" r="5"><title>${escapeHtml(entry.label)}: ${escapeHtml(formatNumber(entry.value))} ${escapeHtml(unit)}</title></circle>`).join('')}`;
  const trend = entries.length > 1 ? entries[entries.length - 1].value - entries[0].value : 0; const interpretation = entries.length > 1 ? `La serie pasa de ${formatNumber(entries[0].value)} a ${formatNumber(entries[entries.length - 1].value)} ${unit}${trend === 0 ? '.' : trend > 0 ? ', un aumento en el periodo mostrado.' : ', un descenso en el periodo mostrado.'}` : `El valor observado es ${formatNumber(entries[0].value)} ${unit}.`;
  return `<section class="result-visual" aria-labelledby="result-visual-title"><div class="result-section-heading"><span class="eyebrow">Datos utilizados</span><h3 id="result-visual-title">${escapeHtml(title)}</h3></div><svg class="result-chart" role="img" aria-label="${escapeHtml(title)}" viewBox="0 0 ${width} ${height}">${ticks}${chart}${xLabels}</svg><p class="result-visual-interpretation">${escapeHtml(interpretation)}</p><p class="result-visual-note">${escapeHtml(sourceText)}${scope.period ? ` · Periodo: ${escapeHtml(scope.period)}` : ''}</p><details class="result-data-table"><summary>Ver valores exactos</summary><table><thead><tr><th>Grupo o periodo</th><th>Valor</th></tr></thead><tbody>${table}</tbody></table></details></section>`;
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
const renderResult = (response: Extract<CheckResponse, { state: 'supported' | 'limited' | 'insufficient' }>): void => {
  if (!result) return; const item = response.result; setMode(true);
  const stateLabel = response.state === 'supported' ? 'Respuesta con fuentes' : response.state === 'limited' ? 'Evidencia limitada' : 'Evidencia insuficiente';
  const assessment = `<span class="claim-assessment claim-assessment-${response.state}">${escapeHtml(stateLabel)}</span>`;
  const scope = [item.scope.geography, item.scope.period, item.scope.checkedAt ? `Comprobada ${item.scope.checkedAt}` : ''].filter(Boolean).join(' · ');
  const interpretation = item.interpretation ? `<section class="result-interpretation"><span class="eyebrow">Entendemos la frase así</span><p>${escapeHtml(item.interpretation.normalizedClaim)}</p></section>` : '';
  const families = !item.scorecard && item.evidenceSummary?.families?.length ? `<section class="result-section result-evidence"><div class="result-section-heading"><span class="eyebrow">Qué respaldan los datos</span><h3>${escapeHtml(item.evidenceSummary.mode === 'none' ? 'Datos relacionados, no una prueba directa' : 'La evidencia disponible')}</h3></div><div class="result-evidence-grid">${item.evidenceSummary.families.slice(0, 5).map((family) => `<article><strong>${escapeHtml(publicMetricLabel(family.label))}</strong>${family.finding ? `<p class="evidence-finding">${escapeHtml(family.finding)}</p>` : '<p class="evidence-finding evidence-finding-missing">No hay un hallazgo disponible para esta dimensión.</p>'}${family.data?.length ? `<p class="evidence-data"><span>Valores observados</span>${family.data.map((value) => escapeHtml(value)).join(' · ')}</p>` : ''}<span class="evidence-direction evidence-direction-${escapeHtml(family.direction)}">${escapeHtml(directionLabel(family.direction))}</span>${family.period ? `<small class="evidence-period">Periodo: ${escapeHtml(family.period)}</small>` : ''}${family.limitation ? `<small class="evidence-limitation">${escapeHtml(family.limitation)}</small>` : ''}</article>`).join('')}</div>${item.evidenceSummary.missingDimensions?.length ? `<p class="result-note evidence-missing-note"><strong>Qué queda pendiente:</strong> ${escapeHtml(item.evidenceSummary.missingDimensions.join('; '))}.</p>` : ''}${item.evidenceSummary.fallbackReason ? `<p class="result-note">${escapeHtml(item.evidenceSummary.fallbackReason)}</p>` : ''}</section>` : '';
  const scorecard = item.scorecard ? renderScorecard(item.scorecard) : '';
  const known = item.scorecard ? `<section class="result-section result-two-column"><div><span class="eyebrow">Qué se puede afirmar</span><p>El cuadro compara indicadores concretos entre ${escapeHtml(item.scorecard.baselinePeriod)} y ${escapeHtml(item.scorecard.comparisonPeriod)}: ${item.scorecard.items.filter((entry) => entry.direction === 'improved').length} mejoran y ${item.scorecard.items.filter((entry) => entry.direction === 'worsened').length} empeora${item.scorecard.items.filter((entry) => entry.direction === 'worsened').length === 1 ? '' : 'n'}.</p></div><div class="result-limit"><span class="eyebrow">Qué no demuestra</span><p>${escapeHtml(item.limitations[0] || 'No demuestra por sí solo qué políticas causaron esos cambios ni permite calificar a un Gobierno como bueno o malo.')}</p></div></section>` : item.whatWeKnow.length ? `<section class="result-section result-two-column"><div><span class="eyebrow">Qué sabemos</span><p>${escapeHtml(item.whatWeKnow[0])}</p></div><div class="result-limit"><span class="eyebrow">Qué no demuestra</span><p>${escapeHtml(item.limitations[0] || 'La evidencia tiene un alcance concreto y no permite generalizar más allá de él.')}</p></div></section>` : '';
  const argumentVerdictLabel = (verdict: string): string => ({ supported: 'Respaldada', contradicted: 'Contradicha', mixed: 'Parcial', insufficient: 'Sin evidencia suficiente', not_verifiable: 'No verificable' }[verdict] || 'Pendiente');
  const argumentCards = item.arguments?.map((argument) => {
    const linkedSources = argument.sourceIds?.map((id) => item.sources.find((source) => source.id === id)).filter((source): source is CheckResult['sources'][number] => Boolean(source)).slice(0, 2) || [];
    return `<article><h4><span class="argument-verdict argument-${escapeHtml(argument.verdict)}">${escapeHtml(argumentVerdictLabel(argument.verdict))}</span>${escapeHtml(argument.claim)}</h4><p>${escapeHtml(argument.finding)}</p>${argument.limitations?.[0] ? `<small>${escapeHtml(argument.limitations[0])}</small>` : ''}${linkedSources.map((source) => `<a class="argument-source" href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.title)} ↗</a>`).join('')}</article>`;
  }).join('') || '';
  const argumentsView = item.arguments?.length ? item.arguments.length > 1
    ? `<section class="result-section result-arguments"><div class="result-section-heading"><span class="eyebrow">Partes de la afirmación</span><h3>Qué responde la evidencia</h3></div><div class="result-arguments-grid">${argumentCards}</div></section>`
    : `<details class="claim-arguments result-details"><summary>Ver argumento comprobado<span aria-hidden="true">＋</span></summary>${argumentCards}</details>` : '';
  const criteria = item.criteria?.length ? `<details class="result-details"><summary>Cómo se ha comprobado<span aria-hidden="true">＋</span></summary><div>${item.criteria.map((criterion) => `<p><strong>${escapeHtml(criterion.label)}:</strong> ${escapeHtml(criterion.finding)}</p>`).join('')}</div></details>` : '';
  const visual = item.visual && item.visual.labels.length === item.visual.values.length ? renderVisual(item.visual, item.sources[0], item.scope) : '';
  const sources = item.sources.length ? `<section class="claim-sources result-sources"><div class="result-section-heading"><span class="eyebrow">Trazabilidad</span><h3>Fuentes y fecha</h3></div>${item.sources.slice(0, 4).map((source) => `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer"><strong>${escapeHtml(source.title)}</strong><span>${escapeHtml(source.publisher || '')}${source.publishedAt ? ` · ${escapeHtml(source.publishedAt)}` : ''} ↗</span></a>`).join('')}</section>` : '';
  const answer = item.answer.trim() || item.reply;
  result.innerHTML = `<article class="claim-result result-redesigned" data-state="${response.state}"><header class="claim-result-heading"><div><p class="claim-original">${escapeHtml(item.claim)}</p><h2>${escapeHtml(stateConclusion(response.state, answer))}</h2><button type="button" class="claim-copy result-copy" data-copy-answer>Copiar respuesta</button><span class="claim-live" aria-live="polite"></span></div>${assessment}</header>${scope ? `<p class="claim-scope result-meta">${escapeHtml(scope)}</p>` : ''}${interpretation}${scorecard}${families}${known}${argumentsView}${criteria}${visual}${sources}<div class="claim-result-footer"><button type="button" data-new-check>Comprobar otra frase</button></div></article>`;
  result.querySelector<HTMLButtonElement>('[data-copy-answer]')?.addEventListener('click', async () => { try { await copyText(answer); result.querySelector('.claim-live')!.textContent = 'Respuesta copiada'; } catch { result.querySelector('.claim-live')!.textContent = 'No se ha podido copiar automáticamente'; } });
  result.querySelector<HTMLButtonElement>('[data-new-check]')?.addEventListener('click', () => { request?.abort(); finishLoading(); setMode(false); result.innerHTML = ''; clarificationContext = undefined; if (fileInput) fileInput.value = ''; if (mediaHelp) mediaHelp.dataset.fileSelected = 'false'; input?.focus({ preventScroll: true }); input?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
  focusResult();
};
const setLoading = (text: string): void => {
  finishLoading();
  loadingStartedAt = Date.now();
  if (form) form.setAttribute('aria-busy', 'true');
  const button = submitButton();
  if (button) { button.disabled = true; button.setAttribute('aria-label', 'Comprobación en curso'); }
  if (result) {
    setMode(true);
    result.innerHTML = `<article class="claim-result claim-loading" aria-busy="true" role="status" aria-live="polite"><div class="claim-loading-mark" aria-hidden="true"><i></i><i></i><i></i></div><span class="eyebrow" data-loading-stage>Comprobando</span><h2 data-loading-title>Estamos entendiendo la frase</h2><p>${escapeHtml(text)}</p><p class="claim-loading-note" data-loading-note>Separamos lo que afirma, buscamos el contexto necesario y comprobamos si hay fuentes que respondan exactamente.</p><p class="claim-loading-elapsed" data-loading-elapsed>Acabamos de empezar</p><button type="button" class="claim-loading-cancel" data-cancel-check>Cancelar</button></article>`;
    result.querySelector<HTMLButtonElement>('[data-cancel-check]')?.addEventListener('click', () => { request?.abort(); finishLoading(); setMode(false); result.innerHTML = ''; input?.focus(); });
  }
  const update = (): void => {
    const elapsed = Math.round((Date.now() - loadingStartedAt) / 1000);
    const stage = result?.querySelector<HTMLElement>('[data-loading-stage]');
    const title = result?.querySelector<HTMLElement>('[data-loading-title]');
    const note = result?.querySelector<HTMLElement>('[data-loading-note]');
    const elapsedNode = result?.querySelector<HTMLElement>('[data-loading-elapsed]');
    if (elapsed < 3) return;
    if (elapsed < 8) { if (stage) stage.textContent = 'Analizando'; if (title) title.textContent = 'Estamos identificando qué afirma'; if (note) note.textContent = 'Buscamos una comprobación compatible con la frase y su periodo, lugar y medida.'; }
    else if (elapsed < 15) { if (stage) stage.textContent = 'Contrastando'; if (title) title.textContent = 'Estamos buscando datos y fuentes'; if (note) note.textContent = 'La respuesta sigue en curso. El modelo solo ayuda a interpretar y ordenar evidencia comprobable.'; }
    else { if (stage) stage.textContent = 'Preparando fuentes'; if (title) title.textContent = 'Estamos terminando la comprobación'; if (note) note.textContent = 'Está tardando un poco más de lo habitual; puedes esperar o cancelar y volver a intentarlo.'; }
    if (elapsedNode) elapsedNode.textContent = `${elapsed} s · La comprobación sigue en curso`;
  };
  loadingTicker = window.setInterval(update, 1000);
};
const renderProcessingPreview = (response: Extract<CheckResponse, { state: 'processing' }>): void => {
  if (!response.preview) return;
  renderResult(response.preview);
  const article = result?.querySelector<HTMLElement>('.claim-result');
  article?.insertAdjacentHTML('afterbegin', '<p class="claim-enrichment-status" role="status" aria-live="polite"><span class="claim-enrichment-dot" aria-hidden="true"></span>Respuesta inicial disponible · estamos comprobando si podemos añadir más contexto y fuentes.</p>');
};
const submit = async (event: SubmitEvent): Promise<void> => {
  event.preventDefault(); const original = input?.value.trim() || ''; const file = fileInput?.files?.[0]; if (!original && !file) return;
  const inputType = file ? (file.type.startsWith('audio/') ? 'audio' : 'image') : selectedInputMode === 'url' || /^https:\/\//i.test(original) ? 'url' : 'text';
  if (file) { const valid = validateInputMetadata({ text: original, inputType, hasFile: true, fileSize: file.size, mimeType: file.type }); if (!valid.ok) { renderUnavailable({ state: 'unavailable', id: `invalid-${Date.now()}`, claim: original, message: valid.code, retryable: false }); return; } }
  request?.abort(); request = new AbortController(); if (!clarificationContext) writeRecent(original); setLoading(file?.name || original);
  const payload = file ? (() => { const value = new FormData(); value.set('text', original); value.set('inputType', inputType); if (clarificationContext) value.set('clarification', JSON.stringify(clarificationContext)); value.set('file', file); return value; })() : JSON.stringify({ text: original, inputType, clarification: clarificationContext });
  try {
    let response = await fetchJson('/api/check', { method: 'POST', headers: file ? undefined : { 'content-type': 'application/json' }, body: payload }, file ? 60_000 : 45_000, request.signal);
    if (response.state === 'processing') renderProcessingPreview(response);
    // Local model interpretation and evidence planning can take a little
    // longer on a cold worker. Keep the animated status visible while the
    // request is still healthy instead of presenting a misleading timeout at
    // the short network budget used by the hosted deterministic path.
    for (let attempt = 0; response.state === 'processing' && response.id && attempt < 60; attempt += 1) { await new Promise((resolve) => window.setTimeout(resolve, Math.min(1500, 500 + attempt * 100))); response = await fetchJson(`/api/check/${encodeURIComponent(response.id)}`, { method: 'GET' }, 2000, request.signal); }
    finishLoading();
    clarificationContext = undefined;
    if (response.state === 'processing') { renderUnavailable({ state: 'unavailable', id: response.id, claim: original, message: 'La comprobación está tardando más de lo esperado. Puedes intentarlo de nuevo.', retryable: true }); return; }
    if (response.state === 'clarification') renderClarification(response); else if (response.state === 'unavailable') renderUnavailable(response); else if (response.state === 'supported' || response.state === 'limited' || response.state === 'insufficient') { if (response.state === 'supported' && response.result.canonicalHref) { window.location.assign(response.result.canonicalHref); return; } renderResult(response); }
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
