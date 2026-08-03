import { isStrongClaimMatch, rankClaimIndex, type ClaimIndexEntry } from '../../src/data/claimIndex';

type PublishedReference = {
  kind: 'claim' | 'topic';
  slug: string;
  title: string;
  href: string;
  confidence: number;
};

const reference = (entry: ClaimIndexEntry & { confidence: number }): PublishedReference => ({
  kind: entry.kind,
  slug: entry.slug,
  title: entry.title,
  href: entry.href,
  confidence: entry.confidence,
});

/**
 * Resolves only reviewed, published claims. This is deliberately separate from
 * model classification: a deterministic match is safe to return before any
 * optional enrichment service is contacted.
 */
export const publishedClaimFallback = async (text: string, request: Request) => {
  const response = await fetch(new URL('/claim-catalog.json', request.url), {
    headers: { accept: 'application/json' },
  });
  if (!response.ok) return undefined;
  const entries = await response.json() as ClaimIndexEntry[];
  const ranked = rankClaimIndex(text, entries, 4);
  const primary = ranked[0];
  if (!primary || !isStrongClaimMatch(primary)) return undefined;

  return {
    status: 'published' as const,
    primary: reference(primary),
    alternatives: ranked.slice(1).map(reference),
  };
};
