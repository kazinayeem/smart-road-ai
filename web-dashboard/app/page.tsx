'use client';

import Link from 'next/link';
import {
  Camera, ShieldCheck, Wrench, MapPin, Merge, BellRing, Bike, Building2, HardHat,
  Lock, EyeOff, Cpu, Map as MapIcon, Database, ArrowRight, CheckCircle2, Clock, Smartphone,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { ROLE_HOME } from '@/lib/firebase';
import { Logo } from '@/components/Logo';

const steps = [
  { icon: Camera, title: 'Detect on the phone', body: 'A rider mounts their phone facing the road. A YOLOv8 model runs on the device and looks for potholes in the camera feed. The video never leaves the phone.' },
  { icon: CheckCircle2, title: 'Confirm before reporting', body: 'A pothole must appear in at least 2 of 3 frames, and the phone needs a fresh, accurate GPS fix. Each report records the exact date and time it was seen.' },
  { icon: Merge, title: 'Merge duplicates', body: 'If a report lands within 10–25 m of an open pothole (depending on GPS accuracy), it counts as another confirmation of the same pothole instead of a new one.' },
  { icon: BellRing, title: 'Warn riders ahead', body: 'The drive map follows you like a navigation app, heading-up, and warns you with a banner and voice before you reach a reported pothole.' },
  { icon: ShieldCheck, title: 'City engineers triage', body: 'On the web dashboard the city verifies or rejects each report, sets its priority, and issues a work order to a contractor with a deadline.' },
  { icon: Wrench, title: 'Repair and close', body: 'The contractor accepts the job, repairs it and submits evidence. Only the city can mark a pothole resolved, and the riders\' map updates the moment it does.' },
];

const lifecycle = ['New', 'Verified', 'Assigned', 'In progress', 'Repair submitted', 'Resolved'];

const roles = [
  { icon: Bike, title: 'Riders & drivers', where: 'Android app', points: ['Automatic detection while you ride', 'Split mode: live camera + live map', 'Warnings for reported potholes ahead', 'Your report history with date, time and upload status'] },
  { icon: Building2, title: 'City engineers', where: 'Web dashboard', points: ['Live map of every open report', 'Verify, reject or mark duplicates', 'Assign contractors with deadlines', 'Full audit trail of every status change'] },
  { icon: HardHat, title: 'Contractors', where: 'Web dashboard', points: ['Only the jobs assigned to you', 'Accept or decline work orders', 'Mark repairs in progress and submit evidence', 'No ability to close a job yourself'] },
];

const faqs = [
  { q: 'Does the app upload my camera video?', a: 'No. Frames are analysed on your phone and discarded. A report contains the position, the time, the model\'s confidence and an estimated severity — nothing else.' },
  { q: 'Is a road with no reports safe?', a: 'Not necessarily. No reports only means nobody has reported damage there yet. Always ride for the road you see.' },
  { q: 'How accurate is the detection?', a: 'The model is a YOLOv8s network quantised for phones. We are still measuring its precision and recall on a validated road dataset, so we don\'t publish an accuracy figure yet. Every report is reviewed by the city before repair work is ordered.' },
  { q: 'What happens if I\'m offline?', a: 'Reports are saved on the phone with their original date and time and upload automatically when you reconnect.' },
  { q: 'Who can see my location?', a: 'Reports are attached to the place a pothole was seen. Your live position is shared only inside a live companion session you start or join, and sharing stops when you leave.' },
  { q: 'Can anyone become an administrator?', a: 'No. New accounts are rider accounts. City and contractor roles are granted by an administrator and enforced by the database\'s security rules, not just hidden in the interface.' },
];

function SplitModeIllustration() {
  // Decorative product sketch (not a screenshot): camera with a detection box on top, drive map below.
  return (
    <div aria-hidden className="relative mx-auto w-[260px] sm:w-[290px] rounded-[2.2rem] border border-white/15 bg-ink-900 p-2.5 shadow-2xl shadow-black/40">
      <div className="overflow-hidden rounded-[1.7rem] bg-ink-800">
        <div className="relative h-[230px] bg-gradient-to-b from-slate-600 to-slate-800">
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-[linear-gradient(to_top,#3f4756,#5b6474)] [clip-path:polygon(38%_0,62%_0,100%_100%,0_100%)]" />
          <div className="absolute left-1/2 top-[38%] h-[46%] w-1 -translate-x-1/2 bg-[repeating-linear-gradient(to_bottom,#f1f5f9_0_10px,transparent_10px_20px)] opacity-70" />
          <div className="absolute left-[44%] top-[64%] h-9 w-20 rounded-[50%] bg-slate-900/80 ring-2 ring-red-500" />
          <span className="absolute left-[40%] top-[55%] rounded-md bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">82% · High</span>
          <span className="absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 text-[11px] font-semibold text-white">Scanning road</span>
        </div>
        <div className="h-0.5 bg-safety-500" />
        <div className="relative h-[230px] bg-[#1b2436]">
          <div className="absolute left-[30%] top-0 h-full w-5 bg-[#2f3a52]" />
          <div className="absolute left-0 top-[55%] h-5 w-full bg-[#2f3a52]" />
          <div className="absolute left-[62%] top-0 h-full w-3 rotate-12 bg-[#2a3449]" />
          <span className="absolute left-[29%] top-[30%] h-4 w-4 rounded-full border-2 border-white bg-red-600" />
          <span className="absolute left-[55%] top-[53%] h-4 w-4 rounded-full border-2 border-white bg-amber-600" />
          <span className="absolute left-[29%] top-[70%] grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-route">
            <span className="h-0 w-0 border-x-[5px] border-b-[9px] border-x-transparent border-b-white" />
          </span>
          <div className="absolute inset-x-3 top-3 rounded-xl bg-ink-900/90 px-3 py-2">
            <p className="text-sm font-bold text-white">Pothole in 120 m</p>
            <p className="text-[11px] text-slate-300">High severity · reported 3 times</p>
          </div>
          <span className="absolute bottom-3 left-3 grid h-11 w-11 place-items-center rounded-full bg-white text-sm font-bold text-slate-900">34</span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { profile, loading } = useAuth();
  const signedIn = !loading && !!profile;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">Skip to content</a>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink/95 text-white backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="SmartPothole AI home"><Logo compact /></Link>
          <nav aria-label="Page sections" className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
            <a href="#mission" className="hover:text-white">Mission</a>
            <a href="#how" className="hover:text-white">How it works</a>
            <a href="#who" className="hover:text-white">Who it&apos;s for</a>
            <a href="#privacy" className="hover:text-white">Privacy</a>
            <a href="#faq" className="hover:text-white">FAQ</a>
          </nav>
          <div className="flex items-center gap-1 whitespace-nowrap text-sm sm:gap-2">
            {signedIn ? (
              <Link href={ROLE_HOME[profile!.role]} className="rounded-xl bg-safety-500 px-4 py-2.5 font-semibold text-ink hover:bg-safety-400">Open dashboard</Link>
            ) : (
              <>
                <Link href="/login" className="rounded-xl px-3 py-2.5 font-medium text-slate-200 hover:text-white">Sign in</Link>
                <Link href="/register" className="rounded-xl bg-safety-500 px-4 py-2.5 font-semibold text-ink hover:bg-safety-400">Create account</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="main">
        {/* Hero */}
        <section className="bg-ink text-white">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1.15fr_1fr] md:py-24">
            <div className="space-y-6">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-route-300">
                <MapPin className="h-3.5 w-3.5" aria-hidden /> Road safety, mapped by the people who use the road
              </p>
              <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
                Find potholes <span className="text-safety-400">before they find you.</span>
              </h1>
              <p className="max-w-xl text-lg text-slate-300">
                SmartPothole AI turns riders&apos; phones into road scanners. It warns you about the hazards others have found, and gives the city everything it needs to send a repair crew.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href={signedIn ? ROLE_HOME[profile!.role] : '/register'} className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-safety-500 px-5 font-semibold text-ink hover:bg-safety-400">
                  {signedIn ? 'Open your dashboard' : 'Get started free'} <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <a href="#how" className="inline-flex min-h-[48px] items-center rounded-xl border border-white/20 px-5 font-semibold text-white hover:bg-white/10">See how it works</a>
              </div>
              <ul className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-sm text-slate-300">
                <li className="flex items-center gap-2"><EyeOff className="h-4 w-4 text-route-300" aria-hidden /> Video never leaves the phone</li>
                <li className="flex items-center gap-2"><MapIcon className="h-4 w-4 text-route-300" aria-hidden /> Free OpenStreetMap maps</li>
                <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-route-300" aria-hidden /> Works offline, syncs later</li>
              </ul>
            </div>
            <SplitModeIllustration />
          </div>
        </section>

        {/* Mission */}
        <section id="mission" className="scroll-mt-20 border-b border-slate-200">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
            <div className="max-w-3xl space-y-4">
              <p className="text-sm font-semibold uppercase tracking-wider text-safety">Our mission</p>
              <h2 className="text-3xl font-bold tracking-tight">Every pothole found early is a fall, a crash or a broken axle that doesn&apos;t happen.</h2>
              <p className="text-lg text-slate-600">
                Potholes hurt the people with the least protection first: motorcyclists, cyclists, rickshaw drivers and pedestrians. They are usually reported late, if at all, and many fixes never reach the person who reported them.
                SmartPothole AI exists to close that gap. Riders detect damage as they travel, everyone nearby gets warned, and city engineers get reports they can trust, with an accountable path all the way to a finished repair.
              </p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[
                { icon: Bike, t: 'Safer journeys', b: 'Warnings ahead of known potholes, spoken aloud so riders keep their eyes on the road.' },
                { icon: Wrench, t: 'Faster repairs', b: 'Reports arrive with GPS, date, time and how many riders confirmed them, so the city can prioritise.' },
                { icon: ShieldCheck, t: 'Honest data', b: 'No invented numbers. Reports need a real GPS fix, duplicates are merged, and every status change is logged.' },
              ].map(({ icon: Icon, t, b }) => (
                <div key={t} className="rounded-2xl border border-slate-200 p-6">
                  <Icon className="h-6 w-6 text-safety" aria-hidden />
                  <h3 className="mt-3 font-semibold">{t}</h3>
                  <p className="mt-1 text-sm text-slate-600">{b}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
            <p className="text-sm font-semibold uppercase tracking-wider text-safety">How it works</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">From a bump in the road to a finished repair</h2>
            <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {steps.map(({ icon: Icon, title, body }, i) => (
                <li key={title} className="relative rounded-2xl border border-slate-200 bg-white p-6">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-safety-50 text-safety">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="text-sm font-semibold text-slate-500">Step {i + 1}</span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{body}</p>
                </li>
              ))}
            </ol>

            <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="font-semibold">The life of a report</h3>
              <p className="mt-1 text-sm text-slate-600">Every transition is recorded with who made it and when. A report can also be rejected or marked a duplicate at triage.</p>
              <ol className="mt-5 flex flex-wrap items-center gap-2 text-sm" aria-label="Report status sequence">
                {lifecycle.map((s, i) => (
                  <li key={s} className="flex items-center gap-2">
                    <span className={`rounded-full px-3 py-1.5 font-medium ${i === lifecycle.length - 1 ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>{s}</span>
                    {i < lifecycle.length - 1 && <ArrowRight className="h-4 w-4 text-slate-400" aria-hidden />}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Roles */}
        <section id="who" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
            <p className="text-sm font-semibold uppercase tracking-wider text-safety">Who it&apos;s for</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">One system, three jobs</h2>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {roles.map(({ icon: Icon, title, where, points }) => (
                <div key={title} className="flex flex-col rounded-2xl border border-slate-200 p-6">
                  <div className="flex items-center justify-between">
                    <Icon className="h-7 w-7 text-route" aria-hidden />
                    <span className="inline-flex items-center gap-1 rounded-full bg-route-50 px-2.5 py-1 text-xs font-medium text-route">
                      {where === 'Android app' ? <Smartphone className="h-3.5 w-3.5" aria-hidden /> : <MapIcon className="h-3.5 w-3.5" aria-hidden />} {where}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    {points.map((p) => (
                      <li key={p} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-route" aria-hidden />{p}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Privacy + tech */}
        <section id="privacy" className="scroll-mt-20 bg-ink text-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-20">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-safety-400">Privacy by design</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight">Only what a repair crew needs</h2>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <h3 className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5 text-route-300" aria-hidden /> A report sends</h3>
                  <ul className="mt-3 space-y-1.5 text-sm text-slate-300">
                    <li>Position and GPS accuracy</li><li>Date and time it was seen</li><li>Model confidence and severity</li><li>Your account ID</li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <h3 className="flex items-center gap-2 font-semibold"><EyeOff className="h-5 w-5 text-safety-400" aria-hidden /> Never sent</h3>
                  <ul className="mt-3 space-y-1.5 text-sm text-slate-300">
                    <li>Camera video or photos</li><li>Your route history</li><li>Your live location, unless you join a live session</li>
                  </ul>
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-safety-400">Under the hood</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight">Built to be checked</h2>
              <ul className="mt-8 space-y-5">
                {[
                  { icon: Cpu, t: 'On-device AI', b: 'YOLOv8s, quantised to INT8 and run with ONNX Runtime on the phone. Accuracy figures will be published once measured on a validated dataset.' },
                  { icon: MapIcon, t: 'Open maps', b: 'OpenStreetMap tiles on web and Android. No paid map SDK, with attribution shown on every map.' },
                  { icon: Database, t: 'Tested security rules', b: 'Roles and every report transition are enforced in the database itself and covered by automated tests, not just hidden in the UI.' },
                  { icon: Lock, t: 'Real accounts', b: 'Firebase Authentication with username or email sign-in, generic login errors and lockout after repeated failures.' },
                ].map(({ icon: Icon, t, b }) => (
                  <li key={t} className="flex gap-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10"><Icon className="h-5 w-5 text-route-300" aria-hidden /></span>
                    <div><h3 className="font-semibold">{t}</h3><p className="mt-0.5 text-sm text-slate-300">{b}</p></div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20">
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 md:py-20">
            <p className="text-sm font-semibold uppercase tracking-wider text-safety">FAQ</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Questions people ask</h2>
            <div className="mt-8 divide-y divide-slate-200 rounded-2xl border border-slate-200">
              {faqs.map(({ q, a }) => (
                <details key={q} className="group p-5 open:bg-slate-50">
                  <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                    {q}
                    <span className="text-xl leading-none text-slate-400 transition-transform group-open:rotate-45" aria-hidden>+</span>
                  </summary>
                  <p className="mt-2 text-slate-600">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 pb-16 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 rounded-3xl bg-safety-50 p-8 md:flex-row md:items-center md:p-12">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Help map your city&apos;s roads</h2>
              <p className="mt-1 text-slate-600">Create a free rider account, then sign in on the Android app with the same account.</p>
            </div>
            <Link href={signedIn ? ROLE_HOME[profile!.role] : '/register'} className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-safety px-5 font-semibold text-white hover:bg-orange-800">
              {signedIn ? 'Open dashboard' : 'Create account'} <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-slate-500 sm:px-6 md:flex-row md:items-center md:justify-between">
          <Logo className="text-slate-900" />
          <p>No reports on a road doesn&apos;t mean the road is safe. Map data © OpenStreetMap contributors.</p>
        </div>
        <div className="border-t border-slate-100 py-4 text-center text-sm text-slate-500">
          Built by <span className="font-semibold text-slate-700">Mohammad Ali Nayeem</span> ·{' '}
          <a href="https://github.com/kazinayeem/smart-road-ai" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-700">
            Source on GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
