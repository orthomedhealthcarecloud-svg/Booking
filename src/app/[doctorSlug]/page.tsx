'use client';

import Link from 'next/link';
import { useDoctor } from '@/components/DoctorProvider';

export default function PatientLanding() {
  const doctor = useDoctor();
  const loginHref = `/${doctor.slug}/login`;
  const shortName = doctor.name.split(' ').slice(0, 2).join(' ');

  return (
    <div
      data-screen-label="Patient Landing"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        minHeight: 'calc(100vh - 4px)',
      }}
    >
      {/* Left — doctor photo */}
      <div style={{ position: 'relative', background: 'var(--surface-2)', overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/home.jpg"
          alt={doctor.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>

      {/* Right — introduction */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '64px clamp(40px, 6vw, 88px)',
        }}
      >
        <div className="eyebrow" style={{ marginBottom: 18 }}>
          Online consultation
        </div>
        <h1 style={{ fontSize: 'clamp(48px, 6vw, 72px)', lineHeight: 1, fontWeight: 700, marginBottom: 6 }}>
          Hello,
        </h1>
        <div style={{ fontSize: 'clamp(26px, 3vw, 36px)', fontWeight: 500, marginBottom: 16 }}>
          I&apos;m {doctor.name}
        </div>
        <div style={{ fontSize: 16, color: 'var(--ink-2)', marginBottom: 24 }}>
          {doctor.qualifications}
        </div>

        <p
          style={{
            borderLeft: '3px solid var(--ink)',
            paddingLeft: 20,
            fontSize: 16,
            color: 'var(--ink-2)',
            lineHeight: 1.65,
            marginBottom: 34,
            maxWidth: 520,
          }}
        >
          Consult {shortName} for advice, follow-ups, and digital prescriptions. Share your reports,
          get a personalised treatment plan, and review your records — all online, without leaving
          home.
        </p>

        <div className="row" style={{ gap: 12 }}>
          <Link href={loginHref} className="btn btn-primary btn-lg">
            Book consultation →
          </Link>
          <Link href={loginHref} className="btn btn-ghost btn-lg">
            I have an appointment
          </Link>
        </div>
      </div>
    </div>
  );
}
