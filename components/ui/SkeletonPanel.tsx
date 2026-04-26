import { cn } from '@/lib/utils/cn';

export function SkeletonPanel({ className, height = 240 }: { className?: string; height?: number }) {
  return (
    <div
      className={cn('animate-pulse rounded-lg border border-slate-200 bg-slate-100', className)}
      style={{ height }}
    />
  );
}
