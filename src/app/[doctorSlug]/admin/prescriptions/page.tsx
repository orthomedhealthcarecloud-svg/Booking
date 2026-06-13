'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { useDoctor } from '@/components/DoctorProvider';
import { Icon } from '@/components/ui/Icon';
import { firestore } from '@/lib/firebase/client';
import { fmtDateLong } from '@/lib/format';
import type { MedicineDoc, PrescriptionDoc } from '@/lib/types';

export default function PrescriptionsListPage() {
  const doctor = useDoctor();
  const [rows, setRows] = useState<PrescriptionDoc[]>([]);
  const [meds, setMeds] = useState<MedicineDoc[]>([]);
  const [form, setForm] = useState({ name: '', strength: '', form: 'Tablet', defaultDosage: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubRx = onSnapshot(
      query(collection(firestore(), 'prescriptions'), where('doctorId', '==', doctor.id)),
      (snap) => {
        const r: PrescriptionDoc[] = [];
        snap.forEach((d) => r.push({ id: d.id, ...(d.data() as Omit<PrescriptionDoc, 'id'>) }));
        setRows(r.sort((a, b) => (b.issuedAt as number) - (a.issuedAt as number)));
      },
    );
    const unsubMeds = onSnapshot(
      query(collection(firestore(), 'medicines'), where('doctorId', '==', doctor.id)),
      (snap) => {
        const m: MedicineDoc[] = [];
        snap.forEach((d) => m.push({ id: d.id, ...(d.data() as Omit<MedicineDoc, 'id'>) }));
        setMeds(m.sort((a, b) => a.name.localeCompare(b.name)));
      },
    );
    return () => {
      unsubRx();
      unsubMeds();
    };
  }, [doctor.id]);

  const addMedicine = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await addDoc(collection(firestore(), 'medicines'), {
        doctorId: doctor.id,
        name: form.name.trim(),
        strength: form.strength.trim(),
        form: form.form,
        defaultDosage: form.defaultDosage.trim(),
        createdAt: serverTimestamp(),
      });
      setForm({ name: '', strength: '', form: 'Tablet', defaultDosage: '' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-screen-label="Prescriptions">
      <div className="admin-header">
        <div>
          <h1>Prescriptions</h1>
          <div className="sub">
            Manage your medicine catalog, then prescribe from a patient&apos;s page.
          </div>
        </div>
      </div>

      {/* ---------- Medicine catalog ---------- */}
      <div className="card" style={{ padding: 22, marginBottom: 22 }}>
        <h3 style={{ fontSize: 15, marginBottom: 6 }}>Medicine catalog</h3>
        <p style={{ color: 'var(--ink-3)', fontSize: 13, margin: 0, marginBottom: 16 }}>
          Add the medicines you commonly prescribe. They&apos;ll be selectable when writing a
          prescription (you can also type any medicine that isn&apos;t listed).
        </p>

        <div
          style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1.5fr auto', gap: 10, alignItems: 'end' }}
        >
          <div className="field">
            <label>Medicine name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Paracetamol"
            />
          </div>
          <div className="field">
            <label>Strength / size</label>
            <input
              className="input"
              value={form.strength}
              onChange={(e) => setForm({ ...form, strength: e.target.value })}
              placeholder="500 mg"
            />
          </div>
          <div className="field">
            <label>Form</label>
            <select
              className="select"
              value={form.form}
              onChange={(e) => setForm({ ...form, form: e.target.value })}
            >
              <option>Tablet</option>
              <option>Capsule</option>
              <option>Syrup</option>
              <option>Injection</option>
              <option>Ointment</option>
              <option>Drops</option>
              <option>Other</option>
            </select>
          </div>
          <div className="field">
            <label>Default dosage</label>
            <input
              className="input"
              value={form.defaultDosage}
              onChange={(e) => setForm({ ...form, defaultDosage: e.target.value })}
              placeholder="1-0-1 after food"
            />
          </div>
          <button className="btn btn-primary" onClick={addMedicine} disabled={saving || !form.name.trim()}>
            {saving ? 'Adding…' : 'Add'}
          </button>
        </div>

        {meds.length > 0 && (
          <table className="tbl" style={{ marginTop: 16 }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Strength</th>
                <th>Form</th>
                <th>Default dosage</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {meds.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 500 }}>{m.name}</td>
                  <td className="mono">{m.strength || '—'}</td>
                  <td>{m.form || '—'}</td>
                  <td style={{ color: 'var(--ink-2)' }}>{m.defaultDosage || '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => void deleteDoc(doc(firestore(), 'medicines', m.id))}
                    >
                      <Icon name="x" size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ---------- Issued prescriptions ---------- */}
      <h3 style={{ marginBottom: 12 }}>Issued prescriptions</h3>
      <div className="card" style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div style={{ padding: 22, color: 'var(--ink-3)' }}>
            None yet. Open a patient and click “Prescribe”.
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Issued</th>
                <th>Patient</th>
                <th>Diagnosis</th>
                <th>Medications</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="mono" style={{ fontSize: 13 }}>
                    {fmtDateLong(p.issuedAt as unknown as number, doctor.timezone)}
                  </td>
                  <td>{p.patientName || '—'}</td>
                  <td>{p.diagnosis || '—'}</td>
                  <td style={{ color: 'var(--ink-2)' }}>{p.medications.length} meds</td>
                  <td style={{ textAlign: 'right' }}>
                    <Link href={`/${doctor.slug}/admin/prescriptions/${p.id}`} className="btn btn-ghost btn-sm">
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
