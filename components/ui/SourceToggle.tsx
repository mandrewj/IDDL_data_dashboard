'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { cn } from '@/lib/utils/cn';

type SourceValue = 'all' | 'inat' | 'dwca';

const OPTIONS: { value: SourceValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'inat', label: 'iNaturalist' },
  { value: 'dwca', label: 'INDD' },
];

const NO_SOURCE_FILTER = new Set(['/impact']);

export function SourceToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = (params.get('source') as SourceValue) || 'all';

  const setSource = useCallback(
    (next: SourceValue) => {
      const newParams = new URLSearchParams(params.toString());
      if (next === 'all') newParams.delete('source');
      else newParams.set('source', next);
      const qs = newParams.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router]
  );

  // Pages that don't read occurrence records have nothing to filter.
  if (NO_SOURCE_FILTER.has(pathname)) return null;

  return (
    <div
      role="radiogroup"
      aria-label="Data source"
      className="ml-auto inline-flex overflow-hidden rounded-md border border-forest-200 bg-cream-50 text-sm shadow-leaf"
    >
      {OPTIONS.map((o) => {
        const active = current === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setSource(o.value)}
            className={cn(
              'px-3.5 py-1.5 transition-colors',
              active
                ? 'bg-forest-600 font-medium text-cream-50'
                : 'text-forest-600 hover:bg-cream-200'
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
