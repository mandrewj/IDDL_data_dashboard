'use client';
import dynamic from 'next/dynamic';
import type { CountyCount } from '@/lib/data/aggregations';
import { SkeletonPanel } from '@/components/ui/SkeletonPanel';

const CountyChoropleth = dynamic(() => import('./CountyChoropleth'), {
  ssr: false,
  loading: () => <SkeletonPanel height={380} />,
});

export default function CountyChoroplethPanel(props: {
  counties: [string, CountyCount][];
  height?: number;
  center?: [number, number];
  zoom?: number;
}) {
  return <CountyChoropleth {...props} />;
}
