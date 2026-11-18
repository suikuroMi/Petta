import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { forbiddenResponse, getSessionUser, hasRole, unauthorizedResponse } from '@/lib/auth';
import { clinicConfigUpdateSchema, DAYS_OF_WEEK } from '@/lib/validations';

function resolveClinicId(userClinicId: number | null | undefined, requested?: string | null): number {
  if (requested && Number(requested) > 0) return Number(requested);
  if (userClinicId && userClinicId > 0) return userClinicId;
  return 1;
}

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();

  if (!hasRole(user, ['vet', 'staff', 'admin'])) {
    return forbiddenResponse('Only clinic personnel or admins can access schedule settings');
  }

  const { searchParams } = new URL(request.url);
  const clinicId = resolveClinicId(user.clinic_id, searchParams.get('clinic_id'));
  const db = await getDb();

  const clinic = await db.get<Record<string, unknown>>(
    `SELECT clinic_id, clinic_name, slot_duration_minutes, concurrent_vets, default_max_per_slot
     FROM clinics WHERE clinic_id = ?`,
    [clinicId]
  );

  if (!clinic) {
    return NextResponse.json({ message: 'Clinic not found' }, { status: 404 });
  }

  const rawSchedules = await db.all<{
    schedule_id: number;
    clinic_id: number;
    day_of_week: (typeof DAYS_OF_WEEK)[number];
    is_open: number;
    open_time: string;
    close_time: string;
    max_slots_per_hour: number;
  }>(`SELECT * FROM clinic_schedules WHERE clinic_id = ?`, [clinicId]);

  const byDay = new Map(rawSchedules.map((s) => [s.day_of_week, s]));
  const orderedSchedules = DAYS_OF_WEEK.map((day, idx) => {
    const existing = byDay.get(day);
    return existing
      ? { ...existing, is_open: Boolean(existing.is_open) }
      : {
          schedule_id: -(idx + 1),
          clinic_id: clinicId,
          day_of_week: day,
          is_open: day !== 'Sunday',
          open_time: '08:30',
          close_time: '17:30',
          max_slots_per_hour: 3,
        };
  });

  return NextResponse.json({
    clinic,
    schedules: orderedSchedules,
  });
}

export async function PUT(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();

  if (!hasRole(user, ['vet', 'staff', 'admin'])) {
    return forbiddenResponse('Only clinic personnel can update schedule capacities');
  }

  try {
    const body = await request.json();
    const parsed = clinicConfigUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || 'Invalid schedule configuration' },
        { status: 400 }
      );
    }

    const clinicId = resolveClinicId(user.clinic_id, body.clinic_id ? String(body.clinic_id) : null);
    const db = await getDb();

    await db.transaction(async (tx) => {
      await tx.run(
        `UPDATE clinics
         SET slot_duration_minutes = ?, concurrent_vets = ?, default_max_per_slot = ?
         WHERE clinic_id = ?`,
        [
          parsed.data.slot_duration_minutes,
          parsed.data.concurrent_vets,
          parsed.data.default_max_per_slot,
          clinicId,
        ]
      );

      for (const s of parsed.data.schedules) {
        await tx.run(
          `INSERT INTO clinic_schedules (clinic_id, day_of_week, is_open, open_time, close_time, max_slots_per_hour)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(clinic_id, day_of_week) DO UPDATE SET
             is_open = excluded.is_open,
             open_time = excluded.open_time,
             close_time = excluded.close_time,
             max_slots_per_hour = excluded.max_slots_per_hour`,
          [clinicId, s.day_of_week, s.is_open ? 1 : 0, s.open_time, s.close_time, s.max_slots_per_hour]
        );
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Schedule update error:', error);
    return NextResponse.json({ message: 'Failed to save clinic schedule' }, { status: 500 });
  }
}

export const POST = PUT;
