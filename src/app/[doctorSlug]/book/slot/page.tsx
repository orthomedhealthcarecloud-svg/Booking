'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDoctor } from '@/components/DoctorProvider';
import { useBooking } from '@/components/BookingProvider';
import { Stepper } from '@/components/ui/Stepper';
import { fetchAvailability, isSlotAvailableForType } from '@/lib/firestore/availability';
import { fmtTime } from '@/lib/format';
import type { AvailabilityInstanceDoc } from '@/lib/types';

function next7Days(): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    return d;
  });
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function BookSlotPage() {
  const doctor = useDoctor();
  const router = useRouter();
  const { draft, patch } = useBooking();
  const days = useMemo(next7Days, []);
  const [dayIdx, setDayIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [slots, setSlots] = useState<AvailabilityInstanceDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setSelected(null);
    fetchAvailability(doctor.id, toDateStr(days[dayIdx]))
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
  }, [dayIdx, days, doctor.id]);

  // Only show slots that (a) support the consultation type the patient chose and
  // (b) haven't already started. (Past slots mainly matter for "Today".)
  const now = Date.now();
  const visibleSlots = slots.filter(
    (s) => s.allowedTypes.includes(draft.type) && s.startTime > now,
  );

  return (
    <div className="patient-wrap" data-screen-label="Book — Slot" style={{ maxWidth: 820 }}>
      <Stepper current={1} />
      <h1 style={{ marginBottom: 8 }}>Pick a time</h1>
      <p style={{ color: 'var(--ink-2)', marginBottom: 28 }}>
        Showing slots for <strong>{draft.type === 'video' ? 'video' : 'text'}</strong> consultation with{' '}
        {doctor.name}.
      </p>

      <div className="card">
        <div style={{ display: 'flex', gap: 6, marginBottom: 22, overflowX: 'auto', paddingBottom: 4 }}>
          {days.map((d, i) => {
            const isToday = i === 0;
            const active = dayIdx === i;
            return (
              <button
                key={i}
                className="card-flat"
                onClick={() => setDayIdx(i)}
                style={{
                  minWidth: 78,
                  padding: '10px 0',
                  textAlign: 'center',
                  cursor: 'pointer',
                  border: active ? '1px solid var(--ink)' : '1px solid var(--line)',
                  background: active ? 'var(--ink)' : 'var(--surface)',
                  color: active ? 'white' : 'var(--ink)',
                }}
              >
                <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 2 }}>
                  {isToday
                    ? 'TODAY'
                    : d.toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase()}
                </div>
                <div className="mono" style={{ fontSize: 17, fontWeight: 500 }}>
                  {d.getDate()}
                </div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>
                  {d.toLocaleDateString('en-IN', { month: 'short' })}
                </div>
              </button>
            );
          })}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 12,
          }}
        >
          <h3 style={{ fontSize: 14, color: 'var(--ink-2)', fontWeight: 500 }}>Available slots</h3>
          <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>All times in {doctor.timezone}</div>
        </div>

        {loading ? (
          <div style={{ color: 'var(--ink-3)', fontSize: 14, padding: 16 }}>Loading…</div>
        ) : visibleSlots.length === 0 ? (
          <div style={{ color: 'var(--ink-3)', fontSize: 14, padding: 16 }}>
            No {draft.type} slots available for this day. Try another day.
          </div>
        ) : (
          <div className="slot-grid">
            {visibleSlots.map((s) => {
              const disabled = !isSlotAvailableForType(s, draft.type);
              const isSelected = selected === s.id;
              return (
                <button
                  key={s.id}
                  disabled={disabled}
                  onClick={() => setSelected(s.id)}
                  className={`slot ${s.isBooked ? 'booked' : ''} ${isSelected ? 'selected' : ''}`}
                >
                  {fmtTime(s.startTime, doctor.timezone).replace(' ', '')}
                </button>
              );
            })}
          </div>
        )}

        <p style={{ color: 'var(--ink-3)', fontSize: 12, marginTop: 14 }}>
          Showing {draft.type} slots only. Crossed-out slots are already booked.
        </p>
      </div>

      <div className="row" style={{ marginTop: 22, justifyContent: 'space-between' }}>
        <button className="btn btn-ghost" onClick={() => router.push(`/${doctor.slug}/book/type`)}>
          ← Back
        </button>
        <button
          className="btn btn-primary"
          disabled={!selected}
          onClick={() => {
            const s = slots.find((x) => x.id === selected);
            if (!s) return;
            patch({
              slot: {
                startMillis: s.startTime,
                endMillis: s.endTime,
                allowed: s.allowedTypes,
              },
            });
            router.push(`/${doctor.slug}/book/details`);
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
