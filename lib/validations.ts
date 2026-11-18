import { z } from 'zod';

export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export const registerSchema = z.object({
  full_name: z.string().trim().min(2, 'Full name is required'),
  email: z.string().trim().email('Valid email address is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone_number: z.string().trim().optional(),
  role: z.enum(['owner', 'vet', 'staff']).default('owner'),
  clinic_id: z.coerce.number().int().positive().optional().nullable(),
  license_number: z.string().trim().optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Valid email address is required'),
  password: z.string().min(1, 'Password is required'),
});

export const petSchema = z.object({
  name: z.string().trim().min(1, 'Pet name is required'),
  species: z.string().trim().min(1, 'Species is required'),
  breed: z.string().trim().min(1, 'Breed is required'),
  sex: z.enum(['Male', 'Female', 'Unknown']).default('Unknown'),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  current_weight_kg: z.union([z.coerce.number().positive(), z.literal(''), z.null(), z.undefined()])
    .transform((v) => (v === '' || v === null || v === undefined ? undefined : Number(v)))
    .optional(),
  allergies: z.string().trim().optional(),
  microchip_id: z.string().trim().optional(),
});

export const healthRecordSchema = z
  .object({
    pet_id: z.coerce.number().int().positive('Pet is required'),
    appt_id: z.coerce.number().int().positive().optional().nullable(),
    record_type: z.enum(['vaccine', 'deworming', 'note']),
    date_administered: z.string().min(1, 'Date administered is required'),
    weight_kg: z.union([z.coerce.number().positive(), z.literal(''), z.null(), z.undefined()])
      .transform((v) => (v === '' || v === null || v === undefined ? undefined : Number(v)))
      .optional(),
    temperature_c: z.union([z.coerce.number().min(30).max(45), z.literal(''), z.null(), z.undefined()])
      .transform((v) => (v === '' || v === null || v === undefined ? undefined : Number(v)))
      .optional(),
    clinical_findings: z.string().trim().optional(),
    diagnosis: z.string().trim().optional(),
    treatment_plan: z.string().trim().optional(),
    notes: z.string().trim().optional(),
    vaccine_name: z.string().trim().optional(),
    manufacturer: z.string().trim().optional(),
    batch_lot_number: z.string().trim().optional(),
    dosage_info: z.string().trim().optional(),
    next_due_date: z.string().trim().optional(),
    complete_appointment: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.record_type === 'vaccine') {
      if (!data.vaccine_name) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Vaccine name is required for vaccination records',
          path: ['vaccine_name'],
        });
      }
      if (!data.batch_lot_number) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Batch / Lot number is required for vaccine traceability',
          path: ['batch_lot_number'],
        });
      }
    }
    if (data.record_type === 'deworming' && !data.vaccine_name && !data.notes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Product name or treatment notes are required for deworming records',
        path: ['vaccine_name'],
      });
    }
  });

export const appointmentBookingSchema = z.object({
  pet_id: z.coerce.number().int().positive('Please select a pet'),
  clinic_id: z.coerce.number().int().positive('Please select a clinic'),
  service_type: z.string().trim().min(1, 'Please select a service'),
  schedule_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid date (YYYY-MM-DD) is required'),
  time_slot: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Valid time slot (HH:MM) is required'),
  chief_complaint: z.string().trim().optional(),
});

export const appointmentRescheduleSchema = z.object({
  schedule_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid date is required'),
  time_slot: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Valid time slot is required'),
});

export const appointmentStatusSchema = z.object({
  status: z.enum([
    'Pending',
    'Confirmed',
    'Checked-In',
    'In-Consultation',
    'Completed',
    'Cancelled',
  ]),
});

export const scheduleDaySchema = z.object({
  day_of_week: z.enum(DAYS_OF_WEEK),
  is_open: z.boolean(),
  open_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format must be HH:MM'),
  close_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format must be HH:MM'),
  max_slots_per_hour: z.coerce.number().int().min(1, 'At least 1 slot per hour').max(30),
});

export const clinicConfigUpdateSchema = z.object({
  slot_duration_minutes: z.coerce.number().int().refine((v) => [30, 45, 60].includes(v), {
    message: 'Slot duration must be 30, 45, or 60 minutes',
  }),
  concurrent_vets: z.coerce.number().int().min(1).max(20),
  default_max_per_slot: z.coerce.number().int().min(1).max(30),
  schedules: z.array(scheduleDaySchema).min(1),
});

export const clinicCreateSchema = z.object({
  clinic_name: z.string().trim().min(2, 'Clinic name is required'),
  location: z.string().trim().min(2, 'Location/city is required'),
  address_detail: z.string().trim().optional(),
  contact_info: z.string().trim().min(5, 'Contact number is required'),
  services_offered: z.string().trim().min(3, 'Services offered are required'),
  verified: z.boolean().optional(),
});

export type PetFormValues = z.input<typeof petSchema>;
export type HealthRecordFormValues = z.input<typeof healthRecordSchema>;
export type AppointmentBookingFormValues = z.input<typeof appointmentBookingSchema>;
export type ClinicConfigFormValues = z.input<typeof clinicConfigUpdateSchema>;
export type ClinicCreateFormValues = z.input<typeof clinicCreateSchema>;
