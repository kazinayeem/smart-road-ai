'use client';

import React, { useState, useEffect } from 'react';
import { UserProfile, PotholeReport, Contractor } from '@/types';
import { Navbar } from '@/components/Navbar';
import { AuthScreen } from '@/components/AuthScreen';
import { PotholeMap } from '@/components/PotholeMap';
import { CityCorpDashboard } from '@/components/CityCorpDashboard';
import { ContractorDashboard } from '@/components/ContractorDashboard';
import { CitizenView } from '@/components/CitizenView';
import { ReportDetailModal } from '@/components/ReportDetailModal';
import { DriverMode } from '@/components/DriverMode';
import {
  subscribeToReports,
  getContractors,
  getStoredUser,
  logoutUser
} from '@/lib/firebase';
import {
  Map,
  Radio,
  CheckCircle2,
  Navigation,
  LayoutDashboard,
  ShieldAlert
} from 'lucide-react';

export default function Home() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activeTabMode, setActiveTabMode] = useState<'DASHBOARD' | 'DRIVER_MODE'>('DASHBOARD');
  const [reports, setReports] = useState<PotholeReport[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [selectedReport, setSelectedReport] = useState<PotholeReport | null>(null);
  const [modalReport, setModalReport] = useState<PotholeReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [resetViewTrigger, setResetViewTrigger] = useState<number>(1);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [quickMarkGps, setQuickMarkGps] = useState<{ lat: number; lng: number } | null>(null);

  const handleQuickMarkLocation = (lat: number, lng: number) => {
    setQuickMarkGps({ lat, lng });
    showNotification(`Live GPS pinned at ${lat.toFixed(4)}, ${lng.toFixed(4)}. Review defect details below.`);
  };

  useEffect(() => {
    // 1. Initial authenticated user verification
    const user = getStoredUser();
    if (user) {
      setCurrentUser(user);
    }
    setIsLoading(false);

    // 2. Subscribe to real-time reports
    const unsubscribe = subscribeToReports((data) => {
      setReports(data);
      if (selectedReport) {
        const updated = data.find((r) => r.id === selectedReport.id);
        if (updated) setSelectedReport(updated);
      }
      if (modalReport) {
        const updated = data.find((r) => r.id === modalReport.id);
        if (updated) setModalReport(updated);
      }
    });

    // 3. Fetch contractors
    getContractors().then((cList) => setContractors(cList));

    const handleAuthEvent = () => {
      const u = getStoredUser();
      setCurrentUser(u);
    };

    window.addEventListener('pothole_auth_change', handleAuthEvent);

    return () => {
      unsubscribe();
      window.removeEventListener('pothole_auth_change', handleAuthEvent);
    };
  }, [selectedReport?.id, modalReport?.id]);

  const showNotification = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setSelectedReport(null);
    setModalReport(null);
    showNotification('You have signed out successfully.');
  };

  // =========================================================================
  // REQUIREMENT 1: STRICT AUTHENTICATION — NO GUEST ACCESS
  // Before login: Only Login and Register screens are accessible.
  // =========================================================================
  if (!currentUser) {
    return (
      <AuthScreen
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setSelectedReport(null);
          setResetViewTrigger((p) => p + 1);
          showNotification(`Welcome back, ${user.name}`);
        }}
      />
    );
  }

  // Filtered reports for contractor
  const contractorAssignedReports = reports.filter(
    (r) => r.contractorId === currentUser.uid || r.assignedTo?.includes('Apex')
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Production Minimal Navbar with Role & Profile Badge */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Floating Notification */}
      {feedbackMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-3 duration-200 border border-slate-700">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Citizen Driver Mode Tab Toggle (When Role is CITIZEN) */}
      {currentUser.role === 'CITIZEN' && (
        <div className="bg-slate-900 text-white py-2 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
            <span className="text-slate-400">Citizen Patrol &amp; Reporting Mode:</span>
            <div className="flex items-center space-x-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => setActiveTabMode('DASHBOARD')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg font-bold transition-all ${
                  activeTabMode === 'DASHBOARD'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span>Dashboard &amp; Map</span>
              </button>
              <button
                onClick={() => setActiveTabMode('DRIVER_MODE')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg font-bold transition-all ${
                  activeTabMode === 'DRIVER_MODE'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Navigation className="h-3.5 w-3.5" />
                <span>Split-Screen Driver Mode</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {currentUser.role === 'CITIZEN' && activeTabMode === 'DRIVER_MODE' ? (
          /* Split-screen Camera HUD + Map with Proximity Audio & Vibration */
          <DriverMode
            reports={reports}
            onSelectReport={(r) => {
              setSelectedReport(r);
              setModalReport(r);
            }}
          />
        ) : (
          <>
            {/* Real-time Geospatial GIS Map (Structured Coordinates, Zero Images) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Map className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-slate-800 tracking-tight">
                    {currentUser.role === 'CONTRACTOR'
                      ? 'Assigned Road Repair Work Order Map'
                      : 'Live Geospatial Road Hazard Map'}
                  </h2>
                </div>
                <div className="flex items-center space-x-3 text-xs text-slate-500 font-medium">
                  <button
                    onClick={() => {
                      setSelectedReport(null);
                      setResetViewTrigger((p) => p + 1);
                    }}
                    className="text-blue-600 hover:text-blue-800 font-semibold underline"
                  >
                    Center &amp; Fit All
                  </button>
                  <span className="text-slate-300">|</span>
                  <div className="flex items-center space-x-1 text-emerald-600">
                    <Radio className="h-3.5 w-3.5 animate-pulse" />
                    <span>Real-time Live Sync</span>
                  </div>
                </div>
              </div>

              <PotholeMap
                reports={currentUser.role === 'CONTRACTOR' ? contractorAssignedReports : reports}
                selectedReport={selectedReport}
                onSelectReport={(rep) => {
                  setSelectedReport(rep);
                  if (currentUser.role === 'CITY_CORPORATION') {
                    setModalReport(rep);
                  }
                }}
                resetViewTrigger={resetViewTrigger}
                onQuickMarkLocation={currentUser.role === 'CITIZEN' ? handleQuickMarkLocation : undefined}
              />
            </div>

            {/* Role-Specific Workspaces */}
            <section className="pt-2">
              {currentUser.role === 'CITY_CORPORATION' && (
                <CityCorpDashboard
                  reports={reports}
                  contractors={contractors}
                  selectedReport={selectedReport}
                  onSelectReport={setSelectedReport}
                  onOpenReportModal={(r) => setModalReport(r)}
                />
              )}

              {currentUser.role === 'CONTRACTOR' && (
                <ContractorDashboard
                  reports={reports}
                  selectedReport={selectedReport}
                  onSelectReport={setSelectedReport}
                />
              )}

              {currentUser.role === 'CITIZEN' && (
                <CitizenView
                  reports={reports}
                  selectedReport={selectedReport}
                  onSelectReport={setSelectedReport}
                  presetGps={quickMarkGps}
                />
              )}
            </section>
          </>
        )}
      </main>

      {/* Report Action / Triage Modal for City Corporation */}
      {modalReport && (
        <ReportDetailModal
          report={modalReport}
          contractors={contractors}
          onClose={() => setModalReport(null)}
        />
      )}

      {/* Clean Civic Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-6 text-center text-xs text-slate-500">
        <p className="font-semibold text-slate-700">
          SmartPothole AI — Road Defect Identification &amp; Civic Infrastructure Management
        </p>
        <p className="mt-1">
          Connected to Firebase RTDB: <span className="font-mono text-blue-600">cryptro</span> | On-Device YOLOv8 Edge AI &amp; Real-time GIS
        </p>
      </footer>
    </div>
  );
}
