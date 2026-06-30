'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '@/components/AuthProvider';
import { useDoctor } from '@/components/DoctorProvider';
import { PatientTopbar } from '@/components/patient/PatientTopbar';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { firestore } from '@/lib/firebase/client';
import { fmtDateLong, fmtTime } from '@/lib/format';
import { printPrescription } from '@/lib/prescriptionPrint';
import type { AppointmentDoc, DocumentDoc, PrescriptionDoc } from '@/lib/types';

export default function PatientConsultDetail() {
  const doctor = useDoctor();
  const router = useRouter();
  const { user, loading } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [appt, setAppt] = useState<AppointmentDoc | null>(null);
  const [rxs, setRxs] = useState<PrescriptionDoc[]>([]);
  const [docs, setDocs] = useState<DocumentDoc[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace(`/${doctor.slug}/login`);
  }, [loading, user, router, doctor.slug]);

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      const aSnap = await getDoc(doc(firestore(), 'appointments', id));
      if (aSnap.exists()) setAppt({ id: aSnap.id, ...(aSnap.data() as Omit<AppointmentDoc, 'id'>) });

      const rSnap = await getDocs(
        query(collection(firestore(), 'prescriptions'), where('patientId', '==', user.uid)),
      );
      const r: PrescriptionDoc[] = [];
      rSnap.forEach((d) => r.push({ id: d.id, ...(d.data() as Omit<PrescriptionDoc, 'id'>) }));
      const forThis = r.filter((p) => p.appointmentId === id);
      setRxs((forThis.length ? forThis : r).sort((a, b) => (b.issuedAt as number) - (a.issuedAt as number)));

      const dSnap = await getDocs(
        query(collection(firestore(), 'documents'), where('patientId', '==', user.uid)),
      );
      const d: DocumentDoc[] = [];
      dSnap.forEach((x) => d.push({ id: x.id, ...(x.data() as Omit<DocumentDoc, 'id'>) }));
      setDocs(d.filter((x) => x.appointmentId === id));
    })().catch(() => {});
  }, [id, user]);

  if (!appt) {
    return (
      <div className="app">
        <PatientTopbar />
        <div style={{ padding: 40, color: 'var(--ink-3)' }}>Loading…</div>
      </div>
    );
  }

  const images = docs.filter((d) => d.fileType === 'image');
  const others = docs.filter((d) => d.fileType !== 'image');

  return (
    <div className="app">
      <PatientTopbar />
      <div className="patient-wrap" data-screen-label="Consultation" style={{ maxWidth: 720 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/${doctor.slug}/dashboard`)} style={{ marginBottom: 16 }}>
          <Icon name="chevronLeft" size={14} /> My consultations
        </button>

        {/* Summary */}
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="row" style={{ gap: 10, marginBottom: 10 }}>
            <Chip>Walk-in</Chip>
            <Chip variant={appt.status === 'completed' ? 'ok' : 'default'} dot>
              {appt.status}
            </Chip>
          </div>
          <h1 style={{ fontSize: 22, marginBottom: 4 }}>{doctor.name}</h1>
          <div style={{ color: 'var(--ink-2)', fontSize: 14 }}>
            {fmtDateLong(appt.startTime, doctor.timezone)} · {fmtTime(appt.startTime, doctor.timezone)} ·{' '}
            {appt.chiefComplaint}
          </div>
          {doctor.clinic?.address && (
            <div style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 10 }}>
              {doctor.clinic.address}
            </div>
          )}
        </div>

        {/* Prescription */}
        <h3 style={{ marginBottom: 12 }}>Prescription</h3>
        <div className="card" style={{ padding: 0, marginBottom: 18 }}>
          {rxs.length === 0 ? (
            <div style={{ padding: 20, color: 'var(--ink-3)' }}>No prescription has been issued yet.</div>
          ) : (
            rxs.map((rx) => (
              <div key={rx.id} style={{ padding: 18, borderBottom: '1px solid var(--line)' }}>
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    {rx.diagnosis && <div style={{ fontWeight: 500 }}>{rx.diagnosis}</div>}
                    <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                      {fmtDateLong((rx.issuedAt as number) || Date.now(), doctor.timezone)}
                    </div>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => printPrescription(rx, doctor)}>
                    <Icon name="file" size={14} /> Download PDF
                  </button>
                </div>
                <table className="tbl">
                  <tbody>
                    {rx.medications.map((m, i) => (
                      <tr key={i}>
                        <td style={{ width: 28, color: 'var(--ink-3)' }}>{i + 1}</td>
                        <td style={{ width: '45%' }}>
                          <strong>{m.name}</strong>{' '}
                          {m.strength && <span style={{ color: 'var(--ink-3)' }}>{m.strength}</span>}
                        </td>
                        <td style={{ color: 'var(--ink-2)' }}>{m.instructions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rx.advice && (
                  <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 10 }}>
                    <strong>Advice:</strong> {rx.advice}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Reports for this visit */}
        <h3 style={{ marginBottom: 12 }}>My reports &amp; images</h3>
        <div className="card" style={{ padding: 18 }}>
          {docs.length === 0 ? (
            <div style={{ color: 'var(--ink-3)' }}>
              No reports for this visit. You can attach them while booking.
            </div>
          ) : (
            <>
              {images.length > 0 && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                    gap: 10,
                    marginBottom: others.length ? 16 : 0,
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
              {others.map((d) => (
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
