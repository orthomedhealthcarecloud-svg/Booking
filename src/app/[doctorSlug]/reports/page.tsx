'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '@/components/AuthProvider';
import { useDoctor } from '@/components/DoctorProvider';
import { PatientTopbar } from '@/components/patient/PatientTopbar';
import { Icon } from '@/components/ui/Icon';
import { firestore } from '@/lib/firebase/client';
import { fmtDateLong } from '@/lib/format';
import { printPrescription } from '@/lib/prescriptionPrint';
import type { DocumentDoc, PrescriptionDoc } from '@/lib/types';

export default function ReportsPage() {
  const doctor = useDoctor();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [rxs, setRxs] = useState<PrescriptionDoc[]>([]);
  const [docs, setDocs] = useState<DocumentDoc[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace(`/${doctor.slug}/login`);
  }, [loading, user, router, doctor.slug]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const rSnap = await getDocs(
        query(collection(firestore(), 'prescriptions'), where('patientId', '==', user.uid)),
      );
      const r: PrescriptionDoc[] = [];
      rSnap.forEach((d) => r.push({ id: d.id, ...(d.data() as Omit<PrescriptionDoc, 'id'>) }));
      setRxs(r.sort((a, b) => (b.issuedAt as number) - (a.issuedAt as number)));

      const dSnap = await getDocs(
        query(collection(firestore(), 'documents'), where('patientId', '==', user.uid)),
      );
      const d: DocumentDoc[] = [];
      dSnap.forEach((x) => d.push({ id: x.id, ...(x.data() as Omit<DocumentDoc, 'id'>) }));
      setDocs(d.sort((x, y) => (y.uploadedAt as number) - (x.uploadedAt as number)));
    })().catch(() => {});
  }, [user]);

  const images = docs.filter((d) => d.fileType === 'image');
  const otherDocs = docs.filter((d) => d.fileType !== 'image');

  return (
    <div className="app">
      <PatientTopbar />
      <div className="patient-wrap" data-screen-label="Reports" style={{ maxWidth: 820 }}>
        <h1 style={{ marginBottom: 6 }}>Reports &amp; prescriptions</h1>
        <p style={{ color: 'var(--ink-2)', marginBottom: 24 }}>
          Your prescriptions and the documents you&apos;ve uploaded.
        </p>

        <h3 style={{ marginBottom: 12 }}>Prescriptions</h3>
        <div className="card" style={{ padding: 0, marginBottom: 28 }}>
          {rxs.length === 0 ? (
            <div style={{ padding: 20, color: 'var(--ink-3)' }}>No prescriptions yet.</div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Diagnosis</th>
                  <th>Medicines</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rxs.map((rx) => (
                  <tr key={rx.id}>
                    <td className="mono" style={{ fontSize: 13 }}>
                      {fmtDateLong((rx.issuedAt as number) || Date.now(), doctor.timezone)}
                    </td>
                    <td>{rx.diagnosis || '—'}</td>
                    <td style={{ color: 'var(--ink-2)' }}>{rx.medications.length}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => printPrescription(rx, doctor)}>
                        <Icon name="file" size={13} /> PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <h3 style={{ marginBottom: 12 }}>My uploaded documents</h3>
        <div className="card" style={{ padding: 18 }}>
          {docs.length === 0 ? (
            <div style={{ color: 'var(--ink-3)' }}>
              You haven&apos;t uploaded any reports. You can attach them while booking.
            </div>
          ) : (
            <>
              {images.length > 0 && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                    gap: 10,
                    marginBottom: otherDocs.length ? 16 : 0,
                  }}
                >
                  {images.map((img) => (
                    <a key={img.id} href={img.fileUrl} target="_blank" rel="noreferrer" title={img.fileName}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.fileUrl}
                        alt={img.fileName}
                        style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--line)' }}
                      />
                    </a>
                  ))}
                </div>
              )}
              {otherDocs.map((d) => (
                <a
                  key={d.id}
                  href={d.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="row"
                  style={{ gap: 8, padding: '8px 10px', color: 'var(--primary)', textDecoration: 'none' }}
                >
                  <Icon name="file" size={16} /> {d.fileName}
                </a>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
