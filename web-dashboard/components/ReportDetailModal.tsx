'use client';

import React, { useState, useEffect } from 'react';
import { PotholeReport, Contractor, ActivityLogEntry, PriorityLevel, ReportStatus } from '@/types';
import { updateReportWorkflow, getReportLogs } from '@/lib/firebase';
import {
  X,
  MapPin,
  Calendar,
  User,
  Shield,
  HardHat,
  CheckCircle2,
  AlertCircle,
  Clock,
  History,
  FileCheck,
  Send,
  XCircle,
  Copy
} from 'lucide-react';

interface ReportDetailModalProps {
  report: PotholeReport;
  contractors: Contractor[];
  onClose: () => void;
}

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  report,
  contractors,
  onClose,
}) => {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [priority, setPriority] = useState<PriorityLevel>(report.priority);
  const [selectedContractorId, setSelectedContractorId] = useState<string>(report.contractorId || (contractors[0]?.id || ''));
  const [deadlineDays, setDeadlineDays] = useState<number>(3);
  const [remarks, setRemarks] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    getReportLogs(report.id).then((entries) => {
      if (isMounted) {
        // Sort descending by timestamp
        entries.sort((a, b) => b.timestamp - a.timestamp);
        setLogs(entries);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [report.id, report.status]);

  const [updateError, setUpdateError] = useState<string | null>(null);

  const handleUpdateStatus = async (newStatus: ReportStatus, customRemarks?: string) => {
    setIsUpdating(true);
    setUpdateError(null);
    try {
      const extraUpdates: Partial<PotholeReport> = {
        status: newStatus,
        priority: priority
      };

      if (newStatus === 'ASSIGNED') {
        const contractor = contractors.find((c) => c.id === selectedContractorId);
        extraUpdates.contractorId = selectedContractorId;
        extraUpdates.assignedTo = contractor ? contractor.companyName : 'Contractor';
        extraUpdates.deadline = Date.now() + deadlineDays * 86400000;
      }

      await updateReportWorkflow(
        report.id,
        extraUpdates,
        customRemarks || remarks || `Status transitioned to ${newStatus}`
      );

      // Refresh logs
      const updatedLogs = await getReportLogs(report.id);
      updatedLogs.sort((a, b) => b.timestamp - a.timestamp);
      setLogs(updatedLogs);
      setRemarks('');
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Update failed. You may not have permission for this transition.');
    } finally {
      setIsUpdating(false);
    }
  };

  const steps: ReportStatus[] = [
    'NEW_REPORT',
    'VERIFIED',
    'ASSIGNED',
    'IN_PROGRESS',
    'REPAIR_SUBMITTED',
    'RESOLVED'
  ];

  const currentStepIndex = steps.indexOf(
    report.status === 'UNDER_REVIEW' || report.status === 'NEW'
      ? 'NEW_REPORT'
      : report.status === 'ACCEPTED'
      ? 'ASSIGNED'
      : report.status === 'CITY_VERIFICATION'
      ? 'REPAIR_SUBMITTED'
      : report.status
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto">
      <div role="dialog" aria-modal="true" className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {updateError && (
          <div role="alert" className="bg-red-50 border-b border-red-200 px-6 py-3 text-sm text-red-800">{updateError}</div>
        )}
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="p-2 bg-blue-600 rounded-xl">
              <Shield className="h-5 w-5 text-white" />
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold">{report.id}</h2>
                <span className="text-xs font-mono bg-slate-800 px-2 py-0.5 rounded text-blue-300">
                  {report.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{report.address}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Lifecycle Stepper */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Report Lifecycle Progress
            </div>
            <div className="flex items-center justify-between">
              {steps.map((st, i) => {
                const isPassed = currentStepIndex >= i;
                const isCurrent = currentStepIndex === i;
                return (
                  <div key={st} className="flex-1 flex flex-col items-center relative">
                    {i > 0 && (
                      <div
                        className={`absolute top-3.5 right-1/2 left-[-50%] h-1 -z-0 ${
                          currentStepIndex >= i ? 'bg-blue-600' : 'bg-slate-200'
                        }`}
                      />
                    )}
                    <div
                      className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold z-10 transition-all ${
                        isCurrent
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                          : isPassed
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {i + 1}
                    </div>
                    <span className="text-[10px] font-semibold mt-1 text-slate-600 text-center">
                      {st.replace('_', ' ')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Structured Telemetry Card (Zero Image Upload Requirement) */}
            <div className="space-y-4">
              <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-4 shadow-md">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-xs font-mono font-bold text-slate-300">EDGE AI DETECTION TELEMETRY</span>
                  </div>
                  <span className="text-[11px] font-mono bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">
                    Source: {report.source || 'UNKNOWN'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                    <span className="text-slate-400 block text-[10px] uppercase">{report.source === 'LIVE_CAMERA' ? 'AI Confidence' : 'Report type'}</span>
                    <strong className="text-emerald-400 text-base">{report.source === 'LIVE_CAMERA' ? `${(report.confidence * 100).toFixed(1)}%` : 'Manual'}</strong>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{report.source === 'LIVE_CAMERA' ? 'On-device model' : 'Human observation'}</span>
                  </div>

                  <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                    <span className="text-slate-400 block text-[10px] uppercase">GPS Accuracy</span>
                    <strong className="text-blue-400 text-base">{report.gpsAccuracy ? `±${Math.round(report.gpsAccuracy)} m` : 'Unknown'}</strong>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{report.gpsAccuracy ? 'Device GPS estimate' : 'Entered manually'}</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Target Class:</span>
                    <span className="font-bold text-white capitalize">{report.detectionClass || 'pothole'}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>GPS Coordinates:</span>
                    <span className="font-mono text-white">{report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Location:</span>
                    <span className="text-white text-right max-w-[200px] truncate">{report.address}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Detected:</span>
                    <span className="text-white">{new Date(report.firstDetectedAt || report.createdAt).toLocaleString()}{report.totalDetections && report.totalDetections > 1 ? ` · seen ${report.totalDetections}×, last ${new Date(report.lastDetectedAt || report.createdAt).toLocaleString()}` : ''}</span>
                  </div>
                </div>

                {report.notes && (
                  <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50 text-xs">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase mb-1">Detection Notes</span>
                    <p className="text-slate-200">{report.notes}</p>
                  </div>
                )}
              </div>

              {/* Contractor Repair Notes if submitted */}
              {report.repairNotes && (
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-xs space-y-1">
                  <span className="font-bold text-emerald-900 block">Contractor Completion Notes</span>
                  <p className="text-emerald-800">{report.repairNotes}</p>
                </div>
              )}
            </div>

            {/* Metadata & Administrative Control */}
            <div className="space-y-5">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Reporter:</span>
                  <span className="font-semibold text-slate-800">{report.reporterName || 'Citizen'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Coordinates:</span>
                  <span className="font-mono text-slate-800">
                    {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Reported Date:</span>
                  <span className="text-slate-800">{new Date(report.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-slate-500 font-semibold">Priority Level:</span>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                    className="p-1 border border-slate-300 rounded bg-white text-xs font-semibold"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
              </div>

              {/* Administrative Actions */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-4">
                <div className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                  City Corporation Decision Engine
                </div>

                {/* 1. If NEW_REPORT or UNDER_REVIEW: Verify or Reject */}
                {(report.status === 'NEW' || report.status === 'NEW_REPORT' || report.status === 'UNDER_REVIEW') && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-600">Review AI detection evidence and verify defect validity:</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateStatus('VERIFIED', 'Inspector verified pothole')}
                        disabled={isUpdating}
                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm"
                      >
                        Verify Pothole
                      </button>
                      <button
                        onClick={() => handleUpdateStatus('REJECTED', 'Marked as false positive/shadow')}
                        disabled={isUpdating}
                        className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-semibold"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleUpdateStatus('DUPLICATE', 'Merged with existing nearby ticket')}
                        disabled={isUpdating}
                        className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                      >
                        Duplicate
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. If VERIFIED: Assign Contractor */}
                {report.status === 'VERIFIED' && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-600">Assign maintenance contractor and turnaround deadline:</p>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Select Contractor</label>
                      <select
                        value={selectedContractorId}
                        onChange={(e) => setSelectedContractorId(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                      >
                        {contractors.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.companyName} (Active: {c.assignedTasksCount} tasks)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Completion Deadline</label>
                      <select
                        value={deadlineDays}
                        onChange={(e) => setDeadlineDays(Number(e.target.value))}
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                      >
                        <option value={1}>24 Hours (Emergency Pave)</option>
                        <option value={2}>48 Hours (Critical)</option>
                        <option value={3}>3 Days (Standard)</option>
                        <option value={7}>7 Days (Low Priority)</option>
                      </select>
                    </div>

                    <button
                      onClick={() => handleUpdateStatus('ASSIGNED', `Assigned to contractor with ${deadlineDays}d deadline`)}
                      disabled={isUpdating}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center justify-center space-x-1.5"
                    >
                      <HardHat className="h-4 w-4" />
                      <span>Issue Work Order (ASSIGNED)</span>
                    </button>
                  </div>
                )}

                {/* 3. If REPAIR_SUBMITTED: Sign off as RESOLVED */}
                {(report.status === 'REPAIR_SUBMITTED' || report.status === 'CITY_VERIFICATION') && (
                  <div className="space-y-3 bg-purple-50/50 p-3 rounded-xl border border-purple-200">
                    <div className="flex items-center space-x-2 text-purple-800 text-xs font-bold">
                      <FileCheck className="h-4 w-4 text-purple-600" />
                      <span>Contractor has submitted repair photos</span>
                    </div>
                    <p className="text-[11px] text-purple-700">
                      Audit the after-repair photo on the left. Once satisfied with the compaction and surface finish, certify and officially close this case.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateStatus('RESOLVED', 'Civil engineer verified completion on site. Task resolved.')}
                        disabled={isUpdating}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
                      >
                        Approve Repair & Mark RESOLVED
                      </button>
                      <button
                        onClick={() => handleUpdateStatus('REPAIR_REJECTED', 'Repair quality substandard; asphalt not compacted.')}
                        disabled={isUpdating}
                        className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-semibold"
                      >
                        Reject Repair
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. If RESOLVED */}
                {report.status === 'RESOLVED' && (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>This pothole repair is certified and officially closed. Full audit trail recorded.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Activity Log / Immutable Audit Trail */}
          <div className="border-t pt-5 space-y-3">
            <div className="flex items-center space-x-2">
              <History className="h-4 w-4 text-slate-500" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Immutable Lifecycle Audit Trail ({logs.length})
              </h3>
            </div>

            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {logs.map((log, idx) => (
                <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-slate-800">
                      {log.newStatus}
                      {log.previousStatus && (
                        <span className="text-slate-400 font-normal"> (from {log.previousStatus})</span>
                      )}
                    </div>
                    <p className="text-slate-500 text-[11px] mt-0.5">{log.remarks}</p>
                    <p className="text-blue-600 text-[10px] mt-0.5 font-medium">By: {log.changedBy}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium text-xs rounded-xl transition-colors"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
