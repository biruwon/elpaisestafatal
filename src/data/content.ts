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
export type MarkdownClaimRecord = {
  slug:string; claim:string; assessment:string; topicSlugs:string[]; aliases:string[]; claimType:ClaimType;
  evidenceStrength:EvidenceStrength; geography:string; period:string; reviewed:string; status:PublicationStatus;
  body:string; whatIsTrue?:string; whatIsMissing?:string; scale?:string; cannotProve?:string; shareable?:string;
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
function structured(value: string | undefined): string | string[] { if (!value) return ''; try { const parsed=JSON.parse(value); return parsed; } catch { return value; } }
function section(body:string,title:string){const match=body.match(new RegExp(`## ${title}\\s*\\n+([\\s\\S]*?)(?=\\n## |$)`));return match?.[1].trim();}

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

const claimFiles = import.meta.glob('../../content/claims/*.md', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
export const markdownClaims: MarkdownClaimRecord[] = Object.entries(claimFiles).map(([path, raw]) => {
  const parsed=parseFrontmatter(raw); const data=parsed.data;
  return {
    slug:data.slug || path.split('/').pop()!.replace(/\.md$/, ''), claim:String(structured(data.claim) || ''), assessment:data.assessment || '',
    topicSlugs:(structured(data.topicSlugs) as string[]) || [], aliases:(structured(data.aliases) as string[]) || [], claimType:(data.claimType || 'mixed') as ClaimType,
    evidenceStrength:(data.evidenceStrength || 'medium') as EvidenceStrength, geography:data.geography || 'España', period:data.period || '', reviewed:data.reviewed || '', status:(data.status || 'planned') as PublicationStatus, body:parsed.body,
    whatIsTrue:section(parsed.body,'Qué es cierto'), whatIsMissing:section(parsed.body,'Qué falta'), scale:section(parsed.body,'Escala'), cannotProve:section(parsed.body,'Límite'), shareable:section(parsed.body,'Respuesta compartible'),
  };
}).sort((a,b)=>a.slug.localeCompare(b.slug));
