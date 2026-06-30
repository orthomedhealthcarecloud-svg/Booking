'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDoctor } from '@/components/DoctorProvider';
import { useBooking } from '@/components/BookingProvider';
import { Stepper } from '@/components/ui/Stepper';
import { fetchAvailability } from '@/lib/firestore/availability';
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
  const { patch } = useBooking();
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

  const now = Date.now();
  const visibleSlots = slots.filter((s) => !s.isBooked && s.startTime > now);

  return (
    <div className="patient-wrap" data-screen-label="Book — Slot" style={{ maxWidth: 760 }}>
      <Stepper current={0} />
      <h1 style={{ marginBottom: 8 }}>Pick a time</h1>
      <p style={{ color: 'var(--ink-2)', marginBottom: 28 }}>
        Choose a walk-in slot with {doctor.name.split(' ').slice(0, 2).join(' ')}.
      </p>

      <div className="card">
        <div style={{ display: 'flex', gap: 8, marginBottom: 22, overflowX: 'auto', paddingBottom: 4 }}>
          {days.map((d, i) => {
            const active = dayIdx === i;
            return (
              <button
                key={i}
                onClick={() => setDayIdx(i)}
                style={{
                  minWidth: 76,
                  padding: '12px 0',
                  textAlign: 'center',
                  cursor: 'pointer',
                  borderRadius: 'var(--r)',
                  border: active ? '1px solid var(--ink)' : '1px solid var(--line)',
                  background: active ? 'var(--ink)' : 'var(--surface)',
                  color: active ? 'white' : 'var(--ink)',
                  transition: 'all .15s ease',
                }}
              >
                <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 3, letterSpacing: '.04em' }}>
                  {i === 0 ? 'TODAY' : d.toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase()}
                </div>
                <div className="mono" style={{ fontSize: 18, fontWeight: 500 }}>{d.getDate()}</div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>
                  {d.toLocaleDateString('en-IN', { month: 'short' })}
                </div>
              </button>
            );
          })}
        </div>

        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontSize: 14, color: 'var(--ink-2)', fontWeight: 500 }}>Available slots</h3>
          <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Times in {doctor.timezone}</div>
        </div>

        {loading ? (
          <div style={{ color: 'var(--ink-3)', fontSize: 14, padding: 16 }}>Loading…</div>
        ) : visibleSlots.length === 0 ? (
          <div style={{ color: 'var(--ink-3)', fontSize: 14, padding: 16 }}>
            No slots open this day. Try another date.
          </div>
        ) : (
          <div className="slot-grid">
            {visibleSlots.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelected(s.id)}
                className={`slot ${selected === s.id ? 'selected' : ''}`}
              >
                {fmtTime(s.startTime, doctor.timezone).replace(' ', '')}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="row" style={{ marginTop: 22, justifyContent: 'flex-end' }}>
        <button
          className="btn btn-primary"
          disabled={!selected}
          onClick={() => {
            const s = slots.find((x) => x.id === selected);
            if (!s) return;
            patch({
              slot: { startMillis: s.startTime, endMillis: s.endTime, allowed: s.allowedTypes },
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
