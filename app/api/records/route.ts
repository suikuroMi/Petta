import { NextResponse } from 'next/server';
import { forbiddenResponse, getSessionUser, unauthorizedResponse } from '@/lib/auth';
import { healthRecordSchema } from '@/lib/validations';
import { insertImmutableHealthRecord } from '@/lib/services/records';

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();

  if (user.role !== 'vet') {
    return forbiddenResponse(
      'Only licensed Attending Veterinarians can insert official clinical or vaccination records'
    );
  }

  try {
    const body = await request.json();
    const parsed = healthRecordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || 'Invalid clinical record payload' },
        { status: 400 }
      );
    }

    const result = await insertImmutableHealthRecord(parsed.data, user);
    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to commit health record';
    const status = msg.includes('not found') ? 404 : 400;
    return NextResponse.json({ message: msg }, { status });
  }
}
