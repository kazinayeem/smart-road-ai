'use client';

import React from 'react';
import { UserProfile } from '@/types';
import { Shield, LogOut, User, Building2, HardHat } from 'lucide-react';

interface NavbarProps {
  currentUser: UserProfile | null;
  onLogout: () => void;
  onOpenLoginModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogout,
  onOpenLoginModal,
}) => {
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'CITY_CORPORATION':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Building2 className="h-3 w-3 text-blue-600" />
            <span>City Corporation Admin</span>
          </span>
        );
      case 'CONTRACTOR':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <HardHat className="h-3 w-3 text-amber-600" />
            <span>Authorized Contractor</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <User className="h-3 w-3 text-emerald-600" />
            <span>Citizen Reporter</span>
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Branding */}
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-slate-900 tracking-tight">SmartPothole</span>
              <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Civic AI
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Road Maintenance Management Platform
            </p>
          </div>
        </div>

        {/* User Identity & Logout - Production Minimal Clean Design */}
        <div className="flex items-center space-x-3">
          {currentUser ? (
            <>
              {/* Role Badge */}
              <div className="hidden md:block">
                {getRoleBadge(currentUser.role)}
              </div>

              {/* User Chip */}
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
                <div className="h-8 w-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold text-slate-800 leading-tight">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    {currentUser.department || currentUser.companyName || currentUser.email}
                  </div>
                </div>
              </div>

              {/* Sign Out Button */}
              <button
                onClick={onLogout}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-red-700 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-colors"
                title="Sign out of SmartPothole"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </>
          ) : (
            onOpenLoginModal && (
              <button
                onClick={onOpenLoginModal}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
              >
                Sign In
              </button>
            )
          )}
        </div>
      </div>
    </header>
  );
};
