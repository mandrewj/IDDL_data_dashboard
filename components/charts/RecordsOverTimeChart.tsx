'use client';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { YearBucket } from '@/lib/data/aggregations';
import { CHART_TOKENS } from '@/lib/utils/colors';

export function RecordsOverTimeChart({ data, height = 260 }: { data: YearBucket[]; height?: number }) {
  if (!data || data.length === 0) {
    return <div className="flex h-40 items-center justify-center text-sm text-moss-600">No temporal data</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 4" stroke={CHART_TOKENS.grid} vertical={false} />
        <XAxis dataKey="year" tick={{ fontSize: 11, fill: CHART_TOKENS.tickLabel }} stroke={CHART_TOKENS.axis} />
        <YAxis tick={{ fontSize: 11, fill: CHART_TOKENS.tickLabel }} stroke={CHART_TOKENS.axis} allowDecimals={false} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${CHART_TOKENS.grid}`, background: '#FFFFFF', color: CHART_TOKENS.textDark }}
          formatter={(v: number, k: string) => [v, k === 'inat' ? 'iNaturalist' : k === 'dwca' ? 'INDD' : k]}
        />
        <Legend formatter={(v) => (v === 'inat' ? 'iNaturalist' : v === 'dwca' ? 'INDD' : v)} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="inat" stackId="a" fill={CHART_TOKENS.inat} />
        <Bar dataKey="dwca" stackId="a" fill={CHART_TOKENS.indd} />
      </BarChart>
    </ResponsiveContainer>
  );
}
