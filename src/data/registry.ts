import { normaliseSourceTitle } from './sourceTitle';

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
  summary: string;
  limitation: string;
  relationships: EvidencePropositionLink[];
};

export type EvidencePropositionLink = {
  evidenceId: string;
  propositionId: string;
  relationship: 'supports' | 'contradicts' | 'qualifies' | 'context' | 'insufficient';
  reviewStatus: 'unreviewed' | 'reviewed' | 'superseded';
  reviewedAt?: string;
};

export const relationshipGuidance: Record<EvidencePropositionLink['relationship'], string> = {
  supports: 'Este registro mide directamente la proposición enlazada, dentro de su periodo, ámbito y definición.',
  contradicts: 'Este registro muestra un resultado incompatible con la formulación enlazada en la medida indicada.',
  qualifies: 'Este registro añade una condición o límite importante; no demuestra por sí solo toda la afirmación.',
  context: 'Este registro ayuda a situar la conversación, pero no comprueba por sí solo la proposición.',
  insufficient: 'Este registro es relevante, pero no contiene la medida necesaria para resolver la proposición.',
};

const sourceFiles = import.meta.glob('../../content/sources/*.md', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
const evidenceFiles = import.meta.glob('../../content/evidence/*.md', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
import relationshipManifest from '../../content/relationships/evidence-proposition-links.json';

const relationshipsByEvidence = new Map<string, EvidencePropositionLink[]>();
for (const link of relationshipManifest.links as EvidencePropositionLink[]) {
  const existing = relationshipsByEvidence.get(link.evidenceId) || [];
  existing.push(link);
  relationshipsByEvidence.set(link.evidenceId, existing);
}

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

function section(body: string, heading: string): string {
  const match = body.match(new RegExp(`## ${heading}\\s*\\n+([\\s\\S]*?)(?=\\n## |$)`));
  return match?.[1].replace(/\\s+/g, ' ').trim() || '';
}

function evidenceSummary(body: string): string {
  const paragraph = body.split(/\\n\\s*\\n/).map((item) => item.replace(/\\s+/g, ' ').trim()).find((item) => item && !item.startsWith('##'));
  return paragraph || body.replace(/\\s+/g, ' ').trim();
}

export const sourceRecords: SourceRecord[] = Object.entries(sourceFiles).map(([path, raw]) => {
  const { data, body } = parse(raw);
  return { id: data.id || path.split('/').pop()!.replace(/\.md$/, ''), title: normaliseSourceTitle(data.title || ''), url: data.url || '', date: data.date || '', type: data.type || 'other', body };
});

export const evidenceRecords: EvidenceRecord[] = Object.entries(evidenceFiles).map(([path, raw]) => {
  const { data, body } = parse(raw);
  const id = data.id || path.split('/').pop()!.replace(/\.md$/, '');
  return { id, kind: data.kind || 'other', sourceIds: list(data.sourceIds), period: data.period || '', geography: data.geography || 'España', unit: data.unit || '', body, summary: evidenceSummary(body), limitation: section(body, 'Límite') || section(body, 'Limitación'), relationships: relationshipsByEvidence.get(id) || [] };
});

export const getSource = (id: string) => sourceRecords.find((source) => source.id === id);
export const getEvidence = (id: string) => evidenceRecords.find((evidence) => evidence.id === id);
