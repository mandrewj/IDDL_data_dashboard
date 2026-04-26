'use client';
import { useMemo, useState } from 'react';
import { OccurrenceRecord } from '@/lib/types';
import { cn } from '@/lib/utils/cn';
import { SourceBadge } from '@/components/ui/SourceBadge';

type SortKey = 'date' | 'lat' | 'lng' | 'county' | 'recordedBy' | 'qualityGrade' | 'basisOfRecord' | 'source';
const PAGE_SIZE = 25;

export function RecordsTable({ records }: { records: OccurrenceRecord[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    const arr = [...records];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
    });
    return arr;
  }, [records, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const slice = sorted.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(k);
      setSortDir(k === 'date' ? 'desc' : 'asc');
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
      <div className="overflow-x-auto rounded-lg border border-cream-300">
        <table className="w-full text-sm">
          <thead className="bg-cream-100">
            <tr>
              <Th k="date">Date</Th>
              <Th k="source">Source</Th>
              <Th k="lat">Lat</Th>
              <Th k="lng">Lng</Th>
              <Th k="county">County</Th>
              <Th k="recordedBy">Collector / Observer</Th>
              <Th k="qualityGrade">Quality / Basis</Th>
              <th className="border-b border-cream-300 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-moss-700">Link</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((r) => (
              <tr key={r.id} className="border-b border-cream-200 last:border-b-0 hover:bg-cream-100">
                <td className="whitespace-nowrap px-3 py-2 text-bark-500">{r.date ?? '—'}</td>
                <td className="px-3 py-2"><SourceBadge source={r.source} /></td>
                <td className="px-3 py-2 text-moss-700">{r.lat?.toFixed(4) ?? '—'}</td>
                <td className="px-3 py-2 text-moss-700">{r.lng?.toFixed(4) ?? '—'}</td>
                <td className="px-3 py-2 text-moss-700">{r.county ?? '—'}</td>
                <td className="px-3 py-2 text-moss-700">{r.recordedBy ?? '—'}</td>
                <td className="px-3 py-2 text-moss-700">{r.qualityGrade ?? r.basisOfRecord ?? '—'}</td>
                <td className="px-3 py-2">
                  {r.externalUrl ? (
                    <a href={r.externalUrl} target="_blank" rel="noopener noreferrer" className="text-forest-600 hover:text-forest-800 hover:underline">
                      Open ↗
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
            {slice.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-sm text-moss-600">
                  No records to show.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <div className="flex items-center justify-end gap-1.5 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className={cn('rounded-md border px-2 py-1', safePage === 0 ? 'border-cream-300 text-moss-300' : 'border-cream-300 text-bark-500 hover:bg-cream-100')}
          >
            ← Prev
          </button>
          <span className="px-2 text-moss-700">
            Page {safePage + 1} of {pageCount}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={safePage >= pageCount - 1}
            className={cn('rounded-md border px-2 py-1', safePage >= pageCount - 1 ? 'border-cream-300 text-moss-300' : 'border-cream-300 text-bark-500 hover:bg-cream-100')}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
