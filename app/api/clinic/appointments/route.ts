import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { forbiddenResponse, getSessionUser, hasRole, unauthorizedResponse } from '@/lib/auth';
import { formatLocalDate, getDayOfWeekFromDate } from '@/lib/slots';

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();

  if (!hasRole(user, ['vet', 'staff', 'admin'])) {
    return forbiddenResponse('Clinic queue is accessible only to clinic staff or veterinarians');
  }

  const { searchParams } = new URL(request.url);
  const dateFilter = searchParams.get('date');
  const statusFilter = searchParams.get('status') || 'all';
  const query = (searchParams.get('q') || '').trim().toLowerCase();

  const clinicId = user.clinic_id || 1;
  const today = formatLocalDate(new Date());
  const targetDate = dateFilter && dateFilter !== 'all' ? dateFilter : today;
  const db = await getDb();

  let appointments = await db.all<Record<string, unknown>>(
    `SELECT
       a.*, p.name as pet_name, p.species as pet_species, p.breed as pet_breed,
       p.microchip_id, p.allergies,
       o.full_name as owner_name, o.phone_number as owner_phone,
       c.clinic_name, c.location as clinic_location,
       v.full_name as vet_name
     FROM appointments a
     JOIN pets p ON p.pet_id = a.pet_id
     JOIN users o ON o.user_id = a.owner_id
     JOIN clinics c ON c.clinic_id = a.clinic_id
     LEFT JOIN users v ON v.user_id = a.attending_vet_id
     WHERE (? = 'admin' OR a.clinic_id = ?)
       AND (? = 'all' OR a.schedule_date = ?)
     ORDER BY a.schedule_date ASC, a.time_slot ASC`,
    [user.role, clinicId, dateFilter === 'all' ? 'all' : 'exact', targetDate]
  );

  if (statusFilter !== 'all') {
    appointments = appointments.filter((a) => a.status === statusFilter);
  }

  if (query) {
    appointments = appointments.filter(
      (a) =>
        String(a.pet_name || '').toLowerCase().includes(query) ||
        String(a.owner_name || '').toLowerCase().includes(query) ||
        String(a.service_type || '').toLowerCase().includes(query) ||
        String(a.appt_id).includes(query)
    );
  }

  const todayRows = await db.all<{ status: string; cnt: number | string }>(
    `SELECT status, COUNT(*) as cnt
     FROM appointments
     WHERE (? = 'admin' OR clinic_id = ?) AND schedule_date = ?
     GROUP BY status`,
    [user.role, clinicId, today]
  );

  const statusMap = new Map(todayRows.map((r) => [r.status, Number(r.cnt)]));
  const completedToday = statusMap.get('Completed') ?? 0;
  const cancelledToday = statusMap.get('Cancelled') ?? 0;

  const pendingRow = await db.get<{ cnt: number | string }>(
    `SELECT COUNT(*) as cnt FROM appointments
     WHERE (? = 'admin' OR clinic_id = ?) AND status = 'Pending'`,
    [user.role, clinicId]
  );
  const pendingTriage = Number(pendingRow?.cnt ?? 0);

  const activeToday = todayRows.reduce(
    (acc, r) => (r.status === 'Cancelled' ? acc : acc + Number(r.cnt)),
    0
  );

  const dayOfWeek = getDayOfWeekFromDate(today);
  const clinicSched = await db.get<{
    default_max_per_slot: number;
    max_slots_per_hour: number | null;
    is_open: number | null;
  }>(
    `SELECT c.default_max_per_slot, cs.max_slots_per_hour, cs.is_open
     FROM clinics c
     LEFT JOIN clinic_schedules cs ON cs.clinic_id = c.clinic_id AND cs.day_of_week = ?
     WHERE c.clinic_id = ?`,
    [dayOfWeek, clinicId]
  );

  const maxPerSlot = clinicSched?.max_slots_per_hour || clinicSched?.default_max_per_slot || 3;
  const dailyCapacity = clinicSched?.is_open === 0 ? 0 : maxPerSlot * 8;
  const capacityPct =
    dailyCapacity > 0 ? Math.min(100, Math.round((activeToday / dailyCapacity) * 100)) : 0;

  return NextResponse.json({
    appointments,
    metrics: {
      today,
      total_today: activeToday,
      completed_today: completedToday,
      scheduled_today: Math.max(0, activeToday - completedToday),
      cancelled_today: cancelledToday,
      pending_triage: pendingTriage,
      capacity_pct: capacityPct,
      max_per_slot: maxPerSlot,
    },
  });
}
