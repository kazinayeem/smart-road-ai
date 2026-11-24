'use client';

import React, { useState } from 'react';
import { PotholeReport, ReportStatus } from '@/types';
import { updateReportWorkflow } from '@/lib/firebase';
import {
  HardHat,
  CheckCircle,
  XCircle,
  Play,
  Upload,
  Calendar,
  AlertCircle,
  Clock,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

interface ContractorDashboardProps {
  currentUserId: string;
  companyName: string;
  reports: PotholeReport[];
  selectedReport: PotholeReport | null;
  onSelectReport: (report: PotholeReport) => void;
}

export const ContractorDashboard: React.FC<ContractorDashboardProps> = ({
  currentUserId,
  companyName,
  reports,
  selectedReport,
  onSelectReport,
}) => {
  const [activeTab, setActiveTab] = useState<'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED'>('ASSIGNED');
  const [actionReport, setActionReport] = useState<PotholeReport | null>(null);
  const [declineReason, setDeclineReason] = useState<string>('');
  const [showDeclineModal, setShowDeclineModal] = useState<boolean>(false);
  const [showEvidenceModal, setShowEvidenceModal] = useState<boolean>(false);
  const [beforeImage, setBeforeImage] = useState<string>('');
  const [afterImage, setAfterImage] = useState<string>('https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?w=800');
  const [repairNotes, setRepairNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Only work orders assigned to THIS contractor account (previously every assigned report leaked in).
  const [actionError, setActionError] = useState<string | null>(null);
  const myTasks = reports.filter((r) => r.contractorId === currentUserId);

  const pendingAcceptance = myTasks.filter((r) => r.status === 'ASSIGNED');
  const activeRepairs = myTasks.filter((r) => r.status === 'ACCEPTED' || r.status === 'IN_PROGRESS');
  const submittedOrResolved = myTasks.filter((r) => r.status === 'REPAIR_SUBMITTED' || r.status === 'CITY_VERIFICATION' || r.status === 'RESOLVED');

  const handleAcceptTask = async (report: PotholeReport) => {
    setIsSubmitting(true);
    try {
      await updateReportWorkflow(
        report.id,
        { status: 'ACCEPTED' },
        'Assignment officially accepted by contractor dispatch team.'
      );
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Action failed. You may not have permission for this step.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeclineTask = async () => {
    if (!actionReport || !declineReason) return;
    setIsSubmitting(true);
    try {
      await updateReportWorkflow(
        actionReport.id,
        {
          status: 'ASSIGNMENT_DECLINED',
          contractorId: null,
          assignedTo: null
        },
        `Assignment declined: ${declineReason}`
      );
      setShowDeclineModal(false);
      setDeclineReason('');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Action failed. You may not have permission for this step.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartRepair = async (report: PotholeReport) => {
    setIsSubmitting(true);
    try {
      await updateReportWorkflow(
        report.id,
        { status: 'IN_PROGRESS' },
        'Maintenance crew on site. Asphalt cutting and leveling in progress.'
      );
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Action failed. You may not have permission for this step.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitEvidence = async () => {
    if (!actionReport) return;
    setIsSubmitting(true);
    try {
      await updateReportWorkflow(
        actionReport.id,
        {
          status: 'REPAIR_SUBMITTED',
          repairBeforeImage: beforeImage || actionReport.imageUrl,
          repairAfterImage: afterImage,
          repairNotes: repairNotes || 'Road patch compacted and sealed according to municipal civil standards.'
        },
        'Completed repair evidence submitted for City Corporation audit and approval.'
      );
      setShowEvidenceModal(false);
      setRepairNotes('');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Action failed. You may not have permission for this step.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {actionError && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 flex justify-between gap-3">
          <span>{actionError}</span>
          <button type="button" className="font-medium underline" onClick={() => setActionError(null)}>Dismiss</button>
        </div>
      )}
      {/* Contractor Banner */}
      <div className="bg-gradient-to-r from-amber-700 via-amber-800 to-orange-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/30 text-amber-100 border border-amber-400/30">
              Contractor Operations Desk
            </span>
            <span className="text-xs text-amber-200">{companyName}</span>
          </div>
          <h1 className="text-2xl font-bold mt-1 tracking-tight">Assigned Pavement Maintenance Orders</h1>
          <p className="text-sm text-amber-200 mt-1 max-w-2xl">
            Accept municipal work orders, track repair status on-site, upload photographic verification, and submit for municipal sign-off.
          </p>
        </div>

        <div className="flex items-center space-x-3 bg-black/20 p-3 rounded-xl border border-white/10">
          <HardHat className="h-8 w-8 text-amber-400" />
          <div className="text-right">
            <div className="text-xs text-amber-200">Crew Status</div>
            <div className="text-sm font-bold text-white">Active in Sector 3 / Mirpur</div>
          </div>
        </div>
      </div>

      {/* Rules Notice */}
      <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex items-center space-x-3 text-xs text-amber-800">
        <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
        <span>
          <strong>Role Policy Notice:</strong> Contractors can submit completion requests and before/after evidence (`REPAIR_SUBMITTED`). Officially closing reports as `RESOLVED` requires City Corporation engineer verification.
        </span>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 space-x-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('ASSIGNED')}
          className={`pb-3 px-1 border-b-2 flex items-center space-x-2 ${
            activeTab === 'ASSIGNED'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Pending Acceptance</span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
            {pendingAcceptance.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('IN_PROGRESS')}
          className={`pb-3 px-1 border-b-2 flex items-center space-x-2 ${
            activeTab === 'IN_PROGRESS'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Active Repairs</span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-800">
            {activeRepairs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('COMPLETED')}
          className={`pb-3 px-1 border-b-2 flex items-center space-x-2 ${
            activeTab === 'COMPLETED'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Submitted / Completed</span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-800">
            {submittedOrResolved.length}
          </span>
        </button>
      </div>

      {/* Task Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(activeTab === 'ASSIGNED' ? pendingAcceptance : activeTab === 'IN_PROGRESS' ? activeRepairs : submittedOrResolved).length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
            No work orders in this category.
          </div>
        ) : (
          (activeTab === 'ASSIGNED' ? pendingAcceptance : activeTab === 'IN_PROGRESS' ? activeRepairs : submittedOrResolved).map((task) => (
            <div
              key={task.id}
              onClick={() => onSelectReport(task)}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="relative h-44 w-full bg-slate-100">
                  <img src={task.imageUrl} alt="Pothole" className="w-full h-full object-cover" />
                  <div className="absolute top-3 right-3 flex items-center space-x-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${
                      task.priority === 'CRITICAL' ? 'bg-rose-600' : task.priority === 'HIGH' ? 'bg-red-500' : 'bg-amber-500'
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                  <div className="absolute bottom-2 left-3 bg-black/60 backdrop-blur-xs text-white text-[11px] px-2 py-0.5 rounded font-mono">
                    AI Conf: {(task.confidence * 100).toFixed(0)}%
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{task.address}</h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">Order ID: {task.id}</p>
                  </div>

                  {task.notes && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      {task.notes}
                    </p>
                  )}

                  {task.deadline && (
                    <div className="flex items-center space-x-2 text-xs text-slate-600">
                      <Clock className="h-3.5 w-3.5 text-amber-600" />
                      <span>Completion Deadline: <strong>{new Date(task.deadline).toLocaleDateString()}</strong></span>
                    </div>
                  )}

                  {task.repairAfterImage && (
                    <div className="pt-2 border-t">
                      <span className="text-xs font-semibold text-emerald-700">Submitted Post-Repair Photo:</span>
                      <img src={task.repairAfterImage} alt="Repaired" className="mt-1 h-20 w-full object-cover rounded-lg border" />
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons depending on state */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                {task.status === 'ASSIGNED' && (
                  <>
                    <button
                      onClick={() => handleAcceptTask(task)}
                      disabled={isSubmitting}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center justify-center space-x-1"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>Accept Task</span>
                    </button>
                    <button
                      onClick={() => {
                        setActionReport(task);
                        setShowDeclineModal(true);
                      }}
                      disabled={isSubmitting}
                      className="py-2 px-3 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-semibold transition-colors"
                    >
                      Decline
                    </button>
                  </>
                )}

                {task.status === 'ACCEPTED' && (
                  <button
                    onClick={() => handleStartRepair(task)}
                    disabled={isSubmitting}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center justify-center space-x-1.5"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>Start Work (Move to IN_PROGRESS)</span>
                  </button>
                )}

                {task.status === 'IN_PROGRESS' && (
                  <button
                    onClick={() => {
                      setActionReport(task);
                      setShowEvidenceModal(true);
                    }}
                    disabled={isSubmitting}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center justify-center space-x-1.5"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload Evidence & Submit Completion</span>
                  </button>
                )}

                {task.status === 'REPAIR_SUBMITTED' && (
                  <div className="w-full py-2 text-center text-xs font-semibold text-purple-700 bg-purple-50 rounded-xl border border-purple-200">
                    Awaiting City Corp Verification
                  </div>
                )}

                {task.status === 'RESOLVED' && (
                  <div className="w-full py-2 text-center text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-center space-x-1">
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>Officially Certified & Closed</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Decline Task Modal */}
      {showDeclineModal && actionReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Decline Work Order</h3>
            <p className="text-xs text-slate-500">
              Please state why you are declining work order <strong>{actionReport.id}</strong>:
            </p>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="e.g. Heavy equipment currently deployed in Sector 12; unable to meet 48h turnaround..."
              className="w-full p-3 border border-slate-300 rounded-xl text-xs h-24 focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowDeclineModal(false)}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDeclineTask}
                disabled={!declineReason || isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Evidence Modal */}
      {showEvidenceModal && actionReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">Submit Repair Evidence for Municipal Sign-off</h3>
              <button onClick={() => setShowEvidenceModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Submit before and after images of the completed pavement repair on <strong>{actionReport.address}</strong>.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Before Repair Image URL</label>
                <input
                  type="text"
                  value={beforeImage || actionReport.imageUrl}
                  onChange={(e) => setBeforeImage(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">After Repair Image URL (Evidence)</label>
                <input
                  type="text"
                  value={afterImage}
                  onChange={(e) => setAfterImage(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
                <img src={afterImage} alt="Preview" className="mt-2 h-28 w-full object-cover rounded-lg border" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contractor Civil Engineering Notes</label>
                <textarea
                  value={repairNotes}
                  onChange={(e) => setRepairNotes(e.target.value)}
                  placeholder="e.g. Cleared debris, applied tack coat, filled with hot-mix asphalt (HMA), compacted to 98% density..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs h-20"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t">
              <button
                onClick={() => setShowEvidenceModal(false)}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitEvidence}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
              >
                Submit for Verification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
