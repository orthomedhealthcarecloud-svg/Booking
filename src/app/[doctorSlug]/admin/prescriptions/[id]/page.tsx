'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useDoctor } from '@/components/DoctorProvider';
import { Icon } from '@/components/ui/Icon';
import { firestore } from '@/lib/firebase/client';
import { fmtDateLong } from '@/lib/format';
import type { AppointmentDoc, PrescriptionDoc } from '@/lib/types';

type Med = { name: string; dose: string; frequency: string; duration: string; notes?: string };

const DEFAULT_MEDS: Med[] = [{ name: '', dose: '', frequency: '', duration: '', notes: '' }];

export default function PrescriptionEditor() {
  const doctor = useDoctor();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [appt, setAppt] = useState<AppointmentDoc | null>(null);
  const [diagnosis, setDiagnosis] = useState('');
  const [meds, setMeds] = useState<Med[]>(DEFAULT_MEDS);
  const [advice, setAdvice] = useState('');
  const [followIn, setFollowIn] = useState('2 weeks');
  const [followMode, setFollowMode] = useState<'text' | 'video' | 'in-person'>('text');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    getDoc(doc(firestore(), 'appointments', id)).then((s) => {
      if (s.exists()) setAppt({ id: s.id, ...(s.data() as Omit<AppointmentDoc, 'id'>) });
    });
    getDoc(doc(firestore(), 'prescriptions', id)).then((s) => {
      if (s.exists()) {
        const p = s.data() as PrescriptionDoc;
        setDiagnosis(p.diagnosis ?? '');
        setMeds(p.medications?.length ? p.medications : DEFAULT_MEDS);
        setAdvice(p.advice ?? '');
        if (p.followUp) {
          setFollowIn(p.followUp.in);
          setFollowMode(p.followUp.mode);
        }
      }
    });
  }, [id]);

  const save = async () => {
    if (!appt) return;
    setSaving(true);
    try {
      const payload: Omit<PrescriptionDoc, 'id'> = {
        appointmentId: appt.id,
        patientId: appt.patientId,
        doctorId: appt.doctorId,
        diagnosis,
        medications: meds.filter((m) => m.name.trim()),
        advice,
        followUp: { in: followIn, mode: followMode },
        issuedAt: Date.now(),
      };
      await setDoc(doc(firestore(), 'prescriptions', appt.id), {
        ...payload,
        issuedAt: serverTimestamp(),
      });
    } finally {
      setSaving(false);
    }
  };

  if (!appt) return <div style={{ padding: 40 }}>Loading…</div>;

  return (
    <div data-screen-label="Prescription">
      <div className="row" style={{ marginBottom: 18, justifyContent: 'space-between' }}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => router.push(`/${doctor.slug}/admin/appointments/${appt.id}`)}
        >
          <Icon name="chevronLeft" size={14} /> Back to consultation
        </button>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-secondary">
            <Icon name="download" size={14} /> Preview PDF
          </button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Sign & save'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>
        <div>
          <div className="card" style={{ marginBottom: 18 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div>
                <div className="eyebrow" style={{ marginBottom: 4 }}>
                  Prescribing for
                </div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>
                  {appt.patientName || `Patient #${appt.patientId.slice(0, 6)}`}
                </div>
                <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>
                  {appt.patientAge ? `${appt.patientAge} y · ` : ''}
                  {appt.patientGender || ''} · Consultation {appt.id}
                </div>
              </div>
              <div style={{ textAlign: 'right', maxWidth: 320 }}>
                <div className="eyebrow" style={{ marginBottom: 4 }}>
                  Diagnosis
                </div>
                <input
                  className="input"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="e.g. L4–L5 disc bulge"
                />
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 18 }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontSize: 15 }}>Medications</h3>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() =>
                  setMeds([...meds, { name: '', dose: '', frequency: '', duration: '', notes: '' }])
                }
              >
                <Icon name="plus" size={14} /> Add medication
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {meds.map((m, i) => (
                <div key={i} className="card-flat" style={{ padding: 14 }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 1.4fr 1fr 36px',
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <input
                      className="input"
                      value={m.name}
                      onChange={(e) => {
                        const next = [...meds];
                        next[i] = { ...m, name: e.target.value };
                        setMeds(next);
                      }}
                      placeholder="Medication name"
                    />
                    <input
                      className="input"
                      value={m.dose}
                      onChange={(e) => {
                        const next = [...meds];
                        next[i] = { ...m, dose: e.target.value };
                        setMeds(next);
                      }}
                      placeholder="Dose"
                    />
                    <input
                      className="input"
                      value={m.frequency}
                      onChange={(e) => {
                        const next = [...meds];
                        next[i] = { ...m, frequency: e.target.value };
                        setMeds(next);
                      }}
                      placeholder="Frequency"
                    />
                    <input
                      className="input"
                      value={m.duration}
                      onChange={(e) => {
                        const next = [...meds];
                        next[i] = { ...m, duration: e.target.value };
                        setMeds(next);
                      }}
                      placeholder="Duration"
                    />
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ width: 36, padding: 0 }}
                      onClick={() => setMeds(meds.filter((_, j) => j !== i))}
                    >
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                  <input
                    className="input"
                    value={m.notes ?? ''}
                    onChange={(e) => {
                      const next = [...meds];
                      next[i] = { ...m, notes: e.target.value };
                      setMeds(next);
                    }}
                    placeholder="Notes for patient (optional)"
                    style={{ height: 38, fontSize: 13 }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: 15, marginBottom: 12 }}>General advice</h3>
            <textarea
              className="textarea"
              value={advice}
              onChange={(e) => setAdvice(e.target.value)}
              style={{ minHeight: 110 }}
            />
            <h3 style={{ fontSize: 15, marginTop: 22, marginBottom: 12 }}>Follow-up</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="field">
                <label>Recommended in</label>
                <select
                  className="select"
                  value={followIn}
                  onChange={(e) => setFollowIn(e.target.value)}
                >
                  <option>3 days</option>
                  <option>1 week</option>
                  <option>2 weeks</option>
                  <option>Only if needed</option>
                </select>
              </div>
              <div className="field">
                <label>Mode</label>
                <select
                  className="select"
                  value={followMode}
                  onChange={(e) => setFollowMode(e.target.value as typeof followMode)}
                >
                  <option value="text">Text consultation</option>
                  <option value="video">Video consultation</option>
                  <option value="in-person">In-person</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <aside>
          <div className="card" style={{ position: 'sticky', top: 20 }}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>
              Preview
            </div>
            <div
              style={{
                border: '1px solid var(--line)',
                borderRadius: 10,
                padding: 18,
                background: 'var(--surface-2)',
              }}
            >
              <div style={{ paddingBottom: 12, borderBottom: '1px solid var(--line)', marginBottom: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{doctor.name}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{doctor.qualifications}</div>
                {doctor.registration && (
                  <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                    Reg. {doctor.registration}
                  </div>
                )}
              </div>
              <div className="mono" style={{ fontSize: 22, fontWeight: 500, marginBottom: 6 }}>
                ℞
              </div>
              {meds.filter((m) => m.name).map((m, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 12,
                    marginBottom: 8,
                    paddingBottom: 8,
                    borderBottom: '1px solid var(--line)',
                  }}
                >
                  <div style={{ fontWeight: 500 }}>{m.name}</div>
                  <div className="mono" style={{ color: 'var(--ink-3)' }}>
                    {m.dose} · {m.frequency} · {m.duration}
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 16, fontSize: 11, color: 'var(--ink-3)', fontStyle: 'italic' }}>
                Digitally signed · {fmtDateLong(Date.now(), doctor.timezone)}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
