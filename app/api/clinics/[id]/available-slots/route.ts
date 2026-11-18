import { NextResponse } from 'next/server';
import { getClinicSlotsForDate } from '@/lib/services/appointments';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const clinicId = Number(id);
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || '';

  if (!Number.isInteger(clinicId) || clinicId <= 0) {
    return NextResponse.json({ message: 'Invalid clinic ID' }, { status: 400 });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { message: 'Query parameter date=YYYY-MM-DD is required' },
      { status: 400 }
    );
  }

  const result = await getClinicSlotsForDate(clinicId, date);
  if (!result) {
    return NextResponse.json({ message: 'Clinic not found' }, { status: 404 });
  }

  return NextResponse.json(result);
}
