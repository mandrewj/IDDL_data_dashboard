import { notFound } from 'next/navigation';
import { getMergedRecords } from '@/lib/data/records';
import { applyFilters } from '@/lib/parsers/recordMerger';
import {
  buildSpeciesRows,
  countBy,
  seasonalityForTopTaxa,
} from '@/lib/data/aggregations';
import { Panel } from '@/components/ui/Panel';
import { StatCard } from '@/components/ui/StatCard';
import { StatCardGrid } from '@/components/ui/StatCardGrid';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { RecordsByTaxonChart } from '@/components/charts/RecordsByTaxonChart';
import { SeasonalityChart } from '@/components/charts/SeasonalityChart';
import { SpeciesTable } from '@/components/tables/SpeciesTable';
import MapPanel from '@/components/map/MapPanel';
import { slugify } from '@/lib/utils/taxonomy';

export const revalidate = 86400;

interface Props {
  params: { order: string };
  searchParams?: { source?: string };
}

export async function generateStaticParams() {
  try {
    const { merged } = await getMergedRecords();
    const orders = countBy(merged, 'order').map((o) => ({ order: slugify(o.name) }));
    return orders;
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props) {
  return { title: `${decodeOrder(params.order)} — IDDL Biodiversity Dashboard` };
}

function decodeOrder(slug: string): string {
  return slug
    .split('-')
    .map((p) => (p.length ? p[0].toUpperCase() + p.slice(1) : p))
    .join(' ');
}

export default async function OrderPage({ params, searchParams }: Props) {
  const { merged, meta } = await getMergedRecords();
  const allOrders = countBy(merged, 'order');
  const matched = allOrders.find((o) => slugify(o.name) === params.order);
  if (!matched) notFound();
  const orderName = matched.name;

  const source = searchParams?.source ?? 'all';
  const records = applyFilters(merged, { source, order: orderName });
  if (records.length === 0) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg bg-navy-900 px-4 py-3">
          <Breadcrumb items={[{ label: 'All Records', href: '/' }, { label: orderName }]} />
        </div>
        <Panel title={orderName}>
          <p className="text-sm text-slate-500">No records found for this order with the selected source filter.</p>
        </Panel>
      </div>
    );
  }

  const families = countBy(records, 'family').slice(0, 30);
  const speciesRows = buildSpeciesRows(records);
  const seasonality = seasonalityForTopTaxa(records, 'family', 5);

  let yearMin: number | undefined;
  let yearMax: number | undefined;
  const speciesSet = new Set<string>();
  for (const r of records) {
    if (r.rank === 'species' && r.scientificName) speciesSet.add(r.scientificName);
    if (r.year !== undefined) {
      if (yearMin === undefined || r.year < yearMin) yearMin = r.year;
      if (yearMax === undefined || r.year > yearMax) yearMax = r.year;
    }
  }
  const pct = meta.total > 0 ? ((records.length / meta.total) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-navy-900 px-4 py-3">
        <Breadcrumb items={[{ label: 'All Records', href: '/' }, { label: orderName }]} />
      </div>

      <Panel title={`Order: ${orderName}`} description="Order-level summary and breakdowns.">
        <StatCardGrid>
          <StatCard label="Total Records" value={records.length.toLocaleString()} />
          <StatCard label="Species" value={speciesSet.size.toLocaleString()} />
          <StatCard label="Families" value={families.length.toLocaleString()} />
          <StatCard
            label="Date Range"
            value={yearMin !== undefined && yearMax !== undefined ? `${yearMin}–${yearMax}` : '—'}
          />
          <StatCard label="% of Dataset" value={`${pct}%`} />
        </StatCardGrid>
      </Panel>

      <Panel title="Geographic Distribution" description="Markers colored by family.">
        <MapPanel records={records} colorBy="family" height={460} />
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Records by Family" description="Click a bar to drill into a family.">
          <RecordsByTaxonChart data={families} hrefBase="/family" height={Math.max(320, families.length * 22 + 60)} />
        </Panel>
        <Panel title="Seasonality (top families)">
          <SeasonalityChart data={seasonality.combined} taxa={seasonality.series.map((s) => s.taxon)} />
        </Panel>
      </div>

      <Panel title="Top Species" description={`Species recorded within ${orderName}.`}>
        <SpeciesTable rows={speciesRows} />
      </Panel>
    </div>
  );
}
