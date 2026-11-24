'use client';

import React, { useState, useEffect } from 'react';
import { PotholeReport, PriorityLevel } from '@/types';
import { submitPotholeReport } from '@/lib/firebase';
import {
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Navigation,
  Plus,
  Crosshair,
  ShieldCheck,
  Send,
  Zap,
  Cpu
} from 'lucide-react';

interface CitizenViewProps {
  reports: PotholeReport[];
  selectedReport: PotholeReport | null;
  onSelectReport: (report: PotholeReport) => void;
  presetGps?: { lat: number; lng: number } | null;
}

export const CitizenView: React.FC<CitizenViewProps> = ({
  reports,
  selectedReport,
  onSelectReport,
  presetGps,
}) => {
  const [address, setAddress] = useState('Mirpur Road, Near Asad Gate, Dhaka');
  const [latitude, setLatitude] = useState(presetGps?.lat || 23.7628);
  const [longitude, setLongitude] = useState(presetGps?.lng || 90.3705);
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('HIGH');
  const [aiConfidence, setAiConfidence] = useState(0.94);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isLiveGpsActive, setIsLiveGpsActive] = useState(false);

  useEffect(() => {
    if (presetGps) {
      setLatitude(presetGps.lat);
      setLongitude(presetGps.lng);
      setAddress(`GPS Location (${presetGps.lat.toFixed(4)}, ${presetGps.lng.toFixed(4)})`);
    }
  }, [presetGps]);

  // Live GPS Fetcher
  const handleGetLiveGps = () => {
    if (navigator.geolocation) {
      setIsLiveGpsActive(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          setLatitude(lat);
          setLongitude(lng);
          setAddress(`Live Device Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
          setIsLiveGpsActive(false);
        },
        (err) => {
          console.warn('GPS error:', err);
          setIsLiveGpsActive(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  // Submit Structured Metadata Report (Zero Image Upload)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await submitPotholeReport({
        reportId: `PTH-${Math.floor(100 + Math.random() * 900)}`,
        reporterId: 'citizen_demo_uid',
        reporterName: 'Rahim Ahmed (Citizen)',
        address: address,
        latitude: latitude,
        longitude: longitude,
        gpsAccuracy: 5.2,
        detectionClass: 'pothole',
        confidence: aiConfidence,
        priority: priority,
        status: 'NEW',
        source: 'MOBILE_APP',
        contractorId: null,
        notes: notes || 'Pothole defect reported with verified GPS location.',
      });

      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 4000);
      setNotes('');
    } catch (err) {
      console.error('Submission failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Instant 1-Click Mark at Current Location
  const handleInstantMark = async () => {
    setIsSubmitting(true);
    try {
      await submitPotholeReport({
        reportId: `PTH-${Math.floor(100 + Math.random() * 900)}`,
        reporterId: 'citizen_demo_uid',
        reporterName: 'Rahim Ahmed (Quick Mark)',
        address: address || `Road Hazard at (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
        latitude: latitude,
        longitude: longitude,
        gpsAccuracy: 4.8,
        detectionClass: 'pothole',
        confidence: 0.92,
        priority: 'HIGH',
        status: 'NEW',
        source: 'MANUAL_GPS',
        contractorId: null,
        notes: 'Quick mark logged instantly via GPS one-click report.',
      });
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const mySubmissions = reports.filter(
    (r) =>
      r.reporterId === 'citizen_demo_uid' ||
      r.reporterName?.includes('Rahim') ||
      r.reporterName?.includes('Citizen')
  );

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white border border-white/20">
              Citizen Reporting Portal
            </span>
            <span className="text-xs text-blue-200">Structured Telemetry &amp; GPS Fixing</span>
          </div>
          <h1 className="text-2xl font-black mt-1 tracking-tight">Report Road Potholes</h1>
          <p className="text-sm text-blue-200 mt-1 max-w-2xl">
            Spot a road defect? Send the exact location instantly with verified GPS coordinates. Camera data remains strictly on-device for privacy and bandwidth efficiency.
          </p>
        </div>

        {/* 1-Click Quick Mark Action */}
        <button
          onClick={handleInstantMark}
          disabled={isSubmitting}
          className="flex items-center space-x-2 px-5 py-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold text-sm shadow-xl transition-transform hover:scale-105 active:scale-95 self-start md:self-auto border border-red-400"
        >
          <Zap className="h-4 w-4 fill-white" />
          <span>⚡ Instant 1-Tap GPS Mark</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form & Defect Details (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="text-base font-bold text-slate-800 flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              <span>Location &amp; Defect Telemetry</span>
            </h2>
            <button
              type="button"
              onClick={handleGetLiveGps}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
            >
              <Crosshair className={`h-3.5 w-3.5 ${isLiveGpsActive ? 'animate-spin' : ''}`} />
              <span>{isLiveGpsActive ? 'Locating...' : 'Refresh GPS'}</span>
            </button>
          </div>

          {submitSuccess && (
            <div className="p-3.5 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-200 flex items-center space-x-2 text-xs font-semibold animate-in fade-in duration-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Pothole marked successfully! Pinned to municipal triage queue in real-time.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Road Address / Landmark
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(parseFloat(e.target.value))}
                  required
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(parseFloat(e.target.value))}
                  required
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-mono"
                />
              </div>
            </div>

            {/* Edge AI Telemetry Badge */}
            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 text-white space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Cpu className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-200">On-Device Edge AI Detection</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                  Zero Camera Upload
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs font-mono text-center">
                <div className="bg-slate-800 p-2 rounded-xl">
                  <span className="text-slate-400 text-[10px] block">Confidence</span>
                  <span className="text-emerald-400 font-bold">{(aiConfidence * 100).toFixed(0)}%</span>
                </div>
                <div className="bg-slate-800 p-2 rounded-xl">
                  <span className="text-slate-400 text-[10px] block">Target</span>
                  <span className="text-blue-400 font-bold">Pothole</span>
                </div>
                <div className="bg-slate-800 p-2 rounded-xl">
                  <span className="text-slate-400 text-[10px] block">Inference</span>
                  <span className="text-amber-400 font-bold">47 ms</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Severity / Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Source Fix</label>
                <input
                  type="text"
                  disabled
                  value="Fine GPS + On-Device AI"
                  className="w-full p-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Survey Remarks (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Describe danger to traffic, weather conditions, or nearby landmarks..."
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-lg transition-all flex items-center justify-center space-x-1.5"
            >
              <Send className="h-4 w-4" />
              <span>{isSubmitting ? 'Transmitting Metadata...' : 'Submit Defect Report (Metadata Only)'}</span>
            </button>
          </form>
        </div>

        {/* My Submissions Track (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="text-base font-bold text-slate-800">My Registered Reports</h2>
            <span className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full">
              {mySubmissions.length} Reports
            </span>
          </div>

          <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
            {mySubmissions.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-12">No submitted reports found.</p>
            ) : (
              mySubmissions.map((rep) => (
                <div
                  key={rep.id}
                  onClick={() => onSelectReport(rep)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    selectedReport?.id === rep.id
                      ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono text-xs font-bold text-slate-800">
                          {rep.reportId || rep.id}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            rep.status === 'RESOLVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rep.status === 'IN_PROGRESS' || rep.status === 'ACCEPTED'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {rep.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium mt-1 line-clamp-1">
                        {rep.address}
                      </p>
                      <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                        Lat: {rep.latitude.toFixed(4)}, Lng: {rep.longitude.toFixed(4)} • AI: {(rep.confidence * 100).toFixed(0)}%
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        rep.priority === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-800'
                          : rep.priority === 'HIGH'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {rep.priority}
                    </span>
                  </div>

                  {rep.notes && (
                    <p className="text-[11px] text-slate-500 mt-2 line-clamp-1 italic">
                      "{rep.notes}"
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
