import { getMergedRecords } from '@/lib/data/records';
import { applyFilters } from '@/lib/parsers/recordMerger';
import {
  basisOfRecordBreakdown,
  buildSpeciesRows,
  computeOverviewMetrics,
  countBy,
  cumulativeRecordsByMonth,
  qualityGradeBreakdown,
  recentActivity,
  recordsByCounty,
  recordsByYear,
  seasonalityForTopTaxa,
} from '@/lib/data/aggregations';
import { Panel } from '@/components/ui/Panel';
import { StatCard } from '@/components/ui/StatCard';
import { StatCardGrid } from '@/components/ui/StatCardGrid';
import { SourceErrorBanner } from '@/components/ui/SourceErrorBanner';
import { RecordsByTaxonChart } from '@/components/charts/RecordsByTaxonChart';
import { SeasonalityChart } from '@/components/charts/SeasonalityChart';
import { RecordsOverTimeChart } from '@/components/charts/RecordsOverTimeChart';
import { CumulativeRecordsChart } from '@/components/charts/CumulativeRecordsChart';
import { RecentActivityStrip } from '@/components/charts/RecentActivityStrip';
import { CategoryDonut } from '@/components/charts/CategoryDonut';
import { SpeciesTable } from '@/components/tables/SpeciesTable';
import { ExpandableMapPanel } from '@/components/map/ExpandableMapPanel';
import CountyChoroplethPanel from '@/components/map/CountyChoroplethPanel';

export const revalidate = 21600;

interface PageProps {
  searchParams?: { source?: string };
}

export default async function OverviewPage({ searchParams }: PageProps) {
  const { merged, meta } = await getMergedRecords();
  const source = searchParams?.source ?? 'all';
  const records = applyFilters(merged, { source });

  const metrics = computeOverviewMetrics(records);
  const ordersTop = countBy(records, 'order').slice(0, 30);
  const yearData = recordsByYear(records);
  const seasonality = seasonalityForTopTaxa(records, 'order', 10);
  const speciesRows = buildSpeciesRows(records);
  const activity = recentActivity(records);
  const cumulative = cumulativeRecordsByMonth(records);
  const countyEntries = Array.from(recordsByCounty(records).entries());
  const inatQuality = qualityGradeBreakdown(records);
  const dwcaBasis = basisOfRecordBreakdown(records);

  // Indiana bounding box — used by both overview maps so Leaflet fits the
  // state to whatever container aspect ratio the iframe hands us.
  const INDIANA_BOUNDS = [
    [37.77, -88.1],
    [41.77, -84.78],
  ] as [[number, number], [number, number]];

  return (
    <div className="space-y-4">
      <SourceErrorBanner inatError={meta.sourceErrors.inat} dwcaError={meta.sourceErrors.dwca} />

      <StatCardGrid>
        <StatCard label="Records" value={metrics.total.toLocaleString()} highlight />
        <StatCard label="Species" value={metrics.speciesCount.toLocaleString()} />
        <StatCard label="Genera" value={metrics.generaCount.toLocaleString()} />
        <StatCard label="Families" value={metrics.familyCount.toLocaleString()} />
        <StatCard label="Orders" value={metrics.orderCount.toLocaleString()} />
        <StatCard
          label="Years"
          value={
            metrics.yearMin !== undefined && metrics.yearMax !== undefined
              ? `${metrics.yearMin}–${metrics.yearMax}`
              : '—'
          }
        />
        <StatCard label="iNat" value={metrics.inat.toLocaleString()} />
        <StatCard label="INDD" value={metrics.dwca.toLocaleString()} />
      </StatCardGrid>

      <Panel title="Recent Activity" description="Records dated in the trailing rolling windows; sparkline shows the last 90 days.">
        <RecentActivityStrip data={activity} />
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Occurrences" description="Markers colored by order. Expand for a full-screen view.">
          <ExpandableMapPanel records={records} colorBy="order" height={440} bounds={INDIANA_BOUNDS} />
        </Panel>
        <Panel title="Records by County" description="Indiana counties shaded by record density (log scale).">
          <CountyChoroplethPanel counties={countyEntries} height={440} bounds={INDIANA_BOUNDS} />
        </Panel>
      </div>

      <Panel title="Cumulative Records Over Time" description="Running total per month, stacked by source. Shows dataset growth.">
        <CumulativeRecordsChart data={cumulative} />
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Records by Order" description="Click a bar to drill into an order.">
          <RecordsByTaxonChart data={ordersTop} hrefBase="/order" height={Math.max(300, ordersTop.length * 18 + 40)} />
        </Panel>
        <Panel title="Seasonality" description="Monthly counts, top 10 orders.">
          <SeasonalityChart data={seasonality.combined} taxa={seasonality.series.map((s) => s.taxon)} />
        </Panel>
      </div>

      <Panel title="Records by Year" description="Stacked yearly counts by source.">
        <RecordsOverTimeChart data={yearData} />
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="iNaturalist Quality Grade" description="Research-grade vs. needs-ID vs. casual for the iNat portion.">
          <CategoryDonut data={inatQuality} emptyMessage="No iNat records in this view" />
        </Panel>
        <Panel title="INDD Basis of Record" description="Specimen vs. observation classes for the INDD portion.">
          <CategoryDonut data={dwcaBasis} emptyMessage="No INDD records in this view" />
        </Panel>
      </div>

      <Panel title="Top Species" description="Sortable, filterable. Click a name for the species page.">
        <SpeciesTable rows={speciesRows} />
      </Panel>
    </div>
  );
}
