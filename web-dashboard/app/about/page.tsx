import type { Metadata } from 'next';
import Link from 'next/link';
import { FlaskConical, Target, GraduationCap, Download, PlayCircle, Github, FileText, ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { MarketingPage, EnglishOnlyNote } from '@/components/site/MarketingPage';
import { PageHero, Eyebrow } from '@/components/site/ui';
import { LINKS } from '@/components/site/links';
import { CreatorSection } from '@/components/site/Creator';

export const metadata: Metadata = {
  title: 'About the project',
  description: 'Why SmartPothole AI exists, what the pilot is testing, and who designed, developed and led it.',
};

const testing = [
  'How well the on-phone model finds real potholes on Dhaka roads, in daylight, at night and in rain',
  'Whether the 2-of-3-frame rule and GPS gates keep false reports low',
  'How useful spoken warnings are while riding',
  'Whether merging duplicate sightings gives the city a clean list to work from',
  'How city staff and contractors use the triage and repair workflow',
];

const limits = [
  'Detection accuracy has not yet been measured on a validated road dataset, so we do not publish an accuracy figure.',
  'Data may be reset while the pilot runs.',
  'The service is not operated by, or endorsed by, any city corporation.',
  'Warnings can be missed or wrong. Always ride for the road you see.',
];

const links = [
  { icon: Download, label: 'Download the Android APK', href: LINKS.apk },
  { icon: PlayCircle, label: 'Watch the demo video', href: LINKS.video },
  { icon: PlayCircle, label: 'Watch the full project video', href: LINKS.projectVideo },
  { icon: Github, label: 'Read the source code on GitHub', href: LINKS.github },
];

export default function AboutPage() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="About the project"
        title={<>Safer roads, built from the <span className="text-safety-400">rider&apos;s seat</span></>}
        intro="SmartPothole AI started with a simple question: if almost every rider carries a phone with a camera and GPS, why do potholes still go unreported for months?"
      />

      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 md:py-24">
          <EnglishOnlyNote />
          <div className="grid gap-10 md:grid-cols-2">
            <div data-reveal>
              <Target className="h-8 w-8 text-safety" aria-hidden />
              <h2 className="mt-4 text-2xl font-bold tracking-tight">Our mission</h2>
              <p className="mt-3 leading-relaxed text-slate-600">Potholes hurt the people with the least protection first: motorcyclists, cyclists, rickshaw drivers and pedestrians. They are reported late, if at all, and the person who reported one rarely hears whether it was fixed.</p>
              <p className="mt-3 leading-relaxed text-slate-600">SmartPothole AI closes that gap. Riders detect damage as they travel, everyone nearby is warned, and city engineers get reports they can trust, with an accountable path all the way to a finished repair.</p>
            </div>
            <div data-reveal>
              <GraduationCap className="h-8 w-8 text-route" aria-hidden />
              <h2 className="mt-4 text-2xl font-bold tracking-tight">Where it comes from</h2>
              <p className="mt-3 leading-relaxed text-slate-600">SmartPothole AI is a capstone project for SE 331 Software Engineering Design at the Department of Software Engineering, Daffodil International University (section 42_H1), supervised by Dipta Dipayan Kar.</p>
              <p className="mt-3 leading-relaxed text-slate-600">The whole system, from the AI model to the Android app, web dashboard, backend and documents, was designed, developed and led by Mohammad Ali Nayeem.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="pilot" className="scroll-mt-28 bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 md:py-24">
          <div data-reveal>
            <p className="inline-flex items-center gap-2 rounded-full bg-safety-50 px-3 py-1 text-sm font-semibold text-safety"><FlaskConical className="h-4 w-4" aria-hidden /> Pilot project · Beta</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight">What &quot;pilot&quot; means here</h2>
            <p className="mt-3 max-w-3xl text-lg text-slate-600">Everything on this site works, but it is being tested with real riders before anyone should depend on it. Here is what the pilot is checking, and what to keep in mind meanwhile.</p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6" data-reveal>
              <h3 className="font-semibold">What we are testing</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                {testing.map((t) => <li key={t} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-route" aria-hidden />{t}</li>)}
              </ul>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6" data-reveal>
              <h3 className="font-semibold text-amber-900">Keep in mind</h3>
              <ul className="mt-4 space-y-3 text-sm text-amber-900">
                {limits.map((t) => <li key={t} className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{t}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <CreatorSection id="team" />

      <section className="bg-white pb-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div data-reveal>
            <Eyebrow>Group members</Eyebrow>
            <p className="mt-3 text-slate-600">Mubashir Alam (232-35-682) and Nayem Miah (232-35-628) took part in the group discussion for the SE 331 submission.</p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2" data-reveal>
            {links.map(({ icon: Icon, label, href }) => (
              <a key={href} href={href} target="_blank" rel="noopener noreferrer" className="group flex min-h-[64px] items-center justify-between gap-4 rounded-2xl border border-slate-200 p-5 transition-colors hover:border-safety-500/40 hover:bg-safety-50/40">
                <span className="flex items-center gap-3 font-semibold"><Icon className="h-5 w-5 text-safety" aria-hidden />{label}</span>
                <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </a>
            ))}
            <Link href="/how-it-works" className="group flex min-h-[64px] items-center justify-between gap-4 rounded-2xl border border-slate-200 p-5 transition-colors hover:border-safety-500/40 hover:bg-safety-50/40">
              <span className="flex items-center gap-3 font-semibold"><FileText className="h-5 w-5 text-safety" aria-hidden />How it works, step by step</span>
              <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </MarketingPage>
  );
}
