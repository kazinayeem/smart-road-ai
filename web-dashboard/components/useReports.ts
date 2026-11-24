'use client';

import { useEffect, useState } from 'react';
import { PotholeReport } from '@/types';
import { subscribeToReports } from '@/lib/firebase';

/** One live subscription per page; cleaned up on unmount. */
export function useReports() {
  const [reports, setReports] = useState<PotholeReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(
    () =>
      subscribeToReports(
        (r) => {
          setReports(r);
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
  return { reports, loading, error };
}
