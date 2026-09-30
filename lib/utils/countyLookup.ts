import type { FeatureCollection, MultiPolygon, Polygon, Position } from 'geojson';
import { OccurrenceRecord } from '@/lib/types';
import { isValidCoord } from '@/lib/utils/geo';

// Point-in-polygon county assignment for the weekly ingest.
//
// iNaturalist observations carry no county field — the only hint is the
// free-text place_guess, which is user-editable and names a county in a
// minority of cases. So scripts/build-data.ts derives county from coordinates
// against the Census 500k cartographic boundaries in
// data/indiana-counties-500k.geojson. Build-time only: nothing here runs while
// serving a request.

/**
 * Points this close (km) outside every county still snap to the nearest one.
 * The 500k boundaries are generalized, so an observation on the Ohio River
 * bank or the Lake Michigan beach can land a few hundred metres outside the
 * polygon even though it is in Indiana.
 */
const EDGE_TOLERANCE_KM = 0.5;

type Ring = Position[];

interface CountyShape {
  name: string;
  /** Each polygon is [outer, ...holes]. */
  polygons: Ring[][];
  bbox: [minLng: number, minLat: number, maxLng: number, maxLat: number];
}

export type CountyLookup = (lat: number, lng: number) => string | undefined;

function ringContains(ring: Ring, lng: number, lat: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function polygonContains(poly: Ring[], lng: number, lat: number): boolean {
  if (!ringContains(poly[0], lng, lat)) return false;
  for (let h = 1; h < poly.length; h++) if (ringContains(poly[h], lng, lat)) return false;
  return true;
}

/** Approximate distance (km) from a point to a ring's nearest edge. Fine at county scale. */
function distanceToRingKm(ring: Ring, lng: number, lat: number): number {
  const kx = 111.32 * Math.cos((lat * Math.PI) / 180);
  const ky = 110.57;
  let best = Infinity;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const ax = (ring[j][0] - lng) * kx;
    const ay = (ring[j][1] - lat) * ky;
    const bx = (ring[i][0] - lng) * kx;
    const by = (ring[i][1] - lat) * ky;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
    const d = Math.hypot(ax + t * dx, ay + t * dy);
    if (d < best) best = d;
  }
  return best;
}

function toShape(name: string, geom: Polygon | MultiPolygon): CountyShape {
  const polygons = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  for (const poly of polygons) {
    for (const [x, y] of poly[0]) {
      if (x < minLng) minLng = x;
      if (x > maxLng) maxLng = x;
      if (y < minLat) minLat = y;
      if (y > maxLat) maxLat = y;
    }
  }
  return { name, polygons, bbox: [minLng, minLat, maxLng, maxLat] };
}

export function createCountyLookup(fc: FeatureCollection): CountyLookup {
  const shapes: CountyShape[] = [];
  for (const f of fc.features) {
    const name = (f.properties as { NAME?: string } | null)?.NAME;
    const g = f.geometry;
    if (!name || !g || (g.type !== 'Polygon' && g.type !== 'MultiPolygon')) continue;
    shapes.push(toShape(name, g));
  }
  if (shapes.length === 0) throw new Error('County boundary file contained no polygons');

  // ~0.5 km of slack in degrees, generous enough for the bbox prefilter.
  const pad = EDGE_TOLERANCE_KM / 80;

  return (lat, lng) => {
    for (const s of shapes) {
      const [x0, y0, x1, y1] = s.bbox;
      if (lng < x0 || lng > x1 || lat < y0 || lat > y1) continue;
      if (s.polygons.some((p) => polygonContains(p, lng, lat))) return s.name;
    }
    let nearest: string | undefined;
    let nearestKm = EDGE_TOLERANCE_KM;
    for (const s of shapes) {
      const [x0, y0, x1, y1] = s.bbox;
      if (lng < x0 - pad || lng > x1 + pad || lat < y0 - pad || lat > y1 + pad) continue;
      for (const p of s.polygons) {
        const d = distanceToRingKm(p[0], lng, lat);
        if (d <= nearestKm) {
          nearestKm = d;
          nearest = s.name;
        }
      }
    }
    return nearest;
  };
}

export interface CountyAssignmentStats {
  assigned: number;
  outsideIndiana: number;
  obscured: number;
  noCoords: number;
  /** DwC-A only: label county kept even though the coordinates fall in a different county. */
  labelDisagrees: number;
}

function sameCounty(a: string, b: string): boolean {
  const k = (s: string) => s.toLowerCase().replace(/\s*county$/, '').replace(/[\s\-.']/g, '');
  return k(a) === k(b);
}

/**
 * Sets `county` (and `stateProvince` when the point is in Indiana) in place.
 *
 * - iNaturalist: county always comes from the coordinates, replacing whatever
 *   place_guess suggested. Obscured observations get no county — their public
 *   point is randomized within a ~20 km cell, so the county would be a guess.
 * - DwC-A: the specimen label's county is authoritative and kept; coordinates
 *   only fill it in when the label left it blank.
 */
export function assignCounties(records: OccurrenceRecord[], lookup: CountyLookup): CountyAssignmentStats {
  const stats: CountyAssignmentStats = { assigned: 0, outsideIndiana: 0, obscured: 0, noCoords: 0, labelDisagrees: 0 };
  for (const r of records) {
    const isInat = r.source === 'inat';
    if (isInat) r.county = undefined;
    if (!isValidCoord(r.lat, r.lng)) {
      stats.noCoords++;
      continue;
    }
    if (isInat && r.coordinatesObscured) {
      stats.obscured++;
      continue;
    }
    const county = lookup(r.lat as number, r.lng as number);
    if (!county) {
      stats.outsideIndiana++;
      continue;
    }
    if (isInat) {
      r.county = county;
      r.stateProvince = 'Indiana';
      stats.assigned++;
    } else if (!r.county) {
      // Don't overrule a label that puts the specimen in another state.
      if (r.stateProvince && !/^(indiana|in)$/i.test(r.stateProvince.trim())) continue;
      r.county = county;
      r.stateProvince = 'Indiana';
      stats.assigned++;
    } else if (!sameCounty(r.county, county)) {
      stats.labelDisagrees++;
    }
  }
  return stats;
}
