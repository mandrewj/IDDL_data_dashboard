import { NextResponse } from 'next/server';
import { getSnapshot } from '@/lib/data/records';

// Serves the INDD specimen slice of the weekly snapshot. The DwC-A zip is
// downloaded and parsed by scripts/build-data.ts once a week, not here, so
// this route is fully prerendered.
export const runtime = 'nodejs';
export const dynamic = 'force-static';

export async function GET() {
  try {
    const snapshot = await getSnapshot();
    // 'both' rows are specimens that also matched an iNaturalist observation,
    // so they belong in this slice too.
    const records = snapshot.records.filter((r) => r.source === 'dwca' || r.source === 'both');
    return NextResponse.json({
      records,
      meta: {
        count: records.length,
        fetchedAt: snapshot.generatedAt,
        source: snapshot.sources.dwca.url,
        sourceError: snapshot.sources.dwca.error,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message, records: [] }, { status: 500 });
  }
}
