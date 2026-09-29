'use client';
import './leafletIconFix';
import 'leaflet/dist/leaflet.css';

import { GeoJSON, MapContainer } from 'react-leaflet';
import { useEffect, useMemo, useState } from 'react';
import type { Feature, FeatureCollection } from 'geojson';
import type { PathOptions } from 'leaflet';
import { normalizeCountyKey, type CountyCount } from '@/lib/data/aggregations';

interface Props {
  counties: [string, CountyCount][];
  height?: number;
  center?: [number, number];
  zoom?: number;
}

// Viridis-ish 6-stop ramp — colorblind-friendly for sequential encoding.
const RAMP = ['#f5f4f0', '#d5e5e2', '#8fc9c9', '#3f9ab7', '#1a5ea4', '#0a2f66'];

// Cache the GeoJSON across mounts; it's ~200KB and doesn't change.
let cachedGeo: FeatureCollection | null = null;

function pickColor(count: number, max: number): string {
  if (count === 0) return RAMP[0];
  if (max <= 1) return RAMP[RAMP.length - 1];
  // log scale so a handful of urban counties don't wash everything else out
  const t = Math.log10(count + 1) / Math.log10(max + 1);
  const idx = Math.min(RAMP.length - 1, Math.max(1, Math.floor(t * (RAMP.length - 1)) + 1));
  return RAMP[idx];
}

export default function CountyChoropleth({
  counties,
  height = 380,
  center = [39.9, -86.3],
  zoom = 6,
}: Props) {
  const [geo, setGeo] = useState<FeatureCollection | null>(cachedGeo);

  useEffect(() => {
    if (cachedGeo) return;
    let mounted = true;
    fetch('/indiana-counties.geojson')
      .then((r) => (r.ok ? r.json() : null))
      .then((j: FeatureCollection | null) => {
        if (!mounted || !j) return;
        cachedGeo = j;
        setGeo(j);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // countyName (lowercased) → CountyCount
  const byName = useMemo(() => {
    const m = new Map<string, CountyCount>();
    for (const [key, c] of counties) m.set(key, c);
    return m;
  }, [counties]);

  const max = useMemo(() => {
    let m = 0;
    for (const [, c] of counties) if (c.count > m) m = c.count;
    return m;
  }, [counties]);

  const styleFor = useMemo(
    () =>
      (feature?: Feature): PathOptions => {
        const rawName = (feature?.properties as { NAME?: string } | undefined)?.NAME ?? '';
        const c = byName.get(normalizeCountyKey(rawName));
        return {
          color: '#5f6360',
          weight: 0.4,
          opacity: 0.6,
          fillColor: pickColor(c?.count ?? 0, max),
          fillOpacity: c?.count ? 0.85 : 0.15,
        };
      },
    [byName, max]
  );

  return (
    <div className="relative" style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%', borderRadius: '0.5rem', background: '#F5F4F0' }}
        scrollWheelZoom={false}
        zoomControl
        attributionControl={false}
      >
        {geo && (
          <GeoJSON
            data={geo}
            style={styleFor}
            onEachFeature={(feature, layer) => {
              const display = (feature.properties as { NAME?: string })?.NAME ?? '';
              const c = byName.get(normalizeCountyKey(display));
              const label = c
                ? `<strong>${display}</strong>: ${c.count.toLocaleString()} record${c.count === 1 ? '' : 's'}<br/><span style="opacity:0.75">${c.inat.toLocaleString()} iNat · ${c.dwca.toLocaleString()} INDD</span>`
                : `<strong>${display}</strong>: no records`;
              layer.bindTooltip(label, { direction: 'top', sticky: true, className: 'county-choropleth-tip' });
            }}
          />
        )}
      </MapContainer>
      <Legend max={max} />
    </div>
  );
}

function Legend({ max }: { max: number }) {
  if (max <= 0) return null;
  const stops = RAMP.slice(1);
  return (
    <div className="pointer-events-none absolute bottom-2 left-2 rounded-md border border-cream-300 bg-cream-50/95 px-2 py-1.5 text-[10px] text-moss-700 shadow-leaf">
      <div className="mb-0.5 uppercase tracking-[0.14em]">records / county</div>
      <div className="flex items-center gap-1">
        {stops.map((c) => (
          <span
            key={c}
            className="h-3 w-4 rounded-sm border border-cream-300"
            style={{ backgroundColor: c }}
          />
        ))}
        <span className="ml-1 text-[10px] tabular-nums">1 – {max.toLocaleString()}</span>
      </div>
    </div>
  );
}
