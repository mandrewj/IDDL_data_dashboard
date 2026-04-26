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

export function RecordsOverTimeChart({ data, height = 260 }: { data: YearBucket[]; height?: number }) {
  if (!data || data.length === 0) {
    return <div className="flex h-40 items-center justify-center text-sm text-slate-500">No temporal data</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#475569' }} />
        <YAxis tick={{ fontSize: 11, fill: '#475569' }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
          formatter={(v: number, k: string) => [v, k === 'inat' ? 'iNaturalist' : k === 'dwca' ? 'INDD' : k]}
        />
        <Legend formatter={(v) => (v === 'inat' ? 'iNaturalist' : v === 'dwca' ? 'INDD' : v)} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="inat" stackId="a" fill="#16a34a" />
        <Bar dataKey="dwca" stackId="a" fill="#1e3a8a" />
      </BarChart>
    </ResponsiveContainer>
  );
}
