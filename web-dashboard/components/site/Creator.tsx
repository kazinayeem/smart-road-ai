'use client';

import { ExternalLink, Github, Cpu, Smartphone, LayoutDashboard, Database, Palette, FlaskConical } from 'lucide-react';
import { LINKS } from './ui';
import { useLang } from './i18n';

export const PORTFOLIO = 'https://nayeem.bornosoft.bd';

const COPY = {
  en: {
    eyebrow: 'The person behind it',
    credit: 'Designed, developed and led by',
    role: 'Team lead · Full-stack and AI engineer',
    body: 'Mohammad Ali Nayeem planned, designed and built SmartPothole AI end to end: the AI model, the Android app, the web dashboard, the Firebase backend, testing, deployment and the project documents.',
    portfolio: 'View portfolio',
    github: 'Project on GitHub',
    did: ['AI / ML model', 'Android app', 'Web dashboard', 'Firebase backend', 'UI and UX design', 'Testing and deployment'],
    photoAlt: 'Portrait of Mohammad Ali Nayeem',
  },
  bn: {
    eyebrow: 'যিনি এটি তৈরি করেছেন',
    credit: 'ডিজাইন, ডেভেলপমেন্ট ও নেতৃত্বে',
    role: 'টিম লিড · ফুল-স্ট্যাক ও AI ইঞ্জিনিয়ার',
    body: 'মোহাম্মদ আলী নাঈম SmartPothole AI-এর পরিকল্পনা, ডিজাইন ও নির্মাণ শুরু থেকে শেষ পর্যন্ত করেছেন: AI মডেল, অ্যান্ড্রয়েড অ্যাপ, ওয়েব ড্যাশবোর্ড, Firebase ব্যাকএন্ড, টেস্টিং, ডিপ্লয়মেন্ট ও প্রকল্পের নথিপত্র।',
    portfolio: 'পোর্টফোলিও দেখুন',
    github: 'GitHub-এ প্রকল্প',
    did: ['AI / ML মডেল', 'অ্যান্ড্রয়েড অ্যাপ', 'ওয়েব ড্যাশবোর্ড', 'Firebase ব্যাকএন্ড', 'UI ও UX ডিজাইন', 'টেস্টিং ও ডিপ্লয়মেন্ট'],
    photoAlt: 'মোহাম্মদ আলী নাঈমের ছবি',
  },
};
const didIcons = [Cpu, Smartphone, LayoutDashboard, Database, Palette, FlaskConical];

/** "Designed, developed and led by Mohammad Ali Nayeem" with photo and portfolio link. */
export function CreatorSection({ id = 'creator' }: { id?: string }) {
  const { lang } = useLang();
  const c = COPY[lang];
  return (
    <section id={id} className="scroll-mt-28 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28">
        <div className="relative isolate overflow-hidden rounded-3xl bg-ink text-white" data-reveal>
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="sp-grid-bg absolute inset-0 [mask-image:radial-gradient(ellipse_at_left,black_20%,transparent_70%)]" />
            <div className="sp-aurora absolute -left-20 bottom-[-30%] h-[28rem] w-[28rem] rounded-full bg-safety-500/35 blur-[110px]" />
            <div className="sp-aurora-2 absolute -right-10 -top-20 h-80 w-80 rounded-full bg-route-400/25 blur-[100px]" />
          </div>
          <div className="grid items-end gap-6 md:grid-cols-[minmax(0,360px)_1fr] md:gap-10">
            <div className="relative mx-auto w-full max-w-[340px] md:mx-0">
              <div aria-hidden className="absolute inset-x-8 bottom-0 top-16 rounded-t-full bg-gradient-to-t from-safety-500/40 via-safety-500/15 to-transparent" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/team/mohammad-ali-nayeem.webp" alt={c.photoAlt} width={460} height={460} loading="lazy" decoding="async" className="relative block h-auto w-full" />
            </div>
            <div className="px-6 pb-10 pt-2 md:py-14 md:pr-12">
              <p className="text-sm font-semibold uppercase tracking-wider text-safety-400">{c.eyebrow}</p>
              <p className="mt-3 text-lg text-slate-300">{c.credit}</p>
              <h2 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">Mohammad Ali Nayeem</h2>
              <p className="mt-2 font-medium text-route-300">{c.role}</p>
              <p className="mt-5 max-w-2xl leading-relaxed text-slate-300">{c.body}</p>
              <ul className="mt-6 flex flex-wrap gap-2">
                {c.did.map((d, i) => {
                  const Icon = didIcons[i];
                  return (
                    <li key={d} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-slate-200">
                      <Icon className="h-4 w-4 text-safety-400" aria-hidden /> {d}
                    </li>
                  );
                })}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href={PORTFOLIO} target="_blank" rel="noopener" className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-safety-500 px-5 font-semibold text-ink transition-colors hover:bg-safety-400">
                  {c.portfolio} <span className="font-normal opacity-80">· nayeem.bornosoft.bd</span> <ExternalLink className="h-4 w-4" aria-hidden />
                </a>
                <a href={LINKS.github} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-white/20 px-5 font-semibold transition-colors hover:bg-white/10">
                  <Github className="h-4 w-4" aria-hidden /> {c.github}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** One-line credit for the footer. */
export function CreatorCredit() {
  const { lang } = useLang();
  const c = COPY[lang];
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5">
      {c.credit}{' '}
      <a href={PORTFOLIO} target="_blank" rel="noopener" className="font-semibold text-slate-700 underline-offset-2 hover:underline">Mohammad Ali Nayeem</a>
    </span>
  );
}
