# Scalable claim clarification roadmap

Updated: 2026-08-03

## Product goal

Turn the existing Astro site into a fast clarification tool for claims people encounter in conversations, family groups, bars, WhatsApp, social media, and online debates.

The promise is not that every claim receives a confident verdict. The promise is:

> Ask anything. We show what reliable public evidence establishes, what it does not establish, and what information is missing.

The user may write a claim in any wording, including blunt or politically loaded language. The system must preserve the user’s dignity, avoid repeating unnecessary insults, and never use an adjacent statistic as if it directly answered the claim.

## Product and coverage expansion directive

Status: started.

The roadmap now includes a full product-management and UX workstream. The site must feel like a useful daily claim checker for Spain, not a catalogue of investigations.

The experience must:

- make **Comprobar** the primary navigation and homepage action;
- accept a blunt, incomplete, pasted, linked, screenshot, or audio claim without demanding a special formulation;
- make the first result scannable in seconds: what matched, what the evidence supports, what remains open, and what to say next;
- keep provisional analysis visibly separate from published evidence;
- expose popular claims and topic entry points without turning the homepage into a wall of text;
- provide clear paths for checking, browsing claims, exploring themes, and reading the method;
- meet keyboard, focus, mobile, reduced-motion, and screen-reader expectations;
- preserve the user’s original wording while using neutral wording for public popularity surfaces;
- remove confusing implementation/status language from the public interface;
- keep source labels, dates, populations, units, and limits human-readable and attributable.

Remaining model capacity is reserved for two controlled uses:

1. expanding high-demand Spanish claim phrasings, aliases, and claim families from the existing evidence base;
2. improving the local evaluation corpus, answer plans, and reviewed data coverage.

Generated claims must not be published merely because a model can write them. New public claims require source records, evidence relations, limitations, and the existing validation gates. When evidence is missing, the system should improve the “not yet established” experience and add the gap to the review queue.

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

## Deferred operations task — persistent local inference origin

Status: todo for a later deployment iteration.

The current production release does not depend on a persistent tunnel or local inference origin. Cloudflare Pages serves the static site and deterministic API fallback; local Ollama inference remains available for development and local evaluation. This keeps the release useful and deployable without requiring additional Cloudflare credentials.

When revisiting this task:

1. Create or provide a named Cloudflare Tunnel credential with tunnel edit permission.
2. Configure the redacted `config/cloudflared.example.yml` locally with the tunnel UUID, hostname, and credential path.
3. Run the local resolver behind the tunnel with a shared `LOCAL_CLASSIFIER_TOKEN`.
4. Set the Pages secrets `LOCAL_CLASSIFIER_ENDPOINT` and `LOCAL_CLASSIFIER_TOKEN`.
5. Run `npm run origin:validate`, `npm run build`, and `npm run smoke:production`.
6. Confirm that dynamic inference upgrades deterministic results without becoming a production dependency.

Do not use a temporary account-less tunnel as the production configuration. Until this task is completed, `dynamic: false` on the public health endpoint is expected and the deterministic result is the supported production path.

## Current baseline

- 14 investigation/topic routes remain available.
- 229 Markdown claim records exist; 51 are published.
- The 51 published claims now expose one typed, evidence-linked core proposition each; the browser index carries proposition IDs, the local resolver carries them into published answer plans, and the build validates the claim → proposition → evidence → source chain.
- All 51 published claim families now have structured conversation definitions covering everyday immigration, housing, employment, healthcare, prices, taxes, inequality, security, politics, youth, corruption, and economic debates. They reuse the existing reviewed evidence warehouse and are exposed through the compact popular-entry set and topic filters.
- The resolver now preserves proposition traceability through the Pages API smoke path, while the deterministic fallback distinguishes definition and trend inputs before enrichment.
- Compound fallback inputs now expose up to four explicit propositions for common contrast/result structures while preserving ordinary noun lists as one claim; each clause keeps its own detected type before handler selection.
- The fallback compiler now preserves a directional proposition shape for common comparisons and causal statements (`subject`, `predicate`, `object`), so reversed comparisons cannot silently share a semantic family with the original formulation; the checker labels breakdown rows as facts, comparisons, causes, definitions, predictions, rules, priorities, or implications.
- Explicit group comparisons are guarded against nearby but non-equivalent published claims: a question such as “¿reciben más ayudas que los españoles?” cannot inherit a generic benefits answer that does not measure both groups.
- 49 evidence records and 42 source records are currently linked.
- The browser has a deterministic claim index and automatic local classification support.
- Uncovered inputs now receive a structured proposition breakdown; when no plausible indexed candidate exists, model extraction and reranking are skipped for a fast deterministic result.
- Meaningful uncovered claims now enter a bounded local compiler path even without an indexed candidate; obvious noise still skips inference, and compiler retrieval hints feed the same warehouse and official-source lookup path.
- Local inference now has a short circuit breaker and the embedding fast path is skipped for obvious long-tail text; direct tests reduced repeated unknown-claim fallback responses to roughly 100–260 ms when local inference is unavailable.
- Provisional numeric, ranking, trend, and budget-transfer answers now include a concise conversation-ready reply whose evidence IDs are retained alongside the rendered block; unreviewed replies remain explicitly qualified.
- Shared knowledge contracts and relation validation are now part of the build.
- `/api/resolve` and the local `/v1/resolve` boundary are available; `/api/classify` remains temporarily compatible.
- `bge-m3`, `gemma3:4b`, and `qwen3-vl:8b` are installed on the development machine. The current local evaluation corpus contains 660 Spanish inputs across 11 categories; the latest validated corpus includes the two newest reviewed claim families, while the last completed runtime run reached 492/492 known-family retrieval, 120/120 unknown-safety cases, 0 irrelevant matches, and 612/612 traceable outcomes. Adjacent-letter transposition typos now resolve to the intended published family, while local/private claims suppress unrelated national guidance and sources; published results also carry their reviewed HTTPS source links into the answer plan.
- The source warehouse now preserves real dated observations from INE `DATOS_TABLA` responses instead of indexing row metadata as measurements.
- Refresh resources can carry source-specific titles and aliases, which are included in derived retrieval indexes for long-tail wording such as `inflación`, `IPC`, and `PIB`.
- BOE daily summaries are normalized into searchable publication records with date, department, identifier, title, and direct document URL; document matches remain provisional until their content is checked.
- The shipped refresh now has a validated default configuration covering thirty-three live resources: BOE publications, INE CPI, and Eurostat macroeconomic, labour, population, migration, poverty, crime, housing, rental-price, health, life-expectancy, fertility, ageing, older- and young-population shares, population change, inflation, inequality, income, electricity-price, and public-finance series; refresh runs locally first from `.local/source-refresh.json` and falls back to the versioned configuration.
- A versioned metric registry now gives each refreshed resource a canonical `metricId`, unit, population definition, dimensions, aliases, and non-equivalence rules; ingestion carries that identity into derived observations and configuration/build validation rejects unknown metric references.
- Refresh configuration is schema-checked against the approved source registry before ingestion, so a new feed cannot silently use an unregistered host, HTTP URL, malformed aliases, or duplicate resources.
- Source ingestion now uses typed connector capabilities for INE table series, Eurostat JSON-stat, BOE summaries, dataset catalogues, and general official documents; registry validation rejects unsupported formats before refresh.
- D1 and PostgreSQL migration paths are now separated: D1 receives SQLite-safe operational migrations, while the derived PostgreSQL warehouse retains its `pg_trgm` migration independently.
- The production Pages project now has the `DB` D1 binding configured and all four operational migrations applied; `/api/questions` is live and returns the generic empty popularity feed when no clusters are published.
- Production smoke now requires the D1-backed popularity endpoint to return its generic empty/published feed, preventing a deployment from silently losing the operational binding.
- A reproducible backup command now exports remote D1 and optional PostgreSQL state, plus the local source warehouse and configuration/migration manifests, into ignored `.local/backups` artifacts.
- The durable local-origin contract is now checked in as a redacted tunnel template with deny-by-default ingress and endpoint validation; deployment-specific tunnel credentials and hostname remain runtime configuration.
- The warehouse now supports a deterministic same-period country ranking handler, including contradictory handling for claims that Spain is highest or lowest; the result includes country-labelled visual data and the source feed.
- Warehouse observations now carry matched terms and an evidence-fit band; weak token overlaps are excluded from provisional answers instead of being rendered as relevant data.
- Warehouse retrieval now carries population-fit metadata and rejects mismatched denominators before provisional rendering; total-population observations remain explicitly contextual rather than direct group evidence.
- File-only screenshot and audio submissions are accepted by the API, and extracted media text now re-enters the same warehouse and handler enrichment path as typed text and links.
- Text, URL, screenshot, and audio boundaries now share one input contract for character limits, request/file sizes, HTTPS-only links, and allowlisted MIME types; the local boundary enforces the same limits before buffering media.
- The homepage now progressively displays approved popular query clusters from `/api/questions`, while the static popular-claim cards remain the offline fallback.
- The homepage now exposes a compact “datos actualizados” prompt rail for electricity prices, rents, inflation, inequality, public deficit, household income, and demographic change, so visitors can discover dynamic evidence-backed questions without mistaking them for published claim pages.
- The warehouse rental-price series is now also a reviewed published claim: “Los alquileres han subido en España desde 2015”, with a reusable trend visual, a clear 2015=100 definition, and explicit limits separating the national index from each contract, listing, or municipality.
- Population-change coverage is now also a reviewed published claim: “España está perdiendo población”, with a national Eurostat trend, explicit territorial limits, and a signed zero-baseline visual that distinguishes national growth from local depopulation.
- Fertility coverage is now also a reviewed published claim: “España tiene menos de 1,2 hijos por mujer”, with a national Eurostat series, a distinction between the mean and individual family experience, and a claim-specific trend visual.
- Young-population coverage is now also a reviewed published claim: “En España hay cada vez menos menores de 15 años”, with a national Eurostat share series, an explicit proportion-versus-count distinction, and a claim-specific trend visual.
- Ageing coverage is now also a reviewed published claim: “España está cada vez más envejecida”, with a national Eurostat 65+ series, explicit policy limits, and claim-specific trend values.
- Query submissions now derive a deterministic sorted-term signature before entering D1, so punctuation, accents, stopwords, and word order do not create separate usage clusters; the original canonical wording remains the review/display text.
- D1 operational submissions now also carry a coarse semantic family signature. Equivalent long-tail wording can share one production review cluster while the original surface signature remains available for audit and display; the API falls back to the pre-migration path until migration 0004 is applied.
- D1 migration 0004 is now applied to the production `elpaisestafatal-ops` database, and the remote schema exposes the semantic-signature columns plus the cluster uniqueness/index contract.
- Structured answers now collect optional usefulness feedback (`yes`, `partly`, or `no`) through a rate-limited `/api/feedback` endpoint backed by the existing D1 table; feedback never blocks or changes the answer.
- The derived warehouse can now be loaded into an optional PostgreSQL backend with additive migrations and indexed `pg_trgm` search; the local resolver uses it when configured and falls back to the JSON warehouse when it is unavailable.
- The optional PostgreSQL warehouse now has a rebuildable `pgvector` index and strict hybrid lexical/semantic reciprocal-rank fusion. Semantic-only candidates require a high similarity threshold, retain retrieval provenance, and fall back to trigram or JSON retrieval when vectors are unavailable.
- A reproducible 86-case Spanish warehouse-routing benchmark now covers thirty-three statistical metric families plus ten out-of-domain inputs. With the installed `bge-m3` baseline, hybrid retrieval reaches 76/76 top-1 metric routing versus 61/76 lexical, retains 76/76 recall@3, rejects 10/10 out-of-domain inputs, and produces no unsafe top match; explicit metric hints are preserved when semantic neighbours disagree.
- Local runtime requests now use the supported numeric keep-alive contract; the previous duration-string form was rejected by the installed runtime and could silently force compiler, reranker, and embedding calls onto deterministic fallback.
- Claim extraction and candidate routing now share one schema-constrained model call, while the deterministic publication, handler, score, and evidence gates remain authoritative. Exact claim ambiguity is measured against other claims rather than the containing topic, removing unnecessary inference for normal paraphrases.
- The JSON warehouse now keeps a short-lived parsed and tokenized snapshot in memory, concurrent equivalent requests reuse one canonical job/result, and obviously private or explicitly missing-evidence assertions skip futile source discovery. The measured long-tail p95 fell from roughly 9.3 seconds during the corrected-model audit to roughly 2.6 seconds without reducing the 120/120 unknown-safety result.
- Eurostat coverage now includes real GDP growth, AROPE, public-debt-to-GDP, youth unemployment, government revenue, and government expenditure families with localized display titles, source refresh definitions, retrieval benchmarks, and resolver smoke coverage. Revenue and expenditure are explicitly labelled as total general-government aggregates, not household tax burden or spending on a particular public service.
- Eurostat coverage now also includes housing-cost overburden and current health expenditure per inhabitant, with metric routing, Spanish aliases, live refresh definitions, localized units (`%` and `€ por habitante`), benchmark cases, and resolver smoke coverage. These measures are kept distinct from house-price change, tax burden, total government spending, and waiting-list outcomes.
- Eurostat coverage now includes the old-age dependency ratio, the 65+ population share, and the 0–14 population share, with dedicated ageing and demographic metrics, source refresh definitions, Spanish routing aliases, localized units (`personas mayores por cada 100 en edad de trabajar` and `% de la población`), benchmark cases, and resolver smoke coverage. They are kept distinct from total population, fertility, youth unemployment, and life expectancy.
- Eurostat coverage now includes the annual crude rate of total population change, with explicit routing for growth, decline, depopulation, and demographic-change wording, a localized unit (`por cada 1.000 habitantes`), benchmark cases, and resolver smoke coverage. It is kept distinct from resident population, immigration flows, fertility, and age shares.
- Eurostat coverage now includes the harmonised annual inflation rate, with a dedicated rate-of-change feed, Spanish routing aliases, a localized unit (`% interanual`), benchmark cases, and resolver smoke coverage. It is kept distinct from the consumer-price index level and the harmonised index used for European comparability.
- Eurostat coverage now includes household electricity prices, with a taxes-included all-consumption-band feed, informal Spanish routing aliases, a localized unit (`€ por kWh`), benchmark cases, and resolver smoke coverage for both direct and conversational wording. It is kept distinct from general inflation and the broader consumer-price index.
- Household electricity pricing is now also a reviewed published claim: “El precio medio de la electricidad para hogares supera 0,28 €/kWh”, with a claim-specific trend visual and explicit limits separating a unit price from any household’s bill.
- Life-expectancy coverage is now also a reviewed published claim: “España supera los 84 años de esperanza de vida”, with the 2020 dip preserved in the trend visual and explicit limits separating a population average from individual longevity, health, and equal access.
- Youth unemployment is now also a reviewed published claim: “Casi uno de cada cuatro jóvenes activos está en paro”, with a 2015–2025 trend and explicit denominator limits separating the active population from all young people.
- Total public revenue is now also a reviewed published claim: “Los ingresos públicos de España superan el 40% del PIB”, with a 2015–2025 trend and explicit limits separating government-wide revenue from an individual household’s tax bill.
- Eurostat coverage now includes the monthly actual-rentals price index, with Spanish routing for direct and conversational rental wording, a localized unit (`índice (2015=100)`), benchmark cases, and resolver smoke coverage. It is kept distinct from house prices, housing-cost overburden, and general inflation.
- Eurostat coverage now also includes the Gini coefficient, public deficit as a share of GDP, and median equivalised disposable income. Their source filters, Spanish aliases, localized units, routing exclusions, benchmark cases, and resolver smoke paths keep inequality, public balance, and household income distinct from poverty risk, debt, spending, and aggregate revenue.
- Source refresh now prefers the checked-in feed registry before an ignored local override, preventing stale developer configuration from hiding newly added evidence families.
- Uncovered multi-term claims now have a bounded La Moncloa/BOE discovery fallback with progressive query narrowing, attributable document links, caching, freshness gates, and no-verdict rules; search hits remain provisional publication evidence rather than automatic fact checks.
- La Moncloa discovery now carries a short, bounded relevant excerpt from the fetched official page into the provisional answer, with an explicit non-verdict label; the excerpt is rendered as evidence context rather than treated as a structured fact.
- A bounded parser now recognizes official credit-transfer wording and renders amount, origin ministry, destination ministry, and purpose as a provisional money-flow component; it explicitly preserves the rule that a transfer does not prove a service cut or identify political staff.
- Discovered official evidence is now persisted in the local derived cache by normalized multi-term signature, so equivalent phrasings reuse the same fetched evidence across resolver restarts without becoming published claims.
- The derived cache also keeps attributable discovered documents separately from short-lived query results, allowing reordered or newly phrased requests to reuse a fetched official document for up to 24 hours before refreshing it.
- BOE search hits now receive the same bounded document fetch, relevant excerpt, and typed-field extraction as La Moncloa hits; failures retain only the attributable metadata and never block the answer.
- Structured provisional answers now expose the distinct source links used by their evidence records, and the result UI renders a compact source trail on evidence-bearing cards, charts, money flows, limits, and copied replies.
- Answer plans now pass a runtime traceability gate before rendering: evidence-bearing blocks must reference plan evidence, provisional plans must contain an attributable HTTPS source, and invalid plans are downgraded to an explicit insufficient-evidence response.
- Unmatched causal inputs now label retrieved series as contextual evidence rather than a causal verdict; normative inputs are explicitly presented as priority/value disagreements with a follow-up question about the rule or trade-off.
- When structured and publication retrieval are empty, the bounded official fallback can now surface matching `datos.gob.es` catalogue entries as source leads; catalogue metadata is never treated as proof and remains explicitly provisional.
- Catalogue leads are now typed separately from official publications and render a concrete next step: open the distribution and verify its definition, period, population, and territorial coverage before treating it as evidence.
- When local inference is unavailable, the deterministic fallback compiler now extracts claim type, entities, geography, period, amounts, retrieval hints, and implied reasoning instead of collapsing every input into one mixed proposition.
- The compiler now also extracts the population or group being discussed and exposes explicit and implied propositions as separate arrays, so handlers can distinguish residents, households, workers, beneficiaries, migrants, students, patients, and other denominators without requiring a model.
- An unattended daily GitHub Actions refresh now fetches the approved public source set, validates the derived warehouse and SQL export, and retains a short-lived snapshot artifact for rebuilding the local retrieval copy without an editorial team.
- Warehouse observations now carry schedule-aware source freshness; stale or future-dated snapshots are excluded from provisional retrieval, while missing timestamps are retained only as unknown and flagged by validation.
- Uncovered responses now preserve and render that structured proposition breakdown in the browser; the UI labels it as provisional and keeps the limitation/next question visible instead of replacing it with a generic empty-result card.
- Local compiler outputs now include a deterministic semantic family signature built from claim type, polarity, normalized concepts, entities, population, geography, period, and numeric dimensions; equivalent long-tail wording can enter one review cluster without exposing the signature publicly, while opposing formulations remain separate.
- The knowledge-gap queue now groups by that semantic signature while retaining the original surface signatures, so future editorial work can see both the reusable family and the wording people actually submitted.
- Existing derived gap logs can be upgraded with `npm run knowledge:backfill-signatures` before clustering, so semantic-family coverage is rebuildable across older local records rather than applying only to new requests.
- Quantity and proportion inputs now use a deterministic numeric comparison path: generic numeric index labels are removed from retrieval, claimed values are scaled for Spanish `mil`/`millones` wording, compatible units are required, and the result distinguishes an approximate match from a measurable mismatch before rendering the source.
- The local service now has an explicit bounded evidence-packet contract and an opt-in answer-planner upgrade. The planner can rewrite presentation only after deterministic enrichment, while evidence IDs, source links, visual blocks, and unsupported numbers remain controlled by the deterministic plan; timeout or malformed output falls back automatically.
- Popular unresolved query clusters now produce a review-only materialization queue with suggested slugs, counts, recent activity, growth, priority, source references, neutralized wording, and required review actions. The queue can merge local learning records with an exported production D1 snapshot, preserving review/coverage/link state instead of treating each environment as a separate backlog. Failed media attempts, operational error messages, low-signal inputs, and evaluation/smoke-origin records are excluded before ranking. It cannot publish directly: evidence must first be promoted into reviewed Git records and pass the existing relation/build gates.
- Added an explicit D1 cluster-promotion command that requires owner approval, a neutral canonical wording, a published linked claim, and covered evidence before a cluster can enter the public popularity feed; raw submissions cannot be promoted directly.
- The browser now preserves its deterministic result while dynamic analysis is pending, timed out, cancelled, or unavailable; completed structured results can still upgrade it automatically, but users are no longer left with a generic pending/unavailable replacement. When polling expires, the enrichment notice becomes a terminal explanation that the initial guidance is the available result, rather than a state that appears to wait forever.
- The dynamic status is now a non-blocking enrichment notice attached below the first answer, with distinct running, slow, and unavailable states; it never makes the deterministic result look disabled or asks the user to submit a second classification request.
- The live checker now translates assessment codes into the public Spanish labels, exposes automatic versus published result semantics, offers sharing for fast-path answers, and suppresses weak fallback alternatives when no exact claim has been found.
- The homepage now leads with the conversation itself (`¿De qué estáis discutiendo?`), surfaces popular prompts immediately after the checker, exposes the input character limit, marks the active navigation path, and gives broad political wording such as `Pedro Sánchez está destruyendo España` related political context without presenting it as a published verdict. Existing evidence-backed claim families also carry more informal Spanish aliases for long-tail matching.
- The homepage prompt starter now covers additional published everyday claims across healthcare access, unemployment definitions, inflation, housing prices, irregular arrivals, tax aggregates, housing ownership, construction, employment quality, cybercrime, poverty, political concern, housing predictions, labour reform, youth emancipation, corruption, recession, and household tax effects; compact topic filters keep those prompts discoverable without turning the checker into a wall of links.
- Screenshot and audio selection now state that submission is automatic and expose a live status message; the local speech adapter accepts a provider-neutral command/argument contract with bounded execution time while retaining compatibility with the previous development variables.
- Published claim pages now use a reusable answer-first layout: the claim is followed immediately by a visual short answer, supported/not-established/missing-evidence cards, visible review metadata, and response actions before the deeper data and investigation context. The public claim catalogue now shows only published, usable entries and exposes its count and return path to the checker.
- Published claim pages now expose the claim-specific evidence trail behind the answer, including each record's period, geography, unit, source type, and direct source link; broad topic charts remain explicitly labelled as context rather than proof.
- Published claim pages now use the same deterministic accessible SVG/value-table chart pattern as dynamic answers, replacing text-only evidence bars across all 51 published claim pages.
- The published claim catalogue now scales through client-side search, accent-insensitive matching, topic filters, live result counts, and a direct empty-state path back to the checker; it remains fully usable as a static page without JavaScript.
- The conversation starter library now covers all 51 published, evidence-backed claim families across immigration, housing, employment, healthcare, prices, taxes, inequality, security, politics, youth, corruption, and everyday economic debates. The homepage keeps the first eight prompts scannable, then lets people reveal the rest or filter by topic instead of creating a wall of prompts.
- Provisional structured results now use the response state as the publication authority: a draft remains labelled automatic even when it links to a related published topic, so contextual guidance cannot be mistaken for a reviewed verdict.
- The local resolver now prioritizes complete title/alias phrases over aggregate token overlap, respects numeric phrase boundaries, and treats a unique published alias as a safe fast-path match; this prevents unrelated claim families from winning by shared words such as `España`, `millones`, or `empleo`.
- The built claim index now has a CI/build regression gate covering representative aliases for all 51 published families, including unique canonical ownership and variant presence; missing or ambiguous routing coverage fails the build before publication.
- The site-wide search now consumes the same shared claim index and ranking logic as the homepage checker. Weak or empty search results provide a direct handoff to check the exact phrase, preventing the catalogue from becoming a dead end or surfacing an unrelated claim through simple word overlap.
- Broad evaluative inputs such as `España está destruida` now route through definition guidance when the compiler identifies an implied definition. Their uncovered result explains the legitimate concern and shows a concrete evidence ladder for choosing a measurable outcome, period, comparison, and territory instead of returning only a generic no-match message.
- Four new evidence-backed claims now cover recurring measurement mistakes: AROPE versus absolute poverty, record employment versus resolved unemployment, national housing averages versus every home, and aggregate tax revenue versus each household's bill. Each is linked to a source, evidence record, and proposition and is included in the Spanish evaluation corpus.
- Three more evidence-backed claims now cover inflation versus falling prices, waiting-list averages versus resolved healthcare access, and survey mentions versus an alleged majority concern. Each reuses an official source record and expands the Spanish evaluation corpus without inventing a new verdict structure.
- Topic pages now keep their 60-second answer, evidence, and source trail above the fold while collapsing the long investigation into accessible chapter accordions. The first chapter opens as a continuation, the rest open on demand, and chapter deep links automatically expand their destination.
- The search journey now hands an unmatched formulation directly to the claim checker through `/?q=...#comprobar`; the checker pre-fills and submits it automatically, so search no longer ends in a dead end.
- The investigations index now foregrounds the claim checker and published context while keeping the 182-item planned backlog behind an explicit disclosure, so unfinished work is available without presenting it as published guidance.
- The sources index now derives from the claim/evidence source registry, exposes source type and dates, and provides client-side filtering so the evidence trail scales beyond topic-level source lists.
- The claim result UI now uses a scan-first hierarchy: published versus automatic state, concise summary, evidence-backed points, explicit limits, one useful next question, source trail, and a conversation-ready reply without repeating source links inside every card.
- Related structured results now keep their proposition breakdown, method guidance, limits, next question, and share/copy actions instead of collapsing to a thin nearest-topic card; the interface labels them as related guidance rather than an exact published match.
- Published evidence trails now label each linked source by its relationship to the relevant proposition (`Apoya`, `Contradice`, `La matiza`, `Aporta contexto`, or `No basta para comprobarla`) instead of presenting every linked source as equivalent proof.
- Structured result cards now make the short answer and copy action prominent, while secondary method, source-excerpt, legal, prediction, trade-off, and comparability blocks are grouped inside an accessible expandable analysis section. Provisional results are labelled as automatic and unpublished rather than “pending”, so a slow enrichment job cannot make the user think the first answer is blocked. This keeps the first answer useful without hiding the evidence path.
- Every result state now includes a visible “Comprobar otra frase” action that clears the previous result, cancels any pending analysis, resets media selection, updates the character counter, and returns focus to the checker.
- Text results now preserve the submitted claim in the shareable `?q=…#comprobar` URL, so copied links reopen the same checker state; media content is deliberately kept out of the URL.
- Broad uncovered claims now receive a bounded “concretar por un tema” set of published topic links when enough text is present. This provides a useful next action without presenting a topic as a match or inventing evidence.
- Truly uncovered structured results now say “Sin coincidencia directa” in the checker UI, distinct from “Resultado automático” for provisional evidence; the evidence state and next step remain visible before secondary analysis details.
- The deterministic compiler now recognizes broad evaluative phrases such as “España está destruida” as requiring a definition/context clarification, preserving the complaint while refusing to turn it into an unsupported national verdict.
- The deterministic compiler no longer treats the negated phrase “no significa que” as a definition question, so claims such as economic growth versus cost of living can resolve to their exact published claim instead of being downgraded to a generic topic.
- The evaluation runner now reports known retrieval recall, irrelevant matches, unsupported-conclusion rate, proposition-breakdown coverage, answer-plan traceability, coverage distribution, cache-hit telemetry, and latency alongside the existing 300-case safety metrics.
- The local evaluation runner now accepts either the Pages API path or the local service path, so the required Spanish corpus can be measured against the actual target boundary rather than silently recording 404s.
- Fallback entity extraction now uses word/phrase boundaries; short aliases such as `UE` cannot match inside ordinary words and distort handler compatibility or retrieval.
- Added a provider-neutral `/api/health` Pages Function and expanded the local health contract so monitoring can distinguish static/deterministic availability from optional dynamic availability without exposing origin or model details.
- The local health contract now reports provider-neutral queue depth, completed/unavailable counts, cache hit rate, p95 latency, and status counts; Pages health forwards only those safe operational fields for monitoring.
- The local Compose image now installs production dependencies and includes the migrations/configuration required by the optional PostgreSQL warehouse path; a container-contract validator checks the build, binding, token, and healthcheck wiring without requiring Docker on the developer machine.
- Pages resolve requests now link the incoming browser abort signal to the bounded upstream timeout, so cancelled submissions stop consuming local-origin capacity instead of waiting for the full timeout window.
- Production builds now scan generated HTML, JavaScript, CSS, JSON, XML, and text assets for provider names, local runtime addresses, development infrastructure, and secret variable names before the build is considered valid.
- Pages now has an explicit `_routes.json` API-only boundary, and deployment validation rejects broad Function routing that would make static traffic dynamic.
- The unrelated untracked `docs/` directory is user-owned and must not be modified by this roadmap.

## Phase 1 — Knowledge contracts and migration

Status: started; published-claim proposition migration and runtime traceability are implemented for all 51 published claims; the fallback compiler now performs bounded multi-proposition decomposition for contrast, result, semicolon, and safe conjunction clauses, preserves directional proposition shapes, and emits deterministic semantic family signatures. Evidence-to-proposition relationships are now stored in a versioned manifest, validated against proposition status and references, and exposed to the published evidence trail; richer per-link limitations and independent review remain future work.

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

Keep evidence relationships at proposition level: a source may support one proposition, qualify another, and be insufficient for a third.

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

Status: started; the conversation-first homepage, topic-filtered popular prompts, broad-topic guidance, and answer-first published-claim layout are implemented alongside the deterministic match, fallback, input, and timeout states. The evaluation now confirms full known-family recall and unknown-safety after phrase-level alias matching, transposition tolerance, and suppression of irrelevant context for local/private claims. More semantic clustering and richer result personalization remain pending.

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

Status: boundary implemented; first compiler-result slice complete; deterministic decomposition now preserves separate explicit clauses and directional subject/relation/object shapes before model escalation; richer semantic extraction expansion remains pending.

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

Status: started; JSON and PostgreSQL lexical retrieval are implemented, with opt-in pgvector hybrid retrieval and its first recorded relevance benchmark now available. BOE consolidated-law metadata and bounded article blocks are normalized into typed, versioned legal records. Legal answers can resolve the norm, jurisdiction, effective date, repeal state, current article version, exact consolidated wording, and attributable source without presenting the informational consolidated text as a legal opinion. On-demand title-pair discovery can now retrieve current article text for an unseen legal claim. Statistical coverage now includes public debt, youth unemployment, total government revenue, total government expenditure, housing-cost overburden, health expenditure per inhabitant, life expectancy at birth, fertility rate, old-age dependency ratio, 65+ population share, 0–14 population share, population-change rate, harmonised inflation rate, household electricity prices, and the actual-rentals price index in addition to the existing GDP, poverty, employment, migration, crime, inflation-index, inequality, income, and housing families; broader source/domain coverage, wider legal-query recall, jurisprudence, and observation-level PostgreSQL benchmarking remain pending.

Use local PostgreSQL with full-text search and pgvector initially. Cloudflare Vectorize is optional later; do not require it for the first production version.

Store:

- source documents and versions;
- entities;
- metrics and definitions;
- observations and data series;
- government events and budget transfers;
- legal rules with effective dates;
- evidence relationships, including proposition-level support, contradiction, qualification, context, or insufficiency;
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

Status: in progress. Quantity, proportion, trend, ranking, definition, budget-transfer, causal, legal, group-comparison, prediction, and normative routing now exist. Long-tail causal, legal, group-comparison, predictive, and normative inputs produce dedicated deterministic method plans instead of a generic unsupported answer. The legal handler now prefers the explicitly current BOE article version and cites its exact text while retaining scenario, exception, and jurisprudence limitations; deeper domain-specific calculations and broader legal/event resolution remain pending.

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

Status: in progress. Unknown measurable claims progressively use the local warehouse and constrained official discovery. Unknown legal claims now search BOE's consolidated-legislation collection with bounded wildcard title pairs, reject expired or outdated consolidations, download at most two bounded official texts, select only current directly matching articles, cache the result, and retain scenario/jurisprudence limitations. Evaluation-driven routing now resolves typo variants without combining unrelated aliases, and refuses to attach national context to local/private claims that require unavailable records. Broader current-event coverage and persistent knowledge-gap promotion remain pending.

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

Status: in progress. The shared renderer now supports claim breakdowns, key numbers, accessible inline SVG trend/comparison charts with expandable value tables, money flows, confirmed/unknown cards, source excerpts, strongest-valid-concern cards, evidence ladders, legal decision paths, prediction conditions, normative trade-offs, group-comparability checklists, conversation replies, source links, and answer-first topic-page chapters. Dynamic structured answers now begin with a compact evidence-state/next-step overview before secondary method detail; unresolved and values results now keep their core method guidance visible instead of hiding it behind a disclosure, while definition ladders use a concrete label rather than a causal one. Broad definition results also offer one-click measurable questions so users can move from a vague complaint to a useful check without rewriting it themselves. All published claim pages use the same deterministic chart/value-table pattern. Broader reviewed chart coverage and reusable animated scenes remain pending.

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

Status: started; browser media validation, automatic file submission, live media status guidance, and typed-caption fallback are implemented. A screenshot/audio submission with a typed claim now retains that claim's deterministic guidance when local extraction is unavailable, while file-only failures offer published alternatives instead of a dead end. The local link adapter supports public HTTPS pages with DNS-based SSRF protection, bounded redirects, response limits, and generic failure states. Local vision and speech runtimes remain optional, use a provider-neutral speech command contract, and fail back without blocking deterministic text guidance.

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

Status: started; durable review-queue merge, recency ranking, and deterministic semantic-family merging are implemented; public promotion and static materialisation remain owner-approved.

Cluster inputs by canonical proposition signature. Track:

- most asked;
- fastest growing;
- newly covered;
- still unresolved;
- high-impact knowledge gaps.

Rank the owner review queue using frequency, growth, potential harm, evidence availability, and feasibility.

The queue is a derived artifact, not a second source of truth. `knowledge:export-query-clusters` exports the current operational D1 clusters, including semantic family signatures, and `knowledge:cluster --d1-input ...` merges them with local learning records. Each output cluster carries query count, seven-day activity, growth rate, coverage/review state, linked claim, input types, source IDs, a neutralized review text, and a reason for its priority. The materialization command accepts only candidates with enough demand and source references; newly covered clusters remain reviewable, while already published clusters do not re-enter the queue.

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
- Run repository CI on every push and pull request, including the public-surface audit, knowledge contracts, container contract, request lifecycle, and offline fallback.
- Run production smoke checks against both static routes and the generic `/api/health` and `/api/resolve` boundaries without requiring dynamic inference to be available.
- Exercise text, screenshot, and audio multipart requests against the local boundary in CI with inference unavailable; each request must finish with a useful result or generic unavailable state.
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
- A screenshot/audio submission with a typed caption keeps its useful text result when media extraction is unavailable; file-only failure offers a retry path and published alternatives.
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
