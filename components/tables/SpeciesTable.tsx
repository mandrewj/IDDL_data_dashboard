'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { SpeciesRow } from '@/lib/data/aggregations';
import { speciesSlug } from '@/lib/utils/taxonomy';
import { cn } from '@/lib/utils/cn';

type SortKey = 'rank' | 'scientificName' | 'order' | 'family' | 'total' | 'inat' | 'dwca';
const PAGE_SIZE = 20;

export function SpeciesTable({ rows, hideTaxonomy }: { rows: SpeciesRow[]; hideTaxonomy?: boolean }) {
  const [filter, setFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('total');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return rows;
    return rows.filter(
      (r) =>
        r.scientificName.toLowerCase().includes(f) ||
        (r.commonName ?? '').toLowerCase().includes(f) ||
        (r.order ?? '').toLowerCase().includes(f) ||
        (r.family ?? '').toLowerCase().includes(f)
    );
  }, [rows, filter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      if (sortKey === 'rank') return 0;
      const av = a[sortKey] as string | number | undefined;
      const bv = b[sortKey] as string | number | undefined;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const slice = sorted.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(k);
      setSortDir(typeof rows[0]?.[k as keyof SpeciesRow] === 'number' ? 'desc' : 'asc');
    }
    setPage(0);
  }

  const Th = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <th
      onClick={() => toggleSort(k)}
      className="cursor-pointer select-none border-b border-cream-300 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-moss-700 hover:text-bark-700"
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortKey === k && <span aria-hidden>{sortDir === 'asc' ? '▲' : '▼'}</span>}
      </span>
    </th>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <input
          type="search"
          placeholder="Filter by name…"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(0);
          }}
          className="w-full max-w-sm rounded-md border border-cream-300 bg-cream-50 px-3 py-1.5 text-sm shadow-leaf placeholder:text-moss-400 focus:border-forest-500 focus:outline-none focus:ring-1 focus:ring-forest-300"
        />
        <div className="text-xs text-moss-600">
          {sorted.length.toLocaleString()} species{sorted.length !== rows.length ? ` (filtered from ${rows.length.toLocaleString()})` : ''}
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-cream-300">
        <table className="w-full text-sm">
          <thead className="bg-cream-100">
            <tr>
              <Th k="rank">#</Th>
              <Th k="scientificName">Scientific Name</Th>
              <th className="border-b border-cream-300 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-moss-700">Common Name</th>
              {!hideTaxonomy && <Th k="order">Order</Th>}
              {!hideTaxonomy && <Th k="family">Family</Th>}
              <Th k="total">Total</Th>
              <Th k="inat">iNat</Th>
              <Th k="dwca">INDD</Th>
            </tr>
          </thead>
          <tbody>
            {slice.map((r, i) => (
              <tr key={r.scientificName} className="border-b border-cream-200 last:border-b-0 hover:bg-cream-100">
                <td className="px-3 py-2 text-moss-600">{safePage * PAGE_SIZE + i + 1}</td>
                <td className="px-3 py-2">
                  <Link href={`/species/${speciesSlug(r.scientificName)}`} className="italic text-bark-700 hover:text-forest-700 hover:underline">
                    {r.scientificName}
                  </Link>
                  {r.rank !== 'species' && r.rank !== 'subspecies' && (
                    <span className="ml-1.5 rounded bg-cream-200 px-1.5 py-0.5 text-[10px] font-medium text-moss-600">
                      {r.rank}-level ID
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-moss-700">{r.commonName ?? '—'}</td>
                {!hideTaxonomy && <td className="px-3 py-2 text-moss-700">{r.order ?? '—'}</td>}
                {!hideTaxonomy && <td className="px-3 py-2 text-moss-700">{r.family ?? '—'}</td>}
                <td className="px-3 py-2 font-medium text-bark-700">{r.total.toLocaleString()}</td>
                <td className="px-3 py-2 text-moss-700">{r.inat.toLocaleString()}</td>
                <td className="px-3 py-2 text-moss-700">{r.dwca.toLocaleString()}</td>
              </tr>
            ))}
            {slice.length === 0 && (
              <tr>
                <td colSpan={hideTaxonomy ? 6 : 8} className="px-3 py-6 text-center text-sm text-moss-600">
                  No species match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={safePage} pageCount={pageCount} onChange={setPage} />
    </div>
  );
}

function Pagination({ page, pageCount, onChange }: { page: number; pageCount: number; onChange: (p: number) => void }) {
  if (pageCount <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-1.5 text-sm">
      <button
        onClick={() => onChange(Math.max(0, page - 1))}
        disabled={page === 0}
        className={cn('rounded-md border px-2 py-1', page === 0 ? 'border-cream-300 text-moss-300' : 'border-cream-300 text-bark-500 hover:bg-cream-100')}
      >
        ← Prev
      </button>
      <span className="px-2 text-moss-700">
        Page {page + 1} of {pageCount}
      </span>
      <button
        onClick={() => onChange(Math.min(pageCount - 1, page + 1))}
        disabled={page >= pageCount - 1}
        className={cn('rounded-md border px-2 py-1', page >= pageCount - 1 ? 'border-cream-300 text-moss-300' : 'border-cream-300 text-bark-500 hover:bg-cream-100')}
      >
        Next →
      </button>
    </div>
  );
}
