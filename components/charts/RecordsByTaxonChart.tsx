'use client';
import { useRouter } from 'next/navigation';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART_TOKENS, colorForKey } from '@/lib/utils/colors';
import { slugify } from '@/lib/utils/taxonomy';
import { TaxonCount } from '@/lib/data/aggregations';

interface Props {
  data: TaxonCount[];
  hrefBase?: string; // e.g. "/order" or "/family"
  emptyLabel?: string;
  height?: number;
}

export function RecordsByTaxonChart({ data, hrefBase, emptyLabel = 'No data', height = 360 }: Props) {
  const router = useRouter();
  if (!data || data.length === 0) {
    return <div className="flex h-40 items-center justify-center text-sm text-moss-600">{emptyLabel}</div>;
  }
  const handleBarClick = (item: { name: string }) => {
    if (!hrefBase) return;
    router.push(`${hrefBase}/${slugify(item.name)}`);
  };

  return (
    <ResponsiveContainer width="100%" height={Math.max(height, data.length * 22 + 60)}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
        <CartesianGrid strokeDasharray="3 4" stroke={CHART_TOKENS.grid} horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: CHART_TOKENS.tickLabel }} stroke={CHART_TOKENS.axis} />
        <YAxis
          dataKey="name"
          type="category"
          tick={{ fontSize: 11, fill: CHART_TOKENS.textDark }}
          stroke={CHART_TOKENS.axis}
          width={140}
          interval={0}
        />
        <Tooltip
          cursor={{ fill: '#F1F3F5' }}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${CHART_TOKENS.grid}`, background: '#FFFFFF', color: CHART_TOKENS.textDark }}
          formatter={(value: number, key: string) => [value, key === 'inat' ? 'iNaturalist' : key === 'dwca' ? 'INDD' : key]}
        />
        <Legend
          formatter={(v) => (v === 'inat' ? 'iNaturalist' : v === 'dwca' ? 'INDD' : v)}
          wrapperStyle={{ fontSize: 12 }}
        />
        <Bar
          dataKey="inat"
          stackId="a"
          fill={CHART_TOKENS.inat}
          name="inat"
          onClick={(d: any) => handleBarClick(d)}
          style={{ cursor: hrefBase ? 'pointer' : 'default' }}
        >
          {data.map((d) => (
            <Cell key={`inat-${d.name}`} fill={colorForKey(d.name)} fillOpacity={0.9} />
          ))}
        </Bar>
        <Bar
          dataKey="dwca"
          stackId="a"
          fill={CHART_TOKENS.indd}
          name="dwca"
          onClick={(d: any) => handleBarClick(d)}
          style={{ cursor: hrefBase ? 'pointer' : 'default' }}
        >
          {data.map((d) => (
            <Cell key={`dwca-${d.name}`} fill={colorForKey(d.name)} fillOpacity={0.55} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
