import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { OccurrenceRecord } from '@/lib/types';
import { DataSnapshot, SNAPSHOT_RELATIVE_PATH, SNAPSHOT_VERSION } from '@/lib/data/snapshot';

// Reads the snapshot that scripts/build-data.ts commits to the repo. Nothing
// here touches the network — upstream is pulled once a week by CI, not by a
// visitor's request. See README "Data refresh".

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

// The snapshot cannot change within a deployment, so this caches for the life
// of the instance — no TTL, unlike the live-fetch version this replaced.
let snapshotPromise: Promise<DataSnapshot> | null = null;

async function readSnapshot(): Promise<DataSnapshot> {
  const file = path.join(process.cwd(), SNAPSHOT_RELATIVE_PATH);

  const raw = await readFile(file, 'utf8').catch(() => {
    throw new Error(
      `Occurrence snapshot not found at ${SNAPSHOT_RELATIVE_PATH}. ` +
        'Run `npm run build:data` to generate it, or run the "Weekly data refresh" ' +
        'GitHub Action and pull the commit it pushes.'
    );
  });

  const parsed = JSON.parse(raw) as DataSnapshot;
  if (parsed.version !== SNAPSHOT_VERSION) {
    throw new Error(
      `Snapshot version ${parsed.version} does not match the expected ${SNAPSHOT_VERSION}. ` +
        'Re-run `npm run build:data`.'
    );
  }
  if (!Array.isArray(parsed.records)) {
    throw new Error('Snapshot is malformed: "records" is not an array.');
  }
  return parsed;
}

/** The raw snapshot, including per-source provenance. Cached per instance. */
export function getSnapshot(): Promise<DataSnapshot> {
  if (!snapshotPromise) {
    snapshotPromise = readSnapshot().catch((err) => {
      // Don't pin a transient read failure for the life of the instance.
      snapshotPromise = null;
      throw err;
    });
  }
  return snapshotPromise;
}

export async function getMergedRecords(): Promise<MergedRecordsResult> {
  const snapshot = await getSnapshot();
  return {
    merged: snapshot.records,
    meta: {
      total: snapshot.counts.total,
      inatCount: snapshot.counts.inat,
      dwcaCount: snapshot.counts.dwca,
      bothCount: snapshot.counts.both,
      sourceErrors: {
        inat: snapshot.sources.inat.error,
        dwca: snapshot.sources.dwca.error,
      },
      fetchedAt: snapshot.generatedAt,
    },
  };
}
