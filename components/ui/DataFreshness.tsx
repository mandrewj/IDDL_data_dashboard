import { getSnapshot } from '@/lib/data/records';

// The dashboard serves a weekly snapshot rather than live data, so say plainly
// how old the numbers on screen are.
export async function DataFreshness() {
  // A missing or broken snapshot already surfaces on the page itself; don't
  // take the footer down with it.
  const snapshot = await getSnapshot().catch(() => null);
  if (!snapshot) return null;

  const date = new Date(snapshot.generatedAt);
  if (Number.isNaN(date.getTime())) return null;

  return (
    <p className="mt-1">
      Data last refreshed{' '}
      <time dateTime={snapshot.generatedAt}>
        {date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'UTC',
        })}
      </time>
      . Both sources are re-pulled automatically every Monday.
    </p>
  );
}
