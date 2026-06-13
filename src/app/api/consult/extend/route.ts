import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

const EXTEND_MS = 5 * 60 * 1000;

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return NextResponse.json({ error: 'Missing auth' }, { status: 401 });
    const decoded = await adminAuth().verifyIdToken(token);

    const { appointmentId } = (await req.json()) as { appointmentId: string };
    if (!appointmentId) return NextResponse.json({ error: 'Missing appointmentId' }, { status: 400 });

    const db = adminDb();
    const apptRef = db.collection('appointments').doc(appointmentId);
    const snap = await apptRef.get();
    if (!snap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const appt = snap.data() as { doctorId: string; endTime: number };

    if (decoded.admin !== true && decoded.doctorId !== appt.doctorId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Extend from the later of the current end or now, so reopening a finished
    // consult actually adds usable time.
    const newEnd = Math.max(appt.endTime, Date.now()) + EXTEND_MS;
    await apptRef.update({ endTime: newEnd, updatedAt: FieldValue.serverTimestamp() });

    // Extend the chat session window too (text consults), so the chat stays open.
    const chatRef = db.collection('chat_sessions').doc(appointmentId);
    if ((await chatRef.get()).exists) {
      await chatRef.update({ endTime: newEnd });
    }

    return NextResponse.json({ endTime: newEnd });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Extend failed' },
      { status: 500 },
    );
  }
}
