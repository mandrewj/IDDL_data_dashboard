'use client';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { RecentActivity } from '@/lib/data/aggregations';
import { CHART_TOKENS } from '@/lib/utils/colors';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Compact "activity pulse" row: four rolling counters + a 90-day chart with
// real X (date) and Y (count) axes. Anchored on the snapshot's newest dated
// record so it never goes blank between weekly refreshes.
export function RecentActivityStrip({ data }: { data: RecentActivity }) {
  if (!data || data.daily.length === 0) {
    return <div className="text-xs text-moss-600">No dated records</div>;
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
      <div className="flex divide-x divide-cream-300">
        <StatCell label="7d" value={data.last7} />
        <StatCell label="30d" value={data.last30} />
        <StatCell label="90d" value={data.last90} />
        <StatCell label="365d" value={data.last365} />
      </div>
      <div className="relative">
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={data.daily} margin={{ top: 6, right: 8, bottom: 4, left: 0 }}>
            <defs>
              <linearGradient id="pulseFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_TOKENS.inat} stopOpacity={0.5} />
                <stop offset="100%" stopColor={CHART_TOKENS.inat} stopOpacity={0.05} />
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
                return `${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`;
              }}
              tick={{ fontSize: 10, fill: CHART_TOKENS.tickLabel }}
              stroke={CHART_TOKENS.axis}
              minTickGap={40}
            />
            <YAxis
              tick={{ fontSize: 10, fill: CHART_TOKENS.tickLabel }}
              stroke={CHART_TOKENS.axis}
              width={30}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ stroke: CHART_TOKENS.grid, strokeWidth: 1 }}
              contentStyle={{ fontSize: 11, borderRadius: 6, padding: '4px 8px', border: `1px solid ${CHART_TOKENS.grid}`, background: '#FFFFFF', color: CHART_TOKENS.textDark }}
              labelFormatter={(_l, payload) => {
                const p = payload?.[0]?.payload as { day?: string } | undefined;
                return p?.day ?? '';
              }}
              formatter={(v: number) => [v, 'records']}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke={CHART_TOKENS.inat}
              strokeWidth={1.4}
              fill="url(#pulseFill)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
        {data.newest && (
          <p className="mt-0.5 text-right text-[10px] text-moss-600">
            newest record {data.newest}
          </p>
        )}
      </div>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-3 first:pl-0 last:pr-0">
      <div className="text-[10px] uppercase tracking-[0.18em] text-moss-600">{label}</div>
      <div className="text-lg font-bold leading-tight tabular-nums text-forest-800">
        {value.toLocaleString()}
      </div>
    </div>
  );
}
