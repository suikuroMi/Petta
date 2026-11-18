import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { forbiddenResponse, getSessionUser, unauthorizedResponse } from '@/lib/auth';
import { petSchema } from '@/lib/validations';
import type { Pet } from '@/types';

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
  const pet = await db.get<Pet>(
    `SELECT p.*, u.full_name as owner_name, u.phone_number as owner_phone
     FROM pets p
     JOIN users u ON u.user_id = p.owner_id
     WHERE p.pet_id = ?`,
    [petId]
  );

  if (!pet) {
    return NextResponse.json({ message: 'Pet not found' }, { status: 404 });
  }

  if (user.role === 'owner' && pet.owner_id !== user.user_id) {
    return forbiddenResponse('You can only access your own pet profiles');
  }

  return NextResponse.json(pet);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();

  const { id } = await context.params;
  const petId = Number(id);
  const db = await getDb();

  const existing = await db.get<{ owner_id: number }>(
    'SELECT owner_id FROM pets WHERE pet_id = ?',
    [petId]
  );

  if (!existing) {
    return NextResponse.json({ message: 'Pet not found' }, { status: 404 });
  }

  if (user.role === 'owner' && existing.owner_id !== user.user_id) {
    return forbiddenResponse('You can only edit your own pet profiles');
  }

  try {
    const body = await request.json();
    const parsed = petSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || 'Invalid pet data' },
        { status: 400 }
      );
    }

    const {
      name,
      species,
      breed,
      sex,
      date_of_birth,
      current_weight_kg,
      allergies,
      microchip_id,
    } = parsed.data;

    await db.run(
      `UPDATE pets
       SET name = ?, species = ?, breed = ?, sex = ?, date_of_birth = ?,
           current_weight_kg = ?, allergies = ?, microchip_id = ?
       WHERE pet_id = ?`,
      [
        name,
        species,
        breed,
        sex,
        date_of_birth,
        current_weight_kg ?? null,
        allergies || null,
        microchip_id || null,
        petId,
      ]
    );

    const updated = await db.get<Pet>(
      `SELECT p.*, u.full_name as owner_name, u.phone_number as owner_phone
       FROM pets p
       JOIN users u ON u.user_id = p.owner_id
       WHERE p.pet_id = ?`,
      [petId]
    );

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update pet error:', error);
    return NextResponse.json({ message: 'Failed to update pet profile' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();

  const { id } = await context.params;
  const petId = Number(id);
  const db = await getDb();

  const existing = await db.get<{ owner_id: number }>(
    'SELECT owner_id FROM pets WHERE pet_id = ?',
    [petId]
  );

  if (!existing) {
    return NextResponse.json({ message: 'Pet not found' }, { status: 404 });
  }

  if (user.role === 'owner' && existing.owner_id !== user.user_id) {
    return forbiddenResponse('You can only delete your own pet profiles');
  }

  const recordCount = await db.get<{ c: number | string }>(
    'SELECT COUNT(*) as c FROM medical_records WHERE pet_id = ?',
    [petId]
  );

  if (Number(recordCount?.c ?? 0) > 0) {
    return NextResponse.json(
      {
        message:
          'Cannot delete a pet with verified medical or vaccination records. Clinical ledgers are retained for audit integrity.',
      },
      { status: 409 }
    );
  }

  await db.run('DELETE FROM pets WHERE pet_id = ?', [petId]);
  return NextResponse.json({ success: true });
}
