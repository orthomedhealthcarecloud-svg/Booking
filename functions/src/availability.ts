import { getFirestore } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';

type ConsultationType = 'video' | 'text';

type TemplateBlock = {
  startMinute: number;
  endMinute: number;
  allowedTypes: ConsultationType[];
};

type Template = {
  doctorId: string;
  dayOfWeek: number;
  blocks: TemplateBlock[];
  slotDurationMinutes: number;
  isActive: boolean;
};

/**
 * Runs daily at 02:00 IST. For each active template, materialises
 * `availability_instances` documents for the next 30 days that don't already exist.
 * Slot id schema: `${doctorId}_${YYYYMMDD}_${HHMM}` — matches the booking path.
 */
export const materializeAvailability = onSchedule(
  {
    schedule: 'every day 02:00',
    timeZone: 'Asia/Kolkata',
    timeoutSeconds: 300,
  },
  async () => {
    const db = getFirestore();
    const templatesSnap = await db
      .collection('availability_templates')
      .where('isActive', '==', true)
      .get();
    const templates = templatesSnap.docs.map((d) => d.data() as Template);

    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    const writes: Promise<unknown>[] = [];

    for (let i = 0; i < 30; i++) {
      const day = new Date(todayMidnight);
      day.setDate(day.getDate() + i);
      const dow = day.getDay();
      const matching = templates.filter((t) => t.dayOfWeek === dow);
      for (const t of matching) {
        for (const b of t.blocks) {
          for (let m = b.startMinute; m + t.slotDurationMinutes <= b.endMinute; m += t.slotDurationMinutes) {
            const slotStart = new Date(day);
            slotStart.setHours(Math.floor(m / 60), m % 60, 0, 0);
            const slotEnd = new Date(slotStart);
            slotEnd.setMinutes(slotEnd.getMinutes() + t.slotDurationMinutes);

            const id = slotId(t.doctorId, slotStart);
            const dateStr = `${slotStart.getFullYear()}-${pad(slotStart.getMonth() + 1)}-${pad(slotStart.getDate())}`;
            const ref = db.collection('availability_instances').doc(id);
            writes.push(
              ref.get().then((snap) => {
                if (snap.exists) return;
                return ref.set({
                  doctorId: t.doctorId,
                  date: dateStr,
                  startTime: slotStart.getTime(),
                  endTime: slotEnd.getTime(),
                  allowedTypes: b.allowedTypes,
                  isBooked: false,
                  appointmentId: null,
                  source: 'template',
                });
              }),
            );
          }
        }
      }
    }
    await Promise.all(writes);
  },
);

function slotId(doctorId: string, start: Date): string {
  const y = start.getUTCFullYear();
  const m = pad(start.getUTCMonth() + 1);
  const d = pad(start.getUTCDate());
  const h = pad(start.getUTCHours());
  const mm = pad(start.getUTCMinutes());
  return `${doctorId}_${y}${m}${d}_${h}${mm}`;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
