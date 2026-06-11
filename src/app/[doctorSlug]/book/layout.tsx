'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useDoctor } from '@/components/DoctorProvider';
import { PatientTopbar } from '@/components/patient/PatientTopbar';

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const doctor = useDoctor();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace(`/${doctor.slug}/login`);
  }, [loading, user, router, doctor.slug]);

  return (
    <div className="app">
      <PatientTopbar />
      {children}
    </div>
  );
}
