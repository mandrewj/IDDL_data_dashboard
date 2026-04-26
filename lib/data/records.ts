import { OccurrenceRecord } from '@/lib/types';
import { fetchInatProjectObservations } from '@/lib/parsers/inatParser';
import { parseDwcaArchive } from '@/lib/parsers/dwcaParser';
import { mergeRecords } from '@/lib/parsers/recordMerger';

const DWCA_URL = process.env.NEXT_PUBLIC_DWCA_URL || 'https://ecdysis.org/content/dwca/MAJC-INDD_DwC-A.zip';

interface SourceLoad {
  records: OccurrenceRecord[];
  error?: string;
}

async function loadInat(): Promise<SourceLoad> {
  try {
    const records = await fetchInatProjectObservations();
    return { records };
  } catch (err) {
    return { records: [], error: err instanceof Error ? err.message : String(err) };
  }
}

async function loadDwca(): Promise<SourceLoad> {
  try {
    const res = await fetch(DWCA_URL, {
      headers: { 'User-Agent': 'iddl-dashboard/0.1' },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return { records: [], error: `DwCA download failed: ${res.status}` };
    const buf = Buffer.from(await res.arrayBuffer());
    const records = await parseDwcaArchive(buf);
    return { records };
  } catch (err) {
    return { records: [], error: err instanceof Error ? err.message : String(err) };
  }
}

export interface MergedRecordsResult {
  merged: OccurrenceRecord[];
  meta: {
    total: number;
    inatCount: number;
    dwcaCount: number;
    bothCount: number;
    sourceErrors: { inat?: string; dwca?: string };
    fetchedAt: string;
  };
}

let cache: (MergedRecordsResult & { ts: number }) | null = null;
const CACHE_TTL_MS = 1000 * 60 * 30;

export async function getMergedRecords(): Promise<MergedRecordsResult> {
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return { merged: cache.merged, meta: cache.meta };
  }
  const [inat, dwca] = await Promise.all([loadInat(), loadDwca()]);
  const merged = mergeRecords(inat.records, dwca.records);
  const meta = {
    total: merged.length,
    inatCount: merged.filter((r) => r.source === 'inat' || r.source === 'both').length,
    dwcaCount: merged.filter((r) => r.source === 'dwca' || r.source === 'both').length,
    bothCount: merged.filter((r) => r.source === 'both').length,
    sourceErrors: { inat: inat.error, dwca: dwca.error },
    fetchedAt: new Date().toISOString(),
  };
  cache = { merged, meta, ts: Date.now() };
  return { merged, meta };
}
