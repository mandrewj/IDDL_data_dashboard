'use client';
import dynamic from 'next/dynamic';
import type { LatLngBoundsLiteral } from 'leaflet';
import { OccurrenceRecord } from '@/lib/types';
import { SkeletonPanel } from '@/components/ui/SkeletonPanel';

const OccurrenceMap = dynamic(() => import('./OccurrenceMap'), {
  ssr: false,
  loading: () => <SkeletonPanel height={460} />,
});

export default function MapPanel(props: {
  records: OccurrenceRecord[];
  colorBy?: 'order' | 'family' | 'scientificName' | 'year';
  height?: number;
  center?: [number, number];
  zoom?: number;
  bounds?: LatLngBoundsLiteral;
  showCounties?: boolean;
}) {
  return <OccurrenceMap {...props} />;
}
