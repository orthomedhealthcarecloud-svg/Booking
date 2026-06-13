'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useDoctor } from '@/components/DoctorProvider';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { ConsultAlertProvider } from '@/components/admin/ConsultAlert';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const doctor = useDoctor();
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const onLogin = pathname?.endsWith('/admin/login');

  useEffect(() => {
    if (loading) return;
    if (onLogin) {
      setAllowed(true);
      return;
    }
    if (!user?.email) {
      router.replace(`/${doctor.slug}/admin/login`);
      return;
    }
    user
      .getIdTokenResult(true)
      .then((tok) => {
        const claimDoctorId = tok.claims.doctorId as string | undefined;
        if (claimDoctorId === doctor.id || tok.claims.admin === true) {
          setAllowed(true);
        } else {
          setAllowed(false);
        }
      })
      .catch(() => setAllowed(false));
  }, [loading, user, doctor.id, doctor.slug, onLogin, router]);

  if (onLogin) return <>{children}</>;
  if (allowed === null) return <div style={{ padding: 40, color: 'var(--ink-3)' }}>Loading…</div>;
  if (allowed === false) {
    return (
      <div className="patient-wrap" style={{ maxWidth: 480, padding: '80px 40px', textAlign: 'center' }}>
        <h1 style={{ marginBottom: 12 }}>Not authorized</h1>
        <p style={{ color: 'var(--ink-2)' }}>
          This admin email isn&apos;t linked to {doctor.name}. Run{' '}
          <span className="mono">npm run seed</span> after the Firebase Auth user exists, then sign in again.
        </p>
      </div>
    );
  }

  return (
    <ConsultAlertProvider>
      <div className="admin">
        <AdminSidebar />
        <main className="admin-main">{children}</main>
      </div>
    </ConsultAlertProvider>
  );
}
