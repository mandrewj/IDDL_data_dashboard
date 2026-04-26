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
import { slugify, speciesSlug } from '@/lib/utils/taxonomy';

export const revalidate = 86400;

interface Props {
  params: { family: string };
  searchParams?: { source?: string };
}

export async function generateStaticParams() {
  try {
    const { merged } = await getMergedRecords();
    const families = countBy(merged, 'family').map((f) => ({ family: slugify(f.name) }));
    return families;
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props) {
  const slug = params.family;
  const label = slug
    .split('-')
    .map((p) => (p.length ? p[0].toUpperCase() + p.slice(1) : p))
    .join(' ');
  return { title: `${label} — IDDL Biodiversity Dashboard` };
}

export default async function FamilyPage({ params, searchParams }: Props) {
  const { merged } = await getMergedRecords();
  const allFamilies = countBy(merged, 'family');
  const matched = allFamilies.find((f) => slugify(f.name) === params.family);
  if (!matched) notFound();
  const familyName = matched.name;

  const source = searchParams?.source ?? 'all';
  const records = applyFilters(merged, { source, family: familyName });
  if (records.length === 0) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg bg-navy-900 px-4 py-3">
          <Breadcrumb items={[{ label: 'All Records', href: '/' }, { label: familyName }]} />
        </div>
        <Panel title={familyName}>
          <p className="text-sm text-slate-500">No records found for this family with the selected source filter.</p>
        </Panel>
      </div>
    );
  }

  const orderName = records.find((r) => r.order)?.order;
  const speciesCounts = countBy(records, 'scientificName').slice(0, 50).map((c) => ({
    ...c,
    name: c.name,
  }));
  // For the chart we want clickable species → /species/<slug>
  const speciesChart = speciesCounts.map((c) => ({ ...c, name: c.name }));

  const speciesRows = buildSpeciesRows(records);
  const seasonality = seasonalityForTopTaxa(records, 'scientificName', 5);

  let yearMin: number | undefined;
  let yearMax: number | undefined;
  const genusSet = new Set<string>();
  const sppSet = new Set<string>();
  for (const r of records) {
    if (r.genus) genusSet.add(r.genus);
    if (r.rank === 'species' && r.scientificName) sppSet.add(r.scientificName);
    if (r.year !== undefined) {
      if (yearMin === undefined || r.year < yearMin) yearMin = r.year;
      if (yearMax === undefined || r.year > yearMax) yearMax = r.year;
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-navy-900 px-4 py-3">
        <Breadcrumb
          items={[
            { label: 'All Records', href: '/' },
            ...(orderName ? [{ label: orderName, href: `/order/${slugify(orderName)}` }] : []),
            { label: familyName },
          ]}
        />
      </div>

      <Panel title={`Family: ${familyName}`}>
        <StatCardGrid>
          <StatCard label="Total Records" value={records.length.toLocaleString()} />
          <StatCard label="Species" value={sppSet.size.toLocaleString()} />
          <StatCard label="Genera" value={genusSet.size.toLocaleString()} />
          <StatCard
            label="Date Range"
            value={yearMin !== undefined && yearMax !== undefined ? `${yearMin}–${yearMax}` : '—'}
          />
        </StatCardGrid>
      </Panel>

      <Panel title="Geographic Distribution" description="Markers colored by species.">
        <MapPanel records={records} colorBy="scientificName" height={460} />
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Records by Species">
          <RecordsByTaxonChart
            data={speciesChart}
            hrefBase="/species"
            height={Math.max(320, speciesChart.length * 22 + 60)}
          />
        </Panel>
        <Panel title="Seasonality (top species)">
          <SeasonalityChart data={seasonality.combined} taxa={seasonality.series.map((s) => s.taxon)} />
        </Panel>
      </div>

      <Panel title="All Species" description={`Species recorded within ${familyName}.`}>
        <SpeciesTable rows={speciesRows} hideTaxonomy />
      </Panel>
    </div>
  );
}
