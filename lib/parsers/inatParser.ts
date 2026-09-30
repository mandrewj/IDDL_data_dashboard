import { OccurrenceRecord } from '@/lib/types';
import { cleanScientificName } from '@/lib/utils/taxonomy';
import { isValidCoord, parseDateParts } from '@/lib/utils/geo';
import { fetchWithRetry } from '@/lib/utils/http';
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
  obscured?: boolean;
}

const INAT_BASE = process.env.INAT_BASE_URL || 'https://api.inaturalist.org/v1';
const PROJECT_ID = process.env.NEXT_PUBLIC_INAT_PROJECT_ID || '275094';
const USER_AGENT = 'iddl-dashboard/0.1 (+https://iddl.entm.purdue.edu)';

// Ranks we lift into flat fields on OccurrenceRecord.
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

// County is deliberately not read from place_guess: scripts/build-data.ts
// assigns it from the coordinates (lib/utils/countyLookup.ts). Only the state
// is lifted here, for observations that fall outside Indiana.
function extractState(placeGuess?: string | null): string | undefined {
  if (!placeGuess) return undefined;
  // place_guess often looks like "City, County, State, US" or "County, State, US"
  const tokens = placeGuess.split(',').map((t) => t.trim()).filter(Boolean);
  const last = tokens[tokens.length - 1] || '';
  const isUS = /^(US|USA|United States)$/i.test(last);
  return isUS && tokens.length >= 2 ? tokens[tokens.length - 2] : undefined;
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
    ...(obs.obscured ? { coordinatesObscured: true } : {}),
    stateProvince: extractState(obs.place_guess),
    qualityGrade: obs.quality_grade ?? undefined,
    externalUrl: obs.uri ?? `https://www.inaturalist.org/observations/${id}`,
  });
}

const SLEEP = (ms: number) => new Promise((r) => setTimeout(r, ms));

// iNaturalist's deep-pagination limit for page * per_page is 10,000; cursor-based
// pagination via id_below has no such cap and is what iNat's docs recommend for
// pulling every observation from a project.
async function fetchAllObservations(): Promise<InatObservation[]> {
  const perPage = 200;
  const out: InatObservation[] = [];
  const seen = new Set<number>();
  let idBelow: number | undefined;
  let expectedTotal: number | undefined;

  // Guard against a runaway loop if iNat keeps returning fresh IDs somehow.
  const maxRequests = 500;
  for (let req = 0; req < maxRequests; req++) {
    const url = new URL(`${INAT_BASE}/observations`);
    url.searchParams.set('project_id', PROJECT_ID);
    url.searchParams.set('per_page', String(perPage));
    url.searchParams.set('order_by', 'id');
    url.searchParams.set('order', 'desc');
    if (idBelow !== undefined) url.searchParams.set('id_below', String(idBelow));

    // Runs only from scripts/build-data.ts (plain Node), never inside a
    // request — so no Next.js fetch cache options here.
    const res = await fetchWithRetry(url.toString(), {
      label: `iNaturalist obs (id_below=${idBelow ?? 'start'})`,
      headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
    });
    if (!res.ok) {
      throw new Error(`iNaturalist API responded ${res.status} while paginating observations`);
    }
    const json = (await res.json()) as { total_results?: number; results?: InatObservation[] };
    if (expectedTotal === undefined && typeof json.total_results === 'number') {
      expectedTotal = json.total_results;
    }
    const results = json.results ?? [];
    if (results.length === 0) break;

    let minId = Infinity;
    let newInPage = 0;
    for (const obs of results) {
      if (typeof obs.id !== 'number') continue;
      if (obs.id < minId) minId = obs.id;
      if (seen.has(obs.id)) continue;
      seen.add(obs.id);
      out.push(obs);
      newInPage += 1;
    }

    // If iNat returned only records we've already seen, we've caught up to the
    // tail and must stop — otherwise id_below would loop on the same page.
    if (newInPage === 0 || !Number.isFinite(minId)) break;
    idBelow = minId;

    if (results.length < perPage) break;
    await SLEEP(1100);
  }

  if (expectedTotal !== undefined) {
    // A small delta is expected (records created between pages), but a large
    // shortfall means we silently lost data — refuse to write a partial snapshot.
    const shortfall = expectedTotal - out.length;
    const tolerance = Math.max(50, Math.floor(expectedTotal * 0.02));
    if (shortfall > tolerance) {
      throw new Error(
        `iNaturalist pagination returned ${out.length} observations but the API reported ${expectedTotal}. ` +
          `Missing ${shortfall} records — refusing to write a partial snapshot.`
      );
    }
  }

  return out;
}

interface InatTaxonFull extends InatTaxon {
  parent_id?: number;
}

// The /observations endpoint returns ancestor_ids but not their names, so
// order/family/genus can't be filled in from that alone. /taxa returns the
// full ancestors array; batching keeps us under iNat's rate limit.
async function fetchTaxaBatch(ids: number[]): Promise<Map<number, InatTaxonFull>> {
  const map = new Map<number, InatTaxonFull>();
  if (ids.length === 0) return map;

  const BATCH = 30; // iNat caps /taxa batch responses at 30 rows.
  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH);
    const url = `${INAT_BASE}/taxa/${chunk.join(',')}`;
    const res = await fetchWithRetry(url, {
      label: `iNaturalist taxa ${i + 1}-${i + chunk.length}/${ids.length}`,
      headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
    });
    if (!res.ok) {
      throw new Error(`iNaturalist /taxa responded ${res.status} on batch starting at ${i}`);
    }
    const json = (await res.json()) as { results?: InatTaxonFull[] };
    for (const t of json.results ?? []) {
      if (typeof t.id === 'number') map.set(t.id, t);
    }
    if (i + BATCH < ids.length) await SLEEP(1100);
  }
  return map;
}

export async function fetchInatProjectObservations(): Promise<OccurrenceRecord[]> {
  const observations = await fetchAllObservations();

  // Collect every taxon_id that arrived without an ancestors array; the
  // observations endpoint almost never populates it.
  const needAncestors = new Set<number>();
  for (const obs of observations) {
    const t = obs.taxon;
    if (t && typeof t.id === 'number' && (!t.ancestors || t.ancestors.length === 0)) {
      needAncestors.add(t.id);
    }
  }

  const taxa = await fetchTaxaBatch(Array.from(needAncestors));

  const out: OccurrenceRecord[] = [];
  for (const obs of observations) {
    let obsForRecord = obs;
    const tid = obs.taxon?.id;
    if (tid !== undefined && (!obs.taxon?.ancestors || obs.taxon.ancestors.length === 0)) {
      const full = taxa.get(tid);
      if (full && full.ancestors && full.ancestors.length > 0) {
        obsForRecord = {
          ...obs,
          taxon: {
            ...obs.taxon,
            ancestors: full.ancestors,
            rank: obs.taxon?.rank ?? full.rank,
            preferred_common_name: obs.taxon?.preferred_common_name ?? full.preferred_common_name,
          },
        };
      }
    }
    const rec = obsToRecord(obsForRecord);
    if (rec) out.push(rec);
  }
  return out;
}
