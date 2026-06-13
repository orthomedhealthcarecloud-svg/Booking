'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addDoc, collection, deleteDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/components/AuthProvider';
import { useDoctor } from '@/components/DoctorProvider';
import { useBooking } from '@/components/BookingProvider';
import { Icon } from '@/components/ui/Icon';
import { Stepper } from '@/components/ui/Stepper';
import { firestore, storage } from '@/lib/firebase/client';

export default function BookDetailsPage() {
  const doctor = useDoctor();
  const router = useRouter();
  const { user } = useAuth();
  const { draft, patch } = useBooking();
  const [form, setForm] = useState(draft.form);
  const [files, setFiles] = useState(draft.files);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!draft.slot) router.replace(`/${doctor.slug}/book/slot`);
  }, [draft.slot, router, doctor.slug]);

  useEffect(() => {
    if (!form.name && user?.displayName) {
      setForm((f) => ({ ...f, name: user.displayName! }));
    }
  }, [user, form.name]);

  // Prefill the phone from the signed-in (OTP) number if we don't have one yet.
  useEffect(() => {
    if (!form.phone && user?.phoneNumber) {
      setForm((f) => ({ ...f, phone: user.phoneNumber! }));
    }
  }, [user, form.phone]);

  // Prefill from the patient's saved profile (from a previous booking) so they don't
  // re-enter their details every time. Only fills fields that are still empty.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getDoc(doc(firestore(), 'users', user.uid))
      .then((snap) => {
        if (cancelled || !snap.exists()) return;
        const p = snap.data() as {
          name?: string;
          email?: string;
          phone?: string;
          age?: number;
          gender?: 'Female' | 'Male' | 'Other';
        };
        setForm((f) => ({
          ...f,
          name: f.name || p.name || '',
          email: f.email || p.email || '',
          phone: f.phone || p.phone || '',
          age: f.age || (p.age ? String(p.age) : ''),
          gender: f.gender || p.gender || 'Female',
        }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  // If the patient logged in with a phone number, it's their verified number — lock the field.
  const lockedPhone = Boolean(user?.phoneNumber);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((form.email ?? '').trim());
  const phoneValid = (form.phone ?? '').replace(/\D/g, '').length >= 10;
  const canContinue = Boolean((form.complaint ?? '').trim()) && emailValid && phoneValid;

  const onContinue = () => {
    if (!canContinue || uploading) return;
    patch({ form, files });
    router.push(`/${doctor.slug}/book/pay`);
  };

  // Upload each selected file to Storage and record it under the patient's documents,
  // so the doctor can see it later in the patient's history.
  const onSelectFiles = async (fileList: FileList | null) => {
    if (!user || !fileList || fileList.length === 0) return;
    setUploading(true);
    try {
      const added: typeof files = [];
      for (const f of Array.from(fileList)) {
        const path = `uploads/${user.uid}/${Date.now()}_${f.name.replace(/[^\w.\-]/g, '_')}`;
        const storageRef = ref(storage(), path);
        await uploadBytes(storageRef, f, { contentType: f.type });
        const url = await getDownloadURL(storageRef);
        const docRef = await addDoc(collection(firestore(), 'documents'), {
          patientId: user.uid,
          appointmentId: null,
          fileType: f.type.startsWith('image/') ? 'image' : 'other',
          fileName: f.name,
          fileUrl: url,
          fileSize: f.size,
          uploadedAt: serverTimestamp(),
        });
        added.push({ name: f.name, size: `${Math.ceil(f.size / 1024)} KB`, url, docId: docRef.id });
      }
      setFiles((prev) => [...prev, ...added]);
    } catch {
      /* surfaced via the disabled state; keep it simple */
    } finally {
      setUploading(false);
    }
  };

  const removeFile = async (i: number) => {
    const f = files[i];
    setFiles(files.filter((_, j) => j !== i));
    if (f.docId) {
      try {
        await deleteDoc(doc(firestore(), 'documents', f.docId));
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <div className="patient-wrap" data-screen-label="Book — Details" style={{ maxWidth: 760 }}>
      <Stepper current={2} />
      <h1 style={{ marginBottom: 8 }}>Tell us about the visit</h1>
      <p style={{ color: 'var(--ink-2)', marginBottom: 28 }}>
        This goes directly to {doctor.name.split(' ').slice(0, 2).join(' ')} before your consultation.
      </p>

      <div className="card">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 100px 140px',
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div className="field">
            <label>Patient name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Age</label>
            <input
              className="input mono"
              value={form.age}
              onChange={(e) => setForm({ ...form, age: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Gender</label>
            <select
              className="select"
              value={form.gender}
              onChange={(e) =>
                setForm({ ...form, gender: e.target.value as typeof form.gender })
              }
            >
              <option>Female</option>
              <option>Male</option>
              <option>Other</option>
            </select>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div className="field">
            <label>
              Email <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
            />
            <div style={{ color: 'var(--ink-3)', fontSize: 12, marginTop: 4 }}>
              Your booking confirmation and Google Meet link are sent here.
            </div>
          </div>
          <div className="field">
            <label>
              Mobile number <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              className="input mono"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+91 98765 43210"
              readOnly={lockedPhone}
              style={lockedPhone ? { background: 'var(--surface-2)', color: 'var(--ink-2)' } : undefined}
            />
            <div style={{ color: 'var(--ink-3)', fontSize: 12, marginTop: 4 }}>
              {lockedPhone ? 'Verified at login.' : 'Used for appointment reminders.'}
            </div>
          </div>
        </div>

        <div className="field" style={{ marginBottom: 18 }}>
          <label>
            Chief complaint <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input
            className="input"
            value={form.complaint}
            onChange={(e) => setForm({ ...form, complaint: e.target.value })}
            placeholder="e.g. lower back pain for 2 weeks"
          />
        </div>

        <div className="field" style={{ marginBottom: 22 }}>
          <label>Anything else the doctor should know?</label>
          <textarea
            className="textarea"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Current medication, allergies, previous diagnoses…"
          />
        </div>

        <div className="field">
          <label>
            Reports & documents{' '}
            <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>· optional</span>
          </label>
          <label
            style={{
              border: '1px dashed var(--line-strong)',
              borderRadius: 10,
              padding: 18,
              textAlign: 'center',
              background: 'var(--surface-2)',
              cursor: 'pointer',
              display: 'block',
            }}
          >
            <Icon name="upload" size={20} />
            <div style={{ marginTop: 8, fontSize: 14 }}>
              Drag files here or <span style={{ color: 'var(--primary)' }}>browse</span>
            </div>
            <div style={{ color: 'var(--ink-3)', fontSize: 12, marginTop: 4 }}>
              PDF, JPG, PNG — up to 10 MB each
            </div>
            <input
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => void onSelectFiles(e.target.files)}
            />
          </label>
          {uploading && (
            <div style={{ color: 'var(--ink-3)', fontSize: 12, marginTop: 8 }}>Uploading…</div>
          )}
          {files.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {files.map((f, i) => (
                <div
                  key={i}
                  className="row"
                  style={{
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'var(--surface-2)',
                    borderRadius: 8,
                  }}
                >
                  <div className="row" style={{ gap: 8 }}>
                    <Icon name="file" size={16} />
                    <span style={{ fontSize: 14 }}>{f.name}</span>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                      {f.size}
                    </span>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => void removeFile(i)}>
                    <Icon name="x" size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="row" style={{ marginTop: 22, justifyContent: 'space-between' }}>
        <button className="btn btn-ghost" onClick={() => router.push(`/${doctor.slug}/book/slot`)}>
          ← Back
        </button>
        <button className="btn btn-primary" onClick={onContinue} disabled={!canContinue}>
          Continue to payment
        </button>
      </div>
    </div>
  );
}
