import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { getDoctor } from '@/lib/doctors';
import { slotIdFor } from '@/lib/format';
import { createConsultationEvent } from '@/lib/google/calendar';

export const runtime = 'nodejs';

type Body = {
  doctorId: string;
  startMillis: number;
  endMillis: number;
  chiefComplaint: string;
  notesForDoctor?: string;
  form: { name: string; email: string; phone: string; age: string; gender: string };
  documentIds?: string[];
};

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return NextResponse.json({ error: 'Missing auth' }, { status: 401 });
    const decoded = await adminAuth().verifyIdToken(token);
    const patientUid = decoded.uid;

    const body = (await req.json()) as Body;
    const doctor = getDoctor(body.doctorId);
    if (!doctor) return NextResponse.json({ error: 'Unknown doctor' }, { status: 400 });

    const db = adminDb();
    const slotId = slotIdFor(body.doctorId, body.startMillis);
    const slotRef = db.collection('availability_instances').doc(slotId);
    const lockRef = db.collection('slot_locks').doc(slotId);
    const apptRef = db.collection('appointments').doc();
    const userRef = db.collection('users').doc(patientUid);
    const doctorRef = db.collection('doctors').doc(body.doctorId);

    await db.runTransaction(async (tx) => {
      const [slotSnap, lockSnap, userSnap] = await Promise.all([
        tx.get(slotRef),
        tx.get(lockRef),
        tx.get(userRef),
      ]);

      if (!slotSnap.exists) throw new Error('Slot not found');
      if ((slotSnap.data() as { isBooked: boolean }).isBooked) throw new Error('Slot already booked');
      if (lockSnap.exists) throw new Error('Concurrent booking detected');

      const userData = {
        name: body.form.name,
        phone: body.form.phone || decoded.phone_number || '',
        email: body.form.email || '',
        age: Number(body.form.age) || null,
        gender: body.form.gender,
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (!userSnap.exists) {
        tx.set(userRef, {
          authUid: patientUid,
          role: 'patient',
          createdAt: FieldValue.serverTimestamp(),
          ...userData,
        });
      } else {
        tx.update(userRef, userData);
      }

      tx.set(lockRef, {
        doctorId: body.doctorId,
        startTime: body.startMillis,
        endTime: body.endMillis,
        createdAt: FieldValue.serverTimestamp(),
      });

      tx.set(apptRef, {
        patientId: patientUid,
        patientName: body.form.name,
        patientEmail: body.form.email || '',
        patientPhone: body.form.phone || decoded.phone_number || '',
        patientAge: Number(body.form.age) || null,
        patientGender: body.form.gender,
        doctorId: body.doctorId,
        type: 'walkin',
        status: 'confirmed',
        startTime: body.startMillis,
        endTime: body.endMillis,
        meetUrl: null,
        calendarEventId: null,
        calendarHtmlLink: null,
        paymentStatus: 'paid',
        amountPaid: 0,
        chiefComplaint: body.chiefComplaint,
        notesForDoctor: body.notesForDoctor ?? '',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      tx.update(slotRef, { isBooked: true, appointmentId: apptRef.id });

      tx.set(db.collection('audit_logs').doc(), {
        actorId: patientUid,
        actorRole: 'patient',
        action: 'CREATE_WALKIN_APPOINTMENT',
        targetType: 'appointment',
        targetId: apptRef.id,
        meta: { doctorId: body.doctorId },
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    // Link any uploaded documents to this appointment.
    if (body.documentIds?.length) {
      const batch = db.batch();
      for (const docId of body.documentIds.slice(0, 20)) {
        batch.set(db.collection('documents').doc(docId), { appointmentId: apptRef.id }, { merge: true });
      }
      await batch.commit().catch(() => {});
    }

    // Best-effort calendar event (in-clinic, no video link) → emails the patient an invite.
    try {
      const gcal = (await doctorRef.get()).data()?.googleCalendar as
        | { refreshToken?: string; calendarId?: string }
        | undefined;
      if (gcal?.refreshToken) {
        const event = await createConsultationEvent({
          refreshToken: gcal.refreshToken,
          calendarId: gcal.calendarId || 'primary',
          summary: `${doctor.name} · Walk-in — ${body.form.name}`,
          description: [
            `Patient: ${body.form.name} (${body.form.age} y, ${body.form.gender})`,
            `Phone: ${body.form.phone || decoded.phone_number || '—'}`,
            `Email: ${body.form.email || '—'}`,
            `Reason: ${body.chiefComplaint}`,
            body.notesForDoctor ? `Notes: ${body.notesForDoctor}` : '',
          ]
            .filter(Boolean)
            .join('\n'),
          startMillis: body.startMillis,
          endMillis: body.endMillis,
          timezone: doctor.timezone,
          patientEmail: body.form.email || undefined,
          location: doctor.clinic?.address || doctor.clinic?.name || undefined,
        });
        await apptRef.update({
          calendarEventId: event.eventId,
          calendarHtmlLink: event.htmlLink,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    } catch (calErr) {
      console.warn('Calendar event failed', calErr);
    }

    return NextResponse.json({ appointmentId: apptRef.id });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Booking failed' },
      { status: 400 },
    );
  }
}
