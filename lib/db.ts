import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Pool } from 'pg';
import { hashPassword } from '@/lib/password';
import { addDaysFormatted, formatLocalDate, getDayOfWeekFromDate } from '@/lib/slots';

export type SqlParam = string | number | bigint | Uint8Array | null;

export interface RunResult {
  lastInsertRowid: number;
  changes: number;
}

export interface DbExecutor {
  get<T = Record<string, unknown>>(sql: string, params?: SqlParam[]): Promise<T | undefined>;
  all<T = Record<string, unknown>>(sql: string, params?: SqlParam[]): Promise<T[]>;
  run(sql: string, params?: SqlParam[]): Promise<RunResult>;
}

export interface DbClient extends DbExecutor {
  transaction<T>(fn: (tx: DbExecutor) => Promise<T>): Promise<T>;
}

const globalForDb = globalThis as unknown as {
  __pettaSqlite?: DatabaseSync;
  __pettaPgPool?: Pool;
  __pettaInitPromise?: Promise<void>;
};

function convertPlaceholders(sql: string): string {
  let idx = 0;
  return sql.replace(/\?/g, () => `$${++idx}`);
}

function appendReturningIfInsert(sql: string): string {
  const trimmed = sql.trim();
  if (/^insert\s+/i.test(trimmed) && !/\breturning\b/i.test(trimmed)) {
    return `${trimmed} RETURNING *`;
  }
  return trimmed;
}

function extractInsertId(row: Record<string, unknown> | undefined): number {
  if (!row) return 0;
  const idKeys = [
    'clinic_id',
    'user_id',
    'schedule_id',
    'pet_id',
    'appt_id',
    'record_id',
    'vaccination_id',
    'notification_id',
  ];
  for (const k of idKeys) {
    if (row[k] !== undefined && row[k] !== null) {
      return Number(row[k]);
    }
  }
  return 0;
}

async function seedIfEmpty(db: DbExecutor) {
  const countRow = await db.get<{ count: number | string }>(
    'SELECT COUNT(*) AS count FROM users'
  );
  if (Number(countRow?.count ?? 0) > 0) return;

  const now = new Date();
  const today = formatLocalDate(now);
  const tomorrow = addDaysFormatted(now, 1);
  const tomorrowDay = getDayOfWeekFromDate(tomorrow);
  const openFutureDay = tomorrowDay === 'Sunday' ? addDaysFormatted(now, 2) : tomorrow;
  const pastDate1 = addDaysFormatted(now, -37);
  const pastDate2 = addDaysFormatted(now, -106);
  const pastDate3 = addDaysFormatted(now, -165);
  const dueSoon = addDaysFormatted(now, 5);
  const nextYear = addDaysFormatted(now, 328);

  const demoPass = hashPassword('password123');

  const c1 = (
    await db.run(
      `INSERT INTO clinics (
        clinic_name, location, address_detail, contact_info, services_offered,
        slot_duration_minutes, concurrent_vets, default_max_per_slot, verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
  ).lastInsertRowid;

  const c2 = (
    await db.run(
      `INSERT INTO clinics (
        clinic_name, location, address_detail, contact_info, services_offered,
        slot_duration_minutes, concurrent_vets, default_max_per_slot, verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
  ).lastInsertRowid;

  const c3 = (
    await db.run(
      `INSERT INTO clinics (
        clinic_name, location, address_detail, contact_info, services_offered,
        slot_duration_minutes, concurrent_vets, default_max_per_slot, verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
  ).lastInsertRowid;

  const days = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ] as const;

  for (const day of days) {
    await db.run(
      `INSERT INTO clinic_schedules (clinic_id, day_of_week, is_open, open_time, close_time, max_slots_per_hour)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [c1, day, day === 'Sunday' ? 0 : 1, '08:30', '17:30', 3]
    );
    await db.run(
      `INSERT INTO clinic_schedules (clinic_id, day_of_week, is_open, open_time, close_time, max_slots_per_hour)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [c2, day, day === 'Sunday' ? 0 : 1, '09:00', '17:00', 4]
    );
    await db.run(
      `INSERT INTO clinic_schedules (clinic_id, day_of_week, is_open, open_time, close_time, max_slots_per_hour)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [c3, day, day === 'Sunday' ? 0 : 1, '09:00', '16:00', 2]
    );
  }

  const mariaId = (
    await db.run(
      `INSERT INTO users (full_name, email, password_hash, phone_number, role, clinic_id, license_number, specialization)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['Maria Santos', 'maria.santos@petta.local', demoPass, '+63 917 801 2345', 'owner', null, null, null]
    )
  ).lastInsertRowid;

  const carlosId = (
    await db.run(
      `INSERT INTO users (full_name, email, password_hash, phone_number, role, clinic_id, license_number, specialization)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['Carlos Cruz', 'carlos.cruz@petta.local', demoPass, '+63 919 334 7890', 'owner', null, null, null]
    )
  ).lastInsertRowid;

  const drRenzId = (
    await db.run(
      `INSERT INTO users (full_name, email, password_hash, phone_number, role, clinic_id, license_number, specialization)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
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
  ).lastInsertRowid;

  await db.run(
    `INSERT INTO users (full_name, email, password_hash, phone_number, role, clinic_id, license_number, specialization)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'Marco Villanueva',
      'marco.staff@healthypaws.vet',
      demoPass,
      '+63 917 555 0102',
      'staff',
      c1,
      null,
      'Front-Desk Operations',
    ]
  );

  await db.run(
    `INSERT INTO users (full_name, email, password_hash, phone_number, role, clinic_id, license_number, specialization)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['Petta System Admin', 'admin@petta.local', demoPass, '+63 917 000 0001', 'admin', null, null, null]
  );

  const miloId = (
    await db.run(
      `INSERT INTO pets (owner_id, name, species, breed, sex, date_of_birth, current_weight_kg, allergies, microchip_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
  ).lastInsertRowid;

  const lunaId = (
    await db.run(
      `INSERT INTO pets (owner_id, name, species, breed, sex, date_of_birth, current_weight_kg, allergies, microchip_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
  ).lastInsertRowid;

  const bantayId = (
    await db.run(
      `INSERT INTO pets (owner_id, name, species, breed, sex, date_of_birth, current_weight_kg, allergies, microchip_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [carlosId, 'Bantay', 'Canine', 'Aspin', 'Male', '2022-11-02', 16.8, 'Sulfonamide antibiotics', null]
    )
  ).lastInsertRowid;

  const pastAppt1 = (
    await db.run(
      `INSERT INTO appointments (
        pet_id, owner_id, clinic_id, attending_vet_id, service_type,
        schedule_date, time_slot, date_time, chief_complaint, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
  ).lastInsertRowid;

  const pastAppt2 = (
    await db.run(
      `INSERT INTO appointments (
        pet_id, owner_id, clinic_id, attending_vet_id, service_type,
        schedule_date, time_slot, date_time, chief_complaint, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
  ).lastInsertRowid;

  const queueSeeds: SqlParam[][] = [
    [miloId, mariaId, c1, drRenzId, 'General Clinical Checkup', today, '09:15', `${today}T09:15:00`, 'Mild ear scratching over the last 2 days; routine wellness follow-up.', 'Checked-In'],
    [lunaId, mariaId, c1, null, 'Deworming Treatment', today, '10:00', `${today}T10:00:00`, 'Scheduled deworming cycle + weight check.', 'Pending'],
    [bantayId, carlosId, c1, drRenzId, 'Routine Vaccination Booster', today, '10:45', `${today}T10:45:00`, 'Annual Anti-Rabies renewal', 'Confirmed'],
    [bantayId, carlosId, c1, drRenzId, 'General Clinical Checkup', openFutureDay, '10:00', `${openFutureDay}T10:00:00`, 'Post-vaccine observation follow-up', 'Confirmed'],
    [bantayId, carlosId, c1, drRenzId, 'Deworming Treatment', openFutureDay, '10:00', `${openFutureDay}T10:00:00`, 'Follow-up stool check', 'Confirmed'],
    [lunaId, mariaId, c1, null, 'Routine Vaccination Booster', openFutureDay, '10:00', `${openFutureDay}T10:00:00`, 'FVRCP booster appointment', 'Pending'],
  ];

  for (const params of queueSeeds) {
    await db.run(
      `INSERT INTO appointments (
        pet_id, owner_id, clinic_id, attending_vet_id, service_type,
        schedule_date, time_slot, date_time, chief_complaint, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params
    );
  }

  const rec1 = (
    await db.run(
      `INSERT INTO medical_records (
        appt_id, pet_id, clinic_id, vet_id, record_type, date_administered,
        weight_kg, temperature_c, clinical_findings, diagnosis, treatment_plan, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
  ).lastInsertRowid;

  await db.run(
    `INSERT INTO vaccination_ledger (
      record_id, pet_id, vaccine_name, manufacturer, batch_lot_number,
      dosage_info, date_administered, next_due_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [rec1, miloId, 'DHPPi + Leptospirosis Booster', 'Zoetis Vanguard Plus 5/L', 'VAC-2026-9981B', '1.0 mL SC', pastDate1, nextYear]
  );

  const rec2 = (
    await db.run(
      `INSERT INTO medical_records (
        appt_id, pet_id, clinic_id, vet_id, record_type, date_administered,
        weight_kg, temperature_c, clinical_findings, diagnosis, treatment_plan, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
  ).lastInsertRowid;

  await db.run(
    `INSERT INTO vaccination_ledger (
      record_id, pet_id, vaccine_name, manufacturer, batch_lot_number,
      dosage_info, date_administered, next_due_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [rec2, miloId, 'Anti-Rabies (Rabisin)', 'Boehringer Ingelheim', 'LOT-99824X', '1.0 mL SC', pastDate3, addDaysFormatted(now, 200)]
  );

  const rec3 = (
    await db.run(
      `INSERT INTO medical_records (
        appt_id, pet_id, clinic_id, vet_id, record_type, date_administered,
        weight_kg, temperature_c, clinical_findings, diagnosis, treatment_plan, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
  ).lastInsertRowid;

  await db.run(
    `INSERT INTO vaccination_ledger (
      record_id, pet_id, vaccine_name, manufacturer, batch_lot_number,
      dosage_info, date_administered, next_due_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [rec3, miloId, 'Endogard Broad Spectrum Chewable', 'Virbac', 'DWM-2026-A', '1 Tab (up to 30 kg)', pastDate2, dueSoon]
  );

  await db.run(
    `INSERT INTO medical_records (
      appt_id, pet_id, clinic_id, vet_id, record_type, date_administered,
      weight_kg, temperature_c, clinical_findings, diagnosis, treatment_plan, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    await db.run(
      `INSERT INTO medical_records (
        appt_id, pet_id, clinic_id, vet_id, record_type, date_administered,
        weight_kg, temperature_c, clinical_findings, diagnosis, treatment_plan, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
  ).lastInsertRowid;

  await db.run(
    `INSERT INTO vaccination_ledger (
      record_id, pet_id, vaccine_name, manufacturer, batch_lot_number,
      dosage_info, date_administered, next_due_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [rec5, lunaId, 'FVRCP Core Feline Vaccine', 'Zoetis Felocell 3', 'FEL-2026-4410C', '1.0 mL SC', addDaysFormatted(now, -60), addDaysFormatted(now, 305)]
  );

  await db.run(
    `INSERT INTO notifications (user_id, pet_id, type, title, message, due_date, is_read)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [
      mariaId,
      miloId,
      'deworming',
      'Deworming Cycle Due Soon — Milo',
      `Milo's next broad-spectrum deworming (Endogard) is due on ${dueSoon}. Book a quick clinic visit to keep coverage current.`,
      dueSoon,
    ]
  );

  await db.run(
    `INSERT INTO notifications (user_id, pet_id, type, title, message, due_date, is_read)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [
      mariaId,
      miloId,
      'appointment',
      'Today at 09:15 AM — Milo Checked-In',
      'Milo is checked in at Healthy Paws Vet Hospital for General Clinical Checkup.',
      today,
    ]
  );
}

function getSqliteClient(): DbClient {
  if (!globalForDb.__pettaSqlite) {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const sqlite = new DatabaseSync(path.join(dataDir, 'petta.db'));
    sqlite.exec(fs.readFileSync(path.join(process.cwd(), 'db', 'schema.sql'), 'utf8'));
    globalForDb.__pettaSqlite = sqlite;
  }

  const sqlite = globalForDb.__pettaSqlite;
  const executor: DbExecutor = {
    async get<T>(sql: string, params: SqlParam[] = []) {
      return sqlite.prepare(sql).get(...params) as T | undefined;
    },
    async all<T>(sql: string, params: SqlParam[] = []) {
      return sqlite.prepare(sql).all(...params) as T[];
    },
    async run(sql: string, params: SqlParam[] = []) {
      const res = sqlite.prepare(sql).run(...params);
      return {
        lastInsertRowid: Number(res.lastInsertRowid ?? 0),
        changes: Number(res.changes ?? 0),
      };
    },
  };

  return {
    ...executor,
    async transaction<T>(fn: (tx: DbExecutor) => Promise<T>): Promise<T> {
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        const result = await fn(executor);
        sqlite.exec('COMMIT');
        return result;
      } catch (err) {
        sqlite.exec('ROLLBACK');
        throw err;
      }
    },
  };
}

function getPgClient(): DbClient {
  if (!globalForDb.__pettaPgPool) {
    const url = process.env.DATABASE_URL!;
    const useSsl =
      process.env.DATABASE_SSL === 'false'
        ? false
        : url.includes('localhost') || url.includes('127.0.0.1')
        ? false
        : { rejectUnauthorized: false };

    globalForDb.__pettaPgPool = new Pool({
      connectionString: url,
      ssl: useSsl,
    });
  }

  const pool = globalForDb.__pettaPgPool;

  const makeExecutor = (queryable: Pick<Pool, 'query'>): DbExecutor => ({
    async get<T>(sql: string, params: SqlParam[] = []) {
      const res = await queryable.query(convertPlaceholders(sql), params);
      return res.rows[0] as T | undefined;
    },
    async all<T>(sql: string, params: SqlParam[] = []) {
      const res = await queryable.query(convertPlaceholders(sql), params);
      return res.rows as T[];
    },
    async run(sql: string, params: SqlParam[] = []) {
      const pgSql = convertPlaceholders(appendReturningIfInsert(sql));
      const res = await queryable.query(pgSql, params);
      return {
        lastInsertRowid: extractInsertId(res.rows[0] as Record<string, unknown> | undefined),
        changes: res.rowCount ?? 0,
      };
    },
  });

  const rootExecutor = makeExecutor(pool);

  return {
    ...rootExecutor,
    async transaction<T>(fn: (tx: DbExecutor) => Promise<T>): Promise<T> {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn(makeExecutor(client));
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },
  };
}

export async function getDb(): Promise<DbClient> {
  const isPostgres = Boolean(process.env.DATABASE_URL);
  const client = isPostgres ? getPgClient() : getSqliteClient();

  if (!globalForDb.__pettaInitPromise) {
    globalForDb.__pettaInitPromise = (async () => {
      if (isPostgres) {
        const schemaSql = fs.readFileSync(
          path.join(process.cwd(), 'db', 'schema.postgres.sql'),
          'utf8'
        );
        await globalForDb.__pettaPgPool!.query(schemaSql);
      }
      await client.transaction(async (tx) => {
        await seedIfEmpty(tx);
      });
    })();
  }

  await globalForDb.__pettaInitPromise;
  return client;
}
