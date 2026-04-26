'use client';
import './leafletIconFix';
import 'leaflet/dist/leaflet.css';

import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { useMemo, useState } from 'react';
import { OccurrenceRecord } from '@/lib/types';
import { colorForKey } from '@/lib/utils/colors';
import HeatmapLayer from './HeatmapLayer';
import CountyOverlay from './CountyOverlay';
import { isValidCoord } from '@/lib/utils/geo';

type ColorMode = 'order' | 'family' | 'scientificName' | 'year';

interface Props {
  records: OccurrenceRecord[];
  colorBy?: ColorMode;
  height?: number;
  center?: [number, number];
  zoom?: number;
  showCounties?: boolean;
}

function colorForRecord(r: OccurrenceRecord, mode: ColorMode, yearMin: number, yearMax: number): string {
  if (mode === 'year' && r.year !== undefined) {
    const t = yearMax === yearMin ? 1 : (r.year - yearMin) / (yearMax - yearMin);
    // Gradient: cool (older) → warm (newer)
    const r1 = Math.round(30 + 200 * t);
    const g1 = Math.round(80 + 80 * (1 - t));
    const b1 = Math.round(180 - 150 * t);
    return `rgb(${r1},${g1},${b1})`;
  }
  const key = (r[mode === 'scientificName' ? 'scientificName' : (mode as 'order' | 'family')] as string | undefined) || 'unknown';
  return colorForKey(key);
}

export default function OccurrenceMap({
  records,
  colorBy = 'order',
  height = 460,
  center = [39.9, -86.3],
  zoom = 7,
  showCounties = true,
}: Props) {
  const [layerMode, setLayerMode] = useState<'points' | 'heat'>('points');

  const georef = useMemo(() => records.filter((r) => isValidCoord(r.lat, r.lng)), [records]);
  const yearRange = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const r of georef) {
      if (r.year !== undefined) {
        if (r.year < min) min = r.year;
        if (r.year > max) max = r.year;
      }
    }
    return { min: Number.isFinite(min) ? min : 0, max: Number.isFinite(max) ? max : 0 };
  }, [georef]);

  const heatPoints = useMemo<Array<[number, number, number?]>>(
    () => georef.map((r) => [r.lat as number, r.lng as number, 0.6]),
    [georef]
  );

  return (
    <div className="relative" style={{ height }}>
      <div className="absolute right-2 top-2 z-[1000] inline-flex overflow-hidden rounded-md border border-forest-200 bg-cream-50 text-xs shadow-leaf">
        <button
          type="button"
          onClick={() => setLayerMode('points')}
          className={
            'px-2.5 py-1 transition-colors ' +
            (layerMode === 'points' ? 'bg-forest-600 font-medium text-cream-50' : 'text-forest-600 hover:bg-cream-200')
          }
        >
          Points
        </button>
        <button
          type="button"
          onClick={() => setLayerMode('heat')}
          className={
            'px-2.5 py-1 transition-colors ' +
            (layerMode === 'heat' ? 'bg-forest-600 font-medium text-cream-50' : 'text-forest-600 hover:bg-cream-200')
          }
        >
          Heatmap
        </button>
      </div>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {showCounties && <CountyOverlay />}
        {layerMode === 'heat' && heatPoints.length > 0 && <HeatmapLayer points={heatPoints} />}
        {layerMode === 'points' && (
          <MarkerClusterGroup chunkedLoading maxClusterRadius={45} disableClusteringAtZoom={11}>
            {georef.map((r) => (
              <CircleMarker
                key={r.id}
                center={[r.lat as number, r.lng as number]}
                radius={5}
                pathOptions={{
                  color: colorForRecord(r, colorBy, yearRange.min, yearRange.max),
                  fillColor: colorForRecord(r, colorBy, yearRange.min, yearRange.max),
                  fillOpacity: 0.7,
                  weight: 1,
                }}
              >
                <Popup>
                  <div className="text-xs leading-snug">
                    <div className="font-semibold italic">{r.scientificName}</div>
                    {r.commonName && <div className="text-moss-600">{r.commonName}</div>}
                    <div className="mt-1 text-moss-700">
                      {r.order && <span>{r.order}</span>}
                      {r.family && <span> › {r.family}</span>}
                    </div>
                    {r.date && <div className="mt-1 text-bark-500">Date: {r.date}</div>}
                    {r.county && <div className="text-bark-500">County: {r.county}</div>}
                    <div className="mt-1 text-moss-600">Source: {r.source === 'inat' ? 'iNaturalist' : r.source === 'dwca' ? 'INDD' : 'iNat + INDD'}</div>
                    {r.externalUrl && (
                      <a href={r.externalUrl} target="_blank" rel="noopener noreferrer" className="text-forest-600 hover:text-forest-800 hover:underline">
                        View on iNaturalist →
                      </a>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MarkerClusterGroup>
        )}
      </MapContainer>
    </div>
  );
}
