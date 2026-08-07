import { isStrongClaimMatch, normaliseClaimText, rankClaimIndex, type ClaimIndexEntry, type RankedClaimIndexEntry } from '../data/claimIndex';
import { classifyDeterministicCoverage } from '../lib/knowledge/coverage';
import type { AnswerPlan } from '../lib/knowledge/contracts';
import { INPUT_LIMITS, validateInputMetadata } from '../lib/knowledge/input-contract.mjs';
import { semanticQuerySignature } from '../lib/knowledge/querySignature';

type SearchResponse = {
  status?: 'published' | 'related' | 'draft' | 'uncovered' | 'unavailable' | 'complete' | 'partial' | 'processing';
  requestId?: string;
  canonicalSignature?: string;
  input?: { original?: string; canonical?: string };
  primary?: { kind: 'claim' | 'topic'; slug: string; title: string; href: string; confidence: number; reason: string };
  alternatives?: Array<{ kind: 'claim' | 'topic'; slug: string; title: string; href: string; confidence: number }>;
  guidance?: { heading?: string; questions?: string[]; questionsLabel?: string; limitation?: string; suggestions?: Array<{ title: string; href?: string; prompt?: string }>; suggestionsLabel?: string };
  result?: AnswerPlan;
  relatedClaims?: Array<{ kind: 'claim' | 'topic'; slug: string; title: string; href: string; confidence: number }>;
};

type CompactResultModel = {
  status: 'uncovered' | 'related' | 'unavailable' | 'loading' | 'invalid';
  claim: string;
  summary: string;
  refinementQuestion?: string;
  refinementChoices?: string[];
  secondaryAction?: string;
};

let chartSequence = 0;

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
const form = document.querySelector<HTMLFormElement>('#conversation-form');
const input = document.querySelector<HTMLTextAreaElement>('#conversation-input');
const fileInput = document.querySelector<HTMLInputElement>('#conversation-file');
const mediaDropZone = document.querySelector<HTMLElement>('[data-media-dropzone]');
const fileName = document.querySelector<HTMLElement>('[data-file-name]');
const mediaHelp = document.querySelector<HTMLElement>('#conversation-media-help');
const counter = document.querySelector<HTMLElement>('#conversation-counter');
const result = document.querySelector<HTMLElement>('#conversation-result');
const recentChecks = document.querySelector<HTMLElement>('#recent-checks');
const recentChecksList = document.querySelector<HTMLElement>('[data-recent-list]');
const mediaTriggers = document.querySelectorAll<HTMLElement>('[data-media-trigger]');
const defaultMediaAccept = 'image/*,audio/*';
const catalogElement = document.querySelector<HTMLElement>('#claim-index-data');
const advancedEnabled = catalogElement?.dataset.advanced === 'true';
const recentChecksStorageKey = 'elpaisestafatal:recent-checks:v1';
const recentChecksLimit = 6;
let activeRequest: AbortController | null = null;
let requestVersion = 0;
const responseCache = new Map<string, SearchResponse>();

const updateCounter = (): void => {
  if (counter) counter.textContent = `${input?.value.length || 0}/${INPUT_LIMITS.maxTextCharacters}`;
};

type RecentCheck = { text: string; checkedAt: number };

const readRecentChecks = (): RecentCheck[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(recentChecksStorageKey) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is RecentCheck => typeof item?.text === 'string' && item.text.trim().length > 0)
      .map((item) => ({ text: item.text.slice(0, INPUT_LIMITS.maxTextCharacters), checkedAt: Number(item.checkedAt) || Date.now() }))
      .slice(0, recentChecksLimit);
  } catch { return []; }
};

const writeRecentChecks = (items: RecentCheck[]): void => {
  try { localStorage.setItem(recentChecksStorageKey, JSON.stringify(items.slice(0, recentChecksLimit))); } catch { /* Local history is optional. */ }
};

const renderRecentChecks = (): void => {
  if (!recentChecks || !recentChecksList) return;
  const items = readRecentChecks();
  recentChecks.hidden = items.length === 0;
  recentChecksList.innerHTML = items.map((item, index) => `<div class="recent-check"><button type="button" class="recent-check-query" data-recent-query="${escapeHtml(item.text)}">${escapeHtml(item.text)}</button><button type="button" class="recent-check-remove" data-remove-recent="${index}" aria-label="Eliminar esta comprobación">×</button></div>`).join('');
};

const rememberRecentCheck = (text: string): void => {
  const trimmed = text.trim().slice(0, INPUT_LIMITS.maxTextCharacters);
  if (!trimmed) return;
  const normalized = normaliseClaimText(trimmed);
  const items = readRecentChecks().filter((item) => normaliseClaimText(item.text) !== normalized);
  items.unshift({ text: trimmed, checkedAt: Date.now() });
  writeRecentChecks(items);
  renderRecentChecks();
};

const resetMediaSelection = (): void => {
  if (fileInput) {
    fileInput.value = '';
    fileInput.accept = defaultMediaAccept;
  }
  if (fileName) fileName.textContent = 'Sin archivo seleccionado.';
  if (mediaDropZone) mediaDropZone.classList.remove('is-dragging');
  if (mediaHelp) mediaHelp.dataset.fileSelected = 'false';
};

const assignMediaFile = (file: File): void => {
  if (!fileInput) return;
  try {
    const transfer = new DataTransfer();
    transfer.items.add(file);
    fileInput.files = transfer.files;
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
  } catch {
    // Browsers without a writable FileList still retain the normal picker path.
  }
};

const coverageLabels: Record<string, string> = {
  strong: 'Evidencia directa',
  qualified: 'Contexto relacionado',
  partial: 'Cobertura parcial',
  insufficient: 'Evidencia insuficiente',
};

const assessmentLabels: Record<string, string> = {
  true: 'Verdadero',
  'mostly-true': 'Mayormente cierto',
  misleading: 'Generalización engañosa',
  unsupported: 'Sin respaldo suficiente',
  uncertain: 'Incierto',
  false: 'Falso',
};

const coverageLabel = (value?: string): string => coverageLabels[value || ''] || 'Aclaración provisional';

const topicFollowUpPrompts: Record<string, string[]> = {
  politica: [
    '¿Está creciendo la economía española?',
    '¿Cómo ha evolucionado el empleo en España?',
    '¿Cómo ha cambiado el gasto público sobre el PIB?',
    '¿Qué porcentaje del PIB representa la deuda pública?',
  ],
  economia: [
    '¿Está creciendo la economía española?',
    '¿Cómo ha cambiado la inflación anual en España?',
    '¿Cómo ha evolucionado la renta mediana de los hogares?',
    '¿Cómo ha cambiado la desigualdad de ingresos en España?',
  ],
  vivienda: [
    '¿Cómo han cambiado los alquileres en España?',
    '¿Han subido los precios de la vivienda en España?',
    '¿Qué porcentaje de hogares sufre sobrecarga de vivienda?',
    '¿Ha empeorado el acceso a la vivienda en España?',
  ],
  empleo: [
    '¿Cómo ha evolucionado el desempleo en España?',
    '¿Tiene España una tasa de empleo mayor que la Unión Europea?',
    '¿Cómo ha cambiado el salario mínimo en España?',
    '¿Qué porcentaje de jóvenes activos no encuentra trabajo?',
  ],
  inmigracion: [
    '¿Cuántos residentes nacieron fuera de España?',
    '¿Cuántos residentes tienen ciudadanía extranjera en España?',
    '¿Cuántas personas inmigraron a España durante el último año?',
    '¿La inmigración aumenta la inseguridad?',
  ],
  seguridad: [
    '¿Cómo han evolucionado los homicidios registrados en España?',
    '¿Cómo han evolucionado las estafas registradas en España?',
    '¿Cómo han evolucionado los robos registrados en España?',
    '¿La inmigración aumenta la inseguridad?',
  ],
  sanidad: [
    '¿Cuánto gasta España en sanidad por habitante?',
    '¿Ha aumentado la falta de atención médica por listas de espera?',
    '¿Cómo ha evolucionado la esperanza de vida en España?',
    '¿España gasta más por habitante en sanidad que la Unión Europea?',
  ],
  impuestos: [
    '¿España cobra más impuestos sobre renta y riqueza que la Unión Europea?',
    '¿España recauda más o menos que la Unión Europea?',
    '¿Cuánto debe España en euros?',
    '¿Qué porcentaje del PIB representa la deuda pública de España?',
  ],
  desigualdad: [
    '¿Cómo ha evolucionado la desigualdad de ingresos en España?',
    '¿Qué porcentaje de personas está en riesgo de pobreza o exclusión?',
    '¿Cómo ha evolucionado la renta mediana de los hogares?',
    '¿Qué porcentaje de hogares sufre sobrecarga de vivienda?',
  ],
  juventud: [
    '¿Qué porcentaje de jóvenes activos no encuentra trabajo?',
    '¿Tiene España más paro juvenil que la Unión Europea?',
    '¿Tiene España más abandono escolar temprano que la Unión Europea?',
    '¿España tiene más ninis que la Unión Europea?',
    '¿Qué porcentaje de jóvenes ni estudia ni trabaja en España?',
    '¿Cómo ha evolucionado el abandono escolar temprano en España?',
    '¿Cómo ha evolucionado el envejecimiento de la población española?',
  ],
};

const generalFallbackPrompts = [
  '¿Cómo ha cambiado el coste de la vivienda en España?',
  '¿Está creciendo el empleo en España?',
  '¿La inmigración aumenta la inseguridad?',
  '¿España cobra más impuestos sobre renta y riqueza que la Unión Europea?',
];

const broadComplaintSignals = [
  'esta destruida',
  'destruyendo espana',
  'destruye espana',
  'va cuesta abajo',
  'va a la ruina',
  'se va a la ruina',
  'es un desastre',
  'todo va mal',
  'todo va fatal',
  'esta fatal',
  'no se puede vivir',
  'pais hundido',
  'pais arruinado',
  'va peor',
  'gobernando la izquierda',
  'gobierno de izquierdas',
];

const broadComplaintTopics: Record<string, { label: string; prompts: string[] }> = {
  economia: {
    label: 'Precios y economía',
    prompts: ['¿Cómo ha cambiado la inflación anual en España?', '¿Cómo ha evolucionado la renta mediana de los hogares?'],
  },
  vivienda: {
    label: 'Vivienda',
    prompts: ['¿Cómo han cambiado los alquileres en España?', '¿Ha empeorado el acceso a la vivienda?'],
  },
  empleo: {
    label: 'Empleo',
    prompts: ['¿Cómo ha evolucionado el desempleo en España?', '¿El récord de empleo ha resuelto el paro?'],
  },
  seguridad: {
    label: 'Seguridad',
    prompts: ['¿Cómo ha evolucionado la delincuencia registrada en España?', '¿España se está volviendo más peligrosa?'],
  },
  sanidad: {
    label: 'Sanidad',
    prompts: ['¿Ha aumentado la falta de atención médica por listas de espera?', '¿La sanidad pública está colapsada?'],
  },
  inmigracion: {
    label: 'Inmigración',
    prompts: ['¿La inmigración aumenta la inseguridad?', '¿Los inmigrantes reciben prioridad en las ayudas?'],
  },
  politica: {
    label: 'Política e instituciones',
    prompts: ['¿Está creciendo la economía española?', '¿Cómo ha cambiado el gasto público sobre el PIB?'],
  },
};

const broadComplaintTopicOrder = ['vivienda', 'empleo', 'economia', 'inmigracion', 'seguridad', 'sanidad'];

const topicForBroadComplaint = (query: string): string | undefined => {
  const topicSignals: Array<[string, string[]]> = [
    ['politica', ['sanchez', 'gobierno', 'psoe', 'pp', 'vox', 'politica', 'presidente']],
    ['inmigracion', ['inmigrante', 'inmigracion', 'extranjero', 'migrante']],
    ['vivienda', ['vivienda', 'alquiler', 'piso', 'casa', 'hipoteca']],
    ['empleo', ['empleo', 'paro', 'trabajo', 'salario', 'sueldo']],
    ['seguridad', ['seguridad', 'delito', 'crimen', 'insegura', 'peligrosa']],
    ['sanidad', ['sanidad', 'hospital', 'medico', 'salud']],
    ['economia', ['economia', 'precios', 'inflacion', 'renta', 'impuestos']],
  ];
  return topicSignals.find(([, signals]) => signals.some((signal) => query.includes(signal)))?.[0];
};

const broadComplaintGuidance = (original: string, primary?: ClaimIndexEntry): SearchResponse['guidance'] | undefined => {
  const query = normaliseClaimText(original);
  if (!broadComplaintSignals.some((signal) => query.includes(signal))) return undefined;
  const explicitTopic = topicForBroadComplaint(query);
  const topicOrder = explicitTopic && broadComplaintTopics[explicitTopic]
    ? [explicitTopic, ...broadComplaintTopicOrder.filter((topic) => topic !== explicitTopic)]
    : broadComplaintTopicOrder;
  const suggestions = topicOrder.flatMap((topic) => {
    const definition = broadComplaintTopics[topic];
    if (!definition) return [];
    return definition.prompts.slice(0, explicitTopic === topic ? 2 : 1).map((prompt) => ({ title: prompt, prompt }));
  }).slice(0, 6);
  const contextSuggestion = primary?.kind === 'topic' && primary.href
    ? [{ title: `Ver contexto: ${primary.title}`, href: primary.href }]
    : [];
  return {
    heading: 'Esta frase resume varias discusiones',
    limitation: 'Esta valoración es amplia; no es una afirmación única que pueda comprobarse tal cual.',
    questions: ['Elige qué parte quieres medir: precios, vivienda, empleo, seguridad, sanidad o política.'],
    questionsLabel: 'Para convertirla en una comprobación',
    suggestions: [...contextSuggestion, ...suggestions],
    suggestionsLabel: explicitTopic ? `Empieza por ${broadComplaintTopics[explicitTopic]?.label.toLocaleLowerCase('es') || 'un tema'}` : 'Elige una discusión concreta',
  };
};

const propositionTypeLabels: Record<string, string> = {
  descriptive: 'Hecho',
  comparative: 'Comparación',
  definition: 'Definición',
  trend: 'Evolución',
  causal: 'Causa',
  predictive: 'Predicción',
  legal: 'Regla',
  normative: 'Prioridad',
  mixed: 'Afirmación',
};

type LearningRecord = {
  status?: string;
  inputType?: 'text' | 'image' | 'audio' | 'url';
  requestId?: string;
  canonical?: string;
  semanticSignature?: string;
};

const recordQuestion = (text: string, record: LearningRecord = {}): void => {
  if (!text.trim()) return;
  const neutral = (record.canonical || text).replace(/https?:\/\/\S+|www\.\S+/gi, ' url ').replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, ' contacto ').replace(/\b\d[\d\s().+-]{7,}\b/g, ' telefono ').replace(/\b(invasion|invadir)\b/gi, 'entrada fronteriza').replace(/\b(violando|violacion|violar)\b/gi, 'agresion sexual').slice(0, 600);
  void fetch('/api/questions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      canonical: neutral,
      semanticSignature: record.semanticSignature || semanticQuerySignature(neutral),
      inputType: record.inputType || 'text',
      status: record.status || 'received',
      requestId: record.requestId,
    }),
    keepalive: true,
  }).catch(() => { /* Operational learning is optional and never blocks the answer. */ });
};

const findEntry = (slug: string | undefined): ClaimIndexEntry | undefined => slug ? claimIndex.find((entry) => entry.slug === slug) : undefined;

const resultLink = (entry: ClaimIndexEntry): string => `<a class="claim-result-link" href="${escapeHtml(entry.href)}">${entry.kind === 'topic' ? 'Ver contexto del tema' : 'Ver datos y fuentes'} <span aria-hidden="true">→</span></a>`;

const navigateToPublishedClaim = (entry?: ClaimIndexEntry): boolean => {
  if (!entry || entry.kind !== 'claim') return false;
  window.location.assign(entry.href);
  return true;
};

const defaultRefinementChoices = ['Política', 'Vivienda', 'Empleo', 'Seguridad', 'Economía', 'Sanidad'];

const compactResultMarkup = (model: CompactResultModel): string => {
  const labels = {
    uncovered: ['Sin coincidencia directa', 'No hay una comprobación publicada para esta afirmación'],
    related: ['Necesita concretarse', 'Encontramos contexto relacionado, pero no una comprobación exacta'],
    unavailable: ['No podemos completar la comprobación', 'La orientación inicial está disponible; puedes intentarlo de nuevo más tarde'],
    loading: ['Estamos comprobando la frase', 'La respuesta aparecerá aquí en unos segundos'],
    invalid: ['No podemos leer este archivo', 'Prueba con otro archivo o pega la frase directamente'],
  }[model.status];
  const choices = model.refinementChoices?.length ? `<div class="compact-result-choices"><span class="clarification-label">¿Qué parte quieres comprobar?</span><div>${model.refinementChoices.map((choice) => `<button type="button" data-refinement-topic="${escapeHtml(choice)}">${escapeHtml(choice)}</button>`).join('')}</div></div>` : '';
  const action = model.secondaryAction ? `<button type="button" data-new-check>${escapeHtml(model.secondaryAction)}</button>` : '';
  return `<article class="claim-result-card compact-result-card" data-state="${model.status}" aria-labelledby="claim-result-title"><div class="claim-result-top"><div><span class="eyebrow">${labels[0]}</span><span class="claim-result-state">${labels[1]}</span></div></div>${submittedClaimMarkup(model.claim)}<h3 id="claim-result-title">${escapeHtml(model.summary)}</h3>${model.refinementQuestion ? `<div class="compact-result-question"><span class="clarification-label">Una pregunta útil</span><p>${escapeHtml(model.refinementQuestion)}</p></div>` : ''}${choices}<div class="claim-result-actions claim-result-actions-primary">${action}</div></article>`;
};

const renderCompactResult = (model: CompactResultModel): void => {
  if (!result) return;
  result.innerHTML = compactResultMarkup(model);
  result.querySelectorAll<HTMLButtonElement>('[data-refinement-topic]').forEach((button) => button.addEventListener('click', () => {
    if (!input || !form) return;
    const topic = button.dataset.refinementTopic || '';
    const topicAliases: Record<string, string> = { política: 'politica', economía: 'economia', vivienda: 'vivienda', empleo: 'empleo', seguridad: 'seguridad', sanidad: 'sanidad' };
    const topicKey = topicAliases[topic.toLocaleLowerCase('es')] || Object.entries(broadComplaintTopics).find(([, definition]) => definition.label.toLocaleLowerCase('es') === topic.toLocaleLowerCase('es'))?.[0];
    const replacement = topicKey ? broadComplaintTopics[topicKey]?.prompts[0] : undefined;
    input.value = replacement || topic;
    updateCounter();
    form.requestSubmit();
  }));
  result.querySelector<HTMLButtonElement>('[data-new-check]')?.addEventListener('click', resetChecker);
};

const submittedClaimMarkup = (original: string, inputKind: 'text' | 'media' = 'text'): string => {
  if (!original) return '';
  const label = inputKind === 'media' ? 'Archivo recibido' : 'Frase recibida';
  const text = `“${escapeHtml(original)}”`;
  if (original.length <= 220) return `<p class="claim-result-input"><span class="clarification-label">${label}</span>${text}</p>`;
  return `<details class="claim-result-submission"><summary>${label} · Ver texto completo</summary><p class="claim-result-input">${text}</p></details>`;
};

const shareUrlFor = (original: string, primary?: ClaimIndexEntry, state: 'published' | 'related' | 'draft' | 'uncovered' = 'published'): string => {
  if (state === 'published' && primary?.kind === 'claim') return new URL(primary.href, window.location.origin).toString();
  const url = new URL('/', window.location.origin);
  url.searchParams.set('q', original);
  url.hash = 'comprobar';
  return url.toString();
};

const alternativeMarkup = (entries: ClaimIndexEntry[]): string => entries.length
  ? `<div class="claim-alternatives"><span class="clarification-label">También puede estar relacionado</span>${entries.slice(0, 2).map((entry) => `<a href="${escapeHtml(entry.href)}">${escapeHtml(entry.title)}</a>`).join('')}</div>`
  : '';

const quickResultOverviewMarkup = (
  state: 'loading' | 'published' | 'related' | 'uncovered' | 'unavailable' | 'invalid',
  primary?: ClaimIndexEntry,
  guidance?: SearchResponse['guidance'],
): string => {
  if (state === 'loading' || state === 'invalid') return '';
  const found = primary?.answer
    || (state === 'published' ? 'Hemos encontrado una ficha publicada que coincide con la frase.' : state === 'related' ? 'Hemos encontrado contexto cercano, pero no una coincidencia exacta.' : 'Todavía no hay una ficha publicada que responda directamente a esta frase.');
  const limitation = primary?.cannotProve
    || guidance?.limitation
    || (state === 'unavailable' ? 'El análisis adicional no está disponible ahora; esta orientación no debe interpretarse como una comprobación exacta.' : 'La frase necesita un hecho, fecha, lugar o programa concreto para poder comprobarse.');
  const next = guidance?.questions?.[0]
    || (primary?.kind === 'topic' ? 'Elige una pregunta concreta dentro de este tema.' : state === 'published' ? 'Abre la ficha para revisar el dato y sus fuentes.' : '¿Qué hecho concreto, fecha o lugar quieres comprobar?');
  return `<div class="claim-result-overview claim-result-overview-quick" aria-label="Resumen rápido de la orientación"><div><span>Lo que encontramos</span><strong>${escapeHtml(found)}</strong></div><div><span>Lo que no demuestra</span><strong>${escapeHtml(limitation)}</strong></div><div><span>Siguiente paso</span><strong>${escapeHtml(next)}</strong></div></div>`;
};

const broadTopicSuggestions = (original: string): { items: Array<{ title: string; href: string }>; label: string } => {
  const query = normaliseClaimText(original);
  if (query.length < 12) return { items: [], label: '' };
  const topics = claimIndex.filter((entry) => entry.kind === 'topic');
  const matchedTopics = topics
    .filter((entry) => [...entry.aliases, ...entry.keywords].some((alias) => {
      const normalizedAlias = normaliseClaimText(alias);
      return normalizedAlias.length > 3 && (query.includes(normalizedAlias) || normalizedAlias.includes(query));
    }))
    .slice(0, 4)
    .map((entry) => ({ title: entry.title, href: entry.href }));
  if (matchedTopics.length) return { items: matchedTopics, label: 'Puedes concretarla por un tema' };

  // Keep an uncovered result honest. Popular checks are already discoverable
  // in the homepage examples; attaching one here to a misspelled or unrelated
  // input makes the result look like a recommendation and was the source of
  // misleading “closest” answers for genuinely unknown text.
  return { items: [], label: '' };
};

const contextualFollowUps = (original: string, primary?: ClaimIndexEntry): { items: Array<{ title: string; prompt: string }>; label: string } => {
  const query = normaliseClaimText(original);
  if (query.length < 12) return { items: [], label: '' };
  const topics = claimIndex.filter((entry) => entry.kind === 'topic');
  const matchedTopic = primary?.kind === 'topic'
    ? primary.slug
    : topics.find((entry) => [...entry.aliases, ...entry.keywords].some((alias) => {
      const normalizedAlias = normaliseClaimText(alias);
      return normalizedAlias.length > 3 && (query.includes(normalizedAlias) || normalizedAlias.includes(query));
    }))?.slug;
  const prompts = matchedTopic ? topicFollowUpPrompts[matchedTopic] || [] : [];
  return { items: prompts.slice(0, 4).map((prompt) => ({ title: prompt, prompt })), label: 'Para concretar esta discusión' };
};

const generalFollowUps = (): { items: Array<{ title: string; prompt: string }>; label: string } => ({
  items: generalFallbackPrompts.map((prompt) => ({ title: prompt, prompt })),
  label: 'Si no sabes por dónde empezar',
});

const fallbackPublishedClaims = (): ClaimIndexEntry[] => claimIndex
  .filter((entry) => entry.kind === 'claim')
  .slice(0, 2);

const visualMarkup = (entry?: ClaimIndexEntry): string => {
  if (!entry) return '';
  const visual = entry.visual;
  if (!visual?.key) return '';
  const comparison = visual.comparison;
  const signedComparison = Boolean(comparison?.values.some((value) => value < 0));
  const max = comparison ? Math.max(...comparison.values.map((value) => Math.abs(value)), 1) : 1;
  const comparisonRows = comparison?.labels.slice(0, 3).map((label, index) => {
    const value = Number(comparison.values[index] || 0);
    const width = signedComparison ? Math.max(5, Math.round((Math.abs(value) / max) * 50)) : Math.max(6, Math.round((value / max) * 100));
    const left = signedComparison ? (value < 0 ? 50 - width : 50) : 0;
    return `<div><span>${escapeHtml(label)}</span><i${signedComparison ? ' class="is-signed"' : ''}><b style="width:${width}%;${signedComparison ? `left:${left}%;` : ''}"></b></i><em>${escapeHtml(String(comparison.values[index]))}</em></div>`;
  }).join('');
  return `<div class="claim-visual-summary"><div class="claim-key-number"><span class="clarification-label">Dato clave · ${escapeHtml(visual.key.period)}</span><strong>${escapeHtml(visual.key.value)}</strong><small>${escapeHtml(visual.key.label)}</small></div>${comparison ? `<div class="claim-comparison${signedComparison ? ' is-signed' : ''}"><span class="clarification-label">${escapeHtml(comparison.label)}</span>${comparisonRows}<small>${escapeHtml(comparison.unit)}</small></div>` : ''}</div>`;
};

const formatChartValue = (value: number): string => Number(value).toLocaleString('es-ES', { maximumFractionDigits: 2 });

const chartDataMarkup = (entries: Array<{ label: string; value: number }>, unit: string): string => `<details class="claim-chart-data"><summary>Ver valores</summary><table><thead><tr><th>Periodo o grupo</th><th>Valor</th></tr></thead><tbody>${entries.map((entry) => `<tr><th scope="row">${escapeHtml(entry.label)}</th><td>${escapeHtml(formatChartValue(entry.value))} ${escapeHtml(unit)}</td></tr>`).join('')}</tbody></table></details>`;

const chartSeriesForBlock = (plan: AnswerPlan, block: Extract<AnswerPlan['blocks'][number], { type: 'line_chart' | 'bar_chart' | 'comparison_chart' }>): { labels: string[]; values: number[]; label: string; unit: string } | undefined => {
  const visual = claimIndex.find((item) => item.slug === block.visualId)?.visual;
  return block.visualId === 'warehouse-observation'
    ? plan.warehouseSeries
    : block.type === 'line_chart' ? undefined : visual?.comparison;
};

const planVisualMarkup = (plan: AnswerPlan, block: Extract<AnswerPlan['blocks'][number], { type: 'line_chart' | 'bar_chart' | 'comparison_chart' }>): string => {
  const series = chartSeriesForBlock(plan, block);
  if (!series || !series.values.length) return '';
  const entries = series.labels.slice(0, 8).map((label: string, index: number) => ({ label: String(label), value: Number(series.values[index]) })).filter((entry) => Number.isFinite(entry.value));
  if (!entries.length) return '';
  const width = 640;
  const height = 230;
  const left = 54;
  const right = 18;
  const top = 18;
  const bottom = 48;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const values = entries.map((entry) => entry.value);
  const rawMin = block.type === 'line_chart' ? Math.min(...values) : Math.min(0, ...values);
  const rawMax = Math.max(...values, 0);
  const padding = rawMax === rawMin ? Math.max(Math.abs(rawMax) * 0.12, 1) : (rawMax - rawMin) * 0.08;
  const domainMin = rawMin - padding;
  const domainMax = rawMax + padding;
  const yAt = (value: number): number => top + ((domainMax - value) / (domainMax - domainMin)) * plotHeight;
  const xAt = (index: number): number => entries.length === 1 ? left + plotWidth / 2 : left + (index / (entries.length - 1)) * plotWidth;
  const chartId = `claim-chart-${chartSequence += 1}`;
  const title = `${series.label}: ${entries[0].label} a ${entries.at(-1)?.label || entries[0].label}`;
  const tickMarkup = [0, 0.5, 1].map((fraction) => {
    const value = domainMax - (domainMax - domainMin) * fraction;
    const y = top + plotHeight * fraction;
    return `<line class="claim-chart-grid" x1="${left}" y1="${y.toFixed(2)}" x2="${width - right}" y2="${y.toFixed(2)}"></line><text class="claim-chart-axis-label" x="${left - 8}" y="${(y + 4).toFixed(2)}" text-anchor="end">${escapeHtml(formatChartValue(value))}</text>`;
  }).join('');
  const xLabels = entries.map((entry, index) => {
    if (entries.length > 4 && index !== 0 && index !== entries.length - 1 && index % 2 !== 0) return '';
    const label = entry.label.length > 15 ? `${entry.label.slice(0, 14)}…` : entry.label;
    return `<text class="claim-chart-axis-label" x="${xAt(index).toFixed(2)}" y="${height - 17}" text-anchor="middle">${escapeHtml(label)}</text>`;
  }).join('');
  const lineMarkup = entries.length > 1
    ? `<polyline class="claim-chart-series" points="${entries.map((entry, index) => `${xAt(index).toFixed(2)},${yAt(entry.value).toFixed(2)}`).join(' ')}"></polyline>${entries.map((entry, index) => `<circle class="claim-chart-point" cx="${xAt(index).toFixed(2)}" cy="${yAt(entry.value).toFixed(2)}" r="4"><title>${escapeHtml(`${entry.label}: ${formatChartValue(entry.value)} ${series.unit}`)}</title></circle>`).join('')}`
    : `<circle class="claim-chart-point" cx="${xAt(0).toFixed(2)}" cy="${yAt(entries[0].value).toFixed(2)}" r="5"><title>${escapeHtml(`${entries[0].label}: ${formatChartValue(entries[0].value)} ${series.unit}`)}</title></circle>`;
  const baseline = yAt(0);
  const barsMarkup = entries.map((entry, index) => {
    const x = left + ((index + 0.5) / entries.length) * plotWidth;
    const barWidth = Math.min(70, (plotWidth / entries.length) * 0.62);
    const y = yAt(entry.value);
    const rectY = Math.min(y, baseline);
    const rectHeight = Math.max(1, Math.abs(y - baseline));
    return `<rect class="claim-chart-bar" x="${(x - barWidth / 2).toFixed(2)}" y="${rectY.toFixed(2)}" width="${barWidth.toFixed(2)}" height="${rectHeight.toFixed(2)}"><title>${escapeHtml(`${entry.label}: ${formatChartValue(entry.value)} ${series.unit}`)}</title></rect>`;
  }).join('');
  const plotMarkup = block.type === 'line_chart' ? lineMarkup : `${barsMarkup}<line class="claim-chart-baseline" x1="${left}" y1="${baseline.toFixed(2)}" x2="${width - right}" y2="${baseline.toFixed(2)}"></line>`;
  return `<div class="claim-plan-chart ${block.type === 'line_chart' ? 'claim-plan-chart-line' : 'claim-plan-chart-bars'}"><span class="clarification-label">${escapeHtml(series.label)}</span><svg class="claim-plan-chart-svg" role="img" aria-labelledby="${chartId}-title ${chartId}-description" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><title id="${chartId}-title">${escapeHtml(title)}</title><desc id="${chartId}-description">${escapeHtml(`Valores de ${series.label} expresados en ${series.unit}.`)}</desc>${tickMarkup}${plotMarkup}${xLabels}</svg>${chartDataMarkup(entries, series.unit)}<small>${escapeHtml(series.unit)}</small></div>`;
};

type VisualStoryStep = { label: string; title: string; content: string; evidenceIds?: string[] };

const visualStoryChart = (plan: AnswerPlan, block: Extract<AnswerPlan['blocks'][number], { type: 'line_chart' | 'bar_chart' | 'comparison_chart' }>): string => {
  const series = chartSeriesForBlock(plan, block);
  if (!series?.values.length) return '';
  const values = series.values.slice(0, 8).map(Number).filter(Number.isFinite);
  if (!values.length) return '';
  const max = Math.max(...values.map(Math.abs), 1);
  const bars = values.map((value) => `<i style="--story-bar:${Math.max(8, Math.round(Math.abs(value) / max * 100))}%" title="${escapeHtml(formatChartValue(value))} ${escapeHtml(series.unit)}"><b></b></i>`).join('');
  const label = `${series.label}: ${values.map((value) => `${formatChartValue(value)} ${series.unit}`).join(', ')}`;
  return `<div class="claim-story-mini-chart" role="img" aria-label="${escapeHtml(label)}">${bars}</div><small class="claim-story-unit">${escapeHtml(series.unit)}</small>`;
};

const visualStoryMarkup = (plan: AnswerPlan): string => {
  const steps: VisualStoryStep[] = [];
  for (const block of plan.blocks) {
    if (steps.length >= 3) break;
    if (block.type === 'key_number') {
      steps.push({ label: 'Dato clave', title: block.value, content: block.label, evidenceIds: [block.evidenceId] });
    } else if (block.type === 'line_chart' || block.type === 'bar_chart' || block.type === 'comparison_chart') {
      const chart = visualStoryChart(plan, block);
      if (chart) steps.push({ label: block.type === 'comparison_chart' ? 'Comparación' : 'Evolución', title: chart, content: chartSeriesForBlock(plan, block)?.label || 'Serie de datos', evidenceIds: block.evidenceIds });
    } else if (block.type === 'money_flow') {
      steps.push({ label: 'Movimiento documentado', title: `${block.origin || 'Origen'} → ${block.destination || 'Destino'}`, content: block.amount || block.purpose || 'Transferencia localizada', evidenceIds: block.evidenceIds });
    } else if (block.type === 'confirmed' && block.points?.[0]) {
      steps.push({ label: 'Sí está respaldado', title: '✓', content: block.points[0], evidenceIds: block.evidenceIds });
    } else if (block.type === 'cannot_conclude' && block.points[0]) {
      steps.push({ label: 'Límite importante', title: '×', content: block.points[0], evidenceIds: block.evidenceIds });
    } else if (block.type === 'data_finding' && block.points[0]) {
      steps.push({ label: 'Dato localizado', title: '→', content: block.points[0], evidenceIds: block.evidenceIds });
    }
  }
  if (steps.length < 2) return '';
  return `<section class="claim-visual-story" aria-labelledby="claim-visual-story-title"><div class="claim-visual-story-heading"><div><span class="clarification-label">Lectura visual</span><h4 id="claim-visual-story-title">La idea en ${steps.length} pasos</h4></div><div class="claim-visual-story-tools"><small>Datos y límites de la misma respuesta</small><button type="button" data-play-story aria-label="Reproducir la historia visual" aria-pressed="false">Reproducir</button></div></div><ol>${steps.map((step, index) => `<li><span class="claim-visual-story-number">0${index + 1}</span><div><span class="claim-visual-story-label">${escapeHtml(step.label)}</span><strong>${step.title.startsWith('<') ? step.title : escapeHtml(step.title)}</strong><p>${escapeHtml(step.content)}</p>${step.evidenceIds?.length ? blockEvidenceMarkup(plan, step.evidenceIds) : ''}</div></li>`).join('')}</ol></section>`;
};

const blockEvidenceMarkup = (plan: AnswerPlan, evidenceIds?: string[]): string => {
  if (!evidenceIds?.length) return '';
  const sourceLinks = plan.sourceLinks?.slice(0, 2) || [];
  const sourceLabel = sourceLinks.length
    ? `Fuente: ${sourceLinks[0].title}${sourceLinks.length > 1 ? ` +${sourceLinks.length - 1}` : ''}`
    : `Conecta con ${evidenceIds.length} registro${evidenceIds.length > 1 ? 's' : ''} de evidencia`;
  const sourceAction = sourceLinks.length
    ? '<button type="button" data-focus-result="sources">Ver fuente</button>'
    : '';
  return `<div class="claim-plan-block-evidence"><span>${escapeHtml(sourceLabel)}</span>${sourceAction}</div>`;
};

const renderStructuredBlock = (plan: AnswerPlan, block: AnswerPlan['blocks'][number]): string => {
  if (block.type === 'scorecard') {
    const labels: Record<string, string> = { improved: 'Mejora', worsened: 'Empeora', roughly_unchanged: 'Sin cambio apreciable', unavailable: 'Sin dato compatible' };
    return `<section class="claim-plan-scorecard claim-plan-card"><span class="clarification-label">Cuadro de indicadores · sin nota global</span><p>Base: ${escapeHtml(block.baseline.period)} · comparación: ${escapeHtml(block.comparison.period)}</p><div class="claim-scorecard-grid">${block.items.map((item) => `<article data-direction="${item.direction}"><strong>${escapeHtml(item.label)}</strong><span>${labels[item.direction]}</span>${item.baseline ? `<small>Base: ${escapeHtml(item.baseline.value)} (${escapeHtml(item.baseline.period)})</small>` : ''}${item.comparison ? `<small>Último: ${escapeHtml(item.comparison.value)} (${escapeHtml(item.comparison.period)})</small>` : ''}${item.change ? `<small class="claim-scorecard-change">Cambio: ${escapeHtml(item.change)}</small>` : ''}${item.caveat ? `<em>${escapeHtml(item.caveat)}</em>` : ''}${blockEvidenceMarkup(plan, item.evidenceIds)}</article>`).join('')}</div></section>`;
  }
  if (block.type === 'event_status') {
    const labels: Record<string, string> = { officially_reported: 'Reportado oficialmente', corroborated_report: 'Corroborado por fuentes independientes', single_report: 'Una sola fuente', unconfirmed: 'Sin confirmación encontrada', disputed: 'Fuentes en conflicto', context_only: 'Solo contexto' };
    return `<section class="claim-plan-event claim-plan-card"><span class="clarification-label">Estado de cada proposición</span><p>${escapeHtml(block.event.label)}${block.event.period ? ` · ${escapeHtml(block.event.period)}` : ''}</p><ul>${block.propositions.map((item) => `<li data-status="${item.status}"><strong>${escapeHtml(labels[item.status])}</strong><span>${escapeHtml(item.text)}</span>${item.detail ? `<small>${escapeHtml(item.detail)}</small>` : ''}${blockEvidenceMarkup(plan, item.evidenceIds)}</li>`).join('')}</ul></section>`;
  }
  if (block.type === 'key_number') {
    return `<div class="claim-plan-number claim-plan-card"><span class="clarification-label">${escapeHtml(block.label)}</span><strong>${escapeHtml(block.value)}</strong>${block.caveat ? `<small>${escapeHtml(block.caveat)}</small>` : ''}${blockEvidenceMarkup(plan, [block.evidenceId])}</div>`;
  }
  if (block.type === 'claim_breakdown') {
    const items = block.items?.length
      ? `<ul>${block.items.map((item) => `<li data-explicit="${item.explicit}" data-proposition-type="${escapeHtml(item.type)}"><strong>${item.explicit ? (propositionTypeLabels[item.type] || 'Afirmación') : 'Implicación'}</strong><span>${escapeHtml(item.text)}</span></li>`).join('')}</ul>`
      : `<p>${escapeHtml(block.propositionIds.join(' · '))}</p>`;
    return `<div class="claim-plan-breakdown"><span class="clarification-label">Qué estamos comprobando</span>${items}</div>`;
  }
  if (block.type === 'confirmed') {
    const linked = block.evidenceIds?.length || block.propositionIds.length;
    return `<div class="claim-plan-confirmed claim-plan-card"><span class="clarification-label">Lo que sí está respaldado</span>${block.points?.length ? `<ul>${block.points.slice(0, 3).map((point) => `<li>${escapeHtml(point)}</li>`).join('')}</ul>` : `<p>${escapeHtml(`${linked} registro${linked === 1 ? '' : 's'} de evidencia vinculado${linked === 1 ? '' : 's'}`)}</p>`}${blockEvidenceMarkup(plan, block.evidenceIds)}</div>`;
  }
  if (block.type === 'strongest_valid_concern') {
    return `<div class="claim-plan-concern"><span class="clarification-label">La preocupación válida</span><p>${escapeHtml(block.text)}</p></div>`;
  }
  if (block.type === 'evidence_ladder') {
    const ladderLabel = block.steps[0]?.label === 'Resultado concreto'
      ? 'Cómo concretarla para poder comprobarla'
      : block.steps[0]?.label === 'Cambio observado'
        ? 'Qué haría falta para demostrar la causa'
        : 'Qué haría falta para comprobarla';
    return `<div class="claim-plan-method claim-plan-ladder"><span class="clarification-label">${ladderLabel}</span><ol>${block.steps.map((step) => `<li data-status="${escapeHtml(step.status)}"><span>${escapeHtml(step.label)}</span><p>${escapeHtml(step.detail)}</p></li>`).join('')}</ol>${blockEvidenceMarkup(plan, block.evidenceIds)}</div>`;
  }
  if (block.type === 'legal_decision_tree') {
    return `<div class="claim-plan-method"><span class="clarification-label">Ruta para comprobar la regla</span><ol>${block.items.map((item) => `<li data-status="${escapeHtml(item.status)}"><span>${escapeHtml(item.label)}</span><p>${escapeHtml(item.detail)}</p></li>`).join('')}</ol></div>`;
  }
  if (block.type === 'prediction_conditions') {
    return `<div class="claim-plan-method"><span class="clarification-label">Convertirla en una predicción comprobable</span><dl>${block.items.map((item) => `<div data-status="${escapeHtml(item.status)}"><dt>${escapeHtml(item.label)}</dt><dd>${escapeHtml(item.value)}</dd></div>`).join('')}</dl></div>`;
  }
  if (block.type === 'trade_offs') {
    return `<div class="claim-plan-method claim-plan-tradeoffs"><span class="clarification-label">Qué criterio queréis priorizar</span><p>${escapeHtml(block.principle)}</p><div>${block.alternatives.map((item) => `<section><strong>${escapeHtml(item.label)}</strong><p>${escapeHtml(item.consequence)}</p></section>`).join('')}</div></div>`;
  }
  if (block.type === 'group_comparison_requirements') {
    return `<div class="claim-plan-method"><span class="clarification-label">Comprobación de comparabilidad</span><ul>${block.items.map((item) => `<li data-status="${escapeHtml(item.status)}"><span>${escapeHtml(item.label)}</span><p>${escapeHtml(item.detail)}</p></li>`).join('')}</ul></div>`;
  }
  if (block.type === 'cannot_conclude') {
    return `<div class="claim-plan-limit claim-plan-card"><span class="clarification-label">Lo que no se puede concluir todavía</span><ul>${block.points.slice(0, 4).map((point) => `<li>${escapeHtml(point)}</li>`).join('')}</ul>${blockEvidenceMarkup(plan, block.evidenceIds)}</div>`;
  }
  if (block.type === 'money_flow') {
    return `<div class="claim-plan-flow"><span class="clarification-label">Flujo descrito en la fuente localizada</span>${block.amount ? `<strong>${escapeHtml(block.amount)}</strong>` : ''}<div><strong>${escapeHtml(block.origin || 'Origen')}</strong><span>↓ transferencia</span><strong>${escapeHtml(block.destination || 'Destino')}</strong></div>${block.purpose ? `<small>Finalidad: ${escapeHtml(block.purpose)}</small>` : ''}<small>Contexto provisional; no demuestra por sí solo un recorte de servicios.</small>${blockEvidenceMarkup(plan, block.evidenceIds)}</div>`;
  }
  if (block.type === 'data_finding') {
    return `<div class="claim-plan-finding"><span class="clarification-label">Lo que muestran los datos localizados</span><ul>${block.points.slice(0, 3).map((point) => `<li>${escapeHtml(point)}</li>`).join('')}</ul>${blockEvidenceMarkup(plan, block.evidenceIds)}</div>`;
  }
  if (block.type === 'source_excerpt') {
    return `<div class="claim-plan-excerpt"><span class="clarification-label">${escapeHtml(block.title)}</span><blockquote>${escapeHtml(block.excerpt)}</blockquote><small>Fragmento mostrado para orientar la comprobación; no es por sí solo un veredicto.</small>${blockEvidenceMarkup(plan, block.evidenceIds)}</div>`;
  }
  if (block.type === 'line_chart' || block.type === 'bar_chart' || block.type === 'comparison_chart') {
    const chart = planVisualMarkup(plan, block);
    return chart ? chart.slice(0, -6) + blockEvidenceMarkup(plan, block.evidenceIds) + '</div>' : '';
  }
  if (block.type === 'conversation_reply') {
    return `<div class="claim-plan-reply" data-result-target="reply"><span class="clarification-label">Una forma de explicarlo</span><p>${escapeHtml(block.text)}</p><button type="button" data-copy-answer="${escapeHtml(block.text)}">Copiar respuesta</button>${blockEvidenceMarkup(plan, block.evidenceIds)}</div>`;
  }
  if (block.type === 'sources') {
    return `<div class="claim-plan-sources"><span class="clarification-label">Fuentes vinculadas</span><p>${escapeHtml(block.sourceIds.join(' · '))}</p></div>`;
  }
  return '';
};

const structuredBlocksMarkup = (plan: AnswerPlan): string => {
  const secondaryTypes = new Set<AnswerPlan['blocks'][number]['type']>([
    'evidence_ladder',
    'legal_decision_tree',
    'prediction_conditions',
    'trade_offs',
    'group_comparison_requirements',
    'source_excerpt',
    'sources',
  ]);
  const primary: string[] = [];
  const secondary: string[] = [];
  const coreGuidanceTypes = new Set<AnswerPlan['blocks'][number]['type']>([
    'evidence_ladder',
    'legal_decision_tree',
    'prediction_conditions',
    'trade_offs',
    'group_comparison_requirements',
  ]);
  plan.blocks.forEach((block) => {
    const markup = renderStructuredBlock(plan, block);
    if (!markup) return;
    const coreGuidance = (plan.coverage === 'insufficient' || plan.coverage === 'values') && coreGuidanceTypes.has(block.type);
    (secondaryTypes.has(block.type) && !coreGuidance ? secondary : primary).push(markup);
  });
  const detailMarkup = secondary.length
    ? `<details class="claim-result-details"><summary><span>Ver el análisis detallado</span><small>${secondary.length} bloque${secondary.length === 1 ? '' : 's'} sobre método, fuentes y límites</small></summary><div class="claim-result-secondary">${secondary.join('')}</div></details>`
    : '';
  return `${primary.join('')}${detailMarkup}`;
};

const sourceLinksMarkup = (plan: AnswerPlan): string => plan.sourceLinks?.length
  ? `<div class="claim-plan-source-links" data-result-target="sources"><span class="clarification-label">Fuentes consultadas${plan.asOf ? ` · ${escapeHtml(new Date(plan.asOf).toLocaleString('es-ES'))}` : ''}</span>${plan.sourceLinks.slice(0, 3).map((source) => `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.title)}${source.publisher ? ` · ${escapeHtml(source.publisher)}` : ''} <span aria-hidden="true">↗</span></a>`).join('')}</div>`
  : '';

const resultUseActionsMarkup = (plan: AnswerPlan): string => {
  const hasReply = plan.blocks.some((block) => block.type === 'conversation_reply');
  const hasSources = Boolean(plan.sourceLinks?.length);
  if (!hasReply && !hasSources) return '';
  return `<div class="claim-result-use" aria-label="Elige cómo quieres usar esta aclaración"><span>Verlo como</span><div role="group" aria-label="Modo de la aclaración"><button type="button" data-result-mode-button="understand" aria-pressed="true">Entender</button>${hasReply ? '<button type="button" data-result-mode-button="reply" aria-pressed="false">Responder</button>' : ''}${hasSources ? '<button type="button" data-result-mode-button="sources" aria-pressed="false">Fuentes</button>' : ''}</div></div>`;
};

const resultActionsMarkup = (shareUrl?: string, hasStory = false): string => `<div class="claim-result-actions claim-result-actions-primary" data-result-target="actions"><button type="button" data-new-check>Comprobar otra frase</button>${shareUrl ? `<button type="button" data-share-result data-share-url="${escapeHtml(shareUrl)}">Compartir aclaración</button>` : ''}${hasStory ? `<button type="button" data-download-story data-story-share-url="${escapeHtml(shareUrl || '')}">Descargar resumen visual</button>` : ''}<span class="claim-result-action-status" aria-live="polite"></span></div>`;

const definitionChoiceMarkup = (original: string, plan: AnswerPlan): string => {
  const isBroadDefinition = plan.coverage === 'insufficient'
    && plan.blocks.some((block) => block.type === 'evidence_ladder' && block.steps[0]?.label === 'Resultado concreto');
  if (!isBroadDefinition) return '';
  const query = normaliseClaimText(original);
  const topicChoices = query.includes('sanidad') || query.includes('hospital') || query.includes('medic') || query.includes('salud')
    ? [
      '¿Cuánto gasta España en sanidad por habitante?',
      '¿Ha empeorado el acceso a la sanidad?',
      '¿Ha aumentado la esperanza de vida en España?',
      '¿Qué tiempo de espera quieres comprobar?',
    ]
    : query.includes('vivienda') || query.includes('alquiler') || query.includes('casa') || query.includes('piso')
      ? [
        '¿Ha empeorado el acceso a la vivienda en España?',
        '¿Cómo han cambiado los alquileres en España?',
        '¿Han subido los precios de la vivienda en España?',
        '¿Qué porcentaje de hogares sufre sobrecarga de vivienda?',
      ]
      : query.includes('empleo') || query.includes('trabajo') || query.includes('paro') || query.includes('sueldo') || query.includes('salario')
        ? [
          '¿Cómo ha evolucionado el desempleo en España?',
          '¿Tiene España una tasa de empleo mayor que la Unión Europea?',
          '¿Tiene España más paro juvenil que la Unión Europea?',
          '¿Qué porcentaje de la población activa encuentra trabajo?',
          '¿Está creciendo el empleo en España?',
          '¿Han subido los salarios en España?',
          '¿Cómo ha cambiado el salario mínimo en España?',
        ]
          : query.includes('inmigr') || query.includes('extranj') || query.includes('patera') || query.includes('refug')
          ? [
            '¿Cuántos residentes nacieron fuera de España?',
            '¿Cuántos residentes tienen ciudadanía extranjera en España?',
            '¿Cuántas personas inmigraron a España durante el último año?',
            '¿La inmigración aumenta la inseguridad?',
            '¿Las personas inmigrantes reciben prioridad en las ayudas?',
          ]
          : query.includes('pension') || query.includes('jubil')
            ? [
              '¿Cuánto gasta España en pensiones y prestaciones de supervivencia por habitante?',
              '¿Cuánto gasta España en prestaciones de protección social por habitante?',
              '¿España gasta más por habitante en pensiones que la Unión Europea?',
              '¿Cómo ha evolucionado el envejecimiento de la población española?',
              '¿Qué porcentaje de personas mayores depende de la población en edad de trabajar?',
            ]
          : query.includes('ayuda') || query.includes('prestacion') || query.includes('proteccion social') || query.includes('gasto social')
            ? [
              '¿Cuánto gasta España en prestaciones de protección social por habitante?',
              '¿Cuánto gasta España en pensiones y prestaciones de supervivencia por habitante?',
              '¿Las personas inmigrantes reciben prioridad en las ayudas?',
              '¿Qué porcentaje de personas está en riesgo de pobreza o exclusión?',
              '¿España tiene más riesgo de pobreza o exclusión que la Unión Europea?',
              '¿España tiene más esperanza de vida que la Unión Europea?',
              '¿Cómo han evolucionado los ingresos públicos sobre el PIB?',
            ]
          : query.includes('impuesto') || query.includes('econom') || query.includes('pib') || query.includes('precio') || query.includes('inflac')
            ? [
              '¿Cuál es el tamaño de la economía española?',
              '¿Sigue creciendo el PIB real de España?',
              '¿Crece España más que la Unión Europea?',
              '¿Tiene España más PIB por habitante que la Unión Europea?',
              '¿Cuál es la inflación anual en España?',
              '¿Está la inflación de España por encima de la Unión Europea?',
              '¿España recauda más o menos que la media europea?',
              '¿España cobra más impuestos sobre renta y riqueza que la Unión Europea?',
              '¿España gasta más o menos que la media de la Unión Europea?',
              '¿España gasta más por habitante en sanidad que la Unión Europea?',
              '¿España tiene más renta mediana que la Unión Europea?',
              '¿España tiene más esperanza de vida que la Unión Europea?',
              '¿España tiene más riesgo de pobreza o exclusión que la Unión Europea?',
            ]
            : [
              '¿Ha empeorado el acceso a la vivienda en España?',
              '¿Ha subido el coste de vida en España?',
              '¿Está aumentando el paro en España?',
              '¿Ha empeorado la seguridad en España?',
            ];
  const visibleChoices = topicChoices.slice(0, 6);
  return `<div class="claim-plan-choices" data-result-target="choices"><span class="clarification-label">Primero: ¿qué quieres decir exactamente?</span><p>No hace falta formularlo mejor. Elige el resultado que quieres comprobar y seguimos desde ahí.</p><div>${visibleChoices.map((choice: string) => `<button type="button" data-clarification-choice="${escapeHtml(choice)}">${escapeHtml(choice)} <span aria-hidden="true">→</span></button>`).join('')}</div></div>`;
};

const resetChecker = (): void => {
  activeRequest?.abort();
  activeRequest = null;
  requestVersion += 1;
  if (input) input.value = '';
  resetMediaSelection();
  updateCounter();
  if (result) result.innerHTML = '';
  window.history.replaceState({}, '', '/#comprobar');
  input?.focus();
};

recentChecksList?.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const removeButton = target.closest<HTMLButtonElement>('[data-remove-recent]');
  if (removeButton) {
    const index = Number(removeButton.dataset.removeRecent);
    if (Number.isInteger(index)) {
      const items = readRecentChecks();
      items.splice(index, 1);
      writeRecentChecks(items);
      renderRecentChecks();
    }
    return;
  }
  const queryButton = target.closest<HTMLButtonElement>('[data-recent-query]');
  if (!queryButton || !input || !form) return;
  resetMediaSelection();
  input.value = queryButton.dataset.recentQuery || '';
  updateCounter();
  form.requestSubmit();
});

document.querySelector<HTMLButtonElement>('[data-clear-recent]')?.addEventListener('click', () => {
  writeRecentChecks([]);
  renderRecentChecks();
});

const bindResultActions = (): void => {
  result?.querySelectorAll<HTMLButtonElement>('[data-copy-answer]').forEach((button) => button.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(button.dataset.copyAnswer || ''); button.textContent = 'Respuesta copiada'; } catch { button.textContent = 'Selecciona el texto para copiarlo'; }
  }));
  result?.querySelector<HTMLButtonElement>('[data-share-result]')?.addEventListener('click', async () => {
    const card = result.querySelector<HTMLElement>('.claim-result-card');
    const headline = card?.querySelector('h3')?.textContent || 'Aclaración sobre una afirmación';
    const summary = card?.querySelector('.claim-result-summary, .claim-result-short-answer p')?.textContent || '';
    const shareUrl = result.querySelector<HTMLButtonElement>('[data-share-result]')?.dataset.shareUrl || `${location.origin}/#comprobar`;
    try {
      let shared = false;
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: headline, text: summary, url: shareUrl });
        shared = true;
      } else await navigator.clipboard.writeText(`${headline}\n${summary}\n${shareUrl}`);
      const button = result.querySelector<HTMLButtonElement>('[data-share-result]');
      if (button) button.textContent = shared ? 'Compartido' : 'Enlace y resumen copiados';
    } catch { /* Sharing is optional and must not interrupt the result. */ }
  });
  result?.querySelector<HTMLButtonElement>('[data-download-story]')?.addEventListener('click', async () => {
    const card = result.querySelector<HTMLElement>('.claim-result-card');
    const story = card?.querySelector<HTMLElement>('.claim-visual-story');
    const status = card?.querySelector<HTMLElement>('.claim-result-action-status');
    if (!card || !story) return;
    const headline = card.querySelector('h3')?.textContent?.trim() || 'Aclaración sobre una afirmación';
    const summary = card.querySelector('.claim-result-summary')?.textContent?.trim() || '';
    const shareUrl = card.querySelector<HTMLButtonElement>('[data-download-story]')?.dataset.storyShareUrl || '';
    const steps = [...story.querySelectorAll<HTMLElement>('li')].map((step) => ({
      title: step.querySelector('strong')?.textContent?.trim() || '',
      text: step.querySelector('p')?.textContent?.trim() || '',
      number: step.querySelector('.claim-visual-story-number')?.textContent?.trim() || '',
      bars: [...step.querySelectorAll<HTMLElement>('.claim-story-mini-chart b')]
        .map((bar) => Number.parseFloat(bar.style.getPropertyValue('--story-bar')))
        .filter((value) => Number.isFinite(value)),
    }));
    if (!steps.length) return;
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 700;
    const context = canvas.getContext('2d');
    if (!context) return;
    const colors = { paper: '#f5f1e8', ink: '#171512', muted: '#68635b', red: '#c53526', line: '#d7d0c3' };
    context.fillStyle = colors.paper;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = colors.red;
    context.fillRect(0, 0, 1200, 12);
    const wrap = (text: string, maxWidth: number, font: string): string[] => {
      context.font = font;
      const words = text.split(/\s+/).filter(Boolean);
      const lines: string[] = [];
      let line = '';
      for (const word of words) {
        const next = line ? `${line} ${word}` : word;
        if (context.measureText(next).width > maxWidth && line) {
          lines.push(line);
          line = word;
        } else line = next;
      }
      if (line) lines.push(line);
      return lines;
    };
    const drawLines = (lines: string[], x: number, y: number, lineHeight: number): number => {
      lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
      return y + lines.length * lineHeight;
    };
    context.fillStyle = colors.muted;
    context.font = '600 16px monospace';
    context.fillText('EL PAÍS ESTÁ FATAL · ACLARACIÓN VISUAL', 64, 58);
    context.fillStyle = colors.ink;
    context.font = '700 40px Georgia, serif';
    const headlineLines = wrap(headline, 1070, '700 40px Georgia, serif').slice(0, 2);
    let cursorY = drawLines(headlineLines, 64, 112, 46);
    context.fillStyle = colors.muted;
    context.font = '20px Arial, sans-serif';
    cursorY = drawLines(wrap(summary, 1070, '20px Arial, sans-serif').slice(0, 3), 64, cursorY + 22, 29);
    const gap = 16;
    const cardTop = cursorY + 28;
    const cardWidth = (1072 - gap * (steps.length - 1)) / steps.length;
    const cardHeight = 258;
    steps.slice(0, 3).forEach((step, index) => {
      const x = 64 + index * (cardWidth + gap);
      context.fillStyle = '#ebe5d9';
      context.fillRect(x, cardTop, cardWidth, cardHeight);
      context.fillStyle = colors.red;
      context.font = '600 15px monospace';
      context.fillText(step.number || `0${index + 1}`, x + 20, cardTop + 30);
      context.fillStyle = colors.ink;
      context.font = '700 24px Georgia, serif';
      const titleLines = wrap(step.title, cardWidth - 40, '700 24px Georgia, serif').slice(0, 3);
      let stepY = drawLines(titleLines, x + 20, cardTop + 72, 28);
      context.fillStyle = colors.muted;
      context.font = '15px Arial, sans-serif';
      drawLines(wrap(step.text, cardWidth - 40, '15px Arial, sans-serif').slice(0, 5), x + 20, stepY + 18, 21);
      if (step.bars.length) {
        const baseline = cardTop + cardHeight - 22;
        const chartHeight = 46;
        const barGap = 4;
        const barWidth = Math.max(5, (cardWidth - 40 - barGap * (step.bars.length - 1)) / step.bars.length);
        context.fillStyle = colors.line;
        context.fillRect(x + 20, baseline, cardWidth - 40, 1);
        context.fillStyle = colors.red;
        step.bars.slice(0, 12).forEach((height, barIndex) => {
          const normalizedHeight = Math.max(0, Math.min(100, height)) / 100 * chartHeight;
          context.fillRect(x + 20 + barIndex * (barWidth + barGap), baseline - normalizedHeight, barWidth, normalizedHeight);
        });
      }
    });
    context.strokeStyle = colors.line;
    context.beginPath();
    context.moveTo(64, 620);
    context.lineTo(1136, 620);
    context.stroke();
    context.fillStyle = colors.muted;
    context.font = '600 14px monospace';
    context.fillText('Orientación basada en evidencia enlazada · elpaisestafatal.es', 64, 654);
    if (shareUrl) {
      context.fillStyle = colors.red;
      context.font = '600 13px monospace';
      context.fillText(`Abrir la aclaración: ${shareUrl.slice(0, 112)}`, 64, 680);
    }
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return;
    const file = new File([blob], 'aclaracion-visual.png', { type: 'image/png' });
    try {
      if (typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: headline, text: summary, files: [file] });
        if (status) status.textContent = 'Resumen visual compartido';
        return;
      }
    } catch { /* Fall back to a download when sharing is cancelled or unavailable. */ }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    if (status) status.textContent = 'Resumen visual descargado';
  });
  result?.querySelector<HTMLButtonElement>('[data-play-story]')?.addEventListener('click', () => {
    const story = result.querySelector<HTMLElement>('.claim-visual-story');
    const button = result.querySelector<HTMLButtonElement>('[data-play-story]');
    if (!story || !button) return;
    story.classList.remove('is-playing');
    window.requestAnimationFrame(() => {
      story.classList.add('is-playing');
      button.textContent = 'Reproduciendo';
      button.setAttribute('aria-pressed', 'true');
      window.setTimeout(() => {
        story.classList.remove('is-playing');
        button.textContent = 'Reproducir';
        button.setAttribute('aria-pressed', 'false');
      }, 1600);
    });
  });
  result?.querySelector<HTMLButtonElement>('[data-new-check]')?.addEventListener('click', resetChecker);
  result?.querySelectorAll<HTMLButtonElement>('[data-result-mode-button]').forEach((button) => button.addEventListener('click', () => {
    const mode = button.dataset.resultModeButton;
    const card = result?.querySelector<HTMLElement>('.claim-result-card');
    if (!mode || !card) return;
    card.dataset.resultMode = mode;
    result?.querySelectorAll<HTMLButtonElement>('[data-result-mode-button]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    if (mode === 'sources') result?.querySelectorAll<HTMLDetailsElement>('.claim-result-details').forEach((details) => { details.open = true; });
    const target = mode === 'reply' ? result?.querySelector<HTMLElement>('[data-result-target="reply"]') : mode === 'sources' ? result?.querySelector<HTMLElement>('[data-result-target="sources"]') : result?.querySelector<HTMLElement>('[data-result-target="answer"]');
    target?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }));
  result?.querySelectorAll<HTMLButtonElement>('[data-focus-result]').forEach((button) => button.addEventListener('click', () => {
    const targetName = button.dataset.focusResult;
    const target = [...(result?.querySelectorAll<HTMLElement>('[data-result-target]') || [])].find((element) => element.dataset.resultTarget === targetName);
    if (!target) return;
    const details = target.closest('details');
    if (details) details.open = true;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.remove('claim-result-focus');
    window.requestAnimationFrame(() => target.classList.add('claim-result-focus'));
    window.setTimeout(() => target.classList.remove('claim-result-focus'), 1500);
  }));
  result?.querySelectorAll<HTMLButtonElement>('[data-clarification-choice]').forEach((button) => button.addEventListener('click', () => {
    const choice = button.dataset.clarificationChoice;
    if (!choice || !input || !form) return;
    resetMediaSelection();
    input.value = choice;
    form.requestSubmit();
  }));
  result?.querySelectorAll<HTMLButtonElement>('[data-guidance-example]').forEach((button) => button.addEventListener('click', () => {
    if (!input) return;
    resetMediaSelection();
    input.value = button.dataset.guidanceExample || '';
    updateCounter();
    form?.requestSubmit();
  }));
};

const renderStructuredPlan = (original: string, plan: AnswerPlan, primary?: ClaimIndexEntry, alternatives: ClaimIndexEntry[] = [], requestId?: string, state: 'published' | 'draft' | 'related' | 'uncovered' = 'published'): void => {
  if (!result) return;
  const modeLabel = plan.answerMode === 'scorecard' ? 'Cuadro comparativo' : plan.answerMode === 'current_event' ? 'Investigación reciente' : plan.answerMode === 'reviewed_claim' ? 'Ficha revisada' : plan.answerMode === 'provisional_evidence' ? 'Evidencia provisional' : 'Orientación';
  const resultLabel = state === 'published' ? 'Ficha publicada' : modeLabel;
  const resultState = state === 'published' ? 'Basada en una ficha revisada' : plan.answerMode === 'current_event' ? 'Live/provisional · no es una publicación de hechos' : plan.answerMode === 'scorecard' ? 'Indicadores comparables · sin veredicto partidista' : state === 'uncovered' ? 'Sin coincidencia publicada; mostramos lo útil que sí sabemos' : 'Resultado automático · provisional, no publicado';
  const resultTitle = plan.headline;
  const displayedAssessment = state === 'published' && primary?.assessment
    ? assessmentLabels[primary.assessment] || primary.assessment
    : coverageLabel(plan.coverage);
  const nextStep = plan.clarificationQuestion
    || (primary ? primary.kind === 'topic' ? 'Abre el contexto del tema para ver qué preguntas concretas podemos comprobar.' : 'Abre la ficha revisada para ver el detalle y las fuentes.' : 'Concreta la fecha, el lugar o el programa para comprobar mejor la afirmación.');
  const shareUrl = shareUrlFor(original, primary, state);
  const limitation = plan.limitation || 'La evidencia disponible no permite responder a todas las implicaciones de la frase.';
  const storyMarkup = visualStoryMarkup(plan);
  result.innerHTML = `<article class="claim-result-card" data-state="${state}" data-result-mode="understand" aria-labelledby="claim-result-title"><div class="claim-result-top"><div><span class="eyebrow">${resultLabel}</span><span class="claim-result-state">${resultState}</span></div><span class="claim-assessment">${escapeHtml(displayedAssessment)}</span></div>${submittedClaimMarkup(original)}<h3 id="claim-result-title">${escapeHtml(resultTitle)}</h3><div class="claim-result-short-answer" data-result-target="answer"><span class="clarification-label">Respuesta breve</span><p class="claim-result-summary">${escapeHtml(plan.summary)}</p><button type="button" data-copy-answer="${escapeHtml(plan.summary)}">Copiar resumen</button></div><div class="claim-result-overview" data-result-overview aria-label="Resumen de la evidencia, el límite y el siguiente paso"><div><span>Estado de la evidencia</span><strong>${escapeHtml(coverageLabel(plan.coverage))}</strong></div><div><span>Qué no demuestra</span><strong>${escapeHtml(limitation)}</strong></div><div><span>Siguiente paso</span><strong>${escapeHtml(nextStep)}</strong></div></div>${storyMarkup}${resultUseActionsMarkup(plan)}${resultActionsMarkup(requestId ? shareUrl : undefined, Boolean(storyMarkup))}${definitionChoiceMarkup(original, plan)}<div class="claim-plan-blocks">${structuredBlocksMarkup(plan)}</div>${plan.clarificationQuestion ? `<div class="claim-plan-question" data-result-target="question"><span class="clarification-label">La siguiente pregunta útil</span><p>${escapeHtml(plan.clarificationQuestion)}</p></div>` : ''}${plan.limitation ? `<p class="claim-plan-limitation"><strong>Límite:</strong> ${escapeHtml(plan.limitation)}</p>` : ''}${sourceLinksMarkup(plan)}${primary ? resultLink(primary) : ''}${alternativeMarkup(alternatives)}${requestId ? `<div class="claim-feedback" data-feedback-request="${escapeHtml(requestId)}"><span>¿Te ha servido esta aclaración?</span><button type="button" data-feedback-value="yes">Sí</button><button type="button" data-feedback-value="partly">En parte</button><button type="button" data-feedback-value="no">No</button></div>` : ''}</article>`;
  bindResultActions();
  result.querySelectorAll<HTMLButtonElement>('[data-feedback-value]').forEach((button) => button.addEventListener('click', async () => {
    const feedback = button.closest<HTMLElement>('[data-feedback-request]');
    const requestId = feedback?.dataset.feedbackRequest;
    if (!requestId) return;
    try {
      await fetch('/api/feedback', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ requestId, value: button.dataset.feedbackValue }) });
      feedback.querySelectorAll('button').forEach((item) => { item.disabled = true; });
      const label = feedback.querySelector('span');
      if (label) label.textContent = 'Gracias por tu respuesta.';
    } catch { /* Feedback must never interrupt the answer. */ }
  }));
};

const renderCard = (state: 'loading' | 'published' | 'related' | 'uncovered' | 'unavailable' | 'invalid', original: string, primary?: ClaimIndexEntry, alternatives: ClaimIndexEntry[] = [], guidance?: SearchResponse['guidance'], reason = '', inputKind: 'text' | 'media' = 'text'): void => {
  if (!result) return;
  const labels = {
    loading: 'Procesando el archivo',
    published: 'Coincidencia publicada',
    related: 'Orientación más cercana',
    uncovered: 'Aún no hay una ficha exacta',
    unavailable: 'Orientación rápida disponible',
    invalid: 'Archivo no compatible',
  };
  const title = primary ? primary.title : (state === 'uncovered' ? guidance?.heading || 'No encontramos una ficha exacta todavía' : state === 'invalid' ? 'Prueba con otro archivo' : state === 'loading' ? 'Estamos leyendo el archivo' : state === 'unavailable' && inputKind === 'media' ? 'No pudimos extraer una afirmación del archivo' : guidance?.questions?.[0] || 'Estamos preparando una orientación');
  const stateDescription: Record<typeof state, string> = {
    loading: 'El archivo se está leyendo',
    published: 'Coincidencia con una ficha revisada',
    related: 'Contexto cercano, no una coincidencia exacta',
    uncovered: 'Todavía no hay una ficha publicada para esta frase',
    unavailable: 'La orientación rápida se conserva',
    invalid: 'El archivo necesita otro formato',
  };
  const body = state === 'loading'
      ? `<p>Estamos leyendo el contenido del archivo para buscar una orientación útil.</p>`
    : state === 'uncovered'
      ? `<p><strong>${escapeHtml(guidance?.limitation || 'No tenemos una comprobación publicada de esta afirmación.')}</strong></p><p class="claim-guidance-learning" data-learning-note>Las preguntas sin coincidencia nos ayudan a decidir qué comprobar después.</p>${guidance?.questions?.length ? `<div class="claim-guidance"><span class="clarification-label">${escapeHtml(guidance.questionsLabel || 'Para comprobarla haría falta concretar')}</span><ul>${guidance.questions.slice(0, 2).map((question) => `<li>${escapeHtml(question)}</li>`).join('')}</ul></div>` : ''}${guidance?.suggestions?.length ? `<div class="claim-guidance claim-guidance-suggestions"><span class="clarification-label">${escapeHtml(guidance.suggestionsLabel || 'Puedes concretarla por un tema')}</span><p class="claim-guidance-note">No es una respuesta a tu frase; son ejemplos de comprobaciones disponibles.</p><div>${guidance.suggestions.slice(0, 6).map((suggestion) => suggestion.prompt ? `<button type="button" data-guidance-example="${escapeHtml(suggestion.prompt)}">${escapeHtml(suggestion.title)} <span aria-hidden="true">→</span></button>` : `<a href="${escapeHtml(suggestion.href || '#')}">${escapeHtml(suggestion.title)} <span aria-hidden="true">↗</span></a>`).join('')}</div></div>` : ''}`
    : state === 'unavailable'
        ? `<p><strong>${escapeHtml(guidance?.limitation || 'La comprobación automática está tardando más de lo previsto.')}</strong></p>${alternatives.length ? `<div class="claim-guidance"><span class="clarification-label">Mientras tanto, puedes consultar</span><ul>${alternatives.slice(0, 2).map((entry) => `<li><a href="${escapeHtml(entry.href)}">${escapeHtml(entry.title)}</a></li>`).join('')}</ul></div>` : ''}`
      : state === 'invalid'
        ? `<p><strong>${escapeHtml(guidance?.limitation || 'Este archivo no tiene un formato compatible.')}</strong></p><div class="claim-guidance"><span class="clarification-label">Formatos aceptados</span><ul><li>Capturas: PNG, JPEG, WebP o GIF</li><li>Audio: WAV, MP3, M4A, OGG, WebM o FLAC</li><li>Máximo: ${Math.round(INPUT_LIMITS.maxFileBytes / 1024 / 1024)} MB</li></ul></div>`
      : `${visualMarkup(primary)}<div class="claim-result-short-answer"><span class="clarification-label">Orientación en una frase</span><p>${escapeHtml(primary?.answer || reason || 'Hemos encontrado una orientación útil para seguir comprobando la afirmación.')}</p>${primary?.answer ? `<button type="button" data-copy-answer="${escapeHtml(primary.answer)}">Copiar respuesta</button>` : ''}</div>${primary ? resultLink(primary) : ''}`;
  const assessment = state === 'published' && primary?.assessment ? `<span class="claim-assessment">${escapeHtml(assessmentLabels[primary.assessment] || primary.assessment)}</span>` : '';
  const alternativesMarkup = ['published', 'related', 'unavailable'].includes(state) ? alternativeMarkup(alternatives) : '';
  const inputMarkup = inputKind === 'media' ? submittedClaimMarkup(original, 'media') : submittedClaimMarkup(original);
  // The no-match body already contains the clarification path. Repeating the
  // same evidence/limitation/next-step summary below it makes the result feel
  // longer without adding information.
  const overview = ['published', 'related', 'unavailable'].includes(state) ? quickResultOverviewMarkup(state, primary, guidance) : '';
  result.innerHTML = `<article class="claim-result-card" data-state="${state}" aria-busy="${state === 'loading'}" aria-labelledby="claim-result-title"><div class="claim-result-top"><div><span class="eyebrow">${labels[state]}</span><span class="claim-result-state">${stateDescription[state]}</span></div>${assessment}</div>${inputMarkup}<h3 id="claim-result-title">${escapeHtml(title)}</h3>${body}${overview}${resultActionsMarkup(primary?.answer ? shareUrlFor(original, primary, state === 'published' ? 'published' : 'related') : undefined)}${alternativesMarkup}</article>`;
  bindResultActions();
};

const renderDeterministic = (original: string, ranked: RankedClaimIndexEntry[]): void => {
  const primary = ranked[0];
  const broadGuidance = broadComplaintGuidance(original, primary);
  if (broadGuidance) {
    renderCompactResult({ status: 'uncovered', claim: original, summary: 'No hay una nota única para decir si España va mejor o peor: hay que comparar empleo, renta, pobreza, vivienda, sanidad y actividad económica.', refinementQuestion: 'Estamos cargando el cuadro de indicadores con periodos y fuentes. ¿Qué parte quieres comprobar primero?', refinementChoices: defaultRefinementChoices, secondaryAction: 'Comprobar otra frase' });
    return;
  }
  const coverage = classifyDeterministicCoverage(primary);
  if (coverage.status === 'strong' && primary && isStrongClaimMatch(primary)) {
    if (navigateToPublishedClaim(primary)) return;
    return;
  }
  if (coverage.status === 'qualified' && primary) {
    renderCompactResult({ status: 'related', claim: original, summary: 'Encontramos una conversación relacionada, pero no una comprobación exacta de esta frase.', refinementQuestion: '¿Qué fecha, lugar o decisión concreta quieres comprobar?', refinementChoices: defaultRefinementChoices, secondaryAction: 'Comprobar otra frase' });
    return;
  }
  if (primary?.kind === 'topic' && primary.score >= 36) {
    renderCompactResult({ status: 'related', claim: original, summary: 'La frase es amplia y todavía no se puede comprobar tal como está escrita.', refinementQuestion: '¿Qué decisión, dato o consecuencia concreta quieres comprobar?', refinementChoices: defaultRefinementChoices, secondaryAction: 'Comprobar otra frase' });
    return;
  }
  renderCompactResult({ status: 'uncovered', claim: original, summary: 'No encontramos una comprobación publicada para esta afirmación.', refinementQuestion: '¿Qué hecho, periodo, lugar o indicador quieres concretar?', refinementChoices: defaultRefinementChoices, secondaryAction: 'Comprobar otra frase' });
};

const clearDynamicStatus = (): void => {
  if (dynamicStatusTimer !== null) {
    window.clearTimeout(dynamicStatusTimer);
    dynamicStatusTimer = null;
  }
  result?.querySelector('[data-dynamic-status]')?.remove();
};

const fetchWithTimeout = async (url: string, init: RequestInit, timeoutMs: number): Promise<Response> => {
  const controller = new AbortController();
  const parentSignal = init.signal;
  const abortFromParent = (): void => controller.abort();
  if (parentSignal?.aborted) controller.abort();
  else parentSignal?.addEventListener('abort', abortFromParent, { once: true });
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
    parentSignal?.removeEventListener('abort', abortFromParent);
  }
};

let dynamicStatusTimer: number | null = null;

const setDynamicStatus = (message: string, state: 'running' | 'slow' | 'unavailable' = 'running', mode: 'enrichment' | 'media' = 'enrichment'): void => {
  if (!result) return;
  clearDynamicStatus();
  const status = document.createElement('div');
  status.className = 'claim-result-enrichment';
  status.dataset.dynamicStatus = 'true';
  status.dataset.statusState = state;
  status.dataset.statusMode = mode;
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('role', 'status');
  const title = mode === 'media'
    ? state === 'running' ? 'Resultado inicial disponible · leyendo el archivo' : state === 'slow' ? 'Resultado inicial listo' : 'Resultado inicial disponible'
    : state === 'running' ? 'Resultado inicial disponible' : state === 'slow' ? 'Resultado inicial listo' : 'Resultado inicial disponible';
  const action = state === 'unavailable' ? '' : '<button type="button" class="claim-result-enrichment-stop" data-stop-enrichment>Usar solo este resultado</button>';
  status.innerHTML = `<span class="claim-result-enrichment-dot" aria-hidden="true"></span><div><strong>${title}</strong><span>${escapeHtml(message)}</span></div>${action}`;
  result.querySelector('article')?.append(status);
  status.querySelector<HTMLButtonElement>('[data-stop-enrichment]')?.addEventListener('click', () => {
    activeRequest?.abort();
    activeRequest = null;
    requestVersion += 1;
    clearDynamicStatus();
  });
  if (state === 'running') {
    const fallbackMessage = mode === 'media'
      ? 'La lectura del archivo está tardando más de lo previsto. Puedes usar la orientación visible o escribir la frase directamente; no hace falta esperar.'
      : 'El resultado inicial sigue disponible. Puedes usarlo sin esperar a que termine el contexto adicional.';
    dynamicStatusTimer = window.setTimeout(() => {
      if (status.isConnected && status.dataset.statusState === 'running') setDynamicStatus(fallbackMessage, 'slow', mode);
    }, mode === 'media' ? 12000 : 8000);
  }
};

const applyResponse = (response: SearchResponse, original: string, fallback: RankedClaimIndexEntry[]): void => {
  clearDynamicStatus();
  const structuredPrimary = response.relatedClaims?.[0];
  const primary = findEntry(response.primary?.slug || structuredPrimary?.slug);
  if (response.status === 'complete' && response.result && primary && response.result.answerMode === 'reviewed_claim') {
    if (navigateToPublishedClaim(primary)) return;
    renderCompactResult({ status: 'related', claim: original, summary: 'Encontramos un tema relacionado, pero no una comprobación exacta.', refinementQuestion: '¿Qué decisión, dato o consecuencia concreta quieres comprobar?', refinementChoices: defaultRefinementChoices, secondaryAction: 'Comprobar otra frase' });
    return;
  }
  if (response.status === 'complete' && primary && response.result?.answerMode === 'reviewed_claim') {
    if (navigateToPublishedClaim(primary)) return;
    renderCompactResult({ status: 'related', claim: original, summary: 'Encontramos un tema relacionado, pero no una comprobación exacta.', refinementQuestion: '¿Qué decisión, dato o consecuencia concreta quieres comprobar?', refinementChoices: defaultRefinementChoices, secondaryAction: 'Comprobar otra frase' });
    return;
  }
  if (response.status === 'complete' && response.result && ['scorecard', 'current_event', 'provisional_evidence'].includes(response.result.answerMode || '')) {
    renderStructuredPlan(original, response.result, primary, [], response.requestId, 'published');
    return;
  }
  if (response.status === 'draft' && response.result) {
    renderStructuredPlan(original, response.result, primary, response.relatedClaims?.slice(1).map((item) => findEntry(item.slug)).filter(Boolean) as ClaimIndexEntry[], response.requestId, 'draft');
    return;
  }
  if (response.status === 'partial' && response.result) {
    renderStructuredPlan(original, response.result, primary, response.relatedClaims?.slice(1).map((item) => findEntry(item.slug)).filter(Boolean) as ClaimIndexEntry[], response.requestId, 'related');
    return;
  }
  if (response.status === 'partial' && primary) {
    renderCompactResult({ status: 'related', claim: original, summary: 'Encontramos contexto relacionado, pero no una comprobación exacta.', refinementQuestion: '¿Qué fecha, lugar o decisión concreta quieres comprobar?', refinementChoices: defaultRefinementChoices, secondaryAction: 'Comprobar otra frase' });
    return;
  }
  if (response.status === 'published' && primary) {
    if (navigateToPublishedClaim(primary)) return;
    renderCompactResult({ status: 'related', claim: original, summary: 'Encontramos un tema relacionado, pero no una comprobación exacta.', refinementQuestion: '¿Qué decisión, dato o consecuencia concreta quieres comprobar?', refinementChoices: defaultRefinementChoices, secondaryAction: 'Comprobar otra frase' });
    return;
  }
  if (response.status === 'related' && primary) {
    renderCompactResult({ status: 'related', claim: original, summary: 'Encontramos contexto relacionado, pero no una comprobación exacta.', refinementQuestion: '¿Qué fecha, lugar o decisión concreta quieres comprobar?', refinementChoices: defaultRefinementChoices, secondaryAction: 'Comprobar otra frase' });
    return;
  }
  if (response.status === 'uncovered' && response.result && ['scorecard', 'current_event', 'provisional_evidence'].includes(response.result.answerMode || '') && (response.result.blocks?.length || response.result.sourceLinks?.length)) {
    renderStructuredPlan(original, response.result, primary, [], response.requestId, 'uncovered');
    return;
  }
  if (response.status === 'uncovered') {
    const broadGuidance = broadComplaintGuidance(original, primary);
    if (broadGuidance) {
      renderCompactResult({ status: 'uncovered', claim: original, summary: broadGuidance.questions?.[0] || 'Esta frase resume varias discusiones.', refinementQuestion: 'Elige un indicador concreto y te llevamos directamente a sus datos.', refinementChoices: defaultRefinementChoices, secondaryAction: 'Comprobar otra frase' });
      return;
    }
    renderCompactResult({ status: 'uncovered', claim: original, summary: 'No encontramos una comprobación publicada para esta afirmación.', refinementQuestion: response.result?.clarificationQuestion || response.guidance?.questions?.[0] || '¿Qué hecho, periodo, lugar o indicador quieres concretar?', refinementChoices: defaultRefinementChoices, secondaryAction: 'Comprobar otra frase' });
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
  // Ignore pre-resolution cache entries from older releases. They contain the
  // legacy compact "no published check" response and would mask new modes.
  if (cached && (cached.result?.answerMode || cached.status === 'published')) { applyResponse(cached, query, ranked); return; }
  activeRequest?.abort();
  activeRequest = new AbortController();
  try {
    const inputType = file?.type.startsWith('audio/') ? 'audio' : file ? 'image' : /^https:\/\//i.test(query) ? 'url' : 'text';
    const requestBody = file ? (() => { const body = new FormData(); body.set('text', query); body.set('inputType', inputType); body.set('file', file); return body; })() : JSON.stringify({ text: query, inputType });
    const response = await fetchWithTimeout('/api/classify', { method: 'POST', headers: file ? undefined : { 'content-type': 'application/json' }, body: requestBody, signal: activeRequest.signal }, file ? 15000 : 5000);
    let data = await response.json() as SearchResponse;
    if (data.status === 'processing' && data.requestId) {
      const processingMessage = inputType === 'image'
        ? query ? 'La orientación visible ya está lista; leemos la captura en segundo plano para comprobar si añade contexto. Puedes continuar sin esperar.' : 'Hemos recibido la captura; leemos su texto en segundo plano para encontrar una comprobación.'
        : inputType === 'audio'
          ? query ? 'La orientación visible ya está lista; transcribimos el audio en segundo plano para comprobar si añade contexto. Puedes continuar sin esperar.' : 'Hemos recibido el audio; extraemos su contenido en segundo plano para encontrar una comprobación.'
          : inputType === 'url'
            ? 'La orientación visible ya está lista; leemos la página enlazada en segundo plano para comprobar si añade contexto. Puedes continuar sin esperar.'
            : 'La orientación visible ya está lista; buscamos una ficha publicada o datos directos en segundo plano para mejorarla. Puedes continuar sin esperar.';
      if (file) setDynamicStatus(processingMessage, 'running', 'media');
      const pendingRequestId = data.requestId;
      const maxAttempts = file ? 30 : 16;
      const waitMs = file ? 500 : 350;
      const pollingDeadline = Date.now() + (file ? 15000 : 12000);
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        if (Date.now() >= pollingDeadline) break;
        await new Promise((resolve, reject) => {
          const timeout = window.setTimeout(resolve, waitMs);
          activeRequest?.signal.addEventListener('abort', () => { window.clearTimeout(timeout); reject(new DOMException('Aborted', 'AbortError')); }, { once: true });
        });
        const pending = await fetchWithTimeout(`/api/classify/${encodeURIComponent(pendingRequestId)}`, { signal: activeRequest.signal }, 1500);
        data = await pending.json() as SearchResponse;
        if (data.status !== 'processing') break;
      }
    }
    if (version !== requestVersion) return;
    if (data.status === 'processing') {
      if (file) setDynamicStatus('No hemos podido leer el archivo a tiempo. Puedes escribir o pegar la frase para comprobarla directamente.', 'slow', 'media');
      else clearDynamicStatus();
      return;
    }
    if (data.status === 'unavailable') {
      if (file && query) setDynamicStatus('La orientación visible ya está lista; no hemos podido añadir el contenido del archivo ahora.', 'unavailable', 'media');
      else if (file) renderCompactResult({ status: 'unavailable', claim: file.name, summary: 'No pudimos extraer una afirmación utilizable del archivo.', refinementQuestion: 'Pega la frase directamente para comprobarla.', secondaryAction: 'Comprobar otra frase' });
      else clearDynamicStatus();
      return;
    }
    if (!file && cacheKey) {
      responseCache.set(cacheKey, data);
    }
    const capturedText = query || data.input?.canonical || '';
    if (capturedText) {
      if (file) rememberRecentCheck(data.input?.canonical || capturedText);
      recordQuestion(capturedText, {
        inputType,
        status: data.status,
        // Typed submissions were captured before classification using the
        // digest of their original wording. Reuse that identity when writing
        // the terminal status so the learning cluster is updated, not counted
        // a second time. File-only requests have no earlier identity.
        requestId: query ? undefined : data.requestId,
        canonical: data.input?.canonical || capturedText,
        // Keep typed claims on the deterministic signature captured before
        // optional enrichment. A model-generated canonical signature may be
        // different and must not create a second cluster for the same request.
        semanticSignature: query ? semanticQuerySignature(query) : data.canonicalSignature,
      });
    }
    applyResponse(data, query, ranked);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    if (version === requestVersion) {
      if (file && query) setDynamicStatus('La orientación visible ya está lista; no hemos podido añadir el contenido del archivo ahora.', 'unavailable', 'media');
      else if (file) renderCompactResult({ status: 'unavailable', claim: file.name, summary: 'No pudimos extraer una afirmación utilizable del archivo.', refinementQuestion: 'Pega la frase directamente para comprobarla.', secondaryAction: 'Comprobar otra frase' });
      else clearDynamicStatus();
    }
  }
};

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  requestVersion += 1;
  activeRequest?.abort();
  activeRequest = null;
  const query = input?.value.trim() || '';
  const file = fileInput?.files?.[0];
  if ((!query && !file) || !result) return;
  if (query) rememberRecentCheck(query);
  window.history.replaceState({}, '', query ? `/?q=${encodeURIComponent(query)}#comprobar` : '/#comprobar');
  if (file) {
    const inputType = file.type.startsWith('audio/') ? 'audio' : 'image';
    const validation = validateInputMetadata({ text: query, inputType, hasFile: true, fileSize: file.size, mimeType: file.type });
    if (!validation.ok) {
      const limitation = validation.code === 'file_too_large'
        ? `El archivo supera el máximo de ${Math.round(INPUT_LIMITS.maxFileBytes / 1024 / 1024)} MB.`
        : validation.code === 'invalid_audio'
          ? 'El audio debe estar en WAV, MP3, M4A, OGG, WebM o FLAC.'
          : 'La imagen debe estar en PNG, JPEG, WebP o GIF.';
      renderCompactResult({ status: 'invalid', claim: file.name, summary: limitation, refinementQuestion: 'Pega la frase directamente para comprobarla.', secondaryAction: 'Comprobar otra frase' });
      return;
    }
  }
  const ranked = query ? rankClaimIndex(query, claimIndex) : [];
  if (query) renderDeterministic(query, ranked);
  else renderCompactResult({ status: 'loading', claim: file?.name || 'Archivo enviado', summary: 'Estamos leyendo el archivo.', secondaryAction: 'Comprobar otra frase' });
  if (query && !(ranked[0] && isStrongClaimMatch(ranked[0]))) {
    // Capture the gap before optional background classification. This keeps
    // the learning loop useful when the runtime is slow or unavailable.
    recordQuestion(query, { inputType: 'text', status: 'received' });
  }
  result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  result.setAttribute('tabindex', '-1');
  result.focus({ preventScroll: true });
  if (ranked[0] && isStrongClaimMatch(ranked[0]) && !file) return;
  void classify(query, ranked, file);
});

mediaDropZone?.addEventListener('dragover', (event) => {
  event.preventDefault();
  mediaDropZone.classList.add('is-dragging');
});

mediaDropZone?.addEventListener('dragleave', (event) => {
  if (!mediaDropZone.contains(event.relatedTarget as Node | null)) mediaDropZone.classList.remove('is-dragging');
});

mediaDropZone?.addEventListener('drop', (event) => {
  event.preventDefault();
  mediaDropZone.classList.remove('is-dragging');
  const file = event.dataTransfer?.files?.[0];
  if (file) assignMediaFile(file);
});

form?.addEventListener('paste', (event) => {
  const file = Array.from(event.clipboardData?.files || []).find((item) => item.type.startsWith('image/'));
  if (!file) return;
  event.preventDefault();
  assignMediaFile(file);
});

fileInput?.addEventListener('change', () => {
  const selected = fileInput.files?.[0];
  if (fileName) fileName.textContent = selected ? selected.name : 'Sin archivo seleccionado.';
  if (mediaHelp) mediaHelp.dataset.fileSelected = selected ? 'true' : 'false';
  if (selected) form?.requestSubmit();
});

document.querySelectorAll<HTMLButtonElement>('[data-example]').forEach((button) => button.addEventListener('click', () => {
  if (input) { resetMediaSelection(); input.value = button.dataset.example || ''; form?.requestSubmit(); }
}));

mediaTriggers.forEach((trigger) => trigger.addEventListener('click', () => {
  if (!fileInput) return;
  fileInput.accept = trigger.dataset.mediaTrigger === 'audio' ? 'audio/*' : 'image/*';
}));

input?.addEventListener('input', updateCounter);
renderRecentChecks();
updateCounter();
const initialQuery = new URLSearchParams(window.location.search).get('q')?.trim() || '';
if (initialQuery && input) {
  input.value = initialQuery.slice(0, INPUT_LIMITS.maxTextCharacters);
  updateCounter();
  window.setTimeout(() => form?.requestSubmit(), 0);
}
