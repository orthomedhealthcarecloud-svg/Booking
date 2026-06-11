import { getFirestore } from 'firebase-admin/firestore';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';

const WHATSAPP_KEY = defineSecret('WHATSAPP_API_KEY');

type Appointment = {
  patientId: string;
  doctorId: string;
  type: 'video' | 'text';
  startTime: number;
  endTime: number;
  meetUrl?: string;
  chiefComplaint: string;
};

/**
 * Sends a WhatsApp confirmation when an appointment is created.
 * If WHATSAPP_API_KEY / WHATSAPP_API_BASE_URL / WHATSAPP_SENDER_NUMBER are not configured,
 * silently no-ops.
 */
export const notifyOnAppointmentCreated = onDocumentCreated(
  { document: 'appointments/{apptId}', secrets: [WHATSAPP_KEY] },
  async (event) => {
    const apiKey = WHATSAPP_KEY.value();
    const baseUrl = process.env.WHATSAPP_API_BASE_URL;
    const sender = process.env.WHATSAPP_SENDER_NUMBER;
    if (!apiKey || !baseUrl || !sender) return;

    const a = event.data?.data() as Appointment | undefined;
    if (!a) return;

    const db = getFirestore();
    const userSnap = await db.collection('users').doc(a.patientId).get();
    const phone = userSnap.exists ? (userSnap.data()?.phone as string | undefined) : undefined;
    if (!phone) return;

    const when = new Date(a.startTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const text =
      `Your ${a.type} consultation is confirmed for ${when} IST. ` +
      (a.type === 'video' && a.meetUrl ? `Meet link: ${a.meetUrl}` : 'Open the Medi app at appointment time.');

    try {
      await fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          to: phone,
          from: sender,
          type: 'text',
          text: { body: text },
        }),
      });
    } catch (e) {
      console.warn('WhatsApp send failed', e);
    }
  },
);
