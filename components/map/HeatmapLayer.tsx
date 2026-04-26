'use client';
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

interface Props {
  points: Array<[number, number, number?]>;
  radius?: number;
  blur?: number;
  maxZoom?: number;
}

export default function HeatmapLayer({ points, radius = 18, blur = 24, maxZoom = 12 }: Props) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    // @ts-ignore — leaflet.heat extends L with heatLayer at runtime
    const layer = (L as any).heatLayer(points, { radius, blur, maxZoom });
    layer.addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, points, radius, blur, maxZoom]);
  return null;
}
