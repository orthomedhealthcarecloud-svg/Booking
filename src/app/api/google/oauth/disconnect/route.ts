import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return NextResponse.json({ error: 'no token' }, { status: 401 });
  let decoded;
  try {
    decoded = await adminAuth().verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: 'bad token' }, { status: 401 });
  }
  const { doctorId } = (await req.json()) as { doctorId: string };
  if (decoded.doctorId !== doctorId && decoded.admin !== true) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  await adminDb()
    .collection('doctors')
    .doc(doctorId)
    .set({ googleCalendar: FieldValue.delete() }, { merge: true });
  return NextResponse.json({ ok: true });
}
