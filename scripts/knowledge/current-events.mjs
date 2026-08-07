const normalise = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

const officialHosts = new Set(['interior.gob.es', 'policia.es', 'guardiacivil.es', 'administracion.gob.es', 'ceuta.es', 'fiscal.es', 'boe.es']);
const corroborationHosts = new Set(['efe.com', 'rtve.es', 'europapress.es']);

export const currentEventSourceRole = (url) => {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    if ([...officialHosts].some((item) => host === item || host.endsWith(`.${item}`))) return 'primary';
    if ([...corroborationHosts].some((item) => host === item || host.endsWith(`.${item}`))) return 'corroboration';
  } catch { /* ignore malformed source URLs */ }
  return null;
};

export const detectCurrentEvent = (text) => {
  const value = normalise(text);
  const geography = value.match(/\b(ceuta|melilla|canarias|estrecho|frontera|espana|marruecos)\b/)?.[1];
  const temporal = /\b(hoy|ayer|anoche|esta semana|reciente|recientemente|actualmente|ahora|202[4-9]|20[3-9]\d)\b/.test(value);
  const eventLanguage = /\b(invasion|entrada|cruce|frontera|asalto|disturbio|detencion|agresion|violacion|violando|muertes?|heridos?|denunci|investigacion|incidente)\w*\b/.test(value);
  const allegation = /\b(violacion|violando|agresion|asesin|mat(?:aron|an)|robo|abus)\b/.test(value);
  const namedInstitution = /\b(gobierno|interior|policia|guardia civil|fiscalia|juzgado|tribunal)\b/.test(value);
  if (!(geography && (temporal || eventLanguage || allegation || namedInstitution))) return null;
  const neutral = value.replace(/\binvasion\b/g, 'entrada o cruce fronterizo').replace(/\bviolando\b|\bviolacion\b/g, 'agresion sexual').replace(/\bestan\b|\bcon la\b/g, '');
  const propositions = [];
  propositions.push({ id: 'event', text: `Qué ocurrió en ${geography}`, query: `${geography} entrada cruce fronterizo incidente reciente` });
  if (allegation) propositions.push({ id: 'allegation', text: 'Si se han denunciado o reportado agresiones sexuales', query: `${geography} denuncia agresion sexual mujeres` });
  if (allegation) propositions.push({ id: 'attribution', text: 'Si existe atribución oficial de responsabilidad a las personas que cruzaron', query: `${geography} policia fiscalia responsabilidad agresion sexual` });
  return { geography, period: temporal ? 'reciente' : undefined, neutral: neutral.trim(), propositions, urgency: allegation ? 'high' : 'normal' };
};

export const buildNeutralQueries = (frame) => frame?.propositions?.slice(0, 3).map((item) => item.query).filter(Boolean) || [];

export const classifyEventSources = (sources = []) => {
  const unique = new Map();
  for (const source of sources) {
    const role = source.role || currentEventSourceRole(source.url);
    if (!role || !source.url) continue;
    const key = source.originPublisher || source.publisher || new URL(source.url).hostname;
    if (!unique.has(key)) unique.set(key, { ...source, role });
  }
  const values = [...unique.values()];
  const primary = values.some((item) => item.role === 'primary');
  return { sources: values, status: primary ? 'officially_reported' : values.length >= 2 ? 'corroborated_report' : values.length === 1 ? 'single_report' : 'unconfirmed' };
};

export const eventStatusFor = (frame, sourcePacket) => ({
  type: 'event_status',
  event: { label: `Evento en ${frame.geography}`, geography: frame.geography, period: frame.period },
  propositions: frame.propositions.map((proposition) => ({ text: proposition.text, status: sourcePacket?.status || 'unconfirmed', evidenceIds: sourcePacket?.sources?.map((source) => source.id).filter(Boolean) || [], detail: sourcePacket?.detail })),
});
