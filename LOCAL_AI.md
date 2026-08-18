# Local AI development

The public site remains a static Astro build. Local AI is optional and runs outside Cloudflare Pages.

## The shared local pipeline

Start the full local stack:

```bash
npm run ai:setup
npm run dev:ai
```

Then use the browser at `http://127.0.0.1:4321`. Typed claims, links, screenshots, and audio all enter the same same-origin `/api/check` flow. The browser submits once, shows deterministic guidance immediately, and polls optional local enrichment automatically. There is no separate command or second classification path.

The local resolver accepts the same multipart media contract used by the deployed Pages Function. Screenshot extraction uses the configured local vision model when available; audio uses the configured local speech command. If either optional runtime is unavailable, the deterministic text/caption guidance remains usable and the failure is reported generically.

## Endpoint and local models

The browser always submits to the same-origin `/api/check` endpoint. Provider configuration stays server-side and is never included in the built HTML. The endpoint may return a completed result or a request ID; the browser polls automatically until the local analysis completes or times out.

For a tunneled or containerized origin, set the same random `LOCAL_CLASSIFIER_TOKEN` in the Pages Function environment and the local resolver environment. The token is optional for a loopback-only development setup.

### Durable local origin

For the persistent production origin, use a named Cloudflare Tunnel with a token managed by Cloudflare, point its hostname at the local resolver, and set the Pages secrets `LOCAL_CLASSIFIER_ENDPOINT` and `LOCAL_CLASSIFIER_TOKEN` to the matching HTTPS origin and shared resolver token. Keep the resolver loopback-only; the tunnel template has a deny-by-default fallback. Run `npm run origin:validate` before deployment. Temporary account-less tunnels are suitable only for connectivity tests, not production uptime.

On macOS, keep the resolver alive with `npm run origin:serve`. The checked-in launchd template is `config/com.elpaisestafatal.local-origin.plist.example`; it supervises the resolver, avoids duplicate processes, waits for `/healthz`, and restarts the child after a crash. The actual machine-specific plist and credentials must remain outside Git. The public `/api/health` endpoint should report `dynamic: true` while the local machine and tunnel are available; if the origin goes offline, deterministic fallback remains available.

The local development proxy keeps the local inference service behind the same-origin `/api/check` boundary.

The service uses the locally installed `gemma3:4b` router and `bge-m3` embedding model by default. Override them only with models installed in the local Ollama instance using `OLLAMA_ROUTER_MODEL` and `OLLAMA_EMBED_MODEL`. Production keeps the deterministic lookup and uses the same bounded local inference path when the configured origin is available.

For local experiments, `LOCAL_ANSWER_PLANNER=1` enables a final presentation pass after deterministic enrichment. The planner receives a bounded evidence packet and may only rewrite the headline, summary, question, limitation, and existing conversation reply. It cannot add evidence IDs, sources, visual blocks, or unsupported numbers; malformed, timed-out, or untraceable output is discarded automatically. Leave it unset for the fastest deterministic path.

Meaningful unmatched text (at least three substantive terms, or two terms plus a number) is passed through the local structured compiler even when it has no published candidate. The compiler only extracts propositions, entities, numbers, and retrieval hints; it does not assess truth. Obvious low-signal input such as a single random token continues to use the immediate deterministic fallback.

The resolver uses a short local-inference circuit breaker: a failed or timed-out model request temporarily suppresses repeated model/embedding attempts, while the deterministic matcher and evidence guidance continue immediately. Embeddings are only requested when lexical retrieval finds a plausible candidate.

Extraction and candidate routing use one bounded schema-constrained request. Published matches still require the deterministic score, claim-type, publication, and evidence gates. The resolver also reuses equivalent in-flight and completed requests by canonical signature and keeps a short-lived parsed/tokenized warehouse snapshot, so repeated conversational variants do not re-run the same model and disk work.

The checked-in evaluation corpus can be run in slices when measuring model changes. For example, `EVALUATION_OFFSET=0 EVALUATION_LIMIT=180` covers known-claim variants and `EVALUATION_OFFSET=180 EVALUATION_LIMIT=120` covers unknown and long-tail inputs. The current local development run with the installed models reached 180/180 known accuracy and 120/120 unknown safety; at concurrency eight, known p95 was approximately 1.8 seconds and long-tail p95 approximately 2.6 seconds.

## Optional containerized resolver

The resolver can also run as a restartable local container while Astro and Ollama remain on the host:

```bash
docker compose -f docker-compose.local.yml up --build -d
```

The compose file binds the resolver to `127.0.0.1:8789`, mounts only the local derived cache, and uses the host for the local model runtime. It is a development/deployment convenience; the public site still communicates through the same-origin API boundary.

## Refresh the local evidence warehouse

The resolver can ingest approved official feeds into the rebuildable local warehouse. Start from the checked-in example, then add or remove endpoints as needed:

```bash
mkdir -p .local
cp config/source-refresh.example.json .local/source-refresh.json
npm run knowledge:refresh
npm run knowledge:warehouse
```

The example refreshes approved BOE, INE, and Eurostat resources. `{yesterday}` and `{today}` placeholders are expanded at refresh time. Normalized observations are used for provisional number and trend cards; they do not become published verdicts without an explicit reviewed claim.

Run the metric-routing benchmark before changing the embedding model or thresholds:

```bash
npm run knowledge:hybrid:corpus
npm run knowledge:hybrid:benchmark
```

The July 2026 `bge-m3` baseline achieved 36/36 top-1 and recall@3 metric matches, rejected 10/10 out-of-domain inputs, and produced zero known non-equivalent metric confusions. The generated detailed report is written to the ignored `.local/warehouse-retrieval-benchmark.json` file.

### Bounded official-source discovery

When structured retrieval has no usable match, the local resolver may search current La Moncloa references and the BOE’s public search surface using at least two meaningful terms. It tries a small number of progressively narrower queries, applies freshness bounds, fetches a bounded number of matching official documents for short excerpts and typed fields, caches query results briefly, retains attributable discovered documents for up to 24 hours, persists the derived result by normalized signature, and exposes only attributable document links. A search hit is rendered as provisional publication evidence; it never becomes a published verdict automatically.
