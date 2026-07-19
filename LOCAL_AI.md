# Local AI development

The public site remains a static Astro build. Local AI is optional and runs outside Cloudflare Pages.

## Text and links

```bash
npm run clarify:local -- "Los inmigrantes crean inseguridad"
npm run clarify:local -- https://example.com/article
```

The command extracts page text for URLs, asks Ollama to classify the input against the approved claim families, and appends the original input and result to `.local/knowledge-gaps.jsonl`.

## Screenshots

```bash
npm run clarify:local -- --image /absolute/path/screenshot.png
```

This uses `qwen3-vl:8b` by default. Override the model with `OLLAMA_MODEL`.

## Audio

```bash
npm run clarify:local -- --audio /absolute/path/recording.m4a
```

Audio is transcribed only when `WHISPER_COMMAND` is configured to a local command that writes the transcript to stdout. Without it, the input is recorded as unsupported. No audio is sent to the public site.

For a command that accepts the audio path as its first argument:

```bash
WHISPER_COMMAND=/path/to/local-transcriber \
WHISPER_ARGS='["{audio}"]' \
npm run clarify:local -- --audio /absolute/path/recording.m4a
```

`{audio}` is replaced with the supplied file path. The resulting transcript is then passed through the same approved-claim classifier as text and links.

## Endpoint and local models

The browser always submits to the same-origin `/api/resolve` endpoint. Provider configuration stays server-side and is never included in the built HTML. The endpoint may return a completed result or a request ID; the browser polls automatically until the local analysis completes or times out.

For a tunneled or containerized origin, set the same random `LOCAL_CLASSIFIER_TOKEN` in the Pages Function environment and the local resolver environment. The token is optional for a loopback-only development setup.

### Durable local origin

For a later production iteration, create a named tunnel with an API token that has `Account → Cloudflare Tunnel → Edit`, copy `config/cloudflared.example.yml` to the machine's `~/.cloudflared/config.yml`, replace its placeholders locally, and point the Pages secret `LOCAL_CLASSIFIER_ENDPOINT` at the HTTPS hostname. Keep the resolver bound to `127.0.0.1:8789`; the tunnel template has a deny-by-default fallback. Run `npm run origin:validate` before deployment. Temporary account-less tunnels are suitable only for connectivity tests, not production uptime.

This tunnel is intentionally deferred. The current production deployment does not require local inference: it serves deterministic claim matching and evidence guidance through the static site and API fallback. A public health response with `dynamic: false` is therefore expected until the persistent origin is configured.

The local development proxy keeps the local inference service behind the same-origin `/api/resolve` boundary. Set up the local models once:

```bash
npm run ai:setup
npm run dev:ai
```

The service uses the locally installed `gemma3:4b` router and `bge-m3` embedding model by default. Override them only with models installed in the local Ollama instance using `OLLAMA_ROUTER_MODEL` and `OLLAMA_EMBED_MODEL`. Production keeps the deterministic lookup and does not run inference.

For local experiments, `LOCAL_ANSWER_PLANNER=1` enables a final presentation pass after deterministic enrichment. The planner receives a bounded evidence packet and may only rewrite the headline, summary, question, limitation, and existing conversation reply. It cannot add evidence IDs, sources, visual blocks, or unsupported numbers; malformed, timed-out, or untraceable output is discarded automatically. Leave it unset for the fastest deterministic path.

Meaningful unmatched text (at least three substantive terms, or two terms plus a number) is passed through the local structured compiler even when it has no published candidate. The compiler only extracts propositions, entities, numbers, and retrieval hints; it does not assess truth. Obvious low-signal input such as a single random token continues to use the immediate deterministic fallback.

The resolver uses a short local-inference circuit breaker: a failed or timed-out model request temporarily suppresses repeated model/embedding attempts, while the deterministic matcher and evidence guidance continue immediately. Embeddings are only requested when lexical retrieval finds a plausible candidate.

The checked-in evaluation corpus can be run in slices when measuring model changes. For example, `EVALUATION_OFFSET=0 EVALUATION_LIMIT=180` covers known-claim variants and `EVALUATION_OFFSET=180 EVALUATION_LIMIT=120` covers unknown and long-tail inputs. The current local development run with the installed models reached 180/180 known accuracy and 120/120 unknown safety; slow-path p95 was approximately 2.5 seconds.

## Optional containerized resolver

The resolver can also run as a restartable local container while Astro and Ollama remain on the host:

```bash
docker compose -f docker-compose.local.yml up --build -d
```

The compose file binds the resolver to `127.0.0.1:8789`, mounts only the local derived cache, and uses host services for the catalog and local model runtime. It is a development/deployment convenience; the public site still communicates through the same-origin API boundary.

## Refresh the local evidence warehouse

The resolver can ingest approved official feeds into the rebuildable local warehouse. Start from the checked-in example, then add or remove endpoints as needed:

```bash
mkdir -p .local
cp config/source-refresh.example.json .local/source-refresh.json
npm run knowledge:refresh
npm run knowledge:warehouse
```

The example refreshes approved BOE, INE, and Eurostat resources. `{yesterday}` and `{today}` placeholders are expanded at refresh time. Normalized observations are used for provisional number and trend cards; they do not become published verdicts without an explicit reviewed claim.

### Optional PostgreSQL retrieval backend

The JSON warehouse is the offline fallback. For a larger local installation, load the same derived data into PostgreSQL and let the resolver query indexed rows instead of scanning files:

```bash
export WAREHOUSE_DATABASE_URL='postgresql://localhost/claims'
npm run knowledge:warehouse:postgres
WAREHOUSE_DATABASE_URL="$WAREHOUSE_DATABASE_URL" npm run dev:ai
```

The loader applies the additive warehouse migrations, creates the `pg_trgm` search index, and upserts the current source snapshots and observations. If the database is unavailable, the resolver automatically falls back to `.local/source-warehouse`; the public API and UI do not change. PostgreSQL is a derived copy and can always be rebuilt from the source manifests.

For semantic retrieval, the compose file also provides an optional PostgreSQL profile with `pgvector`:

```bash
docker compose -f docker-compose.local.yml --profile warehouse up -d warehouse
export WAREHOUSE_DATABASE_URL='postgresql://claims:local-development-only@127.0.0.1:5433/claims'
WAREHOUSE_EMBEDDINGS=1 npm run knowledge:warehouse:postgres
WAREHOUSE_SEMANTIC_SEARCH=1 npm run dev:ai
```

This creates a rebuildable 1,024-dimension embedding index for the current `bge-m3` baseline. Semantic retrieval is opt-in: it is fused with lexical results, retains the retrieval channel and score, rejects weak semantic-only candidates, and falls back to trigram or JSON retrieval when the vector extension, embedding runtime, or database is unavailable. If the embedding model changes, rebuild the derived embeddings and re-run the evaluation corpus before enabling it.

Run the metric-routing benchmark before changing the embedding model or thresholds:

```bash
npm run knowledge:hybrid:corpus
npm run knowledge:hybrid:benchmark
```

The July 2026 `bge-m3` baseline achieved 36/36 top-1 and recall@3 metric matches, rejected 10/10 out-of-domain inputs, and produced zero known non-equivalent metric confusions. The generated detailed report is written to the ignored `.local/warehouse-retrieval-benchmark.json` file.

### Bounded official-source discovery

When structured retrieval has no usable match, the local resolver may search current La Moncloa references and the BOE’s public search surface using at least two meaningful terms. It tries a small number of progressively narrower queries, applies freshness bounds, fetches a bounded number of matching official documents for short excerpts and typed fields, caches query results briefly, retains attributable discovered documents for up to 24 hours, persists the derived result by normalized signature, and exposes only attributable document links. A search hit is rendered as provisional publication evidence; it never becomes a published verdict automatically.
