import { claimIndexEntries } from '../data/claimIndexData';

export const prerender = true;

export const GET = (): Response => Response.json(claimIndexEntries, {
  headers: { 'Cache-Control': 'public, max-age=300' },
});
