// 20-color high-contrast accessible palette (Tableau / d3 inspired with adjustments)
const PALETTE = [
  '#1f77b4', // blue
  '#ff7f0e', // orange
  '#2ca02c', // green
  '#d62728', // red
  '#9467bd', // purple
  '#8c564b', // brown
  '#e377c2', // pink
  '#7f7f7f', // gray
  '#bcbd22', // olive
  '#17becf', // cyan
  '#aec7e8', // light blue
  '#ffbb78', // light orange
  '#98df8a', // light green
  '#ff9896', // light red
  '#c5b0d5', // light purple
  '#c49c94', // light brown
  '#f7b6d2', // light pink
  '#dbdb8d', // light olive
  '#9edae5', // light cyan
  '#393b79', // dark navy
];

function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  return h >>> 0;
}

export function colorForKey(key: string): string {
  if (!key) return PALETTE[7];
  return PALETTE[hashString(key.toLowerCase()) % PALETTE.length];
}

export function paletteColors(n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(PALETTE[i % PALETTE.length]);
  return out;
}

export const PALETTE_FULL = PALETTE;
