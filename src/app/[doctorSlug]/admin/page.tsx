'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useDoctor } from '@/components/DoctorProvider';
import { Avatar } from '@/components/ui/Avatar';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { subscribeDoctorAppointmentsByDate } from '@/lib/firestore/appointments';
import { fmtTime } from '@/lib/format';
import type { AppointmentDoc } from '@/lib/types';

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function DoctorDashboard() {
  const doctor = useDoctor();
  const { user } = useAuth();
  const [appts, setAppts] = useState<AppointmentDoc[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeDoctorAppointmentsByDate(doctor.id, todayStr(), setAppts);
    return () => unsub();
  }, [doctor.id, user]);

  const now = Date.now();
  const live = appts.find((a) => a.startTime <= now && a.endTime > now && a.status !== 'cancelled');
  const upcoming = appts.filter((a) => a.startTime > now);
  const done = appts.filter((a) => a.status === 'completed' || a.endTime <= now);

  return (
    <div data-screen-label="Doctor Dashboard">
      <div className="admin-header">
        <div>
          <h1>
            Today,{' '}
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              timeZone: doctor.timezone,
            })}
          </h1>
          <div className="sub">
            {appts.length} consultations · {done.length} completed · {upcoming.length} remaining
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Link href={`/${doctor.slug}/admin/availability`} className="btn btn-secondary">
            <Icon name="calendar" size={16} /> Manage availability
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 22 }}>
        <div>
          {live && (
            <div
              className="card"
              style={{
                marginBottom: 22,
                borderColor: 'var(--warn)',
                background: 'var(--surface)',
                padding: 22,
              }}
            >
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
                <Chip variant="live" dot>
                  Live now
                </Chip>
                <span className="mono" style={{ color: 'var(--ink-3)', fontSize: 13 }}>
                  {live.id}
                </span>
              </div>
              <div className="row" style={{ gap: 14, marginBottom: 12 }}>
                <Avatar name={live.patientName || 'Patient'} size="lg" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>
                    {live.patientName || `Patient #${live.patientId.slice(0, 6)}`}
                  </div>
                  <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>
                    {live.patientAge ? `${live.patientAge} y · ` : ''}
                    {live.patientGender || ''} ·{' '}
                    <span className="mono">{fmtTime(live.startTime, doctor.timezone)}</span> ·{' '}
                    {live.type === 'video' ? 'Video' : 'Text'}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 6 }}>
                    {live.chiefComplaint}
                  </div>
                </div>
                <Link href={`/${doctor.slug}/admin/appointments/${live.id}`} className="btn btn-primary">
                  Open consultation
                </Link>
              </div>
            </div>
          )}

          <h3 style={{ marginBottom: 12 }}>Up next</h3>
          <div className="card" style={{ padding: 0, marginBottom: 26 }}>
            {upcoming.length === 0 ? (
              <div style={{ padding: 22, color: 'var(--ink-3)' }}>Nothing remaining today.</div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 90 }}>Time</th>
                    <th>Patient</th>
                    <th>Mode</th>
                    <th>Complaint</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map((a) => (
                    <tr
                      key={a.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => (window.location.href = `/${doctor.slug}/admin/appointments/${a.id}`)}
                    >
                      <td className="mono">{fmtTime(a.startTime, doctor.timezone)}</td>
                      <td>
                        <div className="row" style={{ gap: 10 }}>
                          <Avatar name={a.patientName || 'Patient'} size="sm" />
                          <div>
                            <div style={{ fontWeight: 500 }}>
                              {a.patientName || `#${a.patientId.slice(0, 6)}`}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                              {a.patientAge ? `${a.patientAge} y` : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <Chip>
                          <Icon name={a.type === 'video' ? 'video' : 'chat'} size={12} />{' '}
                          {a.type === 'video' ? 'Video' : 'Text'}
                        </Chip>
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

          <h3 style={{ marginBottom: 12 }}>Completed today</h3>
          <div className="card" style={{ padding: 0 }}>
            {done.length === 0 ? (
              <div style={{ padding: 22, color: 'var(--ink-3)' }}>None yet.</div>
            ) : (
              <table className="tbl">
                <tbody>
                  {done.map((a) => (
                    <tr key={a.id}>
                      <td className="mono" style={{ width: 90, color: 'var(--ink-3)' }}>
                        {fmtTime(a.startTime, doctor.timezone)}
                      </td>
                      <td style={{ color: 'var(--ink-2)' }}>{a.chiefComplaint}</td>
                      <td>
                        <Chip>
                          <Icon name={a.type === 'video' ? 'video' : 'chat'} size={12} />{' '}
                          {a.type === 'video' ? 'Video' : 'Text'}
                        </Chip>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Chip variant={a.status === 'completed' ? 'ok' : 'default'} dot>
                          {a.status}
                        </Chip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <aside>
          <div className="card" style={{ marginBottom: 16, padding: 18 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>
              This week
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['Consultations', String(appts.length)],
                ['Completed', String(done.length)],
                ['Remaining', String(upcoming.length)],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="row"
                  style={{ justifyContent: 'space-between', fontSize: 14 }}
                >
                  <span style={{ color: 'var(--ink-2)' }}>{k}</span>
                  <span className="mono" style={{ fontWeight: 500 }}>
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 18 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>
              Sync status
            </div>
            {[
              ['Firebase', 'live'],
              ['Razorpay', process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ? 'live' : 'not configured'],
              ['Google Meet', doctor.hasVideo ? 'configured' : 'not configured'],
            ].map(([k, v]) => (
              <div
                key={k}
                className="row"
                style={{ gap: 8, fontSize: 13, marginBottom: 8 }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: v === 'live' || v === 'configured' ? 'var(--ok)' : 'var(--ink-4)',
                  }}
                />
                <span style={{ flex: 1, color: 'var(--ink-2)' }}>{k}</span>
                <span className="mono" style={{ color: 'var(--ink-3)', fontSize: 12 }}>
                  {v}
                </span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
