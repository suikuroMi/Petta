import { getDb } from '@/lib/db';
import type { HealthRecord, User } from '@/types';
import type { z } from 'zod';
import type { healthRecordSchema } from '@/lib/validations';

type ParsedHealthRecord = z.infer<typeof healthRecordSchema>;

export async function insertImmutableHealthRecord(
  data: ParsedHealthRecord,
  vet: User
): Promise<HealthRecord> {
  const db = await getDb();

  const pet = await db.get<{ pet_id: number; owner_id: number; name: string }>(
    'SELECT pet_id, owner_id, name FROM pets WHERE pet_id = ?',
    [data.pet_id]
  );

  if (!pet) {
    throw new Error('Pet not found');
  }

  let clinicId = vet.clinic_id ?? null;

  if (data.appt_id) {
    const appt = await db.get<{ appt_id: number; pet_id: number; clinic_id: number }>(
      'SELECT appt_id, pet_id, clinic_id FROM appointments WHERE appt_id = ?',
      [data.appt_id]
    );

    if (!appt || appt.pet_id !== data.pet_id) {
      throw new Error('Linked appointment not found for this patient');
    }
    clinicId = appt.clinic_id;
  }

  if (!clinicId) {
    const fallbackClinic = await db.get<{ clinic_id: number }>(
      'SELECT clinic_id FROM clinics WHERE verified = 1 ORDER BY clinic_id ASC LIMIT 1'
    );
    clinicId = fallbackClinic?.clinic_id ?? 1;
  }

  return db.transaction(async (tx) => {
    const recRes = await tx.run(
      `INSERT INTO medical_records (
        appt_id, pet_id, clinic_id, vet_id, record_type, date_administered,
        weight_kg, temperature_c, clinical_findings, diagnosis, treatment_plan, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.appt_id ?? null,
        data.pet_id,
        clinicId,
        vet.user_id,
        data.record_type,
        data.date_administered,
        data.weight_kg ?? null,
        data.temperature_c ?? null,
        data.clinical_findings || null,
        data.diagnosis || null,
        data.treatment_plan || null,
        data.notes || null,
      ]
    );

    const recordId = recRes.lastInsertRowid;

    if (data.record_type === 'vaccine' || data.record_type === 'deworming') {
      const productName =
        data.vaccine_name ||
        (data.record_type === 'deworming' ? 'Broad Spectrum Deworming' : 'Immunization');
      const lotNumber =
        data.batch_lot_number || `LOT-${data.date_administered.replace(/-/g, '')}`;

      await tx.run(
        `INSERT INTO vaccination_ledger (
          record_id, pet_id, vaccine_name, manufacturer, batch_lot_number,
          dosage_info, date_administered, next_due_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          recordId,
          data.pet_id,
          productName,
          data.manufacturer || null,
          lotNumber,
          data.dosage_info || null,
          data.date_administered,
          data.next_due_date || null,
        ]
      );

      if (data.next_due_date) {
        const isDeworming = data.record_type === 'deworming';
        await tx.run(
          `INSERT INTO notifications (user_id, pet_id, appt_id, type, title, message, due_date)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            pet.owner_id,
            pet.pet_id,
            data.appt_id ?? null,
            isDeworming ? 'deworming' : 'booster',
            `${isDeworming ? 'Next Deworming Due' : 'Next Booster Due'} — ${pet.name}`,
            `${productName} follow-up for ${pet.name} is scheduled for ${data.next_due_date}.`,
            data.next_due_date,
          ]
        );
      }
    }

    if (typeof data.weight_kg === 'number' && data.weight_kg > 0) {
      await tx.run(`UPDATE pets SET current_weight_kg = ? WHERE pet_id = ?`, [
        data.weight_kg,
        data.pet_id,
      ]);
    }

    if (data.appt_id && data.complete_appointment) {
      await tx.run(
        `UPDATE appointments
         SET status = 'Completed', attending_vet_id = ?, updated_at = CURRENT_TIMESTAMP
         WHERE appt_id = ?`,
        [vet.user_id, data.appt_id]
      );
    }

    const created = await tx.get<HealthRecord>(
      `SELECT
         m.*, c.clinic_name, u.full_name as vet_name, u.license_number as vet_license,
         v.vaccination_id, v.vaccine_name, v.manufacturer, v.batch_lot_number,
         v.dosage_info, v.next_due_date
       FROM medical_records m
       JOIN clinics c ON c.clinic_id = m.clinic_id
       JOIN users u ON u.user_id = m.vet_id
       LEFT JOIN vaccination_ledger v ON v.record_id = m.record_id
       WHERE m.record_id = ?`,
      [recordId]
    );

    if (!created) {
      throw new Error('Failed to retrieve committed health record');
    }
    return created;
  });
}
