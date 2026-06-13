'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { useDoctor } from '@/components/DoctorProvider';
import { Avatar } from '@/components/ui/Avatar';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { firestore } from '@/lib/firebase/client';
import { fmtDate, fmtTime } from '@/lib/format';
import type { AppointmentDoc, DocumentDoc, MedicineDoc } from '@/lib/types';

type MedRow = { name: string; strength: string; instructions: string };
const EMPTY_ROW: MedRow = { name: '', strength: '', instructions: '' };

export default function PatientDetail() {
  const doctor = useDoctor();
  const router = useRouter();
  const { patientId } = useParams<{ patientId: string }>();

  const [appts, setAppts] = useState<AppointmentDoc[]>([]);
  const [docs, setDocs] = useState<DocumentDoc[]>([]);
  const [catalog, setCatalog] = useState<MedicineDoc[]>([]);

  // prescription builder
  const [diagnosis, setDiagnosis] = useState('');
  const [rows, setRows] = useState<MedRow[]>([{ ...EMPTY_ROW }]);
  const [advice, setAdvice] = useState('');
  const [saving, setSaving] = useState(false);

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

      const mSnap = await getDocs(
        query(collection(firestore(), 'medicines'), where('doctorId', '==', doctor.id)),
      );
      const m: MedicineDoc[] = [];
      mSnap.forEach((x) => m.push({ id: x.id, ...(x.data() as Omit<MedicineDoc, 'id'>) }));
      setCatalog(m.sort((x, y) => x.name.localeCompare(y.name)));
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

  const setRow = (i: number, patch: Partial<MedRow>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const onNameChange = (i: number, name: string) => {
    const match = catalog.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (match) {
      setRow(i, { name, strength: match.strength || '', instructions: match.defaultDosage || '' });
    } else {
      setRow(i, { name });
    }
  };

  const savePrescription = async () => {
    const meds = rows
      .filter((r) => r.name.trim())
      .map((r) => ({ name: r.name.trim(), strength: r.strength.trim(), instructions: r.instructions.trim() }));
    if (meds.length === 0 && !diagnosis.trim()) return;
    setSaving(true);
    try {
      const ref = await addDoc(collection(firestore(), 'prescriptions'), {
        patientId,
        patientName: patient.name,
        doctorId: doctor.id,
        appointmentId: appts[0]?.id || '',
        diagnosis: diagnosis.trim(),
        medications: meds,
        advice: advice.trim(),
        issuedAt: Date.now(),
      });
      router.push(`/${doctor.slug}/admin/prescriptions/${ref.id}`);
    } finally {
      setSaving(false);
    }
  };

  const images = docs.filter((d) => d.fileType === 'image');
  const otherDocs = docs.filter((d) => d.fileType !== 'image');

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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, alignItems: 'start' }}>
        {/* Left: history + documents */}
        <div>
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
                          {a.type === 'text' ? (
                            <Link href={`/${doctor.slug}/chat/${a.id}`} className="btn btn-ghost btn-sm">
                              <Icon name="chat" size={13} /> Chat
                            </Link>
                          ) : joinable && a.meetUrl ? (
                            <a href={a.meetUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                              <Icon name="video" size={13} /> Join
                            </a>
                          ) : (
                            <span style={{ color: 'var(--ink-4)', fontSize: 12 }}>
                              {a.status}
                            </span>
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
                          style={{
                            width: '100%',
                            height: 110,
                            objectFit: 'cover',
                            borderRadius: 8,
                            border: '1px solid var(--line)',
                          }}
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

        {/* Right: prescription builder */}
        <div>
          <h3 style={{ marginBottom: 12 }}>Write a prescription</h3>
          <div className="card" style={{ padding: 18 }}>
            <div className="field" style={{ marginBottom: 14 }}>
              <label>Diagnosis</label>
              <input
                className="input"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="e.g. Mechanical low back pain"
              />
            </div>

            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8 }}>
              Medicines
            </label>
            <datalist id="med-catalog">
              {catalog.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
              {rows.map((r, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 1.4fr auto', gap: 6 }}>
                  <input
                    className="input"
                    list="med-catalog"
                    value={r.name}
                    onChange={(e) => onNameChange(i, e.target.value)}
                    placeholder="Medicine"
                  />
                  <input
                    className="input mono"
                    value={r.strength}
                    onChange={(e) => setRow(i, { strength: e.target.value })}
                    placeholder="500mg"
                  />
                  <input
                    className="input"
                    value={r.instructions}
                    onChange={(e) => setRow(i, { instructions: e.target.value })}
                    placeholder="1-0-1 after food, 5 days"
                  />
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : rs))}
                  >
                    <Icon name="x" size={13} />
                  </button>
                </div>
              ))}
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setRows((rs) => [...rs, { ...EMPTY_ROW }])}>
              + Add medicine
            </button>

            <div className="field" style={{ marginTop: 14, marginBottom: 16 }}>
              <label>Advice / notes</label>
              <textarea
                className="textarea"
                value={advice}
                onChange={(e) => setAdvice(e.target.value)}
                placeholder="Rest, hydration, follow-up in 2 weeks…"
              />
            </div>

            <button className="btn btn-primary btn-full" onClick={savePrescription} disabled={saving}>
              {saving ? 'Saving…' : 'Save & open prescription'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
