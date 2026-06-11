'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useDoctor } from '@/components/DoctorProvider';
import { Avatar } from '@/components/ui/Avatar';
import { Brand } from '@/components/ui/Brand';
import { Icon } from '@/components/ui/Icon';

export function PatientTopbar() {
  const doctor = useDoctor();
  const pathname = usePathname();
  const { user } = useAuth();
  const base = `/${doctor.slug}`;
  const link = (sub: string) => `${base}${sub}`;
  const isActive = (sub: string) => pathname === link(sub) || pathname.startsWith(link(sub) + '/');

  return (
    <div className="topbar">
      <Link href={link('/dashboard')} style={{ textDecoration: 'none' }}>
        <Brand />
      </Link>
      <nav>
        <Link href={link('/dashboard')} className={isActive('/dashboard') ? 'active' : ''}>
          My consultations
        </Link>
        <Link href={link('/book/type')} className={isActive('/book') ? 'active' : ''}>
          Book new
        </Link>
        <Link href={link('/reports')} className={isActive('/reports') ? 'active' : ''}>
          Reports
        </Link>
        <Link href={link('/help')}>Help</Link>
      </nav>
      <div className="right">
        <button className="btn btn-ghost btn-sm" style={{ width: 36, padding: 0 }}>
          <Icon name="bell" size={16} />
        </button>
        <Avatar name={user?.displayName || user?.phoneNumber || 'You'} size="sm" />
      </div>
    </div>
  );
}
