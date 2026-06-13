import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

type Body = {
  doctorId: string;
  name?: string;
  qualifications?: string;
  specialty?: string;
  registration?: string;
  experienceYears?: number;
  languages?: string;
  timezone?: string;
  fee?: { video?: number; text?: number };
  clinic?: { name?: string; address?: string; phone?: string };
};

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return NextResponse.json({ error: 'Missing auth' }, { status: 401 });
    const decoded = await adminAuth().verifyIdToken(token);

    const b = (await req.json()) as Body;
    if (!b.doctorId) return NextResponse.json({ error: 'Missing doctorId' }, { status: 400 });
    if (decoded.admin !== true && decoded.doctorId !== b.doctorId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Whitelist editable profile fields only (never touch googleCalendar tokens etc.).
    const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    if (b.name !== undefined) update.name = String(b.name);
    if (b.qualifications !== undefined) update.qualifications = String(b.qualifications);
    if (b.specialty !== undefined) update.specialty = String(b.specialty);
    if (b.registration !== undefined) update.registration = String(b.registration);
    if (b.experienceYears !== undefined) update.experienceYears = Number(b.experienceYears) || 0;
    if (b.languages !== undefined) update.languages = String(b.languages);
    if (b.timezone !== undefined) update.timezone = String(b.timezone);
    if (b.fee) {
      update.fee = {
        video: Number(b.fee.video) || 0,
        text: Number(b.fee.text) || 0,
      };
    }
    if (b.clinic) {
      update.clinic = {
        name: String(b.clinic.name ?? ''),
        address: String(b.clinic.address ?? ''),
        phone: String(b.clinic.phone ?? ''),
      };
    }

    await adminDb().collection('doctors').doc(b.doctorId).set(update, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Save failed' },
      { status: 500 },
    );
  }
}
