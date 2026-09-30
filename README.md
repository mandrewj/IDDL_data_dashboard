# IDDL Biodiversity Dashboard

A multi-level insect occurrence dashboard for the **Insect Diversity and Diagnostics Lab (IDDL)** at Purdue University. Combines two data sources:

- iNaturalist Project [#275094](https://www.inaturalist.org/projects/275094) — community observations
- IDDL specimen archive served as Darwin Core Archive (DwC-A) from [ecdysis.org](https://ecdysis.org)

Both are pulled **once a week** into `data/snapshot.json`, which is committed to
the repo and shipped with the app. Nothing is fetched from upstream while
serving a request — see [Data refresh](#data-refresh).

## Stack

- Next.js 14 (App Router) · TypeScript · Tailwind CSS
- Recharts for charts · `react-leaflet` (+ cluster, heatmap) for maps
- DwC-A parsing: `jszip`, `xml2js`, `csv-parse`

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

`data/snapshot.json` is committed, so a fresh clone has data immediately and
pages render in milliseconds. If the file is missing the app fails loudly with
a message telling you to run `npm run build:data`.

## Data refresh

`scripts/build-data.ts` is the only code that talks to iNaturalist or
ecdysis.org. It fetches both sources, merges them with the same
`mergeRecords()` the app uses, and writes `data/snapshot.json`.

```bash
npm run build:data                     # refuse to write if either source failed
npm run build:data -- --allow-partial  # write anyway, record the error
npm run verify:data                    # ~50ms structural check, no network
```

`verify:data` re-hashes the records, confirms every count in the snapshot agrees
with its contents, and runs each aggregation the dashboard renders. It is the
fast way to check a data-layer change — prefer it over `npm run build`, which
needs several GB of RAM and can take an hour on a memory-constrained machine.
The weekly workflow runs it too, so a corrupt snapshot can never be committed.

Refusing on failure is deliberate: a half-empty snapshot committed over a good
one would silently gut the dashboard. Last week's data beats no data. With
`--allow-partial` the failure is stored in the snapshot and the dashboard shows
its existing `<SourceErrorBanner>`.

### GBIF usage metrics

`scripts/build-gbif.ts` (`npm run build:gbif`) pulls usage stats for the INDD
dataset on GBIF ([d55073b8…](https://www.gbif.org/dataset/d55073b8-f5a0-46e3-89e3-9519c57b0316))
and writes `data/gbif-metrics.json`, which drives `/impact`:

- **Downloads** — `GET /v1/occurrence/download/dataset/{key}`, every page
  (GBIF caps it at 100 rows/page, so ~70 requests, ~2 min). Aggregated to
  monthly download events and records downloaded. Every download counts,
  whatever its status, so totals match the dataset page on GBIF.
- **Citations** — `GET /v1/literature/search?gbifDatasetKey={key}`.

On failure it leaves the existing file untouched and exits non-zero.

### Weekly GitHub Action

`.github/workflows/refresh-data.yml` runs the refresh every **Monday at 09:00
UTC** (≈5am EDT / 4am EST) and on demand via **workflow_dispatch**. It:

1. Runs `npm run build:data`.
2. Runs `npm run build:gbif` with `continue-on-error` — a GBIF outage only
   warns and keeps last week's metrics; it never blocks the occurrence refresh.
3. Commits `data/snapshot.json` and/or `data/gbif-metrics.json`, **each only if
   its content actually changed** — both scripts hash content separately from
   the `generatedAt` timestamp.
4. Pushes to `main`, which triggers a Vercel deploy.

The job needs no secrets; both sources are public. Two optional repo variables
override the defaults baked into the code:
`NEXT_PUBLIC_INAT_PROJECT_ID` and `NEXT_PUBLIC_DWCA_URL`.

To run it by hand: **Actions → Weekly data refresh → Run workflow** (tick
*allow_partial* to accept a snapshot with one source missing).

## Deploy to Vercel

```bash
vercel --prod
```

No route does long-running network work any more, so `vercel.json` no longer
needs `maxDuration` overrides. `next.config.js` names `data/snapshot.json` and `data/gbif-metrics.json` in
`experimental.outputFileTracingIncludes` so Next uploads it alongside the
serverless functions — without that, every page 500s in production.

## Routes

| Path | Purpose |
| --- | --- |
| `/` | Overview dashboard |
| `/order/[order]` | Order-level dashboard |
| `/family/[family]` | Family-level dashboard |
| `/species/[species]` | Species-level dashboard |
| `/impact` | GBIF downloads, records downloaded, and citations over time |
| `/api/inaturalist` | iNaturalist slice of the snapshot (prerendered) |
| `/api/dwca` | INDD specimen slice of the snapshot (prerendered) |
| `/api/records` | Unified, filterable merged records |

A `?source=inat|dwca|all` query parameter on any dashboard page filters all panels to the chosen source.
