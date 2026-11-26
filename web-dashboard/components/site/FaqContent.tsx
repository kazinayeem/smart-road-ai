'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { MarketingPage } from './MarketingPage';
import { PageHero } from './ui';
import { useLang } from './i18n';
import { FAQS } from './content';

const T = {
  en: { eyebrow: 'Help', title: 'Frequently asked questions', intro: 'Answers about the pilot, your privacy, using the app and accounts.', search: 'Search questions', none: 'No questions match your search.', more: 'Still stuck?', ask: 'Ask on GitHub', policy: 'Read the privacy policy' },
  bn: { eyebrow: 'সাহায্য', title: 'সাধারণ প্রশ্নোত্তর', intro: 'পাইলট, আপনার গোপনীয়তা, অ্যাপ ব্যবহার ও অ্যাকাউন্ট নিয়ে উত্তর।', search: 'প্রশ্ন খুঁজুন', none: 'আপনার খোঁজার সাথে মেলে এমন কোনো প্রশ্ন নেই।', more: 'আরও প্রশ্ন আছে?', ask: 'GitHub-এ জিজ্ঞেস করুন', policy: 'গোপনীয়তা নীতি পড়ুন' },
};

export function FaqContent() {
  const { lang } = useLang();
  const t = T[lang];
  const [q, setQ] = useState('');
  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return FAQS[lang]
      .map((g) => ({ ...g, items: needle ? g.items.filter((i) => (i.q + ' ' + i.a).toLowerCase().includes(needle)) : g.items }))
      .filter((g) => g.items.length);
  }, [lang, q]);

  return (
    <MarketingPage>
      <PageHero eyebrow={t.eyebrow} title={t.title} intro={t.intro}>
        <label className="relative mt-8 block max-w-xl">
          <span className="sr-only">{t.search}</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search}
            className="h-14 w-full rounded-2xl border border-white/15 bg-white/10 pl-12 pr-4 text-base text-white placeholder:text-slate-400 focus:border-safety-400 focus:outline-none focus:ring-2 focus:ring-safety-400/40" />
        </label>
      </PageHero>

      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 md:py-20">
        {groups.length === 0 && <p className="rounded-2xl border border-slate-200 p-8 text-center text-slate-600" role="status">{t.none}</p>}
        <div className="space-y-12">
          {groups.map((g) => (
            <section key={g.group} aria-labelledby={`g-${g.group}`}>
              <h2 id={`g-${g.group}`} className="text-xl font-bold text-slate-900">{g.group}</h2>
              <div className="mt-4 divide-y divide-slate-200 rounded-2xl border border-slate-200">
                {g.items.map(({ q: question, a }) => (
                  <details key={question} className="group p-5 open:bg-slate-50" open={!!q.trim()}>
                    <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                      {question}
                      <span className="text-xl leading-none text-slate-400 transition-transform duration-200 group-open:rotate-45" aria-hidden>+</span>
                    </summary>
                    <p className="mt-2 leading-relaxed text-slate-600">{a}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-start gap-4 rounded-2xl bg-safety-50 p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold text-slate-900">{t.more}</p>
          <div className="flex flex-wrap gap-3">
            <a href="https://github.com/kazinayeem/smart-road-ai/issues" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center rounded-xl bg-safety px-4 font-semibold text-white hover:bg-orange-800">{t.ask}</a>
            <Link href="/privacy" className="inline-flex min-h-[44px] items-center rounded-xl border border-slate-300 px-4 font-semibold text-slate-800 hover:bg-white">{t.policy}</Link>
          </div>
        </div>
      </div>
    </MarketingPage>
  );
}
