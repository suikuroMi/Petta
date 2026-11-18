import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser, unauthorizedResponse } from '@/lib/auth';
import { petSchema } from '@/lib/validations';
import type { Pet } from '@/types';

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim().toLowerCase();
  const db = await getDb();

  let rows: Pet[];

  if (user.role === 'owner') {
    rows = await db.all<Pet>(
      `SELECT p.*, u.full_name as owner_name, u.phone_number as owner_phone
       FROM pets p
       JOIN users u ON u.user_id = p.owner_id
       WHERE p.owner_id = ?
       ORDER BY p.pet_id DESC`,
      [user.user_id]
    );
  } else {
    rows = await db.all<Pet>(
      `SELECT p.*, u.full_name as owner_name, u.phone_number as owner_phone
       FROM pets p
       JOIN users u ON u.user_id = p.owner_id
       ORDER BY p.pet_id DESC`
    );
  }

  if (q) {
    rows = rows.filter(
      (p) =>
        String(p.pet_id).includes(q) ||
        String(p.name || '').toLowerCase().includes(q) ||
        String(p.breed || '').toLowerCase().includes(q) ||
        String(p.microchip_id || '').toLowerCase().includes(q) ||
        String(p.owner_name || '').toLowerCase().includes(q)
    );
  }

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const body = await request.json();
    const parsed = petSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || 'Invalid pet details' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const ownerId =
      user.role === 'owner'
        ? user.user_id
        : Number(body.owner_id) > 0
        ? Number(body.owner_id)
        : user.user_id;

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

    const res = await db.run(
      `INSERT INTO pets (
        owner_id, name, species, breed, sex, date_of_birth,
        current_weight_kg, allergies, microchip_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ownerId,
        name,
        species,
        breed,
        sex,
        date_of_birth,
        current_weight_kg ?? null,
        allergies || null,
        microchip_id || null,
      ]
    );

    const created = await db.get<Pet>(
      `SELECT p.*, u.full_name as owner_name, u.phone_number as owner_phone
       FROM pets p
       JOIN users u ON u.user_id = p.owner_id
       WHERE p.pet_id = ?`,
      [res.lastInsertRowid]
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Create pet error:', error);
    return NextResponse.json({ message: 'Failed to register pet' }, { status: 500 });
  }
}
