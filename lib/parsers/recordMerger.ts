import { OccurrenceRecord } from '@/lib/types';
import { roundLatLng } from '@/lib/utils/geo';

function dedupKey(rec: OccurrenceRecord): string | null {
  if (!rec.scientificName || !rec.date) return null;
  // A class-level name (undetermined INDD specimens) says nothing about which
  // animal it is — dozens of them share a trap, day and "Insecta".
  if (rec.rank === 'class') return null;
  const lat = roundLatLng(rec.lat, 3);
  const lng = roundLatLng(rec.lng, 3);
  if (lat === undefined || lng === undefined) return null;
  return `${rec.scientificName.toLowerCase()}|${rec.date}|${lat}|${lng}`;
}

// Merge records from both sources. When the same biological event appears in both
// sources (heuristic match on name + date + rounded coords), tag as 'both' and
// keep the iNat row as the primary (it carries the externalUrl + commonName).
//
// Matching is one-to-one: each iNat observation pairs with at most one
// specimen. Several specimens from one trap share name + date + coords, and
// letting them all claim the same observation duplicated its id.
export function mergeRecords(inat: OccurrenceRecord[], dwca: OccurrenceRecord[]): OccurrenceRecord[] {
  const inatByKey = new Map<string, OccurrenceRecord[]>();
  for (const r of inat) {
    const k = dedupKey(r);
    if (!k) continue;
    const list = inatByKey.get(k);
    if (list) list.push(r);
    else inatByKey.set(k, [r]);
  }

  const merged: OccurrenceRecord[] = [];
  const matchedInatIds = new Set<string>();

  for (const r of dwca) {
    const k = dedupKey(r);
    const match = k ? inatByKey.get(k)?.shift() : undefined;
    if (match) {
      matchedInatIds.add(match.id);
      merged.push({
        ...match,
        source: 'both',
        // keep DwCA-specific fields if iNat lacks them
        county: match.county ?? r.county,
        stateProvince: match.stateProvince ?? r.stateProvince,
        recordedBy: r.recordedBy ?? match.recordedBy,
        catalogNumber: r.catalogNumber,
        basisOfRecord: r.basisOfRecord,
        order: match.order ?? r.order,
        family: match.family ?? r.family,
        genus: match.genus ?? r.genus,
      });
    } else {
      merged.push(r);
    }
  }

  for (const r of inat) {
    if (!matchedInatIds.has(r.id)) merged.push(r);
  }

  return merged;
}

export function applyFilters(
  records: OccurrenceRecord[],
  filters: {
    source?: string | null;
    order?: string | null;
    family?: string | null;
    genus?: string | null;
    species?: string | null;
    yearMin?: number;
    yearMax?: number;
    monthMin?: number;
    monthMax?: number;
  }
): OccurrenceRecord[] {
  const matchSrc = (r: OccurrenceRecord) => {
    if (!filters.source || filters.source === 'all') return true;
    if (filters.source === 'inat') return r.source === 'inat' || r.source === 'both';
    if (filters.source === 'dwca') return r.source === 'dwca' || r.source === 'both';
    return true;
  };
  const eqi = (a: string | undefined, b: string | undefined | null) => {
    if (!b) return true;
    return (a || '').toLowerCase() === b.toLowerCase();
  };
  return records.filter((r) => {
    if (!matchSrc(r)) return false;
    if (filters.order && !eqi(r.order, filters.order)) return false;
    if (filters.family && !eqi(r.family, filters.family)) return false;
    if (filters.genus && !eqi(r.genus, filters.genus)) return false;
    if (filters.species && !eqi(r.scientificName, filters.species)) return false;
    if (filters.yearMin !== undefined && (r.year ?? -Infinity) < filters.yearMin) return false;
    if (filters.yearMax !== undefined && (r.year ?? Infinity) > filters.yearMax) return false;
    if (filters.monthMin !== undefined && (r.month ?? -Infinity) < filters.monthMin) return false;
    if (filters.monthMax !== undefined && (r.month ?? Infinity) > filters.monthMax) return false;
    return true;
  });
}
