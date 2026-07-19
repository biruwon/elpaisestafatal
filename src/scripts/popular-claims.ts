type PopularCluster = { text?: string; count?: number; status?: string };

const escapeHtml = (value: string): string => value
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

const container = document.querySelector<HTMLElement>('#dynamic-popular-claims');
const input = document.querySelector<HTMLInputElement>('#conversation-input');
const form = document.querySelector<HTMLFormElement>('#conversation-form');

if (container && input && form) {
  void fetch('/api/questions', { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(1800) })
    .then(async (response) => response.ok ? response.json() as Promise<{ status?: string; claims?: PopularCluster[] }> : null)
    .then((payload) => {
      const claims = payload?.status === 'ok' && Array.isArray(payload.claims)
        ? payload.claims.filter((item) => typeof item.text === 'string' && item.text.trim()).slice(0, 8)
        : [];
      if (!claims.length) return;
      container.hidden = false;
      container.innerHTML = `<span class="dynamic-popular-label">Lo más preguntado</span><div class="dynamic-popular-grid">${claims.map((item) => {
        const text = String(item.text).trim().slice(0, 240);
        const count = Number.isFinite(item.count) ? ` · ${Number(item.count).toLocaleString('es-ES')} consultas` : '';
        return `<button type="button" class="dynamic-popular-card" data-dynamic-example="${escapeHtml(text)}"><span>${escapeHtml(`Pregunta frecuente${count}`)}</span><strong>${escapeHtml(text)}</strong><em>Comprobar →</em></button>`;
      }).join('')}</div>`;
      container.querySelectorAll<HTMLButtonElement>('[data-dynamic-example]').forEach((button) => button.addEventListener('click', () => {
        input.value = button.dataset.dynamicExample || '';
        form.requestSubmit();
        document.querySelector('#comprobar')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }));
    })
    .catch(() => { /* The static popular claims remain the fallback. */ });
}
