export type PublicationStatus = 'published' | 'planned' | 'in-progress';
export type ClaimType = 'descriptive' | 'comparative' | 'causal' | 'predictive' | 'legal' | 'normative' | 'mixed';
export type EvidenceStrength = 'high' | 'medium' | 'limited' | 'insufficient';

export type TopicRecord = {
  slug: string;
  title: string;
  order: number;
  status: PublicationStatus;
  claimCount: number;
  body: string;
};

const topicFiles = import.meta.glob('../../content/topics/*.md', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;

function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw.trim() };
  const data: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const separator = line.indexOf(':');
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim();
    data[key] = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
  }
  return { data, body: match[2].trim() };
}

export const plannedTopics: TopicRecord[] = Object.entries(topicFiles)
  .map(([path, raw]) => {
    const parsed = parseFrontmatter(raw);
    return {
      slug: parsed.data.slug || path.split('/').pop()!.replace(/\.md$/, ''),
      title: parsed.data.title || parsed.data.slug || 'Untitled topic',
      order: Number(parsed.data.order || 999),
      status: (parsed.data.status || 'planned') as PublicationStatus,
      claimCount: Number(parsed.data.claimCount || 0),
      body: parsed.body,
    };
  })
  .sort((a, b) => a.order - b.order);

export const getPlannedTopic = (slug: string) => plannedTopics.find((topic) => topic.slug === slug);
