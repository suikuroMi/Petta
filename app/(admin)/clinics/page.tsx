'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getApiErrorMessage } from '@/lib/api';
import type { Clinic } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertCircle, CheckCircle2, Plus, XCircle } from 'lucide-react';

export default function AdminClinicsVerificationPage() {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [clinicName, setClinicName] = useState('');
  const [location, setLocation] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [servicesOffered, setServicesOffered] = useState(
    'Routine Vaccination Booster, Deworming Treatment, General Clinical Checkup'
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: clinics = [], isLoading } = useQuery<Clinic[]>({
    queryKey: ['admin-clinics'],
    queryFn: async () => (await api.get<Clinic[]>('/admin/clinics')).data,
  });

  const toggleVerificationMutation = useMutation({
    mutationFn: async ({
      clinic_id,
      verified,
    }: {
      clinic_id: number;
      verified: boolean;
    }) => {
      return (await api.patch(`/admin/clinics/${clinic_id}/verify`, { verified })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-clinics'] });
      queryClient.invalidateQueries({ queryKey: ['clinics'] });
    },
  });

  const createClinicMutation = useMutation({
    mutationFn: async () => {
      return (
        await api.post('/admin/clinics', {
          clinic_name: clinicName,
          location,
          address_detail: addressDetail || undefined,
          contact_info: contactInfo,
          services_offered: servicesOffered,
          verified: true,
        })
      ).data;
    },
    onSuccess: () => {
      setAddOpen(false);
      setClinicName('');
      setLocation('');
      setAddressDetail('');
      setContactInfo('');
      setErrorMsg(null);
      queryClient.invalidateQueries({ queryKey: ['admin-clinics'] });
      queryClient.invalidateQueries({ queryKey: ['clinics'] });
    },
    onError: (err) => {
      setErrorMsg(getApiErrorMessage(err, 'Failed to register clinic'));
    },
  });

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">
            Clinic Governance &amp; Verification
          </h1>
          <p className="text-xs text-slate-500">
            Verify licensed veterinary facilities before granting booking and ledger privileges.
          </p>
        </div>

        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Register Partner Clinic
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Registered Veterinary Facilities</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-6 text-center text-xs text-slate-500">
              Loading clinic registry...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[70px]">ID</TableHead>
                  <TableHead>Facility Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clinics.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-xs text-slate-500">
                      No clinics registered.
                    </TableCell>
                  </TableRow>
                ) : (
                  clinics.map((clinic) => (
                    <TableRow key={clinic.clinic_id}>
                      <TableCell className="font-mono text-xs">#{clinic.clinic_id}</TableCell>
                      <TableCell className="font-semibold text-xs">
                        {clinic.clinic_name}
                      </TableCell>
                      <TableCell className="text-xs">{clinic.location}</TableCell>
                      <TableCell className="text-xs">{clinic.contact_info}</TableCell>
                      <TableCell className="text-xs max-w-xs truncate">
                        {clinic.services_offered}
                      </TableCell>
                      <TableCell>
                        {clinic.verified ? (
                          <Badge variant="default">Verified</Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-amber-50 text-amber-700 border-amber-200"
                          >
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {clinic.verified ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() =>
                              toggleVerificationMutation.mutate({
                                clinic_id: clinic.clinic_id,
                                verified: false,
                              })
                            }
                          >
                            <XCircle className="h-3.5 w-3.5" /> Deactivate
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                            onClick={() =>
                              toggleVerificationMutation.mutate({
                                clinic_id: clinic.clinic_id,
                                verified: true,
                              })
                            }
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Verify Clinic
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Register Partner Clinic</DialogTitle>
          </DialogHeader>

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setErrorMsg(null);
              createClinicMutation.mutate();
            }}
            className="space-y-3.5 text-xs"
          >
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Facility Name *</Label>
              <Input
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                placeholder="e.g. Bicol Pet Wellness Clinic"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">City / Municipality *</Label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Naga City"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Contact *</Label>
                <Input
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  placeholder="+63 917..."
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Street Address</Label>
              <Input
                value={addressDetail}
                onChange={(e) => setAddressDetail(e.target.value)}
                placeholder="Building, street, barangay..."
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Services Offered *</Label>
              <Input
                value={servicesOffered}
                onChange={(e) => setServicesOffered(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createClinicMutation.isPending}>
                {createClinicMutation.isPending ? 'Saving...' : 'Create & Verify Clinic'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
