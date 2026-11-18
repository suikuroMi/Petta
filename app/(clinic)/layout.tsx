'use client';

import { PortalNavbar } from '@/components/portal-navbar';
import { AuthGuard } from '@/components/auth-guard';

const CLINIC_NAV = [
  { label: 'Queue Dashboard', href: '/dashboard' },
  { label: 'Capacity & Schedules', href: '/schedule' },
  { label: 'Patient Ledger', href: '/records' },
];

export default function ClinicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <PortalNavbar portalTag="CLINIC PORTAL" navItems={CLINIC_NAV} />
      <main className="flex-1 pb-20 md:pb-8">
        <AuthGuard allowedRoles={['vet', 'staff', 'admin']}>{children}</AuthGuard>
      </main>
    </div>
  );
}
