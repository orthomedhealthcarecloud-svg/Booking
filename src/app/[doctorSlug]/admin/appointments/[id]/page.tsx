'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useDoctor } from '@/components/DoctorProvider';
import { Avatar } from '@/components/ui/Avatar';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { Row } from '@/components/ui/Row';
import { firestore } from '@/lib/firebase/client';
import { fmtMoney, fmtTime } from '@/lib/format';
import type { AppointmentDoc } from '@/lib/types';

export default function AdminAppointmentDetail() {
  const doctor = useDoctor();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [appt, setAppt] = useState<AppointmentDoc | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(firestore(), 'appointments', id), (s) => {
      if (s.exists()) {
        const data = { id: s.id, ...(s.data() as Omit<AppointmentDoc, 'id'>) };
        setAppt(data);
        setNotes(data.doctorNotes ?? '');
      }
    });
    return () => unsub();
  }, [id]);

  const saveNotes = async () => {
    if (!appt) return;
    setSaving(true);
    try {
      await updateDoc(doc(firestore(), 'appointments', appt.id), {
        doctorNotes: notes,
        updatedAt: Date.now(),
      });
    } finally {
      setSaving(false);
    }
  };

  if (!appt) return <div style={{ padding: 40, color: 'var(--ink-3)' }}>Loading…</div>;
  const isLive = appt.startTime <= Date.now() && appt.endTime > Date.now();

  return (
    <div data-screen-label="Appointment Detail">
      <div className="row" style={{ marginBottom: 18 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/${doctor.slug}/admin`)}>
          <Icon name="chevronLeft" size={14} /> Back
        </button>
        <span className="mono" style={{ color: 'var(--ink-3)', fontSize: 13, marginLeft: 6 }}>
          {appt.id}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
        <div>
          <div className="card" style={{ marginBottom: 22, padding: 22 }}>
            <div className="row" style={{ gap: 16, marginBottom: 6 }}>
              <Avatar name={appt.patientName || 'Patient'} size="lg" />
              <div style={{ flex: 1 }}>
                <div className="row" style={{ gap: 10, marginBottom: 4 }}>
                  <h2 style={{ fontSize: 22 }}>
                    {appt.patientName || `Patient #${appt.patientId.slice(0, 6)}`}
                  </h2>
                  {isLive && (
                    <Chip variant="live" dot>
                      Live
                    </Chip>
                  )}
                </div>
                <div style={{ color: 'var(--ink-3)', fontSize: 14 }}>
                  {appt.patientAge ? `${appt.patientAge} y · ` : ''}
                  {appt.patientGender || ''} ·{' '}
                  <span className="mono">
                    {fmtTime(appt.startTime, doctor.timezone)} – {fmtTime(appt.endTime, doctor.timezone)}
                  </span>{' '}
                  · {appt.type === 'video' ? 'Video' : 'Text'}
                </div>
              </div>
              {appt.type === 'video' && appt.meetUrl ? (
                <a href={appt.meetUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
                  <Icon name="video" size={16} /> Open Google Meet
                </a>
              ) : (
                <Link
                  href={`/${doctor.slug}/admin/chat/${appt.id}`}
                  className="btn btn-primary"
                >
                  <Icon name="chat" size={16} /> Open chat
                </Link>
              )}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 22 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>
              Chief complaint
            </div>
            <div style={{ fontSize: 16, marginBottom: 18 }}>{appt.chiefComplaint}</div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>
              Patient notes
            </div>
            <div style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.55 }}>
              {appt.notesForDoctor || '—'}
            </div>
          </div>

          <div className="card">
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
              <div className="eyebrow">Doctor&apos;s notes (private)</div>
              {saving && (
                <span className="mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                  saving…
                </span>
              )}
            </div>
            <textarea
              className="textarea"
              style={{ minHeight: 160 }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={saveNotes}
            />
            <div className="row" style={{ marginTop: 14, justifyContent: 'space-between' }}>
              <button className="btn btn-secondary" onClick={saveNotes}>
                Save
              </button>
              <Link
                href={`/${doctor.slug}/admin/prescriptions/${appt.id}`}
                className="btn btn-primary"
              >
                <Icon name="pill" size={16} /> Write prescription
              </Link>
            </div>
          </div>
        </div>

        <aside>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>
              Appointment
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
              <Row
                k="Mode"
                v={
                  <Chip>
                    <Icon name={appt.type === 'video' ? 'video' : 'chat'} size={12} />{' '}
                    {appt.type === 'video' ? 'Video' : 'Text'}
                  </Chip>
                }
              />
              <Row
                k="Slot"
                v={
                  <span className="mono">
                    {fmtTime(appt.startTime, doctor.timezone)}
                  </span>
                }
              />
              <Row k="Duration" v="30 min" />
              <Row
                k="Payment"
                v={
                  <Chip variant={appt.paymentStatus === 'paid' ? 'ok' : 'warn'} dot>
                    {appt.paymentStatus === 'paid'
                      ? `Paid · ${fmtMoney(appt.amountPaid ?? 0)}`
                      : appt.paymentStatus}
                  </Chip>
                }
              />
              <Row
                k="Status"
                v={
                  <Chip variant={appt.status === 'completed' ? 'ok' : 'default'} dot>
                    {appt.status}
                  </Chip>
                }
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
