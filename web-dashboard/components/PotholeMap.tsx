'use client';

import React, { useEffect, useRef, useState } from 'react';
import { PotholeReport } from '@/types';
import { Navigation, Crosshair, Plus, ShieldAlert, Sparkles } from 'lucide-react';

interface PotholeMapProps {
  reports: PotholeReport[];
  selectedReport: PotholeReport | null;
  onSelectReport: (report: PotholeReport) => void;
  resetViewTrigger?: number;
  onQuickMarkLocation?: (lat: number, lng: number) => void;
}

export const PotholeMap: React.FC<PotholeMapProps> = ({
  reports,
  selectedReport,
  onSelectReport,
  resetViewTrigger = 0,
  onQuickMarkLocation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ [id: string]: any }>({});
  const userMarkerRef = useRef<any>(null);
  const safeAreaCircleRef = useRef<any>(null);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');

  // 1. Live Real-time Location Detection via HTML5 Geolocation API
  useEffect(() => {
    if (!navigator.geolocation) return;

    let watchId: number | null = null;
    const updateLocation = (pos: GeolocationPosition) => {
      const lat = Number(pos.coords.latitude.toFixed(6));
      const lng = Number(pos.coords.longitude.toFixed(6));
      setUserLocation({ lat, lng });
      setGpsAccuracy(Math.round(pos.coords.accuracy));
      setIsLocating(false);
    };

    const handleError = (err: GeolocationPositionError) => {
      console.warn('Geolocation notice:', err.message);
      setIsLocating(false);
      if (!userLocation) {
        setUserLocation({ lat: 23.8103, lng: 90.4125 });
        setGpsAccuracy(15);
      }
    };

    setIsLocating(true);
    watchId = navigator.geolocation.watchPosition(updateLocation, handleError, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 12000,
    });

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // 2. Initialize Leaflet Map
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;
    let isMounted = true;

    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        const initialLat = userLocation?.lat || 23.8103;
        const initialLng = userLocation?.lng || 90.4125;

        const map = L.map(mapContainerRef.current, {
          zoomControl: false,
          attributionControl: true,
        }).setView([initialLat, initialLng], 13);

        // Standard OpenStreetMap Tiles (Open Source & Free - Zero API Keys Required)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          subdomains: ['a', 'b', 'c'],
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        }).addTo(map);

        L.control.zoom({ position: 'bottomright' }).addTo(map);
        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;

      // Update Live User Location Marker & Safe Area Circle (150m Horizon)
      if (userLocation) {
        // Safe Area Circle
        if (safeAreaCircleRef.current) {
          safeAreaCircleRef.current.setLatLng([userLocation.lat, userLocation.lng]);
        } else {
          safeAreaCircleRef.current = L.circle([userLocation.lat, userLocation.lng], {
            radius: 150, // 150m Safe Area
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.12,
            weight: 2,
            dashArray: '5, 5',
          }).addTo(map);
        }

        const liveUserHtml = `
          <div style="position: relative; width: 36px; height: 36px;">
            <span style="position: absolute; inset: -8px; border-radius: 9999px; background: rgba(37, 99, 235, 0.25); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
            <div style="width: 36px; height: 36px; border-radius: 50%; background: #2563eb; border: 3px solid white; box-shadow: 0 4px 10px rgba(37,99,235,0.4); display: flex; align-items: center; justify-content: center;">
              <div style="width: 10px; height: 10px; border-radius: 50%; background: white;"></div>
            </div>
          </div>
        `;

        const userIcon = L.divIcon({
          html: liveUserHtml,
          className: 'live-user-pin',
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
        } else {
          userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon, zIndexOffset: 1000 })
            .addTo(map)
            .bindTooltip('<strong>You Are Here</strong> (Live GPS)', { direction: 'top', offset: [0, -14] });
        }
      }

      // Clear & redraw pothole hazard markers
      Object.values(markersRef.current).forEach((m) => m.remove());
      markersRef.current = {};

      const getMarkerColor = (status: string) => {
        switch (status) {
          case 'NEW':
          case 'NEW_REPORT':
            return '#ef4444'; // Red: New / Unresolved
          case 'UNDER_REVIEW':
            return '#f97316'; // Orange: Under Review
          case 'VERIFIED':
            return '#ea580c'; // Deep Orange: Verified
          case 'ASSIGNED':
            return '#3b82f6'; // Blue: Assigned to contractor
          case 'ACCEPTED':
          case 'IN_PROGRESS':
            return '#eab308'; // Yellow: Repair in progress
          case 'REPAIR_SUBMITTED':
          case 'CITY_VERIFICATION':
            return '#a855f7'; // Purple: Repair submitted for city approval
          case 'RESOLVED':
            return '#10b981'; // Green: Verified and Resolved
          default:
            return '#6b7280'; // Gray: Rejected / Duplicate
        }
      };

      const displayedReports = activeFilter === 'ALL'
        ? reports
        : reports.filter((r) => r.status === activeFilter);

      displayedReports.forEach((report) => {
        if (!report.latitude || !report.longitude) return;

        const color = getMarkerColor(report.status);
        const isSelected = selectedReport?.id === report.id;
        const isCritical = report.priority === 'CRITICAL' && (report.status === 'NEW_REPORT' || report.status === 'UNDER_REVIEW');

        const customHtml = `
          <div style="position: relative; width: 30px; height: 30px;">
            ${isCritical ? `<span style="position: absolute; inset: -5px; border-radius: 9999px; background-color: ${color}; opacity: 0.6; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>` : ''}
            <div style="
              width: 30px;
              height: 30px;
              border-radius: 50%;
              background-color: ${color};
              border: 3px solid white;
              box-shadow: 0 4px 8px rgba(0, 0, 0, 0.22);
              display: flex;
              align-items: center;
              justify-content: center;
              transform: ${isSelected ? 'scale(1.3)' : 'scale(1)'};
              transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
            ">
              <span style="width: 8px; height: 8px; border-radius: 50%; background-color: white;"></span>
            </div>
          </div>
        `;

        const icon = L.divIcon({
          html: customHtml,
          className: 'custom-pothole-pin',
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });

        const marker = L.marker([report.latitude, report.longitude], { icon })
          .addTo(map)
          .on('click', () => onSelectReport(report));

        marker.bindTooltip(
          `<div style="font-family: inherit; font-size: 11px; padding: 2px;">
             <strong style="color: #0f172a; font-size: 12px;">${report.address || 'Pothole Defect'}</strong><br/>
             <span style="display:inline-block; margin-top:3px; padding: 1px 6px; border-radius: 4px; background: ${color}20; color: ${color}; font-weight: bold;">
               ${report.status.replace('_', ' ')}
             </span>
             <span style="color: #64748b; margin-left: 6px;">• AI: ${(report.confidence * 100).toFixed(0)}%</span>
           </div>`,
          { direction: 'top', offset: [0, -12], opacity: 0.96 }
        );

        markersRef.current[report.id] = marker;
      });

      if (selectedReport && selectedReport.latitude && selectedReport.longitude) {
        map.setView([selectedReport.latitude, selectedReport.longitude], 16, { animate: true });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [reports, selectedReport, userLocation, activeFilter, onSelectReport]);

  const fitAllMarkers = () => {
    const map = mapInstanceRef.current;
    if (!map || reports.length === 0) return;
    import('leaflet').then((L) => {
      const validPoints = reports
        .filter((r) => r.latitude && r.longitude)
        .map((r) => [r.latitude, r.longitude] as [number, number]);

      if (userLocation) {
        validPoints.push([userLocation.lat, userLocation.lng]);
      }

      if (validPoints.length > 0) {
        const bounds = L.latLngBounds(validPoints);
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15, animate: true });
      }
    });
  };

  const locateUser = () => {
    const map = mapInstanceRef.current;
    if (!map || !userLocation) return;
    map.setView([userLocation.lat, userLocation.lng], 16, { animate: true });
  };

  useEffect(() => {
    if (resetViewTrigger > 0) {
      fitAllMarkers();
    }
  }, [resetViewTrigger]);

  const unresolvedCount = reports.filter(r => r.status === 'NEW_REPORT' || r.status === 'UNDER_REVIEW').length;
  const inProgressCount = reports.filter(r => r.status === 'ASSIGNED' || r.status === 'IN_PROGRESS').length;
  const resolvedCount = reports.filter(r => r.status === 'RESOLVED').length;

  return (
    <div className="relative w-full h-[540px] rounded-3xl overflow-hidden border border-slate-200 shadow-xl bg-slate-100 flex flex-col">
      {/* Top Filter & Control Pill Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Status Filter Badges */}
        <div className="flex items-center space-x-1.5 bg-white/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/80 shadow-md pointer-events-auto">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              activeFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({reports.length})
          </button>
          <button
            onClick={() => setActiveFilter('NEW_REPORT')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
              activeFilter === 'NEW_REPORT'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-red-600 hover:bg-red-50'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-red-500"></span>
            <span>New ({unresolvedCount})</span>
          </button>
          <button
            onClick={() => setActiveFilter('IN_PROGRESS')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
              activeFilter === 'IN_PROGRESS'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-700 hover:bg-amber-50'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-amber-500"></span>
            <span>Repairs ({inProgressCount})</span>
          </button>
          <button
            onClick={() => setActiveFilter('RESOLVED')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
              activeFilter === 'RESOLVED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>Done ({resolvedCount})</span>
          </button>
        </div>

        {/* Live GPS Status & Controls */}
        <div className="flex items-center space-x-2 pointer-events-auto">
          {/* Quick Mark Defect Button */}
          {onQuickMarkLocation && userLocation && (
            <button
              onClick={() => onQuickMarkLocation(userLocation.lat, userLocation.lng)}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-2xl shadow-lg transition-transform hover:scale-105 active:scale-95 border border-red-500"
              title="Instantly mark a pothole at your current live location"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>Mark At My GPS</span>
            </button>
          )}

          {/* Locate Me */}
          <button
            onClick={locateUser}
            className="p-2.5 bg-white/95 hover:bg-white text-blue-600 rounded-2xl border border-slate-200 shadow-md backdrop-blur-md transition-all hover:scale-105 active:scale-95"
            title="Pan to My Current Location"
          >
            <Crosshair className={`h-4 w-4 ${isLocating ? 'animate-spin text-blue-500' : ''}`} />
          </button>

          {/* Fit All */}
          <button
            onClick={fitAllMarkers}
            className="px-3 py-2 bg-white/95 hover:bg-white text-slate-800 text-xs font-bold rounded-2xl border border-slate-200 shadow-md backdrop-blur-md transition-all hover:scale-105 active:scale-95 flex items-center space-x-1"
          >
            <Navigation className="h-3.5 w-3.5 text-blue-600" />
            <span className="hidden sm:inline">Fit All</span>
          </button>
        </div>
      </div>

      {/* Map Surface */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Bottom Live Info Pill */}
      <div className="absolute bottom-4 left-4 z-20 flex flex-wrap items-center gap-2">
        <div className="flex items-center space-x-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-200/80 shadow-md text-[11px] text-slate-600 font-medium">
          <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
          <span>
            {userLocation ? (
              <>Live GPS: <strong className="font-mono text-slate-900">{userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}</strong> {gpsAccuracy ? `(±${gpsAccuracy}m)` : ''}</>
            ) : (
              'Detecting GPS location...'
            )}
          </span>
        </div>
        <div className="flex items-center space-x-1.5 bg-blue-50/95 backdrop-blur-md px-2.5 py-1.5 rounded-2xl border border-blue-200 shadow-sm text-[11px] text-blue-700 font-bold">
          <span>🛡️ Safe Area Active (150m)</span>
        </div>
      </div>
    </div>
  );
};
