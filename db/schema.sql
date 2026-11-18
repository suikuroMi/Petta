-- Petta Centralized Pet Health Record & Clinic Appointment Management Schema
-- Matches CS318 Level 2 ERD (SQLite / portable to PostgreSQL/MySQL)

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS clinics (
  clinic_id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_name TEXT NOT NULL,
  location TEXT NOT NULL,
  address_detail TEXT,
  contact_info TEXT NOT NULL,
  services_offered TEXT NOT NULL,
  slot_duration_minutes INTEGER NOT NULL DEFAULT 45,
  concurrent_vets INTEGER NOT NULL DEFAULT 2,
  default_max_per_slot INTEGER NOT NULL DEFAULT 3,
  verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  phone_number TEXT,
  role TEXT NOT NULL CHECK (role IN ('owner', 'vet', 'staff', 'admin')),
  clinic_id INTEGER REFERENCES clinics(clinic_id) ON DELETE SET NULL,
  license_number TEXT,
  specialization TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clinic_schedules (
  schedule_id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL REFERENCES clinics(clinic_id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL CHECK (
    day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
  ),
  is_open INTEGER NOT NULL DEFAULT 1,
  open_time TEXT NOT NULL,
  close_time TEXT NOT NULL,
  max_slots_per_hour INTEGER NOT NULL DEFAULT 3,
  UNIQUE (clinic_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS pets (
  pet_id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  species TEXT NOT NULL,
  breed TEXT NOT NULL,
  sex TEXT NOT NULL DEFAULT 'Unknown' CHECK (sex IN ('Male', 'Female', 'Unknown')),
  date_of_birth TEXT NOT NULL,
  current_weight_kg REAL,
  allergies TEXT,
  microchip_id TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS appointments (
  appt_id INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_id INTEGER NOT NULL REFERENCES pets(pet_id) ON DELETE CASCADE,
  owner_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  clinic_id INTEGER NOT NULL REFERENCES clinics(clinic_id) ON DELETE RESTRICT,
  attending_vet_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  service_type TEXT NOT NULL,
  schedule_date TEXT NOT NULL,
  time_slot TEXT NOT NULL,
  date_time TEXT NOT NULL,
  chief_complaint TEXT,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (
    status IN ('Pending', 'Confirmed', 'Checked-In', 'In-Consultation', 'Completed', 'Cancelled')
  ),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date
  ON appointments (clinic_id, schedule_date, time_slot, status);

CREATE TABLE IF NOT EXISTS medical_records (
  record_id INTEGER PRIMARY KEY AUTOINCREMENT,
  appt_id INTEGER REFERENCES appointments(appt_id) ON DELETE RESTRICT,
  pet_id INTEGER NOT NULL REFERENCES pets(pet_id) ON DELETE RESTRICT,
  clinic_id INTEGER NOT NULL REFERENCES clinics(clinic_id) ON DELETE RESTRICT,
  vet_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  record_type TEXT NOT NULL CHECK (record_type IN ('vaccine', 'deworming', 'note')),
  date_administered TEXT NOT NULL,
  weight_kg REAL,
  temperature_c REAL,
  clinical_findings TEXT,
  diagnosis TEXT,
  treatment_plan TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_medical_records_pet
  ON medical_records (pet_id, date_administered DESC);

CREATE TABLE IF NOT EXISTS vaccination_ledger (
  vaccination_id INTEGER PRIMARY KEY AUTOINCREMENT,
  record_id INTEGER NOT NULL REFERENCES medical_records(record_id) ON DELETE RESTRICT,
  pet_id INTEGER NOT NULL REFERENCES pets(pet_id) ON DELETE RESTRICT,
  vaccine_name TEXT NOT NULL,
  manufacturer TEXT,
  batch_lot_number TEXT NOT NULL,
  dosage_info TEXT,
  date_administered TEXT NOT NULL,
  next_due_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_vaccination_ledger_batch
  ON vaccination_ledger (batch_lot_number);

CREATE TABLE IF NOT EXISTS notifications (
  notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  pet_id INTEGER REFERENCES pets(pet_id) ON DELETE CASCADE,
  appt_id INTEGER REFERENCES appointments(appt_id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('appointment', 'booster', 'deworming', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  due_date TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
