import { NextResponse } from 'next/server';
import { parseDwcaArchive } from '@/lib/parsers/dwcaParser';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const revalidate = 86400;

const DWCA_URL = process.env.NEXT_PUBLIC_DWCA_URL || 'https://ecdysis.org/content/dwca/MAJC-INDD_DwC-A.zip';

export async function GET() {
  try {
    const res = await fetch(DWCA_URL, {
      headers: { 'User-Agent': 'iddl-dashboard/0.1' },
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `DwCA download failed: ${res.status}` },
        { status: 502 }
      );
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const records = await parseDwcaArchive(buf);
    return NextResponse.json({
      records,
      meta: { count: records.length, fetchedAt: new Date().toISOString(), source: DWCA_URL },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message, records: [] }, { status: 500 });
  }
}
