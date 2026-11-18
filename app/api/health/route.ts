import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDb();
    const clinics = await db.get<{ c: number | string }>('SELECT COUNT(*) as c FROM clinics');
    const pets = await db.get<{ c: number | string }>('SELECT COUNT(*) as c FROM pets');
    const appointments = await db.get<{ c: number | string }>(
      'SELECT COUNT(*) as c FROM appointments'
    );
    return NextResponse.json({
      status: 'ok',
      database: process.env.DATABASE_URL ? 'postgresql' : 'sqlite',
      counts: {
        clinics: Number(clinics?.c ?? 0),
        pets: Number(pets?.c ?? 0),
        appointments: Number(appointments?.c ?? 0),
      },
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
