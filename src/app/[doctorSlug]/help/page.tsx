'use client';

import { useDoctor } from '@/components/DoctorProvider';
import { PatientTopbar } from '@/components/patient/PatientTopbar';

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: 'How do I join my video consultation?',
    a: 'Open "My consultations". Five minutes before your slot, a "Join Google Meet" button becomes active on your appointment. You\'ll also get the Meet link by email.',
  },
  {
    q: 'How does a text consultation work?',
    a: 'At your booked time, open the consultation and use the web chat to message the doctor within the 30-minute window.',
  },
  {
    q: 'Where do I find my prescription?',
    a: 'Go to "Reports", or open a past consultation and click "Download PDF" to save your prescription.',
  },
  {
    q: 'Can I upload my reports or scans?',
    a: 'Yes — attach them on the details step while booking. The doctor sees them before your consultation, and you can review them anytime under "Reports".',
  },
  {
    q: 'How do I reschedule or cancel?',
    a: 'Please contact the clinic directly using the details below.',
  },
];

export default function HelpPage() {
  const doctor = useDoctor();
  return (
    <div className="app">
      <PatientTopbar />
      <div className="patient-wrap" data-screen-label="Help" style={{ maxWidth: 720 }}>
        <h1 style={{ marginBottom: 6 }}>Help &amp; support</h1>
        <p style={{ color: 'var(--ink-2)', marginBottom: 24 }}>
          Quick answers about booking and consulting with {doctor.name}.
        </p>

        <div className="card" style={{ marginBottom: 22 }}>
          {FAQS.map((f, i) => (
            <div
              key={i}
              style={{ padding: '14px 0', borderTop: i === 0 ? 0 : '1px solid var(--line)' }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{f.q}</div>
              <div style={{ color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.55 }}>{f.a}</div>
            </div>
          ))}
        </div>

        <h3 style={{ marginBottom: 12 }}>Contact the clinic</h3>
        <div className="card">
          {doctor.clinic.name && <div style={{ fontWeight: 600 }}>{doctor.clinic.name}</div>}
          {doctor.clinic.address && (
            <div style={{ color: 'var(--ink-2)', fontSize: 14, marginTop: 4 }}>{doctor.clinic.address}</div>
          )}
          {doctor.clinic.phone && (
            <div style={{ color: 'var(--ink-2)', fontSize: 14, marginTop: 4 }}>
              Phone: <span className="mono">{doctor.clinic.phone}</span>
            </div>
          )}
          {!doctor.clinic.name && !doctor.clinic.phone && (
            <div style={{ color: 'var(--ink-3)' }}>Clinic contact details coming soon.</div>
          )}
        </div>
      </div>
    </div>
  );
}
