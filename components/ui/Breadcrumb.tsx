import Link from 'next/link';
import { Fragment } from 'react';

export interface Crumb {
  label: string;
  href?: string;
  italic?: boolean;
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-slate-300">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((c, i) => (
          <Fragment key={i}>
            {i > 0 && <span className="text-slate-500">/</span>}
            <li className={c.italic ? 'italic' : ''}>
              {c.href ? (
                <Link href={c.href} className="text-slate-200 hover:text-accent-light underline-offset-2 hover:underline">
                  {c.label}
                </Link>
              ) : (
                <span className="text-white">{c.label}</span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
