'use client';

import Link from 'next/link';
import { useDoctor } from '@/components/DoctorProvider';
import { Avatar } from '@/components/ui/Avatar';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { fmtMoney } from '@/lib/format';

export default function PatientLanding() {
  const doctor = useDoctor();
  const loginHref = `/${doctor.slug}/login`;

  return (
    <div className="patient-wrap" data-screen-label="Patient Landing">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 380px',
          gap: 64,
          alignItems: 'center',
          minHeight: 'calc(100vh - 200px)',
        }}
      >
        <div>
          <div className="eyebrow" style={{ marginBottom: 18 }}>
            Online consultation
          </div>
          <h1
            style={{
              fontSize: 48,
              lineHeight: 1.1,
              letterSpacing: '-0.025em',
              marginBottom: 22,
              maxWidth: 560,
            }}
          >
            {doctor.specialty.includes('Ortho')
              ? 'Bone and joint care, without leaving home.'
              : 'Expert care, without leaving home.'}
          </h1>
          <p
            style={{
              fontSize: 17,
              color: 'var(--ink-2)',
              maxWidth: 480,
              marginBottom: 32,
              lineHeight: 1.55,
            }}
          >
            Consult {doctor.name.split(' ').slice(0, 2).join(' ')} for advice, follow-ups, and digital
            prescriptions. Share reports, get a treatment plan, and review your records — all online.
          </p>
          <div className="row" style={{ gap: 10 }}>
            <Link href={loginHref} className="btn btn-primary btn-lg">
              Book consultation
            </Link>
            <Link href={loginHref} className="btn btn-ghost btn-lg">
              I have an appointment →
            </Link>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 32,
              marginTop: 56,
              color: 'var(--ink-2)',
              fontSize: 13,
            }}
          >
            <div className="row" style={{ gap: 8 }}>
              <Icon name="shield" size={16} /> Encrypted records
            </div>
            <div className="row" style={{ gap: 8 }}>
              <Icon name="lock" size={16} /> OTP login, no password
            </div>
            <div className="row" style={{ gap: 8 }}>
              <Icon name="inr" size={16} /> Pay only after booking
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <div className="row" style={{ gap: 14, marginBottom: 18 }}>
            <Avatar name={doctor.name} size="lg" />
            <div>
              <div style={{ fontWeight: 600, fontSize: 17 }}>{doctor.name}</div>
              <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>{doctor.qualifications}</div>
            </div>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 14,
              fontSize: 13,
              padding: '14px 0',
              borderTop: '1px solid var(--line)',
              borderBottom: '1px solid var(--line)',
            }}
          >
            <div>
              <div style={{ color: 'var(--ink-3)', marginBottom: 2 }}>Experience</div>
              <div>{doctor.experienceYears} years</div>
            </div>
            <div>
              <div style={{ color: 'var(--ink-3)', marginBottom: 2 }}>Languages</div>
              <div>{doctor.languages}</div>
            </div>
            <div>
              <div style={{ color: 'var(--ink-3)', marginBottom: 2 }}>Reg. no.</div>
              <div className="mono" style={{ fontSize: 12 }}>
                {doctor.registration || '—'}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--ink-3)', marginBottom: 2 }}>Mode</div>
              <div>{doctor.hasVideo ? 'Video, Text' : 'Text'}</div>
            </div>
          </div>
          <div
            style={{
              marginTop: 16,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
            }}
          >
            <div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Consultation from</div>
              <div className="mono" style={{ fontSize: 22, fontWeight: 500, marginTop: 2 }}>
                {fmtMoney(doctor.fee.text)}
              </div>
            </div>
            <Chip variant="ok" dot>
              Available today
            </Chip>
          </div>
        </div>
      </div>
    </div>
  );
}
