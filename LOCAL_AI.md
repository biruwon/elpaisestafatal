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

Audio is recorded as an explicit unsupported local input until `whisper.cpp` or `mlx_whisper` is installed. No audio is sent to the public site.

## Endpoint and model

The CLI uses `http://localhost:11434/api/chat` by default. Set `OLLAMA_ENDPOINT` for a hosted Ollama API and `OLLAMA_MODEL` for another model. The browser-side optional classifier uses the build-time `PUBLIC_OLLAMA_ENDPOINT` value and defaults to localhost.
