import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-2xl font-bold text-slate-900">Page not found</h1>
      <p className="text-slate-600">The page you asked for doesn&apos;t exist.</p>
      <Link href="/" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Go home</Link>
    </div>
  );
}
