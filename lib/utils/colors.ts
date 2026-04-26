// Taxon-encoding palette. Anchored on the Okabe-Ito colorblind-safe set so
// chart legends and map markers stay legible without red/green-only contrast.
// Extended with a few neutral tones to cover ~20 distinct taxa without
// repeating the most-saturated hues too quickly.
const PALETTE = [
  '#0072B2', // OK blue
  '#E69F00', // OK orange
  '#009E73', // OK green
  '#CC79A7', // OK purple
  '#56B4E9', // OK sky blue
  '#D55E00', // OK vermillion
  '#F0E442', // OK yellow
  '#000000', // OK black
  '#116dff', // brand blue
  '#1F95B8', // ochre/teal
  '#5f6360', // moss-600
  '#0A4FBE', // forest-700
  '#4A4F50', // moss-700
  '#7AA5FF', // forest-300
  '#3FB6D8', // ochre-400
  '#A5A5A5', // bark-300
  '#0E7693', // ochre-600
  '#363A3B', // moss-800
  '#4783FA', // forest-400
  '#404342', // bark-500
];

function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  return h >>> 0;
}

export function colorForKey(key: string): string {
  if (!key) return PALETTE[10];
  return PALETTE[hashString(key.toLowerCase()) % PALETTE.length];
}

export function paletteColors(n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(PALETTE[i % PALETTE.length]);
  return out;
}

export const PALETTE_FULL = PALETTE;

// Chart-axis / grid neutrals — kept centralized so all charts agree.
export const CHART_TOKENS = {
  grid: '#E5E7EB', // cream-300
  axis: '#D9DDDF', // moss-200
  tickLabel: '#5f6360', // moss-600
  textDark: '#080808', // bark-700
  inat: '#116dff', // forest-600
  indd: '#1F95B8', // ochre-500
  inatTranslucent: 'rgba(17, 109, 255, 0.85)',
  inddTranslucent: 'rgba(31, 149, 184, 0.85)',
};
