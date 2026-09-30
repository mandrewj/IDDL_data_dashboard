'use client';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MonthlyCumulativePoint } from '@/lib/data/gbifMetrics';
import { CHART_TOKENS } from '@/lib/utils/colors';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMonth(m: string) {
  const [y, mo] = m.split('-').map(Number);
  return `${MONTHS_SHORT[mo - 1]} ${y}`;
}

/** 12,661,110 → 12.7M; keeps axis labels short inside a narrow iframe. */
function compact(v: number) {
  return Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
}

// Per-month bars (left axis) with the running total as a line (right axis).
// Two axes because the running total dwarfs any single month — on one axis the
// bars would flatten to nothing.
export function MonthlyCumulativeChart({
  data,
  valueLabel,
  cumulativeLabel,
  step = false,
  height = 280,
}: {
  data: MonthlyCumulativePoint[];
  valueLabel: string;
  cumulativeLabel: string;
  /** Draw the running total as a staircase — right for small, discrete counts. */
  step?: boolean;
  height?: number;
}) {
  if (!data || data.length === 0) {
    return <div className="flex h-40 items-center justify-center text-sm text-moss-600">No data yet</div>;
  }
  const tick = { fontSize: 11, fill: CHART_TOKENS.tickLabel };
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 4" stroke={CHART_TOKENS.grid} vertical={false} />
        <XAxis dataKey="month" tickFormatter={formatMonth} tick={tick} stroke={CHART_TOKENS.axis} minTickGap={24} />
        <YAxis yAxisId="value" tickFormatter={compact} tick={tick} stroke={CHART_TOKENS.axis} allowDecimals={false} width={44} />
        <YAxis
          yAxisId="cumulative"
          orientation="right"
          tickFormatter={compact}
          tick={{ ...tick, fill: CHART_TOKENS.cumulative }}
          stroke={CHART_TOKENS.axis}
          allowDecimals={false}
          width={44}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${CHART_TOKENS.grid}`, background: '#FFFFFF', color: CHART_TOKENS.textDark }}
          labelFormatter={(m: string) => formatMonth(m)}
          formatter={(v: number, k: string) => [v.toLocaleString(), k === 'value' ? valueLabel : cumulativeLabel]}
        />
        <Legend formatter={(v) => (v === 'value' ? valueLabel : cumulativeLabel)} wrapperStyle={{ fontSize: 12 }} />
        <Bar yAxisId="value" dataKey="value" fill={CHART_TOKENS.monthly} radius={[2, 2, 0, 0]} maxBarSize={28} />
        <Line
          yAxisId="cumulative"
          type={step ? 'stepAfter' : 'monotone'}
          dataKey="cumulative"
          stroke={CHART_TOKENS.cumulative}
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
