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
