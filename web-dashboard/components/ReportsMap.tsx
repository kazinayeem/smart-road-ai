'use client';

import dynamic from 'next/dynamic';

// Leaflet touches `window` at import time, so the map is client-only.
export const ReportsMap = dynamic(() => import('./PotholeMap').then((m) => m.PotholeMap), {
  ssr: false,
  loading: () => <div className="h-[420px] rounded-2xl bg-slate-200 animate-pulse" aria-label="Loading map" />,
});
