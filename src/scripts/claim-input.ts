import { isStrongClaimMatch, normaliseClaimText, rankClaimIndex, type ClaimIndexEntry, type RankedClaimIndexEntry } from '../data/claimIndex';
import { classifyDeterministicCoverage } from '../lib/knowledge/coverage';

type SearchResponse = {
  status?: 'published' | 'related' | 'uncovered' | 'unavailable' | 'complete' | 'partial' | 'processing';
  requestId?: string;
  input?: { original?: string; canonical?: string };
  primary?: { kind: 'claim' | 'topic'; slug: string; title: string; href: string; confidence: number; reason: string };
  alternatives?: Array<{ kind: 'claim' | 'topic'; slug: string; title: string; href: string; confidence: number }>;
  guidance?: { questions?: string[]; limitation?: string };
  result?: { headline?: string; summary?: string; limitation?: string; clarificationQuestion?: string };
  relatedClaims?: Array<{ kind: 'claim' | 'topic'; slug: string; title: string; href: string; confidence: number }>;
};

type ConversationVisual = {
  slug: string;
  visuals?: {
    key?: { value: string; label: string; period: string };
    comparison?: { labels: string[]; values: number[]; label: string; unit: string };
  };
};

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
const input = document.querySelector<HTMLInputElement>('#conversation-input');
const result = document.querySelector<HTMLElement>('#conversation-result');
const catalogElement = document.querySelector<HTMLElement>('#claim-index-data');
const advancedEnabled = catalogElement?.dataset.advanced === 'true';
let activeRequest: AbortController | null = null;
let requestVersion = 0;
const responseCache = new Map<string, SearchResponse>();

const findEntry = (slug: string | undefined): ClaimIndexEntry | undefined => slug ? claimIndex.find((entry) => entry.slug === slug) : undefined;

const resultLink = (entry: ClaimIndexEntry): string => `<a class="claim-result-link" href="${escapeHtml(entry.href)}">Ver datos y fuentes <span aria-hidden="true">→</span></a>`;

const alternativeMarkup = (entries: ClaimIndexEntry[]): string => entries.length
  ? `<div class="claim-alternatives"><span class="clarification-label">También puede estar relacionado</span>${entries.slice(0, 2).map((entry) => `<a href="${escapeHtml(entry.href)}">${escapeHtml(entry.title)}</a>`).join('')}</div>`
  : '';

const visualMarkup = (entry?: ClaimIndexEntry): string => {
  if (!entry) return '';
  const visual = conversationVisuals.find((item) => item.slug === entry.slug)?.visuals;
  if (!visual?.key) return '';
  const comparison = visual.comparison;
  const max = comparison ? Math.max(...comparison.values, 1) : 1;
  return `<div class="claim-visual-summary"><div class="claim-key-number"><span class="clarification-label">Dato clave · ${escapeHtml(visual.key.period)}</span><strong>${escapeHtml(visual.key.value)}</strong><small>${escapeHtml(visual.key.label)}</small></div>${comparison ? `<div class="claim-comparison"><span class="clarification-label">${escapeHtml(comparison.label)}</span>${comparison.labels.slice(0, 3).map((label, index) => `<div><span>${escapeHtml(label)}</span><i><b style="width:${Math.max(6, Math.round((comparison.values[index] / max) * 100))}%"></b></i><em>${escapeHtml(String(comparison.values[index]))}</em></div>`).join('')}<small>${escapeHtml(comparison.unit)}</small></div>` : ''}</div>`;
};

const renderCard = (state: 'loading' | 'published' | 'related' | 'uncovered', original: string, primary?: ClaimIndexEntry, alternatives: ClaimIndexEntry[] = [], guidance?: SearchResponse['guidance'], reason = ''): void => {
  if (!result) return;
  const labels = {
    loading: 'Buscando una respuesta relacionada',
    published: 'Comprobación publicada',
    related: 'Tema relacionado',
    uncovered: 'Todavía no cubierta',
  };
  const title = primary?.title || guidance?.questions?.[0] || 'Estamos intentando entender la afirmación';
  const body = state === 'loading'
    ? `<p>Estamos comparando tu formulación con las afirmaciones y temas disponibles.</p>`
    : state === 'uncovered'
      ? `<p><strong>${escapeHtml(guidance?.limitation || 'No tenemos una comprobación publicada de esta afirmación.')}</strong></p>${guidance?.questions?.length ? `<div class="claim-guidance"><span class="clarification-label">Para comprobarla haría falta concretar</span><ul>${guidance.questions.slice(0, 2).map((question) => `<li>${escapeHtml(question)}</li>`).join('')}</ul></div>` : ''}`
      : `${visualMarkup(primary)}<p>${escapeHtml(primary?.answer || reason || 'Hemos encontrado una relación útil para seguir comprobando la afirmación.')}</p>${primary ? resultLink(primary) : ''}`;
  const assessment = state === 'published' && primary?.assessment ? `<span class="claim-assessment">${escapeHtml(primary.assessment)}</span>` : '';
  result.innerHTML = `<article class="claim-result-card" data-state="${state}" aria-busy="${state === 'loading'}"><div class="claim-result-top"><span class="eyebrow">${labels[state]}</span>${assessment}</div><p class="claim-result-input">Has escrito: “${escapeHtml(original)}”</p><h3>${escapeHtml(title)}</h3>${body}${alternativeMarkup(alternatives)}${state === 'loading' ? '<p class="classifier-status" aria-live="polite">La primera orientación ya está disponible; afinando la coincidencia…</p>' : ''}</article>`;
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
  renderCard('uncovered', original, undefined, alternatives, {
    questions: [
      '¿Qué hecho concreto afirma el texto y cuándo habría ocurrido?',
      '¿Qué fuente o publicación quieres que revisemos?',
    ],
    limitation: 'No tenemos una comprobación publicada de esta afirmación. Puedes concretarla para encontrar una orientación más útil.',
  });
};

const applyResponse = (response: SearchResponse, original: string, fallback: RankedClaimIndexEntry[]): void => {
  const structuredPrimary = response.relatedClaims?.[0];
  const primary = findEntry(response.primary?.slug || structuredPrimary?.slug);
  const alternatives = (response.alternatives || []).map((item) => findEntry(item.slug)).filter((entry): entry is ClaimIndexEntry => Boolean(entry));
  if (response.status === 'complete' && primary) {
    renderCard('published', original, primary, alternatives, undefined, response.result?.summary || response.primary?.reason);
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
    renderCard('uncovered', original, undefined, alternatives.length ? alternatives : fallback.slice(0, 2), response.guidance || {
      questions: response.result?.clarificationQuestion ? [response.result.clarificationQuestion] : [],
      limitation: response.result?.limitation,
    });
    return;
  }
  renderDeterministic(original, fallback);
};

const classify = async (query: string, ranked: RankedClaimIndexEntry[]): Promise<void> => {
  if (!result || !advancedEnabled) return;
  const version = ++requestVersion;
  const cacheKey = normaliseClaimText(query);
  const cached = responseCache.get(cacheKey) || (() => {
    try { return JSON.parse(sessionStorage.getItem(`claim-classification:${cacheKey}`) || 'null') as SearchResponse | null; } catch { return null; }
  })();
  if (cached) { applyResponse(cached, query, ranked); return; }
  activeRequest?.abort();
  activeRequest = new AbortController();
  try {
    const response = await fetch('/api/resolve', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: query, inputType: 'text' }), signal: activeRequest.signal });
    let data = await response.json() as SearchResponse;
    if (data.status === 'processing' && data.requestId) {
      const pendingRequestId = data.requestId;
      for (let attempt = 0; attempt < 20; attempt += 1) {
        await new Promise((resolve, reject) => {
          const timeout = window.setTimeout(resolve, 350);
          activeRequest?.signal.addEventListener('abort', () => { window.clearTimeout(timeout); reject(new DOMException('Aborted', 'AbortError')); }, { once: true });
        });
        const pending = await fetch(`/api/resolve/${encodeURIComponent(pendingRequestId)}`, { signal: activeRequest.signal });
        data = await pending.json() as SearchResponse;
        if (data.status !== 'processing') break;
      }
    }
    if (version !== requestVersion) return;
    responseCache.set(cacheKey, data);
    try { sessionStorage.setItem(`claim-classification:${cacheKey}`, JSON.stringify(data)); } catch { /* Optional storage. */ }
    applyResponse(data, query, ranked);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    if (version === requestVersion) renderDeterministic(query, ranked);
  }
};

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const query = input?.value.trim() || '';
  if (!query || !result) return;
  const ranked = rankClaimIndex(query, claimIndex);
  renderDeterministic(query, ranked);
  result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  if (ranked[0] && isStrongClaimMatch(ranked[0])) return;
  void classify(query, ranked);
});

document.querySelectorAll<HTMLButtonElement>('[data-example]').forEach((button) => button.addEventListener('click', () => {
  if (input) { input.value = button.dataset.example || ''; form?.requestSubmit(); }
}));
