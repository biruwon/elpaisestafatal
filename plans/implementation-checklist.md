# Web improvements implementation checklist

> Improvement 7 («Qué ha cambiado») was explicitly removed from scope by the project owner on 12 July 2026. No dashboard or archive will be implemented.

Approved implementation sequence for `plans/improvements.md`.

- [ ] 1. Claim-checking homepage and deterministic curated search.
- [ ] 2. Sixty-second answer layer on all 14 concerns.
- [ ] 3. Exactly 20 standalone verification pages.
- [ ] 4. Comparable CIS concern modes with reproducible calculations.
- [ ] 5. Explicit epistemic labels and evidence-strength tables.
- [ ] 6. Trust, provenance, complete sources, revisions and corrections.
- [ ] 7. Curated “what changed” dashboard and archive.
- [ ] 8. Investigation-depth status and five featured investigations.
- [ ] 9. Autonomous-community comparisons for five topics.
- [ ] 10. Share, citation, CSV, image and embed tools.
- [ ] 11. Brand repositioned as “El país está fatal. ¿Seguro?”.

## Global acceptance criteria

- Every numbered improvement is one independently revertible commit.
- Every commit passes `npm run audit:investigations`, `npm run check`, `npm run build` and `git diff --check`.
- The site continues to expose exactly 14 concerns and preserves existing concern URLs.
- Search and verification content is curated; no generated or unrestricted answers.
- No accounts, comments, subscriptions, following system or analytics.
- Geographic comparisons stop at autonomous-community level and cover only housing, employment, poverty, healthcare and crime.
- Corrections use public GitHub Issues; project identity remains anonymous and discloses no external funding.
