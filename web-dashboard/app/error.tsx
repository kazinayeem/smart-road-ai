'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-2xl font-bold text-slate-900">Something went wrong</h1>
      <p className="text-slate-600">Please try again. If it keeps happening, sign out and back in.</p>
      <button onClick={reset} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Try again</button>
    </div>
  );
}
