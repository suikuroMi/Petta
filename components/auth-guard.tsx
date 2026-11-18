'use client';

import Link from 'next/link';
import { useAuth, getHomeRouteForRole } from '@/lib/hooks/use-auth';
import type { UserRole } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert, LogIn } from 'lucide-react';

interface AuthGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export function AuthGuard({ allowedRoles, children }: AuthGuardProps) {
  const { data: user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center text-xs text-slate-500">
        Verifying Petta session...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto p-6 mt-12">
        <Card>
          <CardHeader className="text-center space-y-2">
            <LogIn className="h-8 w-8 text-emerald-600 mx-auto" />
            <CardTitle>Sign in to access Petta</CardTitle>
            <p className="text-xs text-slate-500">
              You must be signed in to view pet health records, appointments, or clinic portals.
            </p>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <Link href="/login" className="block">
              <Button className="w-full">Sign In</Button>
            </Link>
            <Link href="/register" className="block">
              <Button variant="outline" className="w-full">
                Create New Account
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="max-w-md mx-auto p-6 mt-12">
        <Card>
          <CardHeader className="text-center space-y-2">
            <ShieldAlert className="h-8 w-8 text-amber-600 mx-auto" />
            <CardTitle>Role Access Restricted</CardTitle>
            <p className="text-xs text-slate-500">
              You are signed in as <strong>{user.full_name}</strong> ({user.role}), which does not
              have access to this portal.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href={getHomeRouteForRole(user.role)} className="block">
              <Button className="w-full">Return to Your Portal</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
