const normalise = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
import { liveSourceForHost } from './source-registry.mjs';

export const currentEventSourceRole = (url) => {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return liveSourceForHost(host)?.role || null;
  } catch { /* ignore malformed source URLs */ }
  return null;
};

export const detectCurrentEvent = (text) => {
  const value = normalise(text);
  const geography = value.match(/\b(ceuta|melilla|canarias|estrecho|frontera|espana|marruecos)\b/)?.[1];
  const year = value.match(/\b(?:19|20|21)\d{2}\b/)?.[0];
  const temporal = /\b(hoy|ayer|anoche|esta semana|reciente|recientemente|actualmente|ahora)\b/.test(value);
  const eventLanguage = /\b(invasion|entrada|cruce|frontera|asalto|disturbio|detencion|agresion|agredid|violacion|violando|asesin|mat(?:aron|an)|robo|muertes?|heridos?|denunci|investigacion|incidente|accidente|inundacion|incendio)\w*\b/.test(value);
  const borderEvent = /\b(invasion|cruce|frontera|fronteriz\w*|patera\w*|migran\w*|inmigran\w*)\b/.test(value);
  const sexualAssault = /\b(violacion\w*|violando|agresion(?:es)? sexual(?:es)?|abusos? sexual(?:es)?)\b/.test(value);
  const assault = sexualAssault || /\b(agresion\w*|agredid\w*)\b/.test(value);
  if (!(geography && eventLanguage)) return null;
  const neutral = value.replace(/\binvasion\b/g, 'entrada o cruce fronterizo').replace(/\bviolando\b|\bviolacion\b/g, 'agresion sexual').replace(/\bestan\b|\bcon la\b/g, '');
  const propositions = [];
  propositions.push({ id: 'event', text: `Qué ocurrió en ${geography}`, query: borderEvent ? `${geography} entrada cruce fronterizo incidente ${year || 'reciente'}` : `${neutral.trim().slice(0, 180)} comunicado oficial` });
  const assaultLabel = sexualAssault ? 'agresiones sexuales' : 'agresiones';
  if (assault) propositions.push({ id: 'allegation', text: `Si se han denunciado o reportado ${assaultLabel}`, query: `${geography} denuncia ${assaultLabel} ${year || ''}`.trim() });
  if (assault && borderEvent) propositions.push({ id: 'attribution', text: 'Si existe atribución oficial de responsabilidad a las personas que cruzaron', query: `${geography} policia fiscalia responsabilidad ${assaultLabel} ${year || ''}`.trim() });
  return { geography, period: year || (temporal ? 'reciente' : undefined), neutral: neutral.trim(), propositions, urgency: assault ? 'high' : 'normal' };
};

export const buildNeutralQueries = (frame) => frame?.propositions?.slice(0, 3).map((item) => item.query).filter(Boolean) || [];

export const classifyEventSources = (sources = [], { now = Date.now(), maxAgeDays = 14 } = {}) => {
  const unique = new Map();
  for (const source of sources) {
    const role = source.role || currentEventSourceRole(source.url);
    if (!role || !source.url) continue;
    const key = source.originPublisher || source.publisher || new URL(source.url).hostname;
    if (!unique.has(key)) unique.set(key, { ...source, role });
  }
  const values = [...unique.values()];
  const stale = values.length > 0 && values.every((item) => item.publishedAt && Number.isFinite(Date.parse(item.publishedAt)) && now - Date.parse(item.publishedAt) > maxAgeDays * 86400000);
  const stages = new Set(values.map((item) => item.stage).filter(Boolean));
  const conflicting = values.some((item) => item.status === 'disputed' || item.conflict === true);
  const primary = values.some((item) => item.role === 'primary');
  const status = conflicting ? 'disputed' : stale ? 'context_only' : primary ? 'officially_reported' : values.length >= 2 ? 'corroborated_report' : values.length === 1 ? 'single_report' : 'unconfirmed';
  return { sources: values, status, stages: [...stages] };
};

// Search results supply titles and URLs, not verified evidence that a
// particular proposition occurred. A trusted publisher or several hits do
// not by themselves establish reporting, corroboration, or legal stages.
export const classifyEventSearchLeads = (sources = []) => ({
  sources: classifyEventSources(sources).sources,
  status: 'unconfirmed',
  stages: [],
  detail: 'Los enlaces son resultados de búsqueda; aún no se ha comprobado que documenten esta parte de la afirmación.',
});

export const eventStatusFor = (frame, sourcePacket) => ({
  type: 'event_status',
  event: { label: `Evento en ${frame.geography}`, geography: frame.geography, period: frame.period },
  propositions: frame.propositions.map((proposition) => {
    const packet = sourcePacket?.[proposition.id] || sourcePacket;
    return { text: proposition.text, status: packet?.status || 'unconfirmed', evidenceIds: packet?.sources?.map((source) => source.id).filter(Boolean) || [], detail: packet?.detail, stages: packet?.stages || [] };
  }),
});
