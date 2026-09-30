import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { Suspense } from 'react';
import { Analytics } from '@vercel/analytics/next';
import { SourceToggle } from '@/components/ui/SourceToggle';
import { DataFreshness } from '@/components/ui/DataFreshness';
import { DataUseLink } from '@/components/ui/DataUseLink';

// Bundled TTFs live in public/fonts/. Local fonts sidestep Next's 3s Google
// Fonts timeout, which flakes on slow connections and blocks compilation.
const lato = localFont({
  src: [
    { path: '../public/fonts/lato-300.ttf', weight: '300', style: 'normal' },
    { path: '../public/fonts/lato-400.ttf', weight: '400', style: 'normal' },
    { path: '../public/fonts/lato-700.ttf', weight: '700', style: 'normal' },
    { path: '../public/fonts/lato-900.ttf', weight: '900', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-lato',
});

export const metadata: Metadata = {
  title: 'IDDL Biodiversity Data',
  description:
    'Insect occurrence data from the Insect Diversity and Diagnostics Lab at Purdue, combining iNaturalist observations and INDD specimen records.',
};

// Rendered inside an iframe on insectid.org/data-generation, which already
// carries the site logo and page title — the layout here is intentionally
// chromeless. A slim toolbar holds the source toggle; a one-line footer
// carries attribution + snapshot date.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={lato.variable}>
      <body className="min-h-screen bg-field-paper font-sans text-bark-600 antialiased">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 pt-3">
          <DataUseLink />
          {/* ml-auto keeps the toggle right-aligned when the link is hidden. */}
          <Suspense fallback={null}>
            <SourceToggle />
          </Suspense>
        </div>

        <main className="mx-auto max-w-7xl px-4 py-4">{children}</main>

        <footer className="mt-6 border-t border-cream-300 bg-cream-50">
          <div className="mx-auto max-w-7xl px-4 py-3 text-[11px] text-moss-600">
            <p className="leading-relaxed">
              Sources:{' '}
              <a
                href="https://www.inaturalist.org/projects/insects-of-indiana-purdue-extension-entomology"
                target="_blank"
                rel="noopener noreferrer"
                className="text-forest-600 hover:text-forest-800 hover:underline"
              >
                iNaturalist project #275094
              </a>{' '}
              ·{' '}
              <a
                href="https://ecdysis.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-forest-600 hover:text-forest-800 hover:underline"
              >
                INDD via ecdysis.org
              </a>
              . <DataFreshness inline />
            </p>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
