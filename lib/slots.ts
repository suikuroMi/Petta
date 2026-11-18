import { DAYS_OF_WEEK } from '@/lib/validations';

export function formatTime12h(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function fromMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function getDayOfWeekFromDate(dateStr: string): (typeof DAYS_OF_WEEK)[number] {
  const [year, month, day] = dateStr.split('-').map(Number);
  // Use UTC noon to avoid timezone day-shift
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const jsDay = d.getUTCDay(); // 0=Sun..6=Sat
  const map: Record<number, (typeof DAYS_OF_WEEK)[number]> = {
    0: 'Sunday',
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
  };
  return map[jsDay];
}

export function generateTimeSlots(
  openTime: string,
  closeTime: string,
  slotDurationMinutes: number
): string[] {
  const openMin = toMinutes(openTime);
  const closeMin = toMinutes(closeTime);
  const step = Math.max(15, slotDurationMinutes || 45);
  const slots: string[] = [];

  for (let cur = openMin; cur + step <= closeMin; cur += step) {
    // Standard clinic midday lunch pause 12:00 - 13:00
    if (cur >= 12 * 60 && cur < 13 * 60) {
      continue;
    }
    slots.push(fromMinutes(cur));
  }

  return slots;
}

export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysFormatted(base: Date, days: number): string {
  const copy = new Date(base);
  copy.setDate(copy.getDate() + days);
  return formatLocalDate(copy);
}
