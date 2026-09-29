import { getSnapshot } from '@/lib/data/records';

// The dashboard serves a weekly snapshot rather than live data, so say plainly
// how old the numbers on screen are. `inline` renders as a bare span for use
// inside a paragraph (compact footer); default is a standalone paragraph.
export async function DataFreshness({ inline = false }: { inline?: boolean } = {}) {
  // A missing or broken snapshot already surfaces on the page itself; don't
  // take the footer down with it.
  const snapshot = await getSnapshot().catch(() => null);
  if (!snapshot) return null;

  const date = new Date(snapshot.generatedAt);
  if (Number.isNaN(date.getTime())) return null;

  const formatted = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

  if (inline) {
    return (
      <>
        Refreshed <time dateTime={snapshot.generatedAt}>{formatted}</time> (weekly).
      </>
    );
  }

  return (
    <p className="mt-1">
      Data last refreshed{' '}
      <time dateTime={snapshot.generatedAt}>{formatted}</time>. Both sources are
      re-pulled automatically every Monday.
    </p>
  );
}
