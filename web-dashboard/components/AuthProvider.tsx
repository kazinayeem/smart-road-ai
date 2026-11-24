'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from '@/types';
import { subscribeToAuth } from '@/lib/firebase';

interface AuthState {
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({ profile: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ profile: null, loading: true });
  useEffect(() => subscribeToAuth((profile) => setState({ profile, loading: false })), []);
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
