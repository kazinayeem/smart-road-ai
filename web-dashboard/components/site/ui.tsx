'use client';

import { useEffect } from 'react';

export { LINKS } from './links';

/** Fades/slides in every [data-reveal] element as it scrolls into view. No-op under reduced motion. */
export function useReveal() {
  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    root.classList.add('sp-reveal-ready');
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
      }),
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    );
    document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
    return () => { io.disconnect(); root.classList.remove('sp-reveal-ready'); };
  }, []);
}

/** Mount inside a server-rendered page to enable scroll reveals there. */
export function RevealOnScroll() {
  useReveal();
  return null;
}

export function Eyebrow({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return <p className={`text-sm font-semibold uppercase tracking-wider ${dark ? 'text-safety-400' : 'text-safety'}`}>{children}</p>;
}

export function Phone({ src, alt, className = '', priority = false, children }: { src: string; alt: string; className?: string; priority?: boolean; children?: React.ReactNode }) {
  return (
    <div className={`rounded-[2.4rem] border border-white/15 bg-ink-900 p-2 shadow-2xl shadow-black/50 ${/\b(absolute|fixed|sticky)\b/.test(className) ? '' : 'relative'} ${className}`}>
      <div className="relative overflow-hidden rounded-[2rem] bg-ink-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} width={576} height={1278} loading={priority ? 'eager' : 'lazy'} decoding="async" className="block h-auto w-full" />
        {children}
      </div>
    </div>
  );
}

export function BrowserFrame({ src, alt, url, width, height }: { src: string; alt: string; url: string; width: number; height: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <span className="h-3 w-3 rounded-full bg-red-400" aria-hidden />
        <span className="h-3 w-3 rounded-full bg-amber-400" aria-hidden />
        <span className="h-3 w-3 rounded-full bg-green-400" aria-hidden />
        <span className="ml-3 truncate rounded-md bg-white px-3 py-1 text-xs text-slate-500 ring-1 ring-slate-200">{url}</span>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} width={width} height={height} loading="lazy" decoding="async" className="block h-auto w-full" />
    </div>
  );
}

/** Dark hero band used at the top of the inner marketing pages. */
export function PageHero({ eyebrow, title, intro, children }: { eyebrow: string; title: React.ReactNode; intro?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <section className="relative isolate overflow-hidden bg-ink pb-16 pt-32 text-white md:pb-24 md:pt-40">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="sp-grid-bg absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />
        <div className="sp-aurora absolute -left-[10%] -top-[30%] h-[60vh] w-[60vh] rounded-full bg-safety-500/25 blur-[120px]" />
        <div className="sp-aurora-2 absolute -right-[10%] top-0 h-[55vh] w-[55vh] rounded-full bg-route-400/20 blur-[120px]" />
      </div>
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <Eyebrow dark>{eyebrow}</Eyebrow>
        <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">{title}</h1>
        {intro && <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-300 sm:text-xl">{intro}</p>}
        {children}
      </div>
    </section>
  );
}
