'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { useDoctor } from '@/components/DoctorProvider';
import { PrescriptionBuilder } from '@/components/admin/PrescriptionBuilder';
import { Icon } from '@/components/ui/Icon';
import { firestore } from '@/lib/firebase/client';
import { fmtDate, fmtTime } from '@/lib/format';
import type { AppointmentDoc } from '@/lib/types';

export default function PrescribePage() {
  const doctor = useDoctor();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [appt, setAppt] = useState<AppointmentDoc | null>(null);

  useEffect(() => {
    if (!id) return;
    getDoc(doc(firestore(), 'appointments', id)).then((s) => {
      if (s.exists()) setAppt({ id: s.id, ...(s.data() as Omit<AppointmentDoc, 'id'>) });
    });
  }, [id]);

  if (!appt) return <div style={{ padding: 40, color: 'var(--ink-3)' }}>Loading…</div>;

  return (
    <div data-screen-label="Prescribe" style={{ maxWidth: 620 }}>
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => router.push(`/${doctor.slug}/admin/appointments/${appt.id}`)}
        style={{ marginBottom: 16 }}
      >
        <Icon name="chevronLeft" size={14} /> Back to consultation
      </button>

      <h1 style={{ marginBottom: 4 }}>Write a prescription</h1>
      <div className="sub" style={{ marginBottom: 20 }}>
        For {appt.patientName || 'patient'} · {fmtDate(appt.startTime, doctor.timezone)},{' '}
        {fmtTime(appt.startTime, doctor.timezone)}
      </div>

      <PrescriptionBuilder
        patientId={appt.patientId}
        patientName={appt.patientName || ''}
        appointmentId={appt.id}
        doctorId={doctor.id}
        doctorSlug={doctor.slug}
      />
    </div>
  );
}
