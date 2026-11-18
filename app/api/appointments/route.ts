import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser, unauthorizedResponse } from '@/lib/auth';
import { appointmentBookingSchema } from '@/lib/validations';
import {
  AppointmentConflictError,
  createTransactionalAppointment,
} from '@/lib/services/appointments';

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();

  const db = await getDb();

  if (user.role === 'owner') {
    const rows = await db.all(
      `SELECT
         a.*, p.name as pet_name, p.species as pet_species, p.breed as pet_breed,
         o.full_name as owner_name, o.phone_number as owner_phone,
         c.clinic_name, c.location as clinic_location,
         v.full_name as vet_name
       FROM appointments a
       JOIN pets p ON p.pet_id = a.pet_id
       JOIN users o ON o.user_id = a.owner_id
       JOIN clinics c ON c.clinic_id = a.clinic_id
       LEFT JOIN users v ON v.user_id = a.attending_vet_id
       WHERE a.owner_id = ?
       ORDER BY a.schedule_date DESC, a.time_slot DESC`,
      [user.user_id]
    );

    return NextResponse.json(rows);
  }

  const clinicId = user.clinic_id || 1;
  const rows = await db.all(
    `SELECT
       a.*, p.name as pet_name, p.species as pet_species, p.breed as pet_breed,
       o.full_name as owner_name, o.phone_number as owner_phone,
       c.clinic_name, c.location as clinic_location,
       v.full_name as vet_name
     FROM appointments a
     JOIN pets p ON p.pet_id = a.pet_id
     JOIN users o ON o.user_id = a.owner_id
     JOIN clinics c ON c.clinic_id = a.clinic_id
     LEFT JOIN users v ON v.user_id = a.attending_vet_id
     WHERE (? = 'admin' OR a.clinic_id = ?)
     ORDER BY a.schedule_date ASC, a.time_slot ASC`,
    [user.role, clinicId]
  );

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const body = await request.json();
    const parsed = appointmentBookingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || 'Invalid appointment details' },
        { status: 400 }
      );
    }

    const created = await createTransactionalAppointment(parsed.data, user);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof AppointmentConflictError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    console.error('Create appointment error:', error);
    return NextResponse.json({ message: 'Failed to create appointment' }, { status: 500 });
  }
}
