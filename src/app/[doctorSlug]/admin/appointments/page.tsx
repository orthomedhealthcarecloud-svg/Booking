'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useDoctor } from '@/components/DoctorProvider';
import { Avatar } from '@/components/ui/Avatar';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { subscribeDoctorAppointments } from '@/lib/firestore/appointments';
import { fmtDate, fmtTime } from '@/lib/format';
import type { AppointmentDoc } from '@/lib/types';

const LEAD_MS = 5 * 60 * 1000;

export default function AdminConsultations() {
  const doctor = useDoctor();
  const { user } = useAuth();
  const [appts, setAppts] = useState<AppointmentDoc[]>([]);
  const [now, setNow] = useState(() => Date.now());

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

  const JoinCell = ({ a }: { a: AppointmentDoc }) => {
    const joinable = now >= a.startTime - LEAD_MS && now < a.endTime;
    if (a.endTime <= now) return <span style={{ color: 'var(--ink-3)', fontSize: 13 }}>Ended</span>;
    if (!joinable) {
      return (
        <button className="btn btn-secondary btn-sm" disabled>
          Opens {fmtTime(a.startTime, doctor.timezone)}
        </button>
      );
    }
    if (a.type === 'video') {
      return a.meetUrl ? (
        <a href={a.meetUrl} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
          <Icon name="video" size={14} /> Join Meet
        </a>
      ) : (
        <button className="btn btn-secondary btn-sm" disabled title="Meet link not generated">
          No link
        </button>
      );
    }
    return (
      <Link href={`/${doctor.slug}/admin/appointments/${a.id}`} className="btn btn-primary btn-sm">
        <Icon name="chat" size={14} /> Open chat
      </Link>
    );
  };

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
              <th>Mode</th>
              <th>Contact</th>
              <th>Complaint</th>
              <th style={{ width: 140 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td>
                  <div style={{ fontSize: 13 }}>{fmtDate(a.startTime, doctor.timezone)}</div>
                  <div className="mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                    {fmtTime(a.startTime, doctor.timezone)}
                  </div>
                </td>
                <td>
                  <Link
                    href={`/${doctor.slug}/admin/appointments/${a.id}`}
                    className="row"
                    style={{ gap: 10, color: 'inherit', textDecoration: 'none' }}
                  >
                    <Avatar name={a.patientName || 'Patient'} size="sm" />
                    <div>
                      <div style={{ fontWeight: 500 }}>{a.patientName || `#${a.patientId.slice(0, 6)}`}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                        {a.patientAge ? `${a.patientAge} y` : ''}
                        {a.patientGender ? ` · ${a.patientGender}` : ''}
                      </div>
                    </div>
                  </Link>
                </td>
                <td>
                  <Chip>
                    <Icon name={a.type === 'video' ? 'video' : 'chat'} size={12} />{' '}
                    {a.type === 'video' ? 'Video' : 'Text'}
                  </Chip>
                </td>
                <td style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                  {a.patientPhone && <div className="mono">{a.patientPhone}</div>}
                  {a.patientEmail && (
                    <div style={{ color: 'var(--ink-3)', wordBreak: 'break-all' }}>{a.patientEmail}</div>
                  )}
                  {!a.patientPhone && !a.patientEmail && '—'}
                </td>
                <td style={{ color: 'var(--ink-2)' }}>{a.chiefComplaint}</td>
                <td style={{ textAlign: 'right' }}>
                  <JoinCell a={a} />
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
          <div className="sub">
            All bookings in one place. Join video calls directly — the button opens 5 minutes before
            each slot.
          </div>
        </div>
      </div>

      <h3 style={{ marginBottom: 12 }}>Upcoming &amp; live</h3>
      <Table rows={upcoming} emptyText="No upcoming consultations." />

      <h3 style={{ marginBottom: 12 }}>Past</h3>
      <Table rows={past} emptyText="No past consultations yet." />
    </div>
  );
}
