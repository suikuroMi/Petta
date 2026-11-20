'use client';

import { PortalNavbar } from '@/components/portal-navbar';
import { AuthGuard } from '@/components/auth-guard';

const ADMIN_NAV = [
  { label: 'Clinic Governance', href: '/clinics' },
  { label: 'Queue Monitor', href: '/dashboard' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden flex flex-col bg-slate-50 text-slate-900">
      <PortalNavbar portalTag="ADMIN PORTAL" navItems={ADMIN_NAV} />
      <main className="flex-1 pb-[clamp(4.5rem,9vh,5.5rem)] md:pb-8 w-full max-w-[100vw] overflow-x-hidden">
        <AuthGuard allowedRoles={['admin']}>{children}</AuthGuard>
      </main>
    </div>
  );
}
