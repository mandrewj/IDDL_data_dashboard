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
import { colorForKey } from '@/lib/utils/colors';
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
    return <div className="flex h-40 items-center justify-center text-sm text-slate-500">{emptyLabel}</div>;
  }
  const handleBarClick = (item: { name: string }) => {
    if (!hrefBase) return;
    router.push(`${hrefBase}/${slugify(item.name)}`);
  };

  return (
    <ResponsiveContainer width="100%" height={Math.max(height, data.length * 22 + 60)}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#475569' }} />
        <YAxis
          dataKey="name"
          type="category"
          tick={{ fontSize: 11, fill: '#1e293b' }}
          width={140}
          interval={0}
        />
        <Tooltip
          cursor={{ fill: '#f1f5f9' }}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
          formatter={(value: number, key: string) => [value, key === 'inat' ? 'iNaturalist' : key === 'dwca' ? 'INDD' : key]}
        />
        <Legend
          formatter={(v) => (v === 'inat' ? 'iNaturalist' : v === 'dwca' ? 'INDD' : v)}
          wrapperStyle={{ fontSize: 12 }}
        />
        <Bar
          dataKey="inat"
          stackId="a"
          fill="#16a34a"
          name="inat"
          onClick={(d: any) => handleBarClick(d)}
          style={{ cursor: hrefBase ? 'pointer' : 'default' }}
        >
          {data.map((d) => (
            <Cell key={`inat-${d.name}`} fill={colorForKey(d.name)} fillOpacity={0.85} />
          ))}
        </Bar>
        <Bar
          dataKey="dwca"
          stackId="a"
          fill="#1e3a8a"
          name="dwca"
          onClick={(d: any) => handleBarClick(d)}
          style={{ cursor: hrefBase ? 'pointer' : 'default' }}
        >
          {data.map((d) => (
            <Cell key={`dwca-${d.name}`} fill={colorForKey(d.name)} fillOpacity={0.5} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
