'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { collection, doc, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { useDoctor } from '@/components/DoctorProvider';
import { Avatar } from '@/components/ui/Avatar';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { Row } from '@/components/ui/Row';
import { firestore } from '@/lib/firebase/client';
import { fmtDateLong, fmtTime } from '@/lib/format';
import type { AppointmentDoc, DocumentDoc } from '@/lib/types';

export default function AdminAppointmentDetail() {
  const doctor = useDoctor();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [appt, setAppt] = useState<AppointmentDoc | null>(null);
  const [docs, setDocs] = useState<DocumentDoc[]>([]);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(firestore(), 'appointments', id), (s) => {
      if (s.exists()) setAppt({ id: s.id, ...(s.data() as Omit<AppointmentDoc, 'id'>) });
    });
    return () => unsub();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    getDocs(query(collection(firestore(), 'documents'), where('appointmentId', '==', id)))
      .then((snap) => {
        const d: DocumentDoc[] = [];
        snap.forEach((x) => d.push({ id: x.id, ...(x.data() as Omit<DocumentDoc, 'id'>) }));
        setDocs(d);
      })
      .catch(() => {});
  }, [id]);

  if (!appt) return <div style={{ padding: 40, color: 'var(--ink-3)' }}>Loading…</div>;
  const images = docs.filter((d) => d.fileType === 'image');
  const others = docs.filter((d) => d.fileType !== 'image');

  return (
    <div data-screen-label="Consultation" style={{ maxWidth: 880 }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/${doctor.slug}/admin/appointments`)}>
          <Icon name="chevronLeft" size={14} /> Consultations
        </button>
        <div className="row" style={{ gap: 8 }}>
          <Link href={`/${doctor.slug}/admin/appointments/${appt.id}/prescribe`} className="btn btn-primary btn-sm">
            <Icon name="pill" size={14} /> Write prescription
          </Link>
          <Link href={`/${doctor.slug}/admin/patients/${appt.patientId}`} className="btn btn-secondary btn-sm">
            Patient file <Icon name="chevronRight" size={14} />
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 22, alignItems: 'start' }}>
        <div>
          <div className="card" style={{ padding: 22, marginBottom: 18 }}>
            <div className="row" style={{ gap: 16 }}>
              <Avatar name={appt.patientName || 'Patient'} size="lg" />
              <div style={{ flex: 1 }}>
                <div className="row" style={{ gap: 10 }}>
                  <h2 style={{ fontSize: 20 }}>{appt.patientName || `Patient #${appt.patientId.slice(0, 6)}`}</h2>
                  <Chip>Walk-in</Chip>
                </div>
                <div style={{ color: 'var(--ink-3)', fontSize: 14, marginTop: 2 }}>
                  {appt.patientAge ? `${appt.patientAge} y · ` : ''}
                  {appt.patientGender || ''}
                  {appt.patientPhone ? ` · ${appt.patientPhone}` : ''}
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 18 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Reason for visit</div>
            <div style={{ fontSize: 16, marginBottom: appt.notesForDoctor ? 18 : 0 }}>{appt.chiefComplaint}</div>
            {appt.notesForDoctor && (
              <>
                <div className="eyebrow" style={{ marginBottom: 10 }}>Patient notes</div>
                <div style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.55 }}>{appt.notesForDoctor}</div>
              </>
            )}
          </div>

          {docs.length > 0 && (
            <div className="card">
              <div className="eyebrow" style={{ marginBottom: 12 }}>Reports for this visit</div>
              {images.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10, marginBottom: others.length ? 14 : 0 }}>
                  {images.map((img) => (
                    <a key={img.id} href={img.fileUrl} target="_blank" rel="noreferrer" title={img.fileName}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.fileUrl} alt={img.fileName} style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--line)' }} />
                    </a>
                  ))}
                </div>
              )}
              {others.map((d) => (
                <a key={d.id} href={d.fileUrl} target="_blank" rel="noreferrer" className="row" style={{ gap: 8, padding: '6px 0', color: 'var(--primary)', textDecoration: 'none', fontSize: 14 }}>
                  <Icon name="file" size={15} /> {d.fileName}
                </a>
              ))}
            </div>
          )}
        </div>

        <aside className="card">
          <div className="eyebrow" style={{ marginBottom: 14 }}>Appointment</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
            <Row k="Date" v={fmtDateLong(appt.startTime, doctor.timezone)} />
            <Row k="Time" v={<span className="mono">{fmtTime(appt.startTime, doctor.timezone)}</span>} />
            <Row k="Type" v={<Chip>Walk-in</Chip>} />
            <Row
              k="Status"
              v={<Chip variant={appt.status === 'completed' ? 'ok' : 'default'} dot>{appt.status}</Chip>}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
