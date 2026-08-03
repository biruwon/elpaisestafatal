import { isStrongClaimMatch, rankClaimIndex, type ClaimIndexEntry } from '../../src/data/claimIndex';

type PublishedReference = {
  kind: 'claim' | 'topic';
  slug: string;
  title: string;
  href: string;
  confidence: number;
};

let claimIndexPromise: Promise<ClaimIndexEntry[] | undefined> | undefined;

const reference = (entry: ClaimIndexEntry & { confidence: number }): PublishedReference => ({
  kind: entry.kind,
  slug: entry.slug,
  title: entry.title,
  href: entry.href,
  confidence: entry.confidence,
});

const hasReviewedEvidence = (entry: ClaimIndexEntry): boolean => Boolean(
  entry.kind === 'topic'
  || (entry.evidenceStrength && entry.evidenceStrength !== 'insufficient' && (entry.evidenceIds?.length || entry.sourceRefs?.length)),
);

/**
 * Resolves only reviewed, published claims. This is deliberately separate from
 * model classification: a deterministic match is safe to return before any
 * optional enrichment service is contacted.
 */
export const publishedClaimFallback = async (text: string, request: Request) => {
  if (!claimIndexPromise) {
    claimIndexPromise = fetch(new URL('/claim-catalog.json', request.url), {
      headers: { accept: 'application/json' },
    }).then(async (response) => {
      if (!response.ok) return undefined;
      const entries = await response.json();
      return Array.isArray(entries) ? entries as ClaimIndexEntry[] : undefined;
    }).catch(() => undefined);
  }
  const entries = await claimIndexPromise;
  if (!entries) {
    claimIndexPromise = undefined;
    return undefined;
  }
  const ranked = rankClaimIndex(text, entries, 4);
  const primary = ranked[0];
  if (!primary || !isStrongClaimMatch(primary)) return undefined;

  return {
    status: 'published' as const,
    primary: reference(primary),
    alternatives: ranked.slice(1).map(reference),
  };
};

/**
 * Supplies nearby reviewed context while keeping the public result uncovered.
 * A nearby title is never enough on its own: claim context needs usable linked
 * evidence, and topic context is deliberately limited to a strong topic match.
 */
export const publishedRelatedContext = async (text: string, request: Request): Promise<PublishedReference[]> => {
  if (!claimIndexPromise) {
    claimIndexPromise = fetch(new URL('/claim-catalog.json', request.url), {
      headers: { accept: 'application/json' },
    }).then(async (response) => {
      if (!response.ok) return undefined;
      const entries = await response.json();
      return Array.isArray(entries) ? entries as ClaimIndexEntry[] : undefined;
    }).catch(() => undefined);
  }
  const entries = await claimIndexPromise;
  if (!entries) {
    claimIndexPromise = undefined;
    return [];
  }
  return rankClaimIndex(text, entries, 4)
    .filter((entry) => entry.score >= 36 && hasReviewedEvidence(entry))
    .slice(0, 3)
    .map(reference);
};
