import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser, unauthorizedResponse } from '@/lib/auth';

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();

  const db = await getDb();
  const rows = await db.all<Record<string, unknown>>(
    `SELECT n.*, p.name as pet_name
     FROM notifications n
     LEFT JOIN pets p ON p.pet_id = n.pet_id
     WHERE n.user_id = ?
     ORDER BY n.is_read ASC, n.created_at DESC, n.notification_id DESC
     LIMIT 30`,
    [user.user_id]
  );

  return NextResponse.json(
    rows.map((r) => ({
      ...r,
      is_read: Boolean(r.is_read),
    }))
  );
}

export async function PATCH(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();

  const body = await request.json().catch(() => ({}));
  const db = await getDb();

  if (body.notification_id) {
    await db.run(
      `UPDATE notifications SET is_read = 1 WHERE notification_id = ? AND user_id = ?`,
      [Number(body.notification_id), user.user_id]
    );
  } else {
    await db.run(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`, [user.user_id]);
  }

  return NextResponse.json({ success: true });
}
