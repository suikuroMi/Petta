'use client';

import { PortalNavbar } from '@/components/portal-navbar';
import { AuthGuard } from '@/components/auth-guard';

const ADMIN_NAV = [
  { label: 'Clinic Governance', href: '/clinics' },
  { label: 'Queue Monitor', href: '/dashboard' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <PortalNavbar portalTag="ADMIN PORTAL" navItems={ADMIN_NAV} />
      <main className="flex-1 pb-20 md:pb-8">
        <AuthGuard allowedRoles={['admin']}>{children}</AuthGuard>
      </main>
    </div>
  );
}
