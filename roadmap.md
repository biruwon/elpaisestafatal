# Scalable claim clarification roadmap

Updated: 2026-07-19

## Product goal

Turn the existing Astro site into a fast clarification tool for claims people encounter in conversations, family groups, bars, WhatsApp, social media, and online debates.

The promise is not that every claim receives a confident verdict. The promise is:

> Ask anything. We show what reliable public evidence establishes, what it does not establish, and what information is missing.

The user may write a claim in any wording, including blunt or politically loaded language. The system must preserve the user’s dignity, avoid repeating unnecessary insults, and never use an adjacent statistic as if it directly answered the claim.

## Architectural principles

- Keep Astro statically generated and deployed on Cloudflare Pages.
- Keep published claims, reviewed evidence, visual definitions, and editorial rules in Git.
- Add only narrow `/api/*` dynamic routes; do not convert the whole site to SSR.
- Run production inference and evidence retrieval on a dedicated local machine through Cloudflare Tunnel.
- Use local models for language understanding, extraction, and answer planning—not as the source of factual truth.
- Use deterministic code, structured evidence, source metadata, and hard coverage gates for conclusions.
- Return useful deterministic guidance immediately and upgrade it automatically when local analysis completes.
- Cache by canonical claim signature, evidence version, handler version, and model/schema version.
- Materialise popular reviewed answers into static Astro pages.
- Fail open to static guidance when the local machine, model, database, or dynamic API is unavailable.

## Current baseline

- 14 investigation/topic routes remain available.
- 202 Markdown claim records exist; 20 are published.
- 28 evidence records and 28 source records are currently linked.
- The browser has a deterministic claim index and automatic local classification support.
- Shared knowledge contracts and relation validation are now part of the build.
- `/api/resolve` and the local `/v1/resolve` boundary are available; `/api/classify` remains temporarily compatible.
- The current local embedding model configuration still needs installation and evaluation before semantic retrieval is considered active.
- The source warehouse now preserves real dated observations from INE `DATOS_TABLA` responses instead of indexing row metadata as measurements.
- Refresh resources can carry source-specific titles and aliases, which are included in derived retrieval indexes for long-tail wording such as `inflación`, `IPC`, and `PIB`.
- The unrelated untracked `docs/` directory is user-owned and must not be modified by this roadmap.

## Phase 1 — Knowledge contracts and migration

Status: started.

Create and enforce shared contracts for:

- claims and canonical aliases;
- atomic propositions;
- evidence records;
- source records;
- entities and aliases;
- metrics and data series;
- visual components;
- answer plans and resolve responses.

Migrate the 20 published claims first. Each claim must identify:

- factual, comparative, causal, predictive, legal, normative, or mixed type;
- proposition IDs;
- direct evidence IDs;
- source IDs;
- geography, population, period, unit, and limitations;
- what the evidence does not establish;
- related and cross-topic claims;
- review and knowledge versions.

Keep the existing TypeScript/Markdown bridge until the migrated output is equivalent. Do not publish a claim with missing evidence relations.

Required checks:

```text
missing relation
missing source
published claim with no evidence
displayed number without source
causal claim with only correlational evidence
stale or superseded evidence
geography or population mismatch
```

## Phase 2 — Deterministic fast path

Status: started.

Before using a model:

1. Normalize accents, punctuation, spelling variants, and common Spanish forms.
2. Check exact normalized-input and canonical-signature caches.
3. Search aliases, keywords, entities, numbers, dates, and known propositions.
4. Ignore generic context words such as `España` unless meaningful terms also match.
5. Apply a minimum score and margin threshold.
6. Require usable evidence before presenting a published answer.

The browser result states are:

- strong published match;
- qualified related guidance;
- partial relation with no false implication of coverage;
- uncovered claim with a useful clarification question;
- unavailable dynamic analysis while retaining deterministic guidance.

No weak match may be presented as an answer. For example, `España está destruida` must not return the tax claim.

## Phase 3 — Local claim compiler

Status: boundary implemented; compiler expansion pending.

Run the local service on a dedicated always-on machine. Package it with Docker Compose so the current Mac remains suitable for development.

Initial model baseline:

- a small Spanish-capable local chat model for structured extraction and planning;
- a local multilingual embedding model for retrieval;
- a local vision model for screenshots later;
- local speech-to-text later.

Benchmark the installed small models against a Spanish evaluation set and retain the smallest model that meets the quality threshold.

The compiler must produce strict JSON containing:

- original and normalized input;
- explicit propositions;
- implied propositions;
- claim type;
- entities and aliases;
- numbers, dates, geography, population, and period;
- retrieval hints;
- clarification requirements.

The model must not assess truth during extraction.

The answer planner receives only a validated evidence packet and returns an `AnswerPlan`. It must not generate HTML, unsupported numbers, uncited facts, or invented sources.

API:

```http
POST /api/v1/resolve
GET  /api/v1/resolve/:requestId
```

The frontend submits once and polls automatically when a request is processing. There is no second classification click.

## Phase 4 — Retrieval and evidence warehouse

Use local PostgreSQL with full-text search and pgvector initially. Cloudflare Vectorize is optional later; do not require it for the first production version.

Store:

- source documents and versions;
- entities;
- metrics and definitions;
- observations and data series;
- government events and budget transfers;
- legal rules with effective dates;
- evidence relationships;
- ingestion runs and parser versions;
- canonical claim clusters.

Use a rebuildable index. Git remains the reviewed source; the local database is a derived operational/search copy.

Initial trusted source connectors:

1. INE.
2. Eurostat.
3. BOE.
4. Council of Ministers.
5. Interior crime data.
6. Social Security and SEPE.
7. Finance and budget execution.
8. Banco de España.
9. CGPJ, Congress, and Senate.
10. Datos.gob.es as a discovery catalogue, not automatic proof.

Use deterministic parsers for APIs and stable tables. Use the local model only for irregular documents, constrained by schemas and validation.

## Phase 5 — Deterministic claim handlers

Implement reusable handlers instead of manually authored answers for every wording:

1. Quantity and proportion.
2. Trend.
3. Ranking and comparison.
4. Definition and measurement.
5. Budget transfer and government event.
6. Legal and policy rule.
7. Group comparison.
8. Causal claim.
9. Prediction.
10. Normative/value disagreement.

Each handler defines required fields, preferred sources, invalid inferences, coverage rules, calculations, and visual templates.

Evidence coverage must be computed from concrete attributes:

```text
directness
source authority
geography match
time match
population match
definition match
freshness
source agreement
extraction confidence
```

Never expose a fake truth percentage.

## Phase 6 — Newly published and long-tail claims

Use progressive retrieval:

```text
static published result
→ canonical cache
→ structured local evidence
→ indexed official documents
→ approved official-domain discovery
→ provisional partial answer
→ insufficient evidence
```

Automatically provide a provisional result only when:

- the source is accessible and attributable;
- core entities and definitions are resolved;
- geography and time match;
- every number is traceable;
- unsupported implications are separated;
- material contradictions are surfaced;
- the result passes schema and coverage validation.

When evidence is insufficient, explain exactly what record or measurement is missing. Save the request as a knowledge gap.

Popular provisional answers become permanent static pages only after the owner reviews the evidence packet.

## Phase 7 — Visual answer composition

Render structured, reusable components:

- claim breakdown;
- key number;
- trend line;
- ranking bars;
- group comparison;
- money flow;
- legal decision tree;
- evidence ladder;
- confirmed versus unknown;
- strongest valid concern;
- cannot conclude;
- conversation-ready reply;
- sources and limitations.

The visual type is selected by the handler, not improvised by the model. Units, dates, geography, population, caveats, and source links stay attached to every chart.

Reusable video/animated scenes are deferred until deterministic charts are reliable.

## Phase 8 — Links, screenshots, and audio

All inputs end in the same compiler:

```text
text / link / screenshot / audio
→ extracted text
→ propositions
→ evidence retrieval
→ handler
→ answer plan
→ shared result UI
```

Add SSRF protection, size limits, MIME validation, timeouts, temporary media retention, and generic public failure messages.

## Phase 9 — Learning, popularity, and materialisation

Cluster inputs by canonical proposition signature. Track:

- most asked;
- fastest growing;
- newly covered;
- still unresolved;
- high-impact knowledge gaps.

Rank the owner review queue using frequency, growth, potential harm, evidence availability, and feasibility.

Do not expose raw insulting submissions as public popular claims. Use neutral canonical wording.

When a cluster becomes popular and passes review:

```text
dynamic answer
→ owner review
→ Git knowledge record
→ Astro static route
→ cached aliases and visual plan
```

## Phase 10 — Production hardening

- Keep static Pages requests outside dynamic function routes.
- Protect the local origin through Cloudflare Tunnel and authenticated requests.
- Add rate limiting, request size limits, timeouts, retries, cancellation, and health checks.
- Back up PostgreSQL, D1, R2, and configuration manifests.
- Version knowledge, schemas, handlers, parsers, and models.
- Preserve all existing public URLs and route behavior.
- Monitor ingestion failures, stale evidence, cache hits, p95 latency, unsupported-conclusion rate, origin availability, and unresolved clusters.
- Commit and push every completed milestone; never include unrelated user files.

## Evaluation requirements

Maintain at least 300 Spanish test inputs covering:

- exact, informal, insulting, accentless, and misspelled claims;
- multiple propositions;
- numerical, trend, ranking, causal, legal, predictive, and normative claims;
- local anecdotes;
- left-wing and right-wing exaggerations;
- known, partial, new, and impossible-to-verify claims.

Measure proposition extraction, cluster accuracy, retrieval recall, irrelevant matches, evidence/citation correctness, unsupported-conclusion rate, coverage status, latency, cache hit rate, and graceful offline behavior.

Required regression cases:

- `España está destruida` does not return the tax claim.
- `España cobra demasiados impuestos` resolves to the tax claim when local classification is available.
- `El Gobierno quita 310 millones...` separates the verified transfer from unverified implications.
- No provider or model name appears in public UI or errors.
- No request stays indefinitely in a processing state.
- Every factual visual and sentence is traceable to evidence.

## Cost model

The early deployment can target zero Cloudflare spend, but it is not literally free:

- Static Pages delivery is free and unlimited.
- Free Workers/Pages Functions have daily request and CPU limits.
- Free D1 and R2 allowances can cover early operational data and snapshots.
- Local model inference avoids per-token API fees.
- A dedicated always-on machine, SSD, electricity, backups, Internet, and domain renewal still cost money.

The system must remain useful when free limits or the home origin are unavailable. Upgrade to paid Cloudflare services only when traffic, storage, reliability, or scheduled ingestion requires it.

## Implementation rules for Codex

1. Work only in `/Users/antonio/projects/bulos/elpaisestafatal`.
2. Implement one phase or vertical slice at a time.
3. Preserve current static routes and compatibility data during migration.
4. Run `npm run check`, `npm run build`, `npm run validate:content`, `npm run audit:roadmap`, and relevant smoke tests after each slice.
5. Run `git diff --check`.
6. Commit and push each completed slice to `origin/main`.
7. Leave unrelated untracked files untouched.
8. Do not expose local provider, model, tunnel, or implementation details to visitors.
