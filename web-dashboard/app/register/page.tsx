'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthScreen } from '@/components/AuthScreen';
import { useAuth } from '@/components/AuthProvider';
import { ROLE_HOME } from '@/lib/firebase';

export default function RegisterPage() {
  const router = useRouter();
  const { profile, loading } = useAuth();
  useEffect(() => {
    if (!loading && profile) router.replace(ROLE_HOME[profile.role]);
  }, [loading, profile, router]);
  return <AuthScreen mode="REGISTER" onLoginSuccess={(u) => router.replace(ROLE_HOME[u.role])} />;
}
