'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { UserProfile } from '@/types';
import { login, registerCitizen, requestPasswordReset } from '@/lib/firebase';
import { Shield, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { DEMO_ACCOUNTS, DEMO_LOGIN_ENABLED } from '@/lib/demoAccounts';

const VEHICLES: Record<string, string> = {
  MOTORCYCLE: 'Motorcycle / Bike',
  CAR: 'Car',
  BICYCLE: 'Bicycle',
  CNG: 'CNG / Auto-rickshaw',
  BUS: 'Bus',
  TRUCK: 'Truck',
  WALKING: 'Walking',
};

interface AuthScreenProps {
  mode: 'LOGIN' | 'REGISTER';
  onLoginSuccess: (user: UserProfile) => void;
}

const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20';
const labelCls = 'block text-sm font-medium text-slate-700 mb-1.5';

export const AuthScreen: React.FC<AuthScreenProps> = ({ mode, onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicle, setVehicle] = useState('MOTORCYCLE');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (mode === 'LOGIN' && (!identifier || !password)) {
      setError('Enter your username or email and your password.');
      return;
    }
    setIsLoading(true);
    try {
      const user =
        mode === 'LOGIN'
          ? await login(identifier, password)
          : await registerCitizen({ name, username, email, phone, password, vehicleType: vehicle });
      onLoginSuccess(user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const demoLogin = async (email: string, pw: string) => {
    setError(null);
    setIsLoading(true);
    try {
      onLoginSuccess(await login(email, pw));
    } catch (err: unknown) {
      setError(
        (err instanceof Error ? err.message : 'Sign-in failed.') +
          ' Demo accounts must be seeded first (scripts: npm run seed:emulator or seed:prod).'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const forgot = async () => {
    const target = identifier.includes('@') ? identifier : email;
    if (!target.includes('@')) {
      setError('Enter the email address on your account in the field above, then choose “Forgot password”.');
      return;
    }
    await requestPasswordReset(target);
    setInfo('If an account exists for that email, a reset link is on its way.');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex h-12 w-12 rounded-2xl bg-blue-600 text-white items-center justify-center" aria-label="SmartPothole AI home">
            <Shield className="h-7 w-7" aria-hidden />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">
            {mode === 'LOGIN' ? 'Sign in to SmartPothole AI' : 'Create your account'}
          </h1>
          <p className="text-sm text-slate-600">
            {mode === 'LOGIN'
              ? 'Use your username or email.'
              : 'New accounts are citizen accounts. City and contractor roles are granted by an administrator.'}
          </p>
        </div>

        <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4" noValidate>
          {mode === 'REGISTER' ? (
            <>
              <div>
                <label htmlFor="name" className={labelCls}>Full name</label>
                <input id="name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
              </div>
              <div>
                <label htmlFor="username" className={labelCls}>Username</label>
                <input id="username" className={inputCls} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" aria-describedby="username-help" required />
                <p id="username-help" className="mt-1 text-xs text-slate-500">3–20 letters, digits, “_” or “.”. Not case-sensitive.</p>
              </div>
              <div>
                <label htmlFor="email" className={labelCls}>Email (for password recovery)</label>
                <input id="email" type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
              </div>
              <div>
                <label htmlFor="phone" className={labelCls}>Phone (optional)</label>
                <input id="phone" type="tel" className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
              </div>
              <fieldset>
                <legend className={labelCls}>Vehicle</legend>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(VEHICLES).map(([key, label]) => (
                    <label
                      key={key}
                      className={`flex min-h-[44px] cursor-pointer items-center rounded-xl border px-3 text-sm ${
                        vehicle === key ? 'border-blue-600 bg-blue-50 text-blue-800 font-medium' : 'border-slate-300 text-slate-700'
                      }`}
                    >
                      <input type="radio" name="vehicle" value={key} checked={vehicle === key} onChange={() => setVehicle(key)} className="sr-only" />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
            </>
          ) : (
            <div>
              <label htmlFor="identifier" className={labelCls}>Username or email</label>
              <input id="identifier" className={inputCls} value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" required />
            </div>
          )}

          <div>
            <label htmlFor="password" className={labelCls}>Password</label>
            <input
              id="password"
              type="password"
              className={inputCls}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'LOGIN' ? 'current-password' : 'new-password'}
              minLength={mode === 'REGISTER' ? 8 : undefined}
              required
            />
          </div>

          {error && (
            <div role="alert" className="flex gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden /> <span>{error}</span>
            </div>
          )}
          {info && (
            <div role="status" className="flex gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" aria-hidden /> <span>{info}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full min-h-[44px] rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {mode === 'LOGIN' ? 'Sign in' : 'Create account'}
          </button>

          {mode === 'LOGIN' && (
            <button type="button" onClick={forgot} className="w-full min-h-[44px] text-sm text-blue-700 hover:underline">
              Forgot password?
            </button>
          )}
        </form>

        {mode === 'LOGIN' && DEMO_LOGIN_ENABLED && (
          <section aria-labelledby="demo-h" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 space-y-2">
            <h2 id="demo-h" className="text-sm font-semibold text-amber-900">Demo quick login (development only)</h2>
            <div className="grid gap-2">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  disabled={isLoading}
                  onClick={() => demoLogin(a.email, a.password)}
                  className="min-h-[44px] rounded-xl border border-amber-300 bg-white px-3 py-2 text-left text-sm hover:bg-amber-100 disabled:opacity-60"
                >
                  <span className="font-medium text-slate-900">{a.label}</span>
                  <span className="block text-xs text-slate-600">{a.username} · {a.email}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <p className="text-center text-sm text-slate-600">
          {mode === 'LOGIN' ? (
            <>New here? <Link href="/register" className="font-medium text-blue-700 hover:underline">Create an account</Link></>
          ) : (
            <>Already registered? <Link href="/login" className="font-medium text-blue-700 hover:underline">Sign in</Link></>
          )}
        </p>
      </div>
    </div>
  );
};
