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

export interface CountyCount {
  county: string;
  count: number;
  inat: number;
  dwca: number;
}

// Indiana-only: the map's counties layer uses NAME (title-case), so we key on
// a stripped/case-normalized form so "La Porte" ↔ "LaPorte" and similar
// spelling drifts match. Records without a county are skipped.
function countyKey(name: string): string {
  return name.trim().toLowerCase().replace(/[\s\-.']/g, '');
}

export function recordsByCounty(records: OccurrenceRecord[]): Map<string, CountyCount> {
  const map = new Map<string, CountyCount>();
  for (const r of records) {
    if (!r.county) continue;
    if (r.stateProvince && r.stateProvince.trim().toLowerCase() !== 'indiana') continue;
    const key = countyKey(r.county);
    let entry = map.get(key);
    if (!entry) {
      entry = { county: r.county.trim(), count: 0, inat: 0, dwca: 0 };
      map.set(key, entry);
    }
    entry.count += 1;
    if (r.source === 'inat' || r.source === 'both') entry.inat += 1;
    if (r.source === 'dwca' || r.source === 'both') entry.dwca += 1;
  }
  return map;
}

export function normalizeCountyKey(name: string): string {
  return countyKey(name);
}

export interface CumulativePoint {
  /** YYYY-MM label */
  bucket: string;
  ts: number; // epoch ms of first day of the month, for chart X scale
  inat: number;
  dwca: number;
  total: number;
}

// Running total per month across the full date range in the dataset, split by
// source. Records without a parseable date are excluded — they'd otherwise
// pile up on an unrelated bucket.
export function cumulativeRecordsByMonth(records: OccurrenceRecord[]): CumulativePoint[] {
  const buckets = new Map<string, { inat: number; dwca: number }>();
  for (const r of records) {
    if (r.year === undefined || r.month === undefined) continue;
    const key = `${r.year}-${String(r.month).padStart(2, '0')}`;
    let b = buckets.get(key);
    if (!b) {
      b = { inat: 0, dwca: 0 };
      buckets.set(key, b);
    }
    if (r.source === 'inat' || r.source === 'both') b.inat += 1;
    if (r.source === 'dwca' || r.source === 'both') b.dwca += 1;
  }
  const keys = Array.from(buckets.keys()).sort();
  let inatSum = 0;
  let dwcaSum = 0;
  return keys.map((k) => {
    const b = buckets.get(k)!;
    inatSum += b.inat;
    dwcaSum += b.dwca;
    const [y, m] = k.split('-').map(Number);
    return {
      bucket: k,
      ts: Date.UTC(y, m - 1, 1),
      inat: inatSum,
      dwca: dwcaSum,
      total: inatSum + dwcaSum,
    };
  });
}

export interface RecentActivity {
  /** Last 90 days as day-of-year bins (index 0 = 90 days ago, 89 = today). */
  daily: { day: string; ts: number; count: number }[];
  last7: number;
  last30: number;
  last90: number;
  last365: number;
  /** ISO date of the newest record actually present. */
  newest?: string;
}

// Last 90 days as a daily sparkline plus rolling-window counters. Uses the
// snapshot's newest record date as "today" so the strip doesn't go blank
// between weekly refreshes.
export function recentActivity(records: OccurrenceRecord[]): RecentActivity {
  const dated = records
    .map((r) => (r.date ? Date.parse(r.date) : NaN))
    .filter((t) => Number.isFinite(t));
  if (dated.length === 0) {
    return { daily: [], last7: 0, last30: 0, last90: 0, last365: 0 };
  }
  const newestTs = Math.max(...dated);
  const oneDay = 86_400_000;
  const startTs = newestTs - 89 * oneDay;
  const daily: { day: string; ts: number; count: number }[] = [];
  const counts = new Array(90).fill(0);
  for (const t of dated) {
    const diff = Math.floor((newestTs - t) / oneDay);
    if (diff >= 0 && diff < 90) counts[89 - diff] += 1;
  }
  for (let i = 0; i < 90; i++) {
    const ts = startTs + i * oneDay;
    const d = new Date(ts);
    daily.push({
      day: d.toISOString().slice(0, 10),
      ts,
      count: counts[i],
    });
  }
  let last7 = 0, last30 = 0, last90 = 0, last365 = 0;
  const cutoff7 = newestTs - 6 * oneDay;
  const cutoff30 = newestTs - 29 * oneDay;
  const cutoff90 = newestTs - 89 * oneDay;
  const cutoff365 = newestTs - 364 * oneDay;
  for (const t of dated) {
    if (t >= cutoff365) last365 += 1;
    if (t >= cutoff90) last90 += 1;
    if (t >= cutoff30) last30 += 1;
    if (t >= cutoff7) last7 += 1;
  }
  return {
    daily,
    last7,
    last30,
    last90,
    last365,
    newest: new Date(newestTs).toISOString().slice(0, 10),
  };
}

export interface CategoryCount {
  name: string;
  value: number;
}

// iNat's quality_grade lives on the record; DwCA rows never have it. Sorted
// research → needs_id → casual → other so the donut legend reads the same
// order every render.
const QUALITY_ORDER: Record<string, number> = { research: 0, needs_id: 1, casual: 2 };
const QUALITY_LABEL: Record<string, string> = {
  research: 'Research grade',
  needs_id: 'Needs ID',
  casual: 'Casual',
};

export function qualityGradeBreakdown(records: OccurrenceRecord[]): CategoryCount[] {
  const counts = new Map<string, number>();
  for (const r of records) {
    if (r.source !== 'inat' && r.source !== 'both') continue;
    const raw = (r.qualityGrade || 'unknown').toLowerCase();
    counts.set(raw, (counts.get(raw) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([k, v]) => ({ name: QUALITY_LABEL[k] ?? k, value: v, _sortKey: QUALITY_ORDER[k] ?? 99 }))
    .sort((a, b) => a._sortKey - b._sortKey)
    .map(({ name, value }) => ({ name, value }));
}

// DwC "basisOfRecord" is the specimen-vs-observation distinction. Grouped so
// the donut isn't dominated by a single dominant category label.
export function basisOfRecordBreakdown(records: OccurrenceRecord[]): CategoryCount[] {
  const counts = new Map<string, number>();
  for (const r of records) {
    if (r.source !== 'dwca' && r.source !== 'both') continue;
    const raw = (r.basisOfRecord || 'Unknown').trim();
    counts.set(raw, (counts.get(raw) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
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
