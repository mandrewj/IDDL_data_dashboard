'use client';
import { useEffect, useState } from 'react';
import { GeoJSON } from 'react-leaflet';

let cached: any | null = null;

export default function CountyOverlay() {
  const [data, setData] = useState<any | null>(cached);
  useEffect(() => {
    if (cached) return;
    let mounted = true;
    fetch('/indiana-counties.geojson')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!mounted) return;
        cached = j;
        setData(j);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);
  if (!data) return null;
  return (
    <GeoJSON
      data={data}
      style={() => ({
        color: '#475569',
        weight: 0.6,
        opacity: 0.7,
        fillColor: '#cbd5e1',
        fillOpacity: 0.05,
      })}
    />
  );
}
