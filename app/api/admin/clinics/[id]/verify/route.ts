import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { forbiddenResponse, getSessionUser, unauthorizedResponse } from '@/lib/auth';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();
  if (user.role !== 'admin') {
    return forbiddenResponse('Only system administrators can verify clinics');
  }

  const { id } = await context.params;
  const clinicId = Number(id);
  const { verified } = await request.json();

  const db = await getDb();
  const existing = await db.get<{ clinic_id: number }>(
    'SELECT clinic_id FROM clinics WHERE clinic_id = ?',
    [clinicId]
  );

  if (!existing) {
    return NextResponse.json({ message: 'Clinic not found' }, { status: 404 });
  }

  await db.run('UPDATE clinics SET verified = ? WHERE clinic_id = ?', [
    verified ? 1 : 0,
    clinicId,
  ]);

  return NextResponse.json({ success: true, verified: Boolean(verified) });
}
