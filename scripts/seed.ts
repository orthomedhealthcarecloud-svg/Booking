/**
 * Seed Firestore with both doctors + default weekly availability templates +
 * 30 days of materialised slot instances, and grant admin custom claims to
 * the configured admin emails.
 *
 * Run with: npm run seed
 *
 * Requires either GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON.
 */

import 'dotenv/config';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '../src/lib/firebase/admin';
import { listDoctors } from '../src/lib/doctors';

type ConsultationType = 'video' | 'text';
type Block = { startMinute: number; endMinute: number; allowedTypes: ConsultationType[] };
type Template = {
  doctorId: string;
  dayOfWeek: number;
  blocks: Block[];
  slotDurationMinutes: number;
  isActive: boolean;
};

const pad = (n: number) => String(n).padStart(2, '0');

function slotIdFor(doctorId: string, start: Date): string {
  const y = start.getUTCFullYear();
  const m = pad(start.getUTCMonth() + 1);
  const d = pad(start.getUTCDate());
  const h = pad(start.getUTCHours());
  const mm = pad(start.getUTCMinutes());
  return `${doctorId}_${y}${m}${d}_${h}${mm}`;
}

async function materialize(doctorId: string, templates: Template[]) {
  const db = adminDb();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const batch = db.batch();
  let written = 0;
  for (let i = 0; i < 30; i++) {
    const day = new Date(today);
    day.setDate(day.getDate() + i);
    const dow = day.getDay();
    for (const t of templates.filter((tt) => tt.dayOfWeek === dow && tt.isActive)) {
      for (const b of t.blocks) {
        for (let m = b.startMinute; m + t.slotDurationMinutes <= b.endMinute; m += t.slotDurationMinutes) {
          const start = new Date(day);
          start.setHours(Math.floor(m / 60), m % 60, 0, 0);
          const end = new Date(start);
          end.setMinutes(end.getMinutes() + t.slotDurationMinutes);
          const id = slotIdFor(doctorId, start);
          const dateStr = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
          const ref = db.collection('availability_instances').doc(id);
          batch.set(
            ref,
            {
              doctorId,
              date: dateStr,
              startTime: start.getTime(),
              endTime: end.getTime(),
              allowedTypes: b.allowedTypes,
              isBooked: false,
              appointmentId: null,
              source: 'template',
            },
            { merge: true },
          );
          written += 1;
        }
      }
    }
  }
  await batch.commit();
  console.log(`  Materialised ${written} slot instances for ${doctorId}`);
}

async function main() {
  const doctors = listDoctors();
  const db = adminDb();
  const auth = adminAuth();

  for (const d of doctors) {
    console.log(`Seeding ${d.slug} (${d.name})…`);
    await db
      .collection('doctors')
      .doc(d.id)
      .set(
        {
          name: d.name,
          slug: d.slug,
          qualifications: d.qualifications,
          specialty: d.specialty,
          registration: d.registration,
          experienceYears: d.experienceYears,
          languages: d.languages,
          timezone: d.timezone,
          fee: d.fee,
          googleMeetUrl: d.googleMeetUrl,
          clinic: d.clinic,
          adminEmail: d.adminEmail,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    const templates: Template[] = [];
    for (let dow = 0; dow < 7; dow++) {
      const tpl: Template = {
        doctorId: d.id,
        dayOfWeek: dow,
        slotDurationMinutes: 30,
        isActive: dow !== 0, // skip Sunday by default
        blocks: [
          { startMinute: 15 * 60, endMinute: 16 * 60 + 30, allowedTypes: ['video', 'text'] },
          { startMinute: 16 * 60 + 30, endMinute: 17 * 60 + 30, allowedTypes: ['text'] },
          { startMinute: 17 * 60 + 30, endMinute: 18 * 60 + 30, allowedTypes: ['video', 'text'] },
        ],
      };
      templates.push(tpl);
      await db
        .collection('availability_templates')
        .doc(`${d.id}_${dow}`)
        .set({ ...tpl, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }

    await materialize(d.id, templates);

    if (d.adminEmail) {
      try {
        const user = await auth.getUserByEmail(d.adminEmail);
        const existing = user.customClaims ?? {};
        await auth.setCustomUserClaims(user.uid, { ...existing, admin: true, doctorId: d.id });
        console.log(`  Set admin claim for ${d.adminEmail}`);
      } catch (err) {
        console.warn(
          `  Could not set claim for ${d.adminEmail}: ${err instanceof Error ? err.message : err}`,
        );
        console.warn('  Create that user in Firebase Auth (Email/Password) and re-run the seed.');
      }
    }
  }

  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
