import { cn } from '@/lib/utils/cn';

export function LoadingSpinner({ className, label }: { className?: string; label?: string }) {
  return (
    <div className={cn('flex items-center gap-2 text-slate-500', className)}>
      <span
        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-accent"
        aria-hidden
      />
      <span className="text-sm">{label ?? 'Loading…'}</span>
    </div>
  );
}
