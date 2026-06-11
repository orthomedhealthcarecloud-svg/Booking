'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { useDoctor } from '@/components/DoctorProvider';
import { firestore } from '@/lib/firebase/client';
import { fmtDateLong } from '@/lib/format';
import type { PrescriptionDoc } from '@/lib/types';

export default function PrescriptionsListPage() {
  const doctor = useDoctor();
  const [rows, setRows] = useState<PrescriptionDoc[]>([]);

  useEffect(() => {
    const q = query(
      collection(firestore(), 'prescriptions'),
      where('doctorId', '==', doctor.id),
      orderBy('issuedAt', 'desc'),
      limit(100),
    );
    const unsub = onSnapshot(q, (snap) => {
      const r: PrescriptionDoc[] = [];
      snap.forEach((d) => r.push({ id: d.id, ...(d.data() as Omit<PrescriptionDoc, 'id'>) }));
      setRows(r);
    });
    return () => unsub();
  }, [doctor.id]);

  return (
    <div data-screen-label="Prescriptions">
      <div className="admin-header">
        <div>
          <h1>Prescriptions</h1>
          <div className="sub">{rows.length} issued · auto-saved per appointment</div>
        </div>
      </div>
      <div className="card" style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div style={{ padding: 22, color: 'var(--ink-3)' }}>None yet.</div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Issued</th>
                <th>Diagnosis</th>
                <th>Medications</th>
                <th>Appointment</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="mono" style={{ fontSize: 13 }}>
                    {fmtDateLong(p.issuedAt as unknown as number, doctor.timezone)}
                  </td>
                  <td>{p.diagnosis || '—'}</td>
                  <td style={{ color: 'var(--ink-2)' }}>{p.medications.length} meds</td>
                  <td className="mono" style={{ fontSize: 12 }}>
                    {p.appointmentId}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Link
                      href={`/${doctor.slug}/admin/prescriptions/${p.appointmentId}`}
                      className="btn btn-ghost btn-sm"
                    >
                      Open →
                    </Link>
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
