# Congreso tracker

An independent, evidence-first dataset and web interface for deputies who served in Spain's XV Legislature. This is a separate project from the repository's existing website.

## Run

```sh
npm install
npm start
```

Open http://localhost:8787. `npm run collect` discovers the current official deputy JSON/CSV/XML links and stores a raw snapshot under `data/raw/`; HTTP 403 and other failures are recorded in `data/collection-log.json` rather than interpreted as empty data.

The web interface includes searchable deputy cards, per-deputy evidence timelines, session pages, an activity comparison table, provenance links, JSON endpoints and CSV export. It is designed to render every normalized record once the collector has populated the store.

The included fixture is deliberately small and labelled as a sample. Replace it with collected snapshots before publishing legislature-wide aggregates. The schema keeps planned business, actual proceedings, speeches, votes, remote voting and seat observations as separate evidence types.

Primary sources: [Congress open data](https://www.congreso.es/es/datos-abiertos), [deputies](https://www.congreso.es/es/opendata/diputados), [interventions](https://www.congreso.es/es/opendata/intervenciones), [votes](https://www.congreso.es/es/opendata/votaciones), [bodies](https://www.congreso.es/es/opendata/organos), [agenda](https://www.congreso.es/es/agenda), [hemicycle](https://www.congreso.es/es/hemiciclo).
