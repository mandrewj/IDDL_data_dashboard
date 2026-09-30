/**
 * Builds data/gbif-metrics.json — how the INDD dataset is used on GBIF:
 * download events, records downloaded, and citing literature.
 *
 * Runs in the same weekly job as build:data (.github/workflows/refresh-data.yml)
 * and can be run by hand:
 *
 *   npm run build:gbif
 *
 * On any failure it exits non-zero WITHOUT touching the existing file, so last
 * week's numbers stay up. The workflow treats that as a warning, not a failed
 * refresh — occurrence data shouldn't wait on GBIF.
 */
import { createHash } from 'node:crypto';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { fetchWithRetry } from '@/lib/utils/http';
import {
  Citation,
  GBIF_DATASET_KEY,
  GBIF_METRICS_RELATIVE_PATH,
  GBIF_METRICS_VERSION,
  GbifMetrics,
  MonthlyDownloads,
  monthKey,
  monthRange,
} from '@/lib/data/gbifMetrics';

const API = 'https://api.gbif.org/v1';
const DATASET_KEY = process.env.GBIF_DATASET_KEY || GBIF_DATASET_KEY;
const USER_AGENT = 'iddl-dashboard-refresh/1.0 (+https://insectid.org)';
const PAGE_SIZE = 1000;

// Every download request counts, whatever its status (SUCCEEDED, FILE_ERASED,
// FAILED, CANCELLED…), so the totals match the dataset's page on GBIF.

async function getJson<T>(url: string, label: string): Promise<T> {
  const res = await fetchWithRetry(url, { label, headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${label}: HTTP ${res.status} ${res.statusText} for ${url}`);
  return (await res.json()) as T;
}

interface Page<T> {
  offset: number;
  limit: number;
  endOfRecords: boolean;
  count?: number;
  results: T[];
}

/**
 * Walks an offset/limit endpoint until endOfRecords. GBIF silently caps some
 * endpoints below the requested limit (downloads-by-dataset returns 100), so
 * advance by what actually came back, not by PAGE_SIZE.
 */
async function fetchAll<T>(base: string, label: string): Promise<T[]> {
  const out: T[] = [];
  const sep = base.includes('?') ? '&' : '?';
  for (let offset = 0; ; ) {
    const page = await getJson<Page<T>>(`${base}${sep}limit=${PAGE_SIZE}&offset=${offset}`, label);
    out.push(...page.results);
    offset += page.results.length;
    if (page.endOfRecords || page.results.length === 0) break;
  }
  if (out.length > PAGE_SIZE && out.length % PAGE_SIZE !== 0) console.log(`  ${label}: ${out.length} rows`);
  return out;
}

interface DatasetDownload {
  downloadKey: string;
  numberRecords: number;
  download: { created: string; status: string };
}

interface LiteratureRecord {
  id: string;
  title: string;
  authors?: { firstName?: string; lastName?: string }[];
  year?: number;
  published?: string;
  source?: string;
  literatureType?: string;
  peerReview?: boolean;
  identifiers?: { doi?: string };
  websites?: string[];
}

async function fetchDownloads() {
  const raw = await fetchAll<DatasetDownload>(`${API}/occurrence/download/dataset/${DATASET_KEY}`, 'GBIF downloads');
  // Results are newest-first, so a download created mid-pagination shifts
  // every later page by one. De-dupe by key rather than trust the offsets.
  const byKey = new Map<string, DatasetDownload>();
  for (const d of raw) byKey.set(d.downloadKey, d);
  return Array.from(byKey.values());
}

function formatAuthors(authors: LiteratureRecord['authors']): string {
  const names = (authors ?? []).map((a) => [a.firstName, a.lastName].filter(Boolean).join(' ')).filter(Boolean);
  if (names.length === 0) return '';
  if (names.length <= 3) return names.join(', ');
  return `${names[0]} et al.`;
}

function toCitation(r: LiteratureRecord): Citation {
  const doi = r.identifiers?.doi;
  const published = r.published && /^\d{4}-\d{2}-\d{2}/.test(r.published) ? r.published.slice(0, 10) : undefined;
  return {
    id: r.id,
    title: r.title.trim(),
    authors: formatAuthors(r.authors),
    year: r.year,
    published,
    venue: r.source || undefined,
    type: r.literatureType,
    peerReviewed: Boolean(r.peerReview),
    doi,
    url: doi ? `https://doi.org/${doi}` : r.websites?.[0],
  };
}

async function fetchCitations(): Promise<Citation[]> {
  const raw = await fetchAll<LiteratureRecord>(
    `${API}/literature/search?gbifDatasetKey=${DATASET_KEY}`,
    'GBIF literature'
  );
  const date = (c: Citation) => c.published ?? (c.year ? `${c.year}-01-01` : '');
  return raw.map(toCitation).sort((a, b) => date(b).localeCompare(date(a)));
}

function monthlyDownloads(downloads: DatasetDownload[], end: string): MonthlyDownloads[] {
  if (downloads.length === 0) return [];
  const buckets = new Map<string, MonthlyDownloads>();
  for (const d of downloads) {
    const month = monthKey(new Date(d.download.created));
    const b = buckets.get(month) ?? { month, events: 0, records: 0 };
    b.events += 1;
    b.records += d.numberRecords;
    buckets.set(month, b);
  }
  const first = Array.from(buckets.keys()).sort()[0];
  return monthRange(first, end).map((month) => buckets.get(month) ?? { month, events: 0, records: 0 });
}

async function previousHash(file: string): Promise<string | undefined> {
  try {
    return (JSON.parse(await readFile(file, 'utf8')) as GbifMetrics).contentHash;
  } catch {
    return undefined;
  }
}

async function main() {
  const started = Date.now();
  console.log(`GBIF dataset ${DATASET_KEY}`);

  const [dataset, downloads, citations] = await Promise.all([
    getJson<{ doi?: string }>(`${API}/dataset/${DATASET_KEY}`, 'GBIF dataset'),
    fetchDownloads(),
    fetchCitations(),
  ]);

  console.log(`  downloads: ${downloads.length.toLocaleString()}`);
  console.log(`  citations: ${citations.length}`);

  // An empty result from a dataset that has plenty is an upstream fault, not
  // news — don't commit it over good data.
  if (downloads.length === 0) throw new Error('GBIF returned zero downloads for the dataset');

  const generatedAt = new Date().toISOString();
  const monthly = monthlyDownloads(downloads, monthKey(new Date(generatedAt)));
  const firstDownload = downloads
    .map((d) => d.download.created)
    .reduce((a, b) => (a < b ? a : b));

  const content = {
    downloads: {
      totalEvents: downloads.length,
      totalRecords: downloads.reduce((n, d) => n + d.numberRecords, 0),
      firstDownload,
      monthly,
    },
    citations,
  };
  const contentHash = createHash('sha256').update(JSON.stringify(content)).digest('hex');

  const metrics: GbifMetrics = {
    version: GBIF_METRICS_VERSION,
    generatedAt,
    datasetKey: DATASET_KEY,
    datasetDoi: dataset.doi,
    contentHash,
    ...content,
  };

  const outFile = path.join(process.cwd(), GBIF_METRICS_RELATIVE_PATH);
  const before = await previousHash(outFile);
  await mkdir(path.dirname(outFile), { recursive: true });
  await writeFile(outFile, JSON.stringify(metrics, null, 1) + '\n', 'utf8');

  const changed = before !== contentHash;
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  console.log(
    `\nwrote ${GBIF_METRICS_RELATIVE_PATH} in ${elapsed}s — ` +
      `${content.downloads.totalEvents.toLocaleString()} downloads / ` +
      `${content.downloads.totalRecords.toLocaleString()} records / ${citations.length} citations`
  );
  console.log(changed ? 'metrics changed since last run' : 'metrics unchanged since last run');

  const githubOutput = process.env.GITHUB_OUTPUT;
  if (githubOutput) {
    await appendFile(
      githubOutput,
      [
        `gbif_changed=${changed}`,
        `gbif_downloads=${content.downloads.totalEvents}`,
        `gbif_citations=${citations.length}`,
        '',
      ].join('\n')
    );
  }
}

main().catch((err) => {
  console.error('build:gbif failed — existing metrics file left untouched');
  console.error(err);
  process.exit(1);
});
