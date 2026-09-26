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
best-effort server-side write to Cloudflare D1. It stores a filtered,
normalized text version, semantic and canonical signatures, input type,
`received` status, and submission time. Each accepted text submission with
claim text remaining after filtering gets a new event row; equivalent wording
is grouped into a `query_clusters` row with an incrementing count. The claim
record is not joined to a visitor ID or the
rate-limit fingerprint. The raw request text and uploaded file are not written
to these claim tables. Automatic filters are heuristic, so users should not
submit personal or confidential details. File-only and URL-only requests
without remaining claim text are not added to claim clusters.

To read current demand clusters from the configured remote D1 database, run:

```sh
npm run knowledge:export-query-clusters
```

Wrangler must be authenticated for the Cloudflare account. The command writes
`.local/d1-query-clusters.json`, including total counts and rolling 7- and
30-day counts. The scheduled `knowledge-triage` GitHub Actions workflow also
exports clusters when its Cloudflare secrets are configured and retains its
review artifact for 30 days.

## Core vocabulary

- A **metric** is a reusable measurement definition, such as unemployment rate or recorded offences.
- A **warehouse record** is one source observation for a metric, period, geography, population, and value.
- A **cluster** groups recurring user claims with equivalent meaning so coverage and research work can be managed together.
