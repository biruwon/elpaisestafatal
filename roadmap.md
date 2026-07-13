# Conversation clarifier roadmap

Updated: 2026-07-13

This roadmap evolves the site from a static catalogue of investigations and claims into a simple, evidence-based way to clarify statements people encounter in conversations, family groups, bars, WhatsApp and online.

The project remains an Astro static app deployed on Cloudflare Pages. The first usable version is deliberately hardcoded. Later phases may add local AI and richer inputs without turning the site into an unrestricted chatbot.

## Current project state

- 14 investigation/topic routes remain available.
- 20 claim routes are published.
- Additional planned topics and claims are documented separately in `docs/`.
- The current content and source bridge remain compatible during migration.
- No OpenAI runtime, analytics, query storage, accounts, subscriptions or user profiles are part of this roadmap.
- Images are deferred to a separate session; this roadmap does not authorize image generation.

## Phase 0 — Hardcoded conversation-clarifier MVP

### Goal

Show the intended final user experience with a small, reliable set of hardcoded claim families before building AI, databases or a backend.

### Entry point

Add a prominent homepage prompt such as:

> **¿De qué estáis discutiendo?**

Allow a visitor to write a claim in ordinary language, including a blunt or politically loaded formulation. Explain that it does not need to be precise or polite. Keep popular claims highly visible for visitors who arrive without a question.

### Initial hardcoded claim families

Use existing published material and reuse its current sources and charts. Start with three representative families:

1. Immigration and insecurity/crime.
2. Empty homes and the housing shortage.
3. Employment records and job quality.

The exact slugs should be selected from the existing published catalogue rather than creating duplicate claim pages.

### Matching

- Match exact wording, aliases, keywords and a few common colloquial formulations in the browser.
- Return the canonical claim or the closest approved claim family.
- Never invent a conclusion for an unmatched query.
- For no match, explain that the claim is not yet covered and show the closest popular claims and topics.
- Keep the matching deterministic and local to the static site.

### Result experience

The result should feel like a conversation clarification, not an article:

1. What the visitor is really asking.
2. The separate propositions contained in the wording.
3. What concern or experience may be real.
4. What the available evidence supports.
5. What the evidence does not establish.
6. One useful question that would make the disagreement testable.
7. A short neutral or conversational reply that can be copied.
8. The assessment and evidence coverage, without making the label the whole experience.
9. A small number of decisive visual facts or existing charts.
10. Sources, limitations and a link to the complete investigation.

Keep the result concise and visually scannable on mobile and desktop. Do not expose internal evidence objects or technical metadata to ordinary visitors.

### Phase 0 acceptance criteria

- A visitor can start from a claim or from a popular example.
- At least three hardcoded claim families produce distinct useful results.
- Informal aliases resolve to one canonical claim.
- Unmatched wording never produces fabricated facts.
- The result includes a claim clarification, evidence, limitation, copyable response and source links.
- Existing topic and claim routes remain available.
- The experience works responsively and has a useful no-JavaScript fallback.
- No model, server endpoint, database, analytics event or query log is introduced.

## Phase 1 — Static claim compiler

Keep the application fully static while making the hardcoded prototype more reusable.

- Add typed claim families with canonical wording, aliases and atomic propositions.
- Distinguish factual, causal, comparative, predictive, definitional and value claims.
- Extract topic, geography and period hints using deterministic rules where possible.
- Compose the result from reusable answer blocks rather than copying complete pages.
- Support multiple phrasings and cross-topic relationships without duplicate URLs.
- Keep all factual output tied to existing approved content and source references.
- Preserve the current TypeScript compatibility layer until Markdown parity is demonstrated.

This phase still has no local model, database or backend.

## Phase 2 — Markdown evidence graph

Make Markdown the long-term source of truth for reusable knowledge.

### Records

- Canonical claims and atomic propositions.
- Reusable evidence objects.
- Source references and source snapshots.
- Statistical series, legal texts, datasets, charts, definitions, studies and official reports.
- Relationships that support, contradict, qualify or contextualise propositions.
- Geography, period, unit, population and comparability caveats.

One evidence object must be reusable by multiple claims without duplicating the underlying explanation. Claim-specific pages must not use merely adjacent statistics as if they directly answered the claim.

Migrate the first three MVP families end-to-end, compare their rendered output with the existing pages, then migrate the remaining published claims in batches.

## Phase 3 — Local AI claim understanding

Only after the static experience is useful, add a local model for language understanding.

The model may:

- extract propositions from free-form Spanish;
- classify claim type;
- match wording to canonical claim families;
- identify geography and period;
- produce a structured answer plan.

The model must not invent sources, statistics or conclusions. The frontend should render only approved evidence and deterministic visual components. If coverage is partial or absent, the answer must say so and ask one useful clarifying question.

Ollama or another locally hosted runtime may be evaluated later. No OpenAI API dependency is introduced by this roadmap.

## Phase 4 — Visual answer composition

Improve answers without generating a bespoke article for every request.

- Render reusable key-number, comparison, trend, scale, caveat and claim-breakdown components.
- Select visual components according to the claim type and available evidence.
- Keep units, dates, geography, source and methodological caveats attached to every visual.
- Add reusable video or animated-chart scenes only after the static chart experience works.
- Cache common answer plans and visual outputs.

Do not generate images in this session. Image assets and prompts remain a separate task.

## Phase 5 — Additional input types

Feed different inputs into the same claim-understanding pipeline:

- pasted links;
- screenshots and social posts;
- audio or voice transcription.

Each adapter should extract claims and then use the same canonical propositions, evidence and visual renderer. Do not build separate answer systems for each input type.

## Phase 6 — Scale and knowledge gaps

Only after explicit approval, consider storing anonymised query patterns to identify:

- frequently asked claim families;
- rapidly growing questions;
- newly covered questions;
- popular questions with insufficient evidence.

This phase is deferred. No analytics, query collection, subscriptions, alerts or personalisation should be added before it is separately approved.

## Phase 7 — Production hardening

- Preserve all existing public URLs and static deployment behaviour.
- Test generated routes, redirects, canonical metadata and sitemap entries.
- Test mobile and desktop layouts, keyboard navigation, focus states and no-JavaScript fallbacks.
- Verify every displayed source URL, date, unit and caveat.
- Test Cloudflare Pages deployment and caching after each release.
- Keep the app anonymous and free of accounts, comments and unrestricted chat.

## Out of scope for the first MVP

- Local AI inference.
- Database or server endpoint.
- Screenshot, link or audio ingestion.
- Query analytics or user tracking.
- Accounts, comments, subscriptions or topic following.
- Municipality-level personalisation.
- Public current-debate or event pages.
- Generated images or bespoke videos.
- Replacing the existing investigation archive.

## Implementation rules

1. Implement Phase 0 first and stop for a real browser review before starting Phase 1.
2. Use existing published claims, evidence and charts wherever possible.
3. Keep each phase independently deployable and reversible.
4. Run `npm run check`, `npm run build`, relevant content audits and `git diff --check` after each phase.
5. Do not add a technical layer until the preceding user experience demonstrates clear value.
6. Keep the public answer short; leave the complete investigation as an optional evidence layer.
