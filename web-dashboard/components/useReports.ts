'use client';

import { useEffect, useRef, useState } from 'react';
import { PotholeReport } from '@/types';
import { subscribeToReports } from '@/lib/firebase';

export type LiveEventKind = 'new' | 'confirmed' | 'status';
export interface LiveEvent { id: string; kind: LiveEventKind; report: PotholeReport; at: number }

/** Most recent activity on a report: a new detection, a confirmation, or a workflow change. */
export const lastActivity = (r: PotholeReport) =>
  Math.max(r.lastDetectedAt || 0, r.updatedAt || 0, r.createdAt || 0);

/**
 * One live subscription per page (cleaned up on unmount). Reports come back sorted by latest
 * activity, and changes after the first load are surfaced as events so the UI can show them:
 * a new report, another rider confirming an existing pothole, or a status change.
 */
export function useReports() {
  const [reports, setReports] = useState<PotholeReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [changedIds, setChangedIds] = useState<Set<string>>(new Set());
  const previous = useRef<Map<string, PotholeReport> | null>(null);

  useEffect(
    () =>
      subscribeToReports(
        (list) => {
          const sorted = [...list].sort((a, b) => lastActivity(b) - lastActivity(a));
          const prev = previous.current;
          if (prev) {
            const now = Date.now();
            const fresh: LiveEvent[] = [];
            for (const r of sorted) {
              const old = prev.get(r.id);
              if (!old) fresh.push({ id: r.id, kind: 'new', report: r, at: now });
              else if ((r.totalDetections || 1) > (old.totalDetections || 1) || (r.lastDetectedAt || 0) > (old.lastDetectedAt || 0))
                fresh.push({ id: r.id, kind: 'confirmed', report: r, at: now });
              else if (r.status !== old.status) fresh.push({ id: r.id, kind: 'status', report: r, at: now });
            }
            if (fresh.length) {
              setEvents((e) => [...fresh, ...e].slice(0, 5));
              setChangedIds((s) => new Set([...s, ...fresh.map((f) => f.id)]));
              const ids = fresh.map((f) => f.id);
              setTimeout(() => setChangedIds((s) => { const n = new Set(s); ids.forEach((i) => n.delete(i)); return n; }), 8000);
              setTimeout(() => setEvents((e) => e.filter((x) => !fresh.includes(x))), 8000);
            }
          }
          previous.current = new Map(sorted.map((r) => [r.id, r]));
          setReports(sorted);
          setLoading(false);
          setError(null);
        },
        (msg) => {
          setError(msg);
          setLoading(false);
        }
      ),
    []
  );
  return { reports, loading, error, events, changedIds };
}
