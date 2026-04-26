import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { SkeletonPanel } from '@/components/ui/SkeletonPanel';

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonPanel height={120} />
      <SkeletonPanel height={460} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SkeletonPanel height={300} />
        <SkeletonPanel height={300} />
      </div>
      <SkeletonPanel height={300} />
      <div className="flex items-center justify-center py-3">
        <LoadingSpinner label="Aggregating occurrence data…" />
      </div>
    </div>
  );
}
