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

## Endpoint and model

The CLI uses `http://localhost:11434/api/chat` by default. Set `OLLAMA_ENDPOINT` for a hosted Ollama API and `OLLAMA_MODEL` for another model. The browser-side optional classifier uses the build-time `PUBLIC_OLLAMA_ENDPOINT` value and defaults to localhost.
