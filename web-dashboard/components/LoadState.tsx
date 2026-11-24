export function LoadState({ loading, error }: { loading: boolean; error: string | null }) {
  if (error) return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">Could not load reports: {error}</div>;
  if (loading) return <div role="status" className="text-sm text-slate-600">Loading reports…</div>;
  return null;
}
