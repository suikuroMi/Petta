import { NextResponse } from 'next/server';
import { getSessionUser, unauthorizedResponse } from '@/lib/auth';
import { appointmentRescheduleSchema } from '@/lib/validations';
import {
  AppointmentConflictError,
  rescheduleTransactionalAppointment,
} from '@/lib/services/appointments';

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
    const parsed = appointmentRescheduleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || 'Invalid schedule details' },
        { status: 400 }
      );
    }

    const updated = await rescheduleTransactionalAppointment(apptId, parsed.data, user);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof AppointmentConflictError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    console.error('Reschedule error:', error);
    return NextResponse.json({ message: 'Failed to reschedule appointment' }, { status: 500 });
  }
}
