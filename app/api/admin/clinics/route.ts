import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { forbiddenResponse, getSessionUser, unauthorizedResponse } from '@/lib/auth';
import { clinicCreateSchema, DAYS_OF_WEEK } from '@/lib/validations';

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();
  if (user.role !== 'admin') {
    return forbiddenResponse('Only system administrators can access clinic governance');
  }

  const db = await getDb();
  const rows = await db.all<Record<string, unknown>>(
    `SELECT c.*,
       (SELECT COUNT(*) FROM appointments a WHERE a.clinic_id = c.clinic_id) as total_appointments
     FROM clinics c
     ORDER BY c.verified ASC, c.clinic_id ASC`
  );

  return NextResponse.json(
    rows.map((c) => ({
      ...c,
      verified: Boolean(c.verified),
    }))
  );
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();
  if (user.role !== 'admin') {
    return forbiddenResponse('Only system administrators can register clinics');
  }

  try {
    const body = await request.json();
    const parsed = clinicCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || 'Invalid clinic data' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const created = await db.transaction(async (tx) => {
      const res = await tx.run(
        `INSERT INTO clinics (clinic_name, location, address_detail, contact_info, services_offered, verified)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          parsed.data.clinic_name,
          parsed.data.location,
          parsed.data.address_detail || null,
          parsed.data.contact_info,
          parsed.data.services_offered,
          parsed.data.verified ? 1 : 0,
        ]
      );

      const clinicId = res.lastInsertRowid;
      for (const day of DAYS_OF_WEEK) {
        await tx.run(
          `INSERT INTO clinic_schedules (clinic_id, day_of_week, is_open, open_time, close_time, max_slots_per_hour)
           VALUES (?, ?, ?, '08:30', '17:30', 3)`,
          [clinicId, day, day === 'Sunday' ? 0 : 1]
        );
      }

      return tx.get<Record<string, unknown>>(
        'SELECT * FROM clinics WHERE clinic_id = ?',
        [clinicId]
      );
    });

    return NextResponse.json({ ...created, verified: Boolean(created?.verified) }, { status: 201 });
  } catch (error) {
    console.error('Create clinic error:', error);
    return NextResponse.json({ message: 'Failed to create clinic' }, { status: 500 });
  }
}
