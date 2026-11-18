import { NextResponse } from 'next/server';
import { getDb, type SqlParam } from '@/lib/db';
import { forbiddenResponse, getSessionUser, unauthorizedResponse } from '@/lib/auth';
import { healthRecordSchema } from '@/lib/validations';
import { insertImmutableHealthRecord } from '@/lib/services/records';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();

  const { id } = await context.params;
  const petId = Number(id);
  if (!Number.isInteger(petId) || petId <= 0) {
    return NextResponse.json({ message: 'Invalid pet ID' }, { status: 400 });
  }

  const db = await getDb();
  const pet = await db.get<{ pet_id: number; owner_id: number }>(
    'SELECT pet_id, owner_id FROM pets WHERE pet_id = ?',
    [petId]
  );

  if (!pet) {
    return NextResponse.json({ message: 'Pet not found' }, { status: 404 });
  }

  if (user.role === 'owner' && pet.owner_id !== user.user_id) {
    return forbiddenResponse('You can only view health ledgers for your own pets');
  }

  const { searchParams } = new URL(request.url);
  const filterType = searchParams.get('type');

  let sql = `
    SELECT
      m.*,
      c.clinic_name,
      u.full_name as vet_name,
      u.license_number as vet_license,
      v.vaccination_id,
      v.vaccine_name,
      v.manufacturer,
      v.batch_lot_number,
      v.dosage_info,
      v.next_due_date
    FROM medical_records m
    JOIN clinics c ON c.clinic_id = m.clinic_id
    JOIN users u ON u.user_id = m.vet_id
    LEFT JOIN vaccination_ledger v ON v.record_id = m.record_id
    WHERE m.pet_id = ?
  `;
  const params: SqlParam[] = [petId];

  if (filterType && ['vaccine', 'deworming', 'note'].includes(filterType)) {
    sql += ` AND m.record_type = ?`;
    params.push(filterType);
  }

  sql += ` ORDER BY m.date_administered DESC, m.record_id DESC`;

  const rows = await db.all(sql, params);
  return NextResponse.json(rows);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();

  if (user.role !== 'vet') {
    return forbiddenResponse(
      'Only licensed Attending Veterinarians can insert official clinical or vaccination records'
    );
  }

  const { id } = await context.params;
  const petId = Number(id);

  try {
    const body = await request.json();
    const parsed = healthRecordSchema.safeParse({ ...body, pet_id: petId });

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || 'Invalid clinical record payload' },
        { status: 400 }
      );
    }

    const result = await insertImmutableHealthRecord(parsed.data, user);
    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to commit health record';
    const status = msg.includes('not found') ? 404 : 400;
    return NextResponse.json({ message: msg }, { status });
  }
}
