'use client';

import { BellRing, CheckCircle2, RefreshCw } from 'lucide-react';
import { LiveEvent } from './useReports';

const fmt = (t?: number) => (t ? new Date(t).toLocaleString() : '');

/** Stack of short-lived notices for live changes coming from the field (announced to screen readers). */
export function LiveActivity({ events, onOpen }: { events: LiveEvent[]; onOpen?: (id: string) => void }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(92vw,360px)] flex-col gap-2">
      {events.map((e) => {
        const r = e.report;
        const Icon = e.kind === 'new' ? BellRing : e.kind === 'confirmed' ? RefreshCw : CheckCircle2;
        const title =
          e.kind === 'new' ? 'New pothole reported'
          : e.kind === 'confirmed' ? `Pothole confirmed again · seen ${r.totalDetections || 2}×`
          : `Status changed to ${r.status.replace(/_/g, ' ').toLowerCase()}`;
        return (
          <button
            key={`${e.id}-${e.at}`}
            type="button"
            onClick={() => onOpen?.(e.id)}
            className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-slate-700 bg-slate-900 p-3 text-left text-white shadow-xl"
          >
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-orange-400" aria-hidden />
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{title}</span>
              <span className="block truncate text-xs text-slate-300">
                {r.priority} · {fmt(r.lastDetectedAt || r.createdAt)} · {r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
