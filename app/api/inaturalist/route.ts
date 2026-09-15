import { NextResponse } from 'next/server';
import { getSnapshot } from '@/lib/data/records';

// Serves the iNaturalist slice of the weekly snapshot. Nothing is fetched from
// iNaturalist here — scripts/build-data.ts does that once a week — so this
// route is fully prerendered.
export const runtime = 'nodejs';
export const dynamic = 'force-static';

export async function GET() {
  try {
    const snapshot = await getSnapshot();
    // 'both' rows are iNaturalist observations that also matched a specimen,
    // so they belong in this slice too.
    const records = snapshot.records.filter((r) => r.source === 'inat' || r.source === 'both');
    return NextResponse.json({
      records,
      meta: {
        count: records.length,
        fetchedAt: snapshot.generatedAt,
        projectId: snapshot.sources.inat.projectId,
        sourceError: snapshot.sources.inat.error,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message, records: [] }, { status: 500 });
  }
}
