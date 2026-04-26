import { cn } from '@/lib/utils/cn';

export function SourceBadge({ source, size = 'sm' }: { source: 'inat' | 'dwca' | 'both'; size?: 'sm' | 'md' }) {
  const styles = {
    inat: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    dwca: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    both: 'bg-amber-100 text-amber-800 border-amber-200',
  } as const;
  const label = { inat: 'iNat', dwca: 'INDD', both: 'iNat + INDD' }[source];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        styles[source],
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      )}
    >
      {label}
    </span>
  );
}
