'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useDoctor } from '@/components/DoctorProvider';
import { Avatar } from '@/components/ui/Avatar';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { SlideOver } from '@/components/ui/SlideOver';
import { subscribeDoctorAppointments } from '@/lib/firestore/appointments';
import { fmtDate, fmtDateLong, fmtTime } from '@/lib/format';
import type { AppointmentDoc } from '@/lib/types';

export default function AdminConsultations() {
  const doctor = useDoctor();
  const router = useRouter();
  const { user } = useAuth();
  const [appts, setAppts] = useState<AppointmentDoc[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [active, setActive] = useState<AppointmentDoc | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeDoctorAppointments(doctor.id, setAppts);
    return () => unsub();
  }, [doctor.id, user]);

  // Tick every 30s so the "joinable" windows open/close without a refresh.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const { upcoming, past } = useMemo(() => {
    const live = appts.filter((a) => a.status !== 'cancelled' && a.endTime > now);
    const done = appts.filter((a) => !(a.status !== 'cancelled' && a.endTime > now));
    return { upcoming: live, past: done.reverse() };
  }, [appts, now]);

  const Table = ({ rows, emptyText }: { rows: AppointmentDoc[]; emptyText: string }) => (
    <div className="card" style={{ padding: 0, marginBottom: 26 }}>
      {rows.length === 0 ? (
        <div style={{ padding: 22, color: 'var(--ink-3)' }}>{emptyText}</div>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 150 }}>When</th>
              <th>Patient</th>
              <th>Contact</th>
              <th>Reason</th>
              <th style={{ width: 110 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => setActive(a)}>
                <td>
                  <div style={{ fontSize: 13 }}>{fmtDate(a.startTime, doctor.timezone)}</div>
                  <div className="mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                    {fmtTime(a.startTime, doctor.timezone)}
                  </div>
                </td>
                <td>
                  <div className="row" style={{ gap: 10 }}>
                    <Avatar name={a.patientName || 'Patient'} size="sm" />
                    <div>
                      <div style={{ fontWeight: 500 }}>{a.patientName || `#${a.patientId.slice(0, 6)}`}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                        {a.patientAge ? `${a.patientAge} y` : ''}
                        {a.patientGender ? ` · ${a.patientGender}` : ''}
                      </div>
                    </div>
                  </div>
                </td>
                <td style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                  {a.patientPhone && <div className="mono">{a.patientPhone}</div>}
                  {a.patientEmail && (
                    <div style={{ color: 'var(--ink-3)', wordBreak: 'break-all' }}>{a.patientEmail}</div>
                  )}
                  {!a.patientPhone && !a.patientEmail && '—'}
                </td>
                <td style={{ color: 'var(--ink-2)' }}>{a.chiefComplaint}</td>
                <td style={{ textAlign: 'right', color: 'var(--ink-3)' }}>
                  <Icon name="chevronRight" size={16} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div data-screen-label="Consultations">
      <div className="admin-header">
        <div>
          <h1>Consultations</h1>
          <div className="sub">All walk-in appointments. Open one to view details or prescribe.</div>
        </div>
      </div>

      <h3 style={{ marginBottom: 12 }}>Upcoming &amp; live</h3>
      <Table rows={upcoming} emptyText="No upcoming consultations." />

      <h3 style={{ marginBottom: 12 }}>Past</h3>
      <Table rows={past} emptyText="No past consultations yet." />

      <SlideOver open={!!active} title="Appointment" onClose={() => setActive(null)}>
        {active && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="row" style={{ gap: 14 }}>
              <Avatar name={active.patientName || 'Patient'} size="lg" />
              <div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{active.patientName || 'Patient'}</div>
                <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>
                  {active.patientAge ? `${active.patientAge} y · ` : ''}
                  {active.patientGender || ''}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
              <Row k="When" v={`${fmtDateLong(active.startTime, doctor.timezone)}, ${fmtTime(active.startTime, doctor.timezone)}`} />
              <Row k="Type" v={<Chip>Walk-in</Chip>} />
              {active.patientPhone && <Row k="Phone" v={<span className="mono">{active.patientPhone}</span>} />}
              {active.patientEmail && <Row k="Email" v={active.patientEmail} />}
              <Row k="Status" v={<Chip variant={active.status === 'completed' ? 'ok' : 'default'} dot>{active.status}</Chip>} />
            </div>

            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Reason for visit</div>
              <div style={{ fontSize: 15 }}>{active.chiefComplaint}</div>
            </div>

            <div className="row" style={{ gap: 10, marginTop: 4 }}>
              <button
                className="btn btn-primary btn-full"
                onClick={() => router.push(`/${doctor.slug}/admin/appointments/${active.id}/prescribe`)}
              >
                <Icon name="pill" size={15} /> Write prescription
              </button>
              <button
                className="btn btn-secondary btn-full"
                onClick={() => router.push(`/${doctor.slug}/admin/appointments/${active.id}`)}
              >
                Open
              </button>
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
}

function Row({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="row" style={{ justifyContent: 'space-between' }}>
      <span style={{ color: 'var(--ink-3)' }}>{k}</span>
      <span style={{ textAlign: 'right' }}>{v}</span>
    </div>
  );
}
