import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is required.');
  console.error('Example: $env:DATABASE_URL="postgresql://user:pass@host/db"; npm run db:init');
  process.exit(1);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function formatLocalDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDaysFormatted(base, days) {
  const copy = new Date(base);
  copy.setDate(copy.getDate() + days);
  return formatLocalDate(copy);
}

async function main() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
      ? false
      : { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  try {
    console.log('Applying PostgreSQL schema from db/schema.postgres.sql...');
    const schemaPath = path.join(process.cwd(), 'db', 'schema.postgres.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await client.query(schemaSql);
    console.log('✓ Schema created / verified');

    const { rows: userCountRows } = await client.query('SELECT COUNT(*)::int AS count FROM users');
    if (userCountRows[0].count > 0) {
      console.log(`Database already has ${userCountRows[0].count} users; skipping seed.`);
      return;
    }

    console.log('Seeding initial Petta data into PostgreSQL...');
    const now = new Date();
    const today = formatLocalDate(now);
    const tomorrow = addDaysFormatted(now, 1);
    const tomorrowUtcDay = new Date(`${tomorrow}T12:00:00Z`).getUTCDay();
    const openFutureDay = tomorrowUtcDay === 0 ? addDaysFormatted(now, 2) : tomorrow;
    const pastDate1 = addDaysFormatted(now, -37);
    const pastDate2 = addDaysFormatted(now, -106);
    const pastDate3 = addDaysFormatted(now, -165);
    const dueSoon = addDaysFormatted(now, 5);
    const nextYear = addDaysFormatted(now, 328);
    const demoPass = hashPassword('password123');

    await client.query('BEGIN');

    const c1 = (
      await client.query(
        `INSERT INTO clinics (
          clinic_name, location, address_detail, contact_info, services_offered,
          slot_duration_minutes, concurrent_vets, default_max_per_slot, verified
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING clinic_id`,
        [
          'Healthy Paws Vet Hospital',
          'Naga City',
          '142 Magsaysay Ave, Naga City',
          '+63 917 555 0142',
          'Routine Vaccination Booster, Deworming Treatment, General Clinical Checkup, Minor Surgical Consultation',
          45,
          2,
          3,
          1,
        ]
      )
    ).rows[0].clinic_id;

    const c2 = (
      await client.query(
        `INSERT INTO clinics (
          clinic_name, location, address_detail, contact_info, services_offered,
          slot_duration_minutes, concurrent_vets, default_max_per_slot, verified
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING clinic_id`,
        [
          'Metro Vet Care Center',
          'Naga City',
          '88 Peñafrancia Ave, North District, Naga City',
          '+63 918 220 9910',
          'Routine Vaccination Booster, Deworming Treatment, General Clinical Checkup, Dental Prophylaxis',
          60,
          2,
          4,
          1,
        ]
      )
    ).rows[0].clinic_id;

    const c3 = (
      await client.query(
        `INSERT INTO clinics (
          clinic_name, location, address_detail, contact_info, services_offered,
          slot_duration_minutes, concurrent_vets, default_max_per_slot, verified
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING clinic_id`,
        [
          'Animal Wellness Haven',
          'Canaman',
          '15 Rizal St., Downtown Canaman',
          '+63 920 987 6543',
          'Routine Vaccination Booster, Deworming Treatment, Grooming & Wellness',
          60,
          1,
          2,
          0,
        ]
      )
    ).rows[0].clinic_id;

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    for (const day of days) {
      await client.query(
        `INSERT INTO clinic_schedules (clinic_id, day_of_week, is_open, open_time, close_time, max_slots_per_hour)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [c1, day, day === 'Sunday' ? 0 : 1, '08:30', '17:30', 3]
      );
      await client.query(
        `INSERT INTO clinic_schedules (clinic_id, day_of_week, is_open, open_time, close_time, max_slots_per_hour)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [c2, day, day === 'Sunday' ? 0 : 1, '09:00', '17:00', 4]
      );
      await client.query(
        `INSERT INTO clinic_schedules (clinic_id, day_of_week, is_open, open_time, close_time, max_slots_per_hour)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [c3, day, day === 'Sunday' ? 0 : 1, '09:00', '16:00', 2]
      );
    }

    const mariaId = (
      await client.query(
        `INSERT INTO users (full_name, email, password_hash, phone_number, role)
         VALUES ($1,$2,$3,$4,$5) RETURNING user_id`,
        ['Maria Santos', 'maria.santos@petta.local', demoPass, '+63 917 801 2345', 'owner']
      )
    ).rows[0].user_id;

    const carlosId = (
      await client.query(
        `INSERT INTO users (full_name, email, password_hash, phone_number, role)
         VALUES ($1,$2,$3,$4,$5) RETURNING user_id`,
        ['Carlos Cruz', 'carlos.cruz@petta.local', demoPass, '+63 919 334 7890', 'owner']
      )
    ).rows[0].user_id;

    const drRenzId = (
      await client.query(
        `INSERT INTO users (full_name, email, password_hash, phone_number, role, clinic_id, license_number, specialization)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING user_id`,
        [
          'Dr. Renz Cruz, DVM',
          'dr.renz@healthypaws.vet',
          demoPass,
          '+63 917 555 0101',
          'vet',
          c1,
          'PRC-DVM-004192',
          'Companion Animal Medicine & Preventive Care',
        ]
      )
    ).rows[0].user_id;

    await client.query(
      `INSERT INTO users (full_name, email, password_hash, phone_number, role, clinic_id, specialization)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        'Marco Villanueva',
        'marco.staff@healthypaws.vet',
        demoPass,
        '+63 917 555 0102',
        'staff',
        c1,
        'Front-Desk Operations',
      ]
    );

    await client.query(
      `INSERT INTO users (full_name, email, password_hash, phone_number, role)
       VALUES ($1,$2,$3,$4,$5)`,
      ['Petta System Admin', 'admin@petta.local', demoPass, '+63 917 000 0001', 'admin']
    );

    const miloId = (
      await client.query(
        `INSERT INTO pets (owner_id, name, species, breed, sex, date_of_birth, current_weight_kg, allergies, microchip_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING pet_id`,
        [
          mariaId,
          'Milo',
          'Canine',
          'Golden Retriever',
          'Male',
          '2024-06-14',
          28.5,
          'None known',
          '9851-4100-2934-812',
        ]
      )
    ).rows[0].pet_id;

    const lunaId = (
      await client.query(
        `INSERT INTO pets (owner_id, name, species, breed, sex, date_of_birth, current_weight_kg, allergies, microchip_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING pet_id`,
        [
          mariaId,
          'Luna',
          'Feline',
          'Siamese',
          'Female',
          '2024-01-20',
          4.1,
          'Chicken protein sensitivity',
          '9851-4100-8812-304',
        ]
      )
    ).rows[0].pet_id;

    const bantayId = (
      await client.query(
        `INSERT INTO pets (owner_id, name, species, breed, sex, date_of_birth, current_weight_kg, allergies)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING pet_id`,
        [carlosId, 'Bantay', 'Canine', 'Aspin', 'Male', '2022-11-02', 16.8, 'Sulfonamide antibiotics']
      )
    ).rows[0].pet_id;

    const pastAppt1 = (
      await client.query(
        `INSERT INTO appointments (pet_id, owner_id, clinic_id, attending_vet_id, service_type, schedule_date, time_slot, date_time, chief_complaint, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING appt_id`,
        [
          miloId,
          mariaId,
          c1,
          drRenzId,
          'Routine Vaccination Booster',
          pastDate1,
          '09:15',
          `${pastDate1}T09:15:00`,
          'Annual DHPPi + Leptospirosis booster',
          'Completed',
        ]
      )
    ).rows[0].appt_id;

    const pastAppt2 = (
      await client.query(
        `INSERT INTO appointments (pet_id, owner_id, clinic_id, attending_vet_id, service_type, schedule_date, time_slot, date_time, chief_complaint, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING appt_id`,
        [
          miloId,
          mariaId,
          c2,
          drRenzId,
          'Deworming Treatment',
          pastDate2,
          '10:00',
          `${pastDate2}T10:00:00`,
          'Quarterly broad-spectrum deworming',
          'Completed',
        ]
      )
    ).rows[0].appt_id;

    const todayAppts = [
      [miloId, mariaId, c1, drRenzId, 'General Clinical Checkup', today, '09:15', `${today}T09:15:00`, 'Mild ear scratching over the last 2 days; routine wellness follow-up.', 'Checked-In'],
      [lunaId, mariaId, c1, null, 'Deworming Treatment', today, '10:00', `${today}T10:00:00`, 'Scheduled deworming cycle + weight check.', 'Pending'],
      [bantayId, carlosId, c1, drRenzId, 'Routine Vaccination Booster', today, '10:45', `${today}T10:45:00`, 'Annual Anti-Rabies renewal', 'Confirmed'],
      [bantayId, carlosId, c1, drRenzId, 'General Clinical Checkup', openFutureDay, '10:00', `${openFutureDay}T10:00:00`, 'Post-vaccine observation follow-up', 'Confirmed'],
      [bantayId, carlosId, c1, drRenzId, 'Deworming Treatment', openFutureDay, '10:00', `${openFutureDay}T10:00:00`, 'Follow-up stool check', 'Confirmed'],
      [lunaId, mariaId, c1, null, 'Routine Vaccination Booster', openFutureDay, '10:00', `${openFutureDay}T10:00:00`, 'FVRCP booster appointment', 'Pending'],
    ];

    for (const row of todayAppts) {
      await client.query(
        `INSERT INTO appointments (pet_id, owner_id, clinic_id, attending_vet_id, service_type, schedule_date, time_slot, date_time, chief_complaint, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        row
      );
    }

    const rec1 = (
      await client.query(
        `INSERT INTO medical_records (appt_id, pet_id, clinic_id, vet_id, record_type, date_administered, weight_kg, temperature_c, clinical_findings, diagnosis, treatment_plan, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING record_id`,
        [
          pastAppt1,
          miloId,
          c1,
          drRenzId,
          'vaccine',
          pastDate1,
          28.5,
          38.4,
          'Bright, alert, responsive. Mucous membranes pink, CRT < 2s.',
          'Healthy canine — cleared for annual core vaccination',
          'Subcutaneous injection in right hind limb; 15-min post-vax monitoring uneventful.',
          'Weight: 28.5 kg. Normal temperature. Subcutaneous injection in right hind limb.',
        ]
      )
    ).rows[0].record_id;

    await client.query(
      `INSERT INTO vaccination_ledger (record_id, pet_id, vaccine_name, manufacturer, batch_lot_number, dosage_info, date_administered, next_due_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [rec1, miloId, 'DHPPi + Leptospirosis Booster', 'Zoetis Vanguard Plus 5/L', 'VAC-2026-9981B', '1.0 mL SC', pastDate1, nextYear]
    );

    const rec2 = (
      await client.query(
        `INSERT INTO medical_records (appt_id, pet_id, clinic_id, vet_id, record_type, date_administered, weight_kg, temperature_c, clinical_findings, diagnosis, treatment_plan, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING record_id`,
        [
          null,
          miloId,
          c1,
          drRenzId,
          'vaccine',
          pastDate3,
          27.8,
          38.5,
          'Pre-vaccination physical exam normal.',
          'Cleared for anti-rabies immunization',
          'Administered 1.0 mL IM/SC; issued official tag.',
          'Routine 1-year anti-rabies immunization.',
        ]
      )
    ).rows[0].record_id;

    await client.query(
      `INSERT INTO vaccination_ledger (record_id, pet_id, vaccine_name, manufacturer, batch_lot_number, dosage_info, date_administered, next_due_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [rec2, miloId, 'Anti-Rabies (Rabisin)', 'Boehringer Ingelheim', 'LOT-99824X', '1.0 mL SC', pastDate3, addDaysFormatted(now, 200)]
    );

    const rec3 = (
      await client.query(
        `INSERT INTO medical_records (appt_id, pet_id, clinic_id, vet_id, record_type, date_administered, weight_kg, temperature_c, clinical_findings, diagnosis, treatment_plan, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING record_id`,
        [
          pastAppt2,
          miloId,
          c2,
          drRenzId,
          'deworming',
          pastDate2,
          28.2,
          38.3,
          'Normal hydration and abdominal palpation.',
          'Preventive endoparasite prophylaxis',
          '1 Chewable Tab Endogard 30kg orally with food.',
          '1 Chewable Tab (28.2 kg recorded). Broad spectrum deworming administered.',
        ]
      )
    ).rows[0].record_id;

    await client.query(
      `INSERT INTO vaccination_ledger (record_id, pet_id, vaccine_name, manufacturer, batch_lot_number, dosage_info, date_administered, next_due_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [rec3, miloId, 'Endogard Broad Spectrum Chewable', 'Virbac', 'DWM-2026-A', '1 Tab (up to 30 kg)', pastDate2, dueSoon]
    );

    await client.query(
      `INSERT INTO medical_records (appt_id, pet_id, clinic_id, vet_id, record_type, date_administered, weight_kg, temperature_c, clinical_findings, diagnosis, treatment_plan, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        null,
        miloId,
        c1,
        drRenzId,
        'note',
        addDaysFormatted(now, -14),
        28.5,
        38.6,
        'Mild erythema on left pinna; no discharge or head tilt.',
        'Mild seasonal allergic otitis externa',
        'Ear cleanser twice weekly for 2 weeks; avoid damp ears after bathing.',
        'Follow-up recommended if scratching persists.',
      ]
    );

    const rec5 = (
      await client.query(
        `INSERT INTO medical_records (appt_id, pet_id, clinic_id, vet_id, record_type, date_administered, weight_kg, temperature_c, clinical_findings, diagnosis, treatment_plan, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING record_id`,
        [
          null,
          lunaId,
          c1,
          drRenzId,
          'vaccine',
          addDaysFormatted(now, -60),
          4.1,
          38.5,
          'Heart & lungs auscultate normal. Noted chicken protein dietary sensitivity.',
          'Healthy feline — core FVRCP booster',
          '1.0 mL SC interscapular; hypoallergenic diet advised.',
          'Feline core vaccine booster.',
        ]
      )
    ).rows[0].record_id;

    await client.query(
      `INSERT INTO vaccination_ledger (record_id, pet_id, vaccine_name, manufacturer, batch_lot_number, dosage_info, date_administered, next_due_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [rec5, lunaId, 'FVRCP Core Feline Vaccine', 'Zoetis Felocell 3', 'FEL-2026-4410C', '1.0 mL SC', addDaysFormatted(now, -60), addDaysFormatted(now, 305)]
    );

    await client.query(
      `INSERT INTO notifications (user_id, pet_id, type, title, message, due_date, is_read)
       VALUES ($1,$2,$3,$4,$5,$6,0), ($7,$8,$9,$10,$11,$12,0)`,
      [
        mariaId,
        miloId,
        'deworming',
        'Deworming Cycle Due Soon — Milo',
        `Milo's next broad-spectrum deworming (Endogard) is due on ${dueSoon}. Book a quick clinic visit to keep coverage current.`,
        dueSoon,
        mariaId,
        miloId,
        'appointment',
        'Today at 09:15 AM — Milo Checked-In',
        'Milo is checked in at Healthy Paws Vet Hospital for General Clinical Checkup.',
        today,
      ]
    );

    await client.query('COMMIT');
    console.log('✓ PostgreSQL seeded successfully with demo accounts and sample data.');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});
