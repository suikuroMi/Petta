'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getApiErrorMessage } from '@/lib/api';
import { formatDateDisplay, formatTimeDisplay } from '@/lib/format';
import type { Appointment, ClinicSlotAvailability } from '@/types';
import { AppointmentStatusBadge } from '@/components/status-badge';
import { DatePickerTime } from '@/components/date-picker-time';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Calendar,
  Clock,
  Plus,
  X,
  MapPin,
  RefreshCw,
  AlertCircle,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type TabFilter = 'all' | 'upcoming' | 'completed' | 'cancelled';

export default function MyAppointmentsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabFilter>('all');
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [rescheduleDateObj, setRescheduleDateObj] = useState<Date | undefined>(undefined);
  const [rescheduleDateStr, setRescheduleDateStr] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ['my-appointments'],
    queryFn: async () => (await api.get<Appointment[]>('/appointments')).data,
  });

  const { data: slotPayload, isLoading: slotsLoading } = useQuery<{
    is_open: boolean;
    day_of_week: string;
    slots: ClinicSlotAvailability[];
  }>({
    queryKey: ['reschedule-slots', rescheduleTarget?.clinic_id, rescheduleDateStr],
    queryFn: async () => {
      const res = await api.get(
        `/clinics/${rescheduleTarget?.clinic_id}/available-slots`,
        { params: { date: rescheduleDateStr } }
      );
      return res.data;
    },
    enabled: !!rescheduleTarget && !!rescheduleDateStr,
  });

  const cancelMutation = useMutation({
    mutationFn: async (apptId: number) => {
      return (await api.patch(`/appointments/${apptId}/status`, { status: 'Cancelled' })).data;
    },
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['clinic-slots'] });
    },
    onError: (err) => {
      setActionError(getApiErrorMessage(err, 'Failed to cancel booking'));
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: async () => {
      if (!rescheduleTarget) return;
      return (
        await api.patch(`/appointments/${rescheduleTarget.appt_id}/reschedule`, {
          schedule_date: rescheduleDateStr,
          time_slot: rescheduleTime,
        })
      ).data;
    },
    onSuccess: () => {
      setActionError(null);
      setRescheduleTarget(null);
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['clinic-slots'] });
    },
    onError: (err) => {
      setActionError(getApiErrorMessage(err, 'Could not reschedule booking'));
    },
  });

  const filtered = appointments.filter((a) => {
    if (tab === 'upcoming') {
      return a.status !== 'Completed' && a.status !== 'Cancelled';
    }
    if (tab === 'completed') return a.status === 'Completed';
    if (tab === 'cancelled') return a.status === 'Cancelled';
    return true;
  });

  const openReschedule = (appt: Appointment) => {
    setActionError(null);
    setRescheduleTarget(appt);
    setRescheduleDateObj(undefined);
    setRescheduleDateStr('');
    setRescheduleTime('');
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-[clamp(1rem,3vw,1.5rem)] py-[clamp(1rem,2.5vh,1.75rem)] space-y-[clamp(1rem,2.5vh,1.5rem)] overflow-x-hidden">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-[clamp(1.25rem,4vw,1.75rem)] font-bold text-slate-900 leading-tight">Appointments</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track real-time clinic approvals, check-in status, and reschedule visits.
          </p>
        </div>
        <Link href="/appointments/book">
          <Button size="sm">
            <Plus className="h-4 w-4" /> Book Appointment
          </Button>
        </Link>
      </div>

      {/* Policy Notice */}
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
        <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <span>
          <strong>In-Person Settlement Policy:</strong> Consultation and treatment fees are settled
          directly at the veterinary clinic desk upon visit completion.
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 text-xs border-b border-slate-200">
        {(
          [
            { id: 'all', label: 'All Bookings' },
            { id: 'upcoming', label: 'Upcoming / Active' },
            { id: 'completed', label: 'Completed' },
            { id: 'cancelled', label: 'Cancelled' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'px-3.5 py-2 whitespace-nowrap transition-colors cursor-pointer',
              tab === t.id
                ? 'font-semibold text-emerald-700 border-b-2 border-emerald-600'
                : 'text-slate-500 hover:text-slate-800'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-500">Loading appointments...</div>
      ) : filtered.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent className="space-y-3">
            <Calendar className="h-8 w-8 mx-auto text-slate-400" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-900">No appointments in this view</p>
              <p className="text-xs text-slate-500">
                Reserve an available time slot at a verified partner clinic.
              </p>
            </div>
            <Link href="/appointments/book">
              <Button size="sm">
                <Plus className="h-4 w-4" /> Book a Visit
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((appt) => {
            const canModify =
              appt.status === 'Pending' || appt.status === 'Confirmed';
            return (
              <Card key={appt.appt_id} className="p-4 md:p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900">
                        {appt.pet_name || `Pet #${appt.pet_id}`} • {appt.service_type}
                      </span>
                      <AppointmentStatusBadge status={appt.status} />
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {appt.clinic_name || `Clinic #${appt.clinic_id}`}
                      {appt.clinic_location ? ` (${appt.clinic_location})` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                      {formatDateDisplay(appt.schedule_date)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-emerald-600" />
                      {formatTimeDisplay(appt.time_slot)}
                    </span>
                  </div>
                </div>

                {appt.chief_complaint && (
                  <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                    <strong className="text-slate-700">Visit Note:</strong> {appt.chief_complaint}
                  </p>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                  <span className="text-slate-400 font-mono">Ref #{appt.appt_id}</span>
                  <div className="flex items-center gap-2">
                    {appt.status === 'Completed' && (
                      <Link href={`/pets/${appt.pet_id}/history`}>
                        <Button size="sm" variant="outline">
                          View Health Ledger
                        </Button>
                      </Link>
                    )}
                    {canModify && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openReschedule(appt)}
                        >
                          <RefreshCw className="h-3.5 w-3.5" /> Reschedule
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => cancelMutation.mutate(appt.appt_id)}
                          disabled={cancelMutation.isPending}
                        >
                          <X className="h-3.5 w-3.5" /> Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reschedule Modal */}
      <Dialog
        open={!!rescheduleTarget}
        onOpenChange={(open) => !open && setRescheduleTarget(null)}
      >
        <DialogContent className="w-[min(calc(100vw-2rem),42rem)] max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Reschedule Visit — {rescheduleTarget?.pet_name}
            </DialogTitle>
          </DialogHeader>
          {rescheduleTarget && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Clinic: <strong>{rescheduleTarget.clinic_name}</strong> • Service:{' '}
                <strong>{rescheduleTarget.service_type}</strong>
              </p>

              <DatePickerTime
                selectedDate={rescheduleDateObj}
                selectedDateStr={rescheduleDateStr}
                onDateChange={(d) => {
                  setRescheduleDateObj(d);
                  setRescheduleDateStr(d ? format(d, 'yyyy-MM-dd') : '');
                  setRescheduleTime('');
                }}
                selectedTime={rescheduleTime}
                onTimeChange={setRescheduleTime}
                slots={slotPayload?.slots || []}
                isOpenDay={slotPayload?.is_open ?? true}
                dayOfWeek={slotPayload?.day_of_week}
                isLoadingSlots={slotsLoading}
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRescheduleTarget(null)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!rescheduleDateStr || !rescheduleTime || rescheduleMutation.isPending}
                  onClick={() => rescheduleMutation.mutate()}
                >
                  {rescheduleMutation.isPending ? 'Updating...' : 'Confirm New Slot'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
