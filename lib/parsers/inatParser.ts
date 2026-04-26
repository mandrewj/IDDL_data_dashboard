import { OccurrenceRecord } from '@/lib/types';
import { cleanScientificName } from '@/lib/utils/taxonomy';
import { isValidCoord, parseDateParts } from '@/lib/utils/geo';
import { enrichTaxonomy } from './enrichTaxonomy';

interface InatTaxonAncestor {
  rank?: string;
  name?: string;
  preferred_common_name?: string;
}

interface InatTaxon {
  id?: number;
  name?: string;
  rank?: string;
  preferred_common_name?: string;
  ancestors?: InatTaxonAncestor[];
  ancestor_ids?: number[];
}

interface InatPlace {
  state?: string;
  county?: string;
}

interface InatObservation {
  id?: number;
  observed_on?: string | null;
  time_observed_at?: string | null;
  taxon?: InatTaxon | null;
  geojson?: { coordinates: [number, number] } | null;
  location?: string | null; // "lat,lng"
  place_guess?: string | null;
  quality_grade?: string | null;
  uri?: string | null;
  place_ids?: number[];
}

const INAT_BASE = process.env.INAT_BASE_URL || 'https://api.inaturalist.org/v1';
const PROJECT_ID = process.env.NEXT_PUBLIC_INAT_PROJECT_ID || '275094';

const HIGHER_RANKS: Record<string, true> = {
  order: true,
  family: true,
  genus: true,
  species: true,
};

function fromAncestors(taxon: InatTaxon | null | undefined) {
  const out: { order?: string; family?: string; genus?: string; species?: string } = {};
  const list = taxon?.ancestors ?? [];
  for (const a of list) {
    const r = (a.rank || '').toLowerCase();
    if (HIGHER_RANKS[r] && a.name) {
      (out as Record<string, string>)[r] = a.name;
    }
  }
  // Include the taxon itself if it's a recognized rank
  const ownRank = (taxon?.rank || '').toLowerCase();
  if (HIGHER_RANKS[ownRank] && taxon?.name) {
    (out as Record<string, string>)[ownRank] = taxon.name;
  }
  return out;
}

function parseLocation(loc?: string | null, geo?: { coordinates: [number, number] } | null): { lat?: number; lng?: number } {
  if (geo && Array.isArray(geo.coordinates) && geo.coordinates.length === 2) {
    const [lng, lat] = geo.coordinates;
    if (isValidCoord(lat, lng)) return { lat, lng };
  }
  if (loc && typeof loc === 'string') {
    const [latStr, lngStr] = loc.split(',');
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (isValidCoord(lat, lng)) return { lat, lng };
  }
  return {};
}

function extractCounty(placeGuess?: string | null): { state?: string; county?: string } {
  if (!placeGuess) return {};
  // iNaturalist place_guess often looks like "City, County, State, US" or "County, State, US"
  const tokens = placeGuess.split(',').map((t) => t.trim()).filter(Boolean);
  // Heuristic: if last token is "US" or "USA", state is second-to-last
  const last = tokens[tokens.length - 1] || '';
  const isUS = /^(US|USA|United States)$/i.test(last);
  let state: string | undefined;
  let county: string | undefined;
  if (isUS && tokens.length >= 2) state = tokens[tokens.length - 2];
  // Look for explicit "X County"
  for (const t of tokens) {
    if (/county$/i.test(t)) {
      county = t.replace(/\s*county$/i, '');
      break;
    }
  }
  return { state, county };
}

function obsToRecord(obs: InatObservation): OccurrenceRecord | null {
  const id = obs.id;
  const taxon = obs.taxon;
  if (!id || !taxon || !taxon.name) return null;
  const cleaned = cleanScientificName(taxon.name);
  if (!cleaned) return null;

  const ancestry = fromAncestors(taxon);
  const date = obs.observed_on ?? (obs.time_observed_at ? obs.time_observed_at.slice(0, 10) : undefined);
  const dateParts = parseDateParts(date ?? undefined);
  const { lat, lng } = parseLocation(obs.location, obs.geojson);
  const place = extractCounty(obs.place_guess);

  return enrichTaxonomy({
    id: `inat:${id}`,
    source: 'inat',
    scientificName: cleaned,
    commonName: taxon.preferred_common_name || undefined,
    rank: (taxon.rank || 'unknown').toLowerCase(),
    order: ancestry.order,
    family: ancestry.family,
    genus: ancestry.genus,
    specificEpithet: cleaned.includes(' ') ? cleaned.split(' ')[1] : undefined,
    date: dateParts.iso ?? (date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined),
    year: dateParts.year,
    month: dateParts.month,
    lat,
    lng,
    stateProvince: place.state,
    county: place.county,
    qualityGrade: obs.quality_grade ?? undefined,
    externalUrl: obs.uri ?? `https://www.inaturalist.org/observations/${id}`,
  });
}

const SLEEP = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchInatProjectObservations(maxPages = 100): Promise<OccurrenceRecord[]> {
  const out: OccurrenceRecord[] = [];
  let page = 1;
  let total = Infinity;
  const perPage = 200;

  while (page <= maxPages && (page - 1) * perPage < total) {
    const url = new URL(`${INAT_BASE}/observations`);
    url.searchParams.set('project_id', PROJECT_ID);
    url.searchParams.set('per_page', String(perPage));
    url.searchParams.set('page', String(page));
    url.searchParams.set('order', 'desc');
    url.searchParams.set('order_by', 'created_at');

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json', 'User-Agent': 'iddl-dashboard/0.1 (+https://iddl.entm.purdue.edu)' },
      next: { revalidate: 21600 },
    });
    if (!res.ok) {
      throw new Error(`iNaturalist API responded ${res.status} on page ${page}`);
    }
    const json = (await res.json()) as { total_results?: number; results?: InatObservation[] };
    total = json.total_results ?? out.length;
    const results = json.results ?? [];
    if (results.length === 0) break;
    for (const obs of results) {
      const rec = obsToRecord(obs);
      if (rec) out.push(rec);
    }
    page += 1;
    if ((page - 1) * perPage < total) await SLEEP(1100);
  }
  return out;
}
