'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X, FlaskConical } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { ROLE_HOME } from '@/lib/firebase';
import { Logo } from '@/components/Logo';
import { useLang, LangSwitch } from './i18n';
import { CHROME } from './content';

const NAV = [
  { href: '/#features', key: 'features' },
  { href: '/#app', key: 'app' },
  { href: '/how-it-works', key: 'how' },
  { href: '/privacy', key: 'privacy' },
  { href: '/about', key: 'about' },
  { href: '/faq', key: 'faq' },
] as const;

/** Fixed marketing header with a pilot/beta notice bar. Transparent over dark heroes until scrolled. */
export function SiteHeader() {
  const { profile, loading } = useAuth();
  const signedIn = !loading && !!profile;
  const pathname = usePathname();
  const { lang } = useLang();
  const c = CHROME[lang];
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const solid = scrolled || open;

  return (
    <div className="fixed inset-x-0 top-0 z-50">
      {/* Pilot / beta notice */}
      <div className="bg-gradient-to-r from-safety-500 via-amber-400 to-safety-500 text-ink">
        <p className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-1.5 text-center text-xs font-semibold sm:text-sm">
          <FlaskConical className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            <span className="rounded bg-ink px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-safety-400">{c.beta}</span>{' '}
            {c.notice}{' '}
            <Link href="/about#pilot" className="underline underline-offset-2 hover:no-underline">{c.learnMore}</Link>
          </span>
        </p>
      </div>

      <header className={`text-white transition-colors duration-300 ${solid ? 'border-b border-white/10 bg-ink/95 backdrop-blur-md' : 'bg-transparent'}`}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" aria-label="SmartPothole AI home" className="flex items-center gap-2">
            <Logo compact />
            <span className="rounded-full border border-safety-400/50 bg-safety-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-safety-400">{c.beta}</span>
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-0.5 whitespace-nowrap text-sm xl:flex">
            {NAV.map((n) => {
              const current = !n.href.includes('#') && pathname === n.href;
              return (
                <Link key={n.href} href={n.href} aria-current={current ? 'page' : undefined}
                  className={`rounded-lg px-3 py-2 transition-colors ${current ? 'bg-white/10 text-white' : 'text-slate-300 hover:text-white'}`}>
                  {c.nav[n.key]}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1 whitespace-nowrap text-sm sm:gap-2">
            <LangSwitch className="hidden sm:inline-flex" />
            {signedIn ? (
              <Link href={ROLE_HOME[profile!.role]} className="rounded-xl bg-safety-500 px-4 py-2.5 font-semibold text-ink transition-colors hover:bg-safety-400">{c.openDashboard}</Link>
            ) : (
              <>
                <Link href="/login" className="hidden rounded-xl px-3 py-2.5 font-medium text-slate-200 hover:text-white sm:inline-flex">{c.signIn}</Link>
                <Link href="/register" className="rounded-xl bg-safety-500 px-4 py-2.5 font-semibold text-ink transition-colors hover:bg-safety-400">{c.createAccount}</Link>
              </>
            )}
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? c.closeMenu : c.openMenu}
              className="grid h-11 w-11 place-items-center rounded-xl text-slate-200 hover:bg-white/10 hover:text-white xl:hidden">
              {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
            </button>
          </div>
        </div>

        {open && (
          <nav id="mobile-nav" aria-label="Main" className="border-t border-white/10 px-4 pb-4 pt-2 xl:hidden">
            <ul className="grid gap-1">
              {NAV.map((n) => (
                <li key={n.href}><Link href={n.href} onClick={() => setOpen(false)} className="flex min-h-[48px] items-center rounded-lg px-3 text-base text-slate-200 hover:bg-white/10 hover:text-white">{c.nav[n.key]}</Link></li>
              ))}
              {!signedIn && <li><Link href="/login" className="flex min-h-[48px] items-center rounded-lg px-3 text-base text-slate-200 hover:bg-white/10 hover:text-white">{c.signIn}</Link></li>}
            </ul>
            <LangSwitch className="mt-3 sm:hidden" />
          </nav>
        )}
      </header>
    </div>
  );
}
