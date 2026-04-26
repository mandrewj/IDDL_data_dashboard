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

  return (
    <div
      role="radiogroup"
      aria-label="Data source"
      className="inline-flex rounded-full border border-slate-200 bg-white p-0.5 text-sm shadow-sm"
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
              'rounded-full px-3.5 py-1.5 transition-colors',
              active
                ? 'bg-accent text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-100'
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
