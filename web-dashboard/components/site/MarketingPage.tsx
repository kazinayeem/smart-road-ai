'use client';

import { FileText, Languages } from 'lucide-react';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';
import { PageHero, RevealOnScroll } from './ui';
import { useLang } from './i18n';

/** Header + footer + scroll reveals for every public page other than home. */
export function MarketingPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">Skip to content</a>
      <SiteHeader />
      <RevealOnScroll />
      <main id="main">{children}</main>
      <SiteFooter />
    </div>
  );
}

/** Shown on English-only pages when the visitor has chosen Bangla. */
export function EnglishOnlyNote() {
  const { lang } = useLang();
  if (lang !== 'bn') return null;
  return (
    <p lang="bn" className="mb-8 flex items-start gap-2 rounded-xl border border-route/20 bg-route-50 px-4 py-3 text-sm text-route">
      <Languages className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      এই পৃষ্ঠাটি বর্তমানে শুধু ইংরেজিতে আছে। বাংলা সংস্করণ শীঘ্রই আসছে।
    </p>
  );
}

export type Section = { id: string; title: string; body: React.ReactNode };

/** Long legal document: hero, sticky table of contents, numbered sections. */
export function LegalDoc({ eyebrow, title, intro, updated, sections }: { eyebrow: string; title: string; intro: React.ReactNode; updated: string; sections: Section[] }) {
  return (
    <MarketingPage>
      <PageHero eyebrow={eyebrow} title={title} intro={intro}>
        <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-slate-300">
          <FileText className="h-4 w-4" aria-hidden /> Last updated {updated}
        </p>
      </PageHero>
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[240px_1fr] lg:py-20">
        <nav aria-label="On this page" className="lg:sticky lg:top-32 lg:self-start">
          <p className="text-sm font-semibold text-slate-900">On this page</p>
          <ol className="mt-3 space-y-1 border-l border-slate-200 text-sm">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="-ml-px block border-l-2 border-transparent py-1.5 pl-4 text-slate-600 hover:border-safety-500 hover:text-slate-900">
                  {i + 1}. {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <article className="sp-prose max-w-3xl">
          <EnglishOnlyNote />
          {sections.map((s, i) => (
            <section key={s.id} aria-labelledby={s.id}>
              <h2 id={s.id} className={i === 0 ? '!mt-0' : ''}>{i + 1}. {s.title}</h2>
              {s.body}
            </section>
          ))}
        </article>
      </div>
    </MarketingPage>
  );
}
