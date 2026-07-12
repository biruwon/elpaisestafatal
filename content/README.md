# Markdown content contract

Markdown is the long-term editorial source of truth for new investigations and claims.

Every record uses frontmatter with a unique `slug`, human-readable `title`, integer `order`, and explicit `status`. Published claims must additionally provide an assessment, review date, source references, evidence objects, limitations, geography and period. Claims are canonical records: a single claim may reference multiple topic slugs and related claims.

The current 20 published claims remain in `src/data/claims.ts` as a compatibility layer while their field-for-field Markdown migration is completed. `npm run validate:content` validates the new topic records now; the claim validator is already enforced at build time and will become the Markdown validator when those records move.
