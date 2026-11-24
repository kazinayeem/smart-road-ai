'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Navbar } from './Navbar';
import { useAuth } from './AuthProvider';
import { logoutUser } from '@/lib/firebase';

export interface NavItem { href: string; label: string }

export function AppShell({ title, nav, children }: { title: string; nav: NavItem[]; children: React.ReactNode }) {
  const { profile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        currentUser={profile}
        onLogout={async () => {
          await logoutUser();
          router.replace('/login');
        }}
      />
      <nav aria-label="Section" className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-1 overflow-x-auto">
          {nav.map((n) => {
            const active = pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? 'page' : undefined}
                className={`whitespace-nowrap px-3 py-3 text-sm font-medium border-b-2 ${
                  active ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </div>
      </nav>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        {children}
      </main>
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        SmartPothole AI · Map data © OpenStreetMap contributors
      </footer>
    </div>
  );
}
