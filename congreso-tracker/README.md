# Congreso tracker

An independent, evidence-first dataset and web interface for deputies who served in Spain's XV Legislature. This is a separate project from the repository's existing website.

## Run

```sh
npm install
npm start
```

Open http://localhost:8787. `npm run collect` discovers the current official deputy JSON/CSV/XML links and stores a raw snapshot under `data/raw/`; HTTP 403 and other failures are recorded in `data/collection-log.json` rather than interpreted as empty data.

The web interface includes searchable deputy cards, per-deputy evidence timelines, session pages, initiative and organ indexes, voting results, an activity comparison table, provenance links, JSON endpoints and CSV export. It renders the current normalized Legislature XV snapshot committed in `data/current.json` and overlays the compressed full roll-call archive at startup.

`npm run refresh` reruns official discovery, vote backfill, body imports, normalization and reconciliation. Schedule it daily in an external job runner and review its collection log before publishing. Raw downloads and large media remain outside Git; normalized records retain retrieval metadata, hashes and source links. The schema keeps planned business, actual proceedings, speeches, votes, remote voting and seat observations as separate evidence types.

Primary sources: [Congress open data](https://www.congreso.es/es/datos-abiertos), [deputies](https://www.congreso.es/es/opendata/diputados), [interventions](https://www.congreso.es/es/opendata/intervenciones), [votes](https://www.congreso.es/es/opendata/votaciones), [bodies](https://www.congreso.es/es/opendata/organos), [agenda](https://www.congreso.es/es/agenda), [hemicycle](https://www.congreso.es/es/hemiciclo).
