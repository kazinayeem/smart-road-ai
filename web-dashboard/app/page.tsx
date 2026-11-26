'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import {
  Camera, ShieldCheck, Wrench, Merge, BellRing, Bike, Building2, HardHat,
  Lock, EyeOff, Cpu, Map as MapIcon, Database, ArrowRight, CheckCircle2, Clock, Smartphone,
  Download, PlayCircle, Route, Users, Volume2, WifiOff, Navigation, ClipboardList, Car,
  ChevronDown, ScanLine, History, MapPinned, Rows2, Crosshair, Gauge, Timer, Satellite,
  HardDriveDownload, Radio, MapPin, LocateOff, Power, FlaskConical,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { ROLE_HOME } from '@/lib/firebase';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { LINKS, useReveal, Eyebrow, Phone, BrowserFrame } from '@/components/site/ui';
import { useLang } from '@/components/site/i18n';
import { HOME, FAQS } from '@/components/site/content';
import { CreatorSection } from '@/components/site/Creator';

const HeroRoad3D = dynamic(() => import('@/components/site/HeroRoad3D').then((m) => m.HeroRoad3D), { ssr: false });

/* ------------------------------------------------------------------ data */

const featureMeta = [
  { icon: ScanLine, span: 'lg:col-span-2' }, { icon: Rows2 }, { icon: Volume2 }, { icon: Navigation },
  { icon: Route, span: 'lg:col-span-2' }, { icon: Users }, { icon: WifiOff }, { icon: MapPinned }, { icon: History },
  { icon: Merge }, { icon: ClipboardList, span: 'lg:col-span-2' }, { icon: HardHat }, { icon: Car }, { icon: MapIcon }, { icon: Lock },
] as { icon: typeof Camera; span?: string }[];

const showcaseMeta = [
  { id: 'detect', icon: ScanLine, img: '/screens/app-detect.webp', alt: 'Android split mode: live camera with a pothole outlined at 80 percent, high severity, above the hazard map' },
  { id: 'drive', icon: Navigation, img: '/screens/app-drive.webp', alt: 'Android drive map showing Pothole in under 10 m, high severity, reported 2 times, with 23 active hazards' },
  { id: 'route', icon: Route, img: '/screens/app-route.webp', alt: 'Android route planner from My location to Uttara: 19 minutes, 17.1 km, 16 reported potholes on this route' },
  { id: 'home', icon: Smartphone, img: '/screens/app-home.webp', alt: 'Android home screen with Start detection, Plan route, Split mode, Drive map, Live companion and detection counters' },
  { id: 'reports', icon: History, img: '/screens/app-reports.webp', alt: 'Android My reports list with severity, AI confidence, date, GPS coordinates and Uploaded badges' },
  { id: 'profile', icon: Car, img: '/screens/app-profile.webp', alt: 'Android profile with vehicle choice and alert toggles for spoken warnings' },
];

const stripMeta = [
  { src: '/screens/app-detect-rural.webp', alt: 'Live detection on a rural road: 80 percent, medium severity' },
  { src: '/screens/app-drive-2.webp', alt: 'Drive map with hazard markers along Mirpur 10 service road' },
  { src: '/screens/app-route.webp', alt: 'Route to Uttara with 16 reported potholes' },
  { src: '/screens/app-reports.webp', alt: 'List of uploaded reports with AI confidence' },
];

const pipelineMeta = [
  { icon: Camera, k: '640 × 480' }, { icon: Crosshair, k: '640 × 640' }, { icon: Cpu, k: 'INT8' }, { icon: Gauge, k: '≥ 0.55' },
  { icon: Timer, k: '3.5 s' }, { icon: Satellite, k: '≤ 30 s · ≤ 50 m' }, { icon: HardDriveDownload, k: 'Room + WorkManager' },
];

const sizeVals = [['PyTorch FP32', 21.48], ['ONNX FP32', 42.67]] as const;
const latVals = [['PyTorch FP32', 62.33], ['ONNX FP32', 47.55], ['ONNX INT8', 76.91]] as const;

const companionIcons = [MapPin, Navigation, LocateOff, Radio, Power];
const stack = ['Kotlin', 'CameraX', 'ONNX Runtime', 'YOLOv8s INT8', 'Room (SQLite)', 'WorkManager', 'MapLibre', 'OpenStreetMap', 'TextToSpeech', 'Next.js', 'React', 'Tailwind CSS', 'Leaflet', 'Firebase Auth', 'Realtime Database', 'Cloud Functions', 'Cloud Messaging', 'three.js'];
const stepIcons = [Camera, CheckCircle2, BellRing, Merge, ShieldCheck, Wrench];
const roleIcons = [Bike, Building2, HardHat];
const hoodIcons = [Cpu, MapIcon, Database, Lock];

/* --------------------------------------------------------------- bits */

function Bars({ title, rows, max }: { title: string; rows: { label: string; value: number; unit: string; hi?: boolean }[]; max: number }) {
  return (
    <figure className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <figcaption className="font-semibold">{title}</figcaption>
      <ul className="mt-5 space-y-4">
        {rows.map((r) => (
          <li key={r.label}>
            <div className="flex items-baseline justify-between text-sm">
              <span className={r.hi ? 'font-semibold text-white' : 'text-slate-300'}>{r.label}</span>
              <span className={`tabular-nums ${r.hi ? 'font-bold text-safety-400' : 'text-slate-300'}`}>{r.value.toFixed(2)} {r.unit}</span>
            </div>
            <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-white/10">
              <div data-reveal className="sp-bar h-full rounded-full" style={{ ['--sp-w' as string]: `${(r.value / max) * 100}%`, background: r.hi ? 'linear-gradient(90deg,#F97316,#FBBF24)' : 'linear-gradient(90deg,#0E7490,#22D3EE)' }} />
            </div>
          </li>
        ))}
      </ul>
    </figure>
  );
}

/** Animated SVG of a live companion session: the scanner's dot drives along a road, dropping breadcrumbs and pins. */
function CompanionMap({ label, live, following }: { label: string; live: string; following: string }) {
  const path = 'M30 300 C 120 300, 140 220, 220 210 S 330 120, 420 140 S 520 60, 570 40';
  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-[#0f1a2c] shadow-xl shadow-slate-900/10">
      <svg viewBox="0 0 600 340" className="block h-auto w-full" role="img" aria-label={label}>
        <defs>
          <pattern id="blocks" width="40" height="40" patternUnits="userSpaceOnUse">
            <rect width="40" height="40" fill="#0f1a2c" />
            <rect x="4" y="4" width="32" height="32" rx="3" fill="#15233a" />
          </pattern>
        </defs>
        <rect width="600" height="340" fill="url(#blocks)" />
        <path d={path} fill="none" stroke="#243553" strokeWidth="18" strokeLinecap="round" />
        <path d={path} fill="none" stroke="#22D3EE" strokeWidth="3" strokeLinecap="round" className="sp-trail" pathLength={1} />
        {[{ x: 220, y: 210, d: '1.2s' }, { x: 420, y: 140, d: '2.6s' }].map((p) => (
          <g key={p.x} className="sp-pin" style={{ animationDelay: p.d, transformOrigin: `${p.x}px ${p.y}px` }}>
            <circle cx={p.x} cy={p.y} r="14" fill="#EF4444" opacity="0.25" />
            <path d={`M${p.x} ${p.y} l-9 -16 a10 10 0 1 1 18 0 z`} fill="#F97316" stroke="#fff" strokeWidth="2" />
            <circle cx={p.x} cy={p.y - 20} r="3.5" fill="#fff" />
          </g>
        ))}
        <circle r="9" fill="#22D3EE" stroke="#fff" strokeWidth="3">
          <animateMotion dur="4s" repeatCount="indefinite" path={path} rotate="auto" />
        </circle>
      </svg>
      <div className="absolute left-4 top-4 rounded-xl bg-ink-900/90 px-3 py-2 text-white backdrop-blur">
        <p className="flex items-center gap-2 text-xs font-semibold text-route-300"><span className="relative flex h-2 w-2"><span className="sp-ping absolute h-full w-full rounded-full bg-green-400" /><span className="relative h-2 w-2 rounded-full bg-green-400" /></span>{live}</p>
        <p className="mt-0.5 text-sm font-semibold">{following}</p>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- page */

export default function Home() {
  const { lang } = useLang();
  const c = HOME[lang];
  const faqs = FAQS[lang].flatMap((g) => g.items).slice(0, 6);
  const showcase = showcaseMeta.map((m, i) => ({ ...m, label: c.showcase[i][0], title: c.showcase[i][1], body: c.showcase[i][2] }));
  const { profile, loading } = useAuth();
  const signedIn = !loading && !!profile;
  const primaryHref = signedIn ? ROLE_HOME[profile!.role] : '/register';
  useReveal();

  // App showcase tabs: auto-advance unless the visitor interacts or prefers reduced motion.
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setActive((i) => (i + 1) % showcaseMeta.length), 5000);
    return () => clearInterval(t);
  }, [paused]);
  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
    e.preventDefault();
    const fwd = e.key === 'ArrowRight' || e.key === 'ArrowDown';
    const next = (i + (fwd ? 1 : -1) + showcase.length) % showcase.length;
    setPaused(true); setActive(next); tabRefs.current[next]?.focus();
  };

  const [videoOn, setVideoOn] = useState(false);
  const current = showcase[active];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">Skip to content</a>
      <SiteHeader />

      <main id="main">
        {/* ============ HERO: full screen, 3D road behind ============ */}
        <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-ink text-white">
          <div aria-hidden className="absolute inset-0 -z-20">
            <HeroRoad3D className="h-full w-full" />
          </div>
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/75 to-ink/10" />
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink to-transparent" />
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-ink to-transparent" />
            <div className="sp-aurora absolute -left-[10%] -top-[20%] h-[60vh] w-[60vh] rounded-full bg-safety-500/25 blur-[120px]" />
          </div>

          <div className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-12 px-4 pb-8 pt-36 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-32">
            <div className="space-y-7">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-route-300 backdrop-blur">
                <FlaskConical className="h-3.5 w-3.5" aria-hidden />
                {c.heroBadge}
              </p>
              <h1 className="text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl xl:text-7xl">
                {c.heroTitleA}{' '}
                <span className="bg-gradient-to-r from-safety-400 via-safety-500 to-amber-300 bg-clip-text text-transparent">{c.heroTitleB}</span>
              </h1>
              <p className="max-w-xl text-lg leading-relaxed text-slate-300 sm:text-xl">
                {c.heroBody}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href={primaryHref} className="group inline-flex min-h-[52px] items-center gap-2 rounded-xl bg-safety-500 px-6 font-semibold text-ink shadow-lg shadow-safety-500/25 transition-colors hover:bg-safety-400">
                  {signedIn ? c.openYourDashboard : c.getStarted}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
                <a href={LINKS.apk} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[52px] items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 font-semibold text-white backdrop-blur transition-colors hover:bg-white/10">
                  <Download className="h-4 w-4" aria-hidden /> {c.downloadApk}
                </a>
                <a href="#video" className="inline-flex min-h-[52px] items-center gap-2 rounded-xl px-4 font-semibold text-slate-200 transition-colors hover:text-white">
                  <PlayCircle className="h-5 w-5" aria-hidden /> {c.watchDemo}
                </a>
              </div>
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-300">
                {[EyeOff, MapIcon, Clock].map((Icon, i) => (
                  <li key={i} className="flex items-center gap-2"><Icon className="h-4 w-4 text-route-300" aria-hidden /> {c.heroPoints[i]}</li>
                ))}
              </ul>
            </div>

            <div className="relative mx-auto h-[500px] w-full max-w-[440px] sm:h-[580px]">
              <Phone src="/screens/app-home.webp" alt="SmartPothole Android home screen" className="absolute right-0 top-10 w-[190px] rotate-6 opacity-80 sm:w-[220px]" />
              <Phone src="/screens/app-detect.webp" alt="SmartPothole detecting a pothole live: 80 percent confidence, high severity, with the hazard map below" priority className="sp-float absolute left-0 top-0 w-[230px] sm:w-[260px]">
                <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[9%] h-[38%] overflow-hidden" style={{ ['--sp-scan-distance' as string]: '200px' }}>
                  <div className="sp-scan h-0.5 w-full bg-gradient-to-r from-transparent via-route-300 to-transparent shadow-[0_0_14px_2px_rgba(103,232,249,0.6)]" />
                </div>
              </Phone>
              <div className="absolute -left-2 bottom-16 hidden items-center gap-3 rounded-2xl border border-white/10 bg-ink-800/90 px-4 py-3 shadow-xl backdrop-blur sm:flex">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-red-500/15 text-red-400"><BellRing className="h-5 w-5" aria-hidden /></span>
                <div><p className="text-sm font-semibold">{c.heroCardWarn[0]}</p><p className="text-xs text-slate-400">{c.heroCardWarn[1]}</p></div>
              </div>
              <div className="absolute bottom-0 right-2 hidden items-center gap-3 rounded-2xl border border-white/10 bg-ink-800/90 px-4 py-3 shadow-xl backdrop-blur sm:flex">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-green-500/15 text-green-400"><CheckCircle2 className="h-5 w-5" aria-hidden /></span>
                <div><p className="text-sm font-semibold">{c.heroCardUp[0]}</p><p className="text-xs text-slate-400">{c.heroCardUp[1]}</p></div>
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-7xl px-4 pb-6 sm:px-6">
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-4">
              {c.stats.map(([value, label]) => (
                <div key={label} className="flex flex-col-reverse bg-ink/80 px-5 py-4 backdrop-blur">
                  <dt className="mt-0.5 text-xs text-slate-400 sm:text-sm">{label}</dt>
                  <dd className="text-2xl font-bold text-white sm:text-3xl">{value}</dd>
                </div>
              ))}
            </dl>
            <a href="#features" className="sp-cue mx-auto mt-4 flex h-11 w-11 items-center justify-center rounded-full text-slate-400 hover:text-white" aria-label={c.scrollCue}>
              <ChevronDown className="h-6 w-6" aria-hidden />
            </a>
          </div>
        </section>

        {/* ============ TECH MARQUEE ============ */}
        <section aria-label={c.builtWith} className="overflow-hidden border-b border-slate-200 bg-white py-6">
          <div className="sp-marquee flex w-max gap-3">
            {[...stack, ...stack].map((s, i) => (
              <span key={`${s}-${i}`} aria-hidden={i >= stack.length} className="whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600">{s}</span>
            ))}
          </div>
        </section>

        {/* ============ FEATURES (bento) ============ */}
        <section id="features" className="scroll-mt-28 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28">
            <div className="max-w-3xl" data-reveal>
              <Eyebrow>{c.featEyebrow}</Eyebrow>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{c.featTitle}</h2>
              <p className="mt-4 text-lg text-slate-600">{c.featBody}</p>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {c.features.map(([title, body, tag], i) => {
                const { icon: Icon, span } = featureMeta[i];
                return (
                <article key={i} data-reveal style={{ ['--sp-delay' as string]: `${(i % 4) * 60}ms` }}
                  className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-safety-500/40 hover:shadow-lg hover:shadow-safety-500/10 ${span ?? ''}`}>
                  <div className="flex items-center justify-between">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-safety-50 text-safety transition-colors group-hover:bg-safety-500 group-hover:text-white">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{tag}</span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{body}</p>
                </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ============ APP SHOWCASE ============ */}
        <section id="app" className="relative isolate scroll-mt-28 overflow-hidden bg-ink text-white">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="sp-aurora-2 absolute -right-[15%] -top-[10%] h-[60vh] w-[60vh] rounded-full bg-safety-500/20 blur-[120px]" />
            <div className="sp-aurora absolute -left-[10%] bottom-[-20%] h-[55vh] w-[55vh] rounded-full bg-route-400/20 blur-[120px]" />
          </div>
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28">
            <div className="max-w-3xl" data-reveal>
              <Eyebrow dark>{c.appEyebrow}</Eyebrow>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{c.appTitle}</h2>
            </div>

            <div className="mt-10 grid items-center gap-12 lg:grid-cols-[1fr_minmax(0,340px)_1fr]" onMouseEnter={() => setPaused(true)} onFocus={() => setPaused(true)}>
              <div role="tablist" aria-label={c.appTabsLabel} className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
                {showcase.map((s, i) => {
                  const Icon = s.icon;
                  const on = i === active;
                  return (
                    <button key={s.id} ref={(el) => { tabRefs.current[i] = el; }} role="tab" id={`tab-${s.id}`} aria-selected={on} aria-controls="app-panel" tabIndex={on ? 0 : -1}
                      onClick={() => { setPaused(true); setActive(i); }} onKeyDown={(e) => onTabKey(e, i)}
                      className={`relative flex min-h-[48px] shrink-0 items-center gap-3 overflow-hidden rounded-xl px-4 py-3 text-left transition-colors lg:w-full ${on ? 'bg-white/10 text-white ring-1 ring-white/15' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                      <Icon className={`h-5 w-5 shrink-0 ${on ? 'text-safety-400' : ''}`} aria-hidden />
                      <span className="font-semibold">{s.label}</span>
                      {on && !paused && <span aria-hidden key={`p-${active}`} className="absolute inset-x-0 bottom-0 h-0.5 origin-left animate-[sp-progress_5s_linear] bg-safety-400" />}
                    </button>
                  );
                })}
              </div>

              <div className="relative mx-auto w-[250px] sm:w-[290px] lg:w-full">
                <div aria-hidden className="absolute inset-6 -z-10 rounded-[3rem] bg-safety-500/25 blur-3xl" />
                {showcase.map((s, i) => (
                  <div key={s.id} className={`transition-all duration-500 ${i === active ? 'relative opacity-100' : 'pointer-events-none absolute inset-0 scale-95 opacity-0'}`} aria-hidden={i !== active}>
                    <Phone src={s.img} alt={s.alt} />
                  </div>
                ))}
              </div>

              <div id="app-panel" role="tabpanel" aria-labelledby={`tab-${current.id}`} aria-live="polite" className="space-y-4">
                <p className="text-sm font-semibold text-safety-400">{String(active + 1).padStart(2, '0')} / {String(showcase.length).padStart(2, '0')}</p>
                <h3 className="text-2xl font-bold sm:text-3xl">{current.title}</h3>
                <p className="text-lg leading-relaxed text-slate-300">{current.body}</p>
                <a href={LINKS.apk} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-white px-5 font-semibold text-ink transition-colors hover:bg-slate-200">
                  <Download className="h-4 w-4" aria-hidden /> {c.getApk}
                </a>
              </div>
            </div>

            <div className="mt-20 grid grid-cols-2 gap-4 sm:grid-cols-4" data-reveal>
              {stripMeta.map((p, i) => (
                <figure key={p.src} className={i % 2 ? 'sm:translate-y-8' : ''}>
                  <Phone src={p.src} alt={p.alt} />
                  <figcaption className="mt-3 text-center text-sm text-slate-400">{c.strip[i]}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* ============ DETECTOR PIPELINE ============ */}
        <section id="detector" className="scroll-mt-28 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28">
            <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
              <div className="lg:sticky lg:top-32 lg:self-start" data-reveal>
                <Eyebrow>{c.detEyebrow}</Eyebrow>
                <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{c.detTitle}</h2>
                <p className="mt-4 text-lg text-slate-600">{c.detBody}</p>
                <Link href="/how-it-works" className="mt-6 inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-ink px-5 font-semibold text-white transition-colors hover:bg-ink-700">
                  {c.detCta} <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
              <ol className="relative space-y-4 before:absolute before:bottom-6 before:left-[1.6rem] before:top-6 before:w-0.5 before:bg-gradient-to-b before:from-route-400 before:via-safety-500 before:to-green-500">
                {c.pipeline.map(([t, b], i) => {
                  const { icon: Icon, k } = pipelineMeta[i];
                  return (
                  <li key={i} data-reveal style={{ ['--sp-delay' as string]: `${i * 50}ms` }} className="relative flex gap-5 rounded-2xl border border-slate-200 bg-white p-5 pl-4 transition-shadow hover:shadow-md">
                    <span className="relative z-10 grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ink text-route-300 ring-4 ring-white"><Icon className="h-5 w-5" aria-hidden /></span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{i + 1}. {t}</h3>
                        <span className="rounded-md bg-safety-50 px-2 py-0.5 font-mono text-xs font-semibold text-safety">{k}</span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">{b}</p>
                    </div>
                  </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </section>

        {/* ============ MODEL NUMBERS ============ */}
        <section id="model" className="relative isolate scroll-mt-28 overflow-hidden bg-ink text-white">
          <div aria-hidden className="sp-grid-bg pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28">
            <div className="max-w-3xl" data-reveal>
              <Eyebrow dark>{c.modelEyebrow}</Eyebrow>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{c.modelTitle}</h2>
              <p className="mt-4 text-lg text-slate-300">{c.modelBody}</p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-2" data-reveal>
              <Bars title={c.sizeTitle} max={45} rows={[...sizeVals.map(([label, value]) => ({ label, value, unit: 'MB' })), { label: c.shipped, value: 10.96, unit: 'MB', hi: true }]} />
              <Bars title={c.latTitle} max={80} rows={latVals.map(([label, value], i) => ({ label, value, unit: 'ms', hi: i === 2 }))} />
            </div>
            <p className="mt-4 text-sm text-slate-400">{c.modelNote}</p>
          </div>
        </section>

        {/* ============ LIVE COMPANION ============ */}
        <section id="companion" className="scroll-mt-28 bg-slate-50">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 md:py-28 lg:grid-cols-2">
            <div data-reveal><CompanionMap label={c.compMapLabel} live={c.compLive} following={c.compFollowing} /></div>
            <div data-reveal>
              <Eyebrow>{c.compEyebrow}</Eyebrow>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{c.compTitle}</h2>
              <p className="mt-4 text-lg text-slate-600">{c.compBody}</p>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {c.compAlerts.map(([t, b], i) => {
                  const Icon = companionIcons[i];
                  return (
                  <li key={i} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-route" aria-hidden />
                    <div><p className="text-sm font-semibold">{t}</p><p className="text-sm text-slate-600">{b}</p></div>
                  </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>

        {/* ============ WEB DASHBOARD ============ */}
        <section id="dashboard" className="scroll-mt-28 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28">
            <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
              <div data-reveal>
                <Eyebrow>{c.dashEyebrow}</Eyebrow>
                <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{c.dashTitle}</h2>
                <p className="mt-4 text-lg text-slate-600">{c.dashBody}</p>
                <ul className="mt-6 space-y-3 text-slate-700">
                  {c.dashPoints.map((t) => (
                    <li key={t} className="flex gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-route" aria-hidden />{t}</li>
                  ))}
                </ul>
              </div>
              <div className="relative" data-reveal>
                <BrowserFrame src="/screens/web-city-map.webp" alt="City Corporation dashboard: live map of pothole reports around the user's position with status filters" url="cryptro.web.app/city" width={1600} height={696} />
                <div className="relative -mt-16 ml-auto w-[85%] sm:-mt-24">
                  <BrowserFrame src="/screens/web-triage.webp" alt="Pothole reports and lifecycle triage table with AI confidence, severity, status and contractor columns" url="cryptro.web.app/city#triage" width={1600} height={801} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ HOW IT WORKS ============ */}
        <section id="how" className="scroll-mt-28 bg-slate-50">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28">
            <div className="flex flex-wrap items-end justify-between gap-6" data-reveal>
              <div className="max-w-3xl">
                <Eyebrow>{c.howEyebrow}</Eyebrow>
                <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{c.howTitle}</h2>
              </div>
              <Link href="/how-it-works" className="inline-flex min-h-[44px] items-center gap-2 font-semibold text-safety hover:underline">{c.fullGuide} <ArrowRight className="h-4 w-4" aria-hidden /></Link>
            </div>
            <ol className="relative mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {c.steps.map(([title, body], i) => {
                const Icon = stepIcons[i];
                return (
                <li key={i} data-reveal style={{ ['--sp-delay' as string]: `${(i % 3) * 80}ms` }} className="relative rounded-2xl border border-slate-200 bg-white p-6">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink text-safety-400"><Icon className="h-5 w-5" aria-hidden /></span>
                    <span className="text-sm font-semibold text-slate-500">{c.step} {i + 1}</span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{body}</p>
                </li>
                );
              })}
            </ol>

            <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 sm:p-8" data-reveal>
              <h3 className="font-semibold">{c.lifeTitle}</h3>
              <p className="mt-1 text-sm text-slate-600">{c.lifeBody}</p>
              <div className="relative mt-8">
                <svg aria-hidden className="absolute left-0 top-4 hidden h-2 w-full lg:block" preserveAspectRatio="none" viewBox="0 0 100 2">
                  <line x1="0" y1="1" x2="100" y2="1" stroke="#CBD5E1" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                  <line x1="0" y1="1" x2="100" y2="1" stroke="#F97316" strokeWidth="2" vectorEffect="non-scaling-stroke" className="sp-dash" />
                </svg>
                <ol className="relative flex flex-wrap gap-3 lg:grid lg:grid-cols-9 lg:gap-2" aria-label={c.lifeTitle}>
                  {c.lifecycle.map((s, i) => {
                    const last = i === c.lifecycle.length - 1;
                    return (
                      <li key={s} className="flex items-center gap-2 lg:flex-col lg:text-center">
                        <span className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-full border text-sm font-bold ring-4 ring-white ${last ? 'border-green-600 bg-green-600 text-white' : 'border-slate-300 bg-white text-ink'}`}>
                          {last ? <CheckCircle2 className="h-5 w-5" aria-hidden /> : i + 1}
                        </span>
                        <span className={`text-sm font-medium ${last ? 'text-green-700' : 'text-slate-700'}`}>{s}</span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* ============ ARCHITECTURE ============ */}
        <section id="architecture" className="scroll-mt-28 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28">
            <div className="max-w-3xl" data-reveal>
              <Eyebrow>{c.archEyebrow}</Eyebrow>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{c.archTitle}</h2>
              <p className="mt-4 text-lg text-slate-600">{c.archBody}</p>
            </div>
            <figure className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-6" data-reveal>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/screens/architecture.webp" width={1910} height={1153} loading="lazy" decoding="async" className="h-auto w-full"
                alt="System architecture: Android app (CameraX, YOLOv8s INT8, frame confirmation, warnings, Room outbox, WorkManager sync, MapLibre map) sends JSON metadata only to the Firebase backend (Authentication, Realtime Database, security rules, Cloud Function), which feeds the Next.js web dashboard (login and role guard, City Corporation desk, contractor portal, citizen map, Leaflet and OpenStreetMap, report detail)" />
              <figcaption className="mt-3 text-center text-sm text-slate-500">{c.archCaption}</figcaption>
            </figure>
          </div>
        </section>

        {/* ============ VIDEO ============ */}
        <section id="video" className="scroll-mt-28 bg-ink text-white">
          <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 md:py-28">
            <div className="text-center" data-reveal>
              <Eyebrow dark>{c.videoEyebrow}</Eyebrow>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{c.videoTitle}</h2>
            </div>
            <div className="relative mt-10 aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl shadow-black/50" data-reveal>
              {videoOn ? (
                <iframe className="absolute inset-0 h-full w-full" src={`https://www.youtube-nocookie.com/embed/${LINKS.videoId}?autoplay=1&rel=0`} title="SmartPothole AI demo video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              ) : (
                <button type="button" onClick={() => setVideoOn(true)} className="group absolute inset-0 h-full w-full" aria-label={c.playVideo}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`https://img.youtube.com/vi/${LINKS.videoId}/maxresdefault.jpg`} alt="" loading="lazy" className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100" />
                  <span className="absolute inset-0 grid place-items-center">
                    <span className="relative grid h-20 w-20 place-items-center rounded-full bg-safety-500 text-ink shadow-xl shadow-safety-500/40 transition-transform group-hover:scale-105">
                      <span aria-hidden className="sp-ping absolute inset-0 rounded-full bg-safety-500/60" />
                      <PlayCircle className="relative h-10 w-10" aria-hidden />
                    </span>
                  </span>
                </button>
              )}
            </div>
            <p className="mt-4 text-center text-sm text-slate-400">
              {c.preferYoutube} <a href={LINKS.video} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">{c.openThere}</a> · <a href={LINKS.projectVideo} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">{c.fullVideo}</a>
            </p>
          </div>
        </section>

        {/* ============ ROLES ============ */}
        <section id="who" className="scroll-mt-28 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28">
            <div className="max-w-3xl" data-reveal>
              <Eyebrow>{c.whoEyebrow}</Eyebrow>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{c.whoTitle}</h2>
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {c.roles.map(([title, where, points], i) => {
                const Icon = roleIcons[i];
                return (
                <div key={i} data-reveal style={{ ['--sp-delay' as string]: `${i * 80}ms` }} className="flex flex-col rounded-2xl border border-slate-200 p-6 transition-shadow hover:shadow-lg hover:shadow-slate-900/5">
                  <div className="flex items-center justify-between">
                    <span className="grid h-12 w-12 place-items-center rounded-xl bg-route-50 text-route"><Icon className="h-6 w-6" aria-hidden /></span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-route-50 px-2.5 py-1 text-xs font-medium text-route">
                      {i === 0 ? <Smartphone className="h-3.5 w-3.5" aria-hidden /> : <MapIcon className="h-3.5 w-3.5" aria-hidden />} {where}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    {points.map((p) => (
                      <li key={p} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-route" aria-hidden />{p}</li>
                    ))}
                  </ul>
                </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ============ PRIVACY + TECH ============ */}
        <section id="privacy" className="scroll-mt-28 bg-ink text-white">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 md:grid-cols-2 md:py-28">
            <div data-reveal>
              <Eyebrow dark>{c.privEyebrow}</Eyebrow>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{c.privTitle}</h2>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <h3 className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5 text-route-300" aria-hidden /> {c.sends}</h3>
                  <ul className="mt-3 space-y-1.5 text-sm text-slate-300">
                    {c.sendsList.map((x) => <li key={x}>{x}</li>)}
                  </ul>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <h3 className="flex items-center gap-2 font-semibold"><EyeOff className="h-5 w-5 text-safety-400" aria-hidden /> {c.never}</h3>
                  <ul className="mt-3 space-y-1.5 text-sm text-slate-300">
                    {c.neverList.map((x) => <li key={x}>{x}</li>)}
                  </ul>
                </div>
              </div>
              <Link href="/privacy" className="mt-6 inline-flex min-h-[44px] items-center gap-2 font-semibold text-safety-400 hover:underline">{c.readPolicy} <ArrowRight className="h-4 w-4" aria-hidden /></Link>
            </div>
            <div data-reveal>
              <Eyebrow dark>{c.hoodEyebrow}</Eyebrow>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{c.hoodTitle}</h2>
              <ul className="mt-8 space-y-5">
                {c.hood.map(([t, b], i) => {
                  const Icon = hoodIcons[i];
                  return (
                  <li key={t} className="flex gap-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10"><Icon className="h-5 w-5 text-route-300" aria-hidden /></span>
                    <div><h3 className="font-semibold">{t}</h3><p className="mt-0.5 text-sm text-slate-300">{b}</p></div>
                  </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>

        {/* ============ FAQ ============ */}
        <section id="faq" className="scroll-mt-28 bg-white">
          <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 md:py-28">
            <div data-reveal>
              <Eyebrow>{c.faqEyebrow}</Eyebrow>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{c.faqTitle}</h2>
            </div>
            <div className="mt-8 divide-y divide-slate-200 rounded-2xl border border-slate-200" data-reveal>
              {faqs.map(({ q, a }) => (
                <details key={q} className="group p-5 open:bg-slate-50">
                  <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                    {q}
                    <span className="text-xl leading-none text-slate-400 transition-transform duration-200 group-open:rotate-45" aria-hidden>+</span>
                  </summary>
                  <p className="mt-2 text-slate-600">{a}</p>
                </details>
              ))}
            </div>
            <Link href="/faq" className="mt-6 inline-flex min-h-[44px] items-center gap-2 font-semibold text-safety hover:underline">{c.allFaqs} <ArrowRight className="h-4 w-4" aria-hidden /></Link>
          </div>
        </section>

        <CreatorSection />

        {/* ============ CTA ============ */}
        <section className="px-4 pb-20 sm:px-6">
          <div className="relative isolate mx-auto max-w-7xl overflow-hidden rounded-3xl bg-ink p-8 text-white md:p-14" data-reveal>
            <div aria-hidden className="sp-aurora absolute -right-20 -top-20 -z-10 h-80 w-80 rounded-full bg-safety-500/35 blur-[100px]" />
            <div aria-hidden className="sp-aurora-2 absolute -bottom-24 left-10 -z-10 h-72 w-72 rounded-full bg-route-400/30 blur-[100px]" />
            <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
              <div className="max-w-xl">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{c.ctaTitle}</h2>
                <p className="mt-3 text-lg text-slate-300">{c.ctaBody}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href={primaryHref} className="inline-flex min-h-[52px] items-center gap-2 rounded-xl bg-safety-500 px-6 font-semibold text-ink transition-colors hover:bg-safety-400">
                  {signedIn ? c.openYourDashboard : c.getStarted} <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <a href={LINKS.apk} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[52px] items-center gap-2 rounded-xl border border-white/20 px-6 font-semibold transition-colors hover:bg-white/10">
                  <Download className="h-4 w-4" aria-hidden /> {c.downloadApk}
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
