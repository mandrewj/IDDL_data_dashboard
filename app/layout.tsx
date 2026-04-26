import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import { Suspense } from 'react';
import { SourceToggle } from '@/components/ui/SourceToggle';

export const metadata: Metadata = {
  title: 'IDDL Biodiversity Dashboard',
  description:
    'Insect occurrence data from the Insect Diversity and Diagnostics Lab at Purdue, combining iNaturalist observations and specimen records.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <header className="bg-navy-900 text-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="flex items-center gap-3">
              <div
                aria-hidden
                className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-700/50 text-xs font-bold tracking-wider text-slate-300"
              >
                IDDL
              </div>
              <div>
                <div className="text-sm font-semibold leading-tight">IDDL Biodiversity Dashboard</div>
                <div className="text-[11px] text-slate-400">Insect Diversity & Diagnostics Lab · Purdue University</div>
              </div>
            </Link>
            <Suspense fallback={null}>
              <SourceToggle />
            </Suspense>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
        <footer className="mt-10 border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-6 text-xs text-slate-500">
            <p>
              iNaturalist data from Project #275094 —{' '}
              <a
                href="https://www.inaturalist.org/projects/275094"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                iNaturalist.org
              </a>
              .
            </p>
            <p className="mt-1">
              Specimen data from the IDDL collection via{' '}
              <a href="https://ecdysis.org" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                ecdysis.org
              </a>
              .
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
