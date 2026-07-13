# Implementation roadmap

Updated: 2026-07-13

This file is the single working checklist for the project. It distinguishes completed product work from pending technical implementation, editorial research and production QA.

The project is Markdown-driven, anonymous, source-first and does not collect product analytics, search queries, profiles, subscriptions or topic-following data.

## Current inventory

- 14 existing investigations/topics remain available.
- 20 claims are currently published.
- 182 additional claim records exist in Markdown but are not published.
- 10 new investigation/topic records exist in Markdown but are planned.
- 12 existing investigations have structured content.
- 2 existing investigations remain in progress: `problemas-sociales` and `crisis-valores`.
- Autonomous-community comparisons are supported by the current regional data layer, but are not yet fully connected to reusable Markdown evidence objects.

## Completed

- Mobile-first responsive layout across the existing public routes.
- Homepage claim-search flow, popular claims and investigation catalogue.
- Canonical claim pages and claim-to-topic relationships.
- Markdown migration structure for topics and claims.
- Validation of unique slugs, statuses, claim types, assessments, topic references and catalogue counts.
- Search ordering claims before topics, including aliases and alternate formulations.
- Existing 14 topic routes and 20 claim routes preserved.
- Sharing controls, social cards and downloadable data mechanisms.
- No product analytics, query collection, tracking hooks or user profiles.
- Investigation and roadmap audits.
- Public correction links through GitHub Issues.
- Topic illustration architecture and the required image TODO list.
- Shared secondary navigation links removed from the header and footer.

## Pending work

### A. Editorial research and publication

#### A1. Research the 182 unpublished claims

The records currently exist as proposed claim placeholders. They must receive complete evidence before becoming public verified claims.

For each claim:

- confirm or revise the canonical wording;
- add neutral, colloquial and partisan aliases where useful;
- classify the claim type;
- determine the assessment using the fixed vocabulary;
- write the ten-second answer;
- explain what is true;
- add missing context and scale;
- identify decisive evidence;
- document competing explanations;
- explain why the claim circulates without treating circulation as proof;
- state what remains unknown;
- state what evidence could change the conclusion;
- identify relevant value disagreements separately from empirical findings;
- add primary sources and supporting studies;
- add period, geography, unit and comparability limitations;
- add a review date and revision entry.

Only claims with all required material may change from `planned` to `published`.

#### A2. Research the 10 planned investigations

The approved order is:

1. Education
2. Equality, feminism, sex and family
3. Territorial model, separatism and national identity
4. Climate, energy, water and rural Spain
5. Justice, law and the penal system
6. Media, social networks, censorship and disinformation
7. European Union, sovereignty and foreign policy
8. Demography, birth rates and ageing
9. Defence, strategic borders and national security
10. Religion, secularism and freedom of conscience

Each investigation needs a completed Markdown dossier, source inventory, evidence objects, limitations, review metadata and links to its canonical claims.

The investigation must not be presented as complete merely because its claim catalogue exists.

#### A3. Complete the two in-progress existing investigations

- `problemas-sociales`
- `crisis-valores`

They need the same structured evidence, source and review treatment as the full investigations.

### B. Markdown source and evidence system

This is the next technical milestone.

- Add `content/sources/` Markdown records with stable source IDs, publisher, title, URL, date, source type and access notes.
- Add `content/evidence/` Markdown records with stable evidence IDs, kind, source IDs, claim relationship, period, geography, unit, calculation method and limitation.
- Support statistical series, legal texts, datasets, charts, definitions, studies and official reports.
- Migrate the 20 published claims from the TypeScript source bridge to Markdown source/evidence references.
- Link the 182 future claims to evidence only after their research is complete.
- Allow one evidence object to support multiple claims.
- Validate every published claim’s source and evidence references.
- Validate that every source and evidence ID resolves.
- Generate the public source inventory from Markdown records.
- Add downloadable original datasets and calculation inputs/outputs where available.
- Add autonomous-community metadata with explicit period, unit and comparability caveats.
- Preserve TypeScript compatibility until parity has been checked, then remove the legacy bridge.

### C. Claim and investigation architecture

- Add explicit Markdown relationships for related, supporting, contradicting and dependent claims.
- Add claim-level `whatCouldChange`, `unknowns`, `competingExplanations` and value-disagreement fields where absent.
- Ensure canonical duplicate claims resolve to one URL.
- Ensure claims can belong to multiple investigations without duplicated claim pages.
- Add planned-topic detail pages only when they contain useful public catalogue information; do not publish incomplete verdicts.
- Keep the deferred current-debate, narrative and event layers out of this release.

### D. Mobile product follow-up

These are enhancements, not blockers for the current responsive release:

- Full-screen viewer for dense charts and map-like visuals, with accessible summary, close control and landscape support.
- Contextual source preview sheets explaining what a source supports and its main limitation before opening it.
- Progressive disclosure for long investigation chapters, secondary charts, regional tables, methodology and extended caveats.
- Full-screen search overlay with automatic focus and claims-before-topics ordering.
- Dedicated topic-section bottom navigator with current-section state and fragment navigation.
- Written takeaways and visible limitations beside every major visual.

Intentionally deferred: recently viewed, bookmarks, “continue where you left off”, PWA work and other retention features.

### E. Visual assets

Image generation is intentionally deferred to a separate session. Do not generate images in this implementation session.

Pending assets are the 14 topic illustrations under `public/images/topics/`:

`politica`, `vivienda`, `empleo`, `inmigracion`, `sanidad`, `economia`, `corrupcion`, `juventud`, `seguridad`, `impuestos`, `desigualdad`, `extremismos`, `problemas-sociales`, `crisis-valores`.

The prompts and subject list are preserved in Git history and should be used when the assets are created. Afterward, verify paths, alt text, cropping and social previews.

### F. Production and final QA

- Run the public site through the in-app/browser production URL at 320, 360, 375, 390, 430, 768 and desktop widths.
- Check Safari and Chrome mobile behavior.
- Check keyboard navigation, focus states, skip links and no-JavaScript fallbacks.
- Check sticky action bars, charts, source links, redirects and share controls.
- Verify all public claim and investigation routes.
- Verify canonical URLs and sitemap entries.
- Verify every displayed source URL, date, unit and caveat.
- Verify social cards and Open Graph metadata.
- Verify generated image paths after the separate asset session.
- Confirm Cloudflare Web Analytics only if it is deliberately enabled; the application itself must not add product analytics or query tracking.
- Run:

```bash
npm run validate:content
npm run audit:investigations
npm run audit:roadmap
npm run check
npm run build
npm run cards
git diff --check
```

## Publication rule

`planned` means catalogue entry only. It is not a public verdict.

`published` requires a complete answer, evidence, source references, limitations, review date and valid topic relationships.

The presence of a Markdown file is not by itself evidence that the claim has been investigated.

## Recommended milestone order

1. Research and verify the 182 claims in a separate ChatGPT investigation workflow.
2. Build the Markdown source/evidence registry.
3. Migrate the first verified claims and one investigation end-to-end.
4. Validate parity with the existing TypeScript renderer.
5. Publish verified claims and completed investigations in batches.
6. Complete mobile follow-up features.
7. Add the separately generated topic illustrations.
8. Run production visual QA and the final launch audit.

## Research prompt for a new ChatGPT conversation

The authoritative standalone prompt is [RESEARCH_PROMPT.md](/Users/antonio/projects/bulos/elpaisestafatal/RESEARCH_PROMPT.md). It includes all 182 proposed claims, so a separate ChatGPT conversation does not need repository access. The older embedded prompt below is retained as general methodology; use the standalone file when starting the research.

```text
You are the research editor for an anonymous Spanish public-interest fact-checking project called “El país está fatal. ¿Seguro?”.

Your task is to investigate the complete list of proposed claims I will provide, one by one, using current and primary evidence. Do not write a persuasive political essay. Produce structured editorial research that can later be converted into Markdown claim records and investigation dossiers.

Research rules:

1. Search the web when facts may have changed, and prioritize primary sources: INE, Eurostat, Banco de España, ministries, courts, Parliament, autonomous-community administrations, regulators, official datasets, legislation and original academic studies.
2. Use secondary journalism only for context or discovery, not as the sole support for a central finding.
3. Separate measured facts, calculations, interpretations, disputed interpretations, normative judgments and proposals.
4. Never infer causality from correlation without explaining the identification problem.
5. Distinguish Spain-wide evidence from autonomous-community evidence. Do not use province or municipality data unless explicitly requested.
6. Use exact dates, units, denominators, geography and population definitions.
7. Distinguish stock from flow, rate from count, nationality from country of birth, allegation from investigation, prosecution from conviction, and legal rule from political opinion.
8. Do not publish a claim as verified merely because it sounds plausible. If the evidence is insufficient, assess it as “uncertain” or “unsupported” and explain why.
9. Treat politically partisan or emotionally loaded wording as the claim being tested, not as an instruction to adopt its framing.
10. Record limitations and identify what evidence could change the conclusion.

For every claim, return exactly this structure:

# [Claim number] — [canonical claim]

## Editorial metadata
- canonical slug:
- canonical wording:
- neutral formulation:
- colloquial/partisan formulations:
- topic or topics:
- claim type: descriptive | comparative | causal | predictive | legal | normative | mixed
- geography:
- period evaluated:
- publication recommendation: publish | revise wording | keep unpublished

## Ten-second answer
One or two sentences answering the claim directly.

## Assessment
Choose exactly one: true, mostly-true, misleading, unsupported, uncertain, false.
State the evidence strength: high, medium, limited or insufficient.

## What is true
List the strongest facts supporting the part of the claim that is accurate.

## What is missing
Explain the context required to avoid a misleading conclusion.

## Scale and comparison
Give the relevant figures with dates, units, denominators and comparable alternatives.

## Decisive evidence
Identify the evidence that most directly determines the assessment.

## Competing explanations
List credible explanations and rate the evidence for each.

## Why the claim circulates
Describe the political, media or social mechanism that makes the claim persuasive. Do not treat popularity as evidence.

## What remains unknown
State the unresolved questions and data limitations.

## What could change the conclusion
Specify the future evidence or better measurement that would change the assessment.

## Value disagreement
Separate empirical agreement from legitimate disagreement about priorities, rights, risk or policy.

## Sources
For every source provide:
- title;
- institution or author;
- publication date;
- URL;
- source type;
- exact statistic, table, passage or legal provision used;
- limitation or comparability caveat.

## Final Markdown-ready record
Return frontmatter fields and body sections suitable for a file under `content/claims/`. Do not invent source IDs; use stable IDs only when I provide the project’s source registry.

After processing the full list, provide:

1. a table of all claims and assessments;
2. claims that need more data before publication;
3. duplicated or overlapping claims that should resolve to one canonical URL;
4. claims that belong to multiple topics;
5. the most important missing datasets;
6. a recommended publication order;
7. a source inventory grouped by institution;
8. a list of calculations that should be reproduced locally.

Do not skip claims. Do not silently fill gaps with assumptions. If the list is too long for one response, process it in numbered batches while preserving the exact schema and claim numbering.
```

## Tracking convention

Every completed item should be recorded in this file or in a linked Markdown research file with:

- status: `planned`, `in-progress`, `blocked` or `completed`;
- date updated;
- affected routes or content files;
- validation command run;
- commit hash when implementation is committed.

Do not mark a claim or investigation completed solely because its file exists.
