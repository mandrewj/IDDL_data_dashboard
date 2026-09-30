/**
 * Fast health check on the committed snapshot and the data layer that reads it.
 *
 *   npm run verify:data
 *
 * Runs in seconds with no network and no webpack, so it is the cheap way to
 * confirm a data-layer change before (or instead of) a full `next build` —
 * which on a memory-constrained machine can take over an hour. It exercises the
 * same code paths the pages and API routes use: getMergedRecords(), getSnapshot(),
 * applyFilters(), and every aggregation the dashboard renders.
 *
 * Exits non-zero on the first inconsistency, so it is safe to chain in CI.
 */
import { createHash } from 'node:crypto';

import { getMergedRecords, getSnapshot } from '@/lib/data/records';
import { applyFilters } from '@/lib/parsers/recordMerger';
import { SNAPSHOT_VERSION } from '@/lib/data/snapshot';
import {
  buildSpeciesRows,
  computeOverviewMetrics,
  countBy,
  recordsByCounty,
  recordsByYear,
  seasonalityForTopTaxa,
} from '@/lib/data/aggregations';

let failures = 0;

function check(name: string, ok: boolean, detail = '') {
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}

async function main() {
  const t0 = Date.now();
  const { merged, meta } = await getMergedRecords();
  const loadMs = Date.now() - t0;

  // --- snapshot integrity -------------------------------------------------
  const snapshot = await getSnapshot();
  check('snapshot loads', merged.length > 0, `${merged.length.toLocaleString()} records in ${loadMs}ms`);
  check('version matches reader', snapshot.version === SNAPSHOT_VERSION, `v${snapshot.version}`);
  check('generatedAt is a valid date', !Number.isNaN(Date.parse(snapshot.generatedAt)), snapshot.generatedAt);

  // The weekly workflow decides whether to commit by comparing this hash, so a
  // stale one would either suppress a real update or force an empty commit.
  const recomputed = createHash('sha256').update(JSON.stringify(snapshot.records)).digest('hex');
  check('recordsHash matches the records', snapshot.recordsHash === recomputed,
    snapshot.recordsHash === recomputed ? snapshot.recordsHash.slice(0, 12) + '…' : 'stale — re-run build:data');

  // --- counts are self-consistent ----------------------------------------
  const inatActual = merged.filter((r) => r.source === 'inat' || r.source === 'both').length;
  const dwcaActual = merged.filter((r) => r.source === 'dwca' || r.source === 'both').length;
  const bothActual = merged.filter((r) => r.source === 'both').length;
  check('meta.total matches records', meta.total === merged.length, `${meta.total.toLocaleString()}`);
  check('meta.inatCount correct', meta.inatCount === inatActual, `${inatActual.toLocaleString()}`);
  check('meta.dwcaCount correct', meta.dwcaCount === dwcaActual, `${dwcaActual.toLocaleString()}`);
  check('meta.bothCount correct', meta.bothCount === bothActual, `${bothActual.toLocaleString()}`);
  check('every record carries a source', merged.every((r) => r.source === 'inat' || r.source === 'dwca' || r.source === 'both'));
  const ids = new Set(merged.map((r) => r.id));
  check('record ids are unique', ids.size === merged.length,
    ids.size === merged.length ? '' : `${merged.length - ids.size} duplicates`);
  check('every record has an id and name', merged.every((r) => !!r.id && !!r.scientificName));

  if (meta.sourceErrors.inat || meta.sourceErrors.dwca) {
    console.log(`note  snapshot was built with a failing source — banner will show: ` +
      `${meta.sourceErrors.inat ?? ''} ${meta.sourceErrors.dwca ?? ''}`.trim());
  }

  // --- ?source= filtering, as the pages and /api/records use it -----------
  check('source=all returns everything', applyFilters(merged, { source: 'all' }).length === merged.length);
  check('source=inat filters', applyFilters(merged, { source: 'inat' }).length === meta.inatCount);
  check('source=dwca filters', applyFilters(merged, { source: 'dwca' }).length === meta.dwcaCount);

  // --- aggregations behind every panel ------------------------------------
  const all = applyFilters(merged, { source: 'all' });
  const metrics = computeOverviewMetrics(all);
  check('overview metrics compute', metrics.total > 0 && metrics.speciesCount > 0,
    `${metrics.speciesCount.toLocaleString()} species · ${metrics.orderCount} orders · ${metrics.yearMin}–${metrics.yearMax}`);

  const orders = countBy(all, 'order');
  const families = countBy(all, 'family');
  check('countBy(order)', orders.length > 0, `${orders.length} orders, top: ${orders.slice(0, 3).map((o) => o.name).join(', ')}`);
  check('countBy(family)', families.length > 0, `${families.length} families`);
  check('recordsByYear', recordsByYear(all).length > 0, `${recordsByYear(all).length} years`);
  check('buildSpeciesRows', buildSpeciesRows(all).length > 0, `${buildSpeciesRows(all).length.toLocaleString()} rows`);

  const seasonality = seasonalityForTopTaxa(all, 'order', 10);
  check('seasonality', seasonality.series.length > 0 && seasonality.combined.length === 12 &&
    seasonality.series.some((s) => s.counts.some((c) => c > 0)),
    `${seasonality.series.length} series × 12 months`);

  // iNat has no county field; build:data derives it from coordinates. If that
  // step is skipped the county map silently loses every iNat record.
  const inatWithCoords = merged.filter((r) => r.source === 'inat' && r.lat !== undefined && !r.coordinatesObscured);
  const inatWithCounty = inatWithCoords.filter((r) => r.county).length;
  check('iNat records carry a county', inatWithCounty >= inatWithCoords.length * 0.9,
    `${inatWithCounty.toLocaleString()} / ${inatWithCoords.length.toLocaleString()} unobscured`);
  const counties = recordsByCounty(all);
  const countyInat = Array.from(counties.values()).reduce((n, c) => n + c.inat, 0);
  check('recordsByCounty includes iNat', counties.size > 0 && countyInat > 0,
    `${counties.size} counties, ${countyInat.toLocaleString()} iNat records tallied`);

  // generateStaticParams() on /order/[order] and /family/[family] reads these,
  // so an empty list here means a build that silently prerenders nothing.
  check('static params available', orders.length > 0 && families.length > 0,
    `${orders.length} order + ${families.length} family routes`);

  console.log(
    failures === 0
      ? `\nall checks passed in ${Date.now() - t0}ms`
      : `\n${failures} check(s) FAILED`
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('verify:data failed to run');
  console.error(err);
  process.exit(1);
});
