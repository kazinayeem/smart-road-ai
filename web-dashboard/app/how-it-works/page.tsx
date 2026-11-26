import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Download, UserPlus, Smartphone, ScanLine, Volume2, CloudUpload, Building2, HardHat, CheckCircle2,
  Camera, Crosshair, Cpu, Gauge, Timer, Satellite, HardDriveDownload, Merge, WifiOff, Users, ArrowRight, AlertTriangle,
} from 'lucide-react';
import { MarketingPage, EnglishOnlyNote } from '@/components/site/MarketingPage';
import { PageHero, Eyebrow, Phone, BrowserFrame } from '@/components/site/ui';
import { LINKS } from '@/components/site/links';

export const metadata: Metadata = {
  title: 'How it works',
  description: 'A step-by-step guide to SmartPothole AI: setting up the Android app, how on-device detection decides what to report, offline sync, duplicate merging and the city repair workflow.',
};

const quickStart = [
  { icon: Download, t: 'Install the app', b: 'Download the APK on an Android phone and allow installing from unknown sources when Android asks.' },
  { icon: UserPlus, t: 'Create an account', b: 'Register on this website or in the app. New accounts are rider accounts.' },
  { icon: Smartphone, t: 'Mount the phone', b: 'Fix the phone on the handlebar or dashboard with the rear camera facing the road ahead.' },
  { icon: ScanLine, t: 'Tap Start detection', b: 'Allow camera and location. The app starts scanning and shows the live map.' },
  { icon: Volume2, t: 'Ride normally', b: 'Listen for spoken warnings. Do not touch the phone while moving.' },
  { icon: CloudUpload, t: 'Reports upload themselves', b: 'Confirmed potholes upload when there is signal. Check them in My reports.' },
];

const gates = [
  { icon: Camera, k: '640 × 480', t: 'Camera frame', b: 'CameraX delivers frames to a background analyser. Only the newest frame is kept, so the app never falls behind and the preview stays smooth.' },
  { icon: Crosshair, k: '640 × 640', t: 'Prepare the frame', b: 'The frame is rotated upright, resized to the model input and normalised into a tensor of shape 1 × 3 × 640 × 640.' },
  { icon: Cpu, k: 'INT8 · ONNX Runtime', t: 'Run YOLOv8s', b: 'The quantised model runs on the phone. Boxes below 0.25 confidence are dropped and overlapping boxes are merged (non-maximum suppression, IoU 0.45). Severity is estimated from the size of the box.' },
  { icon: Gauge, k: '≥ 0.55 in 2 of 3', t: 'Confirm across frames', b: 'One good frame is not enough. The best confidence must be at least 0.55 in two of the last three frames. Otherwise the app moves on to the next frame.' },
  { icon: Volume2, k: 'banner · voice · vibration', t: 'Warn the rider at once', b: 'As soon as a pothole is confirmed the rider gets a banner, a spoken warning and a vibration, with a short cooldown so warnings do not repeat. This works without internet.' },
  { icon: Timer, k: '3.5 s · 10 m / 60 s', t: 'Avoid double reports', b: 'If a report was made in the last 3.5 seconds, or the same spot was reported within 10 m in the last minute, the detection is skipped.' },
  { icon: Satellite, k: '≤ 30 s old · ≤ 50 m', t: 'Require fresh GPS', b: 'The position must be less than 30 seconds old and accurate to 50 m or better. If not, the screen says "not reported: waiting for GPS".' },
  { icon: HardDriveDownload, k: 'Room · WorkManager', t: 'Queue and upload', b: 'The report is saved in an outbox on the phone, then a background job uploads it when there is a network connection, retrying with back-off if needed.' },
];

const workflow = [
  { s: 'New', who: 'Rider', b: 'A report arrives from the app, or a sighting near an existing pothole adds a confirmation instead.' },
  { s: 'Under review', who: 'City', b: 'An engineer opens the report on the map and checks the evidence.' },
  { s: 'Verified', who: 'City', b: 'Confirmed as a real pothole and given a priority. It can also be rejected or marked a duplicate here.' },
  { s: 'Assigned', who: 'City', b: 'A work order goes to a contractor with a deadline.' },
  { s: 'Accepted', who: 'Contractor', b: 'The contractor accepts the job (or declines it, sending it back to the city).' },
  { s: 'In progress', who: 'Contractor', b: 'Repair work has started.' },
  { s: 'Repair submitted', who: 'Contractor', b: 'The contractor reports the repair as done, with notes.' },
  { s: 'City verification', who: 'City', b: 'The city checks the finished repair.' },
  { s: 'Resolved', who: 'City', b: 'Only the city can close a report. The riders’ map updates straight away.' },
];

export default function HowItWorksPage() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="How it works"
        title={<>From a bump in the road to a <span className="text-safety-400">finished repair</span></>}
        intro="A complete guide to SmartPothole AI: how to set up the app, exactly how the phone decides what to report, what happens offline, and how the city and contractors take a report to a repair."
      >
        <nav aria-label="Guide sections" className="mt-8 flex flex-wrap gap-2 text-sm">
          {[['#start', 'Quick start'], ['#detector', 'The detector'], ['#offline', 'Offline and sync'], ['#merge', 'Duplicates'], ['#companion', 'Live companion'], ['#workflow', 'Repair workflow'], ['#system', 'System design']].map(([h, l]) => (
            <a key={h} href={h} className="inline-flex min-h-[40px] items-center rounded-full border border-white/15 bg-white/5 px-4 text-slate-200 hover:bg-white/10 hover:text-white">{l}</a>
          ))}
        </nav>
      </PageHero>

      {/* Quick start */}
      <section id="start" className="scroll-mt-28 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
          <EnglishOnlyNote />
          <div className="grid items-center gap-12 lg:grid-cols-[1.3fr_0.7fr]">
            <div>
              <div data-reveal>
                <Eyebrow>For riders</Eyebrow>
                <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Quick start in six steps</h2>
              </div>
              <ol className="mt-10 grid gap-4 sm:grid-cols-2">
                {quickStart.map(({ icon: Icon, t, b }, i) => (
                  <li key={t} data-reveal style={{ ['--sp-delay' as string]: `${(i % 2) * 70}ms` }} className="rounded-2xl border border-slate-200 p-5">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-safety-50 text-safety"><Icon className="h-5 w-5" aria-hidden /></span>
                      <span className="text-sm font-semibold text-slate-500">Step {i + 1}</span>
                    </div>
                    <h3 className="mt-3 font-semibold">{t}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">{b}</p>
                  </li>
                ))}
              </ol>
              <a href={LINKS.apk} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-safety-500 px-5 font-semibold text-ink hover:bg-safety-400">
                <Download className="h-4 w-4" aria-hidden /> Download the APK
              </a>
            </div>
            <div className="mx-auto w-[240px] sm:w-[280px]" data-reveal>
              <Phone src="/screens/app-home.webp" alt="Android home screen with the Start detection button" />
            </div>
          </div>
        </div>
      </section>

      {/* Detector */}
      <section id="detector" className="scroll-mt-28 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
          <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr]">
            <div className="lg:sticky lg:top-32 lg:self-start" data-reveal>
              <Eyebrow>On the phone</Eyebrow>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">How the detector decides</h2>
              <p className="mt-4 text-lg text-slate-600">Every camera frame passes through the same eight steps. A frame that fails any gate is dropped. Nothing leaves the phone except the final report.</p>
              <div className="mx-auto mt-8 w-[220px] lg:mx-0">
                <Phone src="/screens/app-detect.webp" alt="Live detection: a pothole outlined at 80 percent confidence, high severity, with the hazard map below" />
              </div>
            </div>
            <ol className="space-y-4">
              {gates.map(({ icon: Icon, k, t, b }, i) => (
                <li key={t} data-reveal className="flex gap-5 rounded-2xl border border-slate-200 bg-white p-6">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-ink text-route-300"><Icon className="h-5 w-5" aria-hidden /></span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{i + 1}. {t}</h3>
                      <span className="rounded-md bg-safety-50 px-2 py-0.5 font-mono text-xs font-semibold text-safety">{k}</span>
                    </div>
                    <p className="mt-1.5 leading-relaxed text-slate-600">{b}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Offline + merge + companion */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-16 sm:px-6 md:grid-cols-3 md:py-24">
          {[
            { id: 'offline', icon: WifiOff, t: 'Offline and sync', p: ['Reports are written to an outbox on the phone first, with the time the pothole was actually seen.', 'A background job uploads them as soon as there is a connection and retries if the upload fails.', 'Warnings for potholes already on your map keep working without signal.'] },
            { id: 'merge', icon: Merge, t: 'Duplicate merging', p: ['Each sighting is stored as a detection record.', 'If it falls within 10 to 25 m of an open pothole (depending on GPS accuracy), it adds a confirmation to that pothole instead of opening a new one.', 'Database transactions keep counts correct when two riders pass at the same moment.'] },
            { id: 'companion', icon: Users, t: 'Live companion', p: ['The scanning phone starts a session and shares a code.', 'Companions see its live position, breadcrumbs and detections on the map, with alerts for new potholes, moving more than 600 m, GPS loss after 15 s and going offline after 30 s.', 'No video is shared. Sharing stops when the session ends.'] },
          ].map(({ id, icon: Icon, t, p }) => (
            <article key={id} id={id} className="scroll-mt-28 rounded-2xl border border-slate-200 p-6" data-reveal>
              <Icon className="h-7 w-7 text-route" aria-hidden />
              <h2 className="mt-4 text-xl font-bold">{t}</h2>
              <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-slate-600">
                {p.map((x) => <li key={x} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-route" aria-hidden />{x}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="scroll-mt-28 bg-ink text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
          <div className="max-w-3xl" data-reveal>
            <Eyebrow dark>On the web dashboard</Eyebrow>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">The repair workflow, stage by stage</h2>
            <p className="mt-4 text-lg text-slate-300">Each change is recorded with who made it and when. A report can be rejected or marked a duplicate during review.</p>
          </div>
          <ol className="relative mt-12 space-y-3 before:absolute before:bottom-4 before:left-5 before:top-4 before:w-0.5 before:bg-gradient-to-b before:from-safety-500 before:via-route-400 before:to-green-500 md:before:left-1/2">
            {workflow.map(({ s, who, b }, i) => {
              const Icon = who === 'Rider' ? Smartphone : who === 'City' ? Building2 : HardHat;
              const left = i % 2 === 0;
              return (
                <li key={s} data-reveal className={`relative pl-14 md:w-1/2 md:pl-0 ${left ? 'md:pr-12' : 'md:ml-auto md:pl-12'}`}>
                  <span className={`absolute left-0 top-4 grid h-10 w-10 place-items-center rounded-full border-4 border-ink text-sm font-bold ${i === workflow.length - 1 ? 'bg-green-500 text-white' : 'bg-white text-ink'} md:top-5 ${left ? 'md:left-auto md:-right-5' : 'md:-left-5'}`}>
                    {i === workflow.length - 1 ? <CheckCircle2 className="h-5 w-5" aria-hidden /> : i + 1}
                  </span>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-lg font-semibold">{s}</h3>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-route-300"><Icon className="h-3.5 w-3.5" aria-hidden /> {who}</span>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{b}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Dashboard screenshots */}
      <section className="bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-2">
          <figure data-reveal>
            <BrowserFrame src="/screens/web-city-map.webp" alt="City dashboard live map of reports" url="cryptro.web.app/city" width={1600} height={696} />
            <figcaption className="mt-3 text-sm text-slate-600">The city&apos;s live map, filtered by new, in repair and done.</figcaption>
          </figure>
          <figure data-reveal>
            <BrowserFrame src="/screens/web-triage.webp" alt="Triage table with AI confidence, severity, status and contractor" url="cryptro.web.app/city#triage" width={1600} height={801} />
            <figcaption className="mt-3 text-sm text-slate-600">The triage queue: reporter, time, confirmations, AI confidence and status for every report.</figcaption>
          </figure>
        </div>
      </section>

      {/* System */}
      <section id="system" className="scroll-mt-28 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
          <div className="max-w-3xl" data-reveal>
            <Eyebrow>System design</Eyebrow>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">How the parts fit together</h2>
            <p className="mt-4 text-lg text-slate-600">The Android app and web dashboard both connect straight to Firebase. Security rules in the database decide who can read and change what, so a contractor cannot close a job and a rider cannot become an admin, whatever app they use.</p>
          </div>
          <figure className="mt-10 rounded-2xl border border-slate-200 p-3 sm:p-6" data-reveal>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/screens/architecture.webp" width={1910} height={1153} loading="lazy" decoding="async" className="h-auto w-full" alt="Architecture diagram: Android app, Firebase backend and Next.js web dashboard, connected by JSON metadata only" />
          </figure>
          <div className="mt-10 flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900 sm:flex-row sm:items-center sm:justify-between" data-reveal>
            <p className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /> SmartPothole AI is a pilot in beta. It can miss potholes. Always ride for the road you see.</p>
            <Link href="/terms" className="inline-flex min-h-[44px] shrink-0 items-center gap-2 font-semibold hover:underline">Terms and conditions <ArrowRight className="h-4 w-4" aria-hidden /></Link>
          </div>
        </div>
      </section>
    </MarketingPage>
  );
}
