import type { Citation } from '@/lib/data/gbifMetrics';

const TYPE_LABELS: Record<string, string> = {
  JOURNAL: 'Journal article',
  WORKING_PAPER: 'Preprint',
  CONFERENCE_PROCEEDINGS: 'Conference',
  BOOK: 'Book',
  BOOK_SECTION: 'Book chapter',
  THESIS: 'Thesis',
  REPORT: 'Report',
};

function typeLabel(t?: string) {
  if (!t) return '—';
  return TYPE_LABELS[t] ?? t.charAt(0) + t.slice(1).toLowerCase().replace(/_/g, ' ');
}

function formatDate(c: Citation) {
  if (c.published) {
    return new Date(`${c.published}T00:00:00Z`).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  }
  return c.year ? String(c.year) : '—';
}

// Newest first, as GBIF lists them. Titles link out in a new tab: inside the
// insectid.org iframe a same-frame link would load the publisher into the embed.
export function CitationsTable({ citations }: { citations: Citation[] }) {
  if (citations.length === 0) {
    return <div className="flex h-24 items-center justify-center text-sm text-moss-600">No citations recorded yet</div>;
  }
  const th = 'border-b border-cream-300 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-moss-700';
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className={th}>Date</th>
            <th className={th}>Title</th>
            <th className={`${th} hidden md:table-cell`}>Venue</th>
            <th className={`${th} hidden sm:table-cell`}>Type</th>
          </tr>
        </thead>
        <tbody>
          {citations.map((c) => (
            <tr key={c.id} className="border-b border-cream-200 align-top last:border-0">
              <td className="whitespace-nowrap px-3 py-2 tabular-nums text-moss-700">{formatDate(c)}</td>
              <td className="px-3 py-2">
                {c.url ? (
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-forest-600 hover:text-forest-800 hover:underline"
                  >
                    {c.title}
                  </a>
                ) : (
                  <span className="text-bark-600">{c.title}</span>
                )}
                {c.authors && <div className="mt-0.5 text-[11px] text-moss-600">{c.authors}</div>}
              </td>
              <td className="hidden px-3 py-2 italic text-moss-700 md:table-cell">{c.venue ?? '—'}</td>
              <td className="hidden whitespace-nowrap px-3 py-2 text-moss-700 sm:table-cell">
                {typeLabel(c.type)}
                {c.peerReviewed && <span className="ml-1.5 rounded bg-forest-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-forest-700">Peer reviewed</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
