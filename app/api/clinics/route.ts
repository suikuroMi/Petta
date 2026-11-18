import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const includeUnverified = searchParams.get('all') === 'true';
  const db = await getDb();

  const rows = await db.all<Record<string, unknown>>(
    includeUnverified
      ? `SELECT * FROM clinics ORDER BY verified DESC, clinic_name ASC`
      : `SELECT * FROM clinics WHERE verified = 1 ORDER BY clinic_name ASC`
  );

  const clinics = rows.map((c) => ({
    ...c,
    verified: Boolean(c.verified),
  }));

  return NextResponse.json(clinics);
}
