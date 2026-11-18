import { getDb } from '@/lib/db';
import {
  formatTime12h,
  generateTimeSlots,
  getDayOfWeekFromDate,
  toMinutes,
} from '@/lib/slots';
import type { Appointment, ClinicSlotAvailability, User } from '@/types';

export async function getClinicSlotsForDate(
  clinicId: number,
  scheduleDate: string
): Promise<{
  clinic_id: number;
  date: string;
  day_of_week: string;
  is_open: boolean;
  slot_duration_minutes: number;
  slots: ClinicSlotAvailability[];
} | null> {
  const db = await getDb();

  const clinic = await db.get<{
    clinic_id: number;
    slot_duration_minutes: number;
    default_max_per_slot: number;
    verified: number;
  }>(
    `SELECT clinic_id, slot_duration_minutes, default_max_per_slot, verified
     FROM clinics WHERE clinic_id = ?`,
    [clinicId]
  );

  if (!clinic) return null;

  const dayOfWeek = getDayOfWeekFromDate(scheduleDate);
  const schedule = await db.get<{
    is_open: number;
    open_time: string;
    close_time: string;
    max_slots_per_hour: number;
  }>(
    `SELECT is_open, open_time, close_time, max_slots_per_hour
     FROM clinic_schedules
     WHERE clinic_id = ? AND day_of_week = ?`,
    [clinicId, dayOfWeek]
  );

  if (!schedule || !schedule.is_open) {
    return {
      clinic_id: clinicId,
      date: scheduleDate,
      day_of_week: dayOfWeek,
      is_open: false,
      slot_duration_minutes: clinic.slot_duration_minutes,
      slots: [],
    };
  }

  const slotStrings = generateTimeSlots(
    schedule.open_time,
    schedule.close_time,
    clinic.slot_duration_minutes
  );

  const countRows = await db.all<{ time_slot: string; booked_count: number | string }>(
    `SELECT time_slot, COUNT(*) as booked_count
     FROM appointments
     WHERE clinic_id = ? AND schedule_date = ? AND status != 'Cancelled'
     GROUP BY time_slot`,
    [clinicId, scheduleDate]
  );

  const countMap = new Map(countRows.map((r) => [r.time_slot, Number(r.booked_count)]));
  const maxCapacity = schedule.max_slots_per_hour || clinic.default_max_per_slot || 3;

  const slots: ClinicSlotAvailability[] = slotStrings.map((timeSlot) => {
    const booked = countMap.get(timeSlot) ?? 0;
    const remaining = Math.max(0, maxCapacity - booked);
    return {
      time_slot: timeSlot,
      label: formatTime12h(timeSlot),
      period: toMinutes(timeSlot) < 12 * 60 ? 'morning' : 'afternoon',
      max_capacity: maxCapacity,
      booked_count: booked,
      remaining,
      available: remaining > 0,
    };
  });

  return {
    clinic_id: clinicId,
    date: scheduleDate,
    day_of_week: dayOfWeek,
    is_open: true,
    slot_duration_minutes: clinic.slot_duration_minutes,
    slots,
  };
}

export class AppointmentConflictError extends Error {
  status: number;
  constructor(message: string, status = 409) {
    super(message);
    this.status = status;
  }
}

export async function createTransactionalAppointment(
  input: {
    pet_id: number;
    clinic_id: number;
    service_type: string;
    schedule_date: string;
    time_slot: string;
    chief_complaint?: string;
  },
  actor: User
): Promise<Appointment> {
  const db = await getDb();

  return db.transaction(async (tx) => {
    const pet = await tx.get<{ pet_id: number; owner_id: number; name: string }>(
      'SELECT pet_id, owner_id, name FROM pets WHERE pet_id = ?',
      [input.pet_id]
    );

    if (!pet) {
      throw new AppointmentConflictError('Selected pet was not found', 404);
    }

    if (actor.role === 'owner' && pet.owner_id !== actor.user_id) {
      throw new AppointmentConflictError('You can only book appointments for your own pets', 403);
    }

    const clinic = await tx.get<{
      clinic_id: number;
      clinic_name: string;
      verified: number;
      slot_duration_minutes: number;
      default_max_per_slot: number;
    }>(
      `SELECT clinic_id, clinic_name, verified, slot_duration_minutes, default_max_per_slot
       FROM clinics WHERE clinic_id = ?`,
      [input.clinic_id]
    );

    if (!clinic) {
      throw new AppointmentConflictError('Selected clinic was not found', 404);
    }

    if (!clinic.verified) {
      throw new AppointmentConflictError('Selected clinic is pending verification', 400);
    }

    const dayOfWeek = getDayOfWeekFromDate(input.schedule_date);
    const schedule = await tx.get<{
      is_open: number;
      open_time: string;
      close_time: string;
      max_slots_per_hour: number;
    }>(
      `SELECT is_open, open_time, close_time, max_slots_per_hour
       FROM clinic_schedules
       WHERE clinic_id = ? AND day_of_week = ?`,
      [input.clinic_id, dayOfWeek]
    );

    if (!schedule || !schedule.is_open) {
      throw new AppointmentConflictError(`${clinic.clinic_name} is closed on ${dayOfWeek}`, 409);
    }

    const validSlots = generateTimeSlots(
      schedule.open_time,
      schedule.close_time,
      clinic.slot_duration_minutes
    );
    if (!validSlots.includes(input.time_slot)) {
      throw new AppointmentConflictError(
        `Time slot ${formatTime12h(input.time_slot)} is outside clinic operating windows`,
        400
      );
    }

    const dupRow = await tx.get<{ appt_id: number }>(
      `SELECT appt_id FROM appointments
       WHERE pet_id = ? AND schedule_date = ? AND time_slot = ? AND status != 'Cancelled'`,
      [input.pet_id, input.schedule_date, input.time_slot]
    );

    if (dupRow) {
      throw new AppointmentConflictError(
        `${pet.name} already has an active appointment at this date and time`,
        409
      );
    }

    const countRow = await tx.get<{ booked_count: number | string }>(
      `SELECT COUNT(*) as booked_count FROM appointments
       WHERE clinic_id = ? AND schedule_date = ? AND time_slot = ? AND status != 'Cancelled'`,
      [input.clinic_id, input.schedule_date, input.time_slot]
    );

    const maxCapacity = schedule.max_slots_per_hour || clinic.default_max_per_slot || 3;
    if (Number(countRow?.booked_count ?? 0) >= maxCapacity) {
      throw new AppointmentConflictError(
        `Selected slot (${formatTime12h(input.time_slot)}) is at full capacity (${maxCapacity}/${maxCapacity}). Please choose another time slot.`,
        409
      );
    }

    const initialStatus = actor.role === 'staff' || actor.role === 'vet' ? 'Confirmed' : 'Pending';
    const attendingVetId = actor.role === 'vet' ? actor.user_id : null;
    const dateTime = `${input.schedule_date}T${input.time_slot}:00`;

    const res = await tx.run(
      `INSERT INTO appointments (
        pet_id, owner_id, clinic_id, attending_vet_id, service_type,
        schedule_date, time_slot, date_time, chief_complaint, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.pet_id,
        pet.owner_id,
        input.clinic_id,
        attendingVetId,
        input.service_type,
        input.schedule_date,
        input.time_slot,
        dateTime,
        input.chief_complaint || null,
        initialStatus,
      ]
    );

    const apptId = res.lastInsertRowid;

    await tx.run(
      `INSERT INTO notifications (user_id, pet_id, appt_id, type, title, message, due_date)
       VALUES (?, ?, ?, 'appointment', ?, ?, ?)`,
      [
        pet.owner_id,
        pet.pet_id,
        apptId,
        initialStatus === 'Confirmed'
          ? `Appointment Confirmed — ${pet.name}`
          : `Appointment Request Submitted — ${pet.name}`,
        `${input.service_type} at ${clinic.clinic_name} on ${input.schedule_date} at ${formatTime12h(input.time_slot)}.`,
        input.schedule_date,
      ]
    );

    const created = await tx.get<Appointment>(
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
       WHERE a.appt_id = ?`,
      [apptId]
    );

    if (!created) {
      throw new Error('Failed to load created appointment');
    }
    return created;
  });
}

export async function rescheduleTransactionalAppointment(
  apptId: number,
  input: { schedule_date: string; time_slot: string },
  actor: User
): Promise<Appointment> {
  const db = await getDb();

  return db.transaction(async (tx) => {
    const existing = await tx.get<
      Appointment & {
        pet_name: string;
        clinic_name: string;
        slot_duration_minutes: number;
        default_max_per_slot: number;
      }
    >(
      `SELECT a.*, p.name as pet_name, c.clinic_name, c.slot_duration_minutes, c.default_max_per_slot
       FROM appointments a
       JOIN pets p ON p.pet_id = a.pet_id
       JOIN clinics c ON c.clinic_id = a.clinic_id
       WHERE a.appt_id = ?`,
      [apptId]
    );

    if (!existing) {
      throw new AppointmentConflictError('Appointment not found', 404);
    }

    if (actor.role === 'owner' && existing.owner_id !== actor.user_id) {
      throw new AppointmentConflictError('You can only reschedule your own appointments', 403);
    }

    if (existing.status === 'Completed' || existing.status === 'Cancelled') {
      throw new AppointmentConflictError(
        `Cannot reschedule an appointment that is already ${existing.status}`,
        409
      );
    }

    const dayOfWeek = getDayOfWeekFromDate(input.schedule_date);
    const schedule = await tx.get<{
      is_open: number;
      open_time: string;
      close_time: string;
      max_slots_per_hour: number;
    }>(
      `SELECT is_open, open_time, close_time, max_slots_per_hour
       FROM clinic_schedules
       WHERE clinic_id = ? AND day_of_week = ?`,
      [existing.clinic_id, dayOfWeek]
    );

    if (!schedule || !schedule.is_open) {
      throw new AppointmentConflictError(`${existing.clinic_name} is closed on ${dayOfWeek}`, 409);
    }

    const validSlots = generateTimeSlots(
      schedule.open_time,
      schedule.close_time,
      existing.slot_duration_minutes
    );
    if (!validSlots.includes(input.time_slot)) {
      throw new AppointmentConflictError(
        `Time slot ${formatTime12h(input.time_slot)} is outside clinic operating windows`,
        400
      );
    }

    const countRow = await tx.get<{ booked_count: number | string }>(
      `SELECT COUNT(*) as booked_count FROM appointments
       WHERE clinic_id = ? AND schedule_date = ? AND time_slot = ?
         AND status != 'Cancelled' AND appt_id != ?`,
      [existing.clinic_id, input.schedule_date, input.time_slot, apptId]
    );

    const maxCapacity = schedule.max_slots_per_hour || existing.default_max_per_slot || 3;
    if (Number(countRow?.booked_count ?? 0) >= maxCapacity) {
      throw new AppointmentConflictError(
        `Target slot (${formatTime12h(input.time_slot)}) is at full capacity`,
        409
      );
    }

    const nextDateTime = `${input.schedule_date}T${input.time_slot}:00`;
    const nextStatus = actor.role === 'owner' ? 'Pending' : existing.status;

    await tx.run(
      `UPDATE appointments
       SET schedule_date = ?, time_slot = ?, date_time = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE appt_id = ?`,
      [input.schedule_date, input.time_slot, nextDateTime, nextStatus, apptId]
    );

    await tx.run(
      `INSERT INTO notifications (user_id, pet_id, appt_id, type, title, message, due_date)
       VALUES (?, ?, ?, 'appointment', ?, ?, ?)`,
      [
        existing.owner_id,
        existing.pet_id,
        apptId,
        `Appointment Rescheduled — ${existing.pet_name}`,
        `Visit moved to ${input.schedule_date} at ${formatTime12h(input.time_slot)} (${existing.clinic_name}).`,
        input.schedule_date,
      ]
    );

    const updated = await tx.get<Appointment>(
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
       WHERE a.appt_id = ?`,
      [apptId]
    );

    if (!updated) {
      throw new Error('Failed to load rescheduled appointment');
    }
    return updated;
  });
}
