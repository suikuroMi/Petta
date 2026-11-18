import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { attachSessionCookie, createSession } from '@/lib/auth';
import { registerSchema } from '@/lib/validations';
import type { User } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || 'Invalid registration data' },
        { status: 400 }
      );
    }

    const { full_name, email, password, phone_number, role, clinic_id, license_number } = parsed.data;
    const normalizedEmail = email.toLowerCase();
    const db = await getDb();

    const existing = await db.get<{ user_id: number }>(
      'SELECT user_id FROM users WHERE email = ?',
      [normalizedEmail]
    );

    if (existing) {
      return NextResponse.json(
        { message: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    let resolvedClinicId: number | null = null;
    if (role === 'vet' || role === 'staff') {
      if (clinic_id) {
        const clinic = await db.get<{ clinic_id: number }>(
          'SELECT clinic_id FROM clinics WHERE clinic_id = ?',
          [clinic_id]
        );
        if (!clinic) {
          return NextResponse.json({ message: 'Selected clinic was not found' }, { status: 400 });
        }
        resolvedClinicId = clinic.clinic_id;
      } else {
        const defaultClinic = await db.get<{ clinic_id: number }>(
          'SELECT clinic_id FROM clinics WHERE verified = 1 ORDER BY clinic_id ASC LIMIT 1'
        );
        resolvedClinicId = defaultClinic?.clinic_id ?? null;
      }
    }

    const passwordHash = hashPassword(password);
    const result = await db.run(
      `INSERT INTO users (full_name, email, password_hash, phone_number, role, clinic_id, license_number)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        full_name,
        normalizedEmail,
        passwordHash,
        phone_number || null,
        role,
        resolvedClinicId,
        role === 'vet' ? license_number || 'PRC-DVM-PENDING' : null,
      ]
    );

    const userId = result.lastInsertRowid;
    const user = await db.get<User>(
      `SELECT u.user_id, u.full_name, u.email, u.phone_number, u.role,
              u.clinic_id, c.clinic_name, u.license_number, u.specialization, u.created_at
       FROM users u
       LEFT JOIN clinics c ON c.clinic_id = u.clinic_id
       WHERE u.user_id = ?`,
      [userId]
    );

    const sessionId = await createSession(userId);
    const response = NextResponse.json({ user, token: sessionId }, { status: 201 });
    attachSessionCookie(response, sessionId);
    return response;
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ message: 'Failed to register account' }, { status: 500 });
  }
}
