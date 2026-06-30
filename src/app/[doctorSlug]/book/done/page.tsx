'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { useDoctor } from '@/components/DoctorProvider';
import { Icon } from '@/components/ui/Icon';
import { firestore } from '@/lib/firebase/client';
import { fmtDateLong, fmtTime } from '@/lib/format';
import type { AppointmentDoc } from '@/lib/types';

export default function BookDonePage() {
  const doctor = useDoctor();
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get('id');
  const [appt, setAppt] = useState<AppointmentDoc | null>(null);

  useEffect(() => {
    if (!id) {
      router.replace(`/${doctor.slug}/dashboard`);
      return;
    }
    getDoc(doc(firestore(), 'appointments', id))
      .then((s) => {
        if (s.exists()) setAppt({ id: s.id, ...(s.data() as Omit<AppointmentDoc, 'id'>) });
      })
      .catch(() => {});
  }, [id, doctor.slug, router]);

  return (
    <div
      className="patient-wrap"
      data-screen-label="Booking Confirmed"
      style={{ maxWidth: 560, textAlign: 'center', padding: '80px 40px' }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--primary-tint)',
          color: 'var(--primary)',
          display: 'grid',
          placeItems: 'center',
          margin: '0 auto 22px',
        }}
      >
        <Icon name="check" size={26} />
      </div>
      <h1 style={{ marginBottom: 10 }}>Your walk-in is booked.</h1>
      <p style={{ color: 'var(--ink-2)', marginBottom: 32 }}>
        We&apos;ve emailed a confirmation
        {appt?.patientEmail ? <> to <strong>{appt.patientEmail}</strong></> : ''} with a calendar
        invite. Please arrive a few minutes early.
      </p>

      <div className="card" style={{ textAlign: 'left', marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 14 }}>
          <div>
            <div style={{ color: 'var(--ink-3)', fontSize: 12, marginBottom: 4 }}>Booking ID</div>
            <div className="mono">{appt?.id ?? '—'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--ink-3)', fontSize: 12, marginBottom: 4 }}>Doctor</div>
            <div>{doctor.name}</div>
          </div>
          <div>
            <div style={{ color: 'var(--ink-3)', fontSize: 12, marginBottom: 4 }}>Date</div>
            <div>{appt ? fmtDateLong(appt.startTime, doctor.timezone) : '—'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--ink-3)', fontSize: 12, marginBottom: 4 }}>Time</div>
            <div className="mono">
              {appt ? `${fmtTime(appt.startTime, doctor.timezone)} ${doctor.timezone}` : '—'}
            </div>
          </div>
        </div>
        {doctor.clinic?.address && (
          <>
            <hr className="divider" />
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 6 }}>Clinic</div>
            <div style={{ fontSize: 14 }}>{doctor.clinic.address}</div>
          </>
        )}
      </div>

      <div className="row" style={{ justifyContent: 'center', gap: 10 }}>
        <Link href={`/${doctor.slug}/dashboard`} className="btn btn-primary">
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
