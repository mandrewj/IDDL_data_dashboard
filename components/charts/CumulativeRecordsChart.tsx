'use client';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CumulativePoint } from '@/lib/data/aggregations';
import { CHART_TOKENS } from '@/lib/utils/colors';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Cumulative count of records over time, split by source and stacked. Answers
// "how fast is the dataset growing?" without needing to eyeball the sum of
// yearly bars. X-axis is a real time scale so multi-year runs don't compress.
export function CumulativeRecordsChart({ data, height = 260 }: { data: CumulativePoint[]; height?: number }) {
  if (!data || data.length === 0) {
    return <div className="flex h-40 items-center justify-center text-sm text-moss-600">No temporal data</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <defs>
          <linearGradient id="inatFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_TOKENS.inat} stopOpacity={0.55} />
            <stop offset="100%" stopColor={CHART_TOKENS.inat} stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="inddFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_TOKENS.indd} stopOpacity={0.55} />
            <stop offset="100%" stopColor={CHART_TOKENS.indd} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 4" stroke={CHART_TOKENS.grid} vertical={false} />
        <XAxis
          dataKey="ts"
          type="number"
          scale="time"
          domain={['dataMin', 'dataMax']}
          tickFormatter={(v: number) => {
            const d = new Date(v);
            return `${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
          }}
          tick={{ fontSize: 11, fill: CHART_TOKENS.tickLabel }}
          stroke={CHART_TOKENS.axis}
          minTickGap={40}
        />
        <YAxis tick={{ fontSize: 11, fill: CHART_TOKENS.tickLabel }} stroke={CHART_TOKENS.axis} allowDecimals={false} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${CHART_TOKENS.grid}`, background: '#FFFFFF', color: CHART_TOKENS.textDark }}
          labelFormatter={(v: number) => {
            const d = new Date(v);
            return `${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
          }}
          formatter={(v: number, k: string) => [v.toLocaleString(), k === 'inat' ? 'iNaturalist' : k === 'dwca' ? 'INDD' : k]}
        />
        <Legend formatter={(v) => (v === 'inat' ? 'iNaturalist' : v === 'dwca' ? 'INDD' : v)} wrapperStyle={{ fontSize: 12 }} />
        <Area
          type="monotone"
          dataKey="inat"
          stackId="1"
          stroke={CHART_TOKENS.inat}
          strokeWidth={1.5}
          fill="url(#inatFill)"
        />
        <Area
          type="monotone"
          dataKey="dwca"
          stackId="1"
          stroke={CHART_TOKENS.indd}
          strokeWidth={1.5}
          fill="url(#inddFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
