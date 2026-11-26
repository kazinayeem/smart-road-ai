'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type Lang = 'en' | 'bn';
const KEY = 'sp-lang';

type Ctx = { lang: Lang; setLang: (l: Lang) => void };
const LangContext = createContext<Ctx>({ lang: 'en', setLang: () => {} });

/** Site language. English is the default; a visitor's choice is remembered in localStorage. */
export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY);
      if (saved === 'bn' || saved === 'en') setLangState(saved);
    } catch { /* storage blocked: stay on English */ }
  }, []);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { window.localStorage.setItem(KEY, l); } catch { /* ignore */ }
  }, []);

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);

/** Two-option EN / বাংলা switch. */
export function LangSwitch({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <div role="group" aria-label="Language / ভাষা" className={`inline-flex rounded-lg border border-white/15 bg-white/5 p-0.5 text-xs font-semibold ${className}`}>
      {([['en', 'EN', 'English'], ['bn', 'বাং', 'বাংলা']] as const).map(([code, short, full]) => (
        <button key={code} type="button" onClick={() => setLang(code)} aria-pressed={lang === code} lang={code} title={full}
          className={`min-h-[36px] min-w-[40px] rounded-md px-2 transition-colors ${lang === code ? 'bg-white text-ink' : 'text-slate-300 hover:text-white'}`}>
          <span aria-hidden>{short}</span><span className="sr-only">{full}</span>
        </button>
      ))}
    </div>
  );
}
