import {
  GBIF_DATASET_URL,
  GBIF_LITERATURE_URL,
  citationsByMonth,
  getGbifMetrics,
  withCumulative,
} from '@/lib/data/gbifMetrics';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Panel } from '@/components/ui/Panel';
import { StatCard } from '@/components/ui/StatCard';
import { MonthlyCumulativeChart } from '@/components/charts/MonthlyCumulativeChart';
import { CitationsTable } from '@/components/tables/CitationsTable';

export const metadata = { title: 'Data Use on GBIF · IDDL Biodiversity Data' };

// How the INDD specimen dataset is used once it reaches GBIF. Everything here
// comes from data/gbif-metrics.json, refreshed in the same weekly job as the
// occurrence snapshot — no GBIF calls at request time.
export default async function ImpactPage() {
  const metrics = await getGbifMetrics();

  if (!metrics) {
    return (
      <div className="space-y-4">
        <Breadcrumb items={[{ label: 'Dashboard', href: '/' }, { label: 'Data use on GBIF' }]} />
        <Panel>
          <p className="text-sm text-moss-600">
            GBIF usage metrics haven&apos;t been generated yet. They are pulled with the weekly data refresh.
          </p>
        </Panel>
      </div>
    );
  }

  const { downloads, citations } = metrics;
  const eventsSeries = withCumulative(downloads.monthly.map((m) => ({ month: m.month, value: m.events })));
  const recordsSeries = withCumulative(downloads.monthly.map((m) => ({ month: m.month, value: m.records })));
  const citationSeries = citationsByMonth(metrics);
  const peerReviewed = citations.filter((c) => c.peerReviewed).length;
  const since = downloads.firstDownload
    ? new Date(downloads.firstDownload).toLocaleDateString('en-US', { year: 'numeric', month: 'short', timeZone: 'UTC' })
    : undefined;
  const avgPerDownload = downloads.totalEvents ? Math.round(downloads.totalRecords / downloads.totalEvents) : 0;

  const extLink = 'text-forest-600 hover:text-forest-800 hover:underline';

  return (
    <div className="space-y-4">
      <Breadcrumb items={[{ label: 'Dashboard', href: '/' }, { label: 'Data use on GBIF' }]} />

      <p className="text-sm">
        The INDD specimen collection is published to{' '}
        <a href={GBIF_DATASET_URL} target="_blank" rel="noopener noreferrer" className={extLink}>
          GBIF
        </a>{' '}
        through ecdysis.org
        {metrics.datasetDoi && (
          <>
            {' '}
            (
            <a href={`https://doi.org/${metrics.datasetDoi}`} target="_blank" rel="noopener noreferrer" className={extLink}>
              doi:{metrics.datasetDoi}
            </a>
            )
          </>
        )}
        . These charts show how often researchers download it and where it has been cited.
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard label="Download events" value={downloads.totalEvents.toLocaleString()} hint={since ? `since ${since}` : undefined} highlight />
        <StatCard label="Records downloaded" value={downloads.totalRecords.toLocaleString()} hint={`~${avgPerDownload.toLocaleString()} per download`} />
        <StatCard label="Citations" value={citations.length.toLocaleString()} hint={`${peerReviewed} peer reviewed`} />
        <StatCard
          label="Last 12 months"
          value={eventsSeries.slice(-12).reduce((n, p) => n + p.value, 0).toLocaleString()}
          hint="download events"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel
          title="Download Events"
          description="GBIF downloads per month that included at least one INDD record, with the running total. The current month is partial."
        >
          <MonthlyCumulativeChart data={eventsSeries} valueLabel="Downloads" cumulativeLabel="Total downloads" />
        </Panel>
        <Panel
          title="Records Downloaded"
          description="INDD records contained in those downloads per month, with the running total. The current month is partial."
        >
          <MonthlyCumulativeChart data={recordsSeries} valueLabel="Records" cumulativeLabel="Total records" />
        </Panel>
      </div>

      <Panel title="Citations Over Time" description="Publications GBIF has linked to this dataset, by publication month, with the running total.">
        <MonthlyCumulativeChart data={citationSeries} valueLabel="Citations" cumulativeLabel="Total citations" step />
      </Panel>

      <Panel
        title="Citing Publications"
        description="As tracked by GBIF's literature index."
        actions={
          <a href={GBIF_LITERATURE_URL} target="_blank" rel="noopener noreferrer" className={`whitespace-nowrap text-xs ${extLink}`}>
            View on GBIF ↗
          </a>
        }
      >
        <CitationsTable citations={citations} />
      </Panel>

      <p className="text-[11px] text-moss-600">
        Download counts match GBIF&apos;s and include every request, whatever its outcome. GBIF usage last pulled{' '}
        <time dateTime={metrics.generatedAt}>
          {new Date(metrics.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })}
        </time>
        .
      </p>
    </div>
  );
}
