'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useDoctor } from '@/components/DoctorProvider';
import { GoogleCalendarCard } from '@/components/admin/GoogleCalendarCard';
import { Avatar } from '@/components/ui/Avatar';

export default function AccountPage() {
  const doctor = useDoctor();
  const { user } = useAuth();

  const [f, setF] = useState({
    name: doctor.name,
    specialty: doctor.specialty,
    qualifications: doctor.qualifications,
    registration: doctor.registration,
    experienceYears: String(doctor.experienceYears),
    languages: doctor.languages,
    clinicName: doctor.clinic.name,
    clinicPhone: doctor.clinic.phone,
    clinicAddress: doctor.clinic.address,
    timezone: doctor.timezone,
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  // Keep the form in sync if the live config updates (e.g. first Firestore snapshot).
  useEffect(() => {
    setF({
      name: doctor.name,
      specialty: doctor.specialty,
      qualifications: doctor.qualifications,
      registration: doctor.registration,
      experienceYears: String(doctor.experienceYears),
      languages: doctor.languages,
      clinicName: doctor.clinic.name,
      clinicPhone: doctor.clinic.phone,
      clinicAddress: doctor.clinic.address,
      timezone: doctor.timezone,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctor.id]);

  const set = (k: keyof typeof f, v: string) => setF((prev) => ({ ...prev, [k]: v }));

  const save = async () => {
    if (!user) return;
    setSaving(true);
    setStatus('Saving…');
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/doctor/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          doctorId: doctor.id,
          name: f.name,
          specialty: f.specialty,
          qualifications: f.qualifications,
          registration: f.registration,
          experienceYears: Number(f.experienceYears) || 0,
          languages: f.languages,
          timezone: f.timezone,
          clinic: { name: f.clinicName, address: f.clinicAddress, phone: f.clinicPhone },
        }),
      });
      setStatus(res.ok ? 'Saved.' : 'Save failed.');
    } catch {
      setStatus('Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-screen-label="Account">
      <div className="admin-header">
        <div>
          <h1>Account</h1>
          <div className="sub">Profile, clinic details, and integrations</div>
        </div>
        <div className="row" style={{ gap: 10 }}>
          {status && <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{status}</span>}
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 22 }}>
        <div className="col">
          <div className="card">
            <h3 style={{ fontSize: 15, marginBottom: 16 }}>Profile</h3>
            <div className="row" style={{ gap: 16, marginBottom: 22 }}>
              <Avatar name={f.name} size="lg" />
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{f.name}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{user?.email}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <label>Full name</label>
                <input className="input" value={f.name} onChange={(e) => set('name', e.target.value)} />
              </div>
              <div className="field">
                <label>Specialty</label>
                <input className="input" value={f.specialty} onChange={(e) => set('specialty', e.target.value)} />
              </div>
              <div className="field">
                <label>Qualifications</label>
                <input className="input" value={f.qualifications} onChange={(e) => set('qualifications', e.target.value)} />
              </div>
              <div className="field">
                <label>Registration no.</label>
                <input className="input mono" value={f.registration} onChange={(e) => set('registration', e.target.value)} />
              </div>
              <div className="field">
                <label>Years of experience</label>
                <input className="input mono" value={f.experienceYears} onChange={(e) => set('experienceYears', e.target.value)} />
              </div>
              <div className="field">
                <label>Languages</label>
                <input className="input" value={f.languages} onChange={(e) => set('languages', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: 15, marginBottom: 16 }}>Clinic &amp; contact</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <label>Clinic name</label>
                <input className="input" value={f.clinicName} onChange={(e) => set('clinicName', e.target.value)} />
              </div>
              <div className="field">
                <label>Phone</label>
                <input className="input mono" value={f.clinicPhone} onChange={(e) => set('clinicPhone', e.target.value)} />
              </div>
              <div className="field" style={{ gridColumn: 'span 2' }}>
                <label>Address</label>
                <input className="input" value={f.clinicAddress} onChange={(e) => set('clinicAddress', e.target.value)} />
              </div>
              <div className="field">
                <label>Time zone</label>
                <input className="input" value={f.timezone} onChange={(e) => set('timezone', e.target.value)} />
              </div>
            </div>
          </div>

        </div>

        <aside className="col">
          <GoogleCalendarCard />
          <div className="card">
            <div className="eyebrow" style={{ marginBottom: 14 }}>
              Integrations
            </div>
            {[
              ['Walk-in booking', 'Free, no payment', true],
              ['Firebase', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'Connected' : 'Not configured', !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID],
            ].map(([n, sub, ok], i) => (
              <div key={String(n)} style={{ padding: '12px 0', borderTop: i === 0 ? 0 : '1px solid var(--line)' }}>
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{n}</span>
                  <span className={`chip ${ok ? 'chip-ok' : ''}`}>
                    <span className="dot" />
                    {ok ? 'Active' : 'Off'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{sub}</div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
