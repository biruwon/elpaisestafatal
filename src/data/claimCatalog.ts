import type { Source } from './concerns';
import { markdownClaims, type MarkdownClaimRecord } from './content';
import { getSource } from './registry';
import { getTopicPresentation } from './topicPresentation';

export type ClaimAssessment = 'true' | 'mostly-true' | 'misleading' | 'unsupported' | 'uncertain' | 'false';
export type ClaimType = 'descriptive' | 'comparative' | 'definition' | 'trend' | 'causal' | 'predictive' | 'legal' | 'normative' | 'mixed';
export type EvidenceStrength = 'high' | 'medium' | 'limited' | 'insufficient';

export type ClaimVerification = {
  slug: string;
  claim: string;
  assessment: ClaimAssessment;
  topic: string;
  topicSlug: string;
  topicSlugs: string[];
  whatIsTrue: string;
  whatIsMissing: string;
  scale: string;
  cannotProve: string;
  shareable: string;
  keywords: string[];
  aliases: string[];
  claimType: ClaimType;
  evidenceStrength: EvidenceStrength;
  decisiveEvidence: string;
  competingExplanations: string[];
  whyItCirculates: string;
  unknowns: string;
  evidenceCouldChange: string;
  valueDisagreement?: string;
  propositionIds: string[];
  relatedSlugs: string[];
  supports: string[];
  contradicts: string[];
  dependsOn: string[];
  geography: string;
  period: string;
  reviewed: string;
  published: boolean;
  sources: Source[];
  sourceRefs: string[];
  evidenceIds: string[];
  contextMode?: 'topic' | 'direct';
  visualType?: string;
  visualOrigin?: string;
  visualDestination?: string;
  visualAmount?: string;
  visualComparisonLabels?: string[];
  visualComparisonValues?: string[];
  visualComparisonUnit?: string;
};

const assessmentLabels: Record<ClaimAssessment, string> = {
  true: 'Verdadero',
  'mostly-true': 'Mayormente cierto',
  misleading: 'Generalización engañosa',
  unsupported: 'Sin respaldo suficiente',
  uncertain: 'Incierto',
  false: 'Falso',
};

const isAssessment = (value: string): value is ClaimAssessment => value in assessmentLabels;
const isClaimType = (value: string): value is ClaimType => ['descriptive', 'comparative', 'definition', 'trend', 'causal', 'predictive', 'legal', 'normative', 'mixed'].includes(value);
const isEvidenceStrength = (value: string): value is EvidenceStrength => ['high', 'medium', 'limited', 'insufficient'].includes(value);

const sourceFor = (id: string): Source | undefined => {
  const source = getSource(id);
  if (!source) return undefined;
  return { label: source.title, publisher: source.type, url: source.url, date: source.date };
};

const relatedFor = (record: MarkdownClaimRecord, records: MarkdownClaimRecord[]): string[] => {
  if (record.relatedSlugs.length) return record.relatedSlugs;
  const tokens = new Set([...record.aliases, ...record.topicSlugs]);
  return records
    .filter((other) => other.slug !== record.slug && other.status === 'published')
    .filter((other) => other.topicSlugs.some((topic) => record.topicSlugs.includes(topic)) || other.aliases.some((alias) => tokens.has(alias)))
    .slice(0, 6)
    .map((other) => other.slug);
};

const toClaim = (record: MarkdownClaimRecord, records: MarkdownClaimRecord[]): ClaimVerification => {
  const topicSlug = record.topicSlugs[0] || 'politica';
  const aliases = [...new Set(record.aliases)];
  const sources = record.sourceRefs.map(sourceFor).filter((source): source is Source => Boolean(source));
  const assessment = isAssessment(record.assessment) ? record.assessment : 'uncertain';
  const claimType = isClaimType(record.claimType) ? record.claimType : 'mixed';
  const evidenceStrength = isEvidenceStrength(record.evidenceStrength) ? record.evidenceStrength : 'insufficient';

  return {
    slug: record.slug,
    claim: record.claim,
    assessment,
    topic: getTopicPresentation(topicSlug).label,
    topicSlug,
    topicSlugs: record.topicSlugs,
    whatIsTrue: record.whatIsTrue || 'La ficha todavía no contiene una afirmación positiva revisada.',
    whatIsMissing: record.whatIsMissing || 'La ficha necesita evidencia directa adicional.',
    scale: record.scale || '',
    cannotProve: record.cannotProve || 'Los datos disponibles no permiten concluir más de lo indicado.',
    shareable: record.shareable || record.whatIsTrue || record.claim,
    keywords: [...new Set([...record.aliases, ...record.topicSlugs])],
    aliases,
    claimType,
    evidenceStrength,
    decisiveEvidence: record.scale || record.whatIsTrue || record.claim,
    competingExplanations: [],
    whyItCirculates: 'La afirmación combina una experiencia visible, una formulación política o una simplificación de una estadística.',
    unknowns: record.cannotProve || 'La evidencia disponible tiene límites que se explican en esta ficha.',
    evidenceCouldChange: 'Una nueva fuente primaria comparable, una revisión metodológica o un cambio relevante en el periodo analizado.',
    propositionIds: record.propositionIds,
    relatedSlugs: relatedFor(record, records),
    supports: record.supports,
    contradicts: record.contradicts,
    dependsOn: record.dependsOn,
    geography: record.geography || 'España',
    period: record.period || '',
    reviewed: record.reviewed || '',
    published: record.status === 'published',
    sources,
    sourceRefs: record.sourceRefs,
    evidenceIds: record.evidenceIds,
    contextMode: record.contextMode,
    visualType: record.visualType,
    visualOrigin: record.visualOrigin,
    visualDestination: record.visualDestination,
    visualAmount: record.visualAmount,
    visualComparisonLabels: record.visualComparisonLabels,
    visualComparisonValues: record.visualComparisonValues,
    visualComparisonUnit: record.visualComparisonUnit,
  };
};

/** Canonical published and planned claim catalogue derived from structured Markdown records. */
export const claims: ClaimVerification[] = markdownClaims.map((record) => toClaim(record, markdownClaims));
export { assessmentLabels };
export const getClaim = (slug: string) => claims.find((item) => item.slug === slug);
