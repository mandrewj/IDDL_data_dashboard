import { cn } from '@/lib/utils/cn';

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  highlight?: boolean;
  className?: string;
}

export function StatCard({ label, value, hint, highlight, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-cream-50 px-4 py-3 shadow-leaf transition-colors',
        highlight ? 'border-forest-600 ring-1 ring-forest-200' : 'border-cream-300',
        className
      )}
    >
      <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-moss-600">
        {label}
      </div>
      <div className="mt-1 font-serif text-2xl font-semibold tabular-nums text-forest-800">
        {value}
      </div>
      {hint ? <div className="mt-0.5 text-xs text-moss-600">{hint}</div> : null}
    </div>
  );
}
