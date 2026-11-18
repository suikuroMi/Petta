'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { api, getApiErrorMessage } from '@/lib/api';
import { formatDateDisplay, formatTimeDisplay } from '@/lib/format';
import type { Clinic, ClinicSlotAvailability, Pet } from '@/types';
import { DatePickerTime } from '@/components/date-picker-time';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, ArrowLeft, CheckCircle2, Info, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

function BookAppointmentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const preselectedPetId = searchParams.get('petId') || '';

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [petIdState, setPetId] = useState<string>(preselectedPetId);
  const [clinicIdState, setClinicId] = useState<string>('');
  const [serviceTypeState, setServiceType] = useState<string>('');
  const [chiefComplaint, setChiefComplaint] = useState<string>('');
  const [clinicSearch, setClinicSearch] = useState<string>('');
  const [selectedDateObj, setSelectedDateObj] = useState<Date | undefined>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: pets = [] } = useQuery<Pet[]>({
    queryKey: ['my-pets'],
    queryFn: async () => (await api.get<Pet[]>('/pets')).data,
  });

  const { data: clinics = [] } = useQuery<Clinic[]>({
    queryKey: ['clinics'],
    queryFn: async () => (await api.get<Clinic[]>('/clinics')).data,
  });

  const petId = petIdState || preselectedPetId || (pets[0] ? String(pets[0].pet_id) : '');
  const clinicId = clinicIdState || (clinics[0] ? String(clinics[0].clinic_id) : '');

  const filteredClinics = clinics.filter(
    (c) =>
      c.clinic_name.toLowerCase().includes(clinicSearch.toLowerCase()) ||
      c.location.toLowerCase().includes(clinicSearch.toLowerCase())
  );

  const activeClinic = clinics.find((c) => String(c.clinic_id) === clinicId) || null;
  const activePet = pets.find((p) => String(p.pet_id) === petId) || null;
  const availableServices = activeClinic
    ? activeClinic.services_offered.split(',').map((s) => s.trim())
    : [];
  const serviceType = serviceTypeState || availableServices[0] || '';

  const { data: slotPayload, isLoading: slotsLoading } = useQuery<{
    is_open: boolean;
    day_of_week: string;
    slots: ClinicSlotAvailability[];
  }>({
    queryKey: ['clinic-slots', clinicId, selectedDateStr],
    queryFn: async () => {
      const res = await api.get(`/clinics/${clinicId}/available-slots`, {
        params: { date: selectedDateStr },
      });
      return res.data;
    },
    enabled: !!clinicId && !!selectedDateStr,
  });

  const bookingMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/appointments', {
        pet_id: Number(petId),
        clinic_id: Number(clinicId),
        service_type: serviceType,
        schedule_date: selectedDateStr,
        time_slot: selectedTime,
        chief_complaint: chiefComplaint || undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['clinic-slots'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      router.push('/appointments');
    },
    onError: (err) => {
      setSubmitError(getApiErrorMessage(err, 'Could not reserve slot'));
      queryClient.invalidateQueries({ queryKey: ['clinic-slots', clinicId, selectedDateStr] });
    },
  });

  const handleClinicChange = (newClinicId: string) => {
    setClinicId(newClinicId);
    setSelectedTime('');
    const nextClinic = clinics.find((c) => String(c.clinic_id) === newClinicId);
    const services = nextClinic ? nextClinic.services_offered.split(',').map((s) => s.trim()) : [];
    setServiceType(services[0] || '');
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <Link
          href="/appointments"
          className="text-xs font-semibold text-slate-500 hover:text-emerald-600 inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Appointments
        </Link>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-2">
          Book a Clinic Appointment
        </h1>
        <p className="text-xs text-slate-500">
          Select your pet, pick a verified clinic, and reserve a real-time capacity-controlled slot.
        </p>
      </div>

      {/* Step Progress Bar */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
        {[
          { num: 1 as const, label: '1. Select Service' },
          { num: 2 as const, label: '2. Date & Time Slot' },
          { num: 3 as const, label: '3. Confirmation' },
        ].map((item) => (
          <button
            key={item.num}
            type="button"
            onClick={() => {
              if (item.num === 1) setStep(1);
              if (item.num === 2 && petId && clinicId && serviceType) setStep(2);
              if (item.num === 3 && petId && clinicId && serviceType && selectedDateStr && selectedTime)
                setStep(3);
            }}
            className={cn(
              'pb-2 border-b-2 transition-colors cursor-pointer',
              step >= item.num
                ? 'border-emerald-600 text-emerald-700'
                : 'border-slate-200 text-slate-400'
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {submitError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Step 1: Appointment Details */}
      <section className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            1. Appointment Details
          </h2>
          <div className="relative w-48 hidden sm:block">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <Input
              value={clinicSearch}
              onChange={(e) => setClinicSearch(e.target.value)}
              placeholder="Filter clinic/city..."
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        {pets.length === 0 ? (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center justify-between">
            <span>You need to register a pet profile before booking a clinic visit.</span>
            <Link href="/pets">
              <Button size="sm">Register Pet</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Select Pet *</Label>
              <Select value={petId} onValueChange={setPetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a pet" />
                </SelectTrigger>
                <SelectContent>
                  {pets.map((p) => (
                    <SelectItem key={p.pet_id} value={String(p.pet_id)}>
                      {p.name} ({p.species} - {p.breed})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Select Veterinary Clinic *
              </Label>
              <Select value={clinicId} onValueChange={handleClinicChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose verified clinic" />
                </SelectTrigger>
                <SelectContent>
                  {filteredClinics.map((c) => (
                    <SelectItem key={c.clinic_id} value={String(c.clinic_id)}>
                      {c.clinic_name} ({c.location})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Service Type *</Label>
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {availableServices.map((srv) => (
                    <SelectItem key={srv} value={srv}>
                      {srv}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="space-y-1.5 text-xs">
          <Label className="text-xs font-semibold text-slate-700">
            Visit Notes / Symptoms (Optional)
          </Label>
          <Textarea
            rows={2}
            value={chiefComplaint}
            onChange={(e) => setChiefComplaint(e.target.value)}
            placeholder="Brief note for the clinic or attending veterinarian (e.g., due for annual booster, mild ear scratching)..."
          />
        </div>
      </section>

      {/* Step 2: Date & Available Slots */}
      <section className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 space-y-4 shadow-sm">
        <div className="flex justify-between items-center">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            2. Select Schedule Slot
          </h2>
          <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
            Capacity Enforced
          </span>
        </div>

        <DatePickerTime
          selectedDate={selectedDateObj}
          selectedDateStr={selectedDateStr}
          onDateChange={(d) => {
            setSelectedDateObj(d);
            setSelectedDateStr(d ? format(d, 'yyyy-MM-dd') : '');
            setSelectedTime('');
            if (d) setStep(2);
          }}
          selectedTime={selectedTime}
          onTimeChange={(t) => {
            setSelectedTime(t);
            setStep(3);
          }}
          slots={slotPayload?.slots || []}
          isOpenDay={slotPayload?.is_open ?? true}
          dayOfWeek={slotPayload?.day_of_week}
          isLoadingSlots={slotsLoading}
        />
      </section>

      {/* Step 3 Summary Card */}
      {selectedTime && activePet && activeClinic && (
        <section className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 md:p-5 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-emerald-900">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>3. Booking Summary Ready</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1 text-slate-700">
            <div>
              <span className="text-[10px] uppercase text-slate-500 block">Patient</span>
              <strong>{activePet.name}</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-500 block">Clinic</span>
              <strong>{activeClinic.clinic_name}</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-500 block">Service</span>
              <strong>{serviceType}</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-500 block">Reserved Slot</span>
              <strong>
                {formatDateDisplay(selectedDateStr)} at {formatTimeDisplay(selectedTime)}
              </strong>
            </div>
          </div>
        </section>
      )}

      {/* Scope / Delimitation Callout */}
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
        <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">In-Person Settlement Policy:</span> Consultation and
          treatment fees are settled directly at the veterinary clinic desk upon appointment
          completion. Online payments are not processed through Petta.
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex justify-end gap-3 pt-1">
        <Link href="/appointments">
          <Button variant="outline" size="sm">
            Cancel
          </Button>
        </Link>
        <Button
          size="sm"
          disabled={
            !petId ||
            !clinicId ||
            !serviceType ||
            !selectedDateStr ||
            !selectedTime ||
            bookingMutation.isPending
          }
          onClick={() => {
            setSubmitError(null);
            bookingMutation.mutate();
          }}
        >
          {bookingMutation.isPending
            ? 'Reserving Slot...'
            : 'Review & Confirm Booking →'}
        </Button>
      </div>
    </div>
  );
}

export default function BookAppointmentPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto p-6 text-center text-xs text-slate-500">
          Loading booking scheduler...
        </div>
      }
    >
      <BookAppointmentContent />
    </Suspense>
  );
}
