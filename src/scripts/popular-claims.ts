type PopularCluster = { text?: string; count?: number; status?: string; linkedClaimSlug?: string };

const escapeHtml = (value: string): string => value
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

const container = document.querySelector<HTMLElement>('#dynamic-popular-claims');
const input = document.querySelector<HTMLInputElement>('#conversation-input');
const form = document.querySelector<HTMLFormElement>('#conversation-form');

const examplePrompts = [...document.querySelectorAll<HTMLButtonElement>('[data-example-topic]')];
const exampleMore = document.querySelector<HTMLButtonElement>('[data-example-more]');
let examplesExpanded = false;
let selectedExampleTopic = 'all';

const updateExampleVisibility = (): void => {
  const matches = examplePrompts.filter((prompt) => selectedExampleTopic === 'all' || prompt.dataset.exampleTopic === selectedExampleTopic);
  examplePrompts.forEach((prompt, index) => {
    const topicMatches = selectedExampleTopic === 'all' || prompt.dataset.exampleTopic === selectedExampleTopic;
    prompt.hidden = !topicMatches || (selectedExampleTopic === 'all' && !examplesExpanded && index >= 8);
  });
  const canExpand = selectedExampleTopic === 'all' && matches.length > 8;
  if (exampleMore) {
    exampleMore.hidden = !canExpand;
    exampleMore.setAttribute('aria-expanded', String(examplesExpanded));
    exampleMore.innerHTML = examplesExpanded ? 'Mostrar menos <span aria-hidden="true">−</span>' : 'Ver más afirmaciones <span aria-hidden="true">＋</span>';
  }
};

document.querySelectorAll<HTMLButtonElement>('[data-example-filter]').forEach((filter) => filter.addEventListener('click', () => {
  const selected = filter.dataset.exampleFilter || 'all';
  selectedExampleTopic = selected;
  examplesExpanded = false;
  document.querySelectorAll<HTMLButtonElement>('[data-example-filter]').forEach((button) => {
    const active = button === filter;
    button.classList.toggle('is-selected', active);
    button.setAttribute('aria-pressed', String(active));
  });
  updateExampleVisibility();
}));

exampleMore?.addEventListener('click', () => {
  examplesExpanded = !examplesExpanded;
  updateExampleVisibility();
});
updateExampleVisibility();

if (container && input && form) {
  void fetch('/api/questions', { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(1800) })
    .then(async (response) => response.ok ? response.json() as Promise<{ status?: string; claims?: PopularCluster[] }> : null)
    .then((payload) => {
      const claims = payload?.status === 'ok' && Array.isArray(payload.claims)
        ? payload.claims.filter((item) => typeof item.text === 'string' && item.text.trim()).slice(0, 8)
        : [];
      if (!claims.length) return;
      container.hidden = false;
      container.innerHTML = `<div class="dynamic-popular-heading"><span class="dynamic-popular-label">Lo más preguntado</span><small>Solo preguntas con una aclaración publicada y revisada</small></div><div class="dynamic-popular-grid">${claims.map((item) => {
        const text = String(item.text).trim().slice(0, 240);
        const count = Number.isFinite(item.count) ? ` · ${Number(item.count).toLocaleString('es-ES')} consultas` : '';
        const slug = typeof item.linkedClaimSlug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.linkedClaimSlug) ? item.linkedClaimSlug : '';
        const content = `<span>${escapeHtml(`Pregunta frecuente${count}`)}</span><strong>${escapeHtml(text)}</strong><em>${slug ? 'Ver ficha →' : 'Comprobar →'}</em>`;
        return slug ? `<a class="dynamic-popular-card" href="/afirmaciones/${escapeHtml(slug)}">${content}</a>` : `<button type="button" class="dynamic-popular-card" data-dynamic-example="${escapeHtml(text)}">${content}</button>`;
      }).join('')}</div>`;
      container.querySelectorAll<HTMLButtonElement>('[data-dynamic-example]').forEach((button) => button.addEventListener('click', () => {
        input.value = button.dataset.dynamicExample || '';
        form.requestSubmit();
        document.querySelector('#comprobar')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }));
    })
    .catch(() => { /* The static popular claims remain the fallback. */ });
}
