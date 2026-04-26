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
        'rounded-lg border bg-white px-4 py-3 shadow-sm transition-colors',
        highlight ? 'border-accent ring-1 ring-accent/30' : 'border-slate-200',
        className
      )}
    >
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
      {hint ? <div className="mt-0.5 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}
