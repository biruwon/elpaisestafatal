import { normaliseClaimText } from '../../data/claimIndex';

export type CanonicalClaimSignature = {
  claimType?: string;
  propositionKeys: string[];
  entities: string[];
  geography?: string;
  period?: string;
};

export const canonicalClaimSignature = (value: CanonicalClaimSignature): string => JSON.stringify({
  claimType: value.claimType || 'unknown',
  propositionKeys: [...new Set(value.propositionKeys.map(normaliseClaimText))].filter(Boolean).sort(),
  entities: [...new Set(value.entities.map(normaliseClaimText))].filter(Boolean).sort(),
  geography: value.geography ? normaliseClaimText(value.geography) : undefined,
  period: value.period ? normaliseClaimText(value.period) : undefined,
});
