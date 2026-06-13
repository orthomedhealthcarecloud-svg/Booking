'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { Icon } from '@/components/ui/Icon';
import { firestore } from '@/lib/firebase/client';
import type { MedicineDoc } from '@/lib/types';

type MedRow = { name: string; strength: string; instructions: string };
const EMPTY_ROW: MedRow = { name: '', strength: '', instructions: '' };

export function PrescriptionBuilder({
  patientId,
  patientName,
  appointmentId,
  doctorId,
  doctorSlug,
}: {
  patientId: string;
  patientName: string;
  appointmentId: string;
  doctorId: string;
  doctorSlug: string;
}) {
  const router = useRouter();
  const [catalog, setCatalog] = useState<MedicineDoc[]>([]);
  const [diagnosis, setDiagnosis] = useState('');
  const [rows, setRows] = useState<MedRow[]>([{ ...EMPTY_ROW }]);
  const [advice, setAdvice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDocs(query(collection(firestore(), 'medicines'), where('doctorId', '==', doctorId)))
      .then((snap) => {
        const m: MedicineDoc[] = [];
        snap.forEach((x) => m.push({ id: x.id, ...(x.data() as Omit<MedicineDoc, 'id'>) }));
        setCatalog(m.sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => {});
  }, [doctorId]);

  const setRow = (i: number, patch: Partial<MedRow>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const onNameChange = (i: number, name: string) => {
    const match = catalog.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (match) setRow(i, { name, strength: match.strength || '', instructions: match.defaultDosage || '' });
    else setRow(i, { name });
  };

  const save = async () => {
    const meds = rows
      .filter((r) => r.name.trim())
      .map((r) => ({ name: r.name.trim(), strength: r.strength.trim(), instructions: r.instructions.trim() }));
    if (meds.length === 0 && !diagnosis.trim()) return;
    setSaving(true);
    try {
      const ref = await addDoc(collection(firestore(), 'prescriptions'), {
        patientId,
        patientName,
        doctorId,
        appointmentId,
        diagnosis: diagnosis.trim(),
        medications: meds,
        advice: advice.trim(),
        issuedAt: Date.now(),
      });
      router.push(`/${doctorSlug}/admin/prescriptions/${ref.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
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

      <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8 }}>Medicines</label>
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

      <button className="btn btn-primary btn-full" onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Save & open prescription'}
      </button>
    </div>
  );
}
