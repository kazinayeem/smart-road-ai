'use client';

import React, { useState, useEffect, useRef } from 'react';
import { PotholeReport, PriorityLevel } from '@/types';
import { submitPotholeReport } from '@/lib/firebase';
import {
  Camera,
  MapPin,
  Volume2,
  VolumeX,
  Vibrate,
  Navigation,
  Play,
  Pause,
  Upload,
  Sparkles,
  AlertTriangle,
  Radio,
  Video,
  CheckCircle2,
  X,
  Zap,
  RotateCcw
} from 'lucide-react';

interface DriverModeProps {
  reports: PotholeReport[];
  onSelectReport: (report: PotholeReport) => void;
}

export const DriverMode: React.FC<DriverModeProps> = ({
  reports,
  onSelectReport,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const potholeMarkersRef = useRef<any[]>([]);

  // Telemetry state
  const [driverLat, setDriverLat] = useState<number>(23.8035);
  const [driverLng, setDriverLng] = useState<number>(90.3680);
  const [speedKmh, setSpeedKmh] = useState<number>(38);
  const [headingDeg, setHeadingDeg] = useState<number>(12); // North-North-East
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isSimulatingDrive, setIsSimulatingDrive] = useState<boolean>(false);

  // Proximity Alert state
  const [activeAlert, setActiveAlert] = useState<{
    pothole: PotholeReport;
    distanceMeters: number;
    timeToCollisionSec: number;
  } | null>(null);

  // Submission state
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [capturedImage, setCapturedImage] = useState<string>('');
  const [capturedAddress, setCapturedAddress] = useState<string>('Mirpur Road near Section 10');
  const [capturedNotes, setCapturedNotes] = useState<string>('Pothole detected during active road scan.');
  const [capturedPriority, setCapturedPriority] = useState<PriorityLevel>('HIGH');
  const [uploadedVideoName, setUploadedVideoName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [instantMarkSuccess, setInstantMarkSuccess] = useState<string | null>(null);

  // 1. Initialize Real Live Camera
  const startCamera = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setCameraActive(true);
          setCameraError(null);
        }
      } else {
        setCameraError('Camera API not supported on this browser.');
      }
    } catch (err: any) {
      console.warn('Real camera not accessible, using fallback simulation:', err);
      setCameraError(err?.message || 'Camera permission denied or device busy');
      setCameraActive(false);
    }
  };

  useEffect(() => {
    startCamera();
  }, []);

  // 2. Play Audio Alert Tone using Web Audio API
  const playAlertTone = () => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // High pitch alert
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.15); // Fall to 440Hz

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      console.warn('Audio tone error:', e);
    }
  };

  // 3. Trigger Hardware Vibration
  const triggerHapticAlert = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([300, 100, 300]);
      } catch {}
    }
  };

  // 4. Calculate Distance in Meters (Haversine Formula)
  const calculateDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // 5. Initialize Half-Screen Leaflet Map
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;
    let isMounted = true;

    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          zoomControl: false,
          attributionControl: false,
        }).setView([driverLat, driverLng], 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          subdomains: ['a', 'b', 'c'],
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        }).addTo(map);

        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;

      // Update Driver Marker
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setLatLng([driverLat, driverLng]);
      } else {
        const carIcon = L.divIcon({
          html: `
            <div style="position: relative; width: 34px; height: 34px;">
              <span style="position: absolute; inset: -6px; border-radius: 9999px; background: #3b82f6; opacity: 0.35; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
              <div style="width: 34px; height: 34px; border-radius: 50%; background: #2563eb; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; transform: rotate(${headingDeg}deg);">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><polygon points="12 2 19 21 12 17 5 21 12 2"/></svg>
              </div>
            </div>
          `,
          className: 'driver-car-icon',
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });
        driverMarkerRef.current = L.marker([driverLat, driverLng], { icon: carIcon }).addTo(map);
      }

      // Clear & redraw pothole markers
      potholeMarkersRef.current.forEach((m) => m.remove());
      potholeMarkersRef.current = [];

      reports.forEach((rep) => {
        if (!rep.latitude || !rep.longitude) return;
        const isResolved = rep.status === 'RESOLVED';
        const color = isResolved ? '#10b981' : '#ef4444';

        const pIcon = L.divIcon({
          html: `
            <div style="width: 24px; height: 24px; border-radius: 50%; background-color: ${color}; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center;">
              <span style="width: 6px; height: 6px; border-radius: 50%; background-color: white;"></span>
            </div>
          `,
          className: 'hazard-pin',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const marker = L.marker([rep.latitude, rep.longitude], { icon: pIcon })
          .addTo(map)
          .on('click', () => onSelectReport(rep));
        potholeMarkersRef.current.push(marker);
      });

      map.panTo([driverLat, driverLng], { animate: true });
    });

    return () => {
      isMounted = false;
    };
  }, [driverLat, driverLng, reports, headingDeg]);

  // 6. Proximity Scanner: Detect potholes ahead (Within 300m)
  useEffect(() => {
    const speedMps = (speedKmh * 1000) / 3600;
    let closestPothole: PotholeReport | null = null;
    let minDistance = Infinity;

    reports.forEach((rep) => {
      if (rep.status === 'RESOLVED' || rep.status === 'REJECTED') return;
      const d = calculateDistanceMeters(driverLat, driverLng, rep.latitude, rep.longitude);
      if (d <= 300 && d < minDistance) {
        minDistance = d;
        closestPothole = rep;
      }
    });

    if (closestPothole && minDistance <= 300) {
      const ttc = speedMps > 0 ? Math.round(minDistance / speedMps) : 99;
      setActiveAlert({
        pothole: closestPothole,
        distanceMeters: Math.round(minDistance),
        timeToCollisionSec: ttc,
      });
      playAlertTone();
      triggerHapticAlert();
    } else {
      setActiveAlert(null);
    }
  }, [driverLat, driverLng, reports, speedKmh, soundEnabled]);

  // 7. Drive Simulation (Moves car towards Mirpur 10 pothole)
  useEffect(() => {
    if (!isSimulatingDrive) return;

    const interval = setInterval(() => {
      setDriverLat((prev) => {
        // Target: 23.8069 (Mirpur 10)
        if (prev < 23.8065) {
          return prev + 0.0003;
        } else {
          setIsSimulatingDrive(false);
          return 23.8035; // Reset loop
        }
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [isSimulatingDrive]);

  // Capture frame from live video or take snapshot
  const handleCaptureSnapshot = () => {
    const video = videoRef.current;
    if (video && cameraActive) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setCapturedImage(canvas.toDataURL('image/jpeg', 0.85));
      }
    } else {
      // Fallback sample snapshot
      setCapturedImage('https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800');
    }
    setCapturedAddress(`Mirpur Road (Lat: ${driverLat.toFixed(4)}, Lng: ${driverLng.toFixed(4)})`);
    setShowSubmitModal(true);
  };

  // Handle Video File Upload
  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedVideoName(file.name);
      setCapturedImage('https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800');
      setCapturedNotes(`Road survey video uploaded: ${file.name} (Sampled 2 FPS via AI pipeline)`);
      setShowSubmitModal(true);
    }
  };

  // Instant 1-Tap Mark at Current Vehicle GPS (Metadata Only, Zero Images)
  const handleInstantGpsMark = async () => {
    setIsSubmitting(true);
    try {
      playAlertTone();
      triggerHapticAlert();
      await submitPotholeReport({
        reportId: `PTH-${Math.floor(100 + Math.random() * 900)}`,
        reporterId: 'citizen_driver_mode',
        reporterName: 'Driver Patrol (Live Camera HUD)',
        address: `Road Hazard at (${driverLat.toFixed(4)}, ${driverLng.toFixed(4)})`,
        latitude: driverLat,
        longitude: driverLng,
        gpsAccuracy: 5.0,
        detectionClass: 'pothole',
        confidence: 0.94,
        priority: 'HIGH',
        status: 'NEW',
        source: 'LIVE_CAMERA',
        contractorId: null,
        notes: 'Instant hazard mark submitted while driving (On-device AI, metadata only).',
      });
      setInstantMarkSuccess(`⚡ Hazard marked at GPS [${driverLat.toFixed(4)}, ${driverLng.toFixed(4)}]! Live sync to City Corporation.`);
      setTimeout(() => setInstantMarkSuccess(null), 4000);
    } catch (err) {
      console.error('Instant GPS mark error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Defect Report (Metadata Only)
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await submitPotholeReport({
        reportId: `PTH-${Math.floor(100 + Math.random() * 900)}`,
        reporterId: 'citizen_driver_mode',
        reporterName: 'Driver Patrol (Live Camera HUD)',
        address: capturedAddress,
        latitude: driverLat,
        longitude: driverLng,
        gpsAccuracy: 4.8,
        detectionClass: 'pothole',
        confidence: 0.93,
        priority: capturedPriority,
        status: 'NEW',
        source: 'LIVE_CAMERA',
        contractorId: null,
        notes: capturedNotes,
      });
      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        setShowSubmitModal(false);
      }, 2000);
    } catch (err) {
      console.error('Submit error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Driver Mode Control Bar */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-lg flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Navigation className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold tracking-tight">Driver Mode &amp; Live Road Proximity Scanner</h2>
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Half-screen HUD Camera + Half-screen Real-Time Navigation Map with Sound &amp; Vibration
            </p>
          </div>
        </div>

        {/* Telemetry & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Speed & Heading Badges */}
          <div className="flex items-center space-x-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-mono">
            <span className="text-slate-400">SPEED:</span>
            <strong className="text-white text-sm">{speedKmh} km/h</strong>
          </div>

          <button
            onClick={() => setIsSimulatingDrive(!isSimulatingDrive)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
              isSimulatingDrive ? 'bg-amber-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {isSimulatingDrive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            <span>{isSimulatingDrive ? 'Pause Road Simulation' : 'Simulate Approaching Pothole'}</span>
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl text-xs border transition-colors ${
              soundEnabled
                ? 'bg-slate-800 text-emerald-400 border-slate-700'
                : 'bg-slate-800 text-slate-500 border-slate-700'
            }`}
            title={soundEnabled ? 'Audio Alerts Enabled' : 'Audio Alerts Muted'}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Instant GPS Notification */}
      {instantMarkSuccess && (
        <div className="bg-emerald-600 text-white p-3.5 rounded-2xl shadow-xl flex items-center space-x-2 text-xs font-bold animate-in fade-in border border-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{instantMarkSuccess}</span>
        </div>
      )}

      {/* Proximity Alert Banner (Triggered when pothole is <= 300m ahead) */}
      {activeAlert && (
        <div className="bg-red-600 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between animate-pulse border-2 border-red-300">
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-7 w-7 text-white" />
            </div>
            <div>
              <div className="text-sm font-black tracking-wider uppercase">
                ⚠️ POTHOLE {activeAlert.distanceMeters}M AHEAD — SLOW DOWN!
              </div>
              <p className="text-xs text-red-100 mt-0.5">
                Bangla Voice: <em>"Shamne gorto, aste chalan"</em> • Time-to-Collision: ~{activeAlert.timeToCollisionSec}s
              </p>
              <p className="text-[11px] text-red-200 mt-0.5 font-medium">
                Location: {activeAlert.pothole.address}
              </p>
            </div>
          </div>

          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs font-bold uppercase bg-white text-red-700 px-2.5 py-1 rounded-lg shadow-sm">
              Hazard Warning
            </span>
            <span className="text-[11px] text-red-200 mt-1">Audio + Vibration Active</span>
          </div>
        </div>
      )}

      {/* 50/50 SPLIT-SCREEN CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[600px]">
        {/* TOP HALF / LEFT: CAMERA & AI SCANNER HUD */}
        <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-md flex flex-col justify-between">
          {/* Live Video / Simulator */}
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
            />

            {!cameraActive && (
              <div className="relative w-full h-full">
                {/* Fallback Road Dashcam Video Feed */}
                <img
                  src="https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=1280"
                  alt="Road Dashcam Simulation"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40"></div>
                {cameraError && (
                  <div className="absolute top-12 left-4 right-4 bg-black/80 backdrop-blur-sm p-2.5 rounded-xl text-xs text-amber-300 border border-amber-500/40 flex items-center justify-between gap-2">
                    <span className="truncate">Camera fallback: {cameraError}</span>
                    <button
                      onClick={startCamera}
                      className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded text-[11px] font-bold border border-amber-500/40 flex items-center space-x-1 shrink-0"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Retry</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* AI HUD OVERLAY */}
            <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
              {/* Top HUD Telemetry */}
              <div className="flex items-center justify-between text-xs font-mono text-emerald-400 bg-black/50 backdrop-blur-xs p-2 rounded-xl border border-emerald-500/20">
                <div className="flex items-center space-x-2">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                  <span>REC 1080P</span>
                  <span className="text-slate-400">|</span>
                  <span>YOLOv8 INT8 ONNX</span>
                </div>
                <div>FPS: 24.2 • INF: 47ms</div>
              </div>

              {/* Road ROI Bounding Box Target */}
              <div className="relative self-center w-3/4 h-36 border-2 border-dashed border-emerald-400/60 rounded-xl flex items-center justify-center">
                <span className="text-[10px] font-mono text-emerald-300 bg-black/60 px-2 py-0.5 rounded">
                  ROAD REGION-OF-INTEREST (ROI) SCANNER
                </span>

                {/* Simulated Pothole Detection Box */}
                {activeAlert && (
                  <div className="absolute -bottom-2 w-32 h-20 border-2 border-red-500 bg-red-500/20 rounded flex items-start justify-start p-1 animate-pulse">
                    <span className="bg-red-600 text-white text-[9px] font-bold px-1 rounded">
                      POTHOLE (92%)
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom HUD Telemetry */}
              <div className="flex items-center justify-between text-xs font-mono text-white bg-black/60 backdrop-blur-xs p-2.5 rounded-xl border border-white/10">
                <div>LAT: {driverLat.toFixed(4)} • LNG: {driverLng.toFixed(4)}</div>
                <div className="text-amber-400">HEADING: {headingDeg}° NNE</div>
              </div>
            </div>
          </div>

          {/* Quick Real-Time Action Bar (Zero Image Upload Requirement) */}
          <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3">
            <button
              onClick={handleInstantGpsMark}
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center space-x-2 transition-all active:scale-95"
              title="Instantly submit structured hazard metadata at current GPS without photo or video"
            >
              <Zap className="h-4 w-4 fill-white" />
              <span>⚡ Transmit Pothole Detection (GPS + Metadata)</span>
            </button>
          </div>
        </div>

        {/* BOTTOM HALF / RIGHT: NAVIGATION MAP */}
        <div className="relative rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-md flex flex-col">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Map Overlay Badge */}
          <div className="absolute top-3 left-3 z-20 bg-white/95 backdrop-blur-xs p-2.5 rounded-xl border border-slate-200 shadow text-xs space-y-1">
            <div className="font-bold text-slate-800 flex items-center space-x-1.5">
              <Navigation className="h-3.5 w-3.5 text-blue-600" />
              <span>Live Vehicle Telemetry</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Blue arrow = Moving Vehicle • Red pins = Active Potholes
            </p>
          </div>
        </div>
      </div>

      {/* REPORT SUBMISSION MODAL (Image or Video) */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <Camera className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {uploadedVideoName ? 'Submit Road Survey Video Defect' : 'Submit Captured Pothole Report'}
                </h3>
              </div>
              <button onClick={() => setShowSubmitModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {submitSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs font-semibold flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Report successfully saved to Firebase Realtime Database!</span>
              </div>
            )}

            <div className="relative rounded-xl overflow-hidden border bg-black h-48">
              <img src={capturedImage} alt="Captured Pothole" className="w-full h-full object-cover" />
              <div className="absolute top-2 right-2 bg-black/70 text-white text-[11px] px-2 py-0.5 rounded font-mono">
                AI Conf: 93% • YOLOv8
              </div>
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Road Location</label>
                <input
                  type="text"
                  value={capturedAddress}
                  onChange={(e) => setCapturedAddress(e.target.value)}
                  required
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={driverLat}
                    readOnly
                    className="w-full p-2 border border-slate-200 bg-slate-50 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={driverLng}
                    readOnly
                    className="w-full p-2 border border-slate-200 bg-slate-50 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Severity Rating</label>
                <select
                  value={capturedPriority}
                  onChange={(e) => setCapturedPriority(e.target.value as PriorityLevel)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  <option value="CRITICAL">CRITICAL (Emergency Pave)</option>
                  <option value="HIGH">HIGH (Immediate Hazard)</option>
                  <option value="MEDIUM">MEDIUM (Standard Maintenance)</option>
                  <option value="LOW">LOW (Surface Crack)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Survey Notes</label>
                <textarea
                  value={capturedNotes}
                  onChange={(e) => setCapturedNotes(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                >
                  {isSubmitting ? 'Submitting...' : 'Confirm & Upload to Cloud'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
