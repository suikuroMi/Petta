export type UserRole = 'owner' | 'vet' | 'staff' | 'admin';

export type AppointmentStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Checked-In'
  | 'In-Consultation'
  | 'Completed'
  | 'Cancelled';

export type RecordType = 'vaccine' | 'deworming' | 'note';

export interface User {
  user_id: number;
  full_name: string;
  email: string;
  phone_number?: string | null;
  role: UserRole;
  clinic_id?: number | null;
  clinic_name?: string | null;
  license_number?: string | null;
  specialization?: string | null;
  created_at: string;
}

export interface Pet {
  pet_id: number;
  owner_id: number;
  owner_name?: string;
  owner_phone?: string | null;
  name: string;
  species: string;
  breed: string;
  sex: 'Male' | 'Female' | 'Unknown';
  date_of_birth: string;
  current_weight_kg?: number | null;
  allergies?: string | null;
  microchip_id?: string | null;
  status: string;
  created_at?: string;
}

export interface HealthRecord {
  record_id: number;
  appt_id?: number | null;
  pet_id: number;
  clinic_id: number;
  clinic_name?: string;
  vet_id: number;
  vet_name?: string;
  vet_license?: string | null;
  record_type: RecordType;
  date_administered: string;
  weight_kg?: number | null;
  temperature_c?: number | null;
  clinical_findings?: string | null;
  diagnosis?: string | null;
  treatment_plan?: string | null;
  notes?: string | null;
  // Joined from vaccination_ledger when vaccine/deworming
  vaccination_id?: number | null;
  vaccine_name?: string | null;
  manufacturer?: string | null;
  batch_lot_number?: string | null;
  dosage_info?: string | null;
  next_due_date?: string | null;
  created_at?: string;
}

export interface Clinic {
  clinic_id: number;
  clinic_name: string;
  location: string;
  address_detail?: string | null;
  contact_info: string;
  services_offered: string;
  slot_duration_minutes: number;
  concurrent_vets: number;
  default_max_per_slot: number;
  verified: boolean;
  created_at?: string;
}

export interface Schedule {
  schedule_id: number;
  clinic_id: number;
  day_of_week:
    | 'Monday'
    | 'Tuesday'
    | 'Wednesday'
    | 'Thursday'
    | 'Friday'
    | 'Saturday'
    | 'Sunday';
  is_open: boolean;
  open_time: string;
  close_time: string;
  max_slots_per_hour: number;
}

export interface ClinicSlotAvailability {
  time_slot: string;
  label: string;
  period: 'morning' | 'afternoon';
  max_capacity: number;
  booked_count: number;
  remaining: number;
  available: boolean;
}

export interface Appointment {
  appt_id: number;
  pet_id: number;
  pet_name?: string;
  pet_species?: string;
  pet_breed?: string;
  owner_id: number;
  owner_name?: string;
  owner_phone?: string | null;
  clinic_id: number;
  clinic_name?: string;
  clinic_location?: string;
  attending_vet_id?: number | null;
  vet_name?: string | null;
  service_type: string;
  schedule_date: string;
  time_slot: string;
  date_time: string;
  chief_complaint?: string | null;
  status: AppointmentStatus;
  created_at?: string;
  updated_at?: string;
}

export interface ReminderNotification {
  notification_id: number;
  user_id: number;
  pet_id?: number | null;
  pet_name?: string | null;
  appt_id?: number | null;
  type: 'appointment' | 'booster' | 'deworming' | 'system';
  title: string;
  message: string;
  due_date?: string | null;
  is_read: boolean;
  created_at: string;
}
