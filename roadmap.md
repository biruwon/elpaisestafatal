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

## Latest completed milestone — 2026-08-03

- Added a reusable Spain-versus-EU tertiary-attainment family: Eurostat 2025 reports 52.5% of people aged 25–34 in Spain and 44.8% in the EU27 at ISCED 5–8. The family is represented in the metric registry, source-refresh configuration, reviewed claim/evidence/proposition records, warehouse routing and ranking, homepage and `/datos` discovery, static claim routes, benchmark cases, and local resolver smoke tests.
- Improved the broad-complaint result UX: the first orientation is followed immediately by up to six concrete “what do you mean?” choices, before the detailed evidence method. This keeps “España está destruida” useful without assigning it an unrelated verdict or forcing the user through a wall of text.
- Validation completed: `npm run check`, `npm run build` (350 static pages), the 50-case local resolver smoke suite, roadmap audit, all public UX audits, media/input validation, and the 324-case warehouse benchmark. The local-only inference path remains unchanged; persistent production tunnelling is still explicitly todo.

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
- 286 Markdown claim records exist; 108 are published Markdown families (the legacy affirmation catalogue currently exposes 108 cards).
- The 108 published Markdown families now expose typed, evidence-linked core propositions; the browser index carries proposition IDs, the local resolver carries them into published answer plans, and the build validates the claim → proposition → evidence → source chain.
- All 108 published Markdown families now have structured conversation definitions covering everyday immigration, housing, employment, healthcare, tourism, prices, taxes, inequality, security, politics, youth, corruption, legal rules, demographic change, education, current government events, pensions, life expectancy, healthcare access, household energy costs, tertiary education, and Spain-versus-EU comparisons. They reuse the existing reviewed evidence warehouse and are exposed through the compact popular-entry set and topic filters.
- The conversation library now derives a conservative fallback card from every published claim that lacks a bespoke definition, preserving its reviewed wording, evidence summary, limits, aliases, and source provenance without inventing a chart or number. The build verifies that every published claim is discoverable through the conversational library.
- A newly circulating budget-transfer claim is now a reviewed, reusable family: the official event, exact amount, ministries, budget chapter, unsupported educational-cut implication, and adviser implication are separated once and reused across multiple phrasings.
- Published claim pages now distinguish topic-context visuals from direct-event evidence: metric claims can keep a chart, while transactions and other document-led claims use a direct evidence card or typed money-flow visual instead of inheriting an unrelated topic chart.
- Direct comparison claims now use a reusable Spain-versus-EU visual with labelled values and units; the health-spending and AROPE comparison families reuse validated Eurostat warehouse metrics without requiring a bespoke topic investigation.
- A reviewed Spain-versus-EU life-expectancy family now uses Eurostat's 2024 common observation (84.0 years in Spain versus 81.5 in the EU27), with the population-average, health-quality, and access limitations kept explicit. The same metric is available through the homepage, `/datos`, aliases, warehouse comparison handler, and local smoke path.
- A reviewed Spain-versus-EU healthcare-access family now uses Eurostat's 2025 common observation (1.6% in Spain versus 1.2% in the EU27) for self-reported unmet medical needs due to a waiting list. It remains separate from administrative patient counts, average waits, health spending, and broad health-system judgments.
- A reviewed Spain-versus-EU household-electricity family now uses Eurostat's 2025-S2 common observation (0.2872 €/kWh in Spain versus 0.2942 €/kWh in the EU27, taxes included), keeps the kWh measure separate from a household's monthly bill, and is available through the homepage, `/datos`, aliases, warehouse comparison handler, and local smoke path.
- The published catalogue now distinguishes residents by foreign citizenship from residents born abroad, so users can check two commonly conflated population measures without receiving an unrelated result.
- The checker now leads with eight everyday debate prompts—immigration, benefits, empty homes, employment, taxes, healthcare, safety, and youth—while retaining the complete published and warehouse prompt libraries behind the existing filters and disclosures. First-use examples now match the product’s conversation promise instead of opening with a statistical catalogue.
- The metric hint layer now recognizes reordered Spanish comparison wording such as `comparación europea del empleo a tiempo parcial`, `el abandono educativo supera al europeo`, and `la tasa AROPE española supera a la europea`; explicit Europe markers select the correct comparison family before semantic retrieval can promote a Spain-only or adjacent metric.
- Structured results now default to an evidence-first `Entender` view: the long conversation-ready reply is kept behind the explicit `Responder` mode, while the concise answer, evidence state, limits, and next step remain visible. This reduces the first-screen wall of text without removing the copyable response or source view.
- The claim checker now makes screenshot and audio submission explicit alongside the primary text field, keeps drag-and-drop available as a secondary affordance, resets stale media before prompt-driven checks, and preserves the submitted phrase without repeating redundant result headings. Long submitted text is collapsible so the evidence answer remains the visual focus.
- Broad complaints such as `España está destruida` now put the concrete “what do you mean exactly?” choices immediately after the first orientation, before the detailed method ladder; choices are capped to six and styled as the primary next action so the user can turn a vague complaint into a check without facing a wall of text.
- Related and uncovered results now suppress duplicate method cards when a broad topic route overlaps a more specific causal, legal, comparison, or local-claim explanation; the local resolver smoke suite protects this compact result contract.
- The Pages `/api/classify` boundary now returns an evidence-honest deterministic clarification when the optional inference origin is absent or fails, including a concrete follow-up question for typed claims and a generic retry path for file-only submissions; direct API callers no longer receive a dead-end merely because dynamic inference is unavailable.
- Broad, related, and uncovered inputs now offer topic-aware one-click follow-up questions when a direct answer is not available. These prompts reuse existing published and warehouse routes, so a user can turn “Spain is ruined” or another broad complaint into a measurable check without receiving an unrelated verdict or having to rewrite the claim manually.
- Truly uncovered inputs now retain a useful next action even when no topic can be inferred: the result explicitly says that starter prompts are examples, not answers to the submitted phrase, and lets the user run one with a single click. This prevents random text from ending in a dead-end while preserving unknown-result honesty.
- The high-demand `precios vivienda España` cluster is now a reviewed published family with Spanish aliases, an INE-backed trend visual, explicit limits between national house-price transactions and rents/listings, and regression coverage; equivalent wording no longer needs a provisional warehouse answer.
- The high-demand `precios vivienda causan crisis España` cluster now has a separate causal family: the observed price rise is shown as a real outcome, while the page refuses to treat it as proof of one cause and points to the comparisons needed to investigate the mechanism.
- The high-demand `España 100 millones habitantes` cluster now has a numeric contradiction family backed by Eurostat’s 49.13-million resident count; current totals, future predictions, arrivals, and population-floating claims remain distinct.
- The high-demand `cuánto debe España` cluster now separates a reviewed absolute-debt family (approximately €1.70 trillion in 2025) from the existing debt-to-GDP ratio; the amount, ratio, deficit, and household debt remain distinct.
- The everyday `la deuda pública crece` wording now has its own reviewed trend family, reusing the absolute-debt series while clearly separating nominal stock growth from debt-to-GDP interpretation and sustainability.
- The high-demand housing-cost percentage cluster now has a direct 2025 measurement family: 7.2% is shown with Eurostat’s 40%-of-equivalent-income definition, while the answer keeps that threshold separate from broader affordability and local experience.
- The resolver now preserves proposition traceability through the Pages API smoke path, while the deterministic fallback distinguishes definition and trend inputs before enrichment.
- Compound fallback inputs now expose up to four explicit propositions for common contrast/result structures while preserving ordinary noun lists as one claim; each clause keeps its own detected type before handler selection.
- The fallback compiler now preserves a directional proposition shape for common comparisons and causal statements (`subject`, `predicate`, `object`), so reversed comparisons cannot silently share a semantic family with the original formulation; the checker labels breakdown rows as facts, comparisons, causes, definitions, predictions, rules, priorities, or implications.
- The deterministic language path now also preserves direction for everyday Spanish trend paraphrases (`cada vez hay más`, `se ha disparado`, `va a peor`, `está mejorando`) and positional comparisons (`por encima de`, `por debajo de`, `supera`), while separating opposing trend/comparison families. Association wording such as `están relacionadas`, `hay una relación entre`, and `van de la mano` now gets a symmetric relationship shape, clusters with equivalent association phrasing, and remains separate from a causal assertion.
- The semantic compiler now covers more natural debate wording without requiring a manually saved claim: progressive causal forms (`está provocando`, `tiene la culpa de`, `hace crecer`, `desde que llegaron más`), colloquial rising/falling trends (`sigue encareciéndose`, `no dejan de subir`, `va en aumento`, `va en descenso`), highest-ranking forms (`lidera`, `encabeza`, `está a la cabeza de`), terse priority phrases (`primero los españoles`), and directional group comparisons. Browser and local signatures retain polarity, direction, geography, and evidence-family boundaries, so new paraphrases can cluster safely while opposite claims remain separate.
- The shared semantic vocabulary now covers additional everyday Spanish families for cost of living, public finance, income, health access, health spending, demography, and education outcomes. Informal paraphrases such as `cuesta más llegar a fin de mes`, `la deuda crece`, `listas de espera colapsadas`, `ingresos familiares`, and `menos jóvenes` reuse the same safe family signatures across the browser and local fallback paths; generic cost-pressure wording is no longer mistaken for a ranking.
- The youth-outcome vocabulary now has a distinct `neet` family for `ni estudian ni trabajan`, `ninis`, and equivalent wording. Trend phrasing such as `cada vez hay menos jóvenes que ni estudian ni trabajan` shares the published NEET evidence with `la tasa de ninis ha bajado`, while `paro juvenil` remains a separate metric family and the comparison parser no longer misreads this trend form as a person-to-person comparison.
- Ranking language now preserves highest/lowest direction for forms such as `el paro más alto de Europa`, `el país con más paro`, and `el paro más bajo`, so the long tail cannot merge opposite ranking claims into one review family.
- Relative comparisons such as `España está peor que hace diez años` and `España está mejor que hace diez años` now retain their directional relation instead of being treated as generic descriptive text.
- Explicit group comparisons are guarded against nearby but non-equivalent published claims: a question such as “¿reciben más ayudas que los españoles?” cannot inherit a generic benefits answer that does not measure both groups.
- 114 proposition records, 100 evidence records, and 93 source records are currently linked; reviewed Spain-versus-EU comparison families now cover inflation, employment, public revenue, public expenditure, health spending, healthcare access, household electricity prices, old-age/survivors benefits, current taxes on income and wealth, median disposable income, GDP per inhabitant, NEET rates, AROPE, life expectancy, and tertiary education attainment with explicit population definitions, periods, limitations, and proposition links. Nominal GDP now also has a dedicated published claim for the everyday “Spain’s economy exceeds €1.6 trillion” wording, with a direct year comparison and the nominal-versus-real limitation made explicit. Statutory minimum-wage coverage now has a direct published claim, a comparison visual, and an explicit warning about monthly-equivalent versus 14-payment conventions. Foreign-population coverage now has separate threshold claims for almost seven million foreign-citizenship residents and almost 9.5 million foreign-born residents, distinguishing citizenship, birthplace, annual arrivals, and administrative status.
- The browser has a deterministic claim index and automatic local classification support.
- Uncovered inputs now receive a structured proposition breakdown; when no plausible indexed candidate exists, model extraction and reranking are skipped for a fast deterministic result.
- Meaningful uncovered claims now enter a bounded local compiler path even without an indexed candidate; obvious noise still skips inference, and compiler retrieval hints feed the same warehouse and official-source lookup path.
- Local inference now has a short circuit breaker and the embedding fast path is skipped for obvious long-tail text; broad complaints such as `España está destruida` also bypass model compilation when deterministic guidance is already the safer result. Direct local tests keep repeated unknown-claim fallback responses around 300–700 ms with the local service available, while meaningful claim parsing remains eligible for model enrichment.
- Provisional numeric, ranking, trend, and budget-transfer answers now include a concise conversation-ready reply whose evidence IDs are retained alongside the rendered block; unreviewed replies remain explicitly qualified.
- The homepage now exposes six warehouse-backed indicator questions as a first-class discovery layer, while the full indicator prompt set remains progressive inside the checker; users can reach current data coverage without waiting for a manually authored claim page.
- The concrete security-data slice is now more discoverable: homepage prompts and the warehouse vocabulary route homicide, robbery, fraud, theft, and sexual-violence wording to the reviewed category-level offence series. Broad crime, local insecurity, and immigration-causality wording still refuse arbitrary category substitution.
- A new static `/datos` catalogue exposes all 68 configured metric families with searchable subject filters, human-readable units/populations, complete one-click checker prompts, and a clear distinction between evidence families and verdicts, making warehouse coverage discoverable without adding another long homepage prompt list. This now includes the Spain/EU household-electricity and tertiary-attainment comparisons, the statutory minimum-wage series as a distinct measure from household income and employment, plus social-protection benefits expenditure, Spain-only old-age/survivors benefits expenditure, the Spain/EU old-age and survivors comparison, the Spain/EU current-taxes-on-income-and-wealth comparison, Spain-versus-EU healthcare access, Spain-versus-EU housing-cost overburden, Spain-versus-EU NEET and AROPE rates, and residents by foreign citizenship as distinct aggregates from total government spending, total public revenue, household income, individual tax bills, country of birth, and annual arrivals.
- Regional density comparisons now preserve the territories named by the user: a question such as `Madrid tiene más densidad que Andalucía` uses the latest common period, renders a comparison rather than a national trend, and labels density separately from service pressure or quality of life.
- The first regional comparison is now a reviewed published claim family: `Madrid tiene más densidad de población que Andalucía` has Eurostat-linked evidence, a typed proposition, reusable aliases, and a static comparison visual that can be reused for exact and paraphrased inputs.
- Generic density rankings now default to Spanish autonomous regions, exclude unrelated European NUTS-2 regions unless the user explicitly asks for Europe or the EU, localize the `personas por km²` unit, and identify the highest regional value in the answer summary.
- Published result cards now keep the claim assessment (`Falso`, `Generalización engañosa`, or similar) separate from evidence coverage (`Evidencia directa` or `Cobertura parcial`), and label the heading as the phrase being checked so an unsupported claim cannot look like an endorsed conclusion.
- Exact published matches now use assessment-aware result headings for false, misleading, unsupported, uncertain, and mostly-true claims, so a causal claim such as `Los inmigrantes crean inseguridad` cannot render its unsupported conclusion as if it were the site's finding.
- The homepage regional-data discovery rail now includes a one-click Madrid–Andalucía density comparison, making the new same-period comparison path discoverable without requiring users to know the exact query wording.
- Shared knowledge contracts and relation validation are now part of the build.
- `/api/classify` is now the public provider-neutral classifier boundary used by the claim input, with the same JSON/multipart validation, timeout, token forwarding, generic failures, and polling contract as the backward-compatible `/api/resolve` route.
- `bge-m3`, `gemma3:4b`, and `qwen3-vl:8b` are installed on the development machine. The current local evaluation corpus contains 888 Spanish inputs across 13 categories; the last completed runtime run reached 744/744 known-family retrieval, 60/60 unknown-safety cases, 0 irrelevant matches, and 804/804 traceable outcomes before the latest education, healthcare-access, GDP-per-capita, absolute-debt, and debt-growth cases. The education, youth, healthcare-access, GDP-per-capita, absolute-debt, and debt-growth families now have runtime smoke coverage, while adjacent-letter transposition typos resolve to the intended published family, local/private claims suppress unrelated national guidance and sources, and published results carry reviewed HTTPS source links into the answer plan.
- The source warehouse now preserves real dated observations from INE `DATOS_TABLA` responses instead of indexing row metadata as measurements.
- Refresh resources can carry source-specific titles and aliases, which are included in derived retrieval indexes for long-tail wording such as `inflación`, `IPC`, and `PIB`.
- BOE daily summaries are normalized into searchable publication records with date, department, identifier, title, and direct document URL; document matches remain provisional until their content is checked.
- The shipped refresh now has a validated default configuration covering 68 live resources: BOE publications, INE CPI, and Eurostat macroeconomic, labour, population, migration, poverty, crime, housing, rental-price, health, healthcare-access, life-expectancy, fertility, ageing, older- and young-population shares, population change, inflation, Spain-versus-EU harmonised inflation, inequality, income, Spain-versus-EU median household income, Spain-versus-EU GDP per capita in PPS, electricity-price, public-finance, current taxes on income and wealth, early-school-leaving, Spain-versus-EU tertiary-attainment, NEET, unmet-healthcare-need, GDP-per-capita, absolute-public-debt, real-GDP Spain-versus-EU growth, and foreign-citizenship population series; refresh runs locally first from `.local/source-refresh.json` and falls back to the versioned configuration.
- Real GDP growth can now be compared directly between Spain and the EU27 for the latest common quarter. The typed Eurostat feed, same-period comparison handler, Spanish unit label, query routing, homepage/catalogue discovery, benchmark, and local resolver smoke path keep this distinct from Spain-only quarterly growth, nominal GDP, GDP per capita, and household wellbeing.
- Harmonised annual inflation can now be compared directly between Spain and the EU27 for the latest common month. The typed Eurostat feed, shared comparison handler, localized `% interanual` labels, query routing, homepage/catalogue discovery, benchmark, and local resolver smoke path keep this distinct from Spain-only inflation indexes and household-specific cost of living.
- Employment can now be compared directly between Spain and the EU27 for the latest common year. The typed Eurostat feed uses the same 20–64 population and employment definition on both sides, and the shared comparison handler, localized units, query routing, homepage/catalogue discovery, benchmark, and local resolver smoke path keep it distinct from unemployment and employment quality.
- A versioned metric registry now gives each refreshed resource a canonical `metricId`, unit, population definition, dimensions, aliases, and non-equivalence rules; ingestion carries that identity into derived observations and configuration/build validation rejects unknown metric references.
- The shared metric vocabulary now covers colloquial long-tail questions such as `Cuánto debe España`, `Cuánto dinero se dedica por persona a la sanidad`, and `Cuánto ingresan de media los hogares`. The same aliases are present in the source-refresh configuration, metric registry, local search vocabulary, query-preference hints, homepage discovery prompts, benchmark corpus, and resolver smoke path, so local JSON and PostgreSQL indexes do not diverge for these everyday formulations.
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
- The review-queue clusterer now has an optional local embedding-assisted pass: it batches neutral cluster text to a local-only embedding endpoint, merges only compatible semantic families above a bounded cosine threshold, preserves the original surface signatures, and records whether the merge ran. Missing, failing, or non-local endpoints keep the deterministic clusters unchanged, so semantic clustering never becomes a prerequisite for the claim-checking path.
- Structured answers now collect optional usefulness feedback (`yes`, `partly`, or `no`) through a rate-limited `/api/feedback` endpoint backed by the existing D1 table; feedback never blocks or changes the answer.
- The derived warehouse can now be loaded into an optional PostgreSQL backend with additive migrations and indexed `pg_trgm` search; the local resolver uses it when configured and falls back to the JSON warehouse when it is unavailable.
- The optional PostgreSQL warehouse now has a rebuildable `pgvector` index and strict hybrid lexical/semantic reciprocal-rank fusion. Semantic-only candidates require a high similarity threshold, retain retrieval provenance, and fall back to trigram or JSON retrieval when vectors are unavailable.
- The reproducible Spanish warehouse-routing benchmark now covers 324 cases across the expanded metric families plus ten out-of-domain inputs. The current run reaches lexical top-1 293/324, hybrid top-1 293/324, hybrid recall@3 312/324, rejects 10/10 negative cases, and produces zero unsafe top matches. The regression set includes citizenship wording that must not fall through to country-of-birth or annual-arrivals data, minimum-wage wording that must not fall through to household income, pension wording that must not fall through to total social-protection spending, Spain/EU comparison wording that must not fall through to Spain-only metrics, and tertiary-attainment wording that must not fall through to school-leaving, NEET, or Spain-only education data.
- Local runtime requests now use the supported numeric keep-alive contract; the previous duration-string form was rejected by the installed runtime and could silently force compiler, reranker, and embedding calls onto deterministic fallback.
- Claim extraction and candidate routing now share one schema-constrained model call, while the deterministic publication, handler, score, and evidence gates remain authoritative. Exact claim ambiguity is measured against other claims rather than the containing topic, removing unnecessary inference for normal paraphrases.
- The JSON warehouse now keeps a short-lived parsed and tokenized snapshot in memory, concurrent equivalent requests reuse one canonical job/result, and obviously private or explicitly missing-evidence assertions skip futile source discovery. The measured long-tail p95 fell from roughly 9.3 seconds during the corrected-model audit to roughly 2.6 seconds without reducing the 120/120 unknown-safety result.
- Eurostat coverage now includes real GDP growth, AROPE, public-debt-to-GDP, youth unemployment, government revenue, and government expenditure families with localized display titles, source refresh definitions, retrieval benchmarks, and resolver smoke coverage. Revenue and expenditure are explicitly labelled as total general-government aggregates, not household tax burden or spending on a particular public service.
- Public-finance comparisons now use the same typed Spain/EU handler for total government revenue and expenditure as a percentage of GDP. The latest common year is selected, Spanish units and direction are rendered correctly, and the answer explicitly separates government-wide aggregates from an individual family’s tax bill, a particular service, or an efficiency judgement.
- Healthcare spending can now be compared directly between Spain and the EU27 for the latest common year. The typed Eurostat feed uses current health expenditure per inhabitant across all financing schemes, while the shared comparison handler renders euro units and explicitly separates spending from access, quality, and outcomes.
- Median household income can now be compared directly between Spain and the EU27 for the latest common year. The typed Eurostat feed uses median equivalised disposable income in purchasing power standards for the total population, while the shared comparison handler separates a median household measure from wages, GDP per inhabitant, inequality, and each household's lived costs.
- Eurostat coverage now also includes housing-cost overburden, its Spain-versus-EU comparison, and current health expenditure per inhabitant, with metric routing, Spanish aliases, live refresh definitions, localized units (`%` and `€ por habitante`), benchmark cases, and resolver smoke coverage. These measures are kept distinct from house-price change, tax burden, total government spending, and waiting-list outcomes.
- Everyday metric wording now routes through the same warehouse families: AROPE questions mentioning residents or poverty/exclusion, and informal health-spending questions such as `cuánto gasta sanidad habitante`, are covered by explicit routing hints, homepage prompts, validation, and resolver smoke cases instead of entering the materialization queue.
- Knowledge-gap triage now separates direct warehouse/source evidence from discovery-only leads. Discovery results can guide later investigation but cannot promote an answer into the static materialization queue; hyper-local claims remain learnable gaps without being treated as nationally publishable claims.
- The claim checker now distinguishes the fast deterministic reading from optional automatic context enrichment: loading media no longer claims that a result is ready, background status labels describe the added layer, and the background notice automatically becomes a non-blocking fallback when enrichment takes too long; the user never needs a second click or submission to keep using the result.
- Media processing now has its own status language: a file-only submission says that the file is being read, while text-plus-media keeps the visible text orientation separate from extraction; timeouts explain the exact next action instead of implying that a result already exists.
- Eurostat coverage now includes the old-age dependency ratio, the 65+ population share, and the 0–14 population share, with dedicated ageing and demographic metrics, source refresh definitions, Spanish routing aliases, localized units (`personas mayores por cada 100 en edad de trabajar` and `% de la población`), benchmark cases, and resolver smoke coverage. They are kept distinct from total population, fertility, youth unemployment, and life expectancy.
- Eurostat coverage now includes the annual crude rate of total population change, with explicit routing for growth, decline, depopulation, and demographic-change wording, a localized unit (`por cada 1.000 habitantes`), benchmark cases, and resolver smoke coverage. It is kept distinct from resident population, immigration flows, fertility, and age shares.
- Eurostat coverage now includes the harmonised annual inflation rate, with a dedicated rate-of-change feed, Spanish routing aliases, a localized unit (`% interanual`), benchmark cases, and resolver smoke coverage. It is kept distinct from the consumer-price index level and the harmonised index used for European comparability.
- Eurostat coverage now includes household electricity prices, with a taxes-included all-consumption-band feed, informal Spanish routing aliases, a localized unit (`€ por kWh`), benchmark cases, and resolver smoke coverage for both direct and conversational wording. It is kept distinct from general inflation and the broader consumer-price index.
- Eurostat coverage now includes Spain-versus-EU tertiary educational attainment for people aged 25–34, with a same-definition 2025 comparison (52.5% in Spain versus 44.8% in the EU27), localized units, explicit limits about quality and overqualification, homepage and `/datos` discovery, a published claim page, benchmark cases, and local resolver smoke coverage. It is kept distinct from Spain-only attainment, early school leaving, NEET, employment, and youth unemployment.
- Warehouse trend and causal-context answers now localize both metric labels and units in their user-facing cards (for example, `Precios de la vivienda en España` and `índice (2015=100)`), so raw source labels such as `Quarterly index` or `Gross domestic product` do not leak into the Spanish checker experience.
- Household electricity pricing is now also a reviewed published claim: “El precio medio de la electricidad para hogares supera 0,28 €/kWh”, with a claim-specific trend visual and explicit limits separating a unit price from any household’s bill.
- Life-expectancy coverage is now also a reviewed published claim: “España supera los 84 años de esperanza de vida”, with the 2020 dip preserved in the trend visual and explicit limits separating a population average from individual longevity, health, and equal access.
- Youth unemployment is now also a reviewed published claim: “Casi uno de cada cuatro jóvenes activos está en paro”, with a 2015–2025 trend and explicit denominator limits separating the active population from all young people.
- Total public revenue is now also a reviewed published claim: “Los ingresos públicos de España superan el 40% del PIB”, with a 2015–2025 trend and explicit limits separating government-wide revenue from an individual household’s tax bill.
- Total public expenditure is now also a reviewed published claim: “El gasto público de España supera el 45% del PIB”, with a 2015–2025 trend and explicit limits separating the general-government aggregate from a ministry, service, or efficiency judgement.
- Public-deficit coverage is now also a reviewed published claim: “El déficit público de España baja del 3% del PIB”, with the negative-sign convention exposed in the visual and explicit limits separating the annual flow from accumulated debt and household finances.
- Public-debt coverage is now also a reviewed published claim: “La deuda pública de España supera el 100% del PIB”, with a 2015–2025 Eurostat trend and explicit limits separating accumulated debt from annual deficit, immediate repayment, and household finances.
- Foreign-born population coverage is now also a reviewed published claim: “La población nacida fuera de España ha aumentado desde 2015”, using Eurostat’s country-of-birth stock series and explicitly separating birthplace from nationality, arrivals, administrative status, and causal effects.
- Current CPI coverage is now also a reviewed published claim: “Los precios de consumo subieron un 3,2% interanual en junio de 2026”, using the definitive INE release and separating the national inflation average from each household’s bill and purchasing power.
- Current EPA coverage is now also a reviewed published claim: “La tasa de paro de la EPA bajó del 10% en el segundo trimestre de 2026”, using the definitive INE release and separating the active-population rate from total population, unemployment duration, and job quality.
- Current EPA occupation coverage is now also a reviewed published claim: “España ganó 486.000 ocupados en el segundo trimestre de 2026”, reusing the same definitive release while separating a quarterly occupation change from salary, stability, hours, and job quality.
- High-demand gender-pay coverage is now also a reviewed published claim: “La brecha salarial de género es un mito”, using the INE salary survey to distinguish the observed average gap from a causal discrimination conclusion and from an equal-work comparison.
- High-demand legal coverage is now also a reviewed published claim: “La ley trans permite cambiar de sexo sin ningún control”, using the BOE law and civil-registry instruction to distinguish the removed medical prerequisite from the remaining procedure, age rules, reversal and legal effects.
- High-demand amnesty coverage is now also a reviewed published claim: “La amnistía rompe la igualdad ante la ley”, separating the law’s defined legal exception, the Constitutional Court majority’s equality ruling, dissenting opinions, and the separate political or moral judgment about justice.
- High-demand occupation coverage is now also a reviewed published claim: “Desalojar a un ocupante ilegal tarda años”, separating the civil recovery route, the 2025 criminal-procedure change, the Fiscalía’s limits, and the absence of a universal duration.
- High-demand demographic coverage is now also a reviewed published claim: “España está sufriendo un reemplazo poblacional”, separating measurable changes in birthplace and age structure from the undefined and unproven conclusion of a coordinated replacement.
- Current tourism coverage is now also a reviewed published claim: “Los hoteles subieron precios mientras las pernoctaciones bajaron en junio de 2026”, using the INE hotel release and separating hotel prices and nights from all tourism, local housing, and one-month causal conclusions; signed comparison visuals now show negative changes around a zero baseline.
- European unemployment coverage is now also a reviewed published claim: “España tiene más paro que la media de la Unión Europea”, with a same-definition 2025 Spain/UE-27 comparison and explicit limits separating annual comparable unemployment from the EPA quarterly series and registered unemployment.
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
- The browser now preserves its deterministic result while dynamic analysis runs, times out, is cancelled, or is unavailable; the live enrichment notice explicitly says that the first orientation is already available and uses a small two-step cue for optional context, while completed structured results can still upgrade it automatically.
- The dynamic status is now a non-blocking enrichment notice attached below the first answer, with distinct running, slow, and unavailable states; it never makes the deterministic result look disabled or asks the user to submit a second classification request.
- The live checker now translates assessment codes into the public Spanish labels, exposes automatic versus published result semantics, offers sharing for fast-path answers, and suppresses weak fallback alternatives when no exact claim has been found.
- Published dynamic results now carry the selected claim's own limitation into the result card; provisional source-discovery language no longer appears beneath a strong, reviewed match.
- The homepage now leads with the conversation itself (`¿De qué estáis discutiendo?`), surfaces popular prompts immediately after the checker, exposes the input character limit, marks the active navigation path, and gives broad political wording such as `Pedro Sánchez está destruyendo España` related political context without presenting it as a published verdict. Existing evidence-backed claim families also carry more informal Spanish aliases for long-tail matching.
- The global header now remains available while reading long pages, exposes the previously orphaned `/buscar` route, marks Search active on that route, keeps the checker one click away, and preserves keyboard focus treatment plus anchor-safe scrolling on desktop and mobile.
- The homepage prompt starter now covers additional published everyday claims across healthcare access, unemployment definitions, inflation, housing prices, irregular arrivals, tax aggregates, housing ownership, construction, employment quality, cybercrime, poverty, political concern, housing predictions, labour reform, youth emancipation, corruption, recession, and household tax effects; compact topic filters keep those prompts discoverable without turning the checker into a wall of links.
- Screenshot and audio selection now state that submission is automatic and expose a live status message; the local speech adapter accepts a provider-neutral command/argument contract with bounded execution time while retaining compatibility with the previous development variables.
- Published claim pages now use a reusable answer-first layout: the claim is followed immediately by a visual short answer, supported/not-established/missing-evidence cards, visible review metadata, and response actions before the deeper data and investigation context. The public claim catalogue now shows only published, usable entries and exposes its count and return path to the checker.
- Published claim pages now expose the claim-specific evidence trail behind the answer, including each record's period, geography, unit, source type, and direct source link; broad topic charts remain explicitly labelled as context rather than proof.
- Published claim pages now use the same deterministic accessible SVG/value-table chart pattern as dynamic answers, replacing text-only evidence bars across all 83 published claim pages; direct document-led and comparison claims use typed visuals where a topic chart would be misleading.
- The published claim catalogue now scales through client-side search, accent-insensitive matching, topic filters, live result counts, and a direct empty-state path back to the checker; it remains fully usable as a static page without JavaScript.
- The conversation starter library now covers all 83 published, evidence-backed claim families across immigration, housing, employment, tourism, prices, taxes, inequality, security, politics, youth, corruption, legal rules, demographic change, education, current government events, and everyday economic debates. The homepage keeps the first eight prompts scannable, then lets people reveal the rest or filter by topic instead of creating a wall of prompts.
- The published claim catalogue now uses progressive disclosure: the first 12 cards are scannable by default, while search and topic filters reveal all matching cards immediately and a no-JavaScript visit still receives the complete catalogue.
- The dedicated search page now describes the actual two-layer product: reviewed matches remain the reference library, while new formulations are handed to the checker for immediate deterministic guidance and a bounded automatic follow-up instead of being presented as unsupported dead ends.
- Provisional structured results now use the response state as the publication authority: a draft remains labelled automatic even when it links to a related published topic, so contextual guidance cannot be mistaken for a reviewed verdict.
- The local resolver now prioritizes complete title/alias phrases over aggregate token overlap, respects numeric phrase boundaries, and treats a unique published alias as a safe fast-path match; this prevents unrelated claim families from winning by shared words such as `España`, `millones`, or `empleo`. Optional enrichment now presents the deterministic answer as immediately usable and offers an explicit “continue without waiting” action that cancels only the background request.
- The built claim index now has a CI/build regression gate covering representative aliases for all 83 published families, including unique canonical ownership and variant presence; missing or ambiguous routing coverage fails the build before publication.
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
- Quick and structured result states now place “Comprobar otra frase” and sharing immediately after the first answer, before deeper evidence blocks and alternatives; the primary action no longer requires scrolling to the bottom of a long result.
- Every result state now includes a visible “Comprobar otra frase” action that clears the previous result, cancels any pending analysis, resets media selection, updates the character counter, and returns focus to the checker.
- Sharing now preserves the result’s destination: published claim answers link to their canonical reviewed page, while related, provisional, and uncovered answers share the original phrase through `/?q=…#comprobar` so the recipient can reopen the same discussion.
- Text results now preserve the submitted claim in the shareable `?q=…#comprobar` URL, so copied links reopen the same checker state; media content is deliberately kept out of the URL.
- Broad uncovered claims now receive a bounded “concretar por un tema” set of published topic links when enough text is present. This provides a useful next action without presenting a topic as a match or inventing evidence.
- Truly uncovered structured results now say “Sin coincidencia directa” in the checker UI, distinct from “Resultado automático” for provisional evidence; the evidence state and next step remain visible before secondary analysis details. Unknown browser inputs no longer receive unrelated popular-claim suggestions; popular discovery stays on the homepage and uncovered results remain focused on clarification.
- Homepage discovery cards now expose the reviewed assessment beside the topic, so visitors can choose a useful starting point without opening several pages; latest-check cards use the same compact status language. Every deterministic result state now exposes a consistent state description, and submitting a claim moves keyboard and assistive-technology focus to the result without changing the immediate deterministic path. Broad political complaints such as `España va cuesta abajo` and `El país se va a la ruina` now route to politics context while remaining explicitly non-verdict guidance.
- The deterministic compiler now recognizes broad evaluative phrases such as “España está destruida”, “España va cuesta abajo”, and “El país se va a la ruina” as requiring a definition/context clarification, preserving the complaint while refusing to turn it into an unsupported national verdict. Model routing is reconciled against that deterministic safety result, broad inputs cannot trigger unrelated official-source discovery, and budget evidence is only rendered for budget-transfer handlers; the overly broad recession alias for “España se va a la ruina” was removed.
- The deterministic compiler no longer treats the negated phrase “no significa que” as a definition question, so claims such as economic growth versus cost of living can resolve to their exact published claim instead of being downgraded to a generic topic.
- The evaluation runner now reports known retrieval recall, irrelevant matches, unsupported-conclusion rate, proposition-breakdown coverage, answer-plan traceability, coverage distribution, cache-hit telemetry, and latency alongside the current 324-case safety metrics.
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

Status: started; published-claim proposition migration and runtime traceability are implemented for all 83 published claims; the fallback compiler now performs bounded multi-proposition decomposition for contrast, result, semicolon, and safe conjunction clauses, preserves directional proposition shapes, and emits deterministic semantic family signatures. Evidence-to-proposition relationships are now stored in a versioned manifest, validated against proposition status and references, and exposed to the published evidence trail. Each relationship now has an expandable explanation that names the linked proposition and explains whether the record supports, contradicts, qualifies, contextualizes, or is insufficient for it; independent review metadata remains future work.

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

Status: started; the conversation-first homepage, topic-filtered popular prompts, assessment-aware discovery cards, broad-topic guidance, and answer-first published-claim layout are implemented alongside the deterministic match, fallback, input, and timeout states. The evaluation now confirms full known-family recall and unknown-safety after phrase-level alias matching, transposition tolerance, and suppression of irrelevant context for local/private claims. Results now offer context-specific jumps to the reply, next question, and sources, with consistent state descriptions and result focus for keyboard and assistive-technology users. Broad, related, and uncovered results can also offer one-click topic-aware measurable follow-ups that reuse the current warehouse and published-claim routes instead of attaching an unrelated nearby answer. Semantic-family signatures now recognize common Spanish causal paraphrases such as `hacen que aumenten`, `vuelve inseguro`, `con más ... hay más ...`, `desde que hay más ... hay más ...`, `está detrás de ...`, `está provocando`, `tiene la culpa de ...`, and `hace crecer ...`, plus past-tense and colloquial trends, positional comparisons, highest/lowest rankings, terse priority language, directional group comparisons, symmetric association paraphrases such as `se relaciona con`, and broader everyday cost-of-living, public-finance, health, income, demographic, and education wording. The NEET/youth-outcome family now merges `ninis` and `ni estudian ni trabajan` variants without merging them into youth unemployment. Absolute public-debt stock and debt-to-GDP ratio now remain separate semantic families across browser and local signatures, preventing those distinct evidence routes from sharing a review cluster. Generic cost-pressure language is kept out of ranking detection; association versus causation, opposing polarity, reversed comparisons, and opposing priority statements remain separate. The review queue now optionally applies a local-only embedding pass to merge compatible paraphrase families that deterministic signatures miss, with strict claim-type, polarity, relation, number, geography, population, period, and linked-claim guards plus deterministic fallback. Broader model-backed extraction remains pending.

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

Broad evaluative phrases now receive a dedicated clarification path: the checker explains that the wording combines several possible discussions and offers measurable, one-click choices for the most relevant topics. Optional background enrichment now says explicitly that the first result is already usable and offers `Usar solo este resultado`, which cancels only the background request rather than creating a second classification step.

## Phase 3 — Local claim compiler

Status: boundary implemented; first compiler-result slice complete; deterministic decomposition now preserves separate explicit clauses and directional subject/relation/object shapes before model escalation. The compiler now shares conservative semantic signatures across additional everyday Spanish causal, trend, comparison, ranking, symmetric association, priority, group-comparison, cost-of-living, public-finance, health-access, health-spending, income, demographic, and education constructions, including colloquial temporal/causal phrasing and past-tense trends. The NEET compiler family is now distinct from youth unemployment and recognizes both acronym-like and plain-language variants. Absolute public-debt stock and debt-to-GDP ratio are also separated before clustering, matching their distinct metric handlers. Explicit versus implied propositions remain separate, and browser/local compiler tests protect against collapsing unrelated evidence families or treating ordinary affordability pressure as a ranking. The review queue can now optionally use local embeddings to group compatible paraphrase clusters after deterministic compilation; remote providers are rejected and failed local inference falls back without changing the queue. Broader model-backed extraction remains pending.

Run the local service on a dedicated always-on machine. Package it with Docker Compose so the current Mac remains suitable for development.

Initial model baseline:

- a small Spanish-capable local chat model for structured extraction and planning;
- a local multilingual embedding model for retrieval;
- a local vision model for screenshots later;
- local speech-to-text later.

Benchmark the installed small models against a Spanish evaluation set and retain the smallest model that meets the quality threshold.

The compiler must produce strict JSON containing:

The deterministic fallback now preserves common written Spanish quantities and percentages such as `tres millones` and `treinta por ciento`, so numeric claims remain clusterable and comparable even when local inference is unavailable.

The client fallback now keeps broad complaints from receiving arbitrary topic suggestions: detected topics get relevant context, while topic-free inputs get focused clarification without unrelated published checks. Common political formulations such as `España está destruida` also route to the political context family.

The homepage now exposes fifty compact warehouse-backed discovery cards across cost of living, macroeconomics, housing, employment, statutory minimum wage, social protection, pensions, health, healthcare access, security, territory, public debt, youth unemployment, demography, inequality, public revenue, public expenditure, household income, ageing, early school leaving, tertiary education, NEET, AROPE, unmet healthcare needs, foreign citizenship, part-time employment, temporary employment, hourly earnings, housing-cost overburden, and life expectancy, and Spain-versus-EU growth, inflation, employment, revenue, expenditure, health spending, healthcare access, median income, GDP per capita, old-age/survivors spending, current taxes on income and wealth, part-time employment, temporary employment, hourly earnings, housing-cost overburden, early school leaving, NEET, AROPE, and life expectancy comparisons. The checker also provides seventy-six progressive long-tail prompts and the `/datos` catalogue exposes every configured metric family, while the six high-value starters remain visible so current-data coverage stays discoverable without turning the homepage into a wall of cards. These are reusable data entry points rather than manually authored verdicts.

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
POST /api/classify
GET  /api/classify/:requestId
```

The frontend submits once and polls automatically when a request is processing. There is no second classification click.

`/api/resolve`, `/api/v1/resolve`, and the local `/v1/resolve` paths remain compatibility/internal routes so existing smoke tests and deployments do not break.

## Phase 4 — Retrieval and evidence warehouse

Status: started; JSON and PostgreSQL lexical retrieval are implemented, with opt-in pgvector hybrid retrieval and a recorded relevance benchmark now available. The benchmark now rejects all negative cases and unsafe conflicting top matches while keeping comparison-family boundaries intact for reordered Spanish wording. BOE consolidated-law metadata and bounded article blocks are normalized into typed, versioned legal records. Legal answers can resolve the norm, jurisdiction, effective date, repeal state, current article version, exact consolidated wording, and attributable source without presenting the informational consolidated text as a legal opinion. On-demand title-pair discovery can now retrieve current article text for an unseen legal claim. Statistical coverage now includes public debt, youth unemployment, total government revenue, total government expenditure, Spain-versus-EU revenue, expenditure, current taxes on income and wealth, and health expenditure, housing-cost overburden, Spain-versus-EU housing-cost overburden, health expenditure per inhabitant, social-protection benefits expenditure per inhabitant, old-age and survivors benefits expenditure per inhabitant, Spain-versus-EU old-age and survivors benefits expenditure per inhabitant, life expectancy at birth, fertility rate, old-age dependency ratio, 65+ population share, 0–14 population share, population-change rate, harmonised inflation rate, Spain-versus-EU harmonised inflation, household electricity prices, Spain-versus-EU household electricity prices, actual-rentals price index, category-level recorded offences, employment rate, Spain-versus-EU employment rate, unemployment rate, European unemployment comparison, resident population, foreign-born population, residents by foreign citizenship, annual immigration flows, and statutory minimum wage in addition to the existing GDP, poverty, migration, inflation-index, inequality, income, and housing families. Terse everyday queries such as `precios vivienda España`, `crecimiento interanual PIB real España`, `¿crece España más que la Unión Europea?`, `¿está la inflación española por encima de Europa?`, `¿tiene España una tasa de empleo mayor que Europa?`, `¿España recauda más o menos que la Unión Europea?`, `¿España cobra más impuestos sobre renta y riqueza que la Unión Europea?`, `¿España gasta más o menos que la Unión Europea?`, `¿España gasta más por habitante en sanidad que la Unión Europea?`, `¿España gasta más por habitante en pensiones que la Unión Europea?`, `¿España paga más por la luz que Europa?`, `¿España tiene más sobrecarga de vivienda que Europa?`, `porcentaje hogares soporta sobrecarga coste vivienda`, `cuánto dinero se dedica por persona a la sanidad`, `¿ha subido el salario mínimo en España?`, `¿cuánto gasta España en prestaciones de protección social por habitante?`, `¿cuánto gasta España en pensiones y prestaciones de supervivencia por habitante?`, and `¿cuántos residentes tienen ciudadanía extranjera en España?` now route to the corresponding typed warehouse series. Spain-versus-EU GDP growth, harmonised inflation, employment, revenue, expenditure, current taxes, health spending, household electricity prices, median income, GDP per capita, old-age/survivors spending, and housing-cost overburden use the latest common period and a comparison visual instead of collapsing the request into a Spain-only trend. Regional density comparisons now filter the named Spanish autonomous communities and use a same-period comparison visual instead of collapsing the request into one regional trend. Recorded-crime routing requires an explicit category such as homicides and refuses to present the first category as a national all-crime total; local insecurity and immigration-causality wording remain separate clarification paths. Employment, unemployment, population, migration, citizenship, public debt, health spending, household-income, minimum-wage, social-protection, pensions, tax, electricity, and housing-cost wording now selects its intended metric family before semantic retrieval. Public-information reuse wording now has a bounded BOE fallback that prioritizes operative articles over annexes and returns a qualified answer separating access, reuse, licensing, exclusions, and attribution conditions. Broader source/domain coverage, wider legal-query recall, jurisprudence, and observation-level PostgreSQL benchmarking remain pending.

The warehouse now also exposes nominal GDP, GDP per capita, and absolute public debt through everyday wording such as `tamaño de la economía española`, `PIB por habitante`, and `cuánto debe España en euros`, keeps aggregate output, real growth, per-person output, debt stock, debt ratio, and deficit separate, localizes their units, and surfaces the families through the homepage data prompts and `/datos` catalogue. The Spain-versus-EU youth-unemployment family is now also a first-class metric: the same 15–24 active-population denominator is preserved across the source refresh, warehouse comparison handler, catalogue, claim page, aliases, and regression suite. The Spain-versus-EU early-school-leaving family is now also first-class: Eurostat’s same-definition 18–24 comparison is refreshed into the local warehouse, routed through a dedicated comparison handler, exposed as a compact education discovery card, and covered by the claim page, aliases, metric registry, retrieval corpus, and resolver regression suite. The Spain-versus-EU NEET family is now first-class as well: Eurostat’s same 15–29 population and 2025 common-period comparison are refreshed, routed separately from Spain-only NEET and youth unemployment, and covered by a reusable comparison card, catalogue prompt, aliases, benchmark case, and local resolver smoke test. The Spain-versus-EU AROPE family now follows the same path, keeping the total-population denominator and composite-indicator limitation explicit while separating it from Spain-only AROPE.

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

The current-data layer now includes part-time and temporary employment in Spain and their Spain–EU comparisons, plus Eurostat median gross hourly earnings for Spain and the Spain–EU comparison (latest common observation: 2022). Its reviewed starter claims distinguish the share of existing employment with a given contract or schedule, or a wage measure, from stronger unsupported statements about all newly created jobs, net pay, minimum wages, or overall job quality.

This iteration adds two reviewed Spain-versus-EU comparison families—old-age/survivors benefits and current taxes on income and wealth—as static claim pages backed by the same warehouse metrics. It also adds the reviewed youth-unemployment comparison family, extending the existing youth level and trend coverage into a same-period international comparison. They demonstrate the intended scale path: promote high-demand reusable evidence into concise pages without creating a bespoke investigation for every phrasing.

Status: in progress. Unknown measurable claims progressively use the local warehouse and constrained official discovery. Unknown legal claims now search BOE's consolidated-legislation collection with bounded wildcard title pairs, reject expired or outdated consolidations, download at most two bounded official texts, select only current directly matching articles, cache the result, and retain scenario/jurisprudence limitations. Public-information reuse variants are recognized as one reusable legal family, with operative-article ranking and a source-backed conversational response instead of a generic legal disclaimer. Budget-transfer variants such as “Bolaños se lleva 310 millones de Educación” and “Educación pierde 310 millones para Presidencia” now share the official-event parser and money-flow answer, with unsupported service-cut and adviser implications kept explicit. Evaluation-driven routing now resolves typo variants without combining unrelated aliases, and refuses to attach national context to local/private claims that require unavailable records. Broader current-event coverage and persistent knowledge-gap promotion remain pending.

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

The latest employment-quality and hourly-earnings additions are available through the same compact comparison and value-table renderer; no bespoke wall of text or new visual engine is required for each wording. Dynamic evidence-backed result blocks now expose a compact human-readable source label and a direct jump to the source section instead of showing only an opaque evidence-record count.

The comparison pages also exercise the reusable labelled comparison visual with units, period, evidence limit, and accessible value-table fallback. Claim evidence trails now expose each linked record's concise finding inline, an explicit “what this record establishes” label, the source date where available, and its own limitation where the record provides one, so users do not need to open a source merely to understand what it establishes. The youth-unemployment evidence now powers separate reviewed “fell by almost half”, “still high”, and “Spain versus the EU” claim families, with trend and comparison visuals plus regression cases; level, direction, and international context are no longer forced into one answer. The homepage now promotes the Spain-versus-EU youth question in the first conversation examples and data cards, and background enrichment is labelled as optional context while the first deterministic answer remains visually primary. Temporary-employment trend and comparison claims, Spain-only and Spain-versus-EU hourly-earnings questions, life expectancy, and healthcare-access comparisons reuse the same visual contract. Broader reviewed chart coverage and reusable animated scenes remain future work.

Status: in progress. The shared renderer now supports claim breakdowns, key numbers, accessible inline SVG trend/comparison charts with expandable value tables, money flows, confirmed/unknown cards, source excerpts, strongest-valid-concern cards, evidence ladders, legal decision paths, prediction conditions, normative trade-offs, group-comparability checklists, conversation replies, source links, and answer-first topic-page chapters. Dynamic structured answers now begin with a compact evidence-state/limitation/next-step overview before secondary method detail; unresolved and values results now keep their core method guidance visible instead of hiding it behind a disclosure, while definition ladders use a concrete label rather than a causal one. Broad definition results also offer one-click measurable questions so users can move from a vague complaint to a useful check without rewriting it themselves. Results now provide client-side `Entender`, `Responder`, and `Fuentes` modes over the same verified answer, with `Entender` hiding the longer reply card until the user asks for a response; this reduces the default wall of text without rerunning analysis or removing the copyable response. The homepage now makes warehouse-backed questions visible as compact, one-click data cards, with six high-value cards visible first and the remaining coverage behind a native accessible disclosure; the fifty compact cards cover the current evidence families, including residents by foreign citizenship, social-protection benefits expenditure, old-age and survivors benefits expenditure, the Spain/EU old-age and survivors comparison, Spain/EU current taxes on income and wealth, education, youth outcomes, NEET comparisons, unmet healthcare needs, Spain/EU healthcare access, housing-cost overburden, Spain/EU housing-cost overburden, Spain/EU GDP growth, harmonised inflation, employment, revenue, expenditure, health spending, median income, GDP per capita, temporary employment, and hourly earnings. The `/datos` catalogue now groups every metric family by subject and launches an explicit human question for each family instead of exposing generic registry wording. All published claim pages use the same deterministic chart/value-table pattern. Automatic warehouse trend charts now retain the first baseline alongside the latest periods, keeping the visual range consistent with its narrative comparison. The optional dynamic-analysis notice now explicitly separates the usable first orientation from background enrichment, changes automatically to a terminal non-blocking fallback when it takes too long, and never requires a second click or submission to leave the result usable. Broader reviewed chart coverage and reusable animated scenes remain pending.

Render structured, reusable components:

The broad-definition UI now chooses one-click follow-up questions from the detected topic, so vague health, housing, employment, immigration, and economic complaints lead to relevant measurable checks instead of the same generic list.

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

Status: started; browser media validation, automatic file submission, paste/drag-and-drop screenshot intake, live media status guidance, and typed-caption fallback are implemented. A screenshot/audio submission with a typed claim now retains that claim's deterministic guidance when local extraction is unavailable, while file-only failures offer published alternatives instead of a dead end. Selecting, dragging, or pasting a screenshot submits it automatically, so media input does not create a hidden second step. The local link adapter supports public HTTPS pages with DNS-based SSRF protection, bounded redirects, response limits, and generic failure states. Local vision and speech runtimes remain optional, use a provider-neutral speech command contract, and fail back without blocking deterministic text guidance.

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

This iteration adds `knowledge:review-queue`, a maintainer-only JSON/Markdown shortlist with ranked candidates, evidence IDs, coverage-specific next actions, and excluded operational-noise counts. Conservative token-overlap reconciliation prevents compressed variants of an existing published comparison from re-entering the manual queue. The report is derived from the cluster output, remains local-only, and never publishes directly.

Status: started; durable review-queue merge, recency ranking, deterministic semantic-family merging, optional local embedding-assisted paraphrase merging, and published-catalogue reconciliation are implemented. Local and production D1 clusters now also merge compatible near-signatures across runtime versions, while polarity, relation, geography, population, period, numeric, and conflicting linked-claim fields remain separate; public promotion and static materialisation remain owner-approved. The embedding pass is local-only, bounded, metadata-tracked, and optional, so missing or failed inference preserves the deterministic queue. The public popularity feed now returns the linked reviewed claim destination, so approved popular questions open their canonical answer directly and never expose raw unreviewed submissions. Warehouse-routable compressed and colloquial cluster signatures are now excluded from the manual materialisation queue, and metric search aliases are shared by local JSON, PostgreSQL, and SQL-export indexes so deployment paths keep the same long-tail coverage.

Long-tail capture now starts as soon as a user submits an unresolved text claim, before optional background analysis finishes. This preserves the learning signal when the local runtime is slow or unavailable. Screenshot and audio results can add their extracted canonical wording later. The D1 ingestion path is idempotent by request ID, so retries and repeated UI callbacks update recency without inflating cluster popularity. `npm run learning:validate` protects these guarantees.

The solo-maintainer handoff is now reproducible with `npm run knowledge:triage`: it combines local gap records with an optional explicit `--export-d1` production snapshot, clusters and reconciles them against the published catalogue, then writes one ranked JSON/Markdown review queue. Production export is opt-in and the command never publishes or promotes a claim.

Cluster inputs by canonical proposition signature. Track:

- most asked;
- fastest growing;
- newly covered;
- still unresolved;
- high-impact knowledge gaps.

Rank the owner review queue using frequency, growth, potential harm, evidence availability, and feasibility.

The queue is a derived artifact, not a second source of truth. `knowledge:export-query-clusters` exports the current operational D1 clusters, including semantic family signatures, and `knowledge:cluster --d1-input ...` merges them with local learning records. During clustering, historical wording and common conversation wrappers are reconciled against the current published Markdown aliases, so a claim published after a submission does not remain a false knowledge gap. Each output cluster carries query count, seven-day activity, growth rate, coverage/review state, linked claim, input types, source IDs, a neutralized review text, and a reason for its priority. The materialization command accepts only candidates with enough demand and source references; it also excludes clusters already covered by a deterministic warehouse metric route or a bounded public-information legal route, newly covered clusters remain reviewable, and already published clusters do not re-enter the queue.

`knowledge:cluster:validate` protects representative published-family reconciliations, including typo-tolerant long-tail wording for the pensions claim. This keeps the review queue focused on genuinely uncovered claims rather than stale copies of known answers.

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
- Run production smoke checks against both static routes and the generic `/api/health`, `/api/classify`, and backward-compatible `/api/resolve` boundaries without requiring dynamic inference to be available.
- Exercise text, screenshot, and audio multipart requests against both the production `/api/classify` boundary and the local boundary in CI with inference unavailable; each request must finish with a useful result or generic unavailable state. Malformed operational submissions now return a generic client error instead of an uncaught runtime failure.
- Source freshness now uses the real runtime clock, with an explicit deterministic test override; unregistered discovery snapshots do not block the authoritative freshness gate, while ad-hoc BOE consolidated-legislation snapshots use a weekly cadence instead of inheriting daily-summary freshness.
- BOE daily-summary refreshes now retry a bounded window of previous publication dates when the requested date is a non-publication day, while preserving immediate failures for other source errors.
- CI now runs the homepage, data-catalogue, published-claim, catalogue, topic, and public-journey UX contracts on every push and pull request, alongside ranking, semantic-clustering, resolver-lifecycle, and roadmap audits.
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
