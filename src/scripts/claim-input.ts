import { isStrongClaimMatch, normaliseClaimText, rankClaimIndex, type ClaimIndexEntry, type RankedClaimIndexEntry } from '../data/claimIndex';

type ConversationClaim = {
  slug: string;
  prompt: string;
  propositions: string[];
  concern: string;
  supports: string;
  limit: string;
  question: string;
  reply: string;
  visualLabel: string;
};

type ClassifierResponse = {
  status?: 'match' | 'draft' | 'unknown' | 'unavailable';
  claimSlug?: string;
  topicSlug?: string;
  confidence?: number;
  draft?: { title?: string; summary?: string; questions?: string[]; limitation?: string };
};

const readJson = <T>(id: string, fallback: T): T => {
  try {
    const element = document.querySelector(`#${id}`);
    return element ? JSON.parse(element.textContent || '') as T : fallback;
  } catch {
    return fallback;
  }
};

const escapeHtml = (value: string): string => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const conversationData = readJson<ConversationClaim[]>('conversation-mvp-data', []);
const claimIndex = readJson<ClaimIndexEntry[]>('claim-index-data', []);
const conversationSlugs = new Set(conversationData.map((claim) => claim.slug));
const form = document.querySelector<HTMLFormElement>('#conversation-form');
const input = document.querySelector<HTMLInputElement>('#conversation-input');
const result = document.querySelector<HTMLElement>('#conversation-result');
const mediaForm = document.querySelector<HTMLFormElement>('#local-media-form');
const mediaInput = document.querySelector<HTMLInputElement>('#local-media-input');
let activeRequest: AbortController | null = null;
const responseCache = new Map<string, ClassifierResponse>();

const claimHref = (slug: string): string => conversationSlugs.has(slug) ? `/aclarar/${slug}` : `/afirmaciones/${slug}`;

const suggestionMarkup = (entries: RankedClaimIndexEntry[]): string => entries.length
  ? `<div class="claim-suggestions"><span class="clarification-label">Lo más cercano que podemos comprobar</span>${entries.slice(0, 4).map((entry) => `<a class="claim-suggestion" href="${escapeHtml(entry.href)}"><span>${entry.kind === 'topic' ? 'Tema' : 'Afirmación'}</span><strong>${escapeHtml(entry.title)}</strong></a>`).join('')}</div>`
  : '<p class="quiet-note">Todavía no tenemos una página cercana para esta formulación.</p>';

const renderDraft = (response: ClassifierResponse): void => {
  if (!result || !response.draft) return;
  const questions = response.draft.questions?.filter(Boolean).slice(0, 3) ?? [];
  result.innerHTML = `<article class="conversation-empty draft-result"><span class="eyebrow">Borrador automático · todavía no es una verificación publicada</span><strong>${escapeHtml(response.draft.title || 'Una forma más concreta de plantearlo')}</strong><p>${escapeHtml(response.draft.summary || 'Esta formulación necesita una pregunta más concreta antes de poder contrastarse.')}</p>${questions.length ? `<div class="draft-questions"><span class="clarification-label">Preguntas que ayudan a comprobarlo</span><ul>${questions.map((question) => `<li>${escapeHtml(question)}</li>`).join('')}</ul></div>` : ''}<p class="draft-limit"><strong>Límite:</strong> ${escapeHtml(response.draft.limitation || 'Este borrador no sustituye una investigación con fuentes.')}</p></article>`;
};

const renderImmediate = (ranked: RankedClaimIndexEntry[]): void => {
  if (!result) return;
  result.innerHTML = `<div class="conversation-empty"><span class="eyebrow">No hay una coincidencia exacta</span><strong>No tenemos una comprobación publicada de esa frase tal como está formulada.</strong><p>Podemos acercarnos desde el tema o la afirmación más parecida, y comprobar si existe una respuesta útil.</p>${suggestionMarkup(ranked)}<p id="classifier-status" class="classifier-status" aria-live="polite">Buscando una respuesta relacionada…</p></div>`;
};

const applyClassifierResponse = (response: ClassifierResponse): void => {
  if (response.status === 'match') {
    const claim = response.claimSlug && claimIndex.find((entry) => entry.kind === 'claim' && entry.slug === response.claimSlug);
    const topic = response.topicSlug && claimIndex.find((entry) => entry.kind === 'topic' && entry.slug === response.topicSlug);
    if (claim) {
      window.location.href = claimHref(claim.slug);
      return;
    }
    if (topic) {
      window.location.href = topic.href;
      return;
    }
  }
  if (response.status === 'draft') {
    renderDraft(response);
    return;
  }
  const status = document.querySelector<HTMLElement>('#classifier-status');
  if (status) status.textContent = response.status === 'unavailable'
    ? 'No hemos podido completar el análisis. Las sugerencias disponibles siguen siendo válidas.'
    : 'No hemos encontrado una respuesta publicada para esa formulación. Las sugerencias anteriores son el punto de partida más cercano.';
};

const classify = async (payload: FormData, cacheKey: string): Promise<void> => {
  if (!result) return;
  const cached = responseCache.get(cacheKey) || (() => {
    try { return JSON.parse(sessionStorage.getItem(`claim-classification:${cacheKey}`) || 'null') as ClassifierResponse | null; } catch { return null; }
  })();
  if (cached) { applyClassifierResponse(cached); return; }

  activeRequest?.abort();
  activeRequest = new AbortController();
  try {
    const response = await fetch('/api/classify', { method: 'POST', body: payload, signal: activeRequest.signal });
    const data = await response.json() as ClassifierResponse;
    responseCache.set(cacheKey, data);
    try { sessionStorage.setItem(`claim-classification:${cacheKey}`, JSON.stringify(data)); } catch { /* Storage is optional. */ }
    applyClassifierResponse(data);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    const status = document.querySelector<HTMLElement>('#classifier-status');
    if (status) status.textContent = 'No hemos podido completar el análisis. Las sugerencias disponibles siguen siendo válidas.';
  }
};

const classifyText = (query: string, ranked: RankedClaimIndexEntry[]): void => {
  const payload = new FormData();
  payload.set('text', query);
  payload.set('inputType', 'text');
  payload.set('candidates', JSON.stringify(ranked.length ? ranked : claimIndex.slice(0, 20)));
  void classify(payload, normaliseClaimText(query));
};

const classifyFile = (file: File): void => {
  if (!result) return;
  result.innerHTML = '<div class="conversation-empty"><span class="eyebrow">Archivo recibido</span><strong>Procesando el archivo…</strong><p>Estamos extrayendo la afirmación principal para buscar una respuesta relacionada.</p><p id="classifier-status" class="classifier-status" aria-live="polite">Esto puede tardar unos segundos.</p></div>';
  const payload = new FormData();
  payload.set('file', file);
  payload.set('inputType', file.type.startsWith('image/') ? 'image' : 'audio');
  payload.set('candidates', JSON.stringify(claimIndex.slice(0, 20)));
  void classify(payload, `${file.name}:${file.size}:${file.lastModified}`);
};

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const query = input?.value.trim() || '';
  if (!query || !result) return;
  const ranked = rankClaimIndex(query, claimIndex);
  const topClaim = ranked.find((entry) => entry.kind === 'claim');
  if (isStrongClaimMatch(topClaim)) {
    window.location.href = claimHref(topClaim!.slug);
    return;
  }
  renderImmediate(ranked);
  result.scrollIntoView({ behavior: 'smooth', block: 'start' });
  classifyText(query, ranked);
});

mediaForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const file = mediaInput?.files?.[0];
  if (file) classifyFile(file);
});

document.querySelectorAll<HTMLButtonElement>('[data-example]').forEach((button) => button.addEventListener('click', () => {
  if (input) { input.value = button.dataset.example || ''; form?.requestSubmit(); }
}));

document.addEventListener('click', async (event) => {
  const target = event.target as HTMLElement;
  const button = target.closest<HTMLButtonElement>('[data-copy]');
  if (!button) return;
  try { await navigator.clipboard.writeText(button.dataset.copy || ''); button.textContent = 'Respuesta copiada'; }
  catch { button.textContent = 'Selecciona el texto para copiarlo'; }
});
