export type FreshnessStatus = 'fresh' | 'stale' | 'invalid' | 'unknown';
export type FreshnessSource = {
  retrievedAt?: string | null;
  schedule?: string | null;
  sourceRegistryId?: string | null;
  url?: string | null;
};
export type FreshnessRegistryEntry = { id: string; schedule?: string | null };

export function freshnessScheduleFor(source?: FreshnessSource, registry?: readonly FreshnessRegistryEntry[]): string;
export function freshnessMaxAgeDays(schedule?: string | null | { schedule?: string | null }): number;
export function staleActionForSchedule(schedule?: string | null): string;
export function sourceFreshness(source?: FreshnessSource, now?: number, registry?: readonly FreshnessRegistryEntry[]): FreshnessStatus;
export function staleSourceReason(source?: FreshnessSource, now?: number, registry?: readonly FreshnessRegistryEntry[]): string;
