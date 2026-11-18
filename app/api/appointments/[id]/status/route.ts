import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { forbiddenResponse, getSessionUser, unauthorizedResponse } from '@/lib/auth';
import { appointmentStatusSchema } from '@/lib/validations';
import { formatTime12h } from '@/lib/slots';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();

  const { id } = await context.params;
  const apptId = Number(id);
  if (!Number.isInteger(apptId) || apptId <= 0) {
    return NextResponse.json({ message: 'Invalid appointment ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const parsed = appointmentStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || 'Invalid appointment status' },
        { status: 400 }
      );
    }

    const nextStatus = parsed.data.status;
    const db = await getDb();

    const appt = await db.get<{
      appt_id: number;
      pet_id: number;
      owner_id: number;
      clinic_id: number;
      attending_vet_id: number | null;
      schedule_date: string;
      time_slot: string;
      service_type: string;
      status: string;
      pet_name: string;
      clinic_name: string;
    }>(
      `SELECT a.*, p.name as pet_name, c.clinic_name
       FROM appointments a
       JOIN pets p ON p.pet_id = a.pet_id
       JOIN clinics c ON c.clinic_id = a.clinic_id
       WHERE a.appt_id = ?`,
      [apptId]
    );

    if (!appt) {
      return NextResponse.json({ message: 'Appointment not found' }, { status: 404 });
    }

    if (user.role === 'owner') {
      if (appt.owner_id !== user.user_id) {
        return forbiddenResponse('You can only cancel your own appointments');
      }
      if (nextStatus !== 'Cancelled') {
        return forbiddenResponse('Pet owners can only cancel appointments');
      }
      if (appt.status === 'Completed' || appt.status === 'In-Consultation') {
        return NextResponse.json(
          { message: `Cannot cancel an appointment that is ${appt.status}` },
          { status: 409 }
        );
      }
    } else if (user.role !== 'vet' && user.role !== 'staff' && user.role !== 'admin') {
      return forbiddenResponse();
    }

    const nextVetId =
      user.role === 'vet' && (nextStatus === 'In-Consultation' || nextStatus === 'Completed')
        ? user.user_id
        : appt.attending_vet_id;

    await db.run(
      `UPDATE appointments
       SET status = ?, attending_vet_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE appt_id = ?`,
      [nextStatus, nextVetId, apptId]
    );

    if (nextStatus === 'Confirmed' || nextStatus === 'Cancelled') {
      await db.run(
        `INSERT INTO notifications (user_id, pet_id, appt_id, type, title, message, due_date)
         VALUES (?, ?, ?, 'appointment', ?, ?, ?)`,
        [
          appt.owner_id,
          appt.pet_id,
          apptId,
          `Appointment ${nextStatus} — ${appt.pet_name}`,
          `${appt.service_type} at ${appt.clinic_name} (${appt.schedule_date} at ${formatTime12h(appt.time_slot)}) is now ${nextStatus}.`,
          appt.schedule_date,
        ]
      );
    }

    return NextResponse.json({ success: true, status: nextStatus });
  } catch (error) {
    console.error('Update appointment status error:', error);
    return NextResponse.json({ message: 'Failed to update appointment status' }, { status: 500 });
  }
}
