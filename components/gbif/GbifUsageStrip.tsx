import Link from 'next/link';
import { getGbifMetrics } from '@/lib/data/gbifMetrics';
import { Panel } from '@/components/ui/Panel';
import { StatCard } from '@/components/ui/StatCard';

// Homepage teaser for /impact. A plain <Link> keeps navigation inside the
// insectid.org iframe, same as the order/species drill-downs.
export async function GbifUsageStrip() {
  const metrics = await getGbifMetrics().catch(() => null);
  if (!metrics) return null;
  const { downloads, citations } = metrics;
  return (
    <Panel
      title="Data Use on GBIF"
      description="How often the INDD specimen dataset is downloaded and cited through GBIF."
      actions={
        <Link href="/impact" className="whitespace-nowrap text-xs font-bold text-forest-600 hover:text-forest-800 hover:underline">
          See charts →
        </Link>
      }
    >
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <StatCard label="Download events" value={downloads.totalEvents.toLocaleString()} />
        <StatCard label="Records downloaded" value={downloads.totalRecords.toLocaleString()} />
        <StatCard label="Citations" value={citations.length.toLocaleString()} />
      </div>
    </Panel>
  );
}
