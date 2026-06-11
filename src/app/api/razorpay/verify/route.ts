import { NextResponse } from 'next/server';
import { createHmac } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { getDoctor } from '@/lib/doctors';
import { slotIdFor } from '@/lib/format';
import { createConsultationEvent } from '@/lib/google/calendar';

export const runtime = 'nodejs';

type Body = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
  doctorId: string;
  type: 'video' | 'text';
  startMillis: number;
  endMillis: number;
  chiefComplaint: string;
  notesForDoctor?: string;
  amountPaid: number;
  form: { name: string; email: string; phone: string; age: string; gender: string };
};

function verifySignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const h = createHmac('sha256', secret);
  h.update(`${orderId}|${paymentId}`);
  return h.digest('hex') === signature;
}

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return NextResponse.json({ error: 'Missing auth' }, { status: 401 });
    const decoded = await adminAuth().verifyIdToken(token);
    const patientUid = decoded.uid;

    const body = (await req.json()) as Body;

    if (!verifySignature(body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature)) {
      return NextResponse.json({ error: 'Invalid Razorpay signature' }, { status: 400 });
    }

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
      const slot = slotSnap.data() as {
        isBooked: boolean;
        allowedTypes: ('video' | 'text')[];
      };
      if (slot.isBooked) throw new Error('Slot already booked');
      if (!slot.allowedTypes.includes(body.type))
        throw new Error('Selected type is not allowed for this slot');
      if (lockSnap.exists) throw new Error('Concurrent booking detected');

      if (!userSnap.exists) {
        tx.set(userRef, {
          authUid: patientUid,
          phone: body.form.phone || decoded.phone_number || '',
          email: body.form.email || '',
          name: body.form.name,
          age: Number(body.form.age) || null,
          gender: body.form.gender,
          role: 'patient',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        tx.update(userRef, {
          name: body.form.name,
          phone: body.form.phone || decoded.phone_number || '',
          email: body.form.email || '',
          age: Number(body.form.age) || null,
          gender: body.form.gender,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      tx.set(lockRef, {
        doctorId: body.doctorId,
        startTime: body.startMillis,
        endTime: body.endMillis,
        createdAt: FieldValue.serverTimestamp(),
      });

      // Fallback meet URL (used only if Google Calendar integration is not connected
      // for this doctor). Real Meet links are populated by Calendar API after the txn.
      const fallbackMeetUrl = body.type === 'video' ? doctor.googleMeetUrl : undefined;

      tx.set(apptRef, {
        patientId: patientUid,
        patientName: body.form.name,
        patientEmail: body.form.email || '',
        patientPhone: body.form.phone || decoded.phone_number || '',
        patientAge: Number(body.form.age) || null,
        patientGender: body.form.gender,
        doctorId: body.doctorId,
        type: body.type,
        status: 'confirmed',
        startTime: body.startMillis,
        endTime: body.endMillis,
        meetUrl: fallbackMeetUrl ?? null,
        calendarEventId: null,
        calendarHtmlLink: null,
        paymentStatus: 'paid',
        paymentReference: body.razorpay_payment_id,
        amountPaid: body.amountPaid,
        chiefComplaint: body.chiefComplaint,
        notesForDoctor: body.notesForDoctor ?? '',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      tx.update(slotRef, { isBooked: true, appointmentId: apptRef.id });

      // If text consultation, create the chat session shell.
      if (body.type === 'text') {
        const chatRef = db.collection('chat_sessions').doc(apptRef.id);
        tx.set(chatRef, {
          appointmentId: apptRef.id,
          patientId: patientUid,
          doctorId: body.doctorId,
          startTime: body.startMillis,
          endTime: body.endMillis,
          status: 'scheduled',
        });
      }

      const auditRef = db.collection('audit_logs').doc();
      tx.set(auditRef, {
        actorId: patientUid,
        actorRole: 'patient',
        action: 'CREATE_APPOINTMENT',
        targetType: 'appointment',
        targetId: apptRef.id,
        meta: {
          doctorId: body.doctorId,
          type: body.type,
          amount: body.amountPaid,
          paymentRef: body.razorpay_payment_id,
        },
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    // Best-effort: create a Google Calendar event on the doctor's calendar.
    // Done after the transaction so a slow network call doesn't hold the txn open.
    // If anything fails here, the appointment is still valid; we just log the failure.
    try {
      const doctorSnap = await doctorRef.get();
      const gcal = doctorSnap.data()?.googleCalendar as
        | { refreshToken?: string; calendarId?: string }
        | undefined;
      if (gcal?.refreshToken) {
        const summary =
          body.type === 'video'
            ? `${doctor.name} · Video consultation — ${body.form.name}`
            : `${doctor.name} · Text consultation — ${body.form.name}`;
        const description = [
          `Patient: ${body.form.name} (${body.form.age} y, ${body.form.gender})`,
          `Phone: ${body.form.phone || decoded.phone_number || '—'}`,
          `Email: ${body.form.email || '—'}`,
          `Mode: ${body.type}`,
          `Booking: ${apptRef.id}`,
          `Chief complaint: ${body.chiefComplaint}`,
          body.notesForDoctor ? `Patient notes: ${body.notesForDoctor}` : '',
        ]
          .filter(Boolean)
          .join('\n');

        const event = await createConsultationEvent({
          refreshToken: gcal.refreshToken,
          calendarId: gcal.calendarId || 'primary',
          summary,
          description,
          startMillis: body.startMillis,
          endMillis: body.endMillis,
          timezone: doctor.timezone,
          // Adding the patient as an attendee makes Google email them the invite +
          // Meet link (createConsultationEvent sets sendUpdates: 'all').
          patientEmail: body.form.email || undefined,
        });

        await apptRef.update({
          meetUrl: body.type === 'video' ? event.meetUrl ?? null : null,
          calendarEventId: event.eventId,
          calendarHtmlLink: event.htmlLink,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    } catch (calErr) {
      console.warn('Calendar event creation failed', calErr);
      await db.collection('audit_logs').add({
        actorId: 'system',
        actorRole: 'system',
        action: 'CALENDAR_EVENT_FAILED',
        targetType: 'appointment',
        targetId: apptRef.id,
        meta: {
          doctorId: body.doctorId,
          error: calErr instanceof Error ? calErr.message : String(calErr),
        },
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({ appointmentId: apptRef.id });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Verification failed' },
      { status: 400 },
    );
  }
}
