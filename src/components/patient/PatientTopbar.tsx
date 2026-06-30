'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useDoctor } from '@/components/DoctorProvider';
import { Avatar } from '@/components/ui/Avatar';
import { Brand } from '@/components/ui/Brand';
import { Icon } from '@/components/ui/Icon';

export function PatientTopbar() {
  const doctor = useDoctor();
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const base = `/${doctor.slug}`;
  const link = (sub: string) => `${base}${sub}`;
  const isActive = (sub: string) => pathname === link(sub) || pathname.startsWith(link(sub) + '/');

  const onLogout = async () => {
    setMenuOpen(false);
    await signOut();
    router.replace(`/${doctor.slug}`);
  };

  return (
    <div className="topbar">
      <Link href={link('/dashboard')} style={{ textDecoration: 'none' }}>
        <Brand />
      </Link>
      <nav>
        <Link href={link('/dashboard')} className={isActive('/dashboard') ? 'active' : ''}>
          My consultations
        </Link>
        <Link href={link('/book/slot')} className={isActive('/book') ? 'active' : ''}>
          Book new
        </Link>
        <Link href={link('/help')} className={isActive('/help') ? 'active' : ''}>
          Help
        </Link>
      </nav>
      <div className="right" style={{ position: 'relative' }}>
        <button
          className="btn btn-ghost btn-sm"
          style={{ padding: 2, borderRadius: 999 }}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Profile menu"
        >
          <Avatar name={user?.displayName || user?.phoneNumber || 'You'} size="sm" />
        </button>

        {menuOpen && (
          <>
            {/* click-outside backdrop */}
            <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 8px)',
                width: 240,
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 12,
                boxShadow: '0 12px 32px rgba(20,34,58,0.12)',
                padding: 8,
                zIndex: 41,
              }}
            >
              <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)', marginBottom: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.displayName || 'Signed in'}</div>
                <div className="mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                  {user?.phoneNumber || user?.email || ''}
                </div>
              </div>
              <Link
                href={link('/dashboard')}
                onClick={() => setMenuOpen(false)}
                className="row"
                style={{ gap: 10, padding: '9px 12px', borderRadius: 8, color: 'inherit', textDecoration: 'none', fontSize: 14 }}
              >
                <Icon name="home" size={15} /> My consultations
              </Link>
              <button
                onClick={onLogout}
                className="row"
                style={{
                  gap: 10,
                  padding: '9px 12px',
                  borderRadius: 8,
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--danger)',
                  fontSize: 14,
                  textAlign: 'left',
                }}
              >
                <Icon name="lock" size={15} /> Log out
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
