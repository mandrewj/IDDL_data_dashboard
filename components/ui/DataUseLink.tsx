'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Toolbar shortcut to /impact. Plain <Link> so it stays inside the
// insectid.org iframe. Hidden on /impact itself, which has its own breadcrumb.
export function DataUseLink() {
  const pathname = usePathname();
  if (pathname === '/impact') return null;
  return (
    <Link
      href="/impact"
      className="inline-flex items-center gap-1 rounded-md border border-forest-200 bg-cream-50 px-3.5 py-1.5 text-sm font-bold text-forest-600 shadow-leaf transition-colors hover:bg-cream-200 hover:text-forest-800"
    >
      Data use on GBIF →
    </Link>
  );
}
