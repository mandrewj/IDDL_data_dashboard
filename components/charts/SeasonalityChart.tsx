'use client';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { colorForKey } from '@/lib/utils/colors';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface Props {
  data: Record<string, number | string>[];
  taxa: string[];
  height?: number;
}

export function SeasonalityChart({ data, taxa, height = 280 }: Props) {
  if (!taxa || taxa.length === 0 || !data || data.length === 0) {
    return <div className="flex h-40 items-center justify-center text-sm text-slate-500">No phenology data</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="month"
          tickFormatter={(m) => MONTH_LABELS[(m as number) - 1]}
          tick={{ fontSize: 11, fill: '#475569' }}
        />
        <YAxis tick={{ fontSize: 11, fill: '#475569' }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
          labelFormatter={(m) => MONTH_LABELS[(m as number) - 1]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {taxa.map((t) => (
          <Line
            key={t}
            type="monotone"
            dataKey={t}
            stroke={colorForKey(t)}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
