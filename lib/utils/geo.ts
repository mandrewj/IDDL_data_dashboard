export function roundLatLng(v: number | undefined, decimals = 3): number | undefined {
  if (v === undefined || v === null || Number.isNaN(v)) return undefined;
  const f = Math.pow(10, decimals);
  return Math.round(v * f) / f;
}

export function isValidCoord(lat?: number, lng?: number): boolean {
  if (lat === undefined || lng === undefined) return false;
  if (Number.isNaN(lat) || Number.isNaN(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  if (lat === 0 && lng === 0) return false;
  return true;
}

export function parseDateParts(raw: string | undefined): {
  iso?: string;
  year?: number;
  month?: number;
} {
  if (!raw) return {};
  const trimmed = String(raw).trim();
  if (!trimmed) return {};
  // Handle DwC ranges like "2021-06-01/2021-06-05" — take leading date
  const lead = trimmed.split('/')[0].split(' ')[0];

  // Try strict patterns first
  const ymd = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(lead);
  if (ymd) {
    const y = +ymd[1];
    const m = +ymd[2];
    const d = +ymd[3];
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return { iso: `${y.toString().padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, year: y, month: m };
    }
  }
  const ym = /^(\d{4})-(\d{1,2})$/.exec(lead);
  if (ym) {
    const y = +ym[1];
    const m = +ym[2];
    if (m >= 1 && m <= 12) return { iso: `${y}-${String(m).padStart(2, '0')}`, year: y, month: m };
  }
  const yOnly = /^(\d{4})$/.exec(lead);
  if (yOnly) return { year: +yOnly[1] };

  // Fallback: try Date parser (handles "Jun 5, 2021" etc.)
  const d = new Date(lead);
  if (!Number.isNaN(d.getTime())) {
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    return { iso: d.toISOString().slice(0, 10), year: y, month: m };
  }
  return {};
}
