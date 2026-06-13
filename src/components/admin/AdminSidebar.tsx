'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useDoctor } from '@/components/DoctorProvider';
import { useConsultAlert } from '@/components/admin/ConsultAlert';
import { Avatar } from '@/components/ui/Avatar';
import { Brand } from '@/components/ui/Brand';
import { Icon, type IconName } from '@/components/ui/Icon';

const NAV: Array<{ id: string; label: string; icon: IconName; href: string }> = [
  { id: 'dash', label: 'Today', icon: 'home', href: '' },
  { id: 'appts', label: 'Consultations', icon: 'video', href: '/appointments' },
  { id: 'inbox', label: 'Inbox', icon: 'inbox', href: '/inbox' },
  { id: 'patients', label: 'Patients', icon: 'user', href: '/patients' },
  { id: 'avail', label: 'Availability', icon: 'calendar', href: '/availability' },
  { id: 'rx', label: 'Prescriptions', icon: 'pill', href: '/prescriptions' },
];

const SETTINGS: Array<{ id: string; label: string; icon: IconName; href: string }> = [
  { id: 'account', label: 'Account', icon: 'settings', href: '/account' },
  { id: 'audit', label: 'Audit log', icon: 'shield', href: '/audit' },
];

export function AdminSidebar() {
  const doctor = useDoctor();
  const pathname = usePathname();
  const { user } = useAuth();
  const { alert } = useConsultAlert();
  const base = `/${doctor.slug}/admin`;
  const isActive = (href: string) => {
    const full = `${base}${href}`;
    return href === '' ? pathname === full : pathname.startsWith(full);
  };
  return (
    <aside
      className="sidebar"
      style={
        alert
          ? { background: '#fdecec', borderRight: '2px solid #e5484d', transition: 'background .3s' }
          : { transition: 'background .3s' }
      }
    >
      {alert && (
        <div
          style={{
            background: '#e5484d',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            textAlign: 'center',
            padding: '6px 8px',
            borderRadius: 8,
            marginBottom: 10,
          }}
        >
          ⏳ Less than 5 min left
        </div>
      )}
      <Brand />
      <div className="sidebar-section">Practice</div>
      {NAV.map((it) => (
        <Link key={it.id} href={`${base}${it.href}`} className={isActive(it.href) ? 'active' : ''}>
          <Icon name={it.icon} size={16} /> {it.label}
        </Link>
      ))}
      <div className="sidebar-section">Settings</div>
      {SETTINGS.map((it) => (
        <Link key={it.id} href={`${base}${it.href}`} className={isActive(it.href) ? 'active' : ''}>
          <Icon name={it.icon} size={16} /> {it.label}
        </Link>
      ))}
      <div style={{ flex: 1 }} />
      <div style={{ padding: 12, borderTop: '1px solid var(--line)', marginTop: 12 }}>
        <div className="row" style={{ gap: 10 }}>
          <Avatar name={doctor.name} size="sm" />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {doctor.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
              {user?.email ?? doctor.specialty}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
