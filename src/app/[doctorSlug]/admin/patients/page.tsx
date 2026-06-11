'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { useDoctor } from '@/components/DoctorProvider';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { firestore } from '@/lib/firebase/client';
import { fmtDate } from '@/lib/format';
import type { AppointmentDoc } from '@/lib/types';

type Aggregated = {
  patientId: string;
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
      const q = query(
        collection(firestore(), 'appointments'),
        where('doctorId', '==', doctor.id),
        orderBy('startTime', 'desc'),
      );
      const snap = await getDocs(q);
      const byPatient = new Map<string, Aggregated>();
      snap.forEach((d) => {
        const a = d.data() as AppointmentDoc;
        const cur = byPatient.get(a.patientId);
        if (cur) {
          cur.visits += 1;
        } else {
          byPatient.set(a.patientId, {
            patientId: a.patientId,
            visits: 1,
            lastSeen: a.startTime,
            lastComplaint: a.chiefComplaint,
          });
        }
      });
      setRows(Array.from(byPatient.values()).sort((a, b) => b.lastSeen - a.lastSeen));
    };
    load().catch(() => {});
  }, [doctor.id]);

  const filtered = useMemo(
    () => rows.filter((r) => r.patientId.toLowerCase().includes(search.toLowerCase())),
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
              placeholder="Search by ID…"
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
                <th>Last complaint</th>
                <th>Visits</th>
                <th>Last seen</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.patientId}>
                  <td>
                    <div className="row" style={{ gap: 10 }}>
                      <Avatar name={r.patientId} size="sm" />
                      <div>
                        <div style={{ fontWeight: 500 }}>#{r.patientId.slice(0, 8)}</div>
                        <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                          {r.patientId}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--ink-2)' }}>{r.lastComplaint}</td>
                  <td className="mono">{r.visits}</td>
                  <td className="mono" style={{ color: 'var(--ink-2)', fontSize: 13 }}>
                    {fmtDate(r.lastSeen, doctor.timezone)}
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--ink-3)' }}>
                    <Icon name="chevronRight" size={16} />
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
