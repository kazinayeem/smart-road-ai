'use client';

import { RequireRole } from '@/components/RequireRole';
import { AppShell } from '@/components/AppShell';
import { DriverMode } from '@/components/DriverMode';
import { useReports } from '@/components/useReports';
import { CITIZEN_NAV } from '@/components/nav';

function Driver() {
  const { reports } = useReports();
  return (
    <AppShell title="Driver mode (simulation)" nav={CITIZEN_NAV}>
      <DriverMode reports={reports} onSelectReport={() => undefined} />
    </AppShell>
  );
}

export default function Page() {
  return <RequireRole roles={['CITIZEN']}><Driver /></RequireRole>;
}
