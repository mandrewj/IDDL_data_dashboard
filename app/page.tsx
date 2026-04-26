import { getMergedRecords } from '@/lib/data/records';
import { applyFilters } from '@/lib/parsers/recordMerger';
import {
  buildSpeciesRows,
  computeOverviewMetrics,
  countBy,
  recordsByYear,
  seasonalityForTopTaxa,
} from '@/lib/data/aggregations';
import { Panel } from '@/components/ui/Panel';
import { StatCard } from '@/components/ui/StatCard';
import { StatCardGrid } from '@/components/ui/StatCardGrid';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { SourceErrorBanner } from '@/components/ui/SourceErrorBanner';
import { RecordsByTaxonChart } from '@/components/charts/RecordsByTaxonChart';
import { SeasonalityChart } from '@/components/charts/SeasonalityChart';
import { RecordsOverTimeChart } from '@/components/charts/RecordsOverTimeChart';
import { SpeciesTable } from '@/components/tables/SpeciesTable';
import MapPanel from '@/components/map/MapPanel';

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

  return (
    <div className="space-y-6">
      <div className="-mt-2 mb-2 rounded-lg bg-navy-900 px-4 py-3">
        <Breadcrumb items={[{ label: 'All Records' }]} />
      </div>

      <SourceErrorBanner inatError={meta.sourceErrors.inat} dwcaError={meta.sourceErrors.dwca} />

      <Panel title="Summary" description="Overview of all available occurrence records.">
        <StatCardGrid>
          <StatCard label="Total Records" value={metrics.total.toLocaleString()} />
          <StatCard label="Species" value={metrics.speciesCount.toLocaleString()} />
          <StatCard label="Genera" value={metrics.generaCount.toLocaleString()} />
          <StatCard label="Families" value={metrics.familyCount.toLocaleString()} />
          <StatCard label="Orders" value={metrics.orderCount.toLocaleString()} />
          <StatCard
            label="Date Range"
            value={
              metrics.yearMin !== undefined && metrics.yearMax !== undefined
                ? `${metrics.yearMin}–${metrics.yearMax}`
                : '—'
            }
          />
          <StatCard label="iNat Records" value={metrics.inat.toLocaleString()} />
          <StatCard label="INDD Records" value={metrics.dwca.toLocaleString()} />
        </StatCardGrid>
      </Panel>

      <Panel title="Geographic Distribution" description="Indiana map with markers colored by taxonomic order.">
        <MapPanel records={records} colorBy="order" height={500} />
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Records by Order" description="Click a bar to drill into an order.">
          <RecordsByTaxonChart data={ordersTop} hrefBase="/order" height={Math.max(360, ordersTop.length * 22 + 60)} />
        </Panel>
        <Panel title="Seasonality (top orders)" description="Monthly record counts for the most-recorded orders.">
          <SeasonalityChart data={seasonality.combined} taxa={seasonality.series.map((s) => s.taxon)} />
        </Panel>
      </div>

      <Panel title="Records Over Time" description="Stacked yearly counts by source.">
        <RecordsOverTimeChart data={yearData} />
      </Panel>

      <Panel title="Top Species" description="Sortable, filterable species table. Click a name for the species page.">
        <SpeciesTable rows={speciesRows} />
      </Panel>
    </div>
  );
}
