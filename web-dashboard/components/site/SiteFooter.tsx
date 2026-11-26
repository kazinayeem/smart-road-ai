'use client';

import Link from 'next/link';
import { Github } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { LINKS } from './ui';
import { useLang } from './i18n';
import { CHROME } from './content';
import { CreatorCredit, PORTFOLIO } from './Creator';

export function SiteFooter() {
  const { lang } = useLang();
  const c = CHROME[lang];
  const cols = [
    {
      title: c.cols.product,
      links: [
        { href: '/#features', label: c.cols.features },
        { href: '/#app', label: c.cols.android },
        { href: '/#dashboard', label: c.cols.web },
        { href: LINKS.apk, label: c.cols.apk, external: true },
      ],
    },
    {
      title: c.cols.learn,
      links: [
        { href: '/how-it-works', label: c.cols.how },
        { href: '/#video', label: c.cols.video },
        { href: '/about', label: c.cols.about },
        { href: '/faq', label: c.cols.faq },
      ],
    },
    {
      title: c.cols.legal,
      links: [
        { href: '/privacy', label: c.cols.privacy },
        { href: '/terms', label: c.cols.terms },
        { href: '/cookies', label: c.cols.cookies },
        { href: LINKS.issues, label: c.cols.report, external: true },
      ],
    },
  ];

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-4">
          <Logo className="text-slate-900" />
          <p className="max-w-sm text-sm leading-relaxed text-slate-600">{c.tagline}</p>
          <p className="inline-flex items-center gap-2 rounded-full bg-safety-50 px-3 py-1 text-xs font-semibold text-safety">
            <span className="h-1.5 w-1.5 rounded-full bg-safety-500" aria-hidden /> {c.pilot}
          </p>
        </div>
        {cols.map((col) => (
          <div key={col.title}>
            <h2 className="text-sm font-semibold text-slate-900">{col.title}</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {col.links.map((l) => (
                <li key={l.href}>
                  {'external' in l && l.external ? (
                    <a href={l.href} target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-slate-900">{l.label}</a>
                  ) : (
                    <Link href={l.href} className="text-slate-600 hover:text-slate-900">{l.label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-100">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-sm text-slate-500 sm:px-6 md:flex-row md:items-center md:justify-between">
          <p>
            <CreatorCredit /> ·{' '}
            <a href={PORTFOLIO} target="_blank" rel="noopener" className="underline hover:text-slate-700">nayeem.bornosoft.bd</a> ·{' '}
            <a href={LINKS.github} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline hover:text-slate-700">
              <Github className="h-3.5 w-3.5" aria-hidden /> {c.source}
            </a>
          </p>
          <p>{c.disclaimer}</p>
        </div>
      </div>
    </footer>
  );
}
