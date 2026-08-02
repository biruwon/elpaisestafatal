const searchInput = document.querySelector<HTMLInputElement>('#claim-catalog-search');
const clearButton = document.querySelector<HTMLButtonElement>('#claim-catalog-clear');
const statusElement = document.querySelector<HTMLElement>('#claim-catalog-status');
const emptyState = document.querySelector<HTMLElement>('#claim-catalog-empty');
const moreButton = document.querySelector<HTMLButtonElement>('#claim-catalog-more');
const cards = [...document.querySelectorAll<HTMLElement>('[data-claim-card]')];
const filters = [...document.querySelectorAll<HTMLButtonElement>('[data-topic-filter]')];
let activeTopic = 'all';
let expanded = false;
const initialLimit = 12;

const normalise = (value: string): string => value.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n');

const update = (): void => {
  const query = normalise(searchInput?.value || '').trim();
  let visible = 0;
  let matching = 0;
  const paginate = !expanded && !query && activeTopic === 'all';
  for (const card of cards) {
    const matchesText = !query || normalise(card.dataset.search || '').includes(query);
    const topics = (card.dataset.topics || '').split(' ');
    const matchesTopic = activeTopic === 'all' || topics.includes(activeTopic);
    const matches = matchesText && matchesTopic;
    if (matches) {
      matching += 1;
      const beyondInitialPage = paginate && matching > initialLimit;
      card.hidden = beyondInitialPage;
      if (!beyondInitialPage) visible += 1;
    } else card.hidden = true;
  }
  if (statusElement) statusElement.textContent = paginate && matching > initialLimit
    ? `${visible} de ${matching} fichas visibles · abre “Ver más” para continuar`
    : `${matching} ficha${matching === 1 ? '' : 's'} visible${matching === 1 ? '' : 's'}${query || activeTopic !== 'all' ? ' con este filtro' : ''}`;
  if (emptyState) emptyState.hidden = matching > 0;
  if (clearButton) clearButton.hidden = !query;
  if (moreButton) {
    const canExpand = !expanded && !query && activeTopic === 'all' && matching > initialLimit;
    moreButton.hidden = !canExpand;
    moreButton.setAttribute('aria-expanded', String(expanded));
  }
};

searchInput?.addEventListener('input', () => { expanded = false; update(); });
clearButton?.addEventListener('click', () => {
  if (!searchInput) return;
  searchInput.value = '';
  expanded = false;
  searchInput.focus();
  update();
});
filters.forEach((button) => button.addEventListener('click', () => {
  activeTopic = button.dataset.topicFilter || 'all';
  expanded = false;
  filters.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
  update();
}));
moreButton?.addEventListener('click', () => { expanded = true; update(); moreButton.blur(); });
update();
