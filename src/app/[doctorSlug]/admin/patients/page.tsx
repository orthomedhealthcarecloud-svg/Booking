'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useDoctor } from '@/components/DoctorProvider';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { firestore } from '@/lib/firebase/client';
import { fmtDate } from '@/lib/format';
import type { AppointmentDoc } from '@/lib/types';

type Aggregated = {
  patientId: string;
  name: string;
  email: string;
  phone: string;
  visits: number;
  lastSeen: number;
  lastComplaint: string;
};

export default function PatientsPage() {
  const doctor = useDoctor();
  const [rows, setRows] = useState<Aggregated[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      // Single equality filter — no composite index needed (the prior orderBy(desc)
      // query had no index and silently failed, leaving the list empty).
      const q = query(collection(firestore(), 'appointments'), where('doctorId', '==', doctor.id));
      const snap = await getDocs(q);
      const all: AppointmentDoc[] = [];
      snap.forEach((d) => all.push({ id: d.id, ...(d.data() as Omit<AppointmentDoc, 'id'>) }));
      all.sort((a, b) => b.startTime - a.startTime); // most recent first

      const byPatient = new Map<string, Aggregated>();
      for (const a of all) {
        const cur = byPatient.get(a.patientId);
        if (cur) {
          cur.visits += 1;
        } else {
          byPatient.set(a.patientId, {
            patientId: a.patientId,
            name: a.patientName || '',
            email: a.patientEmail || '',
            phone: a.patientPhone || '',
            visits: 1,
            lastSeen: a.startTime,
            lastComplaint: a.chiefComplaint,
          });
        }
      }
      setRows(Array.from(byPatient.values()).sort((a, b) => b.lastSeen - a.lastSeen));
    };
    load().catch(() => {});
  }, [doctor.id]);

  const filtered = useMemo(
    () =>
      rows.filter((r) =>
        `${r.name} ${r.email} ${r.phone} ${r.patientId}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [rows, search],
  );

  return (
    <div data-screen-label="Patients">
      <div className="admin-header">
        <div>
          <h1>Patients</h1>
          <div className="sub">
            {rows.length} patients · {rows.reduce((s, r) => s + r.visits, 0)} consultations to date
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <input
              className="input"
              placeholder="Search name, email, phone…"
              style={{ paddingLeft: 38, width: 260 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--ink-3)',
                pointerEvents: 'none',
              }}
            >
              <Icon name="search" size={16} />
            </div>
          </div>
        </div>
      </div>
      <div className="card" style={{ padding: 0 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 22, color: 'var(--ink-3)' }}>No patients yet.</div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Contact</th>
                <th>Last complaint</th>
                <th>Visits</th>
                <th>Last seen</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.patientId}>
                  <td>
                    <div className="row" style={{ gap: 10 }}>
                      <Avatar name={r.name || r.patientId} size="sm" />
                      <div style={{ fontWeight: 500 }}>{r.name || `#${r.patientId.slice(0, 8)}`}</div>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                    {r.phone && <div className="mono">{r.phone}</div>}
                    {r.email && (
                      <div style={{ color: 'var(--ink-3)', wordBreak: 'break-all' }}>{r.email}</div>
                    )}
                    {!r.phone && !r.email && '—'}
                  </td>
                  <td style={{ color: 'var(--ink-2)' }}>{r.lastComplaint}</td>
                  <td className="mono">{r.visits}</td>
                  <td className="mono" style={{ color: 'var(--ink-2)', fontSize: 13 }}>
                    {fmtDate(r.lastSeen, doctor.timezone)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
