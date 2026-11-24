'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { UserRole } from '@/types';
import { ROLE_HOME } from '@/lib/firebase';
import { useAuth } from './AuthProvider';

/**
 * Client-side route guard: sends signed-out users to /login and users with the wrong role to
 * their own dashboard. This is for navigation only — data access is enforced by the database rules.
 */
export function RequireRole({ roles, children }: { roles: UserRole[]; children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const allowed = !!profile && roles.includes(profile.role);

  useEffect(() => {
    if (loading) return;
    if (!profile) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (!roles.includes(profile.role)) router.replace(ROLE_HOME[profile.role]);
  }, [loading, profile, roles, router, pathname]);

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600 gap-2" role="status">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Checking your access…
      </div>
    );
  }
  return <>{children}</>;
}
