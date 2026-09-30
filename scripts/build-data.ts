/**
 * Builds data/snapshot.json — the committed copy of every occurrence record.
 *
 * The app no longer talks to iNaturalist or ecdysis.org while serving a
 * request; this script is the only thing that does. It runs weekly in CI
 * (.github/workflows/refresh-data.yml) and can be run by hand:
 *
 *   npm run build:data                     # refuse to write if a source failed
 *   npm run build:data -- --allow-partial  # write anyway, record the error
 *
 * Refusing to write on failure is deliberate. A half-empty snapshot committed
 * over a good one would silently gut the dashboard until somebody noticed, and
 * the previous week's data is always a better answer than no data.
 */
import { createHash } from 'node:crypto';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { parseDwcaArchive } from '@/lib/parsers/dwcaParser';
import { fetchInatProjectObservations } from '@/lib/parsers/inatParser';
import { mergeRecords } from '@/lib/parsers/recordMerger';
import { fetchWithRetry } from '@/lib/utils/http';
import { assignCounties, CountyAssignmentStats, createCountyLookup } from '@/lib/utils/countyLookup';
import { OccurrenceRecord } from '@/lib/types';
import {
  DataSnapshot,
  SNAPSHOT_RELATIVE_PATH,
  SNAPSHOT_VERSION,
} from '@/lib/data/snapshot';

const DWCA_URL =
  process.env.NEXT_PUBLIC_DWCA_URL || 'https://ecdysis.org/content/dwca/MAJC-INDD_DwC-A.zip';
const PROJECT_ID = process.env.NEXT_PUBLIC_INAT_PROJECT_ID || '275094';

/** Census 500k county polygons; used only here, so it isn't shipped with the app. */
const COUNTY_BOUNDARIES = 'data/indiana-counties-500k.geojson';

const USER_AGENT = 'iddl-dashboard-refresh/1.0 (+https://insectid.org)';

interface SourceLoad {
  records: OccurrenceRecord[];
  error?: string;
}

async function loadInat(): Promise<SourceLoad> {
  try {
    const records = await fetchInatProjectObservations();
    if (records.length === 0) throw new Error('iNaturalist returned zero usable observations');
    return { records };
  } catch (err) {
    return { records: [], error: err instanceof Error ? err.message : String(err) };
  }
}

async function loadDwca(): Promise<SourceLoad> {
  try {
    const res = await fetchWithRetry(DWCA_URL, { label: 'DwC-A', headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) throw new Error(`DwC-A download failed: ${res.status} ${res.statusText}`);
    const records = await parseDwcaArchive(Buffer.from(await res.arrayBuffer()));
    if (records.length === 0) throw new Error('DwC-A archive contained zero usable records');
    return { records };
  } catch (err) {
    return { records: [], error: err instanceof Error ? err.message : String(err) };
  }
}

/** Previous recordsHash, if a snapshot is already committed. Used only for reporting. */
async function previousHash(file: string): Promise<string | undefined> {
  try {
    const raw = await readFile(file, 'utf8');
    return (JSON.parse(raw) as DataSnapshot).recordsHash;
  } catch {
    return undefined;
  }
}

async function main() {
  const allowPartial = process.argv.includes('--allow-partial');
  const started = Date.now();

  console.log(`iNaturalist project #${PROJECT_ID}`);
  console.log(`DwC-A            ${DWCA_URL}`);
  console.log('fetching both sources…');

  const [inat, dwca] = await Promise.all([loadInat(), loadDwca()]);

  if (inat.error) console.error(`  iNaturalist FAILED: ${inat.error}`);
  else console.log(`  iNaturalist OK: ${inat.records.length.toLocaleString()} records`);

  if (dwca.error) console.error(`  DwC-A FAILED: ${dwca.error}`);
  else console.log(`  DwC-A OK: ${dwca.records.length.toLocaleString()} records`);

  if ((inat.error || dwca.error) && !allowPartial) {
    console.error(
      '\nRefusing to overwrite the snapshot with partial data.\n' +
        'Re-run once the source recovers, or pass --allow-partial to accept the gap.'
    );
    process.exit(1);
  }

  // iNat has no county field at all, so derive it from the coordinates before
  // merging — the merger and every county tally downstream read r.county.
  const countyLookup = createCountyLookup(
    JSON.parse(await readFile(path.join(process.cwd(), COUNTY_BOUNDARIES), 'utf8'))
  );
  const fmt = (s: CountyAssignmentStats) =>
    `${s.assigned.toLocaleString()} assigned, ${s.outsideIndiana.toLocaleString()} outside Indiana, ` +
    `${s.noCoords.toLocaleString()} without coordinates`;
  const inatCounties = assignCounties(inat.records, countyLookup);
  const dwcaCounties = assignCounties(dwca.records, countyLookup);
  console.log('county from coordinates:');
  console.log(`  iNaturalist: ${fmt(inatCounties)}, ${inatCounties.obscured} obscured (left blank)`);
  console.log(
    `  DwC-A (fills blanks only): ${fmt(dwcaCounties)}, ` +
      `${dwcaCounties.labelDisagrees} labels disagree with coordinates (label kept)`
  );

  const records = mergeRecords(inat.records, dwca.records);
  const counts = {
    total: records.length,
    inat: records.filter((r) => r.source === 'inat' || r.source === 'both').length,
    dwca: records.filter((r) => r.source === 'dwca' || r.source === 'both').length,
    both: records.filter((r) => r.source === 'both').length,
  };

  // Hash the records alone, not the whole file: generatedAt changes every run,
  // so hashing the file would make every run look like a data change.
  const serializedRecords = JSON.stringify(records);
  const recordsHash = createHash('sha256').update(serializedRecords).digest('hex');

  const snapshot: DataSnapshot = {
    version: SNAPSHOT_VERSION,
    generatedAt: new Date().toISOString(),
    recordsHash,
    sources: {
      inat: { projectId: PROJECT_ID, count: inat.records.length, error: inat.error },
      dwca: { url: DWCA_URL, count: dwca.records.length, error: dwca.error },
    },
    counts,
    records,
  };

  const outFile = path.join(process.cwd(), SNAPSHOT_RELATIVE_PATH);
  const before = await previousHash(outFile);

  await mkdir(path.dirname(outFile), { recursive: true });
  await writeFile(outFile, JSON.stringify(snapshot), 'utf8');

  const changed = before !== recordsHash;
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  console.log(
    `\nwrote ${SNAPSHOT_RELATIVE_PATH} in ${elapsed}s — ` +
      `${counts.total.toLocaleString()} records ` +
      `(${counts.inat.toLocaleString()} iNat / ${counts.dwca.toLocaleString()} INDD / ` +
      `${counts.both.toLocaleString()} in both)`
  );
  console.log(changed ? 'records changed since last run' : 'records unchanged since last run');

  // Let the weekly workflow skip a commit that would only bump generatedAt.
  const githubOutput = process.env.GITHUB_OUTPUT;
  if (githubOutput) {
    await appendFile(
      githubOutput,
      [
        `changed=${changed}`,
        `total=${counts.total}`,
        `inat=${counts.inat}`,
        `dwca=${counts.dwca}`,
        `both=${counts.both}`,
        `partial=${Boolean(inat.error || dwca.error)}`,
        '',
      ].join('\n')
    );
  }
}

main().catch((err) => {
  console.error('build:data failed');
  console.error(err);
  process.exit(1);
});
