'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getApiErrorMessage } from '@/lib/api';
import { useAuth } from '@/lib/hooks/use-auth';
import { formatDateDisplay, formatTimeDisplay } from '@/lib/format';
import type {
  Appointment,
  AppointmentStatus,
  ClinicSlotAvailability,
  Pet,
} from '@/types';
import { AppointmentStatusBadge } from '@/components/status-badge';
import { AppendRecordModal } from '@/components/append-record-modal';
import { DatePickerTime } from '@/components/date-picker-time';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Plus, CalendarPlus, Search } from 'lucide-react';

interface ClinicQueuePayload {
  appointments: Appointment[];
  metrics: {
    today: string;
    total_today: number;
    completed_today: number;
    scheduled_today: number;
    cancelled_today: number;
    pending_triage: number;
    capacity_pct: number;
    max_per_slot: number;
  };
}

export default function ClinicDashboard() {
  const queryClient = useQueryClient();
  const { data: user } = useAuth();
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const [dateFilter, setDateFilter] = useState<string>(todayStr);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [actionError, setActionError] = useState<string | null>(null);

  // Append Record modal state
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [recordPet, setRecordPet] = useState<Pet | null>(null);
  const [recordApptId, setRecordApptId] = useState<number | null>(null);

  // Walk-in Booking modal state
  const [walkinOpen, setWalkinOpen] = useState(false);
  const [walkinPetId, setWalkinPetId] = useState('');
  const [walkinService, setWalkinService] = useState('General Clinical Checkup');
  const [walkinDateObj, setWalkinDateObj] = useState<Date | undefined>(new Date());
  const [walkinDateStr, setWalkinDateStr] = useState(todayStr);
  const [walkinTime, setWalkinTime] = useState('');
  const [walkinNotes, setWalkinNotes] = useState('');

  // Reschedule modal state
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [rescheduleDateObj, setRescheduleDateObj] = useState<Date | undefined>(undefined);
  const [rescheduleDateStr, setRescheduleDateStr] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');

  const clinicId = user?.clinic_id || 1;

  const { data, isLoading } = useQuery<ClinicQueuePayload>({
    queryKey: ['clinic-appointments', dateFilter, statusFilter, searchQuery],
    queryFn: async () => {
      const res = await api.get<ClinicQueuePayload>('/clinic/appointments', {
        params: {
          date: dateFilter || 'all',
          status: statusFilter,
          q: searchQuery || undefined,
        },
      });
      return res.data;
    },
  });

  const { data: allPets = [] } = useQuery<Pet[]>({
    queryKey: ['clinic-all-pets'],
    queryFn: async () => (await api.get<Pet[]>('/pets')).data,
  });

  const { data: walkinSlots, isLoading: walkinSlotsLoading } = useQuery<{
    is_open: boolean;
    day_of_week: string;
    slots: ClinicSlotAvailability[];
  }>({
    queryKey: ['walkin-slots', clinicId, walkinDateStr],
    queryFn: async () => {
      const res = await api.get(`/clinics/${clinicId}/available-slots`, {
        params: { date: walkinDateStr },
      });
      return res.data;
    },
    enabled: walkinOpen && !!walkinDateStr,
  });

  const { data: rescheduleSlots, isLoading: rescheduleSlotsLoading } = useQuery<{
    is_open: boolean;
    day_of_week: string;
    slots: ClinicSlotAvailability[];
  }>({
    queryKey: ['clinic-reschedule-slots', rescheduleTarget?.clinic_id, rescheduleDateStr],
    queryFn: async () => {
      const res = await api.get(
        `/clinics/${rescheduleTarget?.clinic_id}/available-slots`,
        { params: { date: rescheduleDateStr } }
      );
      return res.data;
    },
    enabled: !!rescheduleTarget && !!rescheduleDateStr,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      appt_id,
      status,
    }: {
      appt_id: number;
      status: AppointmentStatus;
    }) => {
      return (await api.patch(`/appointments/${appt_id}/status`, { status })).data;
    },
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['clinic-appointments'] });
    },
    onError: (err) => {
      setActionError(getApiErrorMessage(err, 'Could not update queue state'));
    },
  });

  const walkinMutation = useMutation({
    mutationFn: async () => {
      return (
        await api.post('/appointments', {
          pet_id: Number(walkinPetId),
          clinic_id: clinicId,
          service_type: walkinService,
          schedule_date: walkinDateStr,
          time_slot: walkinTime,
          chief_complaint: walkinNotes || 'Walk-in clinic visit',
        })
      ).data;
    },
    onSuccess: () => {
      setActionError(null);
      setWalkinOpen(false);
      setWalkinTime('');
      setWalkinNotes('');
      queryClient.invalidateQueries({ queryKey: ['clinic-appointments'] });
    },
    onError: (err) => {
      setActionError(getApiErrorMessage(err, 'Failed to book walk-in slot'));
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
      queryClient.invalidateQueries({ queryKey: ['clinic-appointments'] });
    },
    onError: (err) => {
      setActionError(getApiErrorMessage(err, 'Could not reschedule appointment'));
    },
  });

  const openConsultationModal = async (appt: Appointment) => {
    if (appt.status === 'Confirmed' || appt.status === 'Checked-In') {
      await updateStatusMutation.mutateAsync({
        appt_id: appt.appt_id,
        status: 'In-Consultation',
      });
    }
    const matched = allPets.find((p) => p.pet_id === appt.pet_id) || {
      pet_id: appt.pet_id,
      owner_id: appt.owner_id,
      name: appt.pet_name || `Pet #${appt.pet_id}`,
      species: appt.pet_species || 'Canine',
      breed: appt.pet_breed || '',
      sex: 'Unknown' as const,
      date_of_birth: '',
      status: 'Active',
    };
    setRecordPet(matched);
    setRecordApptId(appt.appt_id);
    setRecordModalOpen(true);
  };

  const metrics = data?.metrics;
  const appointments = data?.appointments || [];
  const isVet = user?.role === 'vet';

  return (
    <div className="w-full max-w-6xl mx-auto px-[clamp(0.75rem,3vw,1.5rem)] py-[clamp(1rem,2.5vh,1.75rem)] space-y-[clamp(1rem,2.5vh,1.5rem)] overflow-x-hidden">
      {/* Metric Cards / Capacity Management */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-400">Today&apos;s Visits</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {metrics?.total_today ?? 0} Bookings
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {metrics?.completed_today ?? 0} Completed • {metrics?.scheduled_today ?? 0} Scheduled
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-400">Needs Triage</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {metrics?.pending_triage ?? 0} Pending
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Requires confirmation</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-400">Daily Capacity</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {metrics?.capacity_pct ?? 0}% Quota
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Max {metrics?.max_per_slot ?? 3} patients / slot cap
          </p>
        </div>
      </section>

      {/* Queue Header & Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            {dateFilter === 'all'
              ? 'All Clinic Appointments'
              : dateFilter === todayStr
              ? "Today's Patient Queue"
              : `Patient Queue — ${formatDateDisplay(dateFilter)}`}
          </h1>
          <p className="text-xs text-slate-500">
            {user?.clinic_name || 'Healthy Paws Vet Hospital'} • Live capacity-controlled queue
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-52">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pet or owner..."
              className="pl-8 h-9 text-xs bg-white"
            />
          </div>

          <Select
            value={dateFilter === 'all' ? 'all' : dateFilter === todayStr ? 'today' : 'custom'}
            onValueChange={(val) => {
              if (val === 'today') setDateFilter(todayStr);
              if (val === 'all') setDateFilter('all');
            }}
          >
            <SelectTrigger className="w-32 h-9 text-xs bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="all">All Dates</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-9 text-xs bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Confirmed">Confirmed</SelectItem>
              <SelectItem value="Checked-In">Checked-In</SelectItem>
              <SelectItem value="In-Consultation">In-Consultation</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setActionError(null);
              if (!walkinPetId && allPets[0]) setWalkinPetId(String(allPets[0].pet_id));
              setWalkinOpen(true);
            }}
          >
            <CalendarPlus className="h-3.5 w-3.5" /> Walk-In
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setRecordPet(null);
              setRecordApptId(null);
              setRecordModalOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" /> Append Record
          </Button>
        </div>
      </div>

      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Queue Cards */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-500">Loading patient queue...</div>
      ) : appointments.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-2">
          <p className="text-sm font-bold text-slate-900">No appointments match this filter</p>
          <p className="text-xs text-slate-500">
            Switch to &quot;All Dates&quot; or book a walk-in appointment above.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((appt) => (
            <div
              key={appt.appt_id}
              className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="text-center shrink-0">
                  <span className="text-xs font-mono font-bold px-2.5 py-1 bg-slate-100 text-slate-800 rounded block">
                    {formatTimeDisplay(appt.time_slot)}
                  </span>
                  {dateFilter === 'all' && (
                    <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                      {formatDateDisplay(appt.schedule_date)}
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-900">
                      {appt.pet_name} ({appt.pet_breed})
                    </span>
                    <AppointmentStatusBadge status={appt.status} />
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Owner: {appt.owner_name}
                    {appt.owner_phone ? ` (${appt.owner_phone})` : ''} • Service:{' '}
                    <span className="font-medium text-slate-700">{appt.service_type}</span>
                  </p>
                  {appt.chief_complaint && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      Note: {appt.chief_complaint}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end border-t md:border-none pt-2 md:pt-0">
                {appt.status === 'Pending' && (
                  <>
                    <Button
                      size="sm"
                      onClick={() =>
                        updateStatusMutation.mutate({
                          appt_id: appt.appt_id,
                          status: 'Confirmed',
                        })
                      }
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() =>
                        updateStatusMutation.mutate({
                          appt_id: appt.appt_id,
                          status: 'Cancelled',
                        })
                      }
                    >
                      Reject
                    </Button>
                  </>
                )}

                {appt.status === 'Confirmed' && (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        updateStatusMutation.mutate({
                          appt_id: appt.appt_id,
                          status: 'Checked-In',
                        })
                      }
                    >
                      Check-In Patient
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setRescheduleTarget(appt);
                        setRescheduleDateObj(undefined);
                        setRescheduleDateStr('');
                        setRescheduleTime('');
                      }}
                    >
                      Reschedule
                    </Button>
                  </>
                )}

                {appt.status === 'Checked-In' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openConsultationModal(appt)}
                  >
                    Start Consultation
                  </Button>
                )}

                {appt.status === 'In-Consultation' && (
                  <>
                    {isVet ? (
                      <Button size="sm" onClick={() => openConsultationModal(appt)}>
                        Log Record &amp; Complete
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateStatusMutation.mutate({
                            appt_id: appt.appt_id,
                            status: 'Completed',
                          })
                        }
                      >
                        Mark Completed
                      </Button>
                    )}
                  </>
                )}

                {appt.status === 'Completed' && (
                  <Link href={`/records?petId=${appt.pet_id}`}>
                    <Button size="sm" variant="outline">
                      View Ledger
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Append Medical Record Modal */}
      <AppendRecordModal
        open={recordModalOpen}
        onOpenChange={setRecordModalOpen}
        defaultPet={recordPet}
        defaultApptId={recordApptId}
        canWrite={isVet}
      />

      {/* Walk-In Booking Modal */}
      <Dialog open={walkinOpen} onOpenChange={setWalkinOpen}>
        <DialogContent className="w-[min(calc(100vw-2rem),42rem)] max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Register Walk-In Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Patient *</Label>
                <Select value={walkinPetId} onValueChange={setWalkinPetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {allPets.map((p) => (
                      <SelectItem key={p.pet_id} value={String(p.pet_id)}>
                        #{p.pet_id} {p.name} ({p.owner_name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Service *</Label>
                <Select value={walkinService} onValueChange={setWalkinService}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General Clinical Checkup">
                      General Clinical Checkup
                    </SelectItem>
                    <SelectItem value="Routine Vaccination Booster">
                      Routine Vaccination Booster
                    </SelectItem>
                    <SelectItem value="Deworming Treatment">Deworming Treatment</SelectItem>
                    <SelectItem value="Minor Surgical Consultation">
                      Minor Surgical Consultation
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Triage Notes</Label>
              <Input
                value={walkinNotes}
                onChange={(e) => setWalkinNotes(e.target.value)}
                placeholder="Reason for walk-in visit..."
              />
            </div>

            <DatePickerTime
              selectedDate={walkinDateObj}
              selectedDateStr={walkinDateStr}
              onDateChange={(d) => {
                setWalkinDateObj(d);
                setWalkinDateStr(d ? format(d, 'yyyy-MM-dd') : '');
                setWalkinTime('');
              }}
              selectedTime={walkinTime}
              onTimeChange={setWalkinTime}
              slots={walkinSlots?.slots || []}
              isOpenDay={walkinSlots?.is_open ?? true}
              dayOfWeek={walkinSlots?.day_of_week}
              isLoadingSlots={walkinSlotsLoading}
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setWalkinOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!walkinPetId || !walkinDateStr || !walkinTime || walkinMutation.isPending}
                onClick={() => walkinMutation.mutate()}
              >
                {walkinMutation.isPending ? 'Booking...' : 'Confirm Walk-In Slot'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reschedule Modal */}
      <Dialog
        open={!!rescheduleTarget}
        onOpenChange={(open) => !open && setRescheduleTarget(null)}
      >
        <DialogContent className="w-[min(calc(100vw-2rem),42rem)] max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Reschedule Patient — {rescheduleTarget?.pet_name}
            </DialogTitle>
          </DialogHeader>
          {rescheduleTarget && (
            <div className="space-y-4">
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
                slots={rescheduleSlots?.slots || []}
                isOpenDay={rescheduleSlots?.is_open ?? true}
                dayOfWeek={rescheduleSlots?.day_of_week}
                isLoadingSlots={rescheduleSlotsLoading}
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
                  {rescheduleMutation.isPending ? 'Updating...' : 'Save New Time Slot'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
