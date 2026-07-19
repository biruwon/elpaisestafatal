import { isStrongClaimMatch, normaliseClaimText, rankClaimIndex, type ClaimIndexEntry, type RankedClaimIndexEntry } from '../data/claimIndex';
import { classifyDeterministicCoverage } from '../lib/knowledge/coverage';
import type { AnswerPlan } from '../lib/knowledge/contracts';

type SearchResponse = {
  status?: 'published' | 'related' | 'uncovered' | 'unavailable' | 'complete' | 'partial' | 'processing';
  requestId?: string;
  input?: { original?: string; canonical?: string };
  primary?: { kind: 'claim' | 'topic'; slug: string; title: string; href: string; confidence: number; reason: string };
  alternatives?: Array<{ kind: 'claim' | 'topic'; slug: string; title: string; href: string; confidence: number }>;
  guidance?: { questions?: string[]; limitation?: string };
  result?: AnswerPlan;
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
const fileInput = document.querySelector<HTMLInputElement>('#conversation-file');
const result = document.querySelector<HTMLElement>('#conversation-result');
const catalogElement = document.querySelector<HTMLElement>('#claim-index-data');
const advancedEnabled = catalogElement?.dataset.advanced === 'true';
let activeRequest: AbortController | null = null;
let requestVersion = 0;
const responseCache = new Map<string, SearchResponse>();

const recordUncoveredQuestion = (text: string, response: SearchResponse): void => {
  if (response.status !== 'uncovered' && response.status !== 'partial') return;
  void fetch('/api/questions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, inputType: 'text', status: response.status, requestId: response.requestId }),
    keepalive: true,
  }).catch(() => { /* Operational learning is optional and never blocks the answer. */ });
};

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

const structuredBlocksMarkup = (plan: AnswerPlan): string => plan.blocks.map((block) => {
  if (block.type === 'key_number') {
    return `<div class="claim-plan-number"><span class="clarification-label">${escapeHtml(block.label)}</span><strong>${escapeHtml(block.value)}</strong>${block.caveat ? `<small>${escapeHtml(block.caveat)}</small>` : ''}</div>`;
  }
  if (block.type === 'claim_breakdown') {
    return `<div class="claim-plan-breakdown"><span class="clarification-label">Qué estamos comprobando</span><p>${escapeHtml(block.propositionIds.join(' · '))}</p></div>`;
  }
  if (block.type === 'confirmed') {
    return `<div class="claim-plan-confirmed"><span class="clarification-label">Lo que sí está respaldado</span><p>${escapeHtml(`${block.propositionIds.length} parte${block.propositionIds.length === 1 ? '' : 's'} de la afirmación`)}</p></div>`;
  }
  if (block.type === 'cannot_conclude') {
    return `<div class="claim-plan-limit"><span class="clarification-label">Lo que no se puede concluir todavía</span><ul>${block.points.slice(0, 4).map((point) => `<li>${escapeHtml(point)}</li>`).join('')}</ul></div>`;
  }
  if (block.type === 'money_flow') {
    return `<div class="claim-plan-flow"><span class="clarification-label">Flujo de fondos</span><div><strong>Origen</strong><span>↓ transferencia</span><strong>Destino</strong></div><small>${escapeHtml(block.evidenceIds.join(' · '))}</small></div>`;
  }
  if (block.type === 'line_chart' || block.type === 'bar_chart' || block.type === 'comparison_chart') {
    return `<div class="claim-plan-chart"><span class="clarification-label">Visualización</span><strong>${escapeHtml(block.visualId)}</strong><small>La visualización se construye a partir de los datos vinculados a esta evidencia.</small></div>`;
  }
  if (block.type === 'conversation_reply') {
    return `<div class="claim-plan-reply"><span class="clarification-label">Una forma de explicarlo</span><p>${escapeHtml(block.text)}</p><button type="button" data-copy-answer="${escapeHtml(block.text)}">Copiar respuesta</button></div>`;
  }
  if (block.type === 'sources') {
    return `<div class="claim-plan-sources"><span class="clarification-label">Fuentes vinculadas</span><p>${escapeHtml(block.sourceIds.join(' · '))}</p></div>`;
  }
  return '';
}).join('');

const renderStructuredPlan = (original: string, plan: AnswerPlan, primary?: ClaimIndexEntry, alternatives: ClaimIndexEntry[] = []): void => {
  if (!result) return;
  result.innerHTML = `<article class="claim-result-card" data-state="published"><div class="claim-result-top"><span class="eyebrow">Aclaración estructurada</span><span class="claim-assessment">${escapeHtml(plan.coverage)}</span></div><p class="claim-result-input">Has escrito: “${escapeHtml(original)}”</p><h3>${escapeHtml(plan.headline)}</h3><p>${escapeHtml(plan.summary)}</p><div class="claim-plan-blocks">${structuredBlocksMarkup(plan)}</div>${plan.clarificationQuestion ? `<div class="claim-plan-question"><span class="clarification-label">Pregunta útil</span><p>${escapeHtml(plan.clarificationQuestion)}</p></div>` : ''}${plan.limitation ? `<p class="claim-plan-limitation"><strong>Límite:</strong> ${escapeHtml(plan.limitation)}</p>` : ''}${primary ? resultLink(primary) : ''}${alternativeMarkup(alternatives)}</article>`;
  result.querySelectorAll<HTMLButtonElement>('[data-copy-answer]').forEach((button) => button.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(button.dataset.copyAnswer || ''); button.textContent = 'Copiada'; } catch { button.textContent = 'No se ha podido copiar'; }
  }));
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
  if (response.status === 'complete' && response.result && primary) {
    renderStructuredPlan(original, response.result, primary, alternatives);
    return;
  }
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
    const inputType = file?.type.startsWith('audio/') ? 'audio' : file ? 'image' : 'text';
    const requestBody = file ? (() => { const body = new FormData(); body.set('text', query); body.set('inputType', inputType); body.set('file', file); return body; })() : JSON.stringify({ text: query, inputType });
    const response = await fetch('/api/resolve', { method: 'POST', headers: file ? undefined : { 'content-type': 'application/json' }, body: requestBody, signal: activeRequest.signal });
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
    if (!file && cacheKey) {
      responseCache.set(cacheKey, data);
      try { sessionStorage.setItem(`claim-classification:${cacheKey}`, JSON.stringify(data)); } catch { /* Optional storage. */ }
      recordUncoveredQuestion(query, data);
    }
    applyResponse(data, query, ranked);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    if (version === requestVersion) renderDeterministic(query, ranked);
  }
};

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const query = input?.value.trim() || '';
  const file = fileInput?.files?.[0];
  if ((!query && !file) || !result) return;
  const ranked = query ? rankClaimIndex(query, claimIndex) : [];
  if (query) renderDeterministic(query, ranked);
  else renderCard('loading', file?.name || 'Archivo enviado');
  result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  if (ranked[0] && isStrongClaimMatch(ranked[0]) && !file) return;
  void classify(query, ranked, file);
});

document.querySelectorAll<HTMLButtonElement>('[data-example]').forEach((button) => button.addEventListener('click', () => {
  if (input) { input.value = button.dataset.example || ''; form?.requestSubmit(); }
}));
