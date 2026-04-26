import { OccurrenceRecord } from '@/lib/types';
import { moreSpecificRank } from '@/lib/utils/taxonomy';

export interface TaxonCount {
  name: string;
  total: number;
  inat: number;
  dwca: number;
}

export function countBy(records: OccurrenceRecord[], field: 'order' | 'family' | 'genus' | 'scientificName'): TaxonCount[] {
  const map = new Map<string, TaxonCount>();
  for (const r of records) {
    const key = (r[field] as string | undefined) || '';
    if (!key) continue;
    let entry = map.get(key);
    if (!entry) {
      entry = { name: key, total: 0, inat: 0, dwca: 0 };
      map.set(key, entry);
    }
    entry.total += 1;
    if (r.source === 'inat' || r.source === 'both') entry.inat += 1;
    if (r.source === 'dwca' || r.source === 'both') entry.dwca += 1;
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export function topN<T>(arr: T[], n: number): T[] {
  return arr.slice(0, n);
}

export interface YearBucket {
  year: number;
  inat: number;
  dwca: number;
  total: number;
}

export function recordsByYear(records: OccurrenceRecord[]): YearBucket[] {
  const map = new Map<number, YearBucket>();
  for (const r of records) {
    if (r.year === undefined) continue;
    let b = map.get(r.year);
    if (!b) {
      b = { year: r.year, inat: 0, dwca: 0, total: 0 };
      map.set(r.year, b);
    }
    b.total += 1;
    if (r.source === 'inat' || r.source === 'both') b.inat += 1;
    if (r.source === 'dwca' || r.source === 'both') b.dwca += 1;
  }
  return Array.from(map.values()).sort((a, b) => a.year - b.year);
}

export interface SeasonalitySeries {
  taxon: string;
  data: { month: number; count: number }[];
}

// Returns multi-line phenology dataset over months 1–12 for the top-N taxa by record count.
export function seasonalityForTopTaxa(
  records: OccurrenceRecord[],
  field: 'order' | 'family' | 'scientificName',
  topN: number
): { months: number[]; series: { taxon: string; counts: number[] }[]; combined: Record<string, number | string>[] } {
  const counts = countBy(records, field);
  const top = counts.slice(0, topN).map((c) => c.name);
  const topSet = new Set(top);
  const seriesMap = new Map<string, number[]>();
  for (const t of top) seriesMap.set(t, new Array(12).fill(0));

  for (const r of records) {
    if (r.month === undefined || r.month < 1 || r.month > 12) continue;
    const key = (r[field] as string | undefined) || '';
    if (!topSet.has(key)) continue;
    const arr = seriesMap.get(key)!;
    arr[r.month - 1] += 1;
  }

  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const series = top.map((t) => ({ taxon: t, counts: seriesMap.get(t)! }));
  const combined: Record<string, number | string>[] = months.map((m) => {
    const row: Record<string, number | string> = { month: m };
    for (const s of series) row[s.taxon] = s.counts[m - 1];
    return row;
  });
  return { months, series, combined };
}

export interface OverviewMetrics {
  total: number;
  speciesCount: number;
  generaCount: number;
  familyCount: number;
  orderCount: number;
  yearMin?: number;
  yearMax?: number;
  inat: number;
  dwca: number;
}

export function computeOverviewMetrics(records: OccurrenceRecord[]): OverviewMetrics {
  const species = new Set<string>();
  const genera = new Set<string>();
  const families = new Set<string>();
  const orders = new Set<string>();
  let inat = 0;
  let dwca = 0;
  let yearMin: number | undefined;
  let yearMax: number | undefined;

  for (const r of records) {
    if (r.rank === 'species' && r.scientificName) species.add(r.scientificName);
    if (r.genus) genera.add(r.genus);
    if (r.family) families.add(r.family);
    if (r.order) orders.add(r.order);
    if (r.source === 'inat' || r.source === 'both') inat += 1;
    if (r.source === 'dwca' || r.source === 'both') dwca += 1;
    if (r.year !== undefined) {
      if (yearMin === undefined || r.year < yearMin) yearMin = r.year;
      if (yearMax === undefined || r.year > yearMax) yearMax = r.year;
    }
  }
  return {
    total: records.length,
    speciesCount: species.size,
    generaCount: genera.size,
    familyCount: families.size,
    orderCount: orders.size,
    yearMin,
    yearMax,
    inat,
    dwca,
  };
}

export interface SpeciesRow {
  scientificName: string;
  commonName?: string;
  order?: string;
  family?: string;
  genus?: string;
  total: number;
  inat: number;
  dwca: number;
  rank: string; // most-specific rank seen across records under this scientificName
}

export function buildSpeciesRows(records: OccurrenceRecord[]): SpeciesRow[] {
  const map = new Map<string, SpeciesRow>();
  for (const r of records) {
    const key = r.scientificName;
    if (!key) continue;
    let row = map.get(key);
    if (!row) {
      row = {
        scientificName: key,
        commonName: r.commonName,
        order: r.order,
        family: r.family,
        genus: r.genus,
        total: 0,
        inat: 0,
        dwca: 0,
        rank: r.rank || 'unknown',
      };
      map.set(key, row);
    } else {
      if (!row.commonName && r.commonName) row.commonName = r.commonName;
      if (!row.order && r.order) row.order = r.order;
      if (!row.family && r.family) row.family = r.family;
      if (!row.genus && r.genus) row.genus = r.genus;
      row.rank = moreSpecificRank(row.rank, r.rank);
    }
    row.total += 1;
    if (r.source === 'inat' || r.source === 'both') row.inat += 1;
    if (r.source === 'dwca' || r.source === 'both') row.dwca += 1;
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}
