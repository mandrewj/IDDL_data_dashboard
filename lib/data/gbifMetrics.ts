import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Usage metrics for the INDD dataset as published to GBIF (via ecdysis):
// download events, records downloaded, and citing literature. Written weekly by
// scripts/build-gbif.ts alongside the occurrence snapshot, read here by pages.
// Kept in its own file so a GBIF outage never blocks the occurrence refresh.

/** Bumped whenever the on-disk shape changes in a way the reader must notice. */
export const GBIF_METRICS_VERSION = 1;

export const GBIF_METRICS_RELATIVE_PATH = 'data/gbif-metrics.json';

export const GBIF_DATASET_KEY = 'd55073b8-f5a0-46e3-89e3-9519c57b0316';
export const GBIF_DATASET_URL = `https://www.gbif.org/dataset/${GBIF_DATASET_KEY}`;
export const GBIF_LITERATURE_URL = `https://www.gbif.org/literature/search?gbifDatasetKey=${GBIF_DATASET_KEY}`;

export interface MonthlyDownloads {
  /** YYYY-MM (UTC). Every month from the first download to generatedAt is present, zeros included. */
  month: string;
  /** Download requests (any status, as GBIF counts them) that included this dataset. */
  events: number;
  /** Records from this dataset contained in those downloads. */
  records: number;
}

export interface Citation {
  id: string;
  title: string;
  authors: string;
  year?: number;
  /** YYYY-MM-DD when GBIF knows it; otherwise absent and `year` is the best date. */
  published?: string;
  venue?: string;
  /** GBIF literatureType, e.g. JOURNAL, WORKING_PAPER, CONFERENCE_PROCEEDINGS. */
  type?: string;
  peerReviewed: boolean;
  doi?: string;
  /** Link to the paper: the DOI when present, else the first website GBIF lists. */
  url?: string;
}

export interface GbifMetrics {
  version: number;
  /** ISO timestamp of the run that produced this file. */
  generatedAt: string;
  datasetKey: string;
  datasetDoi?: string;
  /** sha256 of downloads + citations, so CI can tell a real change from a new timestamp. */
  contentHash: string;
  downloads: {
    totalEvents: number;
    totalRecords: number;
    firstDownload?: string;
    monthly: MonthlyDownloads[];
  };
  /** Newest first. */
  citations: Citation[];
}

// Can't change within a deployment, so cache for the life of the instance.
let metricsPromise: Promise<GbifMetrics | null> | null = null;

async function readMetrics(): Promise<GbifMetrics | null> {
  const file = path.join(process.cwd(), GBIF_METRICS_RELATIVE_PATH);
  let raw: string;
  try {
    raw = await readFile(file, 'utf8');
  } catch {
    // Not fatal: the occurrence dashboard works without it. Pages show a notice.
    return null;
  }
  const parsed = JSON.parse(raw) as GbifMetrics;
  if (parsed.version !== GBIF_METRICS_VERSION) {
    throw new Error(
      `GBIF metrics version ${parsed.version} does not match the expected ${GBIF_METRICS_VERSION}. ` +
        'Re-run `npm run build:gbif`.'
    );
  }
  return parsed;
}

/** The committed GBIF metrics, or null if the file hasn't been generated yet. */
export function getGbifMetrics(): Promise<GbifMetrics | null> {
  if (!metricsPromise) {
    metricsPromise = readMetrics().catch((err) => {
      metricsPromise = null;
      throw err;
    });
  }
  return metricsPromise;
}

// --- chart shaping ---------------------------------------------------------

export interface MonthlyCumulativePoint {
  month: string;
  value: number;
  cumulative: number;
}

export function withCumulative(rows: { month: string; value: number }[]): MonthlyCumulativePoint[] {
  let running = 0;
  return rows.map((r) => {
    running += r.value;
    return { month: r.month, value: r.value, cumulative: running };
  });
}

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Every YYYY-MM from `from` through `to` inclusive. */
export function monthRange(from: string, to: string): string[] {
  const out: string[] = [];
  const [fy, fm] = from.split('-').map(Number);
  const cursor = new Date(Date.UTC(fy, fm - 1, 1));
  while (monthKey(cursor) <= to) {
    out.push(monthKey(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return out;
}

export { monthKey };

/**
 * Citations per month with a running total, over the same months as the
 * download charts (extended back if a paper predates the first download).
 * Papers with only a year are placed in January of that year.
 */
export function citationsByMonth(metrics: GbifMetrics): MonthlyCumulativePoint[] {
  const months = metrics.citations.map((c) =>
    c.published ? c.published.slice(0, 7) : c.year ? `${c.year}-01` : undefined
  );
  const known = months.filter((m): m is string => !!m);
  if (known.length === 0) return [];
  const start = [known.reduce((a, b) => (a < b ? a : b)), metrics.downloads.monthly[0]?.month]
    .filter((m): m is string => !!m)
    .reduce((a, b) => (a < b ? a : b));
  const end = monthKey(new Date(metrics.generatedAt));
  const counts = new Map<string, number>();
  for (const m of known) counts.set(m, (counts.get(m) ?? 0) + 1);
  return withCumulative(monthRange(start, end).map((month) => ({ month, value: counts.get(month) ?? 0 })));
}
