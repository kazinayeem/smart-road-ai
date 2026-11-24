'use client';

import { useState } from 'react';
import { RequireRole } from '@/components/RequireRole';
import { AppShell } from '@/components/AppShell';
import { ReportsMap } from '@/components/ReportsMap';
import { CitizenView } from '@/components/CitizenView';
import { LoadState } from '@/components/LoadState';
import { LiveActivity } from '@/components/LiveActivity';
import { useAuth } from '@/components/AuthProvider';
import { useReports } from '@/components/useReports';
import { PotholeReport } from '@/types';
import { CITIZEN_NAV } from '@/components/nav';


function CitizenHome() {
  const { profile } = useAuth();
  const { reports, loading, error, events } = useReports();
  const [selected, setSelected] = useState<PotholeReport | null>(null);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  return (
    <AppShell title="Road hazard map" nav={CITIZEN_NAV}>
      <LoadState loading={loading} error={error} />
      <LiveActivity events={events} onOpen={(id) => setSelected(reports.find((r) => r.id === id) || null)} />
      <ReportsMap reports={reports} selectedReport={selected} onSelectReport={setSelected} onQuickMarkLocation={(lat, lng) => setPin({ lat, lng })} />
      <CitizenView currentUserId={profile!.uid} reports={reports} selectedReport={selected} onSelectReport={setSelected} presetGps={pin} />
    </AppShell>
  );
}

export default function Page() {
  return <RequireRole roles={['CITIZEN']}><CitizenHome /></RequireRole>;
}
