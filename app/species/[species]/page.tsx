import { notFound } from 'next/navigation';
import { getMergedRecords } from '@/lib/data/records';
import { applyFilters } from '@/lib/parsers/recordMerger';
import { Panel } from '@/components/ui/Panel';
import { StatCard } from '@/components/ui/StatCard';
import { StatCardGrid } from '@/components/ui/StatCardGrid';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { SourceBadge } from '@/components/ui/SourceBadge';
import { RecordsOverTimeChart } from '@/components/charts/RecordsOverTimeChart';
import { PhenologySplitChart } from '@/components/charts/PhenologySplitChart';
import { RecordsTable } from '@/components/tables/RecordsTable';
import MapPanel from '@/components/map/MapPanel';
import { slugify, speciesSlug } from '@/lib/utils/taxonomy';
import { recordsByYear } from '@/lib/data/aggregations';

export const revalidate = 86400;

interface Props {
  params: { species: string };
  searchParams?: { source?: string };
}

export async function generateMetadata({ params }: Props) {
  const decoded = params.species
    .split('-')
    .map((p, i) => (i === 0 ? p[0]?.toUpperCase() + p.slice(1) : p))
    .join(' ');
  return { title: `${decoded} — IDDL Biodiversity Dashboard` };
}

export default async function SpeciesPage({ params, searchParams }: Props) {
  const { merged } = await getMergedRecords();
  const slug = params.species;

  // Find any record whose scientificName slugs to this slug.
  const match = merged.find((r) => speciesSlug(r.scientificName) === slug);
  if (!match) notFound();
  const scientificName = match.scientificName;

  const source = searchParams?.source ?? 'all';
  const records = applyFilters(merged, { source, species: scientificName });
  if (records.length === 0) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg bg-navy-900 px-4 py-3">
          <Breadcrumb items={[{ label: 'All Records', href: '/' }, { label: scientificName, italic: true }]} />
        </div>
        <Panel title={scientificName}>
          <p className="text-sm text-slate-500">No records found for this species with the selected source filter.</p>
        </Panel>
      </div>
    );
  }

  // Reference values from the first available record (taxonomy/common name)
  const ref = records.find((r) => r.commonName) ?? records[0];
  const orderName = ref.order;
  const familyName = ref.family;
  const genusName = ref.genus;
  const commonName = records.find((r) => r.commonName)?.commonName;

  const sources = new Set(records.map((r) => r.source));
  const hasInat = sources.has('inat') || sources.has('both');
  const hasDwca = sources.has('dwca') || sources.has('both');

  const dates = records.map((r) => r.date).filter((d): d is string => Boolean(d)).sort();
  const earliest = dates[0];
  const latest = dates[dates.length - 1];
  const counties = new Set(records.map((r) => r.county).filter(Boolean) as string[]);
  const years = new Set(records.map((r) => r.year).filter((y): y is number => y !== undefined));

  const yearData = recordsByYear(records);
  const phenology = (() => {
    const buckets = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, inat: 0, dwca: 0 }));
    for (const r of records) {
      if (r.month === undefined || r.month < 1 || r.month > 12) continue;
      const b = buckets[r.month - 1];
      if (r.source === 'inat' || r.source === 'both') b.inat += 1;
      if (r.source === 'dwca' || r.source === 'both') b.dwca += 1;
    }
    return buckets;
  })();

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-navy-900 px-4 py-3">
        <Breadcrumb
          items={[
            { label: 'All Records', href: '/' },
            ...(orderName ? [{ label: orderName, href: `/order/${slugify(orderName)}` }] : []),
            ...(familyName ? [{ label: familyName, href: `/family/${slugify(familyName)}` }] : []),
            { label: scientificName, italic: true },
          ]}
        />
      </div>

      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold italic text-slate-900">{scientificName}</h1>
            {commonName && <p className="mt-1 text-base text-slate-600">{commonName}</p>}
            <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">
              {[orderName, familyName, genusName].filter(Boolean).join(' › ')}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {hasInat && <SourceBadge source="inat" size="md" />}
            {hasDwca && <SourceBadge source="dwca" size="md" />}
          </div>
        </div>
      </Panel>

      <Panel title="Summary">
        <StatCardGrid>
          <StatCard label="Total Records" value={records.length.toLocaleString()} />
          <StatCard label="Earliest" value={earliest ?? '—'} />
          <StatCard label="Latest" value={latest ?? '—'} />
          <StatCard label="Counties" value={counties.size.toLocaleString()} />
          <StatCard label="Years Recorded" value={years.size.toLocaleString()} />
        </StatCardGrid>
      </Panel>

      <Panel title="Geographic Distribution" description="Markers colored by year (older → newer).">
        <MapPanel records={records} colorBy="year" height={460} />
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Phenology" description="Monthly record counts split by source.">
          <PhenologySplitChart data={phenology} />
        </Panel>
        <Panel title="Records Over Time">
          <RecordsOverTimeChart data={yearData} />
        </Panel>
      </div>

      <Panel title="All Records" description="Every occurrence record contributing to this species page.">
        <RecordsTable records={records} />
      </Panel>
    </div>
  );
}
