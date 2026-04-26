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

1. `lib/data/records.ts::getMergedRecords()` is the single entry point. It calls `loadInat()` and `loadDwca()` in parallel, merges, and caches.
2. **Two cache layers**:
   - In-process `Map` cache, 30 min TTL (`CACHE_TTL_MS` in `records.ts`) — survives across requests on the same warm instance.
   - Next.js `revalidate` on each page (6 h on `/`, 24 h on `/species/[species]`).
3. If one source errors, the other still renders; the error is surfaced via `<SourceErrorBanner>` from `meta.sourceErrors`.
4. Every page accepts `?source=inat|dwca|all` and threads it through `applyFilters()` (`lib/parsers/recordMerger.ts`). The `<SourceToggle>` in the header writes that param.

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
npm run dev        # localhost:3000
npm run typecheck  # tsc --noEmit
npm run lint
npm run build      # production build (does typecheck implicitly)
```

`npm run build` is the most useful pre-merge check — it runs the type-checker plus catches any Tailwind class typos that don't surface in dev.

## Gotchas

- **First request is slow.** Cold cache pulls ~1 MB of paginated iNat JSON (rate-limited to ~1 req/s by the iNat parser) plus a ~400 KB DwC-A zip. `vercel.json` sets `maxDuration: 60` on the affected API routes for this reason — don't lower it.
- **Leaflet imports must stay client-side.** `OccurrenceMap.tsx` and friends are `'use client'`; `MapPanel.tsx` wraps it with `next/dynamic({ ssr: false })`. Don't import leaflet from a server component.
- **`forest-700` is not a link color** despite being blue. Style guide says links are `forest-600` (the brand blue at #116dff). `forest-700` (#0A4FBE) is reserved for hover-on-blue or deeper emphasis.
- **Don't restore `font-serif`.** The Tailwind config intentionally has no `serif` family; the InsectID guide says headings use the same Lato stack as body. A previous version used `font-serif` — leftovers may still be lurking; remove them when you find them.
