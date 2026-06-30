'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useDoctor } from '@/components/DoctorProvider';
import { Avatar } from '@/components/ui/Avatar';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { firestore } from '@/lib/firebase/client';
import { fmtDate, fmtTime } from '@/lib/format';
import type { AppointmentDoc, DocumentDoc } from '@/lib/types';

function DocGrid({ docs }: { docs: DocumentDoc[] }) {
  const images = docs.filter((d) => d.fileType === 'image');
  const others = docs.filter((d) => d.fileType !== 'image');
  return (
    <div>
      {images.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
            gap: 8,
            marginBottom: others.length ? 10 : 0,
          }}
        >
          {images.map((img) => (
            <a key={img.id} href={img.fileUrl} target="_blank" rel="noreferrer" title={img.fileName}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.fileUrl}
                alt={img.fileName}
                style={{ width: '100%', height: 96, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--line)' }}
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
          style={{ gap: 8, padding: '6px 0', color: 'var(--primary)', textDecoration: 'none', fontSize: 13 }}
        >
          <Icon name="file" size={15} /> {d.fileName}
        </a>
      ))}
    </div>
  );
}

export default function PatientDetail() {
  const doctor = useDoctor();
  const router = useRouter();
  const { patientId } = useParams<{ patientId: string }>();

  const [appts, setAppts] = useState<AppointmentDoc[]>([]);
  const [docs, setDocs] = useState<DocumentDoc[]>([]);

  useEffect(() => {
    if (!patientId) return;
    (async () => {
      const aSnap = await getDocs(
        query(
          collection(firestore(), 'appointments'),
          where('patientId', '==', patientId),
          where('doctorId', '==', doctor.id),
        ),
      );
      const a: AppointmentDoc[] = [];
      aSnap.forEach((d) => a.push({ id: d.id, ...(d.data() as Omit<AppointmentDoc, 'id'>) }));
      setAppts(a.sort((x, y) => y.startTime - x.startTime));

      const dSnap = await getDocs(
        query(collection(firestore(), 'documents'), where('patientId', '==', patientId)),
      );
      const d: DocumentDoc[] = [];
      dSnap.forEach((x) => d.push({ id: x.id, ...(x.data() as Omit<DocumentDoc, 'id'>) }));
      setDocs(d);
    })().catch(() => {});
  }, [patientId, doctor.id]);

  const patient = useMemo(() => {
    const latest = appts[0];
    return {
      name: latest?.patientName || `#${(patientId || '').slice(0, 8)}`,
      email: latest?.patientEmail || '',
      phone: latest?.patientPhone || '',
      age: latest?.patientAge,
      gender: latest?.patientGender,
    };
  }, [appts, patientId]);

  const docsByAppt = useMemo(() => {
    const m = new Map<string, DocumentDoc[]>();
    for (const d of docs) {
      if (!d.appointmentId) continue;
      const arr = m.get(d.appointmentId) || [];
      arr.push(d);
      m.set(d.appointmentId, arr);
    }
    return m;
  }, [docs]);

  const unlinked = docs.filter((d) => !d.appointmentId);

  return (
    <div data-screen-label="Patient Detail">
      <div className="row" style={{ marginBottom: 16 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/${doctor.slug}/admin/patients`)}>
          <Icon name="chevronLeft" size={14} /> All patients
        </button>
      </div>

      {/* Header */}
      <div className="card" style={{ padding: 22, marginBottom: 22 }}>
        <div className="row" style={{ gap: 16 }}>
          <Avatar name={patient.name} size="lg" />
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 22, marginBottom: 4 }}>{patient.name}</h1>
            <div style={{ color: 'var(--ink-3)', fontSize: 14 }}>
              {patient.age ? `${patient.age} y · ` : ''}
              {patient.gender || ''}
              {patient.phone ? ` · ${patient.phone}` : ''}
              {patient.email ? ` · ${patient.email}` : ''}
            </div>
            <div style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 4 }}>
              {appts.length} consultation{appts.length === 1 ? '' : 's'}
            </div>
          </div>
        </div>
      </div>

      <h3 style={{ marginBottom: 12 }}>Consultations &amp; reports</h3>
      {appts.length === 0 ? (
        <div className="card" style={{ padding: 20, color: 'var(--ink-3)', marginBottom: 22 }}>
          No bookings.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 22 }}>
          {appts.map((a) => {
            const sessionDocs = docsByAppt.get(a.id) || [];
            return (
              <div key={a.id} className="card" style={{ padding: 18 }}>
                <div className="row" style={{ justifyContent: 'space-between', gap: 14 }}>
                  <div className="row" style={{ gap: 14 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>
                        {fmtDate(a.startTime, doctor.timezone)}
                      </div>
                      <div className="mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                        {fmtTime(a.startTime, doctor.timezone)}
                      </div>
                    </div>
                    <Chip>Walk-in</Chip>
                    <span style={{ color: 'var(--ink-2)', fontSize: 14 }}>{a.chiefComplaint}</span>
                  </div>
                  <Link href={`/${doctor.slug}/admin/appointments/${a.id}`} className="btn btn-ghost btn-sm">
                    Open <Icon name="chevronRight" size={13} />
                  </Link>
                </div>
                {sessionDocs.length > 0 && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
                    <div className="eyebrow" style={{ marginBottom: 10 }}>
                      Reports for this session
                    </div>
                    <DocGrid docs={sessionDocs} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {unlinked.length > 0 && (
        <>
          <h3 style={{ marginBottom: 12 }}>Other uploads</h3>
          <div className="card" style={{ padding: 18, marginBottom: 22 }}>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 10 }}>
              Files not tied to a specific session.
            </div>
            <DocGrid docs={unlinked} />
          </div>
        </>
      )}
    </div>
  );
}
