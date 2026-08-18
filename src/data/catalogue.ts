import { claims, type ClaimAssessment, type ClaimType, type EvidenceStrength } from './claimCatalog';
import { semanticQuerySignature } from '../lib/knowledge/querySignature';

/**
 * The single runtime shape for a public catalogue entry.
 *
 * Markdown remains the current editorial input during the migration; this
 * adapter is the only place that translates it into the new catalogue model.
 * The browser and API should consume this shape, never frontmatter directly.
 */
export type CatalogueBasis = 'sourced' | 'model';
export type CatalogueVisibility = 'searchable' | 'browsable' | 'hidden';

export type CatalogueCitation = {
  id: string;
  sourceId: string;
  sentenceIds: string[];
  excerpt?: string;
  publishedAt?: string;
  retrievedAt?: string;
};

export type CatalogueVisual = {
  type: 'line' | 'bar' | 'comparison' | 'money-flow' | 'none';
  title?: string;
  unit?: string;
  labels?: string[];
  values?: number[];
  evidenceIds: string[];
};

export type CatalogueEntry = {
  id: string;
  slug: string;
  claim: string;
  aliases: string[];
  answer: string;
  explanation: string;
  limitations: string[];
  reply: string;
  basis: CatalogueBasis;
  assessment?: ClaimAssessment;
  claimType?: ClaimType;
  evidenceStrength?: EvidenceStrength;
  geography?: string;
  period?: string;
  topicSlugs: string[];
  sourceRefs: string[];
  evidenceIds: string[];
  sources: Array<{ id: string; title: string; publisher: string; url: string; date?: string }>;
  citations: CatalogueCitation[];
  visual?: CatalogueVisual;
  generatedAt?: string;
  generatedBy?: string;
  evidenceVerifiedAt?: string;
  modelRegeneratedAt?: string;
  visibility: CatalogueVisibility;
  semanticFingerprint: string;
};

const clean = (value: string): string => value.replace(/[“”]/g, '').trim();

export const toCatalogueEntry = (claim: (typeof claims)[number]): CatalogueEntry => ({
  id: claim.slug,
  slug: claim.slug,
  claim: clean(claim.claim),
  aliases: [...new Set(claim.aliases.map(clean).filter(Boolean))],
  answer: claim.shareable,
  explanation: claim.whatIsTrue,
  limitations: [claim.whatIsMissing, claim.cannotProve].filter(Boolean),
  reply: claim.shareable,
  basis: claim.published ? 'sourced' : 'model',
  assessment: claim.assessment,
  claimType: claim.claimType,
  evidenceStrength: claim.evidenceStrength,
  geography: claim.geography,
  period: claim.period,
  topicSlugs: claim.topicSlugs,
  sourceRefs: claim.sourceRefs,
  evidenceIds: claim.evidenceIds,
  sources: claim.sources.map((source, index) => ({ id: claim.sourceRefs[index] || `${claim.slug}-source-${index + 1}`, title: source.label, publisher: source.publisher, url: source.url, date: source.date })),
  citations: [],
  visual: claim.visualType
    ? {
      type: claim.visualType === 'comparison' ? 'comparison' : claim.visualType === 'money_flow' ? 'money-flow' : 'none',
      labels: claim.visualComparisonLabels,
      values: claim.visualComparisonValues?.map(Number).filter(Number.isFinite),
      unit: claim.visualComparisonUnit,
      evidenceIds: claim.evidenceIds,
    }
    : undefined,
  visibility: claim.published ? 'browsable' : 'searchable',
  semanticFingerprint: semanticQuerySignature(`${claim.claim} ${claim.aliases.join(' ')}`),
});

export const catalogueEntries = claims.map(toCatalogueEntry);
export const publishedCatalogueEntries = catalogueEntries.filter((entry) => entry.basis === 'sourced');
export const catalogueEntry = (slug: string): CatalogueEntry | undefined => catalogueEntries.find((entry) => entry.slug === slug);
