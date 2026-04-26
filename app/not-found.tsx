import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Not found</h2>
      <p className="mt-2 text-sm text-slate-600">
        We couldn&apos;t find a taxon at that path. It may have no records in the current dataset.
      </p>
      <Link href="/" className="mt-4 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark">
        Back to overview
      </Link>
    </div>
  );
}
