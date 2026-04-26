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
import { CHART_TOKENS, colorForKey } from '@/lib/utils/colors';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface Props {
  data: Record<string, number | string>[];
  taxa: string[];
  height?: number;
}

export function SeasonalityChart({ data, taxa, height = 280 }: Props) {
  if (!taxa || taxa.length === 0 || !data || data.length === 0) {
    return <div className="flex h-40 items-center justify-center text-sm text-moss-600">No phenology data</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 4" stroke={CHART_TOKENS.grid} vertical={false} />
        <XAxis
          dataKey="month"
          tickFormatter={(m) => MONTH_LABELS[(m as number) - 1]}
          tick={{ fontSize: 11, fill: CHART_TOKENS.tickLabel }}
          stroke={CHART_TOKENS.axis}
        />
        <YAxis tick={{ fontSize: 11, fill: CHART_TOKENS.tickLabel }} stroke={CHART_TOKENS.axis} allowDecimals={false} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${CHART_TOKENS.grid}`, background: '#FFFFFF', color: CHART_TOKENS.textDark }}
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
