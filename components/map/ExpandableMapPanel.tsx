'use client';
import { useEffect, useState } from 'react';
import MapPanel from './MapPanel';
import { OccurrenceRecord } from '@/lib/types';
import { cn } from '@/lib/utils/cn';

interface Props {
  records: OccurrenceRecord[];
  colorBy?: 'order' | 'family' | 'scientificName' | 'year';
  height?: number;
  center?: [number, number];
  zoom?: number;
  showCounties?: boolean;
}

// Renders the map inline at the requested height, plus an "Expand" affordance
// that opens the same map in a viewport-sized overlay. Two <MapPanel>s are
// mounted so Leaflet's DOM doesn't have to move — cheap for point rendering,
// avoids state loss on toggle.
export function ExpandableMapPanel(props: Props) {
  const [open, setOpen] = useState(false);
  const [overlayHeight, setOverlayHeight] = useState(600);

  // Recompute overlay height whenever it opens (and on resize while open) —
  // Leaflet won't grow to fill a flex parent without an explicit height.
  useEffect(() => {
    if (!open) return;
    const compute = () => setOverlayHeight(Math.max(360, window.innerHeight - 96));
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [open]);

  // Escape closes the overlay; body scroll lock stops the underlying page from
  // scrolling behind the modal on mobile.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <div className="relative">
        <MapPanel {...props} />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Expand map"
          title="Expand"
          className={cn(
            'absolute left-2 top-2 z-[1000] rounded-md border border-forest-200 bg-cream-50 px-2 py-1 text-xs text-forest-600 shadow-leaf transition-colors',
            'hover:bg-cream-200'
          )}
        >
          ⤢ Expand
        </button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Map — expanded view"
          className="fixed inset-0 z-[2000] flex flex-col bg-bark-600/70 p-3 sm:p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="flex items-center justify-between rounded-t-md bg-cream-50 px-3 py-2">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-forest-800">
              Occurrences — expanded
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-forest-200 px-2 py-0.5 text-xs text-forest-600 hover:bg-cream-200"
              aria-label="Close expanded map"
            >
              Close ✕
            </button>
          </div>
          <div className="flex-1 overflow-hidden rounded-b-md bg-cream-50">
            <MapPanel {...props} height={overlayHeight} />
          </div>
        </div>
      )}
    </>
  );
}
