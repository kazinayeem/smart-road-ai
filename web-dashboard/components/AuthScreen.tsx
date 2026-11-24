'use client';

import React, { useState } from 'react';
import { UserProfile } from '@/types';
import { loginWithEmail, registerCitizen, DEMO_CREDENTIALS } from '@/lib/firebase';
import {
  Shield,
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight,
  Building2,
  HardHat,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Key
} from 'lucide-react';

interface AuthScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDemoCredentials, setShowDemoCredentials] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setError('Please provide both email and password.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const user = await loginWithEmail(loginEmail, loginPassword);
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPassword) {
      setError('Please fill in all required fields.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const user = await registerCitizen(regName, regEmail, regPhone, regPassword);
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please check your information.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDemoAccount = (email: string) => {
    setLoginEmail(email);
    setLoginPassword('DemoPassword123!');
    setActiveTab('LOGIN');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      {/* Background accents */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-md w-full space-y-6">
        {/* Branding Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-blue-600 text-white items-center justify-center shadow-lg shadow-blue-500/20">
            <Shield className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              SmartPothole AI
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Civic Road Maintenance &amp; Defect Management Platform
            </p>
          </div>
        </div>

        {/* Card Container */}
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
          {/* Tabs */}
          <div className="grid grid-cols-2 border-b border-slate-100 bg-slate-50/70 p-1.5 m-2 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab('LOGIN');
                setError(null);
              }}
              className={`py-2.5 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'LOGIN'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('REGISTER');
                setError(null);
              }}
              className={`py-2.5 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'REGISTER'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Register Citizen
            </button>
          </div>

          <div className="p-6 pt-4 space-y-5">
            {error && (
              <div className="p-3 bg-red-50 text-red-800 rounded-xl border border-red-200 text-xs flex items-center space-x-2 animate-in fade-in">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {activeTab === 'LOGIN' ? (
              /* LOGIN FORM */
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Account Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="name@pothole.org"
                      required
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <span>Authenticating...</span>
                  ) : (
                    <>
                      <span>Sign In to Dashboard</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* REGISTER CITIZEN FORM */
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Rahim Ahmed"
                      required
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="citizen@domain.com"
                      required
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Phone Number (Optional)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="+88017XXXXXXXX"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="text-[11px] text-slate-500">
                  Registered accounts are granted <strong>CITIZEN</strong> role. Administrative roles are provisioned exclusively by municipal authorities.
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {isLoading ? <span>Registering...</span> : <span>Create Citizen Account</span>}
                </button>
              </form>
            )}

            {/* Development / Evaluator Credentials Quick-Fill Guide */}
            <div className="border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setShowDemoCredentials(!showDemoCredentials)}
                className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-500 hover:text-slate-800"
              >
                <div className="flex items-center space-x-1.5">
                  <Key className="h-3.5 w-3.5 text-blue-600" />
                  <span>Evaluation &amp; Predefined Demo Accounts</span>
                </div>
                {showDemoCredentials ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>

              {showDemoCredentials && (
                <div className="mt-2.5 space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-[11px]">
                  <p className="text-slate-500 text-[10px]">
                    Click any seeded account below to populate credentials:
                  </p>

                  {/* City Corporation */}
                  <button
                    type="button"
                    onClick={() => handleSelectDemoAccount(DEMO_CREDENTIALS.CITY_CORPORATION.email)}
                    className="w-full text-left p-2 rounded-xl bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-800 flex items-center space-x-1">
                        <Building2 className="h-3 w-3 text-blue-600" />
                        <span>City Corporation Administrator</span>
                      </div>
                      <div className="text-slate-500 font-mono text-[10px]">
                        {DEMO_CREDENTIALS.CITY_CORPORATION.email}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-blue-600">Select</span>
                  </button>

                  {/* Contractor */}
                  <button
                    type="button"
                    onClick={() => handleSelectDemoAccount(DEMO_CREDENTIALS.CONTRACTOR.email)}
                    className="w-full text-left p-2 rounded-xl bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-800 flex items-center space-x-1">
                        <HardHat className="h-3 w-3 text-amber-600" />
                        <span>Road Maintenance Contractor</span>
                      </div>
                      <div className="text-slate-500 font-mono text-[10px]">
                        {DEMO_CREDENTIALS.CONTRACTOR.email}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-amber-600">Select</span>
                  </button>

                  {/* Citizen */}
                  <button
                    type="button"
                    onClick={() => handleSelectDemoAccount(DEMO_CREDENTIALS.CITIZEN.email)}
                    className="w-full text-left p-2 rounded-xl bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-800 flex items-center space-x-1">
                        <User className="h-3 w-3 text-emerald-600" />
                        <span>Citizen Reporter</span>
                      </div>
                      <div className="text-slate-500 font-mono text-[10px]">
                        {DEMO_CREDENTIALS.CITIZEN.email}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600">Select</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="text-center text-[11px] text-slate-500">
          Strict role-based access enforced by Firebase security rules. Guest access disabled.
        </div>
      </div>
    </div>
  );
};
