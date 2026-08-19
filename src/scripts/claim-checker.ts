import { INPUT_LIMITS, validateInputMetadata } from '../lib/knowledge/input-contract.mjs';

type CheckResponse = {
  id: string;
  status: 'complete' | 'processing' | 'unavailable';
  claim: string;
  answer: string;
  basis: 'sourced' | 'model';
  explanation: string;
  limitations: string[];
  reply: string;
  sources: Array<{ title: string; publisher?: string; url: string }>;
  visual?: { title?: string; unit?: string; labels: string[]; values: number[] };
  catalogueEntry?: { href: string };
};

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
const recentChecksStorageKey = 'elpaisestafatal:recent-checks:v1';
let request: AbortController | undefined;
const suggestions = document.querySelector<HTMLDetailsElement>('#checker-suggestions');
const checker = document.querySelector<HTMLElement>('.hero-checker');
const homepage = document.querySelector<HTMLElement>('.homepage');

const escapeHtml = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
const fetchJson = async (url: string, init: RequestInit, timeout = 9000): Promise<CheckResponse> => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    return await response.json() as CheckResponse;
  } finally { window.clearTimeout(timer); }
};

const readRecent = (): string[] => {
  try { const value = JSON.parse(localStorage.getItem(recentChecksStorageKey) || '[]'); return Array.isArray(value) ? value.filter((item): item is { text: string } => typeof item?.text === 'string').map((item) => item.text).slice(0, 6) : []; } catch { return []; }
};
const writeRecent = (text: string): void => {
  if (!text.trim()) return;
  try { localStorage.setItem(recentChecksStorageKey, JSON.stringify([text, ...readRecent().filter((item) => item !== text)].slice(0, 6).map((item) => ({ text: item })))); } catch { /* optional */ }
};
const recordQuestion = (text: string, details: Record<string, string | undefined>): void => {
  if (!text.trim()) return;
  void fetch('/api/questions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, canonical: text, inputType: details.inputType || 'text', status: details.status || 'received', resultState: details.resultState, researchOutcome: details.researchOutcome }) }).catch(() => {});
};
const renderRecent = (): void => {
  const values = readRecent();
  if (!recent || !recentList) return;
  recent.hidden = values.length === 0;
  recentList.innerHTML = values.map((value) => `<button type="button" class="recent-check-query" data-recent-query="${escapeHtml(value)}">${escapeHtml(value)}</button>`).join('');
};

const normalized = (value: string): string => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
const copyText = async (value: string): Promise<void> => {
  if (!navigator.clipboard) throw new Error('clipboard-unavailable');
  await navigator.clipboard.writeText(value);
};
const announceResult = (): void => {
  if (!result) return;
  window.setTimeout(() => {
    result.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    result.focus({ preventScroll: true });
  }, 0);
};

const render = (response: CheckResponse): void => {
  if (!result) return;
  const provenance = response.basis === 'sourced' ? 'Fuentes verificadas' : 'Respuesta generada por IA · sin fuentes verificadas';
  const visual = response.visual && response.visual.labels.length === response.visual.values.length
    ? `<details class="claim-result-details claim-result-visual"><summary>${escapeHtml(response.visual.title || 'Datos decisivos')}${response.visual.unit ? ` · ${escapeHtml(response.visual.unit)}` : ''}</summary><div>${response.visual.labels.map((label, index) => `<span><b>${escapeHtml(label)}</b><strong>${escapeHtml(String(response.visual?.values[index]))}${response.visual?.unit ? ` ${escapeHtml(response.visual.unit)}` : ''}</strong></span>`).join('')}</div><details><summary>Ver tabla de datos</summary><table><thead><tr><th>Grupo o periodo</th><th>Valor</th></tr></thead><tbody>${response.visual.labels.map((label, index) => `<tr><th scope="row">${escapeHtml(label)}</th><td>${escapeHtml(String(response.visual?.values[index]))}${response.visual?.unit ? ` ${escapeHtml(response.visual.unit)}` : ''}</td></tr>`).join('')}</tbody></table></details></details>` : '';
  const sources = response.sources.length ? `<details class="claim-result-sources"><summary>Fuentes · ${response.sources.length}</summary>${response.sources.map((source) => `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.title)}${source.publisher ? ` · ${escapeHtml(source.publisher)}` : ''} ↗</a>`).join('')}</details>` : '';
  const catalogue = response.catalogueEntry?.href ? `<a class="claim-result-link" href="${escapeHtml(response.catalogueEntry.href)}">Abrir ficha completa →</a>` : '';
  const explanation = normalized(response.explanation) !== normalized(response.answer) ? `<p class="claim-result-summary">${escapeHtml(response.explanation)}</p>` : '';
  const limitations = response.limitations.length ? `<details class="claim-result-details"><summary>Matices y límites</summary><p>${escapeHtml(response.limitations.join(' '))}</p></details>` : '';
  result.innerHTML = `<article class="claim-result-card unified-result-card" data-basis="${response.basis}"><span class="eyebrow">${provenance}</span><h2>${escapeHtml(response.answer)}</h2>${explanation}${limitations}${visual}<div class="claim-result-actions"><button type="button" class="claim-action-primary" data-share-result>Compartir</button><button type="button" data-copy-answer>Copiar respuesta</button><button type="button" data-new-check>Comprobar otra frase</button><span aria-live="polite"></span></div>${catalogue}${sources}</article>`;
  result.querySelector<HTMLButtonElement>('[data-copy-answer]')?.addEventListener('click', async () => {
    try { await copyText(response.reply || response.answer); result.querySelector('[aria-live]')!.textContent = 'Respuesta copiada'; }
    catch { result.querySelector('[aria-live]')!.textContent = 'No se ha podido copiar la respuesta'; }
  });
  result.querySelector<HTMLButtonElement>('[data-share-result]')?.addEventListener('click', async () => {
    try {
      if (navigator.share) await navigator.share({ title: response.claim, text: response.reply || response.answer, url: location.href });
      else { await copyText(location.href); result.querySelector('[aria-live]')!.textContent = 'Enlace copiado'; }
    } catch { result.querySelector('[aria-live]')!.textContent = 'Compartir cancelado'; }
  });
  result.querySelector<HTMLButtonElement>('[data-new-check]')?.addEventListener('click', () => {
    checker?.classList.remove('has-result');
    homepage?.classList.remove('has-result');
    suggestions?.setAttribute('open', '');
    result.innerHTML = '';
    input?.focus({ preventScroll: true });
    input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  checker?.classList.add('has-result');
  homepage?.classList.add('has-result');
  suggestions?.removeAttribute('open');
  announceResult();
};

const setLoading = (text: string): void => { if (result) result.innerHTML = `<article class="claim-result-card" aria-busy="true"><span class="eyebrow">Comprobando</span><p>${escapeHtml(text)}</p></article>`; };
const submit = async (event: SubmitEvent): Promise<void> => {
  event.preventDefault();
  const text = input?.value.trim() || '';
  const file = fileInput?.files?.[0];
  if (!text && !file) return;
  const inputType = file ? (file.type.startsWith('audio/') ? 'audio' : 'image') : /^https:\/\//i.test(text) ? 'url' : 'text';
  if (file) {
    const valid = validateInputMetadata({ text, inputType, hasFile: true, fileSize: file.size, mimeType: file.type });
    if (!valid.ok) { render({ id: `invalid-${Date.now()}`, status: 'unavailable', claim: file.name, answer: 'No podemos leer este archivo.', basis: 'model', explanation: valid.code, limitations: [], reply: 'Pega la frase directamente para comprobarla.', sources: [] }); return; }
  }
  request?.abort(); request = new AbortController();
  window.history.replaceState({}, '', text ? `/?q=${encodeURIComponent(text)}#comprobar` : '/#comprobar');
  if (text) writeRecent(text);
  if (text) recordQuestion(text, { inputType, status: 'received' });
  renderRecent(); setLoading(file?.name || text);
  const body = file ? (() => { const value = new FormData(); value.set('text', text); value.set('inputType', inputType); value.set('file', file); return value; })() : JSON.stringify({ text, inputType });
  try {
    let response = await fetchJson('/api/check', { method: 'POST', headers: file ? undefined : { 'content-type': 'application/json' }, body, signal: request.signal }, file ? 15000 : 9000);
    for (let attempt = 0; response.status === 'processing' && response.id && attempt < 30; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 500));
      response = await fetchJson(`/api/check/${encodeURIComponent(response.id)}`, { signal: request!.signal }, 2000);
    }
    if (text) recordQuestion(text, { inputType, status: response.status, resultState: response.basis === 'sourced' ? 'answered' : 'provisional', researchOutcome: response.basis === 'sourced' ? 'reviewed' : response.status === 'unavailable' ? 'unavailable' : 'warehouse' });
    render(response);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    render({ id: `error-${Date.now()}`, status: 'unavailable', claim: text, answer: 'No podemos completar la comprobación ahora.', basis: 'model', explanation: 'El equipo local no está disponible o tardó demasiado.', limitations: ['Puedes intentarlo de nuevo más tarde.'], reply: 'No puedo comprobarlo ahora con suficiente seguridad.', sources: [] });
  }
};

form?.addEventListener('submit', submit);
input?.addEventListener('input', () => { if (counter) counter.textContent = `${input.value.length}/${INPUT_LIMITS.maxTextCharacters}`; });
fileInput?.addEventListener('change', () => { const file = fileInput.files?.[0]; if (fileName) fileName.textContent = file?.name || 'Sin archivo seleccionado.'; if (mediaHelp) mediaHelp.dataset.fileSelected = file ? 'true' : 'false'; if (file) form?.requestSubmit(); });
dropzone?.addEventListener('dragover', (event) => { event.preventDefault(); dropzone.classList.add('is-dragging'); });
dropzone?.addEventListener('drop', (event) => { event.preventDefault(); dropzone.classList.remove('is-dragging'); const file = event.dataTransfer?.files?.[0]; if (!fileInput || !file) return; const transfer = new DataTransfer(); transfer.items.add(file); fileInput.files = transfer.files; fileInput.dispatchEvent(new Event('change', { bubbles: true })); });
checker?.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const queryButton = target.closest<HTMLButtonElement>('[data-example], [data-recent-query]');
  if (queryButton && input) { input.value = queryButton.dataset.example || queryButton.dataset.recentQuery || ''; form?.requestSubmit(); return; }
  if (target.closest<HTMLButtonElement>('[data-clear-recent]')) {
    try { localStorage.removeItem(recentChecksStorageKey); } catch { /* optional */ }
    renderRecent();
  }
});
document.querySelectorAll<HTMLElement>('[data-media-trigger]').forEach((button) => button.addEventListener('click', () => { if (fileInput) fileInput.accept = button.dataset.mediaTrigger === 'audio' ? 'audio/*' : 'image/*'; }));
renderRecent();
if (counter && input) counter.textContent = `${input.value.length}/${INPUT_LIMITS.maxTextCharacters}`;
const initial = new URLSearchParams(window.location.search).get('q')?.trim();
if (initial && input) { input.value = initial.slice(0, INPUT_LIMITS.maxTextCharacters); window.setTimeout(() => form?.requestSubmit(), 0); }
