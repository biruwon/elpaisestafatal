const searchInput = document.querySelector<HTMLInputElement>('#claim-catalog-search');
const clearButton = document.querySelector<HTMLButtonElement>('#claim-catalog-clear');
const statusElement = document.querySelector<HTMLElement>('#claim-catalog-status');
const emptyState = document.querySelector<HTMLElement>('#claim-catalog-empty');
const cards = [...document.querySelectorAll<HTMLElement>('[data-claim-card]')];
const filters = [...document.querySelectorAll<HTMLButtonElement>('[data-topic-filter]')];
let activeTopic = 'all';

const normalise = (value: string): string => value.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n');

const update = (): void => {
  const query = normalise(searchInput?.value || '').trim();
  let visible = 0;
  for (const card of cards) {
    const matchesText = !query || normalise(card.dataset.search || '').includes(query);
    const topics = (card.dataset.topics || '').split(' ');
    const matchesTopic = activeTopic === 'all' || topics.includes(activeTopic);
    const matches = matchesText && matchesTopic;
    card.hidden = !matches;
    if (matches) visible += 1;
  }
  if (statusElement) statusElement.textContent = `${visible} ficha${visible === 1 ? '' : 's'} visible${visible === 1 ? '' : 's'}${query || activeTopic !== 'all' ? ' con este filtro' : ''}`;
  if (emptyState) emptyState.hidden = visible > 0;
  if (clearButton) clearButton.hidden = !query;
};

searchInput?.addEventListener('input', update);
clearButton?.addEventListener('click', () => {
  if (!searchInput) return;
  searchInput.value = '';
  searchInput.focus();
  update();
});
filters.forEach((button) => button.addEventListener('click', () => {
  activeTopic = button.dataset.topicFilter || 'all';
  filters.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
  update();
}));
update();
