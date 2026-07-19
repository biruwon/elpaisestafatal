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

The local development proxy keeps the local inference service behind the same-origin `/api/resolve` boundary. Set up the local models once:

```bash
npm run ai:setup
npm run dev:ai
```

The service uses the locally installed `gemma3:4b` router and `bge-m3` embedding model by default. Override them only with models installed in the local Ollama instance using `OLLAMA_ROUTER_MODEL` and `OLLAMA_EMBED_MODEL`. Production keeps the deterministic lookup and does not run inference.

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

The example refreshes a BOE daily summary, an INE table, and a Eurostat GDP series. `{yesterday}` and `{today}` placeholders are expanded at refresh time. Normalized observations are used for provisional number and trend cards; they do not become published verdicts without an explicit reviewed claim.
