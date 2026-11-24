'use client';

import React, { useState } from 'react';
import { PotholeReport, Contractor, PriorityLevel, ReportStatus } from '@/types';
import { updateReportWorkflow } from '@/lib/firebase';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  ExternalLink,
  UserCheck,
  XCircle,
  FileText,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';

interface CityCorpDashboardProps {
  reports: PotholeReport[];
  contractors: Contractor[];
  selectedReport: PotholeReport | null;
  onSelectReport: (report: PotholeReport | null) => void;
  onOpenReportModal: (report: PotholeReport) => void;
}

export const CityCorpDashboard: React.FC<CityCorpDashboardProps> = ({
  reports,
  contractors,
  selectedReport,
  onSelectReport,
  onOpenReportModal,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAiSummaryModal, setShowAiSummaryModal] = useState<boolean>(false);

  // Status counters
  const totalCount = reports.length;
  const newReportsCount = reports.filter((r) => r.status === 'NEW_REPORT').length;
  const underReviewCount = reports.filter((r) => r.status === 'UNDER_REVIEW' || r.status === 'VERIFIED').length;
  const inProgressCount = reports.filter((r) => r.status === 'ASSIGNED' || r.status === 'ACCEPTED' || r.status === 'IN_PROGRESS').length;
  const awaitingVerificationCount = reports.filter((r) => r.status === 'REPAIR_SUBMITTED' || r.status === 'CITY_VERIFICATION').length;
  const resolvedCount = reports.filter((r) => r.status === 'RESOLVED').length;

  const filteredReports = reports.filter((report) => {
    if (statusFilter !== 'ALL' && report.status !== statusFilter) return false;
    if (priorityFilter !== 'ALL' && report.priority !== priorityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (report.address || '').toLowerCase().includes(q) ||
        report.id.toLowerCase().includes(q) ||
        (report.notes && report.notes.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const getPriorityBadge = (p: PriorityLevel) => {
    switch (p) {
      case 'CRITICAL':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">CRITICAL</span>;
      case 'HIGH':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">HIGH</span>;
      case 'MEDIUM':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">MEDIUM</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">LOW</span>;
    }
  };

  const getStatusBadge = (s: ReportStatus) => {
    switch (s) {
      case 'NEW_REPORT':
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-red-500 text-white shadow-sm">NEW REPORT</span>;
      case 'UNDER_REVIEW':
        return <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">UNDER REVIEW</span>;
      case 'VERIFIED':
        return <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">VERIFIED</span>;
      case 'ASSIGNED':
        return <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">ASSIGNED</span>;
      case 'ACCEPTED':
        return <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-100 text-indigo-800">ACCEPTED</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-300">IN PROGRESS</span>;
      case 'REPAIR_SUBMITTED':
      case 'CITY_VERIFICATION':
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300 animate-pulse">REPAIR SUBMITTED</span>;
      case 'RESOLVED':
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">RESOLVED</span>;
      case 'REJECTED':
      case 'DUPLICATE':
        return <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600">REJECTED</span>;
      default:
        return <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">{s}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & AI Report generator button */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/30 text-blue-100 border border-blue-400/30">
              Administrative Control Panel
            </span>
            <span className="text-xs text-blue-200">Dhaka North / South Engineering Command</span>
          </div>
          <h1 className="text-2xl font-bold mt-1 tracking-tight">Road Infrastructure Defect Management</h1>
          <p className="text-sm text-blue-200 mt-1 max-w-2xl">
            Triage AI detections, enforce verification workflows, allocate road maintenance contractors, and verify completed pavement repairs.
          </p>
        </div>
        <button
          onClick={() => setShowAiSummaryModal(true)}
          className="flex items-center space-x-2 px-4 py-2.5 bg-white text-blue-800 hover:bg-blue-50 rounded-xl font-semibold text-sm shadow-md transition-all self-start md:self-auto"
        >
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span>Generate LLM Summary Report</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Total Defects</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Recorded across city</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-red-200 shadow-sm bg-red-50/30">
          <p className="text-xs font-medium text-red-600">New / Unresolved</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{newReportsCount}</p>
          <p className="text-[11px] text-red-500 mt-0.5">Needs immediate review</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-orange-200 shadow-sm bg-orange-50/20">
          <p className="text-xs font-medium text-orange-600">Under Review</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{underReviewCount}</p>
          <p className="text-[11px] text-orange-500 mt-0.5">Triaged by inspectors</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm">
          <p className="text-xs font-medium text-blue-600">Assigned / Active</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{inProgressCount}</p>
          <p className="text-[11px] text-blue-500 mt-0.5">Contractor deployed</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-sm bg-purple-50/30">
          <p className="text-xs font-medium text-purple-700">Audit Verification</p>
          <p className="text-2xl font-bold text-purple-700 mt-1">{awaitingVerificationCount}</p>
          <p className="text-[11px] text-purple-600 mt-0.5">Evidence ready to sign</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm bg-emerald-50/30">
          <p className="text-xs font-medium text-emerald-700">Resolved</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{resolvedCount}</p>
          <p className="text-[11px] text-emerald-600 mt-0.5">Officially certified</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by address, road name, or defect ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center space-x-2 text-xs text-slate-600">
            <Filter className="h-3.5 w-3.5" />
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-300 rounded-md py-1 px-2 text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="NEW_REPORT">New Reports</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="VERIFIED">Verified</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="REPAIR_SUBMITTED">Repair Submitted</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-600">
            <span>Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="border border-slate-300 rounded-md py-1 px-2 text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800">
            Pothole Reports & Lifecycle Triage ({filteredReports.length})
          </h2>
          <span className="text-xs text-slate-500">Live Firebase updates synchronized</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">Report Details</th>
                <th className="px-6 py-3">Location & GPS</th>
                <th className="px-6 py-3">AI Confidence & Severity</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Contractor</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No pothole records match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => (
                  <tr
                    key={report.id}
                    onClick={() => onSelectReport(report)}
                    className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                      selectedReport?.id === report.id ? 'bg-blue-50/60' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
                          <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{report.reportId || report.id}</div>
                          <div className="text-xs text-slate-500">
                            By {report.reporterName || 'Citizen'} • {new Date(report.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-800 font-medium max-w-xs truncate">
                        {report.address || 'Road Defect'}
                      </div>
                      <div className="text-xs text-slate-400 font-mono">
                        {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)} (±{report.gpsAccuracy || 5}m)
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {getPriorityBadge(report.priority)}
                        <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          {(report.confidence * 100).toFixed(0)}% AI
                        </span>
                      </div>
                      {report.areaRatio && (
                        <div className="text-[11px] text-slate-400 mt-1">
                          Defect Area: {(report.areaRatio * 100).toFixed(1)}% of frame
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4">{getStatusBadge(report.status)}</td>

                    <td className="px-6 py-4 text-xs text-slate-600">
                      {report.assignedTo ? (
                        <div>
                          <div className="font-semibold text-slate-800">{report.assignedTo}</div>
                          {report.deadline && (
                            <div className="text-[11px] text-slate-400">
                              Due: {new Date(report.deadline).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenReportModal(report);
                        }}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <span>Manage</span>
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* LLM Report Summary Modal */}
      {showAiSummaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <h3 className="text-lg font-bold text-slate-900">
                  AI-Assisted Municipal Executive Road Report
                </h3>
              </div>
              <button
                onClick={() => setShowAiSummaryModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="text-sm text-slate-700 space-y-3 leading-relaxed">
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-800">
                <strong>Reporting District:</strong> Dhaka Metropolitan Division (North & South Zones) |{' '}
                <strong>Generated:</strong> {new Date().toLocaleDateString()}
              </div>

              <h4 className="font-bold text-slate-800">Executive Summary</h4>
              <p>
                During the current monitoring period, a total of <strong>{totalCount} road defects</strong> were logged and triaged.
                Computer vision analysis using the on-device YOLOv8 architecture flagged <strong>{newReportsCount + underReviewCount} unresolved potholes</strong> requiring municipal intervention.
              </p>

              <h4 className="font-bold text-slate-800">Severity Breakdown & Risk Assessment</h4>
              <ul className="list-disc list-inside space-y-1 text-slate-600 text-xs">
                <li><strong>Critical Priority:</strong> {reports.filter(r => r.priority === 'CRITICAL').length} defects located on major transit arteries requiring 24h emergency patching.</li>
                <li><strong>High Priority:</strong> {reports.filter(r => r.priority === 'HIGH').length} defects with heavy vehicle impact risk.</li>
                <li><strong>Active Maintenance:</strong> {inProgressCount} work orders currently accepted by contracted road infrastructure teams.</li>
                <li><strong>Resolved & Inspected:</strong> {resolvedCount} repairs certified with before/after photo audit trail.</li>
              </ul>

              <h4 className="font-bold text-slate-800">Recommended Allocation</h4>
              <p className="text-xs text-slate-600">
                Prioritize Mirpur Section 10 and Gulshan North corridor where defect density is concentrated. Dispatch Apex Infra Works and Delta Highway Engineering to complete outstanding milling and asphalt laying before upcoming monsoon precipitation.
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t">
              <button
                onClick={() => {
                  alert('Executive report downloaded as PDF!');
                  setShowAiSummaryModal(false);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm"
              >
                Export as Official PDF
              </button>
              <button
                onClick={() => setShowAiSummaryModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
