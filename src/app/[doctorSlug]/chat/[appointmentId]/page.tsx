'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { useAuth } from '@/components/AuthProvider';
import { useDoctor } from '@/components/DoctorProvider';
import { PatientTopbar } from '@/components/patient/PatientTopbar';
import { Avatar } from '@/components/ui/Avatar';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { firestore } from '@/lib/firebase/client';
import { fmtTime } from '@/lib/format';
import type { AppointmentDoc, ChatMessageDoc } from '@/lib/types';

function useCountdown(targetMillis: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (targetMillis == null) return null;
  const remaining = Math.max(0, targetMillis - now);
  const mm = Math.floor(remaining / 60000);
  const ss = Math.floor((remaining % 60000) / 1000);
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export default function ChatRoomPage() {
  const doctor = useDoctor();
  const router = useRouter();
  const { user, loading } = useAuth();
  const params = useParams<{ appointmentId: string }>();
  const appointmentId = params.appointmentId;

  const [appt, setAppt] = useState<AppointmentDoc | null>(null);
  const [messages, setMessages] = useState<ChatMessageDoc[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const countdown = useCountdown(appt?.endTime ?? null);

  useEffect(() => {
    if (!loading && !user) router.replace(`/${doctor.slug}/login`);
  }, [loading, user, router, doctor.slug]);

  useEffect(() => {
    if (!appointmentId) return;
    const unsub = onSnapshot(
      doc(firestore(), 'appointments', appointmentId),
      (s) => {
        if (s.exists()) setAppt({ id: s.id, ...(s.data() as Omit<AppointmentDoc, 'id'>) });
      },
      (e) => setError(e.message),
    );
    return () => unsub();
  }, [appointmentId]);

  useEffect(() => {
    if (!appointmentId) return;
    const q = query(
      collection(firestore(), 'chat_sessions', appointmentId, 'messages'),
      orderBy('createdAt', 'asc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      const rows: ChatMessageDoc[] = [];
      snap.forEach((d) =>
        rows.push({ id: d.id, ...(d.data() as Omit<ChatMessageDoc, 'id'>) }),
      );
      setMessages(rows);
    });
    return () => unsub();
  }, [appointmentId]);

  const status: 'before' | 'active' | 'closed' = useMemo(() => {
    if (!appt) return 'before';
    const now = Date.now();
    if (now < appt.startTime) return 'before';
    if (now >= appt.endTime) return 'closed';
    return 'active';
  }, [appt]);

  const canType = status === 'active';

  const send = async () => {
    if (!canType || !draft.trim() || !user || !appt) return;
    const text = draft;
    setDraft('');
    try {
      await addDoc(collection(firestore(), 'chat_sessions', appt.id, 'messages'), {
        senderId: user.uid,
        senderRole: 'patient',
        text,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send');
      setDraft(text);
    }
  };

  return (
    <div className="app">
      <PatientTopbar />
      <div
        data-screen-label="Chat Consultation"
        style={{ display: 'grid', gridTemplateColumns: '1fr 320px', minHeight: 'calc(100vh - 72px)' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--line)' }}>
          <div
            style={{
              padding: '16px 28px',
              borderBottom: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--surface)',
            }}
          >
            <div className="row" style={{ gap: 12 }}>
              <Avatar name={doctor.name} />
              <div>
                <div style={{ fontWeight: 500 }}>{doctor.name}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{doctor.qualifications}</div>
              </div>
            </div>
            <div className="row" style={{ gap: 12 }}>
              {status === 'active' && (
                <Chip variant="live" dot>
                  Live · ends {appt && fmtTime(appt.endTime, doctor.timezone)}
                </Chip>
              )}
              {status === 'before' && appt && (
                <Chip>
                  Starts at {fmtTime(appt.startTime, doctor.timezone)}
                </Chip>
              )}
              {status === 'closed' && <Chip>Closed</Chip>}
            </div>
          </div>

          <div
            style={{
              flex: 1,
              padding: '24px 28px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              background: 'var(--surface-2)',
            }}
          >
            <div
              style={{
                alignSelf: 'center',
                fontSize: 12,
                color: 'var(--ink-3)',
                padding: '4px 12px',
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 999,
              }}
            >
              {appt && `Consultation ${status === 'active' ? 'started' : status === 'closed' ? 'ended' : 'opens'}`}
            </div>
            {messages.length === 0 && (
              <div style={{ alignSelf: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
                No messages yet.
              </div>
            )}
            {messages.map((m) => {
              const isMe = m.senderRole === 'patient';
              return (
                <div key={m.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '72%' }}>
                  <div
                    style={{
                      padding: '11px 14px',
                      borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      background: isMe ? 'var(--ink)' : 'var(--surface)',
                      color: isMe ? 'white' : 'var(--ink)',
                      border: isMe ? 'none' : '1px solid var(--line)',
                      fontSize: 15,
                      lineHeight: 1.45,
                    }}
                  >
                    {m.text}
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: 'var(--ink-3)',
                      marginTop: 4,
                      textAlign: isMe ? 'right' : 'left',
                    }}
                  >
                    {m.createdAt ? fmtTime(m.createdAt as unknown as number, doctor.timezone) : ''}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ padding: 20, borderTop: '1px solid var(--line)', background: 'var(--surface)' }}>
            {error && (
              <p style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 8 }}>{error}</p>
            )}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto',
                gap: 10,
                alignItems: 'center',
              }}
            >
              <button
                className="btn btn-ghost btn-sm"
                style={{ height: 44, width: 44, padding: 0 }}
                disabled={!canType}
              >
                <Icon name="paperclip" />
              </button>
              <input
                className="input"
                placeholder={canType ? 'Type a message…' : 'Chat is not active'}
                value={draft}
                disabled={!canType}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') send();
                }}
              />
              <button
                className="btn btn-primary"
                style={{ height: 44, width: 44, padding: 0 }}
                onClick={send}
                disabled={!canType}
              >
                <Icon name="send" />
              </button>
            </div>
          </div>
        </div>

        <aside style={{ padding: 24, background: 'var(--surface)' }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            About this visit
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 4 }}>Chief complaint</div>
          <div style={{ marginBottom: 16 }}>{appt?.chiefComplaint ?? '—'}</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 4 }}>Booking ID</div>
          <div className="mono" style={{ marginBottom: 16, fontSize: 13 }}>
            {appt?.id ?? '—'}
          </div>
          <hr className="divider" style={{ margin: '14px 0' }} />
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            Time remaining
          </div>
          <div className="mono" style={{ fontSize: 28, fontWeight: 500 }}>
            {status === 'active' ? countdown : '—'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>
            {appt && `Closes at ${fmtTime(appt.endTime, doctor.timezone)} ${doctor.timezone}`}
          </div>
        </aside>
      </div>
    </div>
  );
}
