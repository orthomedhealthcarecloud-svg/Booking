'use client';

import { useAuth } from '@/components/AuthProvider';
import { useDoctor } from '@/components/DoctorProvider';
import { GoogleCalendarCard } from '@/components/admin/GoogleCalendarCard';
import { Avatar } from '@/components/ui/Avatar';

export default function AccountPage() {
  const doctor = useDoctor();
  const { user } = useAuth();

  return (
    <div data-screen-label="Account">
      <div className="admin-header">
        <div>
          <h1>Account</h1>
          <div className="sub">Profile, clinic details, and integrations</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 22 }}>
        <div className="col">
          <div className="card">
            <h3 style={{ fontSize: 15, marginBottom: 16 }}>Profile</h3>
            <div className="row" style={{ gap: 16, marginBottom: 22 }}>
              <Avatar name={doctor.name} size="lg" />
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{doctor.name}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{user?.email}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <label>Full name</label>
                <input className="input" defaultValue={doctor.name} readOnly />
              </div>
              <div className="field">
                <label>Specialty</label>
                <input className="input" defaultValue={doctor.specialty} readOnly />
              </div>
              <div className="field">
                <label>Qualifications</label>
                <input className="input" defaultValue={doctor.qualifications} readOnly />
              </div>
              <div className="field">
                <label>Registration no.</label>
                <input className="input mono" defaultValue={doctor.registration} readOnly />
              </div>
              <div className="field">
                <label>Years of experience</label>
                <input
                  className="input mono"
                  defaultValue={String(doctor.experienceYears)}
                  readOnly
                />
              </div>
              <div className="field">
                <label>Languages</label>
                <input className="input" defaultValue={doctor.languages} readOnly />
              </div>
            </div>
            <p style={{ color: 'var(--ink-3)', fontSize: 12, marginTop: 16 }}>
              Profile fields are set via <span className="mono">.env.local</span>{' '}
              (DOCTOR_{doctor.slug.toUpperCase()}_*).
            </p>
          </div>

          <div className="card">
            <h3 style={{ fontSize: 15, marginBottom: 16 }}>Clinic & contact</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <label>Clinic name</label>
                <input className="input" defaultValue={doctor.clinic.name} readOnly />
              </div>
              <div className="field">
                <label>Phone</label>
                <input className="input mono" defaultValue={doctor.clinic.phone} readOnly />
              </div>
              <div className="field" style={{ gridColumn: 'span 2' }}>
                <label>Address</label>
                <input className="input" defaultValue={doctor.clinic.address} readOnly />
              </div>
              <div className="field">
                <label>Time zone</label>
                <input className="input" defaultValue={doctor.timezone} readOnly />
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: 15, marginBottom: 16 }}>Consultation fees</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <label>Video consultation (₹)</label>
                <input className="input mono" defaultValue={String(doctor.fee.video)} readOnly />
              </div>
              <div className="field">
                <label>Text consultation (₹)</label>
                <input className="input mono" defaultValue={String(doctor.fee.text)} readOnly />
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
              ['Google Meet', doctor.hasVideo ? 'Static link configured' : 'No link set', doctor.hasVideo],
              ['Razorpay', process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ? 'Key configured' : 'Not configured', !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID],
              ['Firebase', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'Connected' : 'Not configured', !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID],
            ].map(([n, sub, ok], i) => (
              <div
                key={String(n)}
                style={{ padding: '12px 0', borderTop: i === 0 ? 0 : '1px solid var(--line)' }}
              >
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
