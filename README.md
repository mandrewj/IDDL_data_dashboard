# IDDL Biodiversity Dashboard

A multi-level insect occurrence dashboard for the **Insect Diversity and Diagnostics Lab (IDDL)** at Purdue University. Combines two data sources:

- iNaturalist Project [#275094](https://www.inaturalist.org/projects/275094) — live community observations
- IDDL specimen archive served as Darwin Core Archive (DwC-A) from [ecdysis.org](https://ecdysis.org)

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

The first request will fetch ~1 MB of iNat JSON (paginated, rate-limited to ~1 req/s) and ~400 KB DwC-A zip. Results are cached server-side for 30 min in-process and 6 h / 24 h via Next.js `revalidate`.

## Deploy to Vercel

```bash
vercel --prod
```

`vercel.json` declares `maxDuration: 60s` on the API routes that fetch upstream sources, which is required for cold-start fetches on Vercel's free tier.

## Routes

| Path | Purpose |
| --- | --- |
| `/` | Overview dashboard |
| `/order/[order]` | Order-level dashboard |
| `/family/[family]` | Family-level dashboard |
| `/species/[species]` | Species-level dashboard |
| `/api/inaturalist` | Cached iNaturalist fetch |
| `/api/dwca` | Cached DwC-A parse |
| `/api/records` | Unified, filterable merged records |

A `?source=inat|dwca|all` query parameter on any dashboard page filters all panels to the chosen source.
