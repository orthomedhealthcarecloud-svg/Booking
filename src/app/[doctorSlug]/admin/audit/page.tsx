'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import { useDoctor } from '@/components/DoctorProvider';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { firestore } from '@/lib/firebase/client';
import type { AuditLogDoc } from '@/lib/types';

const tagVariant = (a: string): 'ok' | 'danger' | 'primary' | 'default' => {
  if (a.includes('ISSUE') || a.includes('PAYMENT') || a.includes('COMPLETE')) return 'ok';
  if (a.includes('CANCEL')) return 'danger';
  if (a.includes('UPDATE') || a.includes('CREATE')) return 'primary';
  return 'default';
};

export default function AuditPage() {
  const doctor = useDoctor();
  const [logs, setLogs] = useState<AuditLogDoc[]>([]);

  useEffect(() => {
    const q = query(
      collection(firestore(), 'audit_logs'),
      orderBy('createdAt', 'desc'),
      limit(100),
    );
    const unsub = onSnapshot(q, (snap) => {
      const rows: AuditLogDoc[] = [];
      snap.forEach((d) => rows.push({ id: d.id, ...(d.data() as Omit<AuditLogDoc, 'id'>) }));
      setLogs(rows.filter((r) => r.meta?.doctorId === doctor.id || r.targetType !== 'appointment'));
    });
    return () => unsub();
  }, [doctor.id]);

  return (
    <div data-screen-label="Audit Log">
      <div className="admin-header">
        <div>
          <h1>Audit log</h1>
          <div className="sub">
            Immutable record of every action taken in the practice. Used for compliance and dispute resolution.
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-secondary">
            <Icon name="download" size={14} /> Export CSV
          </button>
        </div>
      </div>
      <div className="card" style={{ padding: 0 }}>
        {logs.length === 0 ? (
          <div style={{ padding: 22, color: 'var(--ink-3)' }}>No events recorded yet.</div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 180 }}>Time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((r) => (
                <tr key={r.id}>
                  <td className="mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                    {r.createdAt ? new Date(r.createdAt as unknown as number).toLocaleString('en-IN') : ''}
                  </td>
                  <td style={{ fontSize: 13 }}>{r.actorRole}</td>
                  <td>
                    <Chip variant={tagVariant(r.action)}>{r.action}</Chip>
                  </td>
                  <td style={{ fontSize: 13 }} className="mono">
                    {r.targetType} · {r.targetId.slice(0, 8)}
                  </td>
                  <td style={{ color: 'var(--ink-2)', fontSize: 13 }}>
                    {JSON.stringify(r.meta ?? {})}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
