'use client';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { CategoryCount } from '@/lib/data/aggregations';
import { CHART_TOKENS, colorForKey } from '@/lib/utils/colors';

// Shared donut used by the quality-grade and basis-of-record panels. If
// `palette` is not supplied, categories are hashed to the Okabe-Ito set so a
// name always gets the same color across renders.
export function CategoryDonut({
  data,
  height = 220,
  palette,
  emptyMessage = 'No data',
}: {
  data: CategoryCount[];
  height?: number;
  palette?: string[];
  emptyMessage?: string;
}) {
  if (!data || data.length === 0 || data.every((d) => d.value === 0)) {
    return <div className="flex h-40 items-center justify-center text-sm text-moss-600">{emptyMessage}</div>;
  }
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${CHART_TOKENS.grid}`, background: '#FFFFFF', color: CHART_TOKENS.textDark }}
          formatter={(v: number, name: string) => {
            const pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0';
            return [`${v.toLocaleString()} (${pct}%)`, name];
          }}
        />
        <Legend
          verticalAlign="bottom"
          height={36}
          iconSize={10}
          wrapperStyle={{ fontSize: 11 }}
          formatter={(value: string) => <span className="text-bark-600">{value}</span>}
        />
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="55%"
          outerRadius="85%"
          paddingAngle={1}
          stroke="#FFFFFF"
          strokeWidth={1}
        >
          {data.map((d, i) => (
            <Cell key={d.name} fill={palette ? palette[i % palette.length] : colorForKey(d.name)} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
