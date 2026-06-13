'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { collection, doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore';
import { useAuth } from '@/components/AuthProvider';
import { useDoctor } from '@/components/DoctorProvider';
import { PatientTopbar } from '@/components/patient/PatientTopbar';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { firestore } from '@/lib/firebase/client';
import { fmtDateLong, fmtTime, fmtMoney } from '@/lib/format';
import { printPrescription } from '@/lib/prescriptionPrint';
import type { AppointmentDoc, ChatMessageDoc, DocumentDoc, PrescriptionDoc } from '@/lib/types';

export default function PatientConsultDetail() {
  const doctor = useDoctor();
  const router = useRouter();
  const { user, loading } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [appt, setAppt] = useState<AppointmentDoc | null>(null);
  const [messages, setMessages] = useState<ChatMessageDoc[]>([]);
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

      try {
        const mSnap = await getDocs(
          query(collection(firestore(), 'chat_sessions', id, 'messages'), orderBy('createdAt', 'asc')),
        );
        const m: ChatMessageDoc[] = [];
        mSnap.forEach((d) => m.push({ id: d.id, ...(d.data() as Omit<ChatMessageDoc, 'id'>) }));
        setMessages(m);
      } catch {
        /* no chat for video */
      }

      const rSnap = await getDocs(
        query(collection(firestore(), 'prescriptions'), where('patientId', '==', user.uid)),
      );
      const r: PrescriptionDoc[] = [];
      rSnap.forEach((d) => r.push({ id: d.id, ...(d.data() as Omit<PrescriptionDoc, 'id'>) }));
      // Prescriptions linked to this appointment first; fall back to all of the patient's.
      const forThis = r.filter((p) => p.appointmentId === id);
      setRxs((forThis.length ? forThis : r).sort((a, b) => (b.issuedAt as number) - (a.issuedAt as number)));

      const dSnap = await getDocs(
        query(collection(firestore(), 'documents'), where('patientId', '==', user.uid)),
      );
      const d: DocumentDoc[] = [];
      dSnap.forEach((x) => d.push({ id: x.id, ...(x.data() as Omit<DocumentDoc, 'id'>) }));
      setDocs(d.sort((x, y) => (y.uploadedAt as number) - (x.uploadedAt as number)));
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

  return (
    <div className="app">
      <PatientTopbar />
      <div className="patient-wrap" data-screen-label="Consultation" style={{ maxWidth: 760 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/${doctor.slug}/dashboard`)} style={{ marginBottom: 16 }}>
          <Icon name="chevronLeft" size={14} /> My consultations
        </button>

        {/* Summary */}
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="row" style={{ gap: 10, marginBottom: 10 }}>
            <Chip>
              <Icon name={appt.type === 'video' ? 'video' : 'chat'} size={12} />{' '}
              {appt.type === 'video' ? 'Video' : 'Text'}
            </Chip>
            <Chip variant={appt.status === 'completed' ? 'ok' : 'default'} dot>
              {appt.status}
            </Chip>
          </div>
          <h1 style={{ fontSize: 22, marginBottom: 4 }}>{doctor.name}</h1>
          <div style={{ color: 'var(--ink-2)', fontSize: 14 }}>
            {fmtDateLong(appt.startTime, doctor.timezone)} · {fmtTime(appt.startTime, doctor.timezone)} ·{' '}
            {appt.chiefComplaint}
            {appt.amountPaid ? ` · ${fmtMoney(appt.amountPaid)}` : ''}
          </div>
          {appt.type === 'video' && appt.meetUrl && (
            <a href={appt.meetUrl} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm" style={{ marginTop: 14 }}>
              <Icon name="video" size={14} /> Open Google Meet
            </a>
          )}
        </div>

        {/* Prescription(s) */}
        <h3 style={{ marginBottom: 12 }}>Prescription</h3>
        <div className="card" style={{ padding: 0, marginBottom: 18 }}>
          {rxs.length === 0 ? (
            <div style={{ padding: 20, color: 'var(--ink-3)' }}>
              No prescription has been issued yet.
            </div>
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

        {/* Reports & images */}
        <h3 style={{ marginBottom: 12 }}>My reports &amp; images</h3>
        <div className="card" style={{ padding: 18, marginBottom: 18 }}>
          {docs.length === 0 ? (
            <div style={{ color: 'var(--ink-3)' }}>
              You haven&apos;t uploaded any reports. You can attach them while booking.
            </div>
          ) : (
            <>
              {docs.filter((d) => d.fileType === 'image').length > 0 && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                    gap: 10,
                    marginBottom: docs.some((d) => d.fileType !== 'image') ? 16 : 0,
                  }}
                >
                  {docs
                    .filter((d) => d.fileType === 'image')
                    .map((img) => (
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
              {docs
                .filter((d) => d.fileType !== 'image')
                .map((d) => (
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

        {/* Doctor messages */}
        {appt.type === 'text' && (
          <>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
              <h3>Messages</h3>
              <Link href={`/${doctor.slug}/chat/${appt.id}`} className="btn btn-ghost btn-sm">
                Open chat <Icon name="chevronRight" size={13} />
              </Link>
            </div>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {messages.length === 0 ? (
                <div style={{ color: 'var(--ink-3)' }}>No messages.</div>
              ) : (
                messages.map((m) => {
                  const mine = m.senderRole === 'patient';
                  return (
                    <div
                      key={m.id}
                      style={{
                        alignSelf: mine ? 'flex-end' : 'flex-start',
                        maxWidth: '75%',
                        background: mine ? 'var(--primary)' : 'var(--surface-2)',
                        color: mine ? '#fff' : 'var(--ink)',
                        border: mine ? 'none' : '1px solid var(--line)',
                        borderRadius: 12,
                        padding: '8px 12px',
                        fontSize: 14,
                      }}
                    >
                      {!mine && (
                        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 2 }}>
                          {doctor.name}
                        </div>
                      )}
                      {m.text}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
