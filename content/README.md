# Markdown content contract

Markdown is the long-term source of truth for new investigations and claims.

Every record uses frontmatter with a unique `slug`, human-readable `title`, integer `order`, and explicit `status`. Published claims must additionally provide an assessment, review date, source references, evidence objects, limitations, geography and period. Claims are canonical records: a single claim may reference multiple topic slugs and related claims.

Claims are canonical Markdown records under `content/claims/`. `src/data/claimCatalog.ts` is a typed read model derived from those records for static pages and browser indexes; it does not contain a second hand-authored claim catalogue. `npm run validate:content` and the build-time relation checks validate the records and their evidence links.
