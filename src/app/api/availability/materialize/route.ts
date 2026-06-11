import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { slotIdFor } from '@/lib/format';

export const runtime = 'nodejs';

const DAYS_AHEAD = 30;
const DEFAULT_SLOT_MIN = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

type ConsultationType = 'video' | 'text';
type Block = { startMinute: number; endMinute: number; allowedTypes: ConsultationType[] };
type Template = { dayOfWeek: number; blocks: Block[]; slotDurationMinutes?: number };

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Regenerates `availability_instances` for the next 30 days from a doctor's active
 * weekly templates. Called right after the availability template is saved so new
 * hours become bookable immediately (rather than waiting for the daily cron).
 *
 * Safe to call repeatedly:
 *  - already-booked slots are preserved untouched
 *  - non-booked slots that no longer match the template are removed
 *  - everything else is (re)written as an available slot
 */
export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return NextResponse.json({ error: 'Missing auth' }, { status: 401 });
    const decoded = await adminAuth().verifyIdToken(token);

    const { doctorId } = (await req.json()) as { doctorId: string };
    if (!doctorId) return NextResponse.json({ error: 'Missing doctorId' }, { status: 400 });
    if (decoded.admin !== true && decoded.doctorId !== doctorId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const db = adminDb();
    const [tplSnap, ovSnap] = await Promise.all([
      db
        .collection('availability_templates')
        .where('doctorId', '==', doctorId)
        .where('isActive', '==', true)
        .get(),
      db.collection('availability_overrides').where('doctorId', '==', doctorId).get(),
    ]);
    const templates = tplSnap.docs.map((d) => d.data() as Template);
    const templateByDow = new Map<number, Template>();
    for (const t of templates) templateByDow.set(t.dayOfWeek, t);

    // Date-specific overrides keyed by 'YYYY-MM-DD'. An override with isActive=false
    // or empty blocks means "closed that day" (no slots), overriding the weekly default.
    type Override = { date: string; blocks: Block[]; slotDurationMinutes?: number; isActive?: boolean };
    const overrideByDate = new Map<string, Override>();
    for (const d of ovSnap.docs) {
      const o = d.data() as Override;
      overrideByDate.set(o.date, o);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rangeStart = today.getTime();
    const rangeEnd = rangeStart + DAYS_AHEAD * DAY_MS;

    // Build the desired set of slots from the templates.
    const desired = new Map<
      string,
      { startMillis: number; endMillis: number; date: string; allowedTypes: ConsultationType[] }
    >();
    for (let i = 0; i < DAYS_AHEAD; i++) {
      const day = new Date(today);
      day.setDate(day.getDate() + i);
      const dateStr = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;

      // A date override wins over the weekly default for that exact date.
      const override = overrideByDate.get(dateStr);
      const template = templateByDow.get(day.getDay());
      const source = override ?? template;
      if (!source) continue;
      if (override && override.isActive === false) continue; // explicitly closed that day
      const blocks = source.blocks || [];
      const dur = source.slotDurationMinutes || DEFAULT_SLOT_MIN;

      for (const b of blocks) {
        for (let m = b.startMinute; m + dur <= b.endMinute; m += dur) {
          const start = new Date(day);
          start.setHours(Math.floor(m / 60), m % 60, 0, 0);
          const end = new Date(start);
          end.setMinutes(end.getMinutes() + dur);
          const id = slotIdFor(doctorId, start.getTime());
          desired.set(id, {
            startMillis: start.getTime(),
            endMillis: end.getTime(),
            date: dateStr,
            allowedTypes: b.allowedTypes,
          });
        }
      }
    }

    // Existing instances for this doctor (single equality filter — no composite index needed).
    const existingSnap = await db
      .collection('availability_instances')
      .where('doctorId', '==', doctorId)
      .get();
    const existingById = new Map(existingSnap.docs.map((d) => [d.id, d]));

    let batch = db.batch();
    let ops = 0;
    let created = 0;
    let updated = 0;
    let removed = 0;
    let keptBooked = 0;
    const flushIfNeeded = async () => {
      if (ops >= 450) {
        await batch.commit();
        batch = db.batch();
        ops = 0;
      }
    };

    // Remove stale, non-booked, in-range slots that are no longer in the template.
    for (const [id, snap] of existingById) {
      const data = snap.data();
      const inRange = data.startTime >= rangeStart && data.startTime < rangeEnd;
      if (!inRange) continue;
      if (desired.has(id)) continue;
      if (data.isBooked) {
        keptBooked++;
        continue;
      }
      batch.delete(snap.ref);
      ops++;
      removed++;
      await flushIfNeeded();
    }

    // Write desired slots (preserve any that are already booked).
    for (const [id, s] of desired) {
      const existing = existingById.get(id);
      if (existing?.data().isBooked) {
        keptBooked++;
        continue;
      }
      batch.set(db.collection('availability_instances').doc(id), {
        doctorId,
        date: s.date,
        startTime: s.startMillis,
        endTime: s.endMillis,
        allowedTypes: s.allowedTypes,
        isBooked: false,
        appointmentId: null,
        source: 'template',
      });
      ops++;
      existing ? updated++ : created++;
      await flushIfNeeded();
    }

    if (ops > 0) await batch.commit();

    return NextResponse.json({ created, updated, removed, keptBooked, total: desired.size });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Materialize failed' },
      { status: 500 },
    );
  }
}
