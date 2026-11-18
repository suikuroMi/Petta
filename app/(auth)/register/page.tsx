'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getApiErrorMessage } from '@/lib/api';
import { getHomeRouteForRole } from '@/lib/hooks/use-auth';
import type { Clinic, User } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'owner' | 'vet' | 'staff'>('owner');
  const [clinicId, setClinicId] = useState<string>('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: clinics = [] } = useQuery<Clinic[]>({
    queryKey: ['public-clinics'],
    queryFn: async () => {
      const res = await api.get<Clinic[]>('/clinics');
      return res.data;
    },
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ user: User; token: string }>('/auth/register', {
        full_name: fullName,
        email,
        phone_number: phoneNumber || undefined,
        password,
        role,
        clinic_id: role !== 'owner' && clinicId ? Number(clinicId) : undefined,
        license_number: role === 'vet' ? licenseNumber || undefined : undefined,
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.clear();
      queryClient.setQueryData(['auth-me'], data.user);
      router.push(getHomeRouteForRole(data.user.role));
    },
    onError: (err) => {
      setErrorMessage(getApiErrorMessage(err, 'Registration failed'));
    },
  });

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    registerMutation.mutate();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md space-y-4">
        <Link
          href="/"
          className="text-xs font-semibold text-slate-500 hover:text-emerald-600 inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
        </Link>

        <Card className="w-full">
          <CardHeader className="text-center space-y-1">
            <div className="text-2xl font-bold text-emerald-600 mb-1">🐾 Petta</div>
            <CardTitle className="text-xl">Create Petta Account</CardTitle>
            <p className="text-xs text-slate-500">
              Register as a pet owner or partner clinic staff/veterinarian
            </p>
          </CardHeader>
          <CardContent>
            {errorMessage && (
              <div className="mb-4 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-xs font-semibold text-slate-700">
                  Full Name *
                </Label>
                <Input
                  id="fullName"
                  placeholder="e.g. Camille Santos"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                    Email *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="camille@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-semibold text-slate-700">
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    placeholder="+63 917..."
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                  Password (min 6 characters) *
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Account Role</Label>
                <Select
                  value={role}
                  onValueChange={(val: 'owner' | 'vet' | 'staff') => setRole(val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Pet Owner</SelectItem>
                    <SelectItem value="vet">Attending Veterinarian</SelectItem>
                    <SelectItem value="staff">Clinic Staff / Receptionist</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(role === 'vet' || role === 'staff') && (
                <div className="space-y-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Assigned Veterinary Clinic
                    </Label>
                    <Select value={clinicId} onValueChange={setClinicId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select clinic (defaults to first verified)" />
                      </SelectTrigger>
                      <SelectContent>
                        {clinics.map((c) => (
                          <SelectItem key={c.clinic_id} value={String(c.clinic_id)}>
                            {c.clinic_name} ({c.location})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {role === 'vet' && (
                    <div className="space-y-1.5">
                      <Label htmlFor="license" className="text-xs font-semibold text-slate-700">
                        PRC Veterinary License #
                      </Label>
                      <Input
                        id="license"
                        placeholder="e.g. PRC-DVM-004192"
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                {registerMutation.isPending ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-4 text-center text-xs text-slate-500">
              Already registered?{' '}
              <Link href="/login" className="font-semibold text-emerald-700 hover:underline">
                Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
