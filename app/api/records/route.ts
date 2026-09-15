import { NextRequest, NextResponse } from 'next/server';
import { getMergedRecords } from '@/lib/data/records';
import { applyFilters } from '@/lib/parsers/recordMerger';

// Filters the weekly snapshot per request; the snapshot itself is refreshed
// by scripts/build-data.ts in CI, so there is no revalidation window here.
export const runtime = 'nodejs';

function num(v: string | null): number | undefined {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const { merged, meta } = await getMergedRecords();
  const filtered = applyFilters(merged, {
    source: searchParams.get('source'),
    order: searchParams.get('order'),
    family: searchParams.get('family'),
    genus: searchParams.get('genus'),
    species: searchParams.get('species'),
    yearMin: num(searchParams.get('yearMin')),
    yearMax: num(searchParams.get('yearMax')),
    monthMin: num(searchParams.get('monthMin')),
    monthMax: num(searchParams.get('monthMax')),
  });
  return NextResponse.json({ records: filtered, meta: { ...meta, filteredCount: filtered.length } });
}
