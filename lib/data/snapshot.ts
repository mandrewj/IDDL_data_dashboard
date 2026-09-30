import { OccurrenceRecord } from '@/lib/types';

// Shared contract between the writer (scripts/build-data.ts) and the reader
// (lib/data/records.ts). Keep the two in step by importing from here only.

/** Bumped whenever the on-disk shape changes in a way the reader must notice. */
// v2: county is derived from coordinates at ingest (iNat records had none);
//     iNat rows gained coordinatesObscured.
export const SNAPSHOT_VERSION = 2;

/** Repo-relative path; resolved against process.cwd() at build and request time. */
export const SNAPSHOT_RELATIVE_PATH = 'data/snapshot.json';

export interface SnapshotSourceInfo {
  /** Records this source contributed, counted before the merge collapsed duplicates. */
  count: number;
  /** Set only when the source failed and --allow-partial forced the write anyway. */
  error?: string;
}

export interface DataSnapshot {
  version: number;
  /** ISO timestamp of the run that produced this file. */
  generatedAt: string;
  /** sha256 of the serialized records — lets CI tell a real change from a new timestamp. */
  recordsHash: string;
  sources: {
    inat: SnapshotSourceInfo & { projectId: string };
    dwca: SnapshotSourceInfo & { url: string };
  };
  counts: {
    total: number;
    inat: number;
    dwca: number;
    both: number;
  };
  records: OccurrenceRecord[];
}
