import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="nature-card p-8 text-center">
      <h2 className="text-xl font-bold text-forest-800">Not found</h2>
      <p className="mt-2 text-sm text-moss-600">
        We couldn&apos;t find a taxon at that path. It may have no records in the current dataset.
      </p>
      <Link
        href="/"
        className="mt-4 inline-block rounded-md bg-forest-600 px-4 py-2 text-sm font-medium text-cream-50 hover:bg-forest-700"
      >
        Back to overview
      </Link>
    </div>
  );
}
