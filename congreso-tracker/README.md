# Congreso tracker

An independent, evidence-first dataset and web interface for deputies who served in Spain's XV Legislature. This is a separate project from the repository's existing website.

## Run

```sh
npm install
npm start
```

Open http://localhost:8787. `npm run collect` discovers the current official deputy JSON/CSV/XML links and stores a raw snapshot under `data/raw/`; HTTP 403 and other failures are recorded in `data/collection-log.json` rather than interpreted as empty data.

The web interface includes searchable deputy cards, per-deputy evidence timelines, session pages, initiative and organ indexes, committee memberships, voting results, an activity comparison table, topic evidence (`/temas`), a deputy-by-day presence explorer (`/presencia/diaria`), provenance links, JSON endpoints and CSV exports. Aggregate deputy metrics are available at `/api/congreso/v1/deputy-metrics` and `/export/deputy-metrics.csv`; `votesCast` excludes published “No vota” rows, while `nominalRows` retains the complete individual-row count. It renders the current normalized Legislature XV snapshot committed in `data/current.json` and overlays the compressed full roll-call archive at startup. Official initiative feeds are merged with intervention-derived records, preserving published authors, processing status, commission and procedural history.

For the video pilot, create a bounded review file with `npm run review:template -- data/video-pilot-observations.json data/video-pilot-review.json 100`, inspect the referenced timestamps against official wide shots, then merge reviewed seat observations with `npm run review:video-pilot -- data/video-pilot-observations.json data/video-pilot-review.json data/video-pilot-observations-reviewed.json`. The review format accepts only `occupied`, `empty` or `unobservable` and deliberately forbids deputy attribution at seat level.

`npm run refresh` reruns official discovery, vote backfill, body imports, committee-composition imports, normalization, ISO date normalization for daily summaries and reconciliation. Daily expansion includes every indexed session date within each deputy's service period; rows without evidence are retained as `unknown` with null measures, so missing data cannot become zero attendance. Schedule it daily in an external job runner and review its collection log before publishing. Raw downloads and large media remain outside Git; normalized records retain retrieval metadata, hashes and source links. The schema keeps planned business, actual proceedings, speeches, votes, remote voting and seat observations as separate evidence types. Daily summaries combine published intervention intervals and nominal vote events; they are evidence counts and lower bounds, never a reconstructed attendance percentage. The video pilot contains seat-level observations only and requires manual review before deputy attribution. Commission compositions are imported from the official endpoint for 53 of 58 catalogued commissions; the five empty responses remain explicit source gaps.

This repository includes `.github/workflows/congreso-refresh.yml`, which runs the refresh daily at 04:30 UTC (and on demand) and publishes a 30-day downloadable artifact after all validation gates pass. The workflow is scoped to this standalone tracker and does not deploy or modify the existing site.

Primary sources: [Congress open data](https://www.congreso.es/es/datos-abiertos), [deputies](https://www.congreso.es/es/opendata/diputados), [interventions](https://www.congreso.es/es/opendata/intervenciones), [votes](https://www.congreso.es/es/opendata/votaciones), [bodies](https://www.congreso.es/es/opendata/organos), [agenda](https://www.congreso.es/es/agenda), [hemicycle](https://www.congreso.es/es/hemiciclo).
