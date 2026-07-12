# Roadmap baseline

Date: 2026-07-12

## Repository state

- Existing commit: `ad4d448 Added implementation roadmap`
- Static Astro output is configured for `https://elpaisestafatal.es`.
- The app currently exposes 14 concern pages, 20 verification pages, data CSV routes, and the existing editorial pages.
- Click/device tracking remains approved scope for this implementation. The implementation must document provider, purpose, retention and opt-out behavior.

## Baseline verification

The repository passes the pre-roadmap checks:

```text
npm run audit:investigations  # passes: 14 concerns; 12 structured, 2 in-progress
npm run check                 # 0 errors, 0 warnings, 0 hints
npm run build                 # 42 static pages built
git diff --check              # clean at baseline
```

## Current routes

- `/` homepage
- `/preocupaciones/[slug]` concern pages
- `/verificaciones/[slug]` claim pages (legacy product vocabulary)
- `/verificaciones` claim index
- `/datos/[slug].csv` data downloads
- `/acerca-de`, `/contacto`, `/fuentes`, `/metodologia`, `/privacidad`, `/revisiones`

## Roadmap gaps recorded before implementation

- Homepage still contains comparison, featured-investigation and methodology sections that the product specification removes from the primary flow.
- Claim routes use `/verificaciones` instead of the canonical `/afirmaciones` vocabulary and lack the required page hierarchy, breadcrumbs and related-claim model.
- Topic pages are long dossier-first pages rather than visual-first summaries with expandable depth.
- The global header exposes too many primary navigation items and has no dedicated search route.
- Topic presentation metadata, illustrations and reusable UI primitives are incomplete.
- Search is embedded only on the homepage and points to legacy claim routes.
- SEO structured data, social previews, generated share cards and revision/source inventories require a roadmap audit.
- Responsive, keyboard, reduced-motion and mobile QA artifacts are not yet recorded.

## Acceptance checklist

The roadmap is complete only when all 11 numbered milestones have independently reviewable commits, the canonical `/afirmaciones` routes work with legacy redirects, the homepage and topic/claim pages match the approved specs, analytics are disclosed and privacy-conscious, all 14 concerns remain discoverable, and the final audit passes checks, build, investigation audit, link/image checks and responsive/accessibility review.

