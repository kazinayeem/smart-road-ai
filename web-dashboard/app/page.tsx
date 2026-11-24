'use client';

import Link from 'next/link';
import { Camera, Map, ShieldCheck, Wrench } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { ROLE_HOME } from '@/lib/firebase';

const steps = [
  { icon: Camera, title: 'Detect', body: 'The Android app runs a pothole model on the phone. Camera video never leaves the device — only position, time and confidence are sent.' },
  { icon: Map, title: 'Map', body: 'Reports within a few metres of an existing one are counted as confirmations of the same pothole instead of duplicates.' },
  { icon: ShieldCheck, title: 'Review', body: 'City engineers verify or reject reports and assign verified potholes to contractors.' },
  { icon: Wrench, title: 'Repair', body: 'Contractors accept, repair and submit evidence. Only the city can close a report as resolved.' },
];

export default function Home() {
  const { profile, loading } = useAuth();
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <span className="font-bold text-slate-900">SmartPothole AI</span>
          <nav className="flex items-center gap-2 text-sm">
            {!loading && profile ? (
              <Link href={ROLE_HOME[profile.role]} className="rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700">
                Open dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="px-3 py-2.5 font-medium text-slate-700 hover:text-slate-900">Sign in</Link>
                <Link href="/register" className="rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700">Create account</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-16 space-y-16">
        <section className="max-w-2xl space-y-4">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">Find potholes early. Fix them faster.</h1>
          <p className="text-lg text-slate-600">
            Citizens report road damage from their phones, city engineers triage it on a live map, and contractors close the loop with repair evidence.
          </p>
        </section>
        <section aria-labelledby="how" className="space-y-6">
          <h2 id="how" className="text-xl font-semibold text-slate-900">How it works</h2>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="rounded-2xl border border-slate-200 p-5 space-y-2">
                <Icon className="h-6 w-6 text-blue-600" aria-hidden />
                <h3 className="font-semibold text-slate-900">{i + 1}. {title}</h3>
                <p className="text-sm text-slate-600">{body}</p>
              </li>
            ))}
          </ol>
        </section>
        <p className="text-sm text-slate-500 max-w-2xl">
          A map showing no reports on a road does not mean the road is safe — it only means nobody has reported damage there yet.
        </p>
      </main>
    </div>
  );
}
