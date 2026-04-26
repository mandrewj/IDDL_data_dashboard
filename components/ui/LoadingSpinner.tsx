import { cn } from '@/lib/utils/cn';

export function LoadingSpinner({ className, label }: { className?: string; label?: string }) {
  return (
    <div className={cn('flex items-center gap-2 text-moss-600', className)}>
      <span
        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-cream-300 border-t-forest-600"
        aria-hidden
      />
      <span className="text-sm">{label ?? 'Loading…'}</span>
    </div>
  );
}
