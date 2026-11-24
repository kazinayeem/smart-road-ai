'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthScreen } from '@/components/AuthScreen';
import { useAuth } from '@/components/AuthProvider';
import { ROLE_HOME } from '@/lib/firebase';
import { UserProfile } from '@/types';

function safeNext(next: string | null, profile: UserProfile) {
  // Only same-site relative paths; anything else falls back to the role's home.
  return next && next.startsWith('/') && !next.startsWith('//') ? next : ROLE_HOME[profile.role];
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { profile, loading } = useAuth();
  useEffect(() => {
    if (!loading && profile) router.replace(safeNext(params.get('next'), profile));
  }, [loading, profile, params, router]);
  return <AuthScreen mode="LOGIN" onLoginSuccess={(u) => router.replace(safeNext(params.get('next'), u))} />;
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
