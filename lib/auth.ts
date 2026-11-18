import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { User, UserRole } from '@/types';
import { getDb } from '@/lib/db';

export const SESSION_COOKIE_NAME = 'petta_session';

export async function createSession(userId: number): Promise<string> {
  const db = await getDb();
  const sessionId = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await db.run(
    `INSERT INTO sessions (session_id, user_id, expires_at) VALUES (?, ?, ?)`,
    [sessionId, userId, expiresAt]
  );

  return sessionId;
}

export async function deleteSession(sessionId: string): Promise<void> {
  const db = await getDb();
  await db.run(`DELETE FROM sessions WHERE session_id = ?`, [sessionId]);
}

export function attachSessionCookie(response: NextResponse, sessionId: string) {
  response.cookies.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export async function getSessionUser(request?: Request): Promise<User | null> {
  const db = await getDb();
  let token: string | undefined;

  if (request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    }
  }

  if (!token) {
    const cookieStore = await cookies();
    token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  }

  if (!token) return null;

  const row = await db.get<User & { expires_at: string }>(
    `SELECT
       u.user_id, u.full_name, u.email, u.phone_number, u.role,
       u.clinic_id, c.clinic_name, u.license_number, u.specialization, u.created_at,
       s.expires_at
     FROM sessions s
     JOIN users u ON u.user_id = s.user_id
     LEFT JOIN clinics c ON c.clinic_id = u.clinic_id
     WHERE s.session_id = ?`,
    [token]
  );

  if (!row) return null;

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await db.run(`DELETE FROM sessions WHERE session_id = ?`, [token]);
    return null;
  }

  return {
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
}

export function unauthorizedResponse(message = 'Authentication required') {
  return NextResponse.json({ message }, { status: 401 });
}

export function forbiddenResponse(message = 'You do not have permission for this action') {
  return NextResponse.json({ message }, { status: 403 });
}

export function hasRole(user: User, roles: UserRole[]): boolean {
  return roles.includes(user.role);
}
