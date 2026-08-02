import { isStrongClaimMatch, rankClaimIndex, type ClaimIndexEntry, type RankedClaimIndexEntry } from '../data/claimIndex';

const form = document.querySelector<HTMLFormElement>('.site-search');
const input = document.querySelector<HTMLInputElement>('#site-query');
const output = document.querySelector<HTMLElement>('#search-output');
const dataNode = document.querySelector<HTMLElement>('#search-page-data');

const entries = JSON.parse(dataNode?.textContent || '[]') as ClaimIndexEntry[];

const escapeHtml = (value: string): string => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const checkHref = (value: string): string => `/?q=${encodeURIComponent(value.trim())}#comprobar`;

const resultLabel = (entry: RankedClaimIndexEntry): string => {
  if (entry.kind === 'topic') return 'Tema relacionado';
  return isStrongClaimMatch(entry) ? 'Ficha publicada' : 'Afirmación relacionada';
};

const resultAction = (entry: RankedClaimIndexEntry): string => {
  if (entry.kind === 'topic') return 'Explorar tema →';
  return isStrongClaimMatch(entry) ? 'Abrir ficha →' : 'Ver contexto →';
};

const renderEmpty = (query: string): void => {
  if (!output) return;
  const href = checkHref(query);
  output.innerHTML = `<div class="search-empty"><p class="quiet-note">No encontramos una ficha suficientemente cercana para esta formulación.</p><a class="search-continue" href="${escapeHtml(href)}">Comprobar esta frase en el comprobador <span aria-hidden="true">→</span></a><small>La comprobación empieza con una orientación rápida y puede señalar una formulación relacionada o qué evidencia falta.</small></div>`;
};

const renderResults = (query: string, ranked: RankedClaimIndexEntry[]): void => {
  if (!output) return;
  const checkLink = `<div class="search-check-bar"><p>¿Quieres comprobar exactamente lo que has escrito?</p><a class="search-check-link" href="${escapeHtml(checkHref(query))}">Comprobar esta frase <span aria-hidden="true">→</span></a></div>`;
  const cards = ranked.map((entry) => `<a data-search-result href="${escapeHtml(entry.href)}"><span>${resultLabel(entry)}</span><strong>${escapeHtml(entry.title)}</strong><small>${escapeHtml(entry.answer || 'Contexto publicado sobre esta afirmación o tema.')}</small><em class="search-result-action">${resultAction(entry)}</em></a>`).join('');
  output.innerHTML = `${checkLink}${cards}`;
};

const render = (): void => {
  if (!output || !input) return;
  const rawQuery = input.value.trim();
  if (!rawQuery) {
    output.innerHTML = '<p class="quiet-note">Escribe para ver resultados.</p>';
    return;
  }
  const ranked = rankClaimIndex(rawQuery, entries, 6);
  if (!ranked.length) {
    renderEmpty(rawQuery);
    return;
  }
  renderResults(rawQuery, ranked);
};

const initialQuery = new URLSearchParams(window.location.search).get('q') || '';
if (input && initialQuery) {
  input.value = initialQuery;
  render();
}

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  render();
});

input?.addEventListener('input', render);
