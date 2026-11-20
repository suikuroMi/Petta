'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getApiErrorMessage } from '@/lib/api';
import type { Schedule } from '@/types';
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
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClinicScheduleConfigResponse {
  clinic: {
    clinic_id: number;
    clinic_name: string;
    slot_duration_minutes: number;
    concurrent_vets: number;
    default_max_per_slot: number;
  };
  schedules: Schedule[];
}

export default function ClinicSchedulePage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<ClinicScheduleConfigResponse>({
    queryKey: ['clinic-schedules'],
    queryFn: async () => (await api.get<ClinicScheduleConfigResponse>('/clinic/schedules')).data,
  });

  const [draftMaxPerSlot, setDraftMaxPerSlot] = useState<number | null>(null);
  const [draftSlotDuration, setDraftSlotDuration] = useState<number | null>(null);
  const [draftConcurrentVets, setDraftConcurrentVets] = useState<number | null>(null);
  const [draftDays, setDraftDays] = useState<Schedule[] | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const maxPerSlot = draftMaxPerSlot ?? data?.clinic.default_max_per_slot ?? 3;
  const slotDuration = draftSlotDuration ?? data?.clinic.slot_duration_minutes ?? 45;
  const concurrentVets = draftConcurrentVets ?? data?.clinic.concurrent_vets ?? 2;
  const days = draftDays ?? data?.schedules ?? [];

  const updateScheduleMutation = useMutation({
    mutationFn: async () => {
      return (
        await api.put('/clinic/schedules', {
          clinic_id: data?.clinic.clinic_id,
          default_max_per_slot: maxPerSlot,
          slot_duration_minutes: slotDuration,
          concurrent_vets: concurrentVets,
          schedules: days.map((d) => ({
            day_of_week: d.day_of_week,
            is_open: d.is_open,
            open_time: d.open_time,
            close_time: d.close_time,
            max_slots_per_hour: d.max_slots_per_hour,
          })),
        })
      ).data;
    },
    onSuccess: () => {
      setFeedback({
        type: 'ok',
        text: 'Clinic capacity quotas & weekly operating windows saved. Live booking slots updated.',
      });
      setDraftMaxPerSlot(null);
      setDraftSlotDuration(null);
      setDraftConcurrentVets(null);
      setDraftDays(null);
      queryClient.invalidateQueries({ queryKey: ['clinic-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['clinic-slots'] });
      queryClient.invalidateQueries({ queryKey: ['clinic-appointments'] });
    },
    onError: (err) => {
      setFeedback({
        type: 'err',
        text: getApiErrorMessage(err, 'Failed to save schedule settings'),
      });
    },
  });

  const updateDay = (index: number, patch: Partial<Schedule>) => {
    setDraftDays((prev) => {
      const base = prev ?? data?.schedules ?? [];
      return base.map((d, i) => (i === index ? { ...d, ...patch } : d));
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-6 text-center text-xs text-slate-500">
        Loading clinic capacity configuration...
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-[clamp(0.75rem,3vw,1.5rem)] py-[clamp(1rem,2.5vh,1.75rem)] space-y-[clamp(1rem,2.5vh,1.5rem)] overflow-x-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-[clamp(1.25rem,4vw,1.75rem)] font-bold text-slate-900 leading-tight">
            Capacity &amp; Slot Configuration
          </h1>
          <p className="text-xs text-slate-500">
            Define daily operating windows, slot intervals, and booking quotas per slot for{' '}
            <strong>{data?.clinic.clinic_name}</strong>.
          </p>
        </div>

        <Button
          size="sm"
          disabled={updateScheduleMutation.isPending}
          onClick={() => {
            setFeedback(null);
            updateScheduleMutation.mutate();
          }}
        >
          {updateScheduleMutation.isPending ? 'Saving...' : 'Save Schedule Settings'}
        </Button>
      </div>

      {feedback && (
        <div
          className={cn(
            'p-3 rounded-xl border text-xs flex items-center gap-2',
            feedback.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          )}
        >
          {feedback.type === 'ok' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Global Settings Card */}
      <section className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 shadow-sm space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
          Global Quota Defaults
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <Label className="block font-semibold text-slate-700 mb-1 text-xs">
              Max Patients / Time Slot *
            </Label>
            <Input
              type="number"
              min={1}
              max={30}
              value={maxPerSlot}
              onChange={(e) => {
                const next = Math.max(1, Number(e.target.value) || 1);
                setDraftMaxPerSlot(next);
              }}
              className="font-semibold"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Prevents clinic waiting room crowding.
            </span>
          </div>

          <div>
            <Label className="block font-semibold text-slate-700 mb-1 text-xs">
              Slot Duration
            </Label>
            <Select
              value={String(slotDuration)}
              onValueChange={(v) => setDraftSlotDuration(Number(v))}
            >
              <SelectTrigger className="font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 Minutes</SelectItem>
                <SelectItem value="45">45 Minutes</SelectItem>
                <SelectItem value="60">60 Minutes</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Standard consultation buffer.
            </span>
          </div>

          <div>
            <Label className="block font-semibold text-slate-700 mb-1 text-xs">
              Concurrent Vets on Duty
            </Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={concurrentVets}
              onChange={(e) => setDraftConcurrentVets(Math.max(1, Number(e.target.value) || 1))}
              className="font-semibold"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Parallel active examination rooms.
            </span>
          </div>
        </div>
      </section>

      {/* Weekly Schedule Matrix */}
      <section className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Weekly Operating Windows
          </h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setDraftDays((prev) => {
                const base = prev ?? data?.schedules ?? [];
                return base.map((d) => ({ ...d, max_slots_per_hour: maxPerSlot }));
              })
            }
          >
            Apply Global Quota ({maxPerSlot}) to All Days
          </Button>
        </div>

        <div className="space-y-2.5 text-xs">
          {days.map((day, idx) => (
            <div
              key={day.day_of_week}
              className={cn(
                'flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border border-slate-200 rounded-lg gap-3 transition-opacity',
                day.is_open ? 'bg-slate-50' : 'bg-slate-100 opacity-65'
              )}
            >
              <label className="flex items-center gap-3 w-36 cursor-pointer">
                <input
                  type="checkbox"
                  checked={day.is_open}
                  onChange={(e) => updateDay(idx, { is_open: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span className="font-bold text-slate-800">{day.day_of_week}</span>
              </label>

              {day.is_open ? (
                <>
                  <div className="flex items-center gap-2 text-slate-600">
                    <input
                      type="time"
                      value={day.open_time}
                      onChange={(e) => updateDay(idx, { open_time: e.target.value })}
                      className="px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                    />
                    <span>to</span>
                    <input
                      type="time"
                      value={day.close_time}
                      onChange={(e) => updateDay(idx, { close_time: e.target.value })}
                      className="px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">Slot Quota:</span>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={day.max_slots_per_hour}
                      onChange={(e) =>
                        updateDay(idx, {
                          max_slots_per_hour: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                      className="w-16 px-2 py-1 font-bold text-slate-800 bg-white border border-slate-200 rounded text-center"
                    />
                    <span className="text-[11px] text-slate-500">slots/win</span>
                  </div>
                </>
              ) : (
                <>
                  <span className="text-xs text-slate-500 italic">Clinic Closed</span>
                  <span className="text-[11px] text-slate-400">0 slots available</span>
                </>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
