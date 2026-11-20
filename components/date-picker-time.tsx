'use client';

import * as React from 'react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { ClinicSlotAvailability } from '@/types';
import { formatDateDisplay } from '@/lib/format';
import { CalendarDays, Clock, AlertCircle } from 'lucide-react';

export type ClinicSlotItem = ClinicSlotAvailability;

interface DatePickerTimeProps {
  selectedDate?: Date;
  selectedDateStr?: string;
  onDateChange: (date: Date | undefined) => void;
  selectedTime?: string;
  onTimeChange: (time: string) => void;
  slots: ClinicSlotAvailability[];
  isOpenDay?: boolean;
  dayOfWeek?: string;
  isLoadingSlots?: boolean;
}

export function DatePickerTime({
  selectedDate,
  selectedDateStr,
  onDateChange,
  selectedTime,
  onTimeChange,
  slots = [],
  isOpenDay = true,
  dayOfWeek,
  isLoadingSlots = false,
}: DatePickerTimeProps) {
  const morningSlots = slots.filter((s) => s.period === 'morning');
  const afternoonSlots = slots.filter((s) => s.period === 'afternoon');

  const renderSlotGroup = (title: string, items: ClinicSlotAvailability[]) => {
    if (items.length === 0) return null;
    return (
      <div>
        <p className="text-xs font-semibold text-slate-500 mb-2">{title}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {items.map((slot) => {
            const isSelected = selectedTime === slot.time_slot;
            if (!slot.available) {
              return (
                <button
                  key={slot.time_slot}
                  type="button"
                  disabled
                  className="p-[clamp(0.5rem,1.5vw,0.625rem)] border border-slate-200 bg-slate-100 text-slate-400 rounded-lg text-left cursor-not-allowed opacity-70"
                >
                  <div className="text-xs font-semibold line-through">{slot.label}</div>
                  <div className="text-[10px] text-red-500 font-semibold">
                    Full Capacity ({slot.booked_count}/{slot.max_capacity})
                  </div>
                </button>
              );
            }

            return (
              <button
                key={slot.time_slot}
                type="button"
                onClick={() => onTimeChange(slot.time_slot)}
                className={cn(
                  'p-[clamp(0.5rem,1.5vw,0.625rem)] rounded-lg text-left transition-all cursor-pointer',
                  isSelected
                    ? 'border-2 border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                    : 'border border-slate-200 hover:border-emerald-300 bg-white text-slate-800'
                )}
              >
                <div className="text-xs font-bold">{slot.label}</div>
                <div
                  className={cn(
                    'text-[10px] font-medium',
                    isSelected ? 'text-emerald-700' : 'text-slate-500'
                  )}
                >
                  {slot.remaining} slot{slot.remaining === 1 ? '' : 's'} remaining
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-[clamp(1rem,3vw,1.5rem)] items-start w-full">
      {/* Mini Interactive Calendar */}
      <div className="w-full border border-slate-200 rounded-xl p-[clamp(0.5rem,2vw,0.875rem)] bg-slate-50/70 flex flex-col items-center overflow-x-auto">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onDateChange}
          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
          className="w-full max-w-full flex justify-center"
        />
        {selectedDateStr && (
          <p className="text-xs text-emerald-700 font-semibold mt-2 pb-1 flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            Selected: {dayOfWeek ? `${dayOfWeek}, ` : ''}
            {formatDateDisplay(selectedDateStr)}
          </p>
        )}
      </div>

      {/* Real-time Quota Slot Buttons */}
      <div className="space-y-4">
        {!selectedDateStr ? (
          <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center text-xs text-slate-500 space-y-2">
            <Clock className="h-6 w-6 mx-auto text-slate-400" />
            <p className="font-medium">Choose a date on the calendar to view live clinic slot quotas.</p>
          </div>
        ) : isLoadingSlots ? (
          <div className="border border-slate-200 rounded-xl p-6 text-center text-xs text-slate-500">
            Checking real-time slot availability...
          </div>
        ) : !isOpenDay ? (
          <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Clinic Closed on {dayOfWeek}</p>
              <p className="mt-0.5 text-amber-800">
                Please pick another operating day from the calendar to view available booking windows.
              </p>
            </div>
          </div>
        ) : slots.length === 0 ? (
          <div className="border border-slate-200 rounded-xl p-6 text-center text-xs text-slate-500">
            No time slots configured for this day.
          </div>
        ) : (
          <div className="space-y-4">
            {renderSlotGroup('Morning Slots', morningSlots)}
            {renderSlotGroup('Afternoon Slots', afternoonSlots)}
          </div>
        )}
      </div>
    </div>
  );
}
