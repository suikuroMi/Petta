'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getApiErrorMessage } from '@/lib/api';
import { getHomeRouteForRole } from '@/lib/hooks/use-auth';
import type { User } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, ArrowLeft } from 'lucide-react';

const SEEDED_ACCOUNTS = [
  { label: 'Pet Owner (Maria)', email: 'maria.santos@petta.local' },
  { label: 'Vet (Dr. Renz)', email: 'dr.renz@healthypaws.vet' },
  { label: 'Staff (Marco)', email: 'marco.staff@healthypaws.vet' },
  { label: 'System Admin', email: 'admin@petta.local' },
];

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const initialEmail = searchParams.get('email') || '';

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ user: User; token: string }>('/auth/login', {
        email,
        password,
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.clear();
      queryClient.setQueryData(['auth-me'], data.user);
      router.push(getHomeRouteForRole(data.user.role));
    },
    onError: (err) => {
      setErrorMessage(getApiErrorMessage(err, 'Invalid email or password'));
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    loginMutation.mutate();
  };

  const fillCredentials = (targetEmail: string) => {
    setEmail(targetEmail);
    setPassword('password123');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden flex flex-col items-center justify-center p-[clamp(1rem,3vw,1.5rem)] bg-slate-50">
      <div className="w-full max-w-[24rem] space-y-4">
        <Link
          href="/"
          className="text-xs font-semibold text-slate-500 hover:text-emerald-600 inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
        </Link>

        <Card className="w-full">
          <CardHeader className="text-center space-y-1">
            <div className="text-2xl font-bold text-emerald-600 mb-1">🐾 Petta</div>
            <CardTitle className="text-xl">Sign in to your account</CardTitle>
            <p className="text-xs text-slate-500">
              Sign in required to view pet health records and appointments
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {errorMessage && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>

            <div className="pt-3 border-t border-slate-100 space-y-2">
              <p className="text-[11px] font-semibold text-slate-500 text-center">
                Fill Demo Account (password: <code className="font-mono">password123</code>)
              </p>
              <div className="grid grid-cols-2 gap-2">
                {SEEDED_ACCOUNTS.map((acc) => (
                  <Button
                    key={acc.email}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => fillCredentials(acc.email)}
                  >
                    {acc.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="text-center text-xs text-slate-500">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-semibold text-emerald-700 hover:underline">
                Register
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-xs text-slate-500">
          Loading sign in...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
