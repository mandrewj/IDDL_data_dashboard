import type { Metadata } from 'next';
import { Lato } from 'next/font/google';
import './globals.css';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import { Analytics } from '@vercel/analytics/next';
import { SourceToggle } from '@/components/ui/SourceToggle';

const lato = Lato({
  subsets: ['latin'],
  weight: ['300', '400', '700', '900'],
  display: 'swap',
  variable: '--font-lato',
});

export const metadata: Metadata = {
  title: 'IDDL Biodiversity Data',
  description:
    'Insect occurrence data from the Insect Diversity and Diagnostics Lab at Purdue, combining iNaturalist observations and INDD specimen records.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={lato.variable}>
      <body className="min-h-screen bg-field-paper font-sans text-bark-600 antialiased">
        <header className="border-b border-forest-100 bg-cream-50/70 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-start gap-4">
              <a href="https://insectid.org" aria-label="InsectID — insectid.org">
                <Image
                  src="/insectID-brand.png"
                  alt="InsectID"
                  width={1094}
                  height={474}
                  priority
                  className="h-12 w-auto shrink-0 sm:h-14"
                />
              </a>
              <Link href="/" className="block">
                <p className="text-[11px] uppercase tracking-[0.2em] text-moss-600">
                  Biodiversity Data · Insect Diversity and Diagnostics Lab
                </p>
                <h1 className="mt-1 text-3xl font-black tracking-tight text-forest-800 sm:text-4xl">
                  Insect Records Generated Through IDDL
                </h1>
              </Link>
            </div>
            <Suspense fallback={null}>
              <SourceToggle />
            </Suspense>
          </div>
          <div className="botanical-divider" aria-hidden />
        </header>

        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>

        <footer className="mt-10 border-t border-cream-300 bg-cream-50">
          <div className="mx-auto max-w-7xl px-6 py-6 text-xs text-moss-600">
            <p>
              iNaturalist data from Project #275094 —{' '}
              <a
                href="https://www.inaturalist.org/projects/275094"
                target="_blank"
                rel="noopener noreferrer"
                className="text-forest-600 hover:text-forest-800 hover:underline"
              >
                iNaturalist.org
              </a>
              .
            </p>
            <p className="mt-1">
              INDD specimen data from the IDDL collection via{' '}
              <a
                href="https://ecdysis.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-forest-600 hover:text-forest-800 hover:underline"
              >
                ecdysis.org
              </a>
              .
            </p>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
