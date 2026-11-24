'use client';

import { useState } from 'react';
import { RequireRole } from '@/components/RequireRole';
import { AppShell } from '@/components/AppShell';
import { ReportsMap } from '@/components/ReportsMap';
import { ContractorDashboard } from '@/components/ContractorDashboard';
import { LoadState } from '@/components/LoadState';
import { LiveActivity } from '@/components/LiveActivity';
import { useAuth } from '@/components/AuthProvider';
import { useReports } from '@/components/useReports';
import { PotholeReport } from '@/types';

function ContractorHome() {
  const { profile } = useAuth();
  const { reports, loading, error, events } = useReports();
  const [selected, setSelected] = useState<PotholeReport | null>(null);
  const mine = reports.filter((r) => r.contractorId === profile!.uid);
  return (
    <AppShell title="My work orders" nav={[{ href: '/contractor', label: 'Work orders' }]}>
      <LoadState loading={loading} error={error} />
      <LiveActivity events={events.filter((e) => e.report.contractorId === profile!.uid)} onOpen={(id) => setSelected(reports.find((r) => r.id === id) || null)} />
      <ReportsMap reports={mine} selectedReport={selected} onSelectReport={setSelected} />
      <ContractorDashboard currentUserId={profile!.uid} companyName={profile!.companyName || profile!.name} reports={reports} selectedReport={selected} onSelectReport={setSelected} />
    </AppShell>
  );
}

export default function Page() {
  return <RequireRole roles={['CONTRACTOR']}><ContractorHome /></RequireRole>;
}
