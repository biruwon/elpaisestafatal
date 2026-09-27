# Claim-answer pipeline

The system has five product-level stages. Internal modules remain separate where they enforce a safety or data-quality boundary.

```text
1. Interpret and route
   claim -> propositions, dimensions, metric families, claim type

2. Retrieve and select evidence
   metric families -> warehouse observations, official sources, freshness and fit checks

3. Synthesize and qualify
   selected evidence -> findings, limitations, cross-family conclusion

4. Fallback and present
   dynamic evidence or reviewed snapshot -> public response, labels, sources, missing dimensions

5. Learn and refresh (asynchronous)
   unresolved claim -> cluster -> official research -> LLM assessment -> warehouse -> audit
```

## What belongs to each stage

| Stage | Main implementation pieces | User-visible result |
| --- | --- | --- |
| Interpret and route | `fallback-compiler`, local compiler, semantic family routing, metric hints | The claim is translated into measurable propositions without inventing numbers. |
| Retrieve and select evidence | warehouse query, semantic search, evidence selection, freshness policy | Only compatible observations and sources are retained. |
| Synthesize and qualify | evidence packet, answer planner, domain/causal/legal handlers | Evidence is summarized without turning correlation, totals, or rhetoric into proof. |
| Fallback and present | snapshots, public response contract, UX labels, provenance | The answer clearly says whether it is dynamic, snapshot-based, mixed, limited, or unsupported. |
| Learn and refresh | triage, research loop, LLM assessment, materialization, coverage audit | New claims improve the warehouse and future routing automatically. |

The five stages are the public architecture. The individual modules should not be merged when doing so would remove a boundary—for example, interpretation must remain separate from evidence selection, and evidence selection must remain separate from synthesis.

The model-selection and fine-tuning decision is documented in
[`model-strategy.md`](./model-strategy.md). In short: models interpret and
synthesize supplied evidence; reviewed sources remain the factual authority.

## User-submitted claims and demand export

After `/api/check` accepts a submission, a Pages Function schedules a
best-effort server-side write to Cloudflare D1. It stores a lowercased,
punctuation-normalized version of the submitted claim, truncated to 600
characters, plus semantic and canonical signatures, input type, `received`
status, and submission time. Normalization does not remove personal details;
the stored wording can include them. Each submission with claim text gets a
new event row, and equivalent wording is grouped into a `query_clusters` row
with an incrementing count. Uploaded files and complete answers are not
written to these claim tables. URL-only and media-only submissions without
claim text are not added to the review queue.

To read current demand clusters from the configured remote D1 database, run:

```sh
npm run knowledge:export-query-clusters
```

Wrangler must be authenticated for the Cloudflare account. The command writes
`.local/d1-query-clusters.json`, including total counts and rolling 7- and
30-day counts. The scheduled `knowledge-triage` GitHub Actions workflow also
exports clusters when its Cloudflare secrets are configured and retains its
review artifact for 30 days.

## Warehouse storage and retrieval

`.local/source-warehouse` remains the rebuildable source snapshot used in
local development and offline workflows. The daily `knowledge-refresh`
workflow exports its structured records into the configured D1 database;
`/api/check` searches D1's FTS index and passes bounded candidates to the
existing evidence ranker. When D1 is unavailable or returns no compatible
candidates, the local resolver can use its file-backed snapshot. Numeric
observations and typed `official_publication`, `legal_document`, and
`legal_rule` records share the generic `observations` table so event and legal
evidence retain their types without parallel tables.

Before this change, the refresh job generated a SQL artifact but never loaded
it into D1, and the export referenced columns missing from the applied schema.
The runtime continued to query the JSON snapshot. Migration 0010 aligns the
schema, while the refresh workflow now loads the generated SQL in bounded D1
imports and `/api/check` reads its FTS index.

The initial D1 schema also proposed separate `government_events` and
`legal_rules` projections, scored `evidence_relationships`, and
`ingestion_runs`. They had no runtime readers or ingestion writers. Event and
legal handling already operates on typed records in the file warehouse;
evidence fit is computed by the resolver, and refresh history is retained by
GitHub Actions. Migration 0010 drops the unused D1 projections.

`answer_feedback` had no browser caller, no reader, and no stored rows; its
capture endpoint and table are removed. The custom `api_rate_limits` counter
was active, but it exists only to throttle abuse, so its durable D1 writes and
daily cleanup job are replaced by Cloudflare's native Worker rate-limit
binding. The D1 request rows and semantic clusters remain because the private
triage workflow reads them. Unused per-request lifecycle/result fields and
unused cluster research/feedback counters are dropped while legacy request
signatures remain available to older Pages deployments and active review and
clustering fields remain. Cloudflare's native counters are per edge location
and eventually consistent, which suits abuse throttling but not exact usage
accounting.

The Pages Functions service binding targets the separate
`elpaisestafatal-rate-limits` Worker. Cloudflare's Git-connected Pages build
does not run `npm run deploy:pages`, so provision that Worker before the first
Git deployment with:

```sh
./node_modules/.bin/wrangler deploy --config wrangler.rate-limits.jsonc
```

The Worker must exist before Pages can publish a Function that binds to it.
`npm run deploy:pages` handles the order automatically for command-line
deployments; publish the Worker first when deploying Pages directly from Git.

## Core vocabulary

- A **metric** is a reusable measurement definition, such as unemployment rate or recorded offences.
- A **warehouse record** is one source observation for a metric, period, geography, population, and value.
- A **cluster** groups recurring user claims with equivalent meaning so coverage and research work can be managed together.
