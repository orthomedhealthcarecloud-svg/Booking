'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useDoctor } from '@/components/DoctorProvider';
import { PatientTopbar } from '@/components/patient/PatientTopbar';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { subscribePatientAppointments } from '@/lib/firestore/appointments';
import { fmtDate, fmtDateLong, fmtMoney, fmtTime } from '@/lib/format';
import type { AppointmentDoc } from '@/lib/types';

export default function PatientDashboard() {
  const doctor = useDoctor();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [appts, setAppts] = useState<AppointmentDoc[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace(`/${doctor.slug}/login`);
  }, [loading, user, router, doctor.slug]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribePatientAppointments(user.uid, doctor.id, setAppts);
    return () => unsub();
  }, [user, doctor.id]);

  const now = Date.now();
  const upcoming = appts
    .filter((a) => a.endTime >= now && a.status !== 'cancelled')
    .sort((a, b) => a.startTime - b.startTime);
  const past = appts.filter((a) => a.endTime < now || a.status === 'completed');

  return (
    <div className="app">
      <PatientTopbar />
      <div className="patient-wrap" data-screen-label="Patient Dashboard">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: 28,
          }}
        >
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>
              Welcome
            </div>
            <h1>{user?.displayName || 'Patient'}</h1>
          </div>
          <Link href={`/${doctor.slug}/book/type`} className="btn btn-primary">
            <Icon name="plus" size={16} /> New consultation
          </Link>
        </div>

        <h3 style={{ marginBottom: 12 }}>Upcoming</h3>
        {upcoming.length === 0 ? (
          <div className="card" style={{ marginBottom: 32, textAlign: 'center' }}>
            <p style={{ color: 'var(--ink-3)', margin: 0 }}>No upcoming consultations.</p>
            <Link href={`/${doctor.slug}/book/type`} className="btn btn-primary" style={{ marginTop: 14 }}>
              Book your first
            </Link>
          </div>
        ) : (
          upcoming.map((a) => (
            <div key={a.id} className="card" style={{ padding: 0, marginBottom: 14 }}>
              <div
                style={{
                  padding: 22,
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  alignItems: 'center',
                  gap: 20,
                }}
              >
                <div>
                  <div className="row" style={{ gap: 10, marginBottom: 10 }}>
                    {a.startTime - now < 15 * 60 * 1000 && a.startTime - now > -a.endTime + now ? (
                      <Chip variant="live" dot>
                        Starts soon
                      </Chip>
                    ) : (
                      <Chip>{fmtDate(a.startTime, doctor.timezone)}</Chip>
                    )}
                    <Chip>
                      <Icon name={a.type === 'video' ? 'video' : 'chat'} size={12} />{' '}
                      {a.type === 'video' ? 'Video' : 'Text'}
                    </Chip>
                  </div>
                  <div style={{ fontSize: 19, fontWeight: 600, marginBottom: 4 }}>{doctor.name}</div>
                  <div style={{ color: 'var(--ink-2)', fontSize: 14 }}>
                    <span className="mono">
                      {fmtDate(a.startTime, doctor.timezone)}, {fmtTime(a.startTime, doctor.timezone)}
                    </span>{' '}
                    · 30 minutes · {a.chiefComplaint}
                  </div>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  {(() => {
                    // Joinable from 5 min before start until the appointment ends.
                    const LEAD_MS = 5 * 60 * 1000;
                    const joinable = now >= a.startTime - LEAD_MS && now < a.endTime;
                    if (!joinable) {
                      return (
                        <button className="btn btn-secondary" disabled>
                          {now >= a.endTime ? 'Ended' : `Opens ${fmtTime(a.startTime, doctor.timezone)}`}
                        </button>
                      );
                    }
                    if (a.type === 'video') {
                      return a.meetUrl ? (
                        <a href={a.meetUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
                          Join Google Meet
                        </a>
                      ) : (
                        <button
                          className="btn btn-secondary"
                          disabled
                          title="Meet link not generated — the doctor's Google Calendar needs reconnecting with calendar access"
                        >
                          Meet link unavailable
                        </button>
                      );
                    }
                    return (
                      <Link href={`/${doctor.slug}/chat/${a.id}`} className="btn btn-primary">
                        Join consultation
                      </Link>
                    );
                  })()}
                </div>
              </div>
            </div>
          ))
        )}

        <h3 style={{ marginTop: 28, marginBottom: 12 }}>Past consultations</h3>
        <div className="card" style={{ padding: 0 }}>
          {past.length === 0 ? (
            <div style={{ padding: 22, color: 'var(--ink-3)' }}>No past consultations yet.</div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Mode</th>
                  <th>Complaint</th>
                  <th>Amount</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {past.map((a) => (
                  <tr key={a.id}>
                    <td className="mono" style={{ fontSize: 13 }}>
                      {fmtDateLong(a.startTime, doctor.timezone)}
                    </td>
                    <td>
                      <Chip>
                        <Icon name={a.type === 'video' ? 'video' : 'chat'} size={12} />{' '}
                        {a.type === 'video' ? 'Video' : 'Text'}
                      </Chip>
                    </td>
                    <td>{a.chiefComplaint}</td>
                    <td className="mono">{a.amountPaid ? fmtMoney(a.amountPaid) : '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-ghost btn-sm">View →</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
