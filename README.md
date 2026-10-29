# El país está fatal

A Spanish-language claim checker about Spain. Users submit text, links, images,
audio, documents or short videos. Answers explain what compatible evidence
establishes, what it measures, and what remains unknown.

The application uses Astro for the public site, Cloudflare Pages Functions and
D1 for the API and evidence index, and a local resolver for extraction,
interpretation and grounded composition. Reviewed Markdown and versioned
primary-source snapshots are the factual inputs. A model's memory is not an
evidence source.

## Run locally

Use Node 22 and npm 10 or later.

```sh
npm ci
npm run catalogue:compile
npm run dev:local-ai
```

Open `http://127.0.0.1:4321`. The stack uses ports 4321, 4322 and 8789; stop a
previous stack or override the corresponding `LOCAL_*_PORT` variables. An
existing production resolver may already occupy 8789. `npm run dev` alone
serves the Astro frontend without the local API gateway.

The resolver uses the configured local model provider. For a deterministic
development run, set `LOCAL_CLAIM_COMPILER=0` and `LOCAL_ANSWER_PLANNER=0`.
Vision extraction still requires a working vision model.

To prepare offline speech transcription, install Python 3.9 or later and run:

```sh
npm run speech:setup
```

This installs a project-local virtual environment and downloads the speech
model. Restart the resolver afterward. Models are cached locally; audio
transcription requests do not download models or send audio to a speech API.
`LOCAL_SPEECH_COMMAND` and JSON `LOCAL_SPEECH_ARGS` remain available for another
local adapter. In Docker, run setup inside the container; virtual environments
and readiness records are separate for each platform.

## Maintain the evidence

```sh
npm run knowledge:refresh
npm run knowledge:domain-refresh
npm run knowledge:crime:rates
npm run knowledge:coverage:audit
```

Inspect `.local/source-refresh-report.json`, `.local/domain-refresh-report.json`
and `.local/coverage-audit.json`. An incomplete refresh retains successful
sources and reports the failures. A configured source is not proof that a claim
is covered. Keep the indicator, geography, period, population, denominator,
unit, methodology and observed/projected/budget status aligned.

For an authenticated production data sync:

```sh
npm run knowledge:warehouse
npm run knowledge:warehouse:sql
npm run d1:migrate
npm run knowledge:warehouse:d1
```

The SQL export and import stream bounded batches. Historical source objects
stay local; the production index uses the latest snapshot for each resource
and metric. Domain sources also write manifests so they enter the same mirror.
For a small corrective import, `WAREHOUSE_D1_INPUT` can select a separately
generated SQL file.

## Verify changes

```sh
npm run check
npm run build
```

The build includes semantic routing, paraphrases, negative neighbours, evidence
selection, media extraction, upload/polling isolation, SQLite-backed demand
deduplication, domain-to-D1 export and bounded bulk-import tests. Tests use local
fixtures rather than live model outputs. Real vision and speech checks are
separate operational checks against the configured runtime.

See [the project assessment](docs/project-assessment.md),
[the answer pipeline](docs/claim-answer-pipeline.md) and
[the model strategy](docs/model-strategy.md).
