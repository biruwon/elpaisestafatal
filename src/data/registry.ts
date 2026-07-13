export type SourceRecord = {
  id: string;
  title: string;
  url: string;
  date: string;
  type: string;
  body: string;
};

export type EvidenceRecord = {
  id: string;
  kind: string;
  sourceIds: string[];
  period: string;
  geography: string;
  unit: string;
  body: string;
};

const sourceFiles = import.meta.glob('../../content/sources/*.md', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
const evidenceFiles = import.meta.glob('../../content/evidence/*.md', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;

function parse(raw: string) {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  const data: Record<string, string> = {};
  if (!match) return { data, body: raw.trim() };
  for (const line of match[1].split('\n')) {
    const at = line.indexOf(':');
    if (at < 0) continue;
    data[line.slice(0, at).trim()] = line.slice(at + 1).trim().replace(/^['"]|['"]$/g, '');
  }
  return { data, body: match[2].trim() };
}

function list(value = ''): string[] {
  try { return JSON.parse(value); } catch { return value ? value.split(',').map((item) => item.trim()) : []; }
}

export const sourceRecords: SourceRecord[] = Object.entries(sourceFiles).map(([path, raw]) => {
  const { data, body } = parse(raw);
  return { id: data.id || path.split('/').pop()!.replace(/\.md$/, ''), title: data.title || '', url: data.url || '', date: data.date || '', type: data.type || 'other', body };
});

export const evidenceRecords: EvidenceRecord[] = Object.entries(evidenceFiles).map(([path, raw]) => {
  const { data, body } = parse(raw);
  return { id: data.id || path.split('/').pop()!.replace(/\.md$/, ''), kind: data.kind || 'other', sourceIds: list(data.sourceIds), period: data.period || '', geography: data.geography || 'España', unit: data.unit || '', body };
});

export const getSource = (id: string) => sourceRecords.find((source) => source.id === id);
export const getEvidence = (id: string) => evidenceRecords.find((evidence) => evidence.id === id);
