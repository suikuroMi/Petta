'use client';

import { PortalNavbar } from '@/components/portal-navbar';
import { AuthGuard } from '@/components/auth-guard';

const OWNER_NAV = [
  { label: 'Dashboard', href: '/overview' },
  { label: 'My Pets', href: '/pets' },
  { label: 'Appointments', href: '/appointments' },
  { label: 'Care Assistant', href: '/assistant' },
];

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden flex flex-col bg-slate-50 text-slate-900">
      <PortalNavbar navItems={OWNER_NAV} />
      <main className="flex-1 pb-[clamp(4.5rem,9vh,5.5rem)] md:pb-8 w-full max-w-[100vw] overflow-x-hidden">
        <AuthGuard allowedRoles={['owner']}>{children}</AuthGuard>
      </main>
    </div>
  );
}
