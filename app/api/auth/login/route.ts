import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyPassword } from '@/lib/password';
import { attachSessionCookie, createSession } from '@/lib/auth';
import { loginSchema } from '@/lib/validations';
import type { User } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || 'Email and password are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = parsed.data.email.toLowerCase();
    const db = await getDb();

    const row = await db.get<User & { password_hash: string }>(
      `SELECT u.user_id, u.full_name, u.email, u.password_hash, u.phone_number, u.role,
              u.clinic_id, c.clinic_name, u.license_number, u.specialization, u.created_at
       FROM users u
       LEFT JOIN clinics c ON c.clinic_id = u.clinic_id
       WHERE u.email = ?`,
      [normalizedEmail]
    );

    if (!row || !verifyPassword(parsed.data.password, row.password_hash)) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
    }

    const user: User = {
      user_id: row.user_id,
      full_name: row.full_name,
      email: row.email,
      phone_number: row.phone_number,
      role: row.role,
      clinic_id: row.clinic_id,
      clinic_name: row.clinic_name,
      license_number: row.license_number,
      specialization: row.specialization,
      created_at: row.created_at,
    };
    const sessionId = await createSession(user.user_id);
    const response = NextResponse.json({ user, token: sessionId });
    attachSessionCookie(response, sessionId);
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'Login failed' }, { status: 500 });
  }
}
