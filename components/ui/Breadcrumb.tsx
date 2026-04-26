import Link from 'next/link';
import { Fragment } from 'react';

export interface Crumb {
  label: string;
  href?: string;
  italic?: boolean;
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-moss-600">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((c, i) => (
          <Fragment key={i}>
            {i > 0 && <span className="text-moss-300">/</span>}
            <li className={c.italic ? 'italic' : ''}>
              {c.href ? (
                <Link
                  href={c.href}
                  className="text-forest-700 underline-offset-2 hover:text-forest-800 hover:underline"
                >
                  {c.label}
                </Link>
              ) : (
                <span className="font-medium text-forest-800">{c.label}</span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
