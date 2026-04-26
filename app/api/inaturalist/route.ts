import { NextResponse } from 'next/server';
import { fetchInatProjectObservations } from '@/lib/parsers/inatParser';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const revalidate = 21600;

export async function GET() {
  try {
    const records = await fetchInatProjectObservations();
    return NextResponse.json({
      records,
      meta: {
        count: records.length,
        fetchedAt: new Date().toISOString(),
        projectId: process.env.NEXT_PUBLIC_INAT_PROJECT_ID || '275094',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message, records: [] }, { status: 500 });
  }
}
