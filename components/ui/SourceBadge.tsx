import { cn } from '@/lib/utils/cn';

export function SourceBadge({ source, size = 'sm' }: { source: 'inat' | 'dwca' | 'both'; size?: 'sm' | 'md' }) {
  const styles = {
    inat: 'bg-forest-50 text-forest-800 border-forest-200',
    dwca: 'bg-cream-200 text-bark-700 border-cream-300',
    both: 'bg-ochre-400/15 text-ochre-600 border-ochre-400/30',
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
