'use client';

import { useDoctor } from '@/components/DoctorProvider';
import { Icon } from '@/components/ui/Icon';

export default function InboxPage() {
  const doctor = useDoctor();
  return (
    <div data-screen-label="Inbox">
      <div className="admin-header">
        <div>
          <h1>Inbox</h1>
          <div className="sub">Patient messages, refill requests, and system notifications</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-secondary">Mark all as read</button>
          <button className="btn btn-primary">
            <Icon name="edit" size={16} /> Compose
          </button>
        </div>
      </div>
      <div className="card">
        <p style={{ color: 'var(--ink-2)' }}>
          Inbox is wired to live chat sessions and notifications for{' '}
          <strong>{doctor.name}</strong>. Threads will appear here as patients message you between
          consultations.
        </p>
        <p style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 10 }}>
          Phase 4 will add WhatsApp + email notifications routed through this view.
        </p>
      </div>
    </div>
  );
}
