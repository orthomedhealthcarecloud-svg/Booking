import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';

type Appointment = {
  patientId: string;
  doctorId: string;
  type: 'video' | 'text';
  startTime: number;
  endTime: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
};

/**
 * On text appointments, ensure a chat_sessions document exists in 'scheduled' state.
 * (The verify route already creates this; this is the belt-and-braces version.)
 */
export const onAppointmentCreated = onDocumentCreated('appointments/{apptId}', async (event) => {
  const a = event.data?.data() as Appointment | undefined;
  if (!a) return;
  if (a.type !== 'text') return;
  const db = getFirestore();
  const ref = db.collection('chat_sessions').doc(event.params.apptId);
  const snap = await ref.get();
  if (snap.exists) return;
  await ref.set({
    appointmentId: event.params.apptId,
    patientId: a.patientId,
    doctorId: a.doctorId,
    startTime: a.startTime,
    endTime: a.endTime,
    status: 'scheduled',
  });
});

/**
 * Mirror appointment.status changes onto chat_sessions.status.
 */
export const onAppointmentUpdated = onDocumentUpdated('appointments/{apptId}', async (event) => {
  const before = event.data?.before.data() as Appointment | undefined;
  const after = event.data?.after.data() as Appointment | undefined;
  if (!before || !after) return;
  if (before.status === after.status) return;
  const db = getFirestore();
  const ref = db.collection('chat_sessions').doc(event.params.apptId);
  if (!(await ref.get()).exists) return;
  if (after.status === 'cancelled') {
    await ref.update({ status: 'closed' });
  } else if (after.status === 'completed') {
    await ref.update({ status: 'closed' });
  }
});

/**
 * Every 5 minutes: close any chat sessions whose endTime has passed.
 */
export const closeChatSessions = onSchedule(
  { schedule: 'every 5 minutes', timeZone: 'Asia/Kolkata' },
  async () => {
    const db = getFirestore();
    const now = Date.now();
    const q = await db
      .collection('chat_sessions')
      .where('status', '==', 'active')
      .where('endTime', '<', now)
      .get();
    const writes = q.docs.map((d) => d.ref.update({ status: 'closed', closedAt: FieldValue.serverTimestamp() }));
    await Promise.all(writes);

    // Also flip 'scheduled' → 'active' for sessions that have begun.
    const begin = await db
      .collection('chat_sessions')
      .where('status', '==', 'scheduled')
      .where('startTime', '<=', now)
      .where('endTime', '>', now)
      .get();
    const opens = begin.docs.map((d) => d.ref.update({ status: 'active' }));
    await Promise.all(opens);
  },
);
