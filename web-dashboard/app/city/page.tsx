'use client';

import { useEffect, useState } from 'react';
import { RequireRole } from '@/components/RequireRole';
import { AppShell } from '@/components/AppShell';
import { ReportsMap } from '@/components/ReportsMap';
import { CityCorpDashboard } from '@/components/CityCorpDashboard';
import { ReportDetailModal } from '@/components/ReportDetailModal';
import { LoadState } from '@/components/LoadState';
import { LiveActivity } from '@/components/LiveActivity';
import { useReports } from '@/components/useReports';
import { getContractors } from '@/lib/firebase';
import { Contractor, PotholeReport } from '@/types';

function CityHome() {
  const { reports, loading, error, events, changedIds } = useReports();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalId, setModalId] = useState<string | null>(null);
  useEffect(() => { getContractors().then(setContractors).catch(() => setContractors([])); }, []);
  // Always render the live copy of the selected report.
  const selected = reports.find((r) => r.id === selectedId) || null;
  const modal = reports.find((r) => r.id === modalId) || null;
  const open = (r: PotholeReport) => { setSelectedId(r.id); setModalId(r.id); };
  return (
    <AppShell title="City operations" nav={[{ href: '/city', label: 'Triage & assignment' }]}>
      <LoadState loading={loading} error={error} />
      <ReportsMap reports={reports} selectedReport={selected} onSelectReport={open} />
      <CityCorpDashboard changedIds={changedIds} reports={reports} contractors={contractors} selectedReport={selected} onSelectReport={(r) => setSelectedId(r?.id ?? null)} onOpenReportModal={open} />
      <LiveActivity events={events} onOpen={(id) => { setSelectedId(id); setModalId(id); }} />
      {modal && <ReportDetailModal report={modal} contractors={contractors} onClose={() => setModalId(null)} />}
    </AppShell>
  );
}

export default function Page() {
  return <RequireRole roles={['CITY_CORPORATION']}><CityHome /></RequireRole>;
}
