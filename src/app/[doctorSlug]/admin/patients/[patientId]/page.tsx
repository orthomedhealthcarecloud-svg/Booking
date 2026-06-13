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
      setDocs(d.sort((x, y) => (y.uploadedAt as number) - (x.uploadedAt as number)));
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

  const images = docs.filter((d) => d.fileType === 'image');
  const otherDocs = docs.filter((d) => d.fileType !== 'image');

  return (
    <div data-screen-label="Patient Detail" style={{ maxWidth: 900 }}>
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

      <h3 style={{ marginBottom: 12 }}>Booking history</h3>
      <div className="card" style={{ padding: 0, marginBottom: 24 }}>
        {appts.length === 0 ? (
          <div style={{ padding: 20, color: 'var(--ink-3)' }}>No bookings.</div>
        ) : (
          <table className="tbl">
            <tbody>
              {appts.map((a) => {
                const joinable = Date.now() >= a.startTime - 5 * 60 * 1000 && Date.now() < a.endTime;
                return (
                  <tr key={a.id}>
                    <td>
                      <div style={{ fontSize: 13 }}>{fmtDate(a.startTime, doctor.timezone)}</div>
                      <div className="mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                        {fmtTime(a.startTime, doctor.timezone)}
                      </div>
                    </td>
                    <td>
                      <Chip>
                        <Icon name={a.type === 'video' ? 'video' : 'chat'} size={12} />{' '}
                        {a.type === 'video' ? 'Video' : 'Text'}
                      </Chip>
                    </td>
                    <td style={{ color: 'var(--ink-2)', fontSize: 13 }}>{a.chiefComplaint}</td>
                    <td style={{ textAlign: 'right' }}>
                      {a.type === 'video' && joinable && a.meetUrl ? (
                        <a href={a.meetUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                          <Icon name="video" size={13} /> Join
                        </a>
                      ) : (
                        <Link href={`/${doctor.slug}/admin/appointments/${a.id}`} className="btn btn-ghost btn-sm">
                          Open <Icon name="chevronRight" size={13} />
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <h3 style={{ marginBottom: 12 }}>Uploaded reports &amp; images</h3>
      <div className="card" style={{ padding: 18 }}>
        {docs.length === 0 ? (
          <div style={{ color: 'var(--ink-3)' }}>Nothing uploaded by this patient.</div>
        ) : (
          <>
            {images.length > 0 && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
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
                      style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--line)' }}
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
  );
}
