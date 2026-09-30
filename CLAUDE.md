# CLAUDE.md

Notes for Claude Code working in this repo. Pairs with `README.md` (which has install/deploy/routes). This file covers the non-obvious things.

## What this is

A Next.js 14 (App Router) dashboard that merges insect occurrence data from two upstream sources:

- **iNaturalist** project #275094 — community observations, fetched via the iNat REST API
- **INDD** specimen archive — Darwin Core Archive zip from `ecdysis.org`

The app is a sister project to `../INDD_dashboard`. Both are skinned to the **InsectID** brand. The canonical style guide lives in the sibling repo:

```
../INDD_dashboard/STYLE_GUIDE.md
```

When tweaking visuals, read that file first — palette, typography, components, and quick rules are all there.

## Style tokens — names lie

The Tailwind config in `tailwind.config.ts` keeps **semantic** color names (`forest`, `moss`, `bark`, `cream`, `ochre`) for backwards compat with old code, but the values were re-mapped to the InsectID brand. **The names do not describe the colors:**

| Tailwind alias | Actually is | Style-guide name |
| --- | --- | --- |
| `forest-*` | InsectID **brand blue** (#116dff at 600) | `blue-*` |
| `moss-*` | neutral **gray** | `gray-*` |
| `bark-*` | near-black body **text** | `text-*` |
| `cream-*` | white / off-white **surfaces** | `surface-*` |
| `ochre-*` | **cyan** accent | `cyan-*` |
| `ok.*` | Okabe-Ito categorical chart palette | `ok.*` |

Default link: `text-forest-600`. Default heading: `text-forest-800`. Default body: `text-bark-600`. Hero h1 weight: `font-black` (900); section h2 weight: `font-bold` (700). No `font-serif` — Lato is the only family.

`app/globals.css` defines two custom utilities used throughout:
- `.nature-card` — white card with hairline border + soft shadow (style guide: "Card")
- `.leaf-rule` — short blue underline beneath h2/h3 (style guide: "Section heading rule")

## Data flow

**The app never fetches upstream at request time.** Both sources are pulled once
a week and committed to the repo as `data/snapshot.json`.

1. `scripts/build-data.ts` (`npm run build:data`) is the *only* code that talks
   to iNaturalist or ecdysis.org. It fetches, merges via `mergeRecords()`, and
   writes the snapshot. Run weekly by `.github/workflows/refresh-data.yml`.
2. `lib/data/snapshot.ts` holds the shared on-disk contract (`DataSnapshot`,
   `SNAPSHOT_VERSION`, `SNAPSHOT_RELATIVE_PATH`). Writer and reader both import
   it — change the shape there and bump the version.
3. `lib/data/records.ts::getMergedRecords()` is still the single entry point for
   pages, but it now reads the snapshot off disk. Cached per instance with no
   TTL, because the file cannot change within a deployment.
4. If a source failed during the refresh, its error is stored in the snapshot and
   still surfaces through `<SourceErrorBanner>` via `meta.sourceErrors` — that
   path is unchanged.
5. Every page accepts `?source=inat|dwca|all` and threads it through
   `applyFilters()` (`lib/parsers/recordMerger.ts`). The `<SourceToggle>` in the
   header writes that param.

`meta.fetchedAt` now means "when the snapshot was built", and is shown in the
footer by `<DataFreshness>`.

**County comes from coordinates, not from the sources.** iNaturalist has no
county field, so `build:data` runs `assignCounties()` (`lib/utils/countyLookup.ts`)
— point-in-polygon against `data/indiana-counties-500k.geojson` (Census 500k,
build-time only; the coarser `public/indiana-counties.geojson` is just for
drawing the choropleth). iNat county is always replaced by the lookup;
obscured iNat observations get none. INDD label counties are kept and only
blanks are filled. Don't go back to parsing `place_guess`.

**GBIF usage (`/impact`) is a separate pipeline.** `scripts/build-gbif.ts`
(`npm run build:gbif`) writes `data/gbif-metrics.json`; `lib/data/gbifMetrics.ts`
holds its contract and reader. Same weekly job, but `continue-on-error` — it
must never block the occurrence refresh, and pages treat a missing file as
"not generated yet". GBIF's downloads-by-dataset endpoint silently caps pages
at 100 rows whatever `limit` says, so paginate by rows returned. The site is
embedded in a Wix iframe: internal nav must be plain `<Link>` (stays in-frame),
external links `target="_blank"`.

`OccurrenceRecord.source` is `'inat' | 'dwca' | 'both'` — `'both'` means the merger matched the same specimen across the two sources by `(scientificName, date, lat, lng)`.

## Charts and colors

`lib/utils/colors.ts` is the single source of truth for chart styling:
- `colorForKey(name)` deterministically picks an Okabe-Ito hue for a taxon string. Use this whenever a series is keyed by taxonomy — never hand-pick.
- `CHART_TOKENS` exports axis/grid/text/source neutrals. All Recharts components read from this object, so changing it themes every chart at once.

The style guide forbids substituting other palettes — categorical = Okabe-Ito, sequential = viridis. Don't introduce ad-hoc palettes.

## Logo / favicon convention

- `public/insectID-brand.png` — header logo, links to `https://insectid.org` (this site is intended to be a subdomain). Aspect ratio 1094×474 (~2.31:1) — never style with equal width/height.
- `app/favicon.ico` — auto-served by Next.js App Router. The duplicate in `images/` is the original asset.
- The `images/` folder holds source assets (taxon JPEGs, brand PNGs); `public/` holds what's actually shipped. If you add a new public asset, put it in `public/`.

## Commands

```bash
npm run dev          # localhost:3000
npm run verify:data  # ~50ms: snapshot integrity + every aggregation (no network)
npm run typecheck    # tsc --noEmit
npm run lint
npm run build        # production build (does typecheck implicitly)
npm run build:data   # re-pull both sources into data/snapshot.json (tsx)
npm run build:gbif   # re-pull GBIF usage metrics into data/gbif-metrics.json (~2 min)
```

**Reach for `verify:data` first.** It exercises `getMergedRecords()`,
`applyFilters()` and every aggregation the pages render, in about 50 ms with no
network and no webpack. `npm run build` is the thorough pre-merge check, but it
can *look* hung at 0% CPU on this machine (see the iCloud gotcha below). Vercel and CI build on every push anyway, so
locally: `verify:data` + `typecheck` covers almost everything, and let CI do the
full build.

## Gotchas

- **`data/snapshot.json` is tracked on purpose.** Never add `data/` to `.gitignore` — the committed snapshot *is* the data layer. A missing file makes `getMergedRecords()` throw, which fails `next build`.
- **`next.config.js` must keep `outputFileTracingIncludes`.** The snapshot is read with `fs` at request time and Next's tracer can't see that, so it's named explicitly. Drop it and every page 500s on Vercel while working fine locally.
- **`build:data` refuses to write a partial snapshot.** If one source fails it exits non-zero rather than clobbering good data. Use `--allow-partial` only when you genuinely want the gap recorded.
- **A local build/typecheck/lint at ~0% CPU is waiting on iCloud, not swap.** The repo lives in `~/Documents`, which syncs to iCloud; with the disk nearly full, "Optimize Mac Storage" offloads files (even ones written minutes ago) and every read blocks on a re-download. `node_modules` and `.next` are therefore symlinks to `node_modules.nosync` / `.next.nosync` — iCloud skips `*.nosync`. Don't replace them with real directories; after a fresh clone recreate them (`mkdir node_modules.nosync .next.nosync && ln -s node_modules.nosync node_modules && ln -s .next.nosync .next`, then `npm ci`). Check for offloaded files with `find . -flags +dataless`.
- **Don't reintroduce request-time fetching.** The old `maxDuration: 60` entries in `vercel.json` are gone because nothing is slow any more; if you find yourself needing them back, the data layer has regressed.
- **Leaflet imports must stay client-side.** `OccurrenceMap.tsx` and friends are `'use client'`; `MapPanel.tsx` wraps it with `next/dynamic({ ssr: false })`. Don't import leaflet from a server component.
- **`forest-700` is not a link color** despite being blue. Style guide says links are `forest-600` (the brand blue at #116dff). `forest-700` (#0A4FBE) is reserved for hover-on-blue or deeper emphasis.
- **Don't restore `font-serif`.** The Tailwind config intentionally has no `serif` family; the InsectID guide says headings use the same Lato stack as body. A previous version used `font-serif` — leftovers may still be lurking; remove them when you find them.
