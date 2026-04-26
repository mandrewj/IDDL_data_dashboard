import { cn } from '@/lib/utils/cn';

export function SkeletonPanel({ className, height = 240 }: { className?: string; height?: number }) {
  return (
    <div
      className={cn('animate-pulse rounded-lg border border-cream-300 bg-cream-200', className)}
      style={{ height }}
    />
  );
}
